<!-- src/lib/components/ResultsView.svelte -->
<script lang="ts">
	import { imageAnalysisStore, resetWorkflow } from '$lib/stores/imageAnalysis';

	$: results = $imageAnalysisStore.processingResults;
	$: clipDiameter = $imageAnalysisStore.clipDiameter;

	let finalLeafArea = 0;
	let canvas: HTMLCanvasElement;

	// Calculate physical area when results are available
	$: if (results && results.leaf_analysis && results.ellipse_info) {
		const { total_leaf_area_pixels } = results.leaf_analysis;
		const { area_pixels: ellipse_area_pixels } = results.ellipse_info;

		if (ellipse_area_pixels > 0 && clipDiameter > 0) {
			const clipPhysicalArea = Math.PI * (clipDiameter / 2) ** 2;
			const pixelsPerMmSq = ellipse_area_pixels / clipPhysicalArea;
			finalLeafArea = total_leaf_area_pixels / pixelsPerMmSq;
		}
	}

	// This function will be called by the reactive statement below to draw the canvas
	function drawResultImage(imageUrl: string) {
		const ctx = canvas.getContext('2d');
		// This fixes the "'ctx' is possibly 'null'" error
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

	// This reactive block now properly calls a function, fixing the "'return' outside of function" error
	$: if (results && results.final_image_data_url && canvas) {
		drawResultImage(results.final_image_data_url);
	}
</script>

<div class="results-container">
	<div class="result-display">
		<span class="label">Estimated Leaf Area:</span>
		<span class="value">{finalLeafArea.toFixed(2)} mm²</span>
	</div>

	{#if results && results.final_image_data_url}
		<div class="image-display">
			<h4>Processed Image</h4>
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
	/* Styles remain the same */
	.results-container {
		text-align: center;
	}
	.result-display {
		background-color: #e8f5e9;
		padding: 2rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		border: 2px solid #4caf50;
	}
	.label {
		display: block;
		font-size: 1.2rem;
		color: #333;
		margin-bottom: 0.5rem;
	}
	.value {
		font-size: 2.5rem;
		font-weight: bold;
		color: #2e7d32;
	}
	.image-display {
		margin-bottom: 2rem;
	}
	.image-display canvas {
		max-width: 100%;
		border-radius: 4px;
	}
	.controls {
		margin-bottom: 2rem;
	}
	.restart-button {
		padding: 12px 24px;
		font-size: 1.1rem;
		font-weight: bold;
		color: white;
		background-color: #2196f3;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}
	.debug-details {
		text-align: left;
		font-size: 0.8rem;
		background: #f1f1f1;
		padding: 1rem;
		border-radius: 4px;
	}
	pre {
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>