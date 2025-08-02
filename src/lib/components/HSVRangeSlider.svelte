<!-- src/lib/components/HSVRangeSlider.svelte -->
<script lang="ts">
	import { afterUpdate } from 'svelte';

	// Props for our generic slider
	export let label: string;
	export let min_value: number;
	export let max_value: number;
	export let range_min: number = 0;
	export let range_max: number = 255;
	export let gradient_css: string; // The full-color gradient

	// --- Internal Logic ---
	// Convert absolute values to percentages for CSS
	$: minPercent = (min_value / range_max) * 100;
	$: maxPercent = (max_value / range_max) * 100;

	// This is the core magic: we construct a dynamic CSS linear-gradient
	// It has three parts: gray, the full color gradient, and gray again.
	$: trackStyle = `
        background: linear-gradient(
            to right,
            #cccccc 0%,
            #cccccc ${minPercent}%,
            ${gradient_css} ${minPercent}%,
            ${gradient_css} ${maxPercent}%,
            #cccccc ${maxPercent}%,
            #cccccc 100%
        );
    `;

	// Ensure min handle doesn't go past max, and vice-versa
	afterUpdate(() => {
		if (min_value > max_value) {
			max_value = min_value;
		}
		if (max_value < min_value) {
			min_value = max_value;
		}
	});
</script>

<div class="slider-group">
	<label>{label}</label>

	<div class="slider-wrapper">
		<!-- This div is our custom-styled track -->
		<div class="slider-track" style={trackStyle}></div>

		<!-- The two input sliders sit on top of the track -->
		<input
			type="range"
			min={range_min}
			max={range_max}
			bind:value={min_value}
			class="slider"
		/>
		<input
			type="range"
			min={range_min}
			max={range_max}
			bind:value={max_value}
			class="slider"
		/>
	</div>
</div>

<style>
	.slider-group {
		background: #f0f8ff;
		padding: 1rem;
		border-radius: 8px;
	}
	.slider-group label {
		font-weight: bold;
		display: block;
		margin-bottom: 0.75rem;
		color: #333;
		font-size: 1rem;
	}

	/* Wrapper to contain the track and sliders */
	.slider-wrapper {
		position: relative;
		height: 20px; /* Give it some height */
		display: flex;
		align-items: center;
	}

	/* The styled background track */
	.slider-track {
		position: absolute;
		top: 50%;
		left: 0;
		transform: translateY(-50%);
		width: 100%;
		height: 8px;
		border-radius: 4px;
		pointer-events: none; /* Allows clicks to pass through to the real sliders */
	}

	/* The actual input sliders */
	.slider {
		position: absolute;
		width: 100%;
		margin: 0;
		/* Make the slider itself invisible so we only see the thumb */
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		pointer-events: none; /* The thumb is still clickable */
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 20px;
		width: 20px;
		background: #ffffff;
		border: 2px solid #555;
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto; /* Make the thumb interactive */
		margin-top: -6px; /* Center thumb on track */
	}
	.slider::-moz-range-thumb {
		height: 20px;
		width: 20px;
		background: #ffffff;
		border: 2px solid #555;
		border-radius: 50%;
		cursor: grab;
		pointer-events: auto;
	}
</style>