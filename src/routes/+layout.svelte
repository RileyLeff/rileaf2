<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { writable } from 'svelte/store';
	import ClipConfiguration from '$lib/components/ClipConfiguration.svelte';

	let showSettings = writable(false);

	function toggleSettings() {
		showSettings.update((v) => !v);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			toggleSettings();
		}
	}
</script>

<div class="app-container">
	<header class="app-header">
		<h1>RiLeaf2 🍃</h1>
		<button on:click={toggleSettings} class="settings-button" aria-label="Open settings"> ⚙️ </button>
	</header>

	<main class="app-content">
		<slot />
	</main>
</div>

{#if $showSettings}
	<!-- The outer div handles the click-away-to-close -->
	<div
		class="modal-overlay"
		on:click={toggleSettings}
		on:keydown={handleKeyDown}
		role="button"
		tabindex="0"
	>
		<!-- FIX: The inner div gets the dialog role and tabindex="-1" -->
		<div
			class="modal-content"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<ClipConfiguration />
			<button on:click={toggleSettings} class="close-button">Close</button>
		</div>
	</div>
{/if}

<style>
	.app-container { display: flex; flex-direction: column; height: 100vh; max-width: 800px; margin: 0 auto; background: #fff; }
	.app-header { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; background: #2e7d32; color: white; flex-shrink: 0; }
	h1 { font-size: 1.5rem; margin: 0; }
	.settings-button { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: white; }
	.app-content { flex-grow: 1; padding: 1rem; overflow-y: auto; }
	.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
	.modal-content { background: white; padding: 2rem; border-radius: 8px; max-width: 90%; width: 400px; }
	.close-button { display: block; margin-top: 1.5rem; margin-left: auto; background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
</style>