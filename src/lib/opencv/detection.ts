// src/lib/opencv/detection.ts
import type { Ellipse } from '$lib/stores/imageAnalysis';

declare const cv: any; // OpenCV.js global

export interface DetectionResults {
	image_dimensions: string;
	ellipse_info: {
		center: string;
		rx: number;
		ry: number;
		angle: number;
		area_pixels: number;
	};
	leaf_analysis: {
		num_leaf_regions: number;
		total_leaf_area_pixels: number;
		leaf_coverage_percent: number;
	};
	final_image_data_url?: string; // Image with contours drawn on it
	error?: string;
}

/**
 * Analyzes leaf area within a user-defined ellipse.
 * @param imageElement The HTMLImageElement to process.
 * @param ellipse The user-defined ellipse from the annotation step.
 * @returns DetectionResults object.
 */
export function analyzeLeafAreaInEllipse(
	imageElement: HTMLImageElement,
	ellipse: Ellipse
): DetectionResults {
	let src: any, hsv: any, ellipseMask: any, greenMask: any, combinedMask: any, contours: any, hierarchy: any, resultMat: any;

	try {
		src = cv.imread(imageElement);
		if (src.empty()) {
			throw new Error('Failed to load image into OpenCV');
		}

        // --- Create a drawable copy for the final result ---
        resultMat = src.clone();

		// --- Scale ellipse from canvas coords to image coords ---
		const scaleX = src.cols / imageElement.width;
		const scaleY = src.rows / imageElement.height;
		const scaledEllipse = {
			cx: ellipse.cx * scaleX,
			cy: ellipse.cy * scaleY,
			rx: ellipse.rx * scaleX,
			ry: ellipse.ry * scaleY,
			angle: (ellipse.angle * 180) / Math.PI // cv.ellipse uses degrees
		};

		// --- Create the elliptical mask ---
		ellipseMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		const center = new cv.Point(scaledEllipse.cx, scaledEllipse.cy);
		const size = new cv.Size(scaledEllipse.rx, scaledEllipse.ry);
		cv.ellipse(ellipseMask, center, size, scaledEllipse.angle, 0, 360, new cv.Scalar(255), -1);

		// --- Detect green pixels (leaf area) using HSV color space ---
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB); // Important: Drop alpha if present
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

		greenMask = new cv.Mat();
		// Robust HSV range for green leaves
		const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40, 0]);
		const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [90, 255, 255, 255]);
		cv.inRange(hsv, lowerGreen, upperGreen, greenMask);
        lowerGreen.delete();
        upperGreen.delete();

		// --- Combine masks: find pixels that are BOTH in the ellipse AND green ---
		combinedMask = new cv.Mat();
		cv.bitwise_and(greenMask, ellipseMask, combinedMask);

		// --- Find contours of the leaf areas ---
		contours = new cv.MatVector();
		hierarchy = new cv.Mat();
		cv.findContours(combinedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		// --- Calculate total leaf area and draw contours on the result image ---
		let totalLeafArea = 0;
		const leafColor = new cv.Scalar(255, 255, 0); // Bright yellow for visibility
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			if (area > 50) { // Filter out small noise
				totalLeafArea += area;
                cv.drawContours(resultMat, contours, i, leafColor, 2, cv.LINE_8, hierarchy, 100);
			}
			contour.delete();
		}

        // --- Draw the user's ellipse on the result image for reference ---
        const ellipseColor = new cv.Scalar(0, 255, 255); // Cyan
        cv.ellipse(resultMat, center, size, scaledEllipse.angle, 0, 360, ellipseColor, 3);

        // --- Convert the result Mat to a data URL to display in the UI ---
        const tempCanvas = document.createElement('canvas');
        cv.imshow(tempCanvas, resultMat);
        const final_image_data_url = tempCanvas.toDataURL('image/jpeg');

		// --- Final calculations ---
		const ellipseArea = Math.PI * scaledEllipse.rx * scaledEllipse.ry;

		return {
			image_dimensions: `${src.cols} x ${src.rows}`,
			ellipse_info: {
				center: `(${Math.round(scaledEllipse.cx)}, ${Math.round(scaledEllipse.cy)})`,
				rx: Math.round(scaledEllipse.rx),
				ry: Math.round(scaledEllipse.ry),
				angle: scaledEllipse.angle,
				area_pixels: Math.round(ellipseArea)
			},
			leaf_analysis: {
				num_leaf_regions: contours.size(),
				total_leaf_area_pixels: Math.round(totalLeafArea),
				leaf_coverage_percent: ellipseArea > 0 ? (totalLeafArea / ellipseArea) * 100 : 0
			},
            final_image_data_url
		};
	} catch (error: any) {
		console.error('OpenCV processing error:', error);
		return {
            image_dimensions: '0x0',
			error: `Processing error: ${error.message || error}`,
            ellipse_info: { center: '', rx:0, ry:0, angle:0, area_pixels:0},
            leaf_analysis: { num_leaf_regions: 0, total_leaf_area_pixels: 0, leaf_coverage_percent: 0}
		};
	} finally {
		// --- Cleanup all allocated OpenCV Mats to prevent memory leaks ---
		[src, hsv, ellipseMask, greenMask, combinedMask, contours, hierarchy, resultMat].forEach(mat => {
			if (mat && !mat.isDeleted()) {
				mat.delete();
			}
		});
	}
}