<!-- src/lib/components/ClipConfiguration.svelte -->
<script lang="ts">
	import { imageAnalysisStore, updateClipDiameter, updateChamberDiameter } from '$lib/stores/imageAnalysis';

	// These are reactive and get their values from the store.
	$: clipDiameter = $imageAnalysisStore.clipDiameter;
	$: chamberDiameter = $imageAnalysisStore.chamberDiameter;

	// FIX: Initialize local state safely as empty strings.
	let clipDiameterInput = '';
	let chamberDiameterInput = '';
	let diameterError = '';

	// FIX: Use a reactive statement to sync the local input state
	// AFTER the store values are guaranteed to exist.
	$: if (clipDiameter) {
		clipDiameterInput = clipDiameter.toString();
	}
	$: if (chamberDiameter) {
		chamberDiameterInput = chamberDiameter.toString();
	}

	function validateAndSaveChanges() {
		const newClipD = parseFloat(clipDiameterInput);
		const newChamberD = parseFloat(chamberDiameterInput);

		if (isNaN(newClipD) || isNaN(newChamberD) || newClipD <= 0 || newChamberD <= 0) {
			diameterError = 'Diameters must be positive numbers.';
			return;
		}

		if (newChamberD >= newClipD) {
			diameterError = 'Chamber diameter must be smaller than clip diameter.';
			return;
		}

		// If validation passes
		diameterError = '';
		updateClipDiameter(newClipD);
		updateChamberDiameter(newChamberD);
	}
</script>

<div class="clip-config-section">
	<h2>Settings</h2>
	
	<div class="config-row">
		<label for="clip-diameter-input">Clip Diameter:</label>
		<div class="input-group">
			<input 
				id="clip-diameter-input"
				type="number" 
				step="0.1" 
				min="1"
				bind:value={clipDiameterInput}
				on:change={validateAndSaveChanges}
				on:blur={validateAndSaveChanges}
				class="diameter-input"
			/>
			<span class="unit-label">mm</span>
		</div>
	</div>
	
	<div class="config-row">
		<label for="chamber-diameter-input">Chamber Diameter:</label>
		<div class="input-group">
			<input 
				id="chamber-diameter-input"
				type="number" 
				step="0.1" 
				min="1"
				bind:value={chamberDiameterInput}
				on:change={validateAndSaveChanges}
				on:blur={validateAndSaveChanges}
				class="diameter-input"
			/>
			<span class="unit-label">mm</span>
		</div>
	</div>
	
	{#if diameterError}
		<p class="error-text">{diameterError}</p>
	{/if}

	<p class="help-text">
		Enter the physical diameters for accurate measurements.
	</p>
</div>

<style>
	.clip-config-section { background: #f0f8ff; padding: 1.5rem; border-radius: 8px; }
	h2 { margin-top: 0; }
	.config-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
	label { font-weight: bold; color: #333; min-width: 150px; }
	.input-group { display: flex; align-items: center; gap: 0.5rem; }
	.diameter-input { padding: 8px 12px; border: 2px solid #ddd; border-radius: 4px; font-size: 16px; width: 80px; text-align: center; }
	.diameter-input:focus { outline: none; border-color: #2196f3; }
	.unit-label { font-weight: bold; color: #666; }
	.help-text { font-size: 14px; color: #666; margin: 0; font-style: italic; }
	.error-text { font-size: 14px; color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; margin-top: 1rem; }
</style>