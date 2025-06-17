// src/lib/opencv/detection.ts
import type { Annotation, Ellipse } from '$lib/stores/imageAnalysis';

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
	final_image_data_url?: string;
	error?: string;
}

export function analyzeLeafAreaInEllipse(
	imageElement: HTMLImageElement,
	annotation: Annotation
): DetectionResults {
	let src, hsv, ellipseMask, greenMask, combinedMask, contours, hierarchy, resultMat;
	try {
		src = cv.imread(imageElement);
		if (src.empty()) throw new Error('Failed to load image into OpenCV');
		resultMat = src.clone();
		const scaleX = src.cols / annotation.sourceDimensions.width;
		const scaleY = src.rows / annotation.sourceDimensions.height;
		const scaledEllipse = {
			cx: annotation.ellipse.cx * scaleX,
			cy: annotation.ellipse.cy * scaleY,
			rx: annotation.ellipse.rx * scaleX,
			ry: annotation.ellipse.ry * scaleY,
			angle: (annotation.ellipse.angle * 180) / Math.PI
		};
		ellipseMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		const center = new cv.Point(scaledEllipse.cx, scaledEllipse.cy);
		const size = new cv.Size(scaledEllipse.rx, scaledEllipse.ry);
		cv.ellipse(ellipseMask, center, size, scaledEllipse.angle, 0, 360, new cv.Scalar(255), -1);
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
		greenMask = new cv.Mat();
		const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40, 0]);
		const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [90, 255, 255, 255]);
		cv.inRange(hsv, lowerGreen, upperGreen, greenMask);
		lowerGreen.delete();
		upperGreen.delete();
		combinedMask = new cv.Mat();
		cv.bitwise_and(greenMask, ellipseMask, combinedMask);
		contours = new cv.MatVector();
		hierarchy = new cv.Mat();
		cv.findContours(combinedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
		let totalLeafArea = 0;
		const leafColor = new cv.Scalar(255, 255, 0);
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			if (area > 50) {
				totalLeafArea += area;
				cv.drawContours(resultMat, contours, i, leafColor, 2, cv.LINE_8, hierarchy, 100);
			}
			contour.delete();
		}
		const ellipseColor = new cv.Scalar(0, 255, 255);
		cv.ellipse(resultMat, center, size, scaledEllipse.angle, 0, 360, ellipseColor, 3);
		const tempCanvas = document.createElement('canvas');
		cv.imshow(tempCanvas, resultMat);
		const final_image_data_url = tempCanvas.toDataURL('image/jpeg');
		const ellipseArea = Math.PI * scaledEllipse.rx * scaledEllipse.ry;
		return {
			image_dimensions: `${src.cols} x ${src.rows}`,
			ellipse_info: { center: `(${Math.round(scaledEllipse.cx)}, ${Math.round(scaledEllipse.cy)})`, rx: Math.round(scaledEllipse.rx), ry: Math.round(scaledEllipse.ry), angle: scaledEllipse.angle, area_pixels: Math.round(ellipseArea) },
			leaf_analysis: { num_leaf_regions: contours.size(), total_leaf_area_pixels: Math.round(totalLeafArea), leaf_coverage_percent: ellipseArea > 0 ? (totalLeafArea / ellipseArea) * 100 : 0 },
			final_image_data_url
		};
	} catch (error: any) {
		console.error('OpenCV processing error:', error);
		return { image_dimensions: '0x0', error: `Processing error: ${error.message || error}`, ellipse_info: { center: '', rx:0, ry:0, angle:0, area_pixels:0}, leaf_analysis: { num_leaf_regions: 0, total_leaf_area_pixels: 0, leaf_coverage_percent: 0} };
	} finally {
		[src, hsv, ellipseMask, greenMask, combinedMask, contours, hierarchy, resultMat].forEach(mat => { if (mat && !mat.isDeleted()) mat.delete(); });
	}
}

export function refineEllipseSelection(
	imageElement: HTMLImageElement,
	annotation: Annotation
): Annotation {
	let src, gray, blurred, edges, contours, hierarchy;
	let roiMat: any | null = null;
	let bestContour: any | null = null;

	try {
		src = cv.imread(imageElement);
		if (src.empty()) throw new Error('Failed to load image for refinement');

		const scaleX = src.cols / annotation.sourceDimensions.width;
		const scaleY = src.rows / annotation.sourceDimensions.height;
		const userEllipse = { cx: annotation.ellipse.cx * scaleX, cy: annotation.ellipse.cy * scaleY, rx: annotation.ellipse.rx * scaleX, ry: annotation.ellipse.ry * scaleY };
		const roiRect = new cv.Rect( Math.max(0, userEllipse.cx - userEllipse.rx * 1.5), Math.max(0, userEllipse.cy - userEllipse.ry * 1.5), userEllipse.rx * 3, userEllipse.ry * 3 );
		if (roiRect.x + roiRect.width > src.cols) roiRect.width = src.cols - roiRect.x;
		if (roiRect.y + roiRect.height > src.rows) roiRect.height = src.rows - roiRect.y;
		if (roiRect.width <= 0 || roiRect.height <= 0) return annotation;
		roiMat = src.roi(roiRect);
		gray = new cv.Mat();
		cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);
		blurred = new cv.Mat();
		cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
		edges = new cv.Mat();
		cv.Canny(blurred, edges, 50, 150, 3);
		contours = new cv.MatVector();
		hierarchy = new cv.Mat();
		cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
		let maxArea = 0;
		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			if (area > maxArea && contour.rows >= 5) {
				maxArea = area;
				if(bestContour) bestContour.delete();
				bestContour = contour.clone();
			}
			contour.delete();
		}
		if (!bestContour) return annotation;
		const fittedRect = cv.fitEllipse(bestContour);
		const refinedEllipse: Ellipse = {
			cx: (fittedRect.center.x + roiRect.x) / scaleX,
			cy: (fittedRect.center.y + roiRect.y) / scaleY,
			rx: fittedRect.size.width / 2 / scaleX,
			ry: fittedRect.size.height / 2 / scaleY,
			angle: (fittedRect.angle * Math.PI) / 180.0
		};
		return { ellipse: refinedEllipse, sourceDimensions: annotation.sourceDimensions };
	} catch(error) {
		console.error("Error during ellipse refinement:", error);
		return annotation;
	} finally {
		[src, roiMat, gray, blurred, edges, contours, hierarchy, bestContour].forEach(mat => {
			if (mat && !mat.isDeleted()) mat.delete();
		});
	}
}