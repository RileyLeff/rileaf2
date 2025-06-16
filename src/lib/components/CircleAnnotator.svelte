<!-- src/lib/components/CircleAnnotator.svelte -->
<script lang="ts">
	import { imageAnalysisStore, updateCirclePriors } from '$lib/stores/imageAnalysis';

	export let visible = false;

	// ===== STATE =====
	$: capturedImage = $imageAnalysisStore.capturedImage;
	
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let isDrawing = false;
	let lines: Array<{start: {x: number, y: number}, end: {x: number, y: number}}> = [];
	let currentLine: {start: {x: number, y: number}, end: {x: number, y: number}} | null = null;
	let estimatedCircle: {center: {x: number, y: number}, radius: number} | null = null;
	let backgroundImage: HTMLImageElement | null = null;
	let canvasInitialized = false;
	let lastImageUrl = '';  // Track image changes properly

	// ===== DRAWING FUNCTIONS =====
	function getEventCoords(event: MouseEvent | Touch, canvas: HTMLCanvasElement) {
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		
		return {
			x: (event.clientX - rect.left) * scaleX,
			y: (event.clientY - rect.top) * scaleY
		};
	}

	function startDrawing(event: MouseEvent) {
		if (!canvas || !ctx) {
			console.log('Start drawing blocked: no canvas or context');
			return;
		}
		
		if (!canvasInitialized || !backgroundImage) {
			console.log('Canvas not ready for drawing:', { 
				canvasInitialized, 
				backgroundImage: !!backgroundImage 
			});
			return;
		}
		
		const coords = getEventCoords(event, canvas);
		
		isDrawing = true;
		currentLine = {
			start: coords,
			end: coords
		};
		
		console.log('✅ Started drawing at:', coords.x, coords.y);
	}

	function draw(event: MouseEvent) {
		if (!isDrawing) return;
		
		if (!currentLine || !ctx || !canvas) {
			console.log('Draw blocked while drawing:', { currentLine: !!currentLine, ctx: !!ctx, canvas: !!canvas });
			return;
		}
		
		const coords = getEventCoords(event, canvas);
		currentLine.end = coords;
		
		redrawCanvas();
	}

	// Touch event handlers with proper coordinate calculation
	function handleTouchStart(event: TouchEvent) {
		event.preventDefault();
		if (event.touches.length === 1) {
			const touch = event.touches[0];
			const coords = getEventCoords(touch, canvas);
			
			if (!canvas || !ctx || !canvasInitialized || !backgroundImage) {
				console.log('Touch start - canvas not ready');
				return;
			}
			
			isDrawing = true;
			currentLine = {
				start: coords,
				end: coords
			};
			
			console.log('✅ Touch started at:', coords.x, coords.y);
		}
	}

	function handleTouchMove(event: TouchEvent) {
		event.preventDefault();
		if (!isDrawing || event.touches.length !== 1) return;
		
		if (!currentLine || !ctx || !canvas) {
			console.log('Touch move blocked');
			return;
		}
		
		const touch = event.touches[0];
		const coords = getEventCoords(touch, canvas);
		currentLine.end = coords;
		
		console.log('Touch move to:', coords.x, coords.y);
		redrawCanvas();
	}

	function handleTouchEnd(event: TouchEvent) {
		event.preventDefault();
		stopDrawing();
	}

	function stopDrawing() {
		console.log('Stop drawing called, isDrawing:', isDrawing, 'currentLine:', !!currentLine); // Debug
		
		if (!isDrawing || !currentLine) return;
		
		console.log('Finished drawing line:', currentLine); // Debug
		
		isDrawing = false;
		lines.push({...currentLine});
		currentLine = null;
		
		// Calculate estimated circle if we have enough lines
		if (lines.length >= 2) {
			calculateCircleFromLines();
		}
		
		redrawCanvas();
	}

	function redrawCanvas() {
		if (!ctx || !canvas || !backgroundImage) return;
		
		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Draw the background image immediately (no async loading)
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
		
		// Draw annotations on top
		drawAnnotations();
	}

	function drawAnnotations() {
		if (!ctx) return;
		
		// Draw completed lines
		ctx.strokeStyle = '#ff4444';
		ctx.lineWidth = 3;
		
		lines.forEach(line => {
			ctx!.beginPath();
			ctx!.moveTo(line.start.x, line.start.y);
			ctx!.lineTo(line.end.x, line.end.y);
			ctx!.stroke();
			
			// Draw endpoints
			ctx!.fillStyle = '#ff4444';
			ctx!.beginPath();
			ctx!.arc(line.start.x, line.start.y, 4, 0, 2 * Math.PI);
			ctx!.fill();
			ctx!.beginPath();
			ctx!.arc(line.end.x, line.end.y, 4, 0, 2 * Math.PI);
			ctx!.fill();
		});
		
		// Draw current line being drawn (this was the missing piece!)
		if (currentLine && isDrawing) {
			ctx.strokeStyle = '#ff8888';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(currentLine.start.x, currentLine.start.y);
			ctx.lineTo(currentLine.end.x, currentLine.end.y);
			ctx.stroke();
			
			// Draw current endpoint
			ctx.fillStyle = '#ff8888';
			ctx.beginPath();
			ctx.arc(currentLine.end.x, currentLine.end.y, 3, 0, 2 * Math.PI);
			ctx.fill();
		}
		
		// Draw estimated circle
		if (estimatedCircle) {
			ctx.strokeStyle = '#44ff44';
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 5]);
			ctx.beginPath();
			ctx.arc(estimatedCircle.center.x, estimatedCircle.center.y, estimatedCircle.radius, 0, 2 * Math.PI);
			ctx.stroke();
			ctx.setLineDash([]);
			
			// Draw center point
			ctx.fillStyle = '#44ff44';
			ctx.beginPath();
			ctx.arc(estimatedCircle.center.x, estimatedCircle.center.y, 6, 0, 2 * Math.PI);
			ctx.fill();
		}
	}

	function calculateCircleFromLines() {
		if (lines.length < 2) return;
		
		// For simplicity, use the first two lines to estimate center
		const line1 = lines[0];
		const line2 = lines[1];
		
		// Calculate intersection of the two lines (circle center)
		const center = findLineIntersection(line1, line2);
		
		if (!center) return; // Lines are parallel
		
		// Calculate average radius from center to all line endpoints
		const distances: number[] = [];
		lines.forEach(line => {
			distances.push(getDistance(center, line.start));
			distances.push(getDistance(center, line.end));
		});
		
		const radius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
		
		estimatedCircle = { center, radius };
		
		// Update store with the estimated circle parameters
		updateCirclePriors({
			center: [center.x, center.y],
			radius: radius,
			confidence: Math.min(lines.length / 3, 1) // More lines = higher confidence
		});
	}

	function findLineIntersection(line1: any, line2: any) {
		const x1 = line1.start.x, y1 = line1.start.y;
		const x2 = line1.end.x, y2 = line1.end.y;
		const x3 = line2.start.x, y3 = line2.start.y;
		const x4 = line2.end.x, y4 = line2.end.y;
		
		const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		
		if (Math.abs(denom) < 0.001) return null; // Lines are parallel
		
		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
		
		return {
			x: x1 + t * (x2 - x1),
			y: y1 + t * (y2 - y1)
		};
	}

	function getDistance(p1: {x: number, y: number}, p2: {x: number, y: number}) {
		return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
	}

	function initCanvas() {
		if (!canvas || !capturedImage) {
			console.log('Init blocked: no canvas or image');
			return;
		}
		
		if (canvasInitialized && lastImageUrl === capturedImage) {
			console.log('Canvas already initialized for this image');
			return;
		}
		
		console.log('Starting canvas initialization...');
		
		ctx = canvas.getContext('2d');
		if (!ctx) {
			console.log('Failed to get canvas context');
			return;
		}
		
		// Create a new image instance for this initialization
		const img = new Image();
		img.onload = () => {
			console.log('Background image loaded successfully');
			
			// Double-check we still have the canvas and this is still the current image
			if (!canvas || !capturedImage || img.src !== capturedImage) {
				console.log('Canvas state changed during image load, aborting');
				return;
			}
			
			// Set canvas size to match the image aspect ratio
			const maxWidth = 600;
			const aspectRatio = img.height / img.width;
			
			canvas.width = maxWidth;
			canvas.height = maxWidth * aspectRatio;
			
			console.log('Canvas sized:', canvas.width, 'x', canvas.height);
			
			// Store the loaded image and mark as initialized
			backgroundImage = img;
			canvasInitialized = true;
			lastImageUrl = capturedImage;
			
			console.log('✅ Canvas initialization complete!');
			
			// Now we can safely draw
			redrawCanvas();
		};
		img.onerror = (error) => {
			console.error('Failed to load background image for annotator:', error);
		};
		img.src = capturedImage;
	}

	function clearLines() {
		lines = [];
		currentLine = null;
		estimatedCircle = null;
		updateCirclePriors(null);
		redrawCanvas();
	}

	// Debug function to test canvas drawing
	function testCanvas() {
		console.log('=== CANVAS TEST ===');
		console.log('Canvas:', !!canvas);
		console.log('Context:', !!ctx);
		console.log('Initialized:', canvasInitialized);
		console.log('Background image:', !!backgroundImage);
		console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
		
		if (!ctx || !canvas) {
			console.log('❌ Canvas/context not available for test');
			return;
		}
		
		if (!canvasInitialized) {
			console.log('⚠️ Canvas not initialized, trying to initialize...');
			initCanvas();
			return;
		}
		
		console.log('✅ Drawing test line...');
		
		// Save context state
		ctx.save();
		
		// Draw test line
		ctx.strokeStyle = '#ff0000';
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(50, 50);
		ctx.lineTo(150, 150);
		ctx.stroke();
		
		// Draw test circle
		ctx.strokeStyle = '#00ff00';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(100, 100, 30, 0, 2 * Math.PI);
		ctx.stroke();
		
		// Restore context state
		ctx.restore();
		
		console.log('✅ Test shapes drawn!');
	}

	// Only reset when the image URL actually changes
	$: if (capturedImage && capturedImage !== lastImageUrl) {
		console.log('📸 Image changed from', lastImageUrl ? 'previous' : 'none', 'to new image');
		resetCanvasForNewImage();
	}
	
	// Initialize canvas when it becomes available
	$: if (canvas && capturedImage && !canvasInitialized) {
		console.log('🎨 Canvas ready, initializing...');
		initCanvas();
	}

	function resetCanvasForNewImage() {
		console.log('Resetting canvas for new image...');
		canvasInitialized = false;
		backgroundImage = null;
		lines = [];
		currentLine = null;
		estimatedCircle = null;
		isDrawing = false;
		
		// Initialize for the new image
		if (canvas) {
			initCanvas();
		}
	}
