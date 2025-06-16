<!-- src/lib/components/ImageProcessor.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { imageAnalysisStore, updateProcessingResults } from '$lib/stores/imageAnalysis';
	import { analyzeLeafAreaInEllipse } from '$lib/opencv/detection';
	import type { Ellipse } from '$lib/stores/imageAnalysis';

	// ===== OPENCV SETUP =====
	let opencvLoaded = false;
	onMount(async () => {
		if (opencvLoaded) return;
		try {
			// Check if script already exists
			if (document.getElementById('opencv-script')) {
				opencvLoaded = true;
				return;
			}
			const script = document.createElement('script');
			script.id = 'opencv-script';
			script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
			script.async = true;
			script.onload = () => {
				const checkOpenCV = () => {
					// @ts-ignore
					if (typeof cv !== 'undefined' && cv.getBuildInformation) {
						console.log('OpenCV.js loaded successfully');
						opencvLoaded = true;
					} else {
						setTimeout(checkOpenCV, 100);
					}
				};
				checkOpenCV();
			};
			document.head.appendChild(script);
		} catch (error) {
			console.error('Failed to load OpenCV:', error);
		}
	});

	// ===== EXPORTED FUNCTION FOR ANNOTATOR TO CALL =====
	export function processImageWithEllipse() {
		// Get latest state from store
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		const ellipse = state.ellipsePriors;

		if (!opencvLoaded) {
			alert('OpenCV is still loading. Please wait a moment and try again.');
			return;
		}
		if (!imageToProcess || !ellipse) {
			alert('Missing image or annotation data.');
			return;
		}

		updateProcessingResults(null, true); // Set isProcessing to true

		const img = new Image();
		img.onload = () => {
			try {
				const results = analyzeLeafAreaInEllipse(img, ellipse);
				updateProcessingResults(results, false); // Update with results, set isProcessing to false
			} catch (error) {
				updateProcessingResults({ error: `Processing error: ${error}` }, false);
			}
		};
		img.onerror = () => {
			updateProcessingResults({ error: 'Failed to load image for processing.' }, false);
		};
		img.src = imageToProcess;
	}
</script>

<!-- This component now has no visible UI. It's a background worker. -->