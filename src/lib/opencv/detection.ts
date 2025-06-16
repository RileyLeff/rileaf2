// src/lib/opencv/detection.ts

declare const cv: any; // OpenCV.js global

export interface DetectionResults {
	image_dimensions: string;
	circles_found?: number;
	circle_info?: Array<{
		center: string;
		radius: number;
		area_pixels: number;
	}>;
	clip_detection?: {
		center: string;
		radius: number;
		area_pixels: number;
		color_range_used?: any;
	};
	leaf_analysis: any;
	error?: string;
}

/**
 * Detect circles using HoughCircles and analyze leaf content within them
 * If circle priors are provided, focus detection around that area
 */
export function detectCirclesAndLeaves(
	imageElement: HTMLImageElement, 
	circlePriors?: { center: [number, number]; radius: number; confidence: number }
): DetectionResults {
	let src: any, gray: any, blurred: any, circles: any;

	try {
		// Validate input
		if (!imageElement || !imageElement.complete) {
			throw new Error('Image not loaded');
		}

		// Load image into OpenCV Mat
		src = cv.imread(imageElement);
		
		// Validate the image was loaded properly
		if (!src || src.empty()) {
			throw new Error('Failed to load image into OpenCV');
		}

		// If we have good priors, use them directly instead of HoughCircles
		if (circlePriors && circlePriors.confidence > 0.5) {
			const [centerX, centerY] = circlePriors.center;
			const radius = circlePriors.radius;
			
			// Scale coordinates from canvas to actual image dimensions
			const scaleX = src.cols / imageElement.width;
			const scaleY = src.rows / imageElement.height;
			const scaledCenterX = centerX * scaleX;
			const scaledCenterY = centerY * scaleY;
			const scaledRadius = radius * Math.min(scaleX, scaleY);
			
			const results: DetectionResults = {
				image_dimensions: `${src.cols} x ${src.rows}`,
				circles_found: 1,
				circle_info: [{
					center: `(${Math.round(scaledCenterX)}, ${Math.round(scaledCenterY)})`,
					radius: Math.round(scaledRadius),
					area_pixels: Math.round(Math.PI * scaledRadius * scaledRadius)
				}],
				leaf_analysis: {}
			};

			// Analyze leaves in the annotated circle
			results.leaf_analysis = analyzeLeafAreaInCircle(src, scaledCenterX, scaledCenterY, scaledRadius);
			return results;
		}

		// Fallback to HoughCircles if no good priors
		// Convert to grayscale
		gray = new cv.Mat();
		cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
		
		// Apply blur to reduce noise
		blurred = new cv.Mat();
		cv.medianBlur(gray, blurred, 5);
		
		// Detect circles using HoughCircles with more restrictive parameters
		circles = new cv.Mat();
		cv.HoughCircles(
			blurred,
			circles,
			cv.HOUGH_GRADIENT,
			1,      // dp
			100,    // minDist - increased to reduce duplicate detections
			60,     // param1 - increased threshold
			40,     // param2 - increased accumulator threshold  
			30,     // minRadius - larger minimum
			200     // maxRadius - smaller maximum to focus on reasonable clip sizes
		);

		const results: DetectionResults = {
			image_dimensions: `${src.cols} x ${src.rows}`,
			circles_found: circles.cols,
			circle_info: [],
			leaf_analysis: 'No valid circle found for analysis'
		};

		if (circles.cols > 0) {
			// Limit to top 5 circles to avoid processing too many
			const maxCircles = Math.min(5, circles.cols);
			
			// Process detected circles
			const circleData = [];
			for (let i = 0; i < maxCircles; i++) {
				const x = circles.data32F[i * 3];
				const y = circles.data32F[i * 3 + 1];
				const r = circles.data32F[i * 3 + 2];
				
				circleData.push({ x, y, r });
				
				const area = Math.PI * r * r;
				results.circle_info!.push({
					center: `(${Math.round(x)}, ${Math.round(y)})`,
					radius: Math.round(r),
					area_pixels: Math.round(area)
				});
			}

			// Use largest circle for leaf analysis
			if (circleData.length > 0) {
				const largestCircle = circleData.reduce((max, circle) => 
					circle.r > max.r ? circle : max
				);

				const { x: mainX, y: mainY, r: mainR } = largestCircle;
				results.leaf_analysis = analyzeLeafAreaInCircle(src, mainX, mainY, mainR);
			}
		}

		return results;

	} catch (error) {
		console.error('OpenCV detection error:', error);
		return {
			image_dimensions: '0 x 0',
			leaf_analysis: 'Processing error',
			error: `Detection error: ${error}`
		};
	} finally {
		// Cleanup OpenCV Mats to prevent memory leaks
		[src, gray, blurred, circles].forEach(mat => {
			if (mat && typeof mat.delete === 'function') {
				try {
					mat.delete();
				} catch (e) {
					console.warn('Error cleaning up OpenCV Mat:', e);
				}
			}
		});
	}
}

