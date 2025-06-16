<script lang="ts">
	import { onMount } from 'svelte';
	import CameraCapture from '$lib/components/CameraCapture.svelte';
	import ClipConfiguration from '$lib/components/ClipConfiguration.svelte';
	import { imageAnalysisStore, updateProcessingResults } from '$lib/stores/imageAnalysis';

	// ===== PYTHON/OPENCV SETUP =====
	let pyodide: any = null;
	let pythonOutput = 'Loading Python...';
	let isLoading = true;
	let opencvLoaded = false;

	// ===== REACTIVE STATE FROM STORE =====
	$: capturedImage = $imageAnalysisStore.capturedImage;
	$: processingResult = $imageAnalysisStore.processingResults;
	$: clipDiameter = $imageAnalysisStore.clipDiameter;

	onMount(async () => {
		try {
			// Load Pyodide
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
			script.onload = async () => {
				// @ts-ignore
				pyodide = await loadPyodide();
				console.log('Pyodide loaded!');
				pythonOutput = 'Python ready! Load OpenCV to begin image analysis.';
				isLoading = false;
			};
			script.onerror = () => {
				pythonOutput = 'Failed to load Python from CDN';
				isLoading = false;
			};
			document.head.appendChild(script);
		} catch (error) {
			console.error('Failed to load Pyodide:', error);
			pythonOutput = 'Failed to load Python';
			isLoading = false;
		}
	});

	// ===== PYTHON FUNCTIONS =====
	async function loadOpenCV() {
		if (!pyodide || opencvLoaded) return;
		
		try {
			pythonOutput = 'Installing OpenCV...';
			await pyodide.loadPackage(['opencv-python', 'numpy']);
			opencvLoaded = true;
			pythonOutput = 'OpenCV loaded successfully!';
		} catch (error) {
			pythonOutput = `Failed to load OpenCV: ${error}`;
		}
	}

	// ===== IMAGE PROCESSING =====
	async function processImage() {
		if (!pyodide || !opencvLoaded || !capturedImage) {
			updateProcessingResults('Need OpenCV loaded and a captured image');
			return;
		}

		try {
			updateProcessingResults('Processing image...', true);
			
			// Convert base64 to numpy array for OpenCV
			const pythonCode = `
import cv2
import numpy as np
import base64
import json
import math

# Get the base64 image data (remove data:image/jpeg;base64, prefix)
image_data = "${capturedImage.split(',')[1]}"

# Decode base64 to bytes
image_bytes = base64.b64decode(image_data)

# Convert to numpy array
nparr = np.frombuffer(image_bytes, np.uint8)

# Decode image
img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def detect_circles_and_leaves(image):
    # Convert to grayscale for circle detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply some blur to reduce noise
    blurred = cv2.medianBlur(gray, 5)
    
    # STEP 1: Detect circles using HoughCircles
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1,              # Resolution ratio
        minDist=50,        # Minimum distance between circle centers
        param1=50,         # Upper threshold for edge detection
        param2=30,         # Accumulator threshold for center detection
        minRadius=20,      # Minimum circle radius
        maxRadius=300      # Maximum circle radius
    )
    
    img_height, img_width = image.shape[:2]
    results = {
        'image_dimensions': f"{img_width} x {img_height}",
        'circles_found': 0,
        'circle_info': [],
        'leaf_analysis': 'No valid circle found for analysis'
    }
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype("int")
        results['circles_found'] = len(circles)
        
        # Sort circles by size (largest first)
        circles_with_radius = [(x, y, r) for x, y, r in circles]
        circles_with_radius.sort(key=lambda c: c[2], reverse=True)
        
        for i, (x, y, r) in enumerate(circles_with_radius):
            circle_area = math.pi * r * r
            results['circle_info'].append({
                'center': f"({x}, {y})",
                'radius': int(r),
                'area_pixels': int(circle_area)
            })
        
        # STEP 2: Use the largest circle as region of interest
        if circles_with_radius:
            main_x, main_y, main_r = circles_with_radius[0]
            
            # Create circular mask
            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.circle(mask, (main_x, main_y), main_r, 255, -1)
            
            # STEP 3: Detect leaves within the circle
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Green color range for leaves
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255])
            
            # Create green mask
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            
            # Combine with circular mask (only green pixels inside circle)
            combined_mask = cv2.bitwise_and(green_mask, mask)
            
            # Find contours in the masked region
            contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Calculate leaf areas within the circle
            leaf_areas = []
            total_leaf_area = 0
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 100:  # Filter small noise
                    leaf_areas.append(area)
                    total_leaf_area += area
            
            # Calculate circle area for comparison
            circle_area = math.pi * main_r * main_r
            
            results['leaf_analysis'] = {
                'circle_radius_pixels': int(main_r),
                'circle_area_pixels': int(circle_area),
                'num_leaf_regions': len(leaf_areas),
                'total_leaf_area_pixels': int(total_leaf_area),
                'leaf_coverage_in_circle_percent': round((total_leaf_area / circle_area) * 100, 2),
                'largest_leaf_area': int(max(leaf_areas)) if leaf_areas else 0,
                'average_leaf_area': int(np.mean(leaf_areas)) if leaf_areas else 0
            }
    
    return results

# Process the image
results = detect_circles_and_leaves(img)

# Return as formatted JSON
json.dumps(results, indent=2)
			`;
			
			const result = pyodide.runPython(pythonCode);
			updateProcessingResults(result);
			
		} catch (error) {
			updateProcessingResults(`Processing error: ${error}`);
		}
	}
