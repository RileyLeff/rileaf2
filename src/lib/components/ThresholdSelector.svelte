<!-- src/lib/components/ThresholdSelector.svelte -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { imageAnalysisStore, updateHsvThresholds } from '$lib/stores/imageAnalysis';

	export let imageProcessor: any;

	$: sourceImage = $imageAnalysisStore.croppedImage || $imageAnalysisStore.capturedImage;
	$: hsv = $imageAnalysisStore.hsvThresholds;
	$: chamberDiameter = $imageAnalysisStore.chamberDiameter;

	let previewMaskUrl: string | null = null;
	let debounceTimer: number;
	let leafAreaInPixels = 0;
	let chamberAreaInPixels = 0;
	let calculatedLeafAreaMm2 = 0;

	onDestroy(() => { clearTimeout(debounceTimer); });

	$: if (hsv && imageProcessor) { requestPreview(); }

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

	<div class="controls-area">
		<!-- FIX: Add for/id attributes to link labels and inputs -->
		<div class="slider-group">
			<label for="h_min">Hue (H: {hsv.h.min} - {hsv.h.max})</label>
			<input type="range" id="h_min" min="0" max="179" bind:value={hsv.h.min} on:input={() => {if(hsv.h.min > hsv.h.max) hsv.h.max = hsv.h.min}}/>
			<input type="range" id="h_max" min="0" max="179" bind:value={hsv.h.max} on:input={() => {if(hsv.h.max < hsv.h.min) hsv.h.min = hsv.h.max}}/>
		</div>
		<div class="slider-group">
			<label for="s_min">Saturation (S: {hsv.s.min} - {hsv.s.max})</label>
			<input type="range" id="s_min" min="0" max="255" bind:value={hsv.s.min} on:input={() => {if(hsv.s.min > hsv.s.max) hsv.s.max = hsv.s.min}}/>
			<input type="range" id="s_max" min="0" max="255" bind:value={hsv.s.max} on:input={() => {if(hsv.s.max < hsv.s.min) hsv.s.min = hsv.s.max}}/>
		</div>
		<div class="slider-group">
			<label for="v_min">Value (V: {hsv.v.min} - {hsv.v.max})</label>
			<input type="range" id="v_min" min="0" max="255" bind:value={hsv.v.min} on:input={() => {if(hsv.v.min > hsv.v.max) hsv.v.max = hsv.v.min}}/>
			<input type="range" id="v_max" min="0" max="255" bind:value={hsv.v.max} on:input={() => {if(hsv.v.max < hsv.v.min) hsv.v.min = hsv.v.max}}/>
		</div>
	</div>

	<div class="confirm-controls">
		<button class="confirm-button" on:click={handleConfirm}>✅ Confirm & Analyze</button>
	</div>
</div>

<style>
	.threshold-selector-container { display: flex; flex-direction: column; gap: 1.5rem; }
	.display-area { position: relative; width: 100%; max-width: 600px; margin: 0 auto; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; }
	.source-image { display: block; width: 100%; height: auto; }
	.mask-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; mix-blend-mode: screen; opacity: 0.8; }
	.area-display { text-align: center; font-size: 1.2rem; background: #e8f5e9; padding: 0.75rem; border-radius: 8px; }
	.controls-area { display: grid; grid-template-columns: 1fr; gap: 1rem; }
	.slider-group { background: #f0f8ff; padding: 1rem; border-radius: 8px; }
	.slider-group label { font-weight: bold; display: block; margin-bottom: 0.75rem; color: #333; font-size: 1rem; }
	input[type='range'] { width: 100%; margin-top: 0.5rem; }
	.confirm-controls { text-align: center; }
	.confirm-button { background-color: #4caf50; color: white; padding: 12px 24px; font-size: 1.1rem; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
</style>