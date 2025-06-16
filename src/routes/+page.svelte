<script lang="ts">
	import { onMount } from 'svelte';
	import { loadPyodide } from 'pyodide';
	
	let pyodide: any = null;
	let pythonOutput = 'Loading Python...';
	let isLoading = true;

	onMount(async () => {
		try {
			// Load Pyodide (this takes a moment)
			pyodide = await loadPyodide();
			console.log('Pyodide loaded!');
			
			// Run a simple Python test
			runPythonTest();
			isLoading = false;
		} catch (error) {
			console.error('Failed to load Pyodide:', error);
			pythonOutput = 'Failed to load Python';
			isLoading = false;
		}
	});

	function runPythonTest() {
		if (!pyodide) return;
		
		// Simple Python code to prove it works
		const pythonCode = `
import math
import json

def test_function():
    result = {
        'message': 'Hello from Python!',
        'calculation': math.sqrt(42),
        'list_comprehension': [x**2 for x in range(5)]
    }
    return json.dumps(result, indent=2)

test_function()
		`;
		
		try {
			const result = pyodide.runPython(pythonCode);
			pythonOutput = result;
		} catch (error) {
			pythonOutput = `Python error: ${error}`;
		}
	}
</script>

<main class="container">
	<h1>RiLeaf2 🍃</h1>
	
	<div class="python-section">
		<h2>Python Integration Test</h2>
		{#if isLoading}
			<p class="loading">Loading Python interpreter...</p>
		{:else}
			<button on:click={runPythonTest} class="test-button">
				Run Python Test
			</button>
			<pre class="output">{pythonOutput}</pre>
		{/if}
	</div>
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: Arial, sans-serif;
	}
	
	h1 {
		color: #2e7d32;
		text-align: center;
		margin-bottom: 2rem;
	}
	
	.python-section {
		background: #f5f5f5;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}
	
	.loading {
		color: #666;
		font-style: italic;
	}
	
	.test-button {
		background: #4caf50;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 16px;
		margin-bottom: 1rem;
	}
	
	.test-button:hover {
		background: #45a049;
	}
	
	.output {
		background: #1e1e1e;
		color: #f0f0f0;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		white-space: pre-wrap;
		border: 1px solid #ddd;
	}
</style>