<!-- src/lib/components/ResultsView.svelte -->
<script lang="ts">
	import { imageAnalysisStore, resetWorkflow } from '$lib/stores/imageAnalysis';

	$: results = $imageAnalysisStore.processingResults;
	$: chamberDiameter = $imageAnalysisStore.chamberDiameter;

	let finalLeafAreaMm2 = 0;
	let canvas: HTMLCanvasElement;

	// This reactive statement performs the final physical area calculation
	$: if (results && results.leaf_analysis && results.ellipse_info) {
		const { leaf_area_in_chamber_pixels } = results.leaf_analysis;
		const { chamber_area_pixels } = results.ellipse_info;

		if (chamber_area_pixels > 0 && chamberDiameter > 0) {
			const chamberPhysicalArea = Math.PI * (chamberDiameter / 2) ** 2;
			const pixelsPerMmSq = chamber_area_pixels / chamberPhysicalArea;
			finalLeafAreaMm2 = leaf_area_in_chamber_pixels / pixelsPerMmSq;
		}
	}

	// FIX: This function properly wraps the drawing logic, fixing the error.
	function drawResultImage(imageUrl: string) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const img = new Image();
		img.onload = () => {
			const aspectRatio = img.height / img.width;
			canvas.width = 800;
			canvas.height = canvas.width * aspectRatio;
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
		};
		img.src = imageUrl;
	}

	// This reactive statement now correctly calls the drawing function
	$: if (results && results.final_image_data_url && canvas) {
		drawResultImage(results.final_image_data_url);
	}
</script>

<div class="results-container">
	<div class="result-display">
		<span class="label">Final Leaf Area:</span>
		<span class="value">{finalLeafAreaMm2.toFixed(2)} mm²</span>
	</div>

	{#if results && results.final_image_data_url}
		<div class="image-display">
			<h4>Processed Image</h4>
			<p class="legend">
				<span class="legend-item cyan">Clip</span>
				<span class="legend-item yellow">Chamber</span>
				<span class="legend-item magenta">Detected Leaf</span>
			</p>
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}

	<div class="controls">
		<button class="restart-button" on:click={resetWorkflow}> 🔁 Measure New Sample </button>
	</div>

	{#if results && Object.keys(results).length > 0}
		<details class="debug-details">
			<summary>Raw Processing Data</summary>
			<pre>{JSON.stringify(results, null, 2)}</pre>
		</details>
	{/if}
</div>

<style>
	.results-container { text-align: center; }
	.result-display { background-color: #e8f5e9; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; border: 2px solid #4caf50; }
	.label { display: block; font-size: 1.2rem; color: #333; margin-bottom: 0.5rem; }
	.value { font-size: 2.5rem; font-weight: bold; color: #2e7d32; }
	.image-display { margin-bottom: 2rem; }
	.image-display canvas { max-width: 100%; border-radius: 4px; }
	.legend { display: flex; justify-content: center; gap: 1rem; margin-bottom: 0.5rem; font-size: 0.9rem; }
	.legend-item::before { content: '■'; display: inline-block; margin-right: 0.5em; }
	.legend-item.cyan::before { color: #00ffff; }
	.legend-item.yellow::before { color: #ffff00; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
	.legend-item.magenta::before { color: #ff00ff; }
	.controls { margin-bottom: 2rem; }
	.restart-button { padding: 12px 24px; font-size: 1.1rem; font-weight: bold; color: white; background-color: #2196f3; border: none; border-radius: 8px; cursor: pointer; }
	.debug-details { text-align: left; font-size: 0.8rem; background: #f1f1f1; padding: 1rem; border-radius: 4px; }
	pre { white-space: pre-wrap; word-wrap: break-word; }
</style>