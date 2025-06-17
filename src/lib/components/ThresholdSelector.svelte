<!-- src/lib/components/ThresholdSelector.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { imageAnalysisStore, updateHsvThresholds } from '$lib/stores/imageAnalysis';
	import type { HSVRange } from '$lib/stores/imageAnalysis';

	export let imageProcessor: any;

	// ===== STATE =====
	$: sourceImage = $imageAnalysisStore.croppedImage || $imageAnalysisStore.capturedImage;
	$: hsv = $imageAnalysisStore.hsvThresholds;

	let previewCanvas: HTMLCanvasElement;
	let previewMaskUrl: string | null = null;
	let debounceTimer: number;

	// ===== LIFECYCLE & REAL-TIME PREVIEW =====
	onMount(() => {
		// Generate the first preview when the component loads
		requestPreview();
	});

	onDestroy(() => {
		// Clean up the timer if the component is destroyed
		clearTimeout(debounceTimer);
	});

	// This reactive statement requests a new preview whenever the sliders change,
	// but it's debounced to avoid overwhelming the processor.
	$: if (hsv) {
		requestPreview();
	}

	function requestPreview() {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(async () => {
			if (!imageProcessor) return;
			// Tell the processor to generate a new mask preview
			const maskUrl = await imageProcessor.getThresholdPreview(hsv);
			previewMaskUrl = maskUrl;
		}, 100); // 100ms debounce delay
	}

	// ===== WORKFLOW ACTIONS =====
	function handleConfirm() {
		// The thresholds are already saved in the store by the reactive bindings.
		// We just need to tell the processor to do the final analysis.
		if (imageProcessor) {
			imageProcessor.processImageWithAnnotation();
		}
	}
</script>

<div class="threshold-selector-container">
	<!-- Display Area: Original Image with Mask Overlayed -->
	<div class="display-area">
		{#if sourceImage}
			<img class="source-image" src={sourceImage} alt="Annotated sample" />
		{/if}
		{#if previewMaskUrl}
			<img class="mask-overlay" src={previewMaskUrl} alt="Leaf mask preview" />
		{/if}
	</div>

	<!-- Controls Area: Sliders for HSV -->
	<div class="controls-area">
		<div class="slider-group">
			<label>Hue (Color)</label>
			<div class="slider-row">
				<span>Min: {hsv.h.min}</span>
				<input type="range" min="0" max="179" bind:value={hsv.h.min} />
			</div>
			<div class="slider-row">
				<span>Max: {hsv.h.max}</span>
				<input type="range" min="0" max="179" bind:value={hsv.h.max} />
			</div>
		</div>

		<div class="slider-group">
			<label>Saturation (Richness)</label>
			<div class="slider-row">
				<span>Min: {hsv.s.min}</span>
				<input type="range" min="0" max="255" bind:value={hsv.s.min} />
			</div>
			<div class="slider-row">
				<span>Max: {hsv.s.max}</span>
				<input type="range" min="0" max="255" bind:value={hsv.s.max} />
			</div>
		</div>

		<div class="slider-group">
			<label>Value (Brightness)</label>
			<div class="slider-row">
				<span>Min: {hsv.v.min}</span>
				<input type="range" min="0" max="255" bind:value={hsv.v.min} />
			</div>
			<div class="slider-row">
				<span>Max: {hsv.v.max}</span>
				<input type="range" min="0" max="255" bind:value={hsv.v.max} />
			</div>
		</div>
	</div>

	<!-- Final Action Button -->
	<div class="confirm-controls">
		<button class="confirm-button" on:click={handleConfirm}>✅ Confirm & Analyze</button>
	</div>
</div>

<style>
	.threshold-selector-container { display: flex; flex-direction: column; gap: 2rem; }
	.display-area { position: relative; width: 100%; max-width: 600px; margin: 0 auto; border: 2px solid #ddd; }
	.source-image { display: block; width: 100%; height: auto; }
	.mask-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; mix-blend-mode: screen; /* This blend mode shows white parts and makes black transparent */ opacity: 0.8; }
	.controls-area { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
	.slider-group { background: #f0f8ff; padding: 1rem; border-radius: 8px; }
	.slider-group label { font-weight: bold; display: block; margin-bottom: 0.5rem; color: #333; }
	.slider-row { display: flex; align-items: center; gap: 1rem; }
	.slider-row span { font-size: 0.9em; min-width: 80px; }
	.slider-row input[type='range'] { flex-grow: 1; }
	.confirm-controls { text-align: center; }
	.confirm-button { background-color: #4caf50; color: white; padding: 12px 24px; font-size: 1.1rem; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
	.confirm-button:hover { background-color: #45a049; }
</style>