<script>
	import ControlPanel from '$lib/ControlPanel.svelte';
	import Simulation from '$lib/Simulation.svelte';
</script>

<nav class="flex h-20 w-full items-center justify-between px-10">
	<h1 class="font-serif text-2xl">Traffic IQ Pro</h1>
	<a
		href="/"
		class="flex h-10 items-center rounded-lg border-3 border-blue-600 px-24 font-semibold text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white"
		>Try Sandbox</a
	>
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
