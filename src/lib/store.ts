import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// --- CONFIGURATION ---
const CORNERS = {
	topLeft: { x: -40, y: -50 },
	topRight: { x: 1070, y: -50 },
	bottomLeft: { x: -50, y: 570 },
	bottomRight: { x: 1050, y: 545 }
};
const CORNER_KEYS = Object.keys(CORNERS);

const INTERSECTION_CENTER = { x: 1040 / 2, y: 585 / 2 };
const LANE_OFFSET = -30;
const STOP_DISTANCE_FROM_CENTER = 60;
const VEHICLE_SPACING = 80;

const FPS = 60;
const ACCELERATION = 0.05;
const BRAKING = 0.15;

// --- AI Tuning Constants ---
const MIN_PHASE_TIME = 8;
const MAX_PHASE_TIME = 35;
const ALL_RED_DURATION = 2; // NEW: Duration for the all-red clearing phase
const PRIORITY_THRESHOLD = 1.5;
const WEIGHT_CAR_COUNT = 1.0;
const WEIGHT_WAIT_TIME = 0.2;

const CAR_IMAGE_PATHS = {
	TL_BR: ['/cars/blue-tl.png', '/cars/yellow-tl.png', '/cars/red-tl.png', '/cars/green-tl.png'],
	TR_BL: ['/cars/blue-tr.png', '/cars/yellow-tr.png', '/cars/red-tr.png', '/cars/green-tr.png'],
	BL_TR: ['/cars/blue-bl.png', '/cars/yellow-bl.png', '/cars/red-bl.png', '/cars/green-bl.png'],
	BR_TL: ['/cars/blue-br.png', '/cars/yellow-br.png', '/cars/red-br.png', '/cars/green-br.png']
};

const SIGNAL_IMAGE_PATHS = {
	red: '/signals/RedLight.png',
	green: '/signals/GreenLight.png'
};

class Vehicle {
	constructor(id, startCornerKey, endCornerKey) {
		this.id = id;
		this.startCornerKey = startCornerKey;
		this.endCornerKey = endCornerKey;
		const startPos = { ...CORNERS[startCornerKey] };
		const endPos = { ...CORNERS[endCornerKey] };
		const dx = endPos.x - startPos.x;
		const dy = endPos.y - startPos.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		this.nx = distance > 0 ? dx / distance : 0;
		this.ny = distance > 0 ? dy / distance : 0;
		const px = -this.ny;
		const py = this.nx;
		startPos.x += px * LANE_OFFSET;
		startPos.y += py * LANE_OFFSET;
		endPos.x += px * LANE_OFFSET;
		endPos.y += py * LANE_OFFSET;
		this.x = startPos.x;
		this.y = startPos.y;
		const stopLineDx =
			INTERSECTION_CENTER.x - this.nx * STOP_DISTANCE_FROM_CENTER + px * LANE_OFFSET;
		const stopLineDy =
			INTERSECTION_CENTER.y - this.ny * STOP_DISTANCE_FROM_CENTER + py * LANE_OFFSET;
		this.stopLine = { x: stopLineDx, y: stopLineDy };
		this.distanceToStopLine = Math.sqrt(
			Math.pow(this.stopLine.x - this.x, 2) + Math.pow(this.stopLine.y - this.y, 2)
		);
		this.totalDistance = Math.sqrt(Math.pow(endPos.x - this.x, 2) + Math.pow(endPos.y - this.y, 2));
		this.distanceTraveled = 0;
		this.speed = 0;
		this.maxSpeed = 2.5;
		this.waitTime = 0;
		const flowKey = getFlowKey(startCornerKey, endCornerKey);
		const availableImages = CAR_IMAGE_PATHS[flowKey];
		if (availableImages && availableImages.length > 0) {
			this.imagePath = availableImages[Math.floor(Math.random() * availableImages.length)];
		} else {
			this.imagePath = null;
		}
	}
}

function getFlowKey(startCornerKey, endCornerKey) {
	if (startCornerKey === 'topLeft' && endCornerKey === 'bottomRight') return 'TL_BR';
	if (startCornerKey === 'topRight' && endCornerKey === 'bottomLeft') return 'TR_BL';
	if (startCornerKey === 'bottomLeft' && endCornerKey === 'topRight') return 'BL_TR';
	if (startCornerKey === 'bottomRight' && endCornerKey === 'topLeft') return 'BR_TL';
	return '';
}

const initialGameState = {
	isRunning: true,
	simulationSpeed: 1,
	frameCount: 0,
	vehicles: [],
	vehicleIdCounter: 0,
	completedVehicles: 0,
	startTime: Date.now(),
	currentPhase: 'TL_BR', // Phases can be 'TL_BR', 'TR_BL', or 'ALL_RED'
	nextPhase: 'TR_BL', // NEW: Stores which phase comes after ALL_RED
	phaseTimer: 0
};

