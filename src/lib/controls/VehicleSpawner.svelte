<script>
	import { simulationStore, CORNERS } from '$lib/store.ts';

	// This object defines the correct diagonal destination for each starting corner.
	const opposites = {
		topLeft: 'bottomRight',
		topRight: 'bottomLeft',
		bottomLeft: 'topRight',
		bottomRight: 'topLeft'
	};

	function addVehicleFrom(startKey) {
		console.log(`Spawning vehicle from: ${startKey}`);

		// Find the specific diagonal end corner instead of a random one.
		const endKey = opposites[startKey];

		// Ensure we are calling the function on 'simulationStore'
		simulationStore.addVehicle(startKey, endKey);
	}
</script>

<div class="control-group">
	<h3>🚗 Add Vehicles</h3>
	<div class="corner-buttons">
		<button class="text-lg" on:click={() => addVehicleFrom('topLeft')}>↖ Top-Left</button>
		<button class="text-lg" on:click={() => addVehicleFrom('topRight')}>↗ Top-Right</button>
		<button class="text-lg" on:click={() => addVehicleFrom('bottomLeft')}>↙ Bottom-Left</button>
		<button class="text-lg" on:click={() => addVehicleFrom('bottomRight')}>↘ Bottom-Right</button>
	</div>
</div>

<style>
	.corner-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-top: 10px;
	}
</style>
