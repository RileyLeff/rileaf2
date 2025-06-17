// src/lib/opencv/detection.ts
import type { Annotation, Ellipse, HSVRange } from '$lib/stores/imageAnalysis';

declare const cv: any;

export interface DetectionResults {
	image_dimensions: string;
	ellipse_info: {
		clip_area_pixels: number;
		chamber_area_pixels: number;
	};
	leaf_analysis: {
		leaf_area_in_chamber_pixels: number;
		final_leaf_area_mm2?: number;
	};
	final_image_data_url?: string;
	error?: string;
}

export function analyzeLeafAreaInEllipse(
	imageElement: HTMLImageElement,
	annotation: Annotation,
	hsvThresholds: HSVRange,
	chamberDiameter: number,
	clipDiameter: number
): DetectionResults {
	let src, hsv, leafMask, chamberMask, finalLeafMask, resultMat, lower, upper;
	try {
		src = cv.imread(imageElement);
		resultMat = src.clone();
		const scaleX = src.cols / annotation.sourceDimensions.width;
		const scaleY = src.rows / annotation.sourceDimensions.height;
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
		leafMask = new cv.Mat();
		lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hsvThresholds.h.min, hsvThresholds.s.min, hsvThresholds.v.min, 0]);
		upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hsvThresholds.h.max, hsvThresholds.s.max, hsvThresholds.v.max, 255]);
		cv.inRange(hsv, lower, upper, leafMask);
		const diameterRatio = chamberDiameter / clipDiameter;
		const scaledClipEllipse = { cx: annotation.ellipse.cx * scaleX, cy: annotation.ellipse.cy * scaleY, rx: annotation.ellipse.rx * scaleX, ry: annotation.ellipse.ry * scaleY, angle: (annotation.ellipse.angle * 180) / Math.PI };
		const chamberEllipse = { ...scaledClipEllipse, rx: scaledClipEllipse.rx * diameterRatio, ry: scaledClipEllipse.ry * diameterRatio };
		chamberMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		cv.ellipse(chamberMask, new cv.Point(chamberEllipse.cx, chamberEllipse.cy), new cv.Size(chamberEllipse.rx, chamberEllipse.ry), chamberEllipse.angle, 0, 360, new cv.Scalar(255), -1);
		finalLeafMask = new cv.Mat();
		cv.bitwise_and(leafMask, chamberMask, finalLeafMask);
		const leafAreaInChamberPixels = cv.countNonZero(finalLeafMask);
		src.setTo(new cv.Scalar(255, 0, 255, 255), finalLeafMask);
		cv.ellipse(src, new cv.Point(scaledClipEllipse.cx, scaledClipEllipse.cy), new cv.Size(scaledClipEllipse.rx, scaledClipEllipse.ry), scaledClipEllipse.angle, 0, 360, new cv.Scalar(0, 255, 255), 3);
		cv.ellipse(src, new cv.Point(chamberEllipse.cx, chamberEllipse.cy), new cv.Size(chamberEllipse.rx, chamberEllipse.ry), chamberEllipse.angle, 0, 360, new cv.Scalar(255, 255, 0), 3);
		const tempCanvas = document.createElement('canvas');
		cv.imshow(tempCanvas, src);
		const final_image_data_url = tempCanvas.toDataURL('image/jpeg');
		return {
			image_dimensions: `${src.cols} x ${src.rows}`,
			ellipse_info: { clip_area_pixels: Math.PI * scaledClipEllipse.rx * scaledClipEllipse.ry, chamber_area_pixels: Math.PI * chamberEllipse.rx * chamberEllipse.ry },
			leaf_analysis: { leaf_area_in_chamber_pixels: leafAreaInChamberPixels },
			final_image_data_url
		};
	} catch (error: any) {
		console.error('OpenCV analysis error:', error);
		return { image_dimensions: '0x0', error: `Analysis error: ${error.message || error}`, ellipse_info: { clip_area_pixels:0, chamber_area_pixels: 0}, leaf_analysis: {leaf_area_in_chamber_pixels: 0 } };
	} finally {
		[src, hsv, leafMask, chamberMask, finalLeafMask, resultMat, lower, upper].forEach(mat => { if (mat && !mat.isDeleted()) mat.delete(); });
	}
}

// FIX: Added the missing 'export' keyword
export function getThresholdPreviewAndArea(
	imageElement: HTMLImageElement,
	annotation: Annotation,
	hsvThresholds: HSVRange,
	chamberDiameter: number,
	clipDiameter: number
) {
	let src, hsv, leafMask, chamberMask, finalLeafMask, lower, upper;
	try {
		src = cv.imread(imageElement);
		const scaleX = src.cols / annotation.sourceDimensions.width;
		const scaleY = src.rows / annotation.sourceDimensions.height;
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
		leafMask = new cv.Mat();
		lower = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hsvThresholds.h.min, hsvThresholds.s.min, hsvThresholds.v.min, 0]);
		upper = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hsvThresholds.h.max, hsvThresholds.s.max, hsvThresholds.v.max, 255]);
		cv.inRange(hsv, lower, upper, leafMask);
		const diameterRatio = chamberDiameter / clipDiameter;
		const clipRx = annotation.ellipse.rx * scaleX;
		const clipRy = annotation.ellipse.ry * scaleY;
		chamberMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		cv.ellipse(chamberMask, new cv.Point(annotation.ellipse.cx * scaleX, annotation.ellipse.cy * scaleY), new cv.Size(clipRx * diameterRatio, clipRy * diameterRatio), (annotation.ellipse.angle * 180) / Math.PI, 0, 360, new cv.Scalar(255), -1);
		finalLeafMask = new cv.Mat();
		cv.bitwise_and(leafMask, chamberMask, finalLeafMask);
		const leafAreaInChamberPixels = cv.countNonZero(finalLeafMask);
		const tempCanvas = document.createElement('canvas');
		cv.imshow(tempCanvas, leafMask);
		const previewMaskUrl = tempCanvas.toDataURL('image/png');
		const chamberAreaPixels = Math.PI * (clipRx * diameterRatio) * (clipRy * diameterRatio);
		return { previewMaskUrl, leafAreaInChamberPixels, chamberAreaPixels };
	} catch (error) {
		console.error("Preview error:", error);
		return { previewMaskUrl: null, leafAreaInChamberPixels: 0, chamberAreaPixels: 0 };
	} finally {
		[src, hsv, leafMask, chamberMask, finalLeafMask, lower, upper].forEach(mat => { if (mat && !mat.isDeleted()) mat.delete(); });
	}
}

// FIX: Added the missing 'export' keyword
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