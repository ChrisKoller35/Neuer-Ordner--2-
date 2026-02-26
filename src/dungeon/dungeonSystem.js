// ============================================================
// DUNGEON SYSTEM — Hauptmodul für den Dungeon-Modus
// ============================================================
// Orchestriert Generator, Renderer und Update-System.
// Seitenansicht mit echtem Spieler-Sprite.
"use strict";

import { generateDungeonFloor, GRID_COLS, GRID_ROWS, getBiomeForFloor } from './dungeonGenerator.js';
import { createDungeonRenderSystem } from './dungeonRender.js';
import { createDungeonUpdateSystem, getDungeonShortcuts } from './dungeonUpdate.js';
import { CHUNK_COLS, CHUNK_ROWS } from './chunkLibrary.js';
import { createDungeonEditor } from './dungeonEditor.js';
import S from '../core/sharedState.js';
import { createEndlessRun, getActiveDepth, getScalingForDepth, calcRoomReward } from './dungeonEndless.js';
import { initStatusEffects } from './statusEffects.js';

const DUNGEON_DEPTH_STORAGE_KEY = 'cashfish_dungeon_depth';
const ROOM_PIXEL_SCALE = 2.2;
const DUNGEON_VIEW_ZOOM = 1.0;
const MISSION_CAMERA_FOLLOW_SPEED = 0.08;
const MISSION_CAMERA_DEADZONE_X_FACTOR = 0.25;
const MISSION_CAMERA_DEADZONE_Y_FACTOR = 0.30;

/**
 * Erstellt das Dungeon-System
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {CanvasRenderingContext2D} ctx.ctx
 * @param {Function} ctx.getState - Haupt-Spielstate
 * @param {Function} ctx.getKeys - Gedrückte Tasten
 * @param {Function} ctx.onReturnToCity - Callback für Rückkehr
 * @param {Object} ctx.MODELS - Render-Modelle (player, simpleShadow etc.)
 * @param {Object} ctx.SPRITES - Sprite-Proxy
 * @param {Function} ctx.spriteReady - Prüft ob Sprite geladen
 */
