// src/lib/utils/canvasUtils.ts
// NEW FILE
// This module contains pure helper functions for drawing on the canvas,
// making our Svelte components cleaner.

import type { Ellipse } from '$lib/stores/imageAnalysis';

/**
 * Calculates the real-world positions of the ellipse's interactive handles.
 */
function getHandlePositions(ellipse: Ellipse) {
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

/**
 * Draws the interactive handles for the ellipse onto the canvas.
 */
export function drawHandles(ctx: CanvasRenderingContext2D, ellipse: Ellipse) {
	const handles = getHandlePositions(ellipse);
	ctx.fillStyle = '#44ff44';

	Object.values(handles).forEach((pos) => {
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
		ctx.fill();
	});
}

/**
 * Draws the main ellipse outline.
 */
export function drawEllipse(ctx: CanvasRenderingContext2D, ellipse: Ellipse) {
	ctx.strokeStyle = '#44ff44';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.ellipse(ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, ellipse.angle, 0, 2 * Math.PI);
	ctx.stroke();
}

/**
 * Calculates the event coordinates relative to the canvas, accounting for scaling.
 */
export function getEventCoords(event: MouseEvent | Touch, canvas: HTMLCanvasElement) {
	const rect = canvas.getBoundingClientRect();
	const scaleX = canvas.width / rect.width;
	const scaleY = canvas.height / rect.height;
	return {
		x: (event.clientX - rect.left) * scaleX,
		y: (event.clientY - rect.top) * scaleY
	};
}