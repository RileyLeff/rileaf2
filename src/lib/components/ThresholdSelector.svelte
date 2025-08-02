<!-- src/lib/components/ThresholdSelector.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { imageAnalysisStore, updateHsvThresholds } from '$lib/stores/imageAnalysis';
	// --- IMPORT THE NEW COMPONENT ---
	import HSVRangeSlider from './HSVRangeSlider.svelte';

	export let imageProcessor: any;

	$: sourceImage = $imageAnalysisStore.croppedImage || $imageAnalysisStore.capturedImage;
	$: hsv = $imageAnalysisStore.hsvThresholds;
	$: chamberDiameter = $imageAnalysisStore.chamberDiameter;

	let previewMaskUrl: string | null = null;
	let debounceTimer: number;
	let leafAreaInPixels = 0;
	let chamberAreaInPixels = 0;
	let calculatedLeafAreaMm2 = 0;

	// --- NEW: Define a dynamic saturation gradient based on the selected hue ---
	$: saturationGradient = `linear-gradient(to right, hsl(${
		(hsv.h.min + hsv.h.max) / 2
	}, 0%, 50%), hsl(${(hsv.h.min + hsv.h.max) / 2}, 100%, 50%))`;

	onDestroy(() => {
		clearTimeout(debounceTimer);
	});

	$: if (hsv && imageProcessor) {
		requestPreview();
	}

	$: if (chamberAreaInPixels > 0) {
		const chamberPhysicalArea = Math.PI * (chamberDiameter / 2) ** 2;
		const pixelsPerMmSq = chamberAreaInPixels / chamberPhysicalArea;
		calculatedLeafAreaMm2 = leafAreaInPixels / pixelsPerMmSq;
	}

	async function requestPreview() {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(async () => {
			if (!imageProcessor) return;
			const previewData = await imageProcessor.getThresholdPreview(hsv);
			if (previewData) {
				previewMaskUrl = previewData.previewMaskUrl;
				leafAreaInPixels = previewData.leafAreaInChamberPixels;
				chamberAreaInPixels = previewData.chamberAreaPixels;
			}
		}, 100);
	}

	function handleConfirm() {
		updateHsvThresholds(hsv);
		if (imageProcessor) imageProcessor.processImageWithAnnotation();
	}
</script>

<div class="threshold-selector-container">
	<div class="display-area">
		{#if sourceImage} <img class="source-image" src={sourceImage} alt="Annotated sample" /> {/if}
		{#if previewMaskUrl} <img class="mask-overlay" src={previewMaskUrl} alt="Leaf mask preview" /> {/if}
	</div>

	<div class="area-display">
		Real-time Area: <strong>{calculatedLeafAreaMm2.toFixed(2)} mm²</strong>
	</div>

	<!-- --- REPLACED THE OLD SLIDERS WITH THE NEW COMPONENT --- -->
	<div class="controls-area">
		<HSVRangeSlider
			label="Hue (H: {hsv.h.min} - {hsv.h.max})"
			bind:min_value={hsv.h.min}
			bind:max_value={hsv.h.max}
			range_max={179}
			gradient_css="linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)"
		/>
		<HSVRangeSlider
			label="Saturation (S: {hsv.s.min} - {hsv.s.max})"
			bind:min_value={hsv.s.min}
			bind:max_value={hsv.s.max}
			range_max={255}
			gradient_css={saturationGradient}
		/>
		<HSVRangeSlider
			label="Value (V: {hsv.v.min} - {hsv.v.max})"
			bind:min_value={hsv.v.min}
			bind:max_value={hsv.v.max}
			range_max={255}
			gradient_css="linear-gradient(to right, black, white)"
		/>
	</div>
	<!-- --- END OF REPLACEMENT --- -->

	<div class="confirm-controls">
		<button class="confirm-button" on:click={handleConfirm}>✅ Confirm & Analyze</button>
	</div>
</div>

<!-- (The style block remains exactly the same) -->
<style>
	.threshold-selector-container { display: flex; flex-direction: column; gap: 1.5rem; }
	.display-area { position: relative; width: 100%; max-width: 600px; margin: 0 auto; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; }
	.source-image { display: block; width: 100%; height: auto; }
	.mask-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; mix-blend-mode: screen; opacity: 0.8; }
	.area-display { text-align: center; font-size: 1.2rem; background: #e8f5e9; padding: 0.75rem; border-radius: 8px; }
	.controls-area { display: grid; grid-template-columns: 1fr; gap: 1rem; }
	.confirm-controls { text-align: center; }
	.confirm-button { background-color: #4caf50; color: white; padding: 12px 24px; font-size: 1.1rem; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
</style>