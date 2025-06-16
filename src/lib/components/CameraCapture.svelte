<!-- src/lib/components/CameraCapture.svelte -->
<script lang="ts">
	import { updateCapturedImage } from '$lib/stores/imageAnalysis';

	// Camera elements and state
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let cameraError = '';

	// Export these so parent can check camera state
	export let isCameraActive = false;

	async function startCamera() {
		try {
			cameraError = '';
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment', // Rear camera preferred
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			});
			
			if (videoElement) {
				videoElement.srcObject = stream;
				isCameraActive = true;
			}
		} catch (error) {
			console.error('Camera error:', error);
			cameraError = `Camera access denied: ${error}`;
			isCameraActive = false;
		}
	}

	function capturePhoto() {
		if (!videoElement || !canvasElement) return;
		
		const context = canvasElement.getContext('2d');
		if (!context) return;

		// Set canvas size to match video
		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;
		
		// Draw current video frame to canvas
		context.drawImage(videoElement, 0, 0);
		
		// Convert to base64 image
		const capturedImage = canvasElement.toDataURL('image/jpeg', 0.8);
		
		// Update the store
		updateCapturedImage(capturedImage);
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
			isCameraActive = false;
		}
	}

	// Cleanup when component is destroyed
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		stopCamera();
	});
</script>

<div class="camera-section">
	<h2>Camera</h2>
	
	{#if cameraError}
		<p class="error">{cameraError}</p>
	{/if}
	
	<div class="camera-controls">
		<button on:click={startCamera} class="camera-button" disabled={isCameraActive}>
			Start Camera
		</button>
		<button on:click={capturePhoto} class="camera-button" disabled={!isCameraActive}>
			📸 Capture Photo
		</button>
		<button on:click={stopCamera} class="camera-button" disabled={!isCameraActive}>
			Stop Camera
		</button>
	</div>
	
	<div class="video-container">
		<video 
			bind:this={videoElement} 
			autoplay 
			playsinline 
			muted
			class="camera-video"
		></video>
	</div>
	
	<canvas bind:this={canvasElement} style="display: none;"></canvas>
</div>

<style>
	.camera-section {
		background: #f8f8f8;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}
	
	.camera-controls {
		display: flex;
		gap: 10px;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	
	.camera-button {
		background: #2196f3;
		color: white;
		border: none;
		padding: 10px 15px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}
	
	.camera-button:hover:not(:disabled) {
		background: #1976d2;
	}
	
	.camera-button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}
	
	.video-container {
		margin: 1rem 0;
		text-align: center;
	}
	
	.camera-video {
		max-width: 100%;
		max-height: 400px;
		border: 2px solid #ddd;
		border-radius: 8px;
	}
	
	.error {
		color: #d32f2f;
		background: #ffebee;
		padding: 10px;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
</style>