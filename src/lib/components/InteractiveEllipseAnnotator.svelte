<!-- src/lib/components/InteractiveEllipseAnnotator.svelte -->
<script lang="ts">
	import { imageAnalysisStore, updateEllipsePriors } from '$lib/stores/imageAnalysis';
	import type { Ellipse } from '$lib/stores/imageAnalysis';

	export let imageProcessor: any;

	// ===== STATE =====
	$: annotationImage = $imageAnalysisStore.croppedImage || $imageAnalysisStore.capturedImage;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let backgroundImage: HTMLImageElement | null;
	let ellipse: Ellipse;

	// Interaction state
	let isDragging = false;
	let activeHandle: 'center' | 'rx' | 'ry' | 'rotate' | null = null;
	let dragStart = { x: 0, y: 0 };
	let initialEllipse: Ellipse;

	// FIX: This guard prevents the initialization from running on every state change.
	let lastLoadedUrl: string | null = null;

	// ===== LIFECYCLE & INITIALIZATION =====
	$: if (annotationImage && canvas && annotationImage !== lastLoadedUrl) {
		loadImageAndInitialize(annotationImage);
	}

	function loadImageAndInitialize(imageUrl: string) {
		lastLoadedUrl = imageUrl; // Mark this image as loaded
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.onload = () => {
			backgroundImage = img;
			const aspectRatio = img.height / img.width;
			canvas.width = 800;
			canvas.height = canvas.width * aspectRatio;

			// This is the initialization that was causing the "snap-back".
			// It will now only run once per new image.
			ellipse = {
				cx: canvas.width / 2, cy: canvas.height / 2,
				rx: canvas.width / 4, ry: canvas.width / 4,
				angle: 0
			};
			redrawCanvas();
		};
		img.onerror = () => console.error('Annotator failed to load image');
		img.src = imageUrl;
	}

	// ===== DRAWING LOGIC =====
	function redrawCanvas() {
		if (!ctx || !canvas || !backgroundImage || !ellipse) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

		ctx.strokeStyle = '#44ff44';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.ellipse(ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, ellipse.angle, 0, 2 * Math.PI);
		ctx.stroke();

		drawHandles();
	}

	function getHandlePositions() {
		const { cx, cy, rx, ry, angle } = ellipse;
		const cosA = Math.cos(angle);
		const sinA = Math.sin(angle);
		return {
			center: { x: cx, y: cy },
			rx: { x: cx + rx * cosA, y: cy + rx * sinA },
			ry: { x: cx - ry * sinA, y: cy + ry * cosA },
			rotate: { x: cx + rx * cosA * 1.2, y: cy + rx * sinA * 1.2 }
		};
	}

	function drawHandles() {
		if (!ctx) return;
		const handles = getHandlePositions();
		ctx.fillStyle = '#44ff44';

		Object.values(handles).forEach((pos) => {
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
			ctx.fill();
		});
	}
	
    // ===== INTERACTION LOGIC =====
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
		const handles = getHandlePositions();
		const handleRadius = 15;

		for (const [name, pos] of Object.entries(handles)) {
			if (Math.hypot(coords.x - pos.x, coords.y - pos.y) < handleRadius) {
				isDragging = true;
				activeHandle = name as typeof activeHandle;
				dragStart = coords;
				initialEllipse = { ...ellipse }; // Capture state at the beginning of the drag
				return;
			}
		}
	}

	function handleMove(event: MouseEvent | TouchEvent) {
		if (!isDragging || !activeHandle) return;
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch);
		const dx = coords.x - dragStart.x;
		const dy = coords.y - dragStart.y;

		if (activeHandle === 'center') {
			ellipse.cx = initialEllipse.cx + dx;
			ellipse.cy = initialEllipse.cy + dy;
		} else if (activeHandle === 'rotate') {
			const initialAngle = Math.atan2(dragStart.y - initialEllipse.cy, dragStart.x - initialEllipse.cx);
			const currentAngle = Math.atan2(coords.y - initialEllipse.cy, coords.x - initialEllipse.cx);
			ellipse.angle = initialEllipse.angle + (currentAngle - initialAngle);
		} else {
			const cosA = Math.cos(-initialEllipse.angle);
			const sinA = Math.sin(-initialEllipse.angle);
			const localX = (coords.x - initialEllipse.cx) * cosA - (coords.y - initialEllipse.cy) * sinA;
			const localY = (coords.x - initialEllipse.cx) * sinA + (coords.y - initialEllipse.cy) * cosA;

			if (activeHandle === 'rx') {
				ellipse.rx = Math.max(5, Math.abs(localX));
			} else if (activeHandle === 'ry') {
				ellipse.ry = Math.max(5, Math.abs(localY));
			}
		}
		redrawCanvas();
	}

	function handleEnd() {
		if (isDragging) {
			updateEllipsePriors(ellipse);
			isDragging = false;
			activeHandle = null;
		}
	}

	function handleAnalyze() {
		if (imageProcessor) {
			updateEllipsePriors(ellipse);
			imageProcessor.processImageWithEllipse();
		}
	}
</script>

<div class="annotator-container">
	<div class="canvas-wrapper">
		<canvas
			bind:this={canvas}
			on:mousedown={handleStart}
			on:mousemove={handleMove}
			on:mouseup={handleEnd}
			on:mouseleave={handleEnd}
			on:touchstart|nonpassive={handleStart}
			on:touchmove|nonpassive={handleMove}
			on:touchend={handleEnd}
			on:touchcancel={handleEnd}
		></canvas>
	</div>
	<div class="controls">
		<button class="analyze-button" on:click={handleAnalyze}> ✅ Analyze Leaf Area </button>
	</div>
</div>

<style>
	/* Styles are unchanged */
	.annotator-container { text-align: center; }
	.canvas-wrapper { margin-bottom: 1rem; }
	canvas { max-width: 100%; border-radius: 4px; border: 2px solid #ddd; cursor: pointer; touch-action: none; }
	.controls { margin-top: 1rem; }
	.analyze-button { padding: 12px 24px; font-size: 1.1rem; font-weight: bold; color: white; background-color: #4caf50; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
	.analyze-button:hover { background-color: #45a049; }
</style>