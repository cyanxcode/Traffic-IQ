<script>
	import ControlPanel from '$lib/ControlPanel.svelte';
	import Simulation from '$lib/Simulation.svelte';
</script>

<nav class="flex h-20 w-full items-center justify-center px-10">
	<h1 class="font-serif text-3xl">Traffic IQ Pro</h1>
</nav>

<main class="flex min-h-screen w-full justify-between">
	<div class="">
		<Simulation />
	</div>
	<div class="">
		<ControlPanel />
	</div>
</main>

<style>
</style>
