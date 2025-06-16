// src/lib/stores/imageAnalysis.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ImageAnalysisState {
	capturedImage: string | null;
	clipDiameter: number;
	sampledColor: {
		h: number;
		s: number;
		v: number;
		tolerance: number;
	} | null;
	circlePriors: {
		center: [number, number];
		radius: number;
		confidence: number;
	} | null;
	processingResults: string | null;
	isProcessing: boolean;
}

const initialState: ImageAnalysisState = {
	capturedImage: null,
	clipDiameter: 25.0, // Default 25mm diameter
	sampledColor: null,
	circlePriors: null,
	processingResults: null,
	isProcessing: false
};

export const imageAnalysisStore = writable<ImageAnalysisState>(initialState);

// Helper functions for updating specific parts of the state
export const updateCapturedImage = (image: string | null) => {
	imageAnalysisStore.update(state => ({
		...state,
		capturedImage: image,
		// Clear previous analysis when new image is captured
		processingResults: null,
		circlePriors: null,
		sampledColor: null
	}));
};

export const updateClipDiameter = (diameter: number) => {
	imageAnalysisStore.update(state => ({
		...state,
		clipDiameter: diameter
	}));
	// Save to localStorage for persistence
	if (browser) {
		localStorage.setItem('rileaf2-clip-diameter', diameter.toString());
	}
};

export const updateSampledColor = (color: ImageAnalysisState['sampledColor']) => {
	imageAnalysisStore.update(state => ({
		...state,
		sampledColor: color
	}));
};

export const updateCirclePriors = (priors: ImageAnalysisState['circlePriors']) => {
	imageAnalysisStore.update(state => ({
		...state,
		circlePriors: priors
	}));
};

export const updateProcessingResults = (results: string, isProcessing: boolean = false) => {
	imageAnalysisStore.update(state => ({
		...state,
		processingResults: results,
		isProcessing
	}));
};

// Load saved diameter from localStorage on initialization
if (browser) {
	const savedDiameter = localStorage.getItem('rileaf2-clip-diameter');
	if (savedDiameter) {
		const diameter = parseFloat(savedDiameter);
		if (!isNaN(diameter) && diameter > 0) {
			updateClipDiameter(diameter);
		}
	}
}