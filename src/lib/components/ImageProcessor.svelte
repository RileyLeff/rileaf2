<!-- src/lib/components/ImageProcessor.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	// UPDATED: Import the new `setProcessing` function
	import { imageAnalysisStore, updateProcessingResults, updateAnnotation, setProcessing } from '$lib/stores/imageAnalysis';
	import { analyzeLeafAreaInEllipse, refineEllipseSelection } from '$lib/opencv/detection';

	let opencvLoaded = false;
	onMount(async () => {
		if (opencvLoaded) return;
		try {
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

	// This function is for the final analysis
	export function processImageWithAnnotation() {
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		const annotation = state.annotation;

		if (!opencvLoaded) {
			alert('OpenCV is still loading. Please wait a moment and try again.');
			return;
		}
		if (!imageToProcess || !annotation) {
			alert('Missing image or annotation data.');
			return;
		}
		
		// Set processing to true before starting
		setProcessing(true);

		const img = new Image();
		img.onload = () => {
			try {
				const results = analyzeLeafAreaInEllipse(img, annotation);
				// This will log results, stop processing, AND move to the results page
				updateProcessingResults(results);
			} catch (error) {
				updateProcessingResults({ error: `Processing error: ${error}` });
			}
		};
		img.onerror = () => {
			updateProcessingResults({ error: 'Failed to load image for processing.' });
		};
		img.src = imageToProcess;
	}
	
	// This function is for the intermediate refinement step
	export async function refineCurrentAnnotation() {
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		const currentAnnotation = state.annotation;

		if (!opencvLoaded || !imageToProcess || !currentAnnotation) {
			alert('Cannot refine: Missing image or initial annotation.');
			return;
		}

		// UPDATED: Use the safe function to show the spinner
		setProcessing(true);

		setTimeout(() => {
			const img = new Image();
			img.onload = () => {
				try {
					const refinedAnnotation = refineEllipseSelection(img, currentAnnotation);
					updateAnnotation(refinedAnnotation);
				} catch (error) {
					console.error("Refinement failed:", error);
				} finally {
					// UPDATED: Use the safe function to hide the spinner
					setProcessing(false);
				}
			};
			img.src = imageToProcess;
		}, 50);
	}
</script>