export function createDungeonSystem(ctx) {
	const { canvas, ctx: renderCtx, getState, getKeys, onReturnToCity, MODELS, SPRITES, spriteReady, helpersSystem } = ctx;

	let dungeonState = null;
	let startMenu = null; // { seed, selectedFloor, shortcuts, cursorIndex }

	const RUN_MODIFIER_POOL = [
		{ id: 'berserk', label: 'Berserker', desc: '+30% Schaden, +15% Gegnerschaden', attackDamageMult: 1.3, enemyDamageMult: 1.15 },
		{ id: 'fortified', label: 'Gehärtet', desc: '+1 Herz, -10% Schaden', maxHeartsDelta: 1, attackDamageMult: 0.9 },
		{ id: 'glass', label: 'Glasrüstung', desc: '-1 Herz, +20% Schaden', maxHeartsDelta: -1, attackDamageMult: 1.2 },
		{ id: 'swarm', label: 'Schwarmdruck', desc: '+1 Spawn-Bonus, +20% Gold', spawnBonus: 1, coinMult: 1.2 }
	];

	function buildRunModifiers(seed) {
		const pool = [...RUN_MODIFIER_POOL];
		let hash = Math.abs(Math.floor(Number(seed) || 0)) + 17;
		const picks = [];
		const pickCount = 2;
		for (let i = 0; i < pickCount && pool.length > 0; i++) {
			hash = (hash * 1103515245 + 12345) & 0x7fffffff;
			const idx = hash % pool.length;
			picks.push(pool.splice(idx, 1)[0]);
		}
		return picks;
	}

	function aggregateModifierEffects(modifiers) {
		const effects = {
			attackDamageMult: 1,
			enemyDamageMult: 1,
			enemyHPMult: 1,
			coinMult: 1,
			spawnBonus: 0,
			maxHeartsDelta: 0
		};
		for (const modifier of modifiers || []) {
			effects.attackDamageMult *= modifier.attackDamageMult || 1;
			effects.enemyDamageMult *= modifier.enemyDamageMult || 1;
			effects.enemyHPMult *= modifier.enemyHPMult || 1;
			effects.coinMult *= modifier.coinMult || 1;
			effects.spawnBonus += modifier.spawnBonus || 0;
			effects.maxHeartsDelta += modifier.maxHeartsDelta || 0;
		}
		return effects;
	}

	function createSessionGoal(baseDepth) {
		const depth = Math.max(1, Math.floor(baseDepth || 1));
		if (depth < 12) {
			const targetDepth = depth + 5;
			return {
				id: 'reach_depth',
				label: `Erreiche Tiefe ${targetDepth}`,
				target: targetDepth,
				progress: depth,
				rewardCoins: 220 + targetDepth * 8,
				completed: false,
				rewardClaimed: false
			};
		}
		return {
			id: 'clear_floors',
			label: 'Schaffe 3 Etagen in einem Run',
			target: 3,
			progress: 0,
			rewardCoins: 360 + depth * 6,
			completed: false,
			rewardClaimed: false
		};
	}

	function updateSessionGoalProgress(ds, eventType, value) {
		if (!ds?.sessionGoal || ds.sessionGoal.completed) return;
		const goal = ds.sessionGoal;
		if (goal.id === 'reach_depth' && eventType === 'depth') {
			goal.progress = Math.max(goal.progress, Math.floor(value || 0));
			if (goal.progress >= goal.target) {
				goal.completed = true;
			}
		}
		if (goal.id === 'clear_floors' && eventType === 'floors') {
			goal.progress = Math.max(goal.progress, Math.floor(value || 0));
			if (goal.progress >= goal.target) {
				goal.completed = true;
			}
		}
		if (goal.completed && !goal.rewardClaimed) {
			goal.rewardClaimed = true;
			ds.coins += Math.max(0, Math.floor(goal.rewardCoins || 0));
			ds.clearBanner = 1700;
			ds.clearBannerText = `🎯 Ziel erfüllt! +${Math.floor(goal.rewardCoins || 0)} Gold`;
		}
	}

	function loadPersistedDepth() {
		try {
			const raw = localStorage.getItem(DUNGEON_DEPTH_STORAGE_KEY);
			const parsed = Number.parseInt(raw ?? '0', 10);
			return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
		} catch (e) {
			return 0;
		}
	}

	function persistDepth(depth) {
		const value = Math.max(0, Math.floor(depth || 0));
		S.dungeonDepth = value;
		try {
			localStorage.setItem(DUNGEON_DEPTH_STORAGE_KEY, String(value));
		} catch (e) {
			// ignore storage failures
		}
	}

	persistDepth(loadPersistedDepth());

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function initDungeonWorldCamera(ds) {
		if (!ds?.currentFloor) return;
		ds.viewZoom = DUNGEON_VIEW_ZOOM;
		const viewWidth = canvas.width;
		const viewHeight = canvas.height;
		ds.roomPixelWidth = Math.max(canvas.width, Math.round(canvas.width * (ds.roomPixelScale || ROOM_PIXEL_SCALE)));
		ds.roomPixelHeight = Math.max(canvas.height, Math.round(canvas.height * (ds.roomPixelScale || ROOM_PIXEL_SCALE)));
		ds.worldWidth = Math.max(canvas.width, ds.currentFloor.gridCols * ds.roomPixelWidth);
		ds.worldHeight = Math.max(canvas.height, ds.currentFloor.gridRows * ds.roomPixelHeight);
		const roomWorldX = ds.currentRoomX * ds.roomPixelWidth;
		const roomWorldY = ds.currentRoomY * ds.roomPixelHeight;
		ds.playerWorldX = roomWorldX + ds.playerPx;
		ds.playerWorldY = roomWorldY + ds.playerPy;
		ds.camera = {
			x: clamp(roomWorldX, 0, Math.max(0, ds.worldWidth - viewWidth)),
			y: clamp(roomWorldY, 0, Math.max(0, ds.worldHeight - viewHeight)),
			targetX: roomWorldX,
			targetY: roomWorldY,
			smoothing: MISSION_CAMERA_FOLLOW_SPEED,
			deadZoneX: viewWidth * MISSION_CAMERA_DEADZONE_X_FACTOR,
			deadZoneY: viewHeight * MISSION_CAMERA_DEADZONE_Y_FACTOR
		};
	}

	function syncWorldAndCamera(ds, dt = 16) {
		if (!ds?.currentFloor) return;
		if (!ds.camera) initDungeonWorldCamera(ds);
		if (!ds.camera) return;
		ds.viewZoom = DUNGEON_VIEW_ZOOM;
		const viewWidth = canvas.width;
		const viewHeight = canvas.height;

		ds.roomPixelWidth = Math.max(canvas.width, Math.round(canvas.width * (ds.roomPixelScale || ROOM_PIXEL_SCALE)));
		ds.roomPixelHeight = Math.max(canvas.height, Math.round(canvas.height * (ds.roomPixelScale || ROOM_PIXEL_SCALE)));
		ds.worldWidth = Math.max(canvas.width, ds.currentFloor.gridCols * ds.roomPixelWidth);
		ds.worldHeight = Math.max(canvas.height, ds.currentFloor.gridRows * ds.roomPixelHeight);

		const roomWorldX = ds.currentRoomX * ds.roomPixelWidth;
		const roomWorldY = ds.currentRoomY * ds.roomPixelHeight;
		ds.playerWorldX = roomWorldX + ds.playerPx;
		ds.playerWorldY = roomWorldY + ds.playerPy;

		const maxCamX = Math.max(0, ds.worldWidth - viewWidth);
		const maxCamY = Math.max(0, ds.worldHeight - viewHeight);

		if (ds.transition) {
			const fromWorldX = ds.transition.fromX * ds.roomPixelWidth;
			const fromWorldY = ds.transition.fromY * ds.roomPixelHeight;
			const toWorldX = ds.transition.toX * ds.roomPixelWidth;
			const toWorldY = ds.transition.toY * ds.roomPixelHeight;
			const progress = Math.max(0, Math.min(1, (ds.transition.elapsed || 0) / Math.max(1, ds.transition.duration || 1)));
			const ease = 1 - Math.pow(1 - progress, 3);
			const interpX = fromWorldX + (toWorldX - fromWorldX) * ease;
			const interpY = fromWorldY + (toWorldY - fromWorldY) * ease;
			ds.camera.targetX = clamp(interpX, 0, maxCamX);
			ds.camera.targetY = clamp(interpY, 0, maxCamY);
			ds.camera.x = ds.camera.targetX;
			ds.camera.y = ds.camera.targetY;
			return;
		}

		const roomCamMinX = roomWorldX;
		const roomCamMinY = roomWorldY;
		const roomCamMaxX = roomWorldX + ds.roomPixelWidth - viewWidth;
		const roomCamMaxY = roomWorldY + ds.roomPixelHeight - viewHeight;

		ds.camera.deadZoneX = viewWidth * MISSION_CAMERA_DEADZONE_X_FACTOR;
		ds.camera.deadZoneY = viewHeight * MISSION_CAMERA_DEADZONE_Y_FACTOR;

		const playerScreenX = ds.playerWorldX - ds.camera.x;
		const playerScreenY = ds.playerWorldY - ds.camera.y;
		const centerX = viewWidth / 2;
		const centerY = viewHeight / 2;
		const leftBound = centerX - ds.camera.deadZoneX / 2;
		const rightBound = centerX + ds.camera.deadZoneX / 2;
		const topBound = centerY - ds.camera.deadZoneY / 2;
		const bottomBound = centerY + ds.camera.deadZoneY / 2;

		let nextTargetX = ds.camera.targetX;
		let nextTargetY = ds.camera.targetY;

		if (playerScreenX < leftBound) nextTargetX = ds.playerWorldX - leftBound;
		else if (playerScreenX > rightBound) nextTargetX = ds.playerWorldX - rightBound;

		if (playerScreenY < topBound) nextTargetY = ds.playerWorldY - topBound;
		else if (playerScreenY > bottomBound) nextTargetY = ds.playerWorldY - bottomBound;

		ds.camera.targetX = clamp(nextTargetX, roomCamMinX, roomCamMaxX);
		ds.camera.targetY = clamp(nextTargetY, roomCamMinY, roomCamMaxY);
		ds.camera.targetX = clamp(ds.camera.targetX, 0, maxCamX);
		ds.camera.targetY = clamp(ds.camera.targetY, 0, maxCamY);

		const smoothing = Math.max(0.01, Math.min(0.9, ds.camera.smoothing || MISSION_CAMERA_FOLLOW_SPEED));
		const alpha = 1 - Math.pow(1 - smoothing, Math.max(1, dt / 16));
		ds.camera.x += (ds.camera.targetX - ds.camera.x) * alpha;
		ds.camera.y += (ds.camera.targetY - ds.camera.y) * alpha;
	}

	// Renderer bekommt MODELS/SPRITES für Spieler-Sprite
	const renderer = createDungeonRenderSystem({
		canvas,
		ctx: renderCtx,
		getDungeonState: () => dungeonState,
		MODELS: MODELS || null,
		SPRITES: SPRITES || null,
		spriteReady: spriteReady || (() => false)
	});

	const updater = createDungeonUpdateSystem({
		canvas,
		getDungeonState: () => dungeonState,
		getState,
		getKeys,
		helpersSystem: helpersSystem || null,
		onDungeonComplete: handleComplete,
		onDungeonDeath: handleDeath
	});

	// Lock & Reroll Editor (Dev-Tool)
	const editor = createDungeonEditor({
		canvas,
		ctx: renderCtx,
		getDungeonState: () => dungeonState
	});

	/**
	 * Startet einen neuen Dungeon-Run
	 */
	function enterDungeon(options = {}) {
		const seed = options.seed ?? Math.floor(Math.random() * 999999);
		const startFloor = options.startFloor || 1;
		const state = getState();
		const runModifiers = buildRunModifiers(seed);
		const runModifierEffects = aggregateModifierEffects(runModifiers);
		const baseMaxHearts = state.maxHearts || 5;
		const maxHearts = Math.max(2, baseMaxHearts + (runModifierEffects.maxHeartsDelta || 0));
		const sessionGoal = createSessionGoal((S.dungeonDepth || 0) + 1);

		// Pixel-Position berechnen (Mitte des Canvas als Start)
		const roomPixelWidth = Math.max(canvas.width, Math.round(canvas.width * ROOM_PIXEL_SCALE));
		const roomPixelHeight = Math.max(canvas.height, Math.round(canvas.height * ROOM_PIXEL_SCALE));
		const tileW = roomPixelWidth / CHUNK_COLS;
		const tileH = roomPixelHeight / CHUNK_ROWS;

		dungeonState = {
			seed,
			currentFloor: null,
			currentRoomX: 0,
			currentRoomY: 0,
			// Pixel-basierte Position (Seitenansicht)
			playerPx: canvas.width / 2,
			playerPy: canvas.height / 2,
			playerDir: 1, // 1=rechts, -1=links
			playerAngle: 0, // Neigungswinkel (Rad) — ±36° beim Schwimmen hoch/runter
			hearts: Math.min(maxHearts, state.hearts || 3),
			maxHearts,
			coins: state.coins || 0,
			score: 0,
			attackDamage: Math.max(1, Math.round(2 * (runModifierEffects.attackDamageMult || 1))),
			attackCooldown: 0,
			attackEffect: null,
			projectiles: [],
			playerInvulnerable: 0,
			transition: null,
			roomEnemies: [],
			roomPickups: [],
			clearBanner: 0,
			checkpointActivated: false,
			checkpointFloor: 0,
			nextFloorRequested: false,
			totalFloorsCleared: 0,
			totalDepthBase: S.dungeonDepth || 0,
			startFloor,
			endlessRun: createEndlessRun(S.dungeonDepth || 0),
			endlessDepth: Math.max(1, (S.dungeonDepth || 0) + 1),
			endlessScaling: getScalingForDepth((S.dungeonDepth || 0) + 1),
			endlessRewardPreview: calcRoomReward((S.dungeonDepth || 0) + 1),
			runModifiers,
			runModifierEffects,
			sessionGoal,
			dungeonSpriteAddonEnabled: false,
			continuousWorld: false,
			roomPixelScale: ROOM_PIXEL_SCALE,
			viewZoom: DUNGEON_VIEW_ZOOM,
			roomPixelWidth,
			roomPixelHeight,
			active: true,
			helpers: []
		};

		// Helfer-Begleiter spawnen
		if (helpersSystem) {
			dungeonState.helpers = helpersSystem.createDungeonHelpers();
		}

		initStatusEffects(dungeonState);
		loadFloor(startFloor);
		state.mode = "dungeon";
	}

	/**
	 * Generiert und lädt ein Stockwerk
	 */
	function loadFloor(floorNum) {
		if (!dungeonState) return;

		const activeDepth = getActiveDepth(dungeonState.totalDepthBase, dungeonState.totalFloorsCleared);
		dungeonState.endlessDepth = activeDepth;
		dungeonState.endlessScaling = getScalingForDepth(activeDepth);
		dungeonState.endlessRewardPreview = calcRoomReward(activeDepth);
		dungeonState.endlessRun.depth = activeDepth;
		dungeonState.endlessRun.roomsCleared = dungeonState.totalFloorsCleared;
		dungeonState.endlessRun.currentTier = dungeonState.endlessScaling.tier;
		updateSessionGoalProgress(dungeonState, 'depth', activeDepth);

		const floor = generateDungeonFloor(floorNum, dungeonState.seed);
		dungeonState.currentFloor = floor;
		dungeonState.currentRoomX = floor.startPos.gridX;
		dungeonState.currentRoomY = floor.startPos.gridY;
		dungeonState.nextFloorRequested = false;
		dungeonState.checkpointActivated = false;
		dungeonState._eliteSpawnedThisFloor = false;

		const roomPixelWidth = dungeonState.roomPixelWidth || Math.max(canvas.width, Math.round(canvas.width * ROOM_PIXEL_SCALE));
		const roomPixelHeight = dungeonState.roomPixelHeight || Math.max(canvas.height, Math.round(canvas.height * ROOM_PIXEL_SCALE));
		const tileW = roomPixelWidth / CHUNK_COLS;
		const tileH = roomPixelHeight / CHUNK_ROWS;

		// Spieler-Position in Pixel (basierend auf Spawn-Point)
		const startChunk = floor.grid[floor.startPos.gridY]?.[floor.startPos.gridX];
		if (startChunk) {
			const sp = startChunk.spawns.find(s => s.type === "playerSpawn");
			if (sp) {
				dungeonState.playerPx = (sp.x + 0.5) * tileW;
				dungeonState.playerPy = (sp.y + 0.5) * tileH;
			} else {
				dungeonState.playerPx = roomPixelWidth * 0.3;
				dungeonState.playerPy = roomPixelHeight * 0.5;
			}
		}

		updater.enterRoom(dungeonState);
		updater.repositionHelpers(dungeonState);
		updater.resetCooldowns();
		initDungeonWorldCamera(dungeonState);
		syncWorldAndCamera(dungeonState, 16);
	}

	/**
	 * Update pro Frame
	 */
	function tickDungeon(dt) {
		if (!dungeonState || !dungeonState.active) return;

		// Editor aktiv? Keine Dungeon-Logik
		if (editor.isActive()) return;

		// Sicherstellen dass mode "dungeon" bleibt
		const state = getState();
		if (state.mode !== "dungeon") {
			console.warn('[Dungeon] Mode wurde extern geändert zu:', state.mode, '– korrigiere zurück');
			state.mode = "dungeon";
		}

		const keys = getKeys();

		// ESC → Zurück zur Stadt
		if (keys.Escape) {
			returnToCity("retreat");
			return;
		}

		// Angriff
		if (keys.Space || keys.attack) {
			updater.handleAttack(dungeonState);
		}

		try {
			updater.update(dt);
			syncWorldAndCamera(dungeonState, dt);
		} catch (err) {
			console.error('[Dungeon] Update-Fehler:', err);
			return;
		}

		// Nächstes Stockwerk?
		if (dungeonState && dungeonState.nextFloorRequested) {
			dungeonState.totalFloorsCleared++;
			dungeonState.endlessRun.roomsCleared = dungeonState.totalFloorsCleared;
			updateSessionGoalProgress(dungeonState, 'floors', dungeonState.totalFloorsCleared);
			persistDepth(dungeonState.totalDepthBase + dungeonState.totalFloorsCleared);
			loadFloor(dungeonState.currentFloor.floor + 1);
		}

		// Coins synchronisieren
		if (dungeonState) {
			state.coins = dungeonState.coins;
		}
	}

	function renderDungeon() {
		if (!dungeonState || !dungeonState.active) return;
		try {
			renderer.render();
			// Editor-Overlay
			if (editor.isActive()) editor.render();
		} catch (err) {
			console.error('[Dungeon] Render-Fehler:', err);
		}
	}

	function handleComplete(ds) {
		const state = getState();
		const coinMult = ds?.runModifierEffects?.coinMult || 1;
		persistDepth(ds.totalDepthBase + ds.totalFloorsCleared + 1);
		state.coins = ds.coins + Math.max(1, Math.floor(5000 * coinMult));
		ds.active = false;
		dungeonState = null;
		if (onReturnToCity) onReturnToCity("complete");
	}

	function handleDeath(ds) {
		const state = getState();
		persistDepth(ds.totalDepthBase + ds.totalFloorsCleared);
		state.coins = ds.coins;
		ds.active = false;
		dungeonState = null;
		if (onReturnToCity) onReturnToCity("death");
	}

	function returnToCity(reason) {
		if (!dungeonState) return;
		const state = getState();
		persistDepth(dungeonState.totalDepthBase + dungeonState.totalFloorsCleared);
		state.coins = dungeonState.coins;
		dungeonState.active = false;
		dungeonState = null;
		if (onReturnToCity) onReturnToCity(reason);
	}

	// ---- Dungeon Start-Menü ----
	function showStartMenu() {
		if (startMenu?._keyHandler) {
			document.removeEventListener('keydown', startMenu._keyHandler);
		}
		const shortcuts = getDungeonShortcuts();
		const floors = [1, ...shortcuts.filter(f => f > 1)];
		const dungeonSlots = [
			{ id: 'standard', label: 'Standard-Endlos', locked: false },
			{ id: 'slot-2', label: 'Slot 2', locked: true, lockText: 'Bald verfügbar' },
			{ id: 'slot-3', label: 'Slot 3', locked: true, lockText: 'Bald verfügbar' }
		];
		startMenu = {
			seed: Math.floor(Math.random() * 999999),
			seedInput: '',
			selectedFloor: 0, // Index in floors-Array
			floors,
			dungeonSlots,
			selectedDungeonSlot: 0,
			cursorIndex: 0, // 0=Seed, 1=Floor, 2=Slots, 3=Start
			feedback: '',
			active: true,
			typing: false // Seed-Eingabemodus
		};
		const state = getState();
		state.mode = "dungeon_menu";

		// Registriere temporären Keydown-Handler für Seed-Eingabe
		startMenu._keyHandler = (e) => {
			if (!startMenu || !startMenu.active) return;
			if (startMenu.cursorIndex !== 0) return;

			// V einfügen (Ctrl+V)
			if (e.key === 'v' && e.ctrlKey) {
				e.preventDefault();
				navigator.clipboard.readText().then(text => {
					const num = parseInt(text);
					if (!isNaN(num) && num >= 0) {
						startMenu.seedInput = String(num).slice(0, 9);
						startMenu.seed = parseInt(startMenu.seedInput) || 0;
						startMenu.typing = true;
					}
				}).catch(() => {});
				return;
			}

			// Ziffern eingeben
			if (e.key >= '0' && e.key <= '9' && startMenu.seedInput.length < 9) {
				e.preventDefault();
				startMenu.seedInput += e.key;
				startMenu.seed = parseInt(startMenu.seedInput) || 0;
				startMenu.typing = true;
			}
			// Backspace
			if (e.key === 'Backspace' && startMenu.seedInput.length > 0) {
				e.preventDefault();
				startMenu.seedInput = startMenu.seedInput.slice(0, -1);
				startMenu.seed = startMenu.seedInput.length > 0 ? (parseInt(startMenu.seedInput) || 0) : 0;
				if (startMenu.seedInput.length === 0) startMenu.typing = false;
			}
		};
		document.addEventListener('keydown', startMenu._keyHandler);
	}

	function updateStartMenu() {
		if (!startMenu || !startMenu.active) return;
		const keys = getKeys();

		// Debounce: nur bei Neudruck reagieren
		if (!startMenu._prevKeys) startMenu._prevKeys = {};
		const justPressed = (k) => keys[k] && !startMenu._prevKeys[k];

		if (justPressed('Escape')) {
			if (startMenu._keyHandler) document.removeEventListener('keydown', startMenu._keyHandler);
			startMenu.active = false;
			startMenu = null;
			const state = getState();
			state.mode = "city";
			return;
		}

		if (justPressed('ArrowUp')) {
			startMenu.cursorIndex = Math.max(0, startMenu.cursorIndex - 1);
		}
		if (justPressed('ArrowDown')) {
			startMenu.cursorIndex = Math.min(3, startMenu.cursorIndex + 1);
		}

		// Floor selection
		if (startMenu.cursorIndex === 1) {
			if (justPressed('ArrowLeft')) {
				startMenu.selectedFloor = Math.max(0, startMenu.selectedFloor - 1);
			}
			if (justPressed('ArrowRight')) {
				startMenu.selectedFloor = Math.min(startMenu.floors.length - 1, startMenu.selectedFloor + 1);
			}
		}

		// Dungeon-Slot selection
		if (startMenu.cursorIndex === 2) {
			if (justPressed('ArrowLeft')) {
				startMenu.selectedDungeonSlot = Math.max(0, startMenu.selectedDungeonSlot - 1);
			}
			if (justPressed('ArrowRight')) {
				startMenu.selectedDungeonSlot = Math.min((startMenu.dungeonSlots?.length || 1) - 1, startMenu.selectedDungeonSlot + 1);
			}
		}

		// Seed bleibt stabil: keine Pfeil-Änderung mehr

		const tryStartDungeon = () => {
			const selectedSlot = startMenu.dungeonSlots?.[startMenu.selectedDungeonSlot || 0];
			if (selectedSlot?.locked) {
				startMenu.feedback = selectedSlot.lockText || 'Dieser Slot ist gesperrt';
				return false;
			}
			startMenu.feedback = '';
			const seed = startMenu.seedInput ? parseInt(startMenu.seedInput) || startMenu.seed : startMenu.seed;
			const floor = startMenu.floors[startMenu.selectedFloor] || 1;
			if (startMenu._keyHandler) document.removeEventListener('keydown', startMenu._keyHandler);
			startMenu.active = false;
			startMenu = null;
			enterDungeon({ seed, startFloor: floor });
			return true;
		};

		// Enter/Space → Start (auf Slot-Zeile ODER Start-Button)
		if (justPressed('Enter') || justPressed('Space')) {
			if (startMenu.cursorIndex >= 2) {
				if (tryStartDungeon()) return;
			} else {
				startMenu.cursorIndex = 3;
				startMenu.feedback = 'Enter erneut: Dungeon starten';
			}
		}

		// Prev-Keys aktualisieren
		startMenu._prevKeys = { ...keys };
	}

	function renderStartMenu() {
		if (!startMenu || !startMenu.active) return;
		const c = renderCtx;
		const w = canvas.width, h = canvas.height;

		// Dimmer Hintergrund
		c.fillStyle = "rgba(0, 10, 30, 0.85)";
		c.fillRect(0, 0, w, h);

		// Panel
		const panelW = 500, panelH = 360;
		const panelX = (w - panelW) / 2, panelY = (h - panelH) / 2;
		c.fillStyle = "rgba(10, 30, 60, 0.95)";
		c.strokeStyle = "#4488cc";
		c.lineWidth = 2;
		c.fillRect(panelX, panelY, panelW, panelH);
		c.strokeRect(panelX, panelY, panelW, panelH);

		// Titel
		c.fillStyle = "#ffffff";
		c.font = "bold 20px 'Segoe UI', sans-serif";
		c.textAlign = "center";
		c.fillText("⚓ Dungeon betreten", w / 2, panelY + 35);

		const rowY = [panelY + 75, panelY + 135, panelY + 205, panelY + 285];
		const cursor = startMenu.cursorIndex;

		// Zeile 1: Seed
		c.font = "14px 'Segoe UI', monospace";
		c.textAlign = "left";
		c.fillStyle = cursor === 0 ? "#ffcc00" : "#88aacc";
		c.fillText(cursor === 0 ? "▶ " : "  ", panelX + 15, rowY[0]);
		c.fillStyle = "#ccddee";
		c.fillText("Seed:", panelX + 40, rowY[0]);
		c.fillStyle = "#ffffff";
		c.font = "bold 18px monospace";
		const seedDisplay = startMenu.typing ? startMenu.seedInput + (Math.floor(performance.now() / 500) % 2 ? '|' : '') : String(startMenu.seed);
		c.fillText(seedDisplay, panelX + 110, rowY[0]);
		if (cursor === 0) {
			c.font = "11px 'Segoe UI'";
			c.fillStyle = "#889";
			c.fillText(startMenu.typing ? "Backspace = Löschen" : "Ziffern tippen · Ctrl+V", panelX + 110, rowY[0] + 20);
		}

		// Zeile 2: Startboden
		c.font = "14px 'Segoe UI', monospace";
		c.fillStyle = cursor === 1 ? "#ffcc00" : "#88aacc";
		c.fillText(cursor === 1 ? "▶ " : "  ", panelX + 15, rowY[1]);
		c.fillStyle = "#ccddee";
		c.fillText("Start-Etage:", panelX + 40, rowY[1]);

		// Floor-Auswahl
		const selFloor = startMenu.floors[startMenu.selectedFloor] || 1;
		const biome = getBiomeForFloor(selFloor);
		const biomeLabels = { stein: "🪨 Stein", eis: "❄️ Eis", lava: "🔥 Lava" };
		c.fillStyle = "#ffffff";
		c.font = "bold 18px monospace";
		c.fillText(`Etage ${selFloor}`, panelX + 170, rowY[1]);
		c.font = "13px 'Segoe UI'";
		c.fillStyle = biome === "lava" ? "#ff6644" : biome === "eis" ? "#66ccff" : "#aaaacc";
		c.fillText(biomeLabels[biome] || biome, panelX + 290, rowY[1]);

		if (startMenu.floors.length > 1 && cursor === 1) {
			c.font = "11px 'Segoe UI'";
			c.fillStyle = "#889";
			c.fillText("← → = Etage wählen", panelX + 170, rowY[1] + 20);
		}
		if (startMenu.floors.length <= 1) {
			c.font = "11px 'Segoe UI'";
			c.fillStyle = "#667";
			c.fillText("Keine Abkürzungen freigeschaltet", panelX + 40, rowY[1] + 20);
		}

		// Zeile 3: Endlos-Dungeon Slots (nur Slot 1 aktiv)
		c.font = "14px 'Segoe UI', monospace";
		c.fillStyle = cursor === 2 ? "#ffcc00" : "#88aacc";
		c.fillText(cursor === 2 ? "▶ " : "  ", panelX + 15, rowY[2]);
		c.fillStyle = "#ccddee";
		c.fillText("Dungeon-Slots:", panelX + 40, rowY[2]);

		const slotY = rowY[2] + 12;
		const slotW = 130;
		const slotH = 44;
		const slotGap = 12;
		const slotStartX = panelX + 40;
		for (let i = 0; i < 3; i++) {
			const slot = startMenu.dungeonSlots?.[i];
			const x = slotStartX + i * (slotW + slotGap);
			const isLocked = !!slot?.locked;
			const isSelected = i === (startMenu.selectedDungeonSlot || 0);
			c.fillStyle = isLocked ? "rgba(40, 55, 75, 0.9)" : "rgba(34, 102, 170, 0.9)";
			c.strokeStyle = isSelected ? "#ffcc00" : (isLocked ? "#5d6f84" : "#66bbff");
			c.lineWidth = 2;
			c.fillRect(x, slotY, slotW, slotH);
			c.strokeRect(x, slotY, slotW, slotH);

			c.textAlign = "center";
			c.fillStyle = "#ffffff";
			c.font = "bold 12px 'Segoe UI'";
			c.fillText(isLocked ? `🔒 ${slot?.label || `Slot ${i + 1}`}` : (slot?.label || `Slot ${i + 1}`), x + slotW / 2, slotY + 17);
			c.font = "11px 'Segoe UI'";
			c.fillStyle = isLocked ? "#aab7c6" : "#d9efff";
			c.fillText(isLocked ? (slot?.lockText || "Gesperrt") : "Aktiv", x + slotW / 2, slotY + 34);
		}
		c.textAlign = "left";
		c.font = "11px 'Segoe UI'";
		c.fillStyle = "#889";
		c.fillText(cursor === 2 ? "← → = Slot wählen" : "Slot 2 und 3 sind sichtbar, aber vorerst gesperrt.", panelX + 40, slotY + slotH + 18);

		// Zeile 4: Start-Button
		const btnW = 180, btnH = 36;
		const btnX = (w - btnW) / 2, btnY = rowY[3] - 14;
		c.fillStyle = cursor === 3 ? "#2266aa" : "#1a4470";
		c.strokeStyle = cursor === 3 ? "#66bbff" : "#335577";
		c.lineWidth = 2;
		c.fillRect(btnX, btnY, btnW, btnH);
		c.strokeRect(btnX, btnY, btnW, btnH);
		c.fillStyle = "#ffffff";
		c.font = "bold 16px 'Segoe UI'";
		c.textAlign = "center";
		c.fillText("Dungeon starten", w / 2, btnY + 24);

		if (startMenu.feedback) {
			c.font = "12px 'Segoe UI'";
			c.fillStyle = "#ffcc88";
			c.textAlign = "center";
			c.fillText(startMenu.feedback, w / 2, panelY + panelH - 30);
		}

		// Hilfe
		c.font = "11px 'Segoe UI'";
		c.fillStyle = "#556677";
		c.fillText("↑↓ Navigieren | ←→ Werte/Slot | Enter = Starten | ESC = Abbrechen", w / 2, panelY + panelH - 12);
		c.textAlign = "left";
	}

	return {
		enterDungeon,
		showStartMenu,
		update(dt) {
			if (startMenu && startMenu.active) {
				updateStartMenu();
				return;
			}
			tickDungeon(dt);
		},
		render() {
			if (startMenu && startMenu.active) {
				renderStartMenu();
				return;
			}
			renderDungeon();
		},
		isActive: () => (startMenu?.active) || (dungeonState?.active === true),
		getDungeonState: () => dungeonState,
		getShortcuts: getDungeonShortcuts,
		isMenuActive: () => startMenu?.active === true,
		editor // Lock & Reroll Editor (Dev-Tool)
	};
}