</script>

{#if visible && capturedImage}
<div class="annotator-section">
	<h3>Circle Annotation</h3>
	<p class="instructions">
		Draw 2-3 lines across the circle circumference to help detect it accurately.
	</p>
	
	<div class="canvas-container">
		<canvas
			bind:this={canvas}
			on:mousedown={startDrawing}
			on:mousemove={draw}
			on:mouseup={stopDrawing}
			on:mouseleave={stopDrawing}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
			on:touchcancel={handleTouchEnd}
			class="annotation-canvas"
		></canvas>
	</div>
	
	<div class="annotation-controls">
		<button on:click={clearLines} class="control-button clear-button">
			🗑️ Clear Lines
		</button>
		
		<button on:click={testCanvas} class="control-button test-button">
			🧪 Test Canvas
		</button>
		
		<div class="status">
			{#if lines.length === 0}
				Draw your first line across the circle
			{:else if lines.length === 1}
				Draw a second line to estimate the circle
			{:else if estimatedCircle}
				✅ Circle estimated! Center: ({Math.round(estimatedCircle.center.x)}, {Math.round(estimatedCircle.center.y)}), Radius: {Math.round(estimatedCircle.radius)}px
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.annotator-section {
		background: #f0f8ff;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.instructions {
		color: #2c5aa0;
		font-style: italic;
		margin-bottom: 1rem;
	}

	.canvas-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.annotation-canvas {
		border: 2px solid #4a90e2;
		border-radius: 4px;
		cursor: crosshair;
		max-width: 100%;
		display: block;
		touch-action: none; /* Prevent scrolling and zooming on touch */
		user-select: none; /* Prevent text selection */
		-webkit-user-select: none;
		-webkit-touch-callout: none; /* Prevent iOS callout menu */
	}

	.annotation-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.control-button {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	.control-button:hover {
		background: #c0392b;
	}

	.clear-button {
		background: #e74c3c;
	}

	.test-button {
		background: #9b59b6;
	}

	.test-button:hover {
		background: #8e44ad;
	}

	.status {
		color: #2c5aa0;
		font-weight: 500;
		font-size: 14px;
	}
</style>