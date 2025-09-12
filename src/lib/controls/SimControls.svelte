<script>
	import { simulationStore } from '$lib/store.js';
</script>

<div class="control-group">
	<h3>Simulation Control</h3>
	<div class="grid grid-cols-2">
		<button on:click={simulationStore.togglePlayPause}>
			{#if $simulationStore.isRunning}
				Pause
			{:else}
				Play
			{/if}
		</button>
		<button on:click={simulationStore.reset}>🔄 Reset</button>
	</div>
	<div>
		<label for="">Speed: <span>{$simulationStore.simulationSpeed}x</span></label>
		<input
			type="range"
			min="0.5"
			max="3"
			step="0.5"
			bind:value={$simulationStore.simulationSpeed}
			on:input={(e) => simulationStore.setSpeed(parseFloat(e.currentTarget.value))}
		/>
	</div>
</div>

<style>
	input[type='range'] {
		width: 100%;
		margin: 10px 0;
	}
</style>
