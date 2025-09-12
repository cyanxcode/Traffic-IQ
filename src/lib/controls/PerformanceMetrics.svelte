<script>
	import { simulationStore } from '$lib/store.js';

	let avgWaitTime = '0.0s';
	let throughput = '0';
	let totalQueue = 0;
	let efficiency = '100%';

	// Reactive calculations
	$: {
		const { completedVehicles, totalWaitTime, startTime, vehicles } = $simulationStore;

		const avgWait = completedVehicles > 0 ? totalWaitTime / completedVehicles : 0;
		const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
		const tput = timeElapsed > 0 ? completedVehicles / timeElapsed : 0;

		avgWaitTime = `${avgWait.toFixed(1)}s`;
		throughput = tput.toFixed(0);
	}
</script>

<div class="control-group">
	<h3>📊 Performance Metrics</h3>
	<div class="grid grid-cols-2 gap-4">
		<div class="metric">
			<div class="metric-value">{avgWaitTime}</div>
			<div class="metric-label">Avg Wait Time</div>
		</div>
		<div class="metric">
			<div class="metric-value">{throughput}</div>
			<div class="metric-label">Throughput/min</div>
		</div>
		<div class="metric">
			<div class="metric-value">{totalQueue}</div>
			<div class="metric-label">Total Queue</div>
		</div>
		<div class="metric">
			<div class="metric-value">{efficiency}</div>
			<div class="metric-label">Efficiency</div>
		</div>
	</div>
</div>

<style>
	.metric {
		background: rgba(0, 0, 0, 0.2);
		padding: 10px;
		border-radius: 6px;
		text-align: center;
		width: 7rem;
	}
	.metric-value {
		font-size: 1.4em;
		font-weight: bold;
		color: black;
	}
	.metric-label {
		font-size: 0.8em;
		opacity: 0.8;
		margin-top: 4px;
	}
</style>