/**
 * Helper function to analyze leaf area within a specified circle
 */
function analyzeLeafAreaInCircle(src: any, centerX: number, centerY: number, radius: number): any {
	let hsv: any, mask: any, greenMask: any, combinedMask: any;
	let lowerGreen: any, upperGreen: any;
	
	try {
		// Validate inputs
		if (!src || src.empty() || radius <= 0) {
			return {
				error: 'Invalid input parameters for leaf analysis'
			};
		}

		// Create circular mask
		mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		cv.circle(mask, new cv.Point(centerX, centerY), radius, new cv.Scalar(255), -1);

		// Convert to HSV for green detection
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

		// Create green mask with more robust color range
		greenMask = new cv.Mat();
		lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40, 0]);
		upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [85, 255, 255, 255]);
		cv.inRange(hsv, lowerGreen, upperGreen, greenMask);

		// Combine masks (green pixels inside circle)
		combinedMask = new cv.Mat();
		cv.bitwise_and(greenMask, mask, combinedMask);

		// Find contours
		const contours = new cv.MatVector();
		const hierarchy = new cv.Mat();
		cv.findContours(combinedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		// Calculate leaf areas
		const leafAreas = [];
		let totalLeafArea = 0;

		for (let i = 0; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			
			if (area > 100) { // Filter small noise
				leafAreas.push(area);
				totalLeafArea += area;
			}
			
			contour.delete();
		}

		const circleArea = Math.PI * radius * radius;

		const analysis = {
			circle_radius_pixels: Math.round(radius),
			circle_area_pixels: Math.round(circleArea),
			num_leaf_regions: leafAreas.length,
			total_leaf_area_pixels: Math.round(totalLeafArea),
			leaf_coverage_in_circle_percent: circleArea > 0 ? Math.round((totalLeafArea / circleArea) * 100 * 100) / 100 : 0,
			largest_leaf_area: leafAreas.length > 0 ? Math.round(Math.max(...leafAreas)) : 0,
			average_leaf_area: leafAreas.length > 0 ? Math.round(leafAreas.reduce((a, b) => a + b) / leafAreas.length) : 0
		};

		// Cleanup
		contours.delete();
		hierarchy.delete();
		
		return analysis;
		
	} catch (error) {
		console.error('Leaf analysis error:', error);
		return {
			error: `Leaf analysis failed: ${error}`
		};
	} finally {
		[hsv, mask, greenMask, combinedMask, lowerGreen, upperGreen].forEach(mat => {
			if (mat && typeof mat.delete === 'function') {
				try {
					mat.delete();
				} catch (e) {
					console.warn('Error cleaning up analysis Mat:', e);
				}
			}
		});
	}
}

/**
 * Detect clip using user-sampled color instead of generic circle detection
 */
