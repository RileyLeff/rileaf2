// src/lib/stores/imageAnalysis.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AppState = 'CAMERA' | 'CROP' | 'ANNOTATE' | 'RESULTS';

export interface Ellipse {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	angle: number; // in radians
}

export interface ImageAnalysisState {
	appState: AppState;
	capturedImage: string | null;
	croppedImage: string | null; // Store the cropped version separately
	clipDiameter: number;
	ellipsePriors: Ellipse | null;
	processingResults: any | null; // Store as object, not string
	isProcessing: boolean;
}

const initialState: ImageAnalysisState = {
	appState: 'CAMERA',
	capturedImage: null,
	croppedImage: null,
	clipDiameter: 25.0, // Default 25mm diameter
	ellipsePriors: null,
	processingResults: null,
	isProcessing: false
};

export const imageAnalysisStore = writable<ImageAnalysisState>(initialState);

// Helper functions for updating specific parts of the state

export const setAppState = (appState: AppState) => {
	imageAnalysisStore.update((state) => ({ ...state, appState }));
};

export const updateCapturedImage = (image: string | null) => {
	imageAnalysisStore.update((state) => ({
		...state,
		capturedImage: image,
		croppedImage: null, // Clear cropped image on new capture
		processingResults: null,
		ellipsePriors: null,
		appState: image ? 'CROP' : 'CAMERA' // Transition to CROP state
	}));
};

export const updateCroppedImage = (image: string | null) => {
	imageAnalysisStore.update((state) => ({
		...state,
		croppedImage: image,
		appState: 'ANNOTATE'
	}));
};

export const updateClipDiameter = (diameter: number) => {
	imageAnalysisStore.update((state) => ({
		...state,
		clipDiameter: diameter
	}));
	// Save to localStorage for persistence
	if (browser) {
		localStorage.setItem('rileaf2-clip-diameter', diameter.toString());
	}
};

export const updateEllipsePriors = (priors: Ellipse | null) => {
	imageAnalysisStore.update((state) => ({
		...state,
		ellipsePriors: priors
	}));
};

export const updateProcessingResults = (results: any, isProcessing: boolean = false) => {
	imageAnalysisStore.update((state) => ({
		...state,
		processingResults: results,
		isProcessing,
		appState: isProcessing ? state.appState : 'RESULTS' // Move to results when done
	}));
};

export const resetWorkflow = () => {
	imageAnalysisStore.update((state) => ({
		...initialState,
		clipDiameter: state.clipDiameter // Keep clip diameter
	}));
};

// Load saved diameter from localStorage on initialization
if (browser) {
	const savedDiameter = localStorage.getItem('rileaf2-clip-diameter');
	if (savedDiameter) {
		const diameter = parseFloat(savedDiameter);
		if (!isNaN(diameter) && diameter > 0) {
			// Use the store's update function to ensure consistency
			imageAnalysisStore.update((state) => ({ ...state, clipDiameter: diameter }));
		}
	}
}