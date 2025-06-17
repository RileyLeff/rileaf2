<!-- src/lib/components/ImageCropper.svelte -->
<script lang="ts">
	import { afterUpdate } from 'svelte';
	import { imageAnalysisStore, updateCroppedImage } from '$lib/stores/imageAnalysis';

	$: capturedImage = $imageAnalysisStore.capturedImage;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let backgroundImage: HTMLImageElement | null;
	let isDrawing = false;
	let cropRect = { startX: 0, startY: 0, endX: 0, endY: 0 };
	let hasSelection = false;
	let lastLoadedUrl: string | null = null;

	afterUpdate(() => {
		if (capturedImage && capturedImage !== lastLoadedUrl) {
			loadImageAndDraw(capturedImage);
		}
	});

	function loadImageAndDraw(imageUrl: string) {
		lastLoadedUrl = imageUrl;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.onload = () => {
			backgroundImage = img;
			const aspectRatio = img.height / img.width;
			canvas.width = 800;
			canvas.height = canvas.width * aspectRatio;
			ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
			hasSelection = false;
			isDrawing = false;
		};
		img.src = imageUrl;
	}

	function redrawCanvas() {
		// FIX: Add null check for ctx
		if (!ctx || !canvas || !backgroundImage) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

		if (hasSelection || isDrawing) {
			const x = Math.min(cropRect.startX, cropRect.endX);
			const y = Math.min(cropRect.startY, cropRect.endY);
			const width = Math.abs(cropRect.endX - cropRect.startX);
			const height = Math.abs(cropRect.endY - cropRect.startY);
			ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
			ctx.strokeStyle = '#0064ff';
			ctx.lineWidth = 2;
			ctx.fillRect(x, y, width, height);
			ctx.strokeRect(x, y, width, height);
		}
	}

	function getEventCoords(event: MouseEvent | Touch) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
	}

	function handleStart(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch);
		isDrawing = true;
		hasSelection = false;
		cropRect = { startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y };
	}

	function handleMove(event: MouseEvent | TouchEvent) {
		if (!isDrawing) return;
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch);
		cropRect.endX = coords.x;
		cropRect.endY = coords.y;
		redrawCanvas();
	}

	function handleEnd() {
		if (!isDrawing) return;
		isDrawing = false;
		if (Math.abs(cropRect.endX - cropRect.startX) > 10 && Math.abs(cropRect.endY - cropRect.startY) > 10) {
			hasSelection = true;
		}
		redrawCanvas();
	}

	function confirmCrop() {
		if (!backgroundImage || !hasSelection) return;
		
		const x = Math.min(cropRect.startX, cropRect.endX);
		const y = Math.min(cropRect.startY, cropRect.endY);
		const width = Math.abs(cropRect.endX - cropRect.startX);
		const height = Math.abs(cropRect.endY - cropRect.startY);
		const scaleX = backgroundImage.naturalWidth / canvas.width;
		const scaleY = backgroundImage.naturalHeight / canvas.height;
		const cropCanvas = document.createElement('canvas');
		cropCanvas.width = width * scaleX;
		cropCanvas.height = height * scaleY;
		const cropCtx = cropCanvas.getContext('2d');
		if (cropCtx) {
			cropCtx.drawImage(backgroundImage, x * scaleX, y * scaleY, width * scaleX, height * scaleY, 0, 0, width * scaleX, height * scaleY);
			updateCroppedImage(cropCanvas.toDataURL('image/jpeg'));
		}
	}

	function skipCrop() {
		if (capturedImage) {
			updateCroppedImage(capturedImage);
		}
	}
</script>

<div class="cropper-container">
	<div class="canvas-wrapper">
		<canvas bind:this={canvas} on:mousedown={handleStart} on:mousemove={handleMove} on:mouseup={handleEnd} on:mouseleave={handleEnd} on:touchstart|nonpassive={handleStart} on:touchmove|nonpassive={handleMove} on:touchend={handleEnd} on:touchcancel={handleEnd} ></canvas>
	</div>
	<div class="controls">
		<button class="control-button skip" on:click={skipCrop}>Use Full Image</button>
		<button class="control-button confirm" on:click={confirmCrop} disabled={!hasSelection}> Confirm Crop </button>
	</div>
</div>

<style>
	.cropper-container { text-align: center; }
	.canvas-wrapper { margin-bottom: 1rem; }
	canvas { max-width: 100%; border-radius: 4px; border: 2px solid #ddd; cursor: crosshair; touch-action: none; }
	.controls { display: flex; justify-content: center; gap: 1rem; }
	.control-button { padding: 12px 20px; border-radius: 5px; border: none; font-size: 1rem; cursor: pointer; font-weight: bold; }
	.skip { background-color: #f0f0f0; border: 1px solid #ccc; color: #333; }
	.confirm { background-color: #2196f3; color: white; }
	.confirm:disabled { background-color: #ccc; cursor: not-allowed; }
</style>