<!-- src/routes/+page.svelte -->
<script lang="ts">
    import { imageAnalysisStore } from '$lib/stores/imageAnalysis';

    // Import all workflow components
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import ImageCropper from '$lib/components/ImageCropper.svelte';
    import InteractiveEllipseAnnotator from '$lib/components/InteractiveEllipseAnnotator.svelte';
    import ImageProcessor from '$lib/components/ImageProcessor.svelte';
    import ResultsView from '$lib/components/ResultsView.svelte';

    // Reactive state from the store
    $: appState = $imageAnalysisStore.appState;
    $: capturedImage = $imageAnalysisStore.capturedImage;
    $: isProcessing = $imageAnalysisStore.isProcessing;

    // Create a reference for the ImageProcessor instance
    let imageProcessor: ImageProcessor;
</script>

<div class="workflow-container">
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
            
            <!-- This component is now invisible but loads OpenCV and provides the processing function -->
            <ImageProcessor bind:this={imageProcessor} />

            <!-- Pass the processor instance to the annotator so it can call the analysis function -->
            <InteractiveEllipseAnnotator {imageProcessor} />
        </div>
    {/if}

    {#if appState === 'RESULTS'}
        <div class="step-container">
            <h2>Step 4: Results</h2>
            <p>Here is the calculated leaf area based on your annotation.</p>
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
    /* Styles remain the same as previously provided */
</style>