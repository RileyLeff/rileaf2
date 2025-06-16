<script lang="ts">
	import { onMount } from 'svelte';
	
	let pyodide: any = null;
	let pythonOutput = 'Loading Python...';
	let isLoading = true;
	
	// Camera stuff
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let capturedImage: string | null = null;
	let cameraError = '';

	onMount(async () => {
		try {
			// Load Pyodide
			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
			script.onload = async () => {
				// @ts-ignore
				pyodide = await loadPyodide();
				console.log('Pyodide loaded!');
				runPythonTest();
				isLoading = false;
			};
			document.head.appendChild(script);
		} catch (error) {
			console.error('Failed to load Pyodide:', error);
			pythonOutput = 'Failed to load Python';
			isLoading = false;
		}
	});

	function runPythonTest() {
		if (!pyodide) return;
		
		const pythonCode = `
import math
import json

def test_function():
    result = {
        'message': 'Hello from Python!',
        'calculation': math.sqrt(42),
        'list_comprehension': [x**2 for x in range(5)]
    }
    return json.dumps(result, indent=2)

test_function()
		`;
		
		try {
			const result = pyodide.runPython(pythonCode);
			pythonOutput = result;
		} catch (error) {
			pythonOutput = `Python error: ${error}`;
		}
	}

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
			}
		} catch (error) {
			console.error('Camera error:', error);
			cameraError = `Camera access denied: ${error}`;
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
		capturedImage = canvasElement.toDataURL('image/jpeg', 0.8);
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
		}
	}
</script>

<main class="container">
	<h1>RiLeaf2 🍃</h1>
	
	<div class="camera-section">
		<h2>Camera</h2>
		
		{#if cameraError}
			<p class="error">{cameraError}</p>
		{/if}
		
		<div class="camera-controls">
			<button on:click={startCamera} class="camera-button">
				Start Camera
			</button>
			<button on:click={capturePhoto} class="camera-button" disabled={!stream}>
				📸 Capture Photo
			</button>
			<button on:click={stopCamera} class="camera-button" disabled={!stream}>
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
		
		{#if capturedImage}
			<div class="captured-section">
				<h3>Captured Image:</h3>
				<img src={capturedImage} alt="Captured" class="captured-image" />
			</div>
		{/if}
	</div>
	
	<div class="python-section">
		<h2>Python Integration Test</h2>
		{#if isLoading}
			<p class="loading">Loading Python interpreter...</p>
		{:else}
			<button on:click={runPythonTest} class="test-button">
				Run Python Test
			</button>
			<pre class="output">{pythonOutput}</pre>
		{/if}
	</div>
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
		font-family: Arial, sans-serif;
	}
	
	h1 {
		color: #2e7d32;
		text-align: center;
		margin-bottom: 2rem;
	}
	
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
	
	.captured-section {
		margin-top: 1rem;
		text-align: center;
	}
	
	.captured-image {
		max-width: 100%;
		max-height: 300px;
		border: 2px solid #4caf50;
		border-radius: 8px;
	}
	
	.error {
		color: #d32f2f;
		background: #ffebee;
		padding: 10px;
		border-radius: 4px;
		margin-bottom: 1rem;
	}
	
	.python-section {
		background: #f5f5f5;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}
	
	.loading {
		color: #666;
		font-style: italic;
	}
	
	.test-button {
		background: #4caf50;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 16px;
		margin-bottom: 1rem;
	}
	
	.test-button:hover {
		background: #45a049;
	}
	
	.output {
		background: #1e1e1e;
		color: #f0f0f0;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		border: 1px solid #ddd;
	}
</style>