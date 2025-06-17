<!-- src/lib/components/InteractiveEllipseAnnotator.svelte -->
<script lang="ts">
	// UPDATED: Import `setAppState` to control workflow transitions
	import { imageAnalysisStore, updateAnnotation, setAppState } from '$lib/stores/imageAnalysis';
	import type { Ellipse, Annotation } from '$lib/stores/imageAnalysis';
	import { drawEllipse, drawHandles, getEventCoords } from '$lib/utils/canvasUtils';

	export let imageProcessor: any;

	// ===== STATE =====
	$: annotationImage = $imageAnalysisStore.croppedImage || $imageAnalysisStore.capturedImage;
	$: annotation = $imageAnalysisStore.annotation;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let backgroundImage: HTMLImageElement | null;
	let ellipse: Ellipse;

	let isDragging = false;
	let activeHandle: 'center' | 'rx' | 'ry' | 'rotate' | null = null;
	let dragStart = { x: 0, y: 0 };
	let initialEllipse: Ellipse;
	let lastLoadedUrl: string | null = null;

	// ===== LIFECYCLE & INITIALIZATION =====
	$: if (annotationImage && canvas && annotationImage !== lastLoadedUrl) {
		loadImageAndInitialize(annotationImage);
	}
	
	$: if(annotation && ellipse !== annotation.ellipse) {
		ellipse = annotation.ellipse;
		redrawCanvas();
	}

	function loadImageAndInitialize(imageUrl: string) {
		lastLoadedUrl = imageUrl;
		ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		const img = new Image();
		img.onload = () => {
			backgroundImage = img;
			const aspectRatio = img.height / img.width;
			canvas.width = 800;
			canvas.height = canvas.width * aspectRatio;

			ellipse = { cx: canvas.width / 2, cy: canvas.height / 2, rx: canvas.width / 4, ry: canvas.width / 4, angle: 0 };
			saveAnnotation();
			redrawCanvas();
		};
		img.src = imageUrl;
	}
	
	// ===== DRAWING LOGIC =====
	function redrawCanvas() {
		if (!ctx || !canvas || !backgroundImage || !ellipse) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
		drawEllipse(ctx, ellipse);
		drawHandles(ctx, ellipse);
	}

	// ===== INTERACTION LOGIC =====
	function handleStart(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch, canvas);
		
		const handles = {
			center: { x: ellipse.cx, y: ellipse.cy },
			rx: { x: ellipse.cx + ellipse.rx * Math.cos(ellipse.angle), y: ellipse.cy + ellipse.rx * Math.sin(ellipse.angle) },
			ry: { x: ellipse.cx - ellipse.ry * Math.sin(ellipse.angle), y: ellipse.cy + ellipse.ry * Math.cos(ellipse.angle) },
			rotate: { x: ellipse.cx + ellipse.rx * Math.cos(ellipse.angle) * 1.2, y: ellipse.cy + ellipse.rx * Math.sin(ellipse.angle) * 1.2 }
		};

		const handleRadius = 15;
		for (const [name, pos] of Object.entries(handles)) {
			if (Math.hypot(coords.x - pos.x, coords.y - pos.y) < handleRadius) {
				isDragging = true;
				activeHandle = name as typeof activeHandle;
				dragStart = coords;
				initialEllipse = { ...ellipse };
				return;
			}
		}
	}

	function handleMove(event: MouseEvent | TouchEvent) {
		if (!isDragging || !activeHandle) return;
		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		const coords = getEventCoords(touch, canvas);
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
			if (activeHandle === 'rx') ellipse.rx = Math.max(5, Math.abs(localX));
			else if (activeHandle === 'ry') ellipse.ry = Math.max(5, Math.abs(localY));
		}
		redrawCanvas();
	}

	function handleEnd() {
		if (isDragging) {
			isDragging = false;
			activeHandle = null;
			saveAnnotation();
		}
	}

	// ===== WORKFLOW ACTIONS =====
	// UPDATED: This function now transitions to the next step
	function handleProceed() {
		saveAnnotation();
		setAppState('THRESHOLD');
	}
	
	function handleRefine() {
		if (imageProcessor) {
			saveAnnotation(); 
			imageProcessor.refineCurrentAnnotation();
		}
	}
	
	function saveAnnotation() {
		if (!ellipse || !canvas) return;
		const newAnnotation: Annotation = {
			ellipse,
			sourceDimensions: { width: canvas.width, height: canvas.height }
		};
		updateAnnotation(newAnnotation);
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
		<button class="control-button refine-button" on:click={handleRefine}> ✨ Refine Selection </button>
		<!-- UPDATED: Button text and action -->
		<button class="control-button proceed-button" on:click={handleProceed}> Select Leaf Color ➡️ </button>
	</div>
</div>

<style>
	.annotator-container { text-align: center; }
	.canvas-wrapper { margin-bottom: 1rem; }
	canvas { max-width: 100%; border-radius: 4px; border: 2px solid #ddd; cursor: pointer; touch-action: none; }
	.controls { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
	.control-button { padding: 12px 24px; font-size: 1.1rem; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
	.refine-button { background-color: #f0f0f0; border: 1px solid #ccc; color: #333; }
	.refine-button:hover { background-color: #e0e0e0; }
	/* UPDATED: Renamed analyze-button to proceed-button */
	.proceed-button { background-color: #2196f3; color: white; }
	.proceed-button:hover { background-color: #1976d2; }
</style>