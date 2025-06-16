<!-- src/lib/components/ClipConfiguration.svelte -->
<script lang="ts">
	import { imageAnalysisStore, updateClipDiameter } from '$lib/stores/imageAnalysis';

	$: clipDiameter = $imageAnalysisStore.clipDiameter;
	
	let diameterInput = clipDiameter.toString();

	function handleDiameterChange() {
		const newDiameter = parseFloat(diameterInput);
		if (!isNaN(newDiameter) && newDiameter > 0) {
			updateClipDiameter(newDiameter);
		}
	}

	// Update local input when store changes (e.g., from localStorage)
	$: if (clipDiameter !== parseFloat(diameterInput)) {
		diameterInput = clipDiameter.toString();
	}
</script>

<div class="clip-config-section">
	<h2>Clip Configuration</h2>
	
	<div class="config-row">
		<label for="diameter-input">Clip Diameter:</label>
		<div class="input-group">
			<input 
				id="diameter-input"
				type="number" 
				step="0.1" 
				min="1" 
				max="100"
				bind:value={diameterInput}
				on:change={handleDiameterChange}
				on:blur={handleDiameterChange}
				class="diameter-input"
			/>
			<span class="unit-label">mm</span>
		</div>
	</div>
	
	<p class="help-text">
		Enter the physical diameter of your 3D printed clip for accurate measurements.
	</p>
</div>

<style>
	.clip-config-section {
		background: #f0f8ff;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}
	
	.config-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	
	label {
		font-weight: bold;
		color: #333;
		min-width: 120px;
	}
	
	.input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.diameter-input {
		padding: 8px 12px;
		border: 2px solid #ddd;
		border-radius: 4px;
		font-size: 16px;
		width: 80px;
		text-align: center;
	}
	
	.diameter-input:focus {
		outline: none;
		border-color: #2196f3;
	}
	
	.unit-label {
		font-weight: bold;
		color: #666;
	}
	
	.help-text {
		font-size: 14px;
		color: #666;
		margin: 0;
		font-style: italic;
	}
</style>