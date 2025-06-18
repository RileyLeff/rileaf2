// UPDATED: Import the node adapter
import adapter from '@sveltejs/adapter-node'; 
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// UPDATED: Use the node adapter instead of adapter-auto
		adapter: adapter() 
	}
};

export default config;