<!-- src/lib/components/ImageProcessor.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { imageAnalysisStore, updateProcessingResults } from '$lib/stores/imageAnalysis';
	import { detectCirclesAndLeaves, detectClipByColor } from '$lib/opencv/detection';

	// ===== OPENCV SETUP =====
	let opencvStatus = 'Loading OpenCV...';
	let isLoading = true;
	let opencvLoaded = false;

	// ===== REACTIVE STATE FROM STORE =====
	$: capturedImage = $imageAnalysisStore.capturedImage;
	$: processingResult = $imageAnalysisStore.processingResults;
	$: sampledColor = $imageAnalysisStore.sampledColor;
	$: circlePriors = $imageAnalysisStore.circlePriors;

	// ===== EXPORTS =====
	export let visible = false;

	onMount(async () => {
		await loadOpenCV();
	});

	async function loadOpenCV() {
		try {
			// Load OpenCV.js from CDN
			const script = document.createElement('script');
			script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
			script.async = true;
			
			script.onload = () => {
				// OpenCV.js loads asynchronously, so we need to wait for cv to be ready
				const checkOpenCV = () => {
					// @ts-ignore
					if (typeof cv !== 'undefined' && cv.getBuildInformation) {
						console.log('OpenCV.js loaded successfully');
						opencvLoaded = true;
						opencvStatus = 'OpenCV ready! You can now process images.';
						isLoading = false;
					} else {
						setTimeout(checkOpenCV, 100);
					}
				};
				checkOpenCV();
			};
			
			script.onerror = () => {
				opencvStatus = 'Failed to load OpenCV from CDN';
				isLoading = false;
			};
			
			document.head.appendChild(script);
		} catch (error) {
			console.error('Failed to load OpenCV:', error);
			opencvStatus = 'Failed to load OpenCV';
			isLoading = false;
		}
	}

	async function processWithCircleDetection() {
		if (!opencvLoaded || !capturedImage) {
			updateProcessingResults('Need OpenCV loaded and a captured image');
			return;
		}

		try {
			updateProcessingResults('Processing with circle detection...', true);
			
			// Create image element from base64 data
			const img = new Image();
			img.onload = () => {
				try {
					const results = detectCirclesAndLeaves(img, circlePriors || undefined);
					updateProcessingResults(JSON.stringify(results, null, 2));
				} catch (error) {
					updateProcessingResults(`Processing error: ${error}`);
				}
			};
			img.onerror = () => {
				updateProcessingResults('Error loading image for processing');
			};
			img.src = capturedImage;
			
		} catch (error) {
			updateProcessingResults(`Processing error: ${error}`);
		}
	}

	async function processWithColorDetection() {
		if (!opencvLoaded || !capturedImage || !sampledColor) {
			updateProcessingResults('Need OpenCV loaded, captured image, and sampled color');
			return;
		}

		try {
			updateProcessingResults('Processing with color detection...', true);
			
			// Create image element from base64 data
			const img = new Image();
			img.onload = () => {
				try {
					const colorHSV: [number, number, number] = [sampledColor.h, sampledColor.s, sampledColor.v];
					const results = detectClipByColor(img, colorHSV, sampledColor.tolerance);
					updateProcessingResults(JSON.stringify(results, null, 2));
				} catch (error) {
					updateProcessingResults(`Processing error: ${error}`);
				}
			};
			img.onerror = () => {
				updateProcessingResults('Error loading image for processing');
			};
			img.src = capturedImage;
			
		} catch (error) {
			updateProcessingResults(`Processing error: ${error}`);
		}
	}

	// Export functions for parent component
	export { processWithCircleDetection, processWithColorDetection };
</script>

{#if visible}
<div class="processing-section">
	<h3>Image Processing</h3>
	
	{#if isLoading}
		<p class="loading">Loading OpenCV.js...</p>
	{:else}
		<p class="status">{opencvStatus}</p>
	{/if}
	
	<div class="processing-controls">
		{#if !opencvLoaded}
			<button class="process-button" disabled>
				⏳ Loading OpenCV...
			</button>
		{:else}
			<button on:click={processWithCircleDetection} class="process-button" disabled={!capturedImage}>
				{circlePriors ? '🎯 Analyze Annotated Circle' : '🔍 Detect Circles + Leaves'}
			</button>
			
			{#if sampledColor}
				<button on:click={processWithColorDetection} class="process-button" disabled={!capturedImage}>
					🎨 Use Sampled Color
				</button>
			{/if}
		{/if}
	</div>
	
	{#if processingResult}
		<div class="processing-results">
			<h4>Detection Results:</h4>
			<pre class="results-output">{processingResult}</pre>
		</div>
	{/if}
</div>
{/if}

<style>
	.processing-section {
		background: #e8f5e8;
		padding: 1rem;
		border-radius: 8px;
		text-align: left;
	}

	.status {
		color: #333;
		font-style: italic;
		margin: 0 0 1rem 0;
	}

	.loading {
		color: #666;
		font-style: italic;
		margin: 0 0 1rem 0;
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
</style>