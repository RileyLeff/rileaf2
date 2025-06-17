<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { imageAnalysisStore } from '$lib/stores/imageAnalysis';

    // Import all workflow components
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import ImageCropper from '$lib/components/ImageCropper.svelte';
    import InteractiveEllipseAnnotator from '$lib/components/InteractiveEllipseAnnotator.svelte';
    import ImageProcessor from '$lib/components/ImageProcessor.svelte';
    import ResultsView from '$lib/components/ResultsView.svelte';
    // NEW: Import the new component
    import ThresholdSelector from '$lib/components/ThresholdSelector.svelte';

    // Reactive state from the store
    $: appState = $imageAnalysisStore.appState;
    $: capturedImage = $imageAnalysisStore.capturedImage;
    $: isProcessing = $imageAnalysisStore.isProcessing;

    // Create a reference for the ImageProcessor instance
    let imageProcessor: ImageProcessor;
</script>

<div class="workflow-container">
    <!-- This invisible component is always present to load OpenCV and provide functions -->
    <ImageProcessor bind:this={imageProcessor} />

    <!-- Render component based on the current app state -->

    {#if appState === 'CAMERA'}
        <div class="step-container">
            <h2>Step 1: Capture Photo</h2>
            <p>Use your camera to take a picture of the sample inside the clip.</p>
            <CameraCapture />
        </div>
    {/if}

    {#if appState === 'CROP' && capturedImage}
        <div class="step-container">
            <h2>Step 2: Crop Image (Optional)</h2>
            <p>Drag to select the area around the clip, then click "Confirm Crop" to zoom in. This improves accuracy.</p>
            <ImageCropper />
        </div>
    {/if}

    {#if appState === 'ANNOTATE'}
        <div class="step-container">
            <h2>Step 3: Annotate Clip</h2>
            <p>Adjust the ellipse to perfectly match the inner edge of the clip.</p>
            <InteractiveEllipseAnnotator {imageProcessor} />
        </div>
    {/if}

    <!-- NEW: Add the thresholding step to the workflow -->
    {#if appState === 'THRESHOLD'}
        <div class="step-container">
            <h2>Step 4: Select Leaf Color</h2>
            <p>Adjust the sliders until only the leaf area is highlighted in white.</p>
            <ThresholdSelector {imageProcessor} />
        </div>
    {/if}

    {#if appState === 'RESULTS'}
        <div class="step-container">
            <h2>Step 5: Results</h2>
            <p>Here is the calculated leaf area based on your selection.</p>
            <ResultsView />
        </div>
    {/if}

    <!-- Global processing indicator -->
    {#if isProcessing}
        <div class="processing-overlay">
            <div class="spinner"></div>
            <p>Processing...</p>
        </div>
    {/if}
</div>

<style>
	.workflow-container { font-family: Arial, sans-serif; }
	.step-container { padding: 1rem; background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; }
	.step-container h2 { color: #2e7d32; margin-top: 0; }
	.step-container p { color: #555; font-size: 0.9rem; margin-bottom: 1.5rem; }
	.processing-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.8); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 2000; }
	.processing-overlay p { margin-top: 1rem; font-weight: bold; color: #2e7d32; }
	.spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #4caf50; animation: spin 1s ease infinite; }
	@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>