function createSimulationStore() {
	const fullInitialState = {
		...initialGameState,
		loadedCarImages: {},
		loadedSignalImages: {}
	};

	const { subscribe, update, set } = writable(fullInitialState);

	const getCarAhead = (vehicle, allVehicles) => {
		let carAhead = null;
		let minDistanceAhead = Infinity;
		for (const other of allVehicles) {
			if (vehicle.id === other.id || vehicle.startCornerKey !== other.startCornerKey) continue;
			const distanceBetween = other.distanceTraveled - vehicle.distanceTraveled;
			if (distanceBetween > 0 && distanceBetween < minDistanceAhead) {
				minDistanceAhead = distanceBetween;
				carAhead = other;
			}
		}
		return { carAhead, distance: minDistanceAhead };
	};

	const getFlowData = (vehicles, currentPhase) => {
		const flowData = {
			TL_BR: { count: 0, totalWaitTime: 0 },
			TR_BL: { count: 0, totalWaitTime: 0 }
		};
		const tl_br_keys = ['topLeft', 'bottomRight'];
		const is_TL_BR_green = currentPhase === 'TL_BR';
		for (const vehicle of vehicles) {
			const is_vehicle_in_TL_BR_flow = tl_br_keys.includes(vehicle.startCornerKey);
			if (vehicle.speed < 0.1) {
				if (is_vehicle_in_TL_BR_flow && !is_TL_BR_green) {
					flowData.TL_BR.count++;
					flowData.TL_BR.totalWaitTime += vehicle.waitTime;
				} else if (!is_vehicle_in_TL_BR_flow && is_TL_BR_green) {
					flowData.TR_BL.count++;
					flowData.TR_BL.totalWaitTime += vehicle.waitTime;
				}
			}
		}
		return flowData;
	};

	const updateSimulation = () => {
		update((state) => {
			if (!state.isRunning) return state;
			const timeDelta = (1 / FPS) * state.simulationSpeed;
			let newState = { ...state };

			newState.vehicles.forEach((v) => {
				if (v.speed < 0.1) v.waitTime += timeDelta;
				else v.waitTime = 0;
			});

			// --- NEW: Traffic light logic with ALL_RED phase ---
			newState.phaseTimer += timeDelta;

			if (newState.currentPhase === 'ALL_RED') {
				if (newState.phaseTimer >= ALL_RED_DURATION) {
					newState.currentPhase = newState.nextPhase;
					newState.nextPhase = newState.nextPhase === 'TL_BR' ? 'TR_BL' : 'TL_BR';
					newState.phaseTimer = 0;
				}
			} else {
				// If in a green phase
				let shouldSwitch = false;
				const flowData = getFlowData(newState.vehicles, newState.currentPhase);
				const priority_TL_BR =
					flowData.TL_BR.count * WEIGHT_CAR_COUNT + flowData.TL_BR.totalWaitTime * WEIGHT_WAIT_TIME;
				const priority_TR_BL =
					flowData.TR_BL.count * WEIGHT_CAR_COUNT + flowData.TR_BL.totalWaitTime * WEIGHT_WAIT_TIME;
				const currentPriority = newState.currentPhase === 'TL_BR' ? priority_TL_BR : priority_TR_BL;
				const opposingPriority =
					newState.currentPhase === 'TL_BR' ? priority_TR_BL : priority_TL_BR;

				if (currentPriority === 0 && opposingPriority > 0 && newState.phaseTimer > 3) {
					shouldSwitch = true;
				} else if (
					newState.phaseTimer >= MIN_PHASE_TIME &&
					opposingPriority > currentPriority * PRIORITY_THRESHOLD
				) {
					shouldSwitch = true;
				} else if (newState.phaseTimer >= MAX_PHASE_TIME) {
					shouldSwitch = true;
				}

				if (shouldSwitch) {
					newState.currentPhase = 'ALL_RED';
					newState.phaseTimer = 0;
				}
			}
			// --- END NEW LOGIC ---

			newState.vehicles.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
			const updatedVehicles = newState.vehicles.map((vehicle) => {
				const newVehicle = { ...vehicle };
				const tl_br_flow = ['topLeft', 'bottomRight'];

				// An active green light now only happens in the specific green phases
				let isMyFlowGreen =
					(newState.currentPhase === 'TL_BR' && tl_br_flow.includes(newVehicle.startCornerKey)) ||
					(newState.currentPhase === 'TR_BL' && !tl_br_flow.includes(newVehicle.startCornerKey));

				let targetSpeed = newVehicle.maxSpeed;

				// A car only stops if its light is NOT green AND it is BEFORE the stop line.
				// This allows cars already in the intersection to clear it.
				if (!isMyFlowGreen && newVehicle.distanceTraveled < newVehicle.distanceToStopLine) {
					const distanceToStop = newVehicle.distanceToStopLine - newVehicle.distanceTraveled;
					if (distanceToStop < VEHICLE_SPACING * 1.5) {
						targetSpeed = 0;
					}
				}

				const { carAhead, distance } = getCarAhead(newVehicle, newState.vehicles);
				if (carAhead && distance < VEHICLE_SPACING) {
					targetSpeed = Math.min(targetSpeed, carAhead.speed * 0.9);
				}

				if (
					newVehicle.speed < 0.1 &&
					Math.abs(newVehicle.distanceTraveled - newVehicle.distanceToStopLine) < 5 &&
					!isMyFlowGreen
				) {
					targetSpeed = 0;
				}

				if (newVehicle.speed < targetSpeed) {
					newVehicle.speed = Math.min(targetSpeed, newVehicle.speed + ACCELERATION);
				} else if (newVehicle.speed > targetSpeed) {
					newVehicle.speed = Math.max(targetSpeed, newVehicle.speed - BRAKING);
				}

				if (newVehicle.speed < 0.01) newVehicle.speed = 0;
				const moveX = newVehicle.nx * newVehicle.speed * newState.simulationSpeed;
				const moveY = newVehicle.ny * newVehicle.speed * newState.simulationSpeed;
				newVehicle.x += moveX;
				newVehicle.y += moveY;
				newVehicle.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);
				return newVehicle;
			});
			newState.vehicles = updatedVehicles;
			const completedNow = newState.vehicles.filter(
				(v) => v.distanceTraveled >= v.totalDistance
			).length;
			if (completedNow > 0) {
				newState.completedVehicles += completedNow;
				newState.vehicles = newState.vehicles.filter((v) => v.distanceTraveled < v.totalDistance);
			}
			newState.frameCount++;
			if (newState.frameCount % 90 === 0 && Math.random() < 0.5 * newState.simulationSpeed) {
				const opposites = {
					topLeft: 'bottomRight',
					topRight: 'bottomLeft',
					bottomLeft: 'topRight',
					bottomRight: 'topLeft'
				};
				let startKey = CORNER_KEYS[Math.floor(Math.random() * CORNER_KEYS.length)];
				let endKey = opposites[startKey];
				const newVehicle = new Vehicle(newState.vehicleIdCounter++, startKey, endKey);
				newState.vehicles = [...newState.vehicles, newVehicle];
			}
			return newState;
		});
	};
	const preloadAssets = () => {
		const carImagesToLoad = {};
		const signalImagesToLoad = {};
		const allImagePaths = [
			...Object.values(CAR_IMAGE_PATHS).flat(),
			...Object.values(SIGNAL_IMAGE_PATHS)
		];
		let loadCount = 0;
		const totalImages = allImagePaths.length;
		if (totalImages === 0) return;
		allImagePaths.forEach((path) => {
			const img = new Image();
			img.src = path;
			img.onload = () => {
				if (path.includes('/cars/')) carImagesToLoad[path] = img;
				else if (path.includes('/signals/')) signalImagesToLoad[path] = img;
				loadCount++;
				if (loadCount === totalImages) {
					update((s) => ({
						...s,
						loadedCarImages: carImagesToLoad,
						loadedSignalImages: signalImagesToLoad
					}));
				}
			};
			img.onerror = () => {
				console.error(`Failed to load image: ${path}`);
				loadCount++;
				if (loadCount === totalImages) {
					update((s) => ({
						...s,
						loadedCarImages: carImagesToLoad,
						loadedSignalImages: signalImagesToLoad
					}));
				}
			};
		});
	};

	if (browser) {
		preloadAssets();
	}

	return {
		subscribe,
		updateSimulation,
		addVehicle: (startCornerKey, endCornerKey) => {
			update((s) => {
				const newVehicle = new Vehicle(s.vehicleIdCounter, startCornerKey, endCornerKey);
				return {
					...s,
					vehicles: [...s.vehicles, newVehicle],
					vehicleIdCounter: s.vehicleIdCounter + 1
				};
			});
		},
		reset: () => {
			update((s) => ({
				...initialGameState,
				startTime: Date.now(),
				loadedCarImages: s.loadedCarImages,
				loadedSignalImages: s.loadedSignalImages
			}));
		},
		togglePlayPause: () => update((s) => ({ ...s, isRunning: !s.isRunning })),
		setSpeed: (speed) => update((s) => ({ ...s, simulationSpeed: speed }))
	};
}

export const simulationStore = createSimulationStore();
export { CORNERS, INTERSECTION_CENTER, LANE_OFFSET, STOP_DISTANCE_FROM_CENTER };
