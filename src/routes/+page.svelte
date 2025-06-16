<script lang="ts">
	import { onMount } from 'svelte';
	import CameraCapture from '$lib/components/CameraCapture.svelte';
	import ClipConfiguration from '$lib/components/ClipConfiguration.svelte';
	import CircleAnnotator from '$lib/components/CircleAnnotator.svelte';
	import ImageProcessor from '$lib/components/ImageProcessor.svelte';
	import { imageAnalysisStore } from '$lib/stores/imageAnalysis';

	// ===== REACTIVE STATE FROM STORE =====
	$: capturedImage = $imageAnalysisStore.capturedImage;
	$: processingResult = $imageAnalysisStore.processingResults;

	// Reference to ImageProcessor component
	let imageProcessor: ImageProcessor;
</script>

<main class="container">
	<h1>RiLeaf2 🍃</h1>
	
	<!-- ===== CLIP CONFIGURATION ===== -->
	<ClipConfiguration />
	
	<!-- ===== CAMERA SECTION ===== -->
	<CameraCapture />
	
	<!-- ===== CAPTURED IMAGE DISPLAY ===== -->
	{#if capturedImage}
		<div class="captured-section">
			<h2>Captured Image</h2>
			<img src={capturedImage} alt="Captured" class="captured-image" />
			
			<!-- DEBUG INFO - remove this later -->
			<div style="background: yellow; padding: 10px; margin: 10px 0;">
				<p>DEBUG: capturedImage exists: {!!capturedImage}</p>
				<p>CircleAnnotator should be visible below this</p>
			</div>
			
			<!-- ===== CIRCLE ANNOTATION ===== -->
			<CircleAnnotator visible={true} />
			
			<!-- ===== IMAGE PROCESSING SECTION ===== -->
			<ImageProcessor bind:this={imageProcessor} visible={true} />
		</div>
	{:else}
		<div class="instructions">
			<h2>Instructions</h2>
			<ol>
				<li>Set your clip diameter above</li>
				<li>Start the camera and capture a photo with your clip and leaves</li>
				<li>Draw lines across the circle to help detection</li>
				<li>Wait for OpenCV.js to load (one-time setup)</li>
				<li>Process image with your annotations</li>
			</ol>
		</div>
	{/if}
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
		text-align: center;
	}
	
	.captured-image {
		max-width: 100%;
		max-height: 400px;
		border: 2px solid #4caf50;
		border-radius: 8px;
		margin-bottom: 1.5rem;
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
</style>