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

	// ===== DRAWING FUNCTIONS =====
	function startDrawing(event: MouseEvent) {
		if (!canvas || !ctx) return;
		
		isDrawing = true;
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		
		currentLine = {
			start: {x, y},
			end: {x, y}
		};
	}

	function draw(event: MouseEvent) {
		if (!isDrawing || !currentLine || !ctx || !canvas) return;
		
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		
		currentLine.end = {x, y};
		redrawCanvas();
	}

	function stopDrawing() {
		if (!isDrawing || !currentLine) return;
		
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
		
		// Draw current line being drawn
		if (currentLine && isDrawing) {
			ctx.strokeStyle = '#ff8888';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(currentLine.start.x, currentLine.start.y);
			ctx.lineTo(currentLine.end.x, currentLine.end.y);
			ctx.stroke();
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
		if (!canvas || !capturedImage || canvasInitialized) return;
		
		ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		// Pre-load the background image
		backgroundImage = new Image();
		backgroundImage.onload = () => {
			// Set canvas size to match the image aspect ratio
			const maxWidth = 600;
			const aspectRatio = backgroundImage!.height / backgroundImage!.width;
			
			canvas.width = maxWidth;
			canvas.height = maxWidth * aspectRatio;
			
			canvasInitialized = true;
			
			// Now we can safely draw without flashing
			redrawCanvas();
		};
		backgroundImage.onerror = () => {
			console.error('Failed to load background image for annotator');
		};
		backgroundImage.src = capturedImage;
	}

	function clearLines() {
		lines = [];
		currentLine = null;
		estimatedCircle = null;
		updateCirclePriors(null);
		redrawCanvas();
	}

	// Reset canvas when image changes
	$: if (capturedImage) {
		canvasInitialized = false;
		backgroundImage = null;
		lines = [];
		currentLine = null;
		estimatedCircle = null;
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
			class="annotation-canvas"
		></canvas>
	</div>
	
	<div class="annotation-controls">
		<button on:click={clearLines} class="control-button clear-button">
			🗑️ Clear Lines
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

	.status {
		color: #2c5aa0;
		font-weight: 500;
		font-size: 14px;
	}
</style>