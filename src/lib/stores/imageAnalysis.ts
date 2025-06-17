// src/lib/stores/imageAnalysis.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AppState = 'CAMERA' | 'CROP' | 'ANNOTATE' | 'THRESHOLD' | 'RESULTS'; // Added THRESHOLD state

export interface Ellipse {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	angle: number; // in radians
}

export interface Annotation {
	ellipse: Ellipse;
	sourceDimensions: {
		width: number;
		height: number;
	};
}

export interface HSVRange {
    h: { min: number; max: number };
    s: { min: number; max: number };
    v: { min: number; max: number };
}

export interface ImageAnalysisState {
	appState: AppState;
	capturedImage: string | null;
	croppedImage: string | null;
	clipDiameter: number;
	chamberDiameter: number; // NEW: Add chamber diameter
	annotation: Annotation | null;
    hsvThresholds: HSVRange; // NEW: Add HSV thresholds
	processingResults: any | null;
	isProcessing: boolean;
}

const initialState: ImageAnalysisState = {
	appState: 'CAMERA',
	capturedImage: null,
	croppedImage: null,
	clipDiameter: 25.0,
	chamberDiameter: 20.0, // NEW: Default chamber diameter
	annotation: null,
    // NEW: Default HSV range (a general bright green)
    hsvThresholds: {
        h: { min: 35, max: 90 },
        s: { min: 40, max: 255 },
        v: { min: 40, max: 255 }
    },
	processingResults: null,
	isProcessing: false
};

export const imageAnalysisStore = writable<ImageAnalysisState>(initialState);

// Helper functions

export const setAppState = (appState: AppState) => {
	imageAnalysisStore.update((state) => ({ ...state, appState }));
};

export const setProcessing = (isProcessing: boolean) => {
	imageAnalysisStore.update((state) => ({ ...state, isProcessing }));
};

export const updateCapturedImage = (image: string | null) => {
	imageAnalysisStore.update((state) => ({
		...state,
		capturedImage: image,
		croppedImage: null,
		processingResults: null,
		annotation: null,
		appState: image ? 'CROP' : 'CAMERA'
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
	imageAnalysisStore.update((state) => ({ ...state, clipDiameter: diameter }));
	if (browser) {
		localStorage.setItem('rileaf2-clip-diameter', diameter.toString());
	}
};

// NEW: Function to update chamber diameter
export const updateChamberDiameter = (diameter: number) => {
    imageAnalysisStore.update((state) => ({ ...state, chamberDiameter: diameter }));
    if (browser) {
        localStorage.setItem('rileaf2-chamber-diameter', diameter.toString());
    }
}

export const updateAnnotation = (annotation: Annotation | null) => {
	imageAnalysisStore.update((state) => ({
		...state,
		annotation: annotation
	}));
};

// NEW: Function to update HSV thresholds
export const updateHsvThresholds = (thresholds: HSVRange) => {
    imageAnalysisStore.update((state) => ({ ...state, hsvThresholds: thresholds }));
};


export const updateProcessingResults = (results: any) => {
	imageAnalysisStore.update((state) => ({
		...state,
		processingResults: results,
		isProcessing: false,
		appState: 'RESULTS'
	}));
};

export const resetWorkflow = () => {
	imageAnalysisStore.update((state) => ({
		...initialState,
		clipDiameter: state.clipDiameter, // Keep user-set diameters
		chamberDiameter: state.chamberDiameter
	}));
};

// Load saved diameters from localStorage
if (browser) {
	const savedClipDiameter = localStorage.getItem('rileaf2-clip-diameter');
	if (savedClipDiameter) {
		const diameter = parseFloat(savedClipDiameter);
		if (!isNaN(diameter) && diameter > 0) {
			imageAnalysisStore.update((state) => ({ ...state, clipDiameter: diameter }));
		}
	}
    const savedChamberDiameter = localStorage.getItem('rileaf2-chamber-diameter');
	if (savedChamberDiameter) {
		const diameter = parseFloat(savedChamberDiameter);
		if (!isNaN(diameter) && diameter > 0) {
			imageAnalysisStore.update((state) => ({ ...state, chamberDiameter: diameter }));
		}
	}
}