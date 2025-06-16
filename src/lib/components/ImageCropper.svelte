<!-- src/lib/components/ImageCropper.svelte -->
<script lang="ts">
	import { imageAnalysisStore, setAppState, updateCroppedImage } from '$lib/stores/imageAnalysis';

	// ===== STATE =====
	$: capturedImage = $imageAnalysisStore.capturedImage;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let backgroundImage: HTMLImageElement | null;
	let isDrawing = false;
	let cropRect = { startX: 0, startY: 0, endX: 0, endY: 0 };
	let hasCropped = false;

	// ===== LIFECYCLE & INITIALIZATION =====
	$: if (capturedImage) {
		initCanvas();
	}

	function initCanvas() {
		if (!canvas || !capturedImage) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.onload = () => {
			backgroundImage = img;
			const aspectRatio = img.height / img.width;
			canvas.width = 800; // Set a fixed canvas render width
			canvas.height = canvas.width * aspectRatio;
			redrawCanvas();
		};
		img.src = capturedImage;
	}

	function redrawCanvas() {
		if (!ctx || !canvas || !backgroundImage) return;

		// Draw background image
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

		// Draw crop rectangle if it exists
		if (isDrawing || hasCropped) {
			const { startX, startY, endX, endY } = cropRect;
			const width = endX - startX;
			const height = endY - startY;

			ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
			ctx.strokeStyle = '#0064ff';
			ctx.lineWidth = 2;

			ctx.fillRect(startX, startY, width, height);
			ctx.strokeRect(startX, startY, width, height);
		}
	}

	// ===== INTERACTION HANDLERS =====
	function getEventCoords(event: MouseEvent | Touch) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (event.clientX - rect.left) * scaleX,
			y: (event.clientY - rect.top) * scaleY
		};
	}

	function handleStart(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch);

		isDrawing = true;
		hasCropped = false;
		cropRect.startX = coords.x;
		cropRect.startY = coords.y;
		cropRect.endX = coords.x;
		cropRect.endY = coords.y;
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
		hasCropped = true;
		redrawCanvas();
	}

	// ===== WORKFLOW ACTIONS =====
	function confirmCrop() {
		if (!backgroundImage) return;

		const { startX, startY, endX, endY } = cropRect;
		const x = Math.min(startX, endX);
		const y = Math.min(startY, endY);
		const width = Math.abs(endX - startX);
		const height = Math.abs(endY - startY);

		if (width < 20 || height < 20) {
			alert('Please select a larger area to crop.');
			return;
		}

		// Scale canvas coords to original image dimensions
		const scaleX = backgroundImage.naturalWidth / canvas.width;
		const scaleY = backgroundImage.naturalHeight / canvas.height;

		const sourceX = x * scaleX;
		const sourceY = y * scaleY;
		const sourceWidth = width * scaleX;
		const sourceHeight = height * scaleY;

		// Create a new canvas to draw the cropped image
		const cropCanvas = document.createElement('canvas');
		cropCanvas.width = sourceWidth;
		cropCanvas.height = sourceHeight;
		const cropCtx = cropCanvas.getContext('2d');

		if (cropCtx) {
			cropCtx.drawImage(
				backgroundImage,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				sourceWidth,
				sourceHeight
			);
			const croppedDataUrl = cropCanvas.toDataURL('image/jpeg');
			updateCroppedImage(croppedDataUrl); // This will also transition the app state
		}
	}

	function skipCrop() {
		if (capturedImage) {
			// Set the "cropped" image to be the original captured one
			updateCroppedImage(capturedImage);
		}
	}
</script>

<div class="cropper-container">
	<div class="canvas-wrapper">
		<canvas
			bind:this={canvas}
			on:mousedown={handleStart}
			on:mousemove={handleMove}
			on:mouseup={handleEnd}
			on:mouseleave={handleEnd}
			on:touchstart={handleStart}
			on:touchmove={handleMove}
			on:touchend={handleEnd}
			on:touchcancel={handleEnd}
		></canvas>
	</div>

	<div class="controls">
		<button class="control-button skip" on:click={skipCrop}>Use Full Image</button>
		<button class="control-button confirm" on:click={confirmCrop} disabled={!hasCropped}>
			Confirm Crop
		</button>
	</div>
</div>

<style>
	.cropper-container {
		text-align: center;
	}
	.canvas-wrapper {
		margin-bottom: 1rem;
	}
	canvas {
		max-width: 100%;
		border-radius: 4px;
		border: 2px solid #ddd;
		cursor: crosshair;
		touch-action: none;
	}
	.controls {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}
	.control-button {
		padding: 12px 20px;
		border-radius: 5px;
		border: none;
		font-size: 1rem;
		cursor: pointer;
		font-weight: bold;
	}
	.skip {
		background-color: #f0f0f0;
		border: 1px solid #ccc;
		color: #333;
	}
	.confirm {
		background-color: #2196f3;
		color: white;
	}
	.confirm:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
</style>