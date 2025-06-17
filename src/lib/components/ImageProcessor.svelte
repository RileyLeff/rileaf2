<!-- src/lib/components/ImageProcessor.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { imageAnalysisStore, updateProcessingResults, updateAnnotation, setProcessing } from '$lib/stores/imageAnalysis';
	import { analyzeLeafAreaInEllipse, getThresholdPreviewAndArea, refineEllipseSelection } from '$lib/opencv/detection';
	import type { HSVRange, Annotation } from '$lib/stores/imageAnalysis';

	declare const cv: any; // FIX: Declare cv to make TypeScript aware of it.
	let opencvLoaded = false;

	onMount(() => {
		if (document.getElementById('opencv-script')) {
			if(typeof cv !== 'undefined') opencvLoaded = true;
			return;
		}
		const script = document.createElement('script');
		script.id = 'opencv-script';
		script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
		script.async = true;
		script.onload = () => {
			const checkOpenCV = () => {
				if (typeof cv !== 'undefined') {
					console.log('OpenCV.js loaded successfully.');
					opencvLoaded = true;
				} else {
					setTimeout(checkOpenCV, 100);
				}
			};
			checkOpenCV();
		};
		document.head.appendChild(script);
	});

	export function processImageWithAnnotation() {
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		// FIX: Add null check before proceeding
		if (!imageToProcess || !state.annotation) {
			alert('Cannot process: missing image or annotation.');
			return;
		}
		const annotation: Annotation = state.annotation; // Create non-null version

		setProcessing(true);
		const img = new Image();
		img.onload = () => {
			try {
				const results = analyzeLeafAreaInEllipse(img, annotation, state.hsvThresholds, state.chamberDiameter, state.clipDiameter);
				updateProcessingResults(results);
			} catch (error) {
				updateProcessingResults({ error: `Processing error: ${error}` });
			}
		};
		img.src = imageToProcess;
	}
	
	export async function getThresholdPreview(hsv: HSVRange) {
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		// FIX: Add null check before proceeding
		if (!opencvLoaded || !imageToProcess || !state.annotation) return null;
		const annotation: Annotation = state.annotation; // Create non-null version
		
		return new Promise(resolve => {
			const img = new Image();
			img.onload = () => {
				const previewData = getThresholdPreviewAndArea(img, annotation, hsv, state.chamberDiameter, state.clipDiameter);
				resolve(previewData);
			};
			img.src = imageToProcess;
		});
	}
	
	export async function refineCurrentAnnotation() {
		const state = $imageAnalysisStore;
		const imageToProcess = state.croppedImage || state.capturedImage;
		// FIX: Add null check before proceeding
		if (!opencvLoaded || !imageToProcess || !state.annotation) {
			alert('Cannot refine: Missing image or initial annotation.');
			return;
		}
		const currentAnnotation: Annotation = state.annotation; // Create non-null version

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
					setProcessing(false);
				}
			};
			img.src = imageToProcess;
		}, 50);
	}
</script>