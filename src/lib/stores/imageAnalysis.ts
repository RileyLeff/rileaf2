// src/lib/stores/imageAnalysis.ts
import { writable } from 'svelte/store';

export interface ImageAnalysisState {
	capturedImage: string | null;
	clipDiameter: number;
	sampledColor: {
		h: number;
		s: number;
		v: number;
		tolerance: number;
	} | null;
	processingResults: string;
	isProcessing: boolean;
}

const initialState: ImageAnalysisState = {
	capturedImage: null,
	clipDiameter: 25.0, // Default 25mm diameter
	sampledColor: null,
	processingResults: '',
	isProcessing: false
};

export const imageAnalysisStore = writable<ImageAnalysisState>(initialState);

// Helper functions for updating specific parts of the state
export const updateCapturedImage = (image: string | null) => {
	imageAnalysisStore.update(state => ({
		...state,
		capturedImage: image
	}));
};

export const updateClipDiameter = (diameter: number) => {
	imageAnalysisStore.update(state => ({
		...state,
		clipDiameter: diameter
	}));
	// Save to localStorage for persistence
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('rileaf2-clip-diameter', diameter.toString());
	}
};

export const updateSampledColor = (color: ImageAnalysisState['sampledColor']) => {
	imageAnalysisStore.update(state => ({
		...state,
		sampledColor: color
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
if (typeof localStorage !== 'undefined') {
	const savedDiameter = localStorage.getItem('rileaf2-clip-diameter');
	if (savedDiameter) {
		const diameter = parseFloat(savedDiameter);
		if (!isNaN(diameter) && diameter > 0) {
			updateClipDiameter(diameter);
		}
	}
}