export function detectClipByColor(
	imageElement: HTMLImageElement, 
	sampleColorHSV: [number, number, number], 
	tolerance: number = 20
): DetectionResults {
	let src: any, hsv: any, colorMask: any, clipMask: any, greenMask: any, combinedMask: any;

	try {
		// Load image
		src = cv.imread(imageElement);

		// Convert to HSV
		hsv = new cv.Mat();
		cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
		cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

		// Create color range based on sampled color
		const [h, s, v] = sampleColorHSV;
		const lowerColor = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
			Math.max(0, h - tolerance),
			Math.max(0, s - tolerance), 
			Math.max(0, v - tolerance),
			0
		]);
		const upperColor = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [
			Math.min(179, h + tolerance),
			Math.min(255, s + tolerance),
			Math.min(255, v + tolerance),
			255
		]);

		// Create mask for clip color
		colorMask = new cv.Mat();
		cv.inRange(hsv, lowerColor, upperColor, colorMask);

		// Find contours
		const contours = new cv.MatVector();
		const hierarchy = new cv.Mat();
		cv.findContours(colorMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		if (contours.size() === 0) {
			contours.delete();
			hierarchy.delete();
			lowerColor.delete();
			upperColor.delete();
			
			return {
				image_dimensions: `${src.cols} x ${src.rows}`,
				leaf_analysis: 'No clip-colored regions found',
				error: 'No clip-colored regions found'
			};
		}

		// Find largest contour (should be the clip)
		let largestContour = contours.get(0);
		let maxArea = cv.contourArea(largestContour);
		let largestIndex = 0;

		for (let i = 1; i < contours.size(); i++) {
			const contour = contours.get(i);
			const area = cv.contourArea(contour);
			if (area > maxArea) {
				maxArea = area;
				largestContour.delete();
				largestContour = contour;
				largestIndex = i;
			} else {
				contour.delete();
			}
		}

		// Get enclosing circle of largest contour
		const center = new cv.Point();
		const radiusArray = new Array(1);
		cv.minEnclosingCircle(largestContour, center, radiusArray);
		const radius = radiusArray[0];

		// Create circular mask for detected clip
		clipMask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
		cv.circle(clipMask, center, radius, new cv.Scalar(255), -1);

		// Detect leaves within clip (same as circle detection)
		greenMask = new cv.Mat();
		const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40, 0]);
		const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [85, 255, 255, 255]);
		cv.inRange(hsv, lowerGreen, upperGreen, greenMask);

		combinedMask = new cv.Mat();
		cv.bitwise_and(greenMask, clipMask, combinedMask);

		// Find leaf contours
		const leafContours = new cv.MatVector();
		const leafHierarchy = new cv.Mat();
		cv.findContours(combinedMask, leafContours, leafHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

		// Calculate leaf areas
		const leafAreas = [];
		let totalLeafArea = 0;

		for (let i = 0; i < leafContours.size(); i++) {
			const contour = leafContours.get(i);
			const area = cv.contourArea(contour);
			
			if (area > 100) {
				leafAreas.push(area);
				totalLeafArea += area;
			}
			
			contour.delete();
		}

		const clipArea = Math.PI * radius * radius;

		const results: DetectionResults = {
			image_dimensions: `${src.cols} x ${src.rows}`,
			clip_detection: {
				center: `(${Math.round(center.x)}, ${Math.round(center.y)})`,
				radius: Math.round(radius),
				area_pixels: Math.round(clipArea),
				color_range_used: {
					lower_hsv: [Math.max(0, h - tolerance), Math.max(0, s - tolerance), Math.max(0, v - tolerance)],
					upper_hsv: [Math.min(179, h + tolerance), Math.min(255, s + tolerance), Math.min(255, v + tolerance)]
				}
			},
			leaf_analysis: {
				clip_radius_pixels: Math.round(radius),
				clip_area_pixels: Math.round(clipArea),
				num_leaf_regions: leafAreas.length,
				total_leaf_area_pixels: Math.round(totalLeafArea),
				leaf_coverage_in_clip_percent: clipArea > 0 ? Math.round((totalLeafArea / clipArea) * 100 * 100) / 100 : 0,
				largest_leaf_area: leafAreas.length > 0 ? Math.round(Math.max(...leafAreas)) : 0,
				average_leaf_area: leafAreas.length > 0 ? Math.round(leafAreas.reduce((a, b) => a + b) / leafAreas.length) : 0
			}
		};

		// Cleanup
		contours.delete();
		hierarchy.delete();
		leafContours.delete();
		leafHierarchy.delete();
		largestContour.delete();
		lowerColor.delete();
		upperColor.delete();
		lowerGreen.delete();
		upperGreen.delete();

		return results;

	} catch (error) {
		return {
			image_dimensions: '0 x 0',
			leaf_analysis: 'Processing error',
			error: `Color detection error: ${error}`
		};
	} finally {
		// Cleanup
		[src, hsv, colorMask, clipMask, greenMask, combinedMask].forEach(mat => {
			if (mat && typeof mat.delete === 'function') {
				mat.delete();
			}
		});
	}
}