<script>
	import SimControls from './controls/SimControls.svelte';
	import VehicleSpawner from './controls/VehicleSpawner.svelte';
	import PerformanceMetrics from './controls/PerformanceMetrics.svelte';
</script>

<div class="flex w-full flex-col gap-4">
	<SimControls />
	<VehicleSpawner />
	<PerformanceMetrics />
</div>

<style>
	/* Shared styles for control group sections */
	:global(.control-group) {
		padding: 15px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.control-group h3) {
		margin: 0 0 10px 0;
		color: black;
	}

	:global(button) {
		background: rgb(224, 224, 224);
		color: black;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: bold;
		margin: 2px;
		transition: all 0.3s ease;
		display: flex;
		height: 80px;
		font-size: 14px;
		place-content: center;
		align-items: center;
	}

	:global(button:hover) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	:global(button.active) {
		background: linear-gradient(45deg, #4ecdc4, #44a08d);
	}
</style>