</script>

<main class="container">
	<h1>RiLeaf2 🍃</h1>
	
	<!-- ===== CAMERA SECTION ===== -->
	<div class="camera-section">
		<h2>Camera</h2>
		
		{#if cameraError}
			<p class="error">{cameraError}</p>
		{/if}
		
		<div class="camera-controls">
			<button on:click={startCamera} class="camera-button">
				Start Camera
			</button>
			<button on:click={capturePhoto} class="camera-button" disabled={!stream}>
				📸 Capture Photo
			</button>
			<button on:click={stopCamera} class="camera-button" disabled={!stream}>
				Stop Camera
			</button>
		</div>
		
		<div class="video-container">
			<video 
				bind:this={videoElement} 
				autoplay 
				playsinline 
				muted
				class="camera-video"
			></video>
		</div>
		
		<canvas bind:this={canvasElement} style="display: none;"></canvas>
		
		{#if capturedImage}
			<div class="captured-section">
				<h3>Captured Image:</h3>
				<img src={capturedImage} alt="Captured" class="captured-image" />
				
				<!-- ===== IMAGE PROCESSING SECTION ===== -->
				<div class="processing-section">
					<h3>Image Processing</h3>
					<div class="processing-controls">
						<button on:click={loadOpenCV} class="process-button" disabled={opencvLoaded}>
							{opencvLoaded ? '✅ OpenCV Ready' : 'Load OpenCV'}
						</button>
						<button on:click={processImage} class="process-button" disabled={!opencvLoaded}>
							🔍 Detect Circles + Leaves
						</button>
					</div>
					
					{#if processingResult}
						<div class="processing-results">
							<h4>Detection Results:</h4>
							<pre class="results-output">{processingResult}</pre>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	

</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
		font-family: Arial, sans-serif;
	}
	
	h1 {
		color: #2e7d32;
		text-align: center;
		margin-bottom: 2rem;
	}
	
	/* ===== CAPTURED IMAGE STYLES ===== */
	.captured-section {
		background: #f8f8f8;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}
	
	.image-container {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	
	.captured-image {
		max-width: 100%;
		max-height: 400px;
		border: 2px solid #4caf50;
		border-radius: 8px;
	}
	
	/* ===== PROCESSING STYLES ===== */
	.processing-section {
		background: #e8f5e8;
		padding: 1rem;
		border-radius: 8px;
	}

	.python-status {
		margin-bottom: 1rem;
	}

	.status-text {
		color: #333;
		font-style: italic;
		margin: 0;
	}

	.processing-controls {
		display: flex;
		gap: 10px;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.process-button {
		background: #4caf50;
		color: white;
		border: none;
		padding: 10px 15px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	.process-button:hover:not(:disabled) {
		background: #45a049;
	}

	.process-button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.processing-results {
		margin-top: 1rem;
	}

	.results-output {
		background: #2d5a2d;
		color: #a5d6a5;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		border: 1px solid #4caf50;
		font-size: 12px;
	}
	
	/* ===== INSTRUCTIONS STYLES ===== */
	.instructions {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.instructions h2 {
		color: #856404;
		margin-top: 0;
	}

	.instructions ol {
		color: #856404;
		line-height: 1.6;
	}

	.instructions li {
		margin-bottom: 0.5rem;
	}
	
	/* ===== GENERAL STYLES ===== */
	.loading {
		color: #666;
		font-style: italic;
		margin: 0;
	}
</style>