<script>
	import { onMount } from 'svelte';
	import { simulationStore, INTERSECTION_CENTER, STOP_DISTANCE_FROM_CENTER } from '$lib/store.ts';

	// --- SETTINGS ---
	// This now represents the LARGEST dimension (width or height) of the car.
	const CAR_SIZE = 68;
	// --- END SETTINGS ---

	let canvas;
	let ctx;
	let backgroundImage;
	let isBgImageLoaded = false;
	let loadedCarImages = {};
	let loadedSignalImages = {};

	simulationStore.subscribe((state) => {
		loadedCarImages = state.loadedCarImages;
		loadedSignalImages = state.loadedSignalImages;
	});

	function drawIntersection() {
		if (isBgImageLoaded) {
			ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
		} else {
			ctx.fillStyle = '#1a1a2e';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = 'white';
			ctx.textAlign = 'center';
			ctx.font = '20px Arial';
			ctx.fillText('Loading Background...', canvas.width / 2, canvas.height / 2);
		}
	}
	function drawTrafficLights(currentPhase) {
		// --- SETTINGS ---
		// This now represents the LARGEST dimension (width or height) of the signal.
		const SIGNAL_SIZE = 52;
		const centerOffset = 30;
		// --- END SETTINGS ---

		const redLightImg = loadedSignalImages['/signals/RedLight.png'];
		const greenLightImg = loadedSignalImages['/signals/GreenLight.png'];

		// Don't draw anything if the images haven't been loaded yet
		if (!redLightImg?.complete || !greenLightImg?.complete) {
			return;
		}

		// Determine which traffic flow is green
		const tl_br_isGreen = currentPhase === 'TL_BR';

		// Select the correct image object for each flow
		const lightFor_TL_BR = tl_br_isGreen ? greenLightImg : redLightImg;
		const lightFor_TR_BL = !tl_br_isGreen ? greenLightImg : redLightImg;

		// --- MODIFIED: Helper function to draw an image centered with aspect ratio correction ---
		const drawSignal = (img, x, y) => {
			const aspectRatio = img.width / img.height;
			let drawWidth, drawHeight;

			// Calculate new width and height based on aspect ratio
			if (aspectRatio > 1) {
				// Image is wider than it is tall
				drawWidth = SIGNAL_SIZE;
				drawHeight = SIGNAL_SIZE / aspectRatio;
			} else {
				// Image is taller than it is wide, or square
				drawHeight = SIGNAL_SIZE;
				drawWidth = SIGNAL_SIZE * aspectRatio;
			}
			ctx.drawImage(img, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
		};

		// Draw the light for the Top-Left & Bottom-Right flows
		drawSignal(
			lightFor_TR_BL,
			INTERSECTION_CENTER.x - centerOffset - 190,
			INTERSECTION_CENTER.y - centerOffset
		);
		drawSignal(
			lightFor_TR_BL,
			INTERSECTION_CENTER.x + centerOffset + 175,
			INTERSECTION_CENTER.y + centerOffset - 100
		);

		// Draw the light for the Top-Right & Bottom-Left flows
		drawSignal(
			lightFor_TL_BR,
			INTERSECTION_CENTER.x + centerOffset + 10,
			INTERSECTION_CENTER.y - centerOffset + 100
		);
		//bottom right
		drawSignal(
			lightFor_TL_BR,
			INTERSECTION_CENTER.x - centerOffset,
			INTERSECTION_CENTER.y + centerOffset - 200
		);
	}
	function drawStopLines() {
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(
			INTERSECTION_CENTER.x,
			INTERSECTION_CENTER.y,
			STOP_DISTANCE_FROM_CENTER,
			0,
			Math.PI * 2
		);
		ctx.stroke();
	}

	// --- MODIFIED: Draw Vehicle function with aspect ratio correction ---
	function drawVehicle(v) {
		const img = loadedCarImages[v.imagePath];

		if (img && img.complete) {
			const aspectRatio = img.width / img.height;
			let drawWidth, drawHeight;

			// Calculate new width and height based on aspect ratio
			if (aspectRatio > 1) {
				// Image is wider than it is tall
				drawWidth = CAR_SIZE;
				drawHeight = CAR_SIZE / aspectRatio;
			} else {
				// Image is taller than it is wide, or square
				drawHeight = CAR_SIZE;
				drawWidth = CAR_SIZE * aspectRatio;
			}

			// Draw the image centered, using the corrected dimensions
			ctx.drawImage(img, v.x - drawWidth / 2, v.y - drawHeight / 2, drawWidth, drawHeight);
		} else {
			// Fallback drawing if image isn't loaded
			ctx.fillStyle = '#ff6b6b';
			ctx.fillRect(v.x - 6, v.y - 6, 12, 12);
		}
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		let frameId;

		const renderLoop = () => {
			simulationStore.updateSimulation();
			const state = $simulationStore;

			drawIntersection();
			drawStopLines();
			drawTrafficLights(state.currentPhase);
			state.vehicles.forEach(drawVehicle);

			if (state.isRunning) {
				frameId = requestAnimationFrame(renderLoop);
			}
		};

		backgroundImage = new Image();
		backgroundImage.src = '/intersection.png';

		backgroundImage.onload = () => {
			isBgImageLoaded = true;
			if (!frameId) {
				frameId = requestAnimationFrame(renderLoop);
			}
		};
		backgroundImage.onerror = () => {
			isBgImageLoaded = true;
			if (!frameId) {
				frameId = requestAnimationFrame(renderLoop);
			}
		};

		const unsubscribe = simulationStore.subscribe((state) => {
			if (state.isRunning && !frameId && isBgImageLoaded) {
				if (Object.keys(state.loadedCarImages).length > 0 || state.vehicles.length > 0) {
					frameId = requestAnimationFrame(renderLoop);
				}
			}
			if (!state.isRunning && frameId) {
				cancelAnimationFrame(frameId);
				frameId = null;
			}
		});

		return () => {
			cancelAnimationFrame(frameId);
			unsubscribe();
		};
	});
</script>

<canvas bind:this={canvas} width="1040" height="585" id="canvas-element"></canvas>

<style>
	#canvas-element {
		border: 4px solid rgb(208, 208, 255);
		border-radius: 10px;
		background: #2d5016;
		display: block;
		margin: 0 auto;
		width: 1200px;
		height: auto;
		aspect-ratio: 16 / 9;
	}
</style>
