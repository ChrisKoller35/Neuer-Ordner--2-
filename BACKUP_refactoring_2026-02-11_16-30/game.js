// ============================================================
// CASHFISCH - Hauptspiel
// ============================================================
"use strict";

// Imports aus Modulen
import { 
	TAU, 
	DEFAULT_BOSS_STATS,
	KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN,
	KEY_SHIELD, CODE_SHIELD,
	KEY_CORAL, CODE_CORAL,
	KEY_TSUNAMI, CODE_TSUNAMI,
	KEY_SHOOT, CODE_SHOOT,
	CITY_SCALE, CITY_VIEW_ZOOM, CITY_SPEED, CITY_PLAYER_RADIUS,
	FOE_BASE_SCORE,
	SHIELD_DURATION, SHIELD_COOLDOWN,
	LEVEL2_FLOOR_OFFSET, LEVEL3_FLOOR_OFFSET, LEVEL4_FLOOR_OFFSET,
	LEVEL3_FLOOR_MIN_VISIBLE, LEVEL3_FLOOR_COLLISION_RATIO, LEVEL3_FLOOR_COLLISION_PAD,
	MAX_DELTA_TIME, MIN_DELTA_TIME, LONG_FRAME_THRESHOLD
} from './core/constants.js';

import { clamp, clamp01, easeOutCubic, lerp, distance, randomRange } from './core/utils.js';

import { 
	loadSprite, 
	spriteReady, 
	configureAssetLoader,
	ManifestAssets,
	createLazySpriteProxy,
	getLazySprite,
	AssetManager
} from './core/assets.js';

import { updateAllGrids } from './core/spatial.js';

// JSON-Daten importieren (Vite unterstÃ¼tzt JSON-Imports)
import itemsData from './data/items.json';
import shopData from './data/shop.json';
import missionsData from './data/missions.json';
import cityData from './data/city.json';
import symbolsData from './data/symbols.json';
import walkableGridsData from './data/walkableGrids.json';
import spritesData from './data/sprites.json';

// Stadt Sprite-Cache importieren
import { 
	CITY_SPRITE_CACHE, 
	getCitySpriteCropShift, 
	updateCitySpriteCropShift,
	setCitySpriteCropShift,
	getCitySpriteCropShiftArray,
	buildCitySpriteCache as buildCitySpriteCacheModule
} from './city/spriteCache.js';

// Stadt-Konstanten importieren
import {
	USE_CITY_SPRITE,
	CITY_ANIM_SOURCE,
	CITY_SPRITE_FRAME_SIZE,
	CITY_SPRITE_SCALE,
	CITY_SPRITE_OFFSET_X_SIDE,
	CITY_SPRITE_OFFSET_X_VERTICAL,
	CITY_SPRITE_OFFSET_Y,
	CITY_SPRITE_PADDING,
	CITY_SPRITE_CROP_INSET,
	CITY_SPRITE_ALPHA_THRESHOLD,
	CITY_SPRITE_CROP_OUTSET_X,
	CITY_SPRITE_CROP_OUTSET_Y,
	CITY_SPRITE_DEBUG,
	CITY_ANIM_FRAME_TIME,
	CITY_PERSPECTIVE_ENABLED,
	CITY_PERSPECTIVE_SKEW_X,
	CITY_PERSPECTIVE_SCALE_Y,
	CITY_PERSPECTIVE_ORIGIN_Y,
	CITY_SPRITE_PERSPECTIVE_STRETCH,
	CITY_SPRITE_FRAME_OUTSET,
	CITY_FLOOR_COUNT,
	CITY_FLOOR_HEIGHT,
	CITY_BUILDING_WIDTH,
	CITY_BUILDING_HEIGHT,
	CITY_HATCH_WIDTH,
	CITY_WALL_THICKNESS,
	CITY_FLOOR_THICKNESS,
	CITY_GRID_CELL_SIZE,
	CITY_GRID_COLS,
	CITY_GRID_ROWS,
	CITY_SPRITE_DEBUG_LABEL
} from './city/constants.js';

// Stadt UI-Modul importieren
import { createCityUI } from './city/ui.js';

// Stadt UI-Templates importieren
import { createCityUIElements } from './city/templates.js';

// Stadt Update-Modul importieren
import { updateCity as updateCityModule } from './city/update.js';

// Stadt Render-Modul importieren
import { renderCity as renderCityModule } from './city/render.js';

// Stadt State-Modul importieren
import { buildCityState as buildCityStateModule } from './city/state.js';

// Stadt Sprite-Debug-Modul importieren
import { createCitySpriteDebug } from './city/spriteDebug.js';

// Foes-Module importieren
import { createFoeSpawnSystem } from './foes/spawn.js';
import { createFoeUpdateSystem } from './foes/update.js';
import { createFoeRenderSystem } from './foes/render.js';
import { createFoeArrowsSystem } from './foes/arrows.js';
import { createFoeCollisionSystem } from './foes/collision.js';

// Game-Render-Modul importieren
import { createGameRenderSystem } from './game/render.js';

// Player-Abilities-Modul importieren
import { createAbilitiesSystem } from './player/abilities.js';

// Player-Update-Modul importieren
import { createPlayerUpdateSystem } from './player/update.js';

// Game-Level-Modul importieren
import { createLevelSystem } from './game/levels.js';

// Background-Render-Modul importieren
import { createBackgroundRenderSystem } from './game/background.js';

// Cover-Rock-Modul importieren
import { createCoverRockSystem } from './game/coverRocks.js';

// Pickups-Update-Modul importieren
import { createPickupsSystem } from './game/pickups.js';

// MODELS-Render-Funktionen importieren
import { createModels } from './game/models.js';

// Floor-Helper-Funktionen importieren
import { createFloorHelpers, getLevelFloorSprite } from './game/floor.js';

// Boss-Module importieren
import { createBossRenderSystem } from './boss/render.js';
import { createBossSpawnSystem } from './boss/spawn.js';
import { createBossUpdateSystem } from './boss/update.js';
import { createBossCollisionSystem } from './boss/collision.js';
import { createBossUISystem } from './boss/ui.js';

// Progression-System importieren
import { createProgressionState, createProgressionSystem } from './player/progression.js';
import { createTalentTreeUI } from './player/talentUI.js';
import { KEY_TALENT_TREE, CODE_TALENT_TREE } from './core/constants.js';

// Upgrade-System importieren
import { createUpgradeSystem } from './player/upgrades.js';
import { createUpgradeUI } from './player/upgradeUI.js';

// Buildings-System importieren (GebÃ¤ude, Karte, Teleporter)
import { createBuildingsManager } from './buildings/buildingsManager.js';

let canvas = null;
let ctx = null;

// Floor-Funktionen werden weiter unten nach getLevelFloorSprite() definiert
// (siehe LAZY SPRITE SYSTEM Block)

const USE_CLASSIC_OKTOPUS_PROJECTILE = true; // Toggle to compare new blowdart prototype with classic sprite
const USE_WEBP_ASSETS = true; // Optional: generates/loads .webp with PNG fallback

// Stadt-Sprite-Cache kommt aus ./city/spriteCache.js (importiert oben)
const DEBUG_BUILD_LABEL = "BUILD v3";

// Asset Loader konfigurieren (nutzt import.meta.url fÃ¼r relative Pfade)
configureAssetLoader({ 
	useWebP: USE_WEBP_ASSETS, 
	baseUrl: import.meta.url 
});

// Wrapper fÃ¼r buildCitySpriteCache - nutzt das importierte Modul
function buildCitySpriteCache() {
	buildCitySpriteCacheModule(SPRITES.cityPlayer);
}

// ============================================================
// LAZY SPRITE SYSTEM - Assets werden bei Bedarf geladen
// ============================================================

// Floor-Helper initialisieren (werden in bootGame mit Canvas verbunden)
let floorHelpers = null;
const getLevel2FloorTop = () => floorHelpers?.getLevel2FloorTop() ?? null;
const getLevel3FloorTop = () => floorHelpers?.getLevel3FloorTop() ?? null;
const getLevel4FloorTop = () => floorHelpers?.getLevel4FloorTop() ?? null;
const getLevel3GroundLine = () => floorHelpers?.getLevel3GroundLine() ?? null;

// Lazy-Getter für Kompatibilität mit altem Code
Object.defineProperty(window, 'LEVEL2_FLOOR_SPRITE', { get: () => getLevelFloorSprite(2) });
Object.defineProperty(window, 'LEVEL3_FLOOR_SPRITE', { get: () => getLevelFloorSprite(3) });
Object.defineProperty(window, 'LEVEL4_FLOOR_SPRITE', { get: () => getLevelFloorSprite(4) });

// Sprite-Pfade aus JSON (Lazy Loading)
const SPRITE_PATHS = spritesData.sprites;
const CITY_TILE_PATHS = spritesData.cityTiles;

// Lazy-geladene City Tiles
let _cityTilesLoaded = false;
let _cityTiles = [];

function getCityTiles() {
	if (!_cityTilesLoaded) {
		_cityTiles = CITY_TILE_PATHS.map(path => AssetManager.load(path, "cityTiles"));
		_cityTilesLoaded = true;
	}
	return _cityTiles;
}

// SPRITES Proxy - lÃ¤dt Assets bei erstem Zugriff
const SPRITES = createLazySpriteProxy(SPRITE_PATHS);

// cityTiles muss separat behandelt werden (ist ein Array)
Object.defineProperty(SPRITES, 'cityTiles', {
	get: getCityTiles,
	enumerable: true
});

let processedHealSprite = null;
let pickupHideTimer = null;
// Cache scaled alpha masks so cover rock collisions align to the sprite silhouette.
const coverRockMaskCache = new Map();

// ========== STADT SEITENANSICHT SYSTEM ==========
// Konstanten importiert aus ./city/constants.js

// Globales Grid - true = begehbar, false = blockiert
// Wird Ã¼ber window exportiert fÃ¼r Debug-Editor
window.CITY_WALKABLE_GRID = window.CITY_WALKABLE_GRID || {};
window.CITY_GRID_EDIT_MODE = false;
window.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
window.CITY_GRID_COLS = CITY_GRID_COLS;
window.CITY_GRID_ROWS = CITY_GRID_ROWS;

// ========== GEBÃ„UDE WALKABLE GRIDS (aus JSON geladen) ==========
window.BUILDING_WALKABLE_GRID_market = walkableGridsData.market;
window.BUILDING_WALKABLE_GRID_workshop = walkableGridsData.workshop;
window.BUILDING_WALKABLE_GRID_harbor = walkableGridsData.harbor;
window.BUILDING_WALKABLE_GRID_academy = walkableGridsData.academy;
window.BUILDING_WALKABLE_GRID_garden = walkableGridsData.garden;

// Symbol-Daten aus JSON laden
const SYMBOL_DATA = symbolsData.symbols;
const LEVEL_SYMBOL_SEQUENCE = symbolsData.levelSequence;
const SYMBOL_AUTOCOLLECT_MS = symbolsData.autocollectMs;

function getHealSprite() {
	if (!processedHealSprite && spriteReady(SPRITES.heal)) {
		const source = SPRITES.heal;
		const canvas = document.createElement("canvas");
		canvas.width = source.naturalWidth;
		canvas.height = source.naturalHeight;
		const context = canvas.getContext("2d");
		context.drawImage(source, 0, 0);
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
		const pixels = imageData.data;
		for (let i = 0; i < pixels.length; i += 4) {
			const r = pixels[i];
			const g = pixels[i + 1];
			const b = pixels[i + 2];
			if (r >= 240 && g >= 240 && b >= 240) pixels[i + 3] = 0;
		}
		context.putImageData(imageData, 0, 0);
		processedHealSprite = canvas;
	}
	return processedHealSprite && spriteReady(SPRITES.heal) ? processedHealSprite : SPRITES.heal;
}

function getCoverRockCollisionMask(sprite, width, height) {
		if (!spriteReady(sprite)) return null;
		const key = `${sprite.src || "cover"}:${width.toFixed(3)}x${height.toFixed(3)}`;
		if (coverRockMaskCache.has(key)) return coverRockMaskCache.get(key);
		const drawW = Math.max(1, Math.round(width));
		const drawH = Math.max(1, Math.round(height));
		const canvas = document.createElement("canvas");
		canvas.width = drawW;
		canvas.height = drawH;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		ctx.drawImage(sprite, 0, 0, drawW, drawH);
		const imageData = ctx.getImageData(0, 0, drawW, drawH);
		const { data } = imageData;
		const mask = new Uint8Array(drawW * drawH);
		let minX = drawW;
		let minY = drawH;
		let maxX = -1;
		let maxY = -1;
		for (let y = 0; y < drawH; y++) {
			const rowOffset = y * drawW;
			for (let x = 0; x < drawW; x++) {
				const pixelIndex = (rowOffset + x) * 4;
				const alpha = data[pixelIndex + 3];
				if (alpha > 32) {
					mask[rowOffset + x] = 1;
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		if (maxX < minX || maxY < minY) {
			minX = 0;
			minY = 0;
			maxX = drawW - 1;
			maxY = drawH - 1;
		}
		const info = {
			width: drawW,
			height: drawH,
			data: mask,
			worldWidth: width,
			worldHeight: height,
			scaleX: drawW / Math.max(width, 1e-6),
			scaleY: drawH / Math.max(height, 1e-6),
			minOffsetX: (minX / drawW) * width - width * 0.5,
			maxOffsetX: ((maxX + 1) / drawW) * width - width * 0.5,
			minOffsetY: (minY / drawH) * height - height * 0.5,
			maxOffsetY: ((maxY + 1) / drawH) * height - height * 0.5
		};
		coverRockMaskCache.set(key, info);
		return info;
	}


// MODELS: Render-Funktionen für Spielobjekte (aus models.js)
const MODELS = createModels(SPRITES, spriteReady);

function bootGame() {
	if (bootGame.initialized) return;
	bootGame.initialized = true;

	// Basis-Assets im Hintergrund vorladen (non-blocking)
	ManifestAssets.preloadRequired().then(() => {
		console.log("[Cashfisch] Basis-Assets geladen");
	}).catch(err => {
		console.warn("[Cashfisch] Asset-Preload Warnung:", err);
	});

	canvas = document.getElementById("game");
	if (!canvas) throw new Error("Canvas 'game' not found");
	ctx = canvas.getContext("2d");
	
	// Floor-Helpers initialisieren (mit Canvas verbinden)
	floorHelpers = createFloorHelpers(() => canvas);

	const hudScore = document.getElementById("score");
	const hudCoins = document.getElementById("coins");
	const hudLevel = document.getElementById("lvl");
	const hudTime = document.getElementById("time");
	const hudHearts = document.getElementById("hearts");
	const hudShield = document.getElementById("ab-shield");
	const hudArmor = document.getElementById("hudArmor");
	const hudPlayerLevel = document.getElementById("playerLevel");
	const hudXpBarFill = document.getElementById("xpBarFill");
	const hudSkillPoints = document.getElementById("skillPoints");
	const hudSkillPointsNum = document.getElementById("skillPointsNum");
	const hudSymbols = {
		pferd: document.getElementById("sym-pferd"),
		sprinter: document.getElementById("sym-sprinter"),
		yacht: document.getElementById("sym-yacht")
	};
	const bannerEl = document.getElementById("banner");
	const endOverlay = document.getElementById("endOverlay");
	const endTitle = document.getElementById("endTitle");
	const btnRestart = document.getElementById("btnRestart");
	const btnQuit = document.getElementById("btnQuit");
	const pickupMsg = document.getElementById("pickupMsg");
	const citySpriteDebugPanel = document.getElementById("citySpriteDebugPanel");
	const citySpriteDebugCanvas = document.getElementById("citySpriteDebugCanvas");
	const citySpriteDebugCtx = citySpriteDebugCanvas ? citySpriteDebugCanvas.getContext("2d") : null;
	const citySpriteDebugReset = document.getElementById("citySpriteDebugReset");
	const citySpriteDebugExport = document.getElementById("citySpriteDebugExport");
	const citySpriteDebugOutput = document.getElementById("citySpriteDebugOutput");
	const citySpriteDebugCurrent = document.getElementById("citySpriteDebugCurrent");
	const citySpriteDebugCopy = document.getElementById("citySpriteDebugCopy");
	
	// Stadt-UI-Elemente erstellen (Templates aus city/templates.js)
	const { inventoryEl: cityInventoryEl, merchantEl: cityMerchantEl, missionEl: cityMissionEl } = createCityUIElements();

	// State-Variablen für Debug-Modi (werden vom Modul gelesen)
	let cityAlignMode = false;
	let cityCropMode = false;
	let currentCityFrame = { row: 0, col: 0, flip: false };
	let cityAlignSelectedFrame = null;

	// City Sprite Debug-Modul initialisieren
	const citySpriteDebug = createCitySpriteDebug({
		debugCanvas: citySpriteDebugCanvas,
		debugReset: citySpriteDebugReset,
		debugExport: citySpriteDebugExport,
		debugOutput: citySpriteDebugOutput,
		debugCurrent: citySpriteDebugCurrent,
		debugCopy: citySpriteDebugCopy,
		canvas,
		getSprites: () => SPRITES,
		getState: () => state,
		getCurrentFrame: () => currentCityFrame,
		setCurrentFrame: (f) => { currentCityFrame = f; },
		getAlignMode: () => cityAlignMode,
		getCropMode: () => cityCropMode,
		setAlignSelectedFrame: (f) => { cityAlignSelectedFrame = f; }
	});

	// Wrapper-Funktionen fÃ¼r RÃ¼ckwÃ¤rtskompatibilitÃ¤t
	const getCitySpriteOffset = (row, col) => citySpriteDebug.getOffset(row, col);
	const updateCitySpriteOffset = (row, col, dx, dy) => citySpriteDebug.updateOffset(row, col, dx, dy);
	const CITY_DEBUG_ROWS = citySpriteDebug.DEBUG_ROWS;
	const CITY_DEBUG_COLS = citySpriteDebug.DEBUG_COLS;

	const keys = new Set();
	const pointer = { down: false, shoot: false };
	let controlsArmed = false;
	const DEBUG_SHORTCUTS = true;
	// cityInventoryOpen, cityShopOpen, cityMissionOpen, cityDragState, cityDragGhost 
	// werden jetzt vom cityUI-Modul verwaltet
	const cityInventory = {
		equipment: { weapon: null, armor: null, armor2: null },
		items: Array.from({ length: 9 }, () => null)
	};

	// ============================================================
	// ITEM DEFINITIONS - aus JSON geladen
	// ============================================================
	const CITY_ITEM_DATA = itemsData.items;

	// Konstanten für spezielle Items (Rückwärtskompatibilität)
	const ARMOR_ITEM_NAME = "Rüstung der Meeresbewohner";
	const ARMOR_ITEM_EFFECT = CITY_ITEM_DATA[ARMOR_ITEM_NAME]?.effect || "";
	const ARMOR_ITEM_ICON = CITY_ITEM_DATA[ARMOR_ITEM_NAME]?.icon || null;

	const getCityItemData = name => {
		if (!name) return null;
		return CITY_ITEM_DATA[name] || { label: name, type: "misc", icon: null, effect: "", price: 0, stats: {} };
	};

	// Shop-Inventar aus JSON laden
	const cityShopItems = shopData.inventory;

	// Missionen aus JSON laden
	const cityMissions = missionsData.missions;

	const state = {
		mode: "game",
		started: false,
		paused: false,
		over: false,
		win: false,
		score: 0,
		coins: 0,
		hearts: 3,
		maxHearts: 5,
		level: 1,
		levelScore: 0,
		elapsed: 0,
		lastTick: performance.now(),
		frameDt: 16,
		player: {
			x: canvas.width * 0.28,
			y: canvas.height * 0.6,
			speed: 0.32,
			baseSpeed: 0.32,
			dir: 1,
			invulnFor: 0,
			shotCooldown: 0,
			energyMax: 100,
			energy: 100,
			energyCost: 35,
			energyRegenRate: 0.04,
			energyRegenDelay: 1200,
			energyRegenTimer: 0,
			perfumeSlowTimer: 0,
			shieldUnlocked: false,
			shieldActive: false,
			shieldTimer: 0,
			shieldCooldown: 0,
			shieldCooldownMax: SHIELD_COOLDOWN,
			shieldDuration: SHIELD_DURATION,
			shieldLastActivation: 0,
			shieldLastBlock: 0
		},
		boss: {
			x: canvas.width * 0.72,
			y: canvas.height * 0.32,
			speed: DEFAULT_BOSS_STATS.speed,
			dir: -1,
			active: false,
			pulse: 0,
			maxHp: DEFAULT_BOSS_STATS.maxHp,
			hp: DEFAULT_BOSS_STATS.maxHp,
			attackTimer: DEFAULT_BOSS_STATS.firstAttackDelay,
			lastAttack: null,
			finFlip: false,
			spriteKey: null,
			spriteScale: null,
			spriteOffsetX: null,
			spriteOffsetY: null,
			spriteFlip: true,
			shadowRadius: 48,
			shadowOffsetX: 16,
			shadowOffsetY: 52,
			entryTargetX: canvas.width * 0.72,
			entryTargetY: canvas.height * 0.48,
			entering: false,
			entryProgress: 0,
			entrySpeed: DEFAULT_BOSS_STATS.speed * 1.4,
			verticalTracking: 0.0024,
			verticalMin: canvas.height * 0.24,
			verticalMax: canvas.height * 0.68,
			verticalOffset: -canvas.height * 0.12,
			horizontalTracking: 0.0024,
			horizontalMin: canvas.width * 0.52,
			horizontalMax: canvas.width * 0.9,
			horizontalOffset: canvas.width * 0.12,
			horizontalOscAmp: canvas.width * 0.08,
			horizontalOscSpeed: 0.0026,
			horizontalForwardBoost: 2.2,
			horizontalBackBoost: 1.25,
			horizontalForwardBias: canvas.width * 0.1,
			horizontalEdgePad: null,
			oscPhase: 0
		},
		foes: [],
		foeSpawnTimer: 0,
		shots: [],
		bossTorpedoes: [],
		bossSweeps: [],
		bossWakeWaves: [],
		bossPerfumeOrbs: [],
		bossFragranceClouds: [],
		bossWhirlpools: [],
		bossKatapultShots: [],
		bossShockwaves: [],
		bossSpeedboats: [],
		bossCoinBursts: [],
		bossCoinExplosions: [],
		bossDiamondBeams: [],
		bossCardBoomerangs: [],
		bossTreasureWaves: [],
		bossCrownColumns: [],
		cashfishUltLock: 0,
		cashfishUltHistory: { tsunamiUsed: false, crownUsed: false },
		healPickups: [],
		healSpawnTimer: 9600,
		healBursts: [],
		symbolDrops: [],
		coinDrops: [],
		coralEffects: [],
		coralAllies: [],
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 14000,
			duration: 6000
		},
		tsunamiWave: null,
		tsunamiAbility: {
			unlocked: false,
			used: false,
			active: false
		},
		symbolInventory: { pferd: false, sprinter: false, yacht: false },
		pendingSymbolAdvance: null,
		eventFlash: null,
		foeArrows: [],
		unlockBossScore: 50,
		bubbles: [],
		coverRocks: [],
		coverRockSpawned: false,
		levelIndex: 0,
		levelConfig: null,
		foeSpawnInterval: { min: 1400, max: 2100 },
		city: null,
		armorShieldCharges: 0,
		// Progression-System (Level, XP, Talente)
		progression: createProgressionState()
	};

	// ============================================================
	// CITY UI - aus Modul initialisieren
	// ============================================================
	const cityUI = createCityUI({
		elements: {
			inventoryEl: cityInventoryEl,
			merchantEl: cityMerchantEl,
			missionEl: cityMissionEl,
			bannerEl
		},
		getState: () => state,
		getInventory: () => cityInventory,
		getItemData: getCityItemData,
		shopItems: cityShopItems,
		missions: cityMissions,
		onResetGame: () => resetGame(),
		onUpdateHUD: () => updateHUD(),
		armorItemName: ARMOR_ITEM_NAME
	});

	// FÃ¼r RÃ¼ckwÃ¤rtskompatibilitÃ¤t: Wrapper-Funktionen
	const syncCityInventoryVisibility = () => cityUI.syncInventoryVisibility();
	const syncCityShopVisibility = () => cityUI.syncShopVisibility();
	const syncCityMissionVisibility = () => cityUI.syncMissionVisibility();
	const updateCityInventoryUI = () => cityUI.updateInventoryUI();
	const updateCityShopUI = () => cityUI.updateShopUI();
	const updateCityMissionUI = () => cityUI.updateMissionUI();
	const tryAddCityItem = (itemName) => cityUI.tryAddItem(itemName);

	// cityInventoryOpen/cityShopOpen/cityMissionOpen als Getter/Setter
	const getCityInventoryOpen = () => cityUI.isInventoryOpen();
	const setCityInventoryOpen = (v) => cityUI.setInventoryOpen(v);
	const getCityShopOpen = () => cityUI.isShopOpen();
	const setCityShopOpen = (v) => cityUI.setShopOpen(v);
	const getCityMissionOpen = () => cityUI.isMissionOpen();
	const setCityMissionOpen = (v) => cityUI.setMissionOpen(v);

	// Event-Listener Ã¼ber das Modul einrichten
	cityUI.setupEventListeners();

	// Initial UI aktualisieren
	cityUI.updateAllUI();

	// ============================================================
	// PROGRESSION SYSTEM - Level, XP, Talente
	// ============================================================
	let talentTreeUI = null; // Forward declaration
	
	const progressionSystem = createProgressionSystem({
		state,
		player: state.player,
		triggerEventFlash: (type, opts) => triggerEventFlash(type, opts),
		onLevelUp: (newLevel, levelsGained) => {
			console.log(`Level Up! Neues Level: ${newLevel}, Skillpunkte: +${levelsGained}`);
			// HUD und TalentUI aktualisieren
			updateHUD();
			if (talentTreeUI) talentTreeUI.update();
		}
	});

	// Talentbaum UI
	talentTreeUI = createTalentTreeUI({
		canvas,
		state,
		progressionSystem
	});

	// Talenteffekte beim Start anwenden
	progressionSystem.applyTalentEffects();

	// ============================================================
	// UPGRADE SYSTEM - Spieler-Upgrades beim NPC
	// ============================================================
	const upgradeSystem = createUpgradeSystem({
		state,
		player: state.player
	});

	const upgradeUI = createUpgradeUI({
		canvas,
		state,
		upgradeSystem
	});

	// Upgrade-Effekte beim Start anwenden
	upgradeSystem.applyUpgradeEffects();

	// Keyboard-Handler fÃ¼r Talentbaum (U-Taste)
	function handleTalentTreeKeyDown(e) {
		const key = e.key;
		const code = e.code;
		if (KEY_TALENT_TREE.has(key) || CODE_TALENT_TREE.has(code)) {
			// Im Game- oder City-Modus, oder wenn Talentbaum offen ist
			if (state.mode === 'game' || state.mode === 'city' || state.progression.talentTreeOpen) {
				e.preventDefault();
				talentTreeUI.toggle();
				state.progression.talentTreeOpen = talentTreeUI.isVisible();
			}
		}
	}
	window.addEventListener('keydown', handleTalentTreeKeyDown);

	// DEBUG: Taste 9 = Level 4 + 3 Skillpunkte (zum Testen)
	function handleDebugCheat(e) {
		if (e.key === '9' && (state.mode === 'game' || state.mode === 'city')) {
			state.progression.level = 4;
			state.progression.skillPoints = (state.progression.skillPoints || 0) + 3;
			state.progression.xp = progressionSystem.getXPForLevel(4);
			// XP-Display manuell aktualisieren
			const levelEl = document.getElementById('player-level');
			const xpFillEl = document.getElementById('xp-fill');
			const skillpointsEl = document.getElementById('skillpoints-display');
			if (levelEl) levelEl.textContent = state.progression.level;
			if (xpFillEl) xpFillEl.style.width = '0%';
			if (skillpointsEl) skillpointsEl.textContent = state.progression.skillPoints;
			talentTreeUI.update();
			console.log('[DEBUG] Cheat aktiviert: Level 4, Skillpunkte:', state.progression.skillPoints);
		}
	}
	window.addEventListener('keydown', handleDebugCheat);

	// Click-Handler fÃ¼r XP-Anzeige
	const xpDisplayEl = document.querySelector('.xp-display');
	if (xpDisplayEl) {
		xpDisplayEl.addEventListener('click', () => {
			if (state.mode === 'game') {
				talentTreeUI.toggle();
				state.progression.talentTreeOpen = talentTreeUI.isVisible();
			}
		});
	}

	function seedBubbles() {
		const count = 24;
		state.bubbles = Array.from({ length: count }, () => ({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			r: Math.random() * 3 + 1.4,
			spd: Math.random() * 0.08 + 0.04
		}));
	}

	function spawnFoe(opts = {}) {
		const type = opts.type || "jelly";
		const baseY = opts.baseY == null ? canvas.height * 0.28 + Math.random() * canvas.height * 0.36 : opts.baseY;
		const entry = opts.entryX == null ? canvas.width + 320 : opts.entryX;
		const scale = opts.scale == null ? 0.7 + Math.random() * 0.3 : opts.scale;
		const foe = {
			type,
			x: entry,
			y: baseY,
			baseY,
			speed: opts.speed == null ? (type === "bogenschreck" ? 0.16 + Math.random() * 0.04 : 0.12 + Math.random() * 0.08) : opts.speed,
			sway: Math.random() * TAU,
			scale,
			dead: false
		};
		if (type === "bogenschreck") {
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.64 + Math.random() * 0.06) : opts.anchorX;
			foe.shootTimer = opts.shootTimer == null ? 1200 + Math.random() * 600 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 2400 + Math.random() * 900 : opts.shootCooldown;
			foe.hoverAmplitude = opts.hoverAmplitude == null ? 12 + Math.random() * 6 : opts.hoverAmplitude;
			foe.hoverPhase = Math.random() * TAU;
		} else if (type === "oktopus") {
			const minAnchorX = canvas.width * 0.5;
			const maxAnchorX = canvas.width * 0.8;
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			const initialAnchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const initialAnchorY = opts.anchorY == null ? foe.baseY : opts.anchorY;
			foe.anchorX = clamp(initialAnchorX, minAnchorX, maxAnchorX);
			foe.anchorY = clamp(initialAnchorY, minAnchorY, maxAnchorY);
			foe.shootTimer = opts.shootTimer == null ? 1600 + Math.random() * 380 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 3200 + Math.random() * 620 : opts.shootCooldown;
			foe.volleySpacing = opts.volleySpacing == null ? 260 : opts.volleySpacing;
			foe.burstCount = opts.burstCount == null ? (Math.random() < 0.6 ? 2 : 1) : opts.burstCount;
			foe.burstQueue = 0;
			foe.projectileSpeed = opts.projectileSpeed == null ? 0.38 + Math.random() * 0.04 : opts.projectileSpeed;
			foe.orbitAngle = opts.orbitAngle == null ? Math.random() * TAU : opts.orbitAngle;
			foe.orbitRadius = opts.orbitRadius == null ? 28 + Math.random() * 12 : opts.orbitRadius;
			foe.orbitVertical = opts.orbitVertical == null ? 32 + Math.random() * 14 : opts.orbitVertical;
			foe.orbitSpeed = opts.orbitSpeed == null ? 0.0014 + Math.random() * 0.0006 : opts.orbitSpeed;
			foe.dashDuration = opts.dashDuration == null ? 420 : opts.dashDuration;
			foe.dashDistance = opts.dashDistance == null ? 48 + Math.random() * 12 : opts.dashDistance;
			foe.dashDir = Math.random() < 0.5 ? -1 : 1;
			foe.dashTimer = 0;
			foe.laneShiftTimer = opts.laneShiftTimer == null ? 2400 + Math.random() * 600 : opts.laneShiftTimer;
			foe.laneShiftCooldown = opts.laneShiftCooldown == null ? 2400 + Math.random() * 600 : opts.laneShiftCooldown;
		} else if (type === "ritterfisch") {
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const rawAnchorY = opts.anchorY == null ? baseY + (Math.random() - 0.5) * canvas.height * 0.12 : opts.anchorY;
			foe.anchorY = clamp(rawAnchorY, minAnchorY, maxAnchorY);
			foe.patrolRange = opts.patrolRange == null ? 18 + Math.random() * 10 : opts.patrolRange;
			foe.chargeCooldown = opts.chargeCooldown == null ? 3200 + Math.random() * 600 : opts.chargeCooldown;
			foe.chargeTimer = opts.chargeTimer == null ? 1400 + Math.random() * 600 : opts.chargeTimer;
			foe.charging = false;
			foe.chargeDuration = 0;
			foe.recoverTimer = 0;
			foe.cruiseSpeed = opts.cruiseSpeed == null ? 0.18 + Math.random() * 0.04 : opts.cruiseSpeed;
			foe.chargeSpeed = opts.chargeSpeed == null ? 0.46 + Math.random() * 0.04 : opts.chargeSpeed;
			foe.speed = foe.cruiseSpeed;
		}
		state.foes.push(foe);
		return foe;
	}

	function primeFoes() {
		if (state.levelConfig && typeof state.levelConfig.initialSpawnDelay === "number") state.foeSpawnTimer = state.levelConfig.initialSpawnDelay;
		else scheduleNextFoeSpawn(true);
	}

	function getFoeHitbox(foe, opts = {}) {
		const forPlayer = !!opts.forPlayer;
		if (foe.type === "bogenschreck") {
			const width = forPlayer ? 52 : 44;
			const height = forPlayer ? 36 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "oktopus") {
			const width = forPlayer ? 54 : 46;
			const height = forPlayer ? 40 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "ritterfisch") {
			const width = forPlayer ? 48 : 40;
			const height = forPlayer ? 34 : 26;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		const width = forPlayer ? 42 : 36;
		const height = forPlayer ? 36 : 28;
		return { width: width * foe.scale, height: height * foe.scale };
	}

	function spawnHealPickup() {
		const baseY = canvas.height * 0.28 + Math.random() * canvas.height * 0.42;
		state.healPickups.push({
			x: canvas.width + 120,
			y: baseY,
			vx: 0.08 + Math.random() * 0.05,
			sway: Math.random() * TAU,
			scale: 0.9 + Math.random() * 0.2,
			life: 16000
		});
	}

		function spawnSymbolDrop(kind, opts = {}) {
			const config = SYMBOL_DATA[kind];
			if (!config) return null;
			const now = performance.now();
			const drop = {
				kind,
				x: opts.x == null ? canvas.width * 0.6 : opts.x,
				y: opts.y == null ? canvas.height * 0.5 : opts.y,
				vy: opts.vy == null ? 0.015 : opts.vy,
				sway: Math.random() * TAU,
				swaySpeed: opts.swaySpeed == null ? 0.0024 : opts.swaySpeed,
				amplitude: opts.amplitude == null ? 10 : opts.amplitude,
				scale: opts.scale == null ? 0.26 : opts.scale,
				life: SYMBOL_AUTOCOLLECT_MS,
				spawnTime: now,
				collected: false,
				autoCollected: false,
				cleanupTimer: null
			};
			state.symbolDrops.push(drop);
			return drop;
		}

		function spawnCoinDrop(opts = {}) {
			const initialY = opts.y == null ? canvas.height * 0.5 : opts.y;
			const hoverBandTop = canvas.height * 0.34;
			const hoverBandBottom = canvas.height * 0.68;
			const targetHoverY = clamp(opts.hoverY == null ? initialY : opts.hoverY, hoverBandTop, hoverBandBottom);
			const baseScroll = opts.scrollSpeed == null ? 0.24 + Math.random() * 0.14 : Math.abs(opts.scrollSpeed);
			const drop = {
				x: opts.x == null ? canvas.width * 0.6 : opts.x,
				y: initialY,
				vx: opts.vx == null ? -baseScroll : -Math.abs(opts.vx),
				vy: opts.vy == null ? 0 : opts.vy,
				gravity: opts.gravity == null ? 0.0007 : opts.gravity,
				spin: Math.random() * TAU,
				spinSpeed: opts.spinSpeed == null ? 0.005 + Math.random() * 0.003 : opts.spinSpeed,
				value: Math.max(1, opts.value == null ? 1 : opts.value),
				life: opts.life == null ? 12000 : opts.life,
				collectDuration: opts.collectDuration == null ? 420 : opts.collectDuration,
				collectTimer: 0,
				collected: false,
				dead: false,
				scale: opts.scale == null ? 0.95 + Math.random() * 0.15 : opts.scale,
				hoverY: targetHoverY,
				hoverAmplitude: opts.hoverAmplitude == null ? 24 + Math.random() * 10 : opts.hoverAmplitude,
				hoverPhase: Math.random() * TAU,
				hoverSpeed: opts.hoverSpeed == null ? 0.002 + Math.random() * 0.0012 : opts.hoverSpeed,
				hoverFollow: opts.hoverFollow == null ? 0.0042 : opts.hoverFollow,
				scrollSpeed: baseScroll
			};
			state.coinDrops.push(drop);
			return drop;
		}

		function showPickupMessage(text, duration = 2000) {
			if (!pickupMsg) return;
			pickupMsg.textContent = text;
			pickupMsg.style.display = "block";
			if (pickupHideTimer != null) clearTimeout(pickupHideTimer);
			pickupHideTimer = window.setTimeout(() => {
				if (pickupMsg) pickupMsg.style.display = "none";
				pickupHideTimer = null;
			}, duration);
		}

		function hidePickupMessage() {
			if (pickupHideTimer != null) {
				clearTimeout(pickupHideTimer);
				pickupHideTimer = null;
			}
			if (pickupMsg) pickupMsg.style.display = "none";
		}

		function unlockShieldIfNeeded() {
			if (state.player.shieldUnlocked || state.levelIndex !== 0) return;
			state.player.shieldUnlocked = true;
			state.player.shieldCooldown = 0;
			state.player.shieldActive = false;
			state.player.shieldTimer = 0;
			state.player.shieldLastActivation = 0;
			state.player.shieldLastBlock = 0;
			triggerEventFlash("unlock", { text: "Neue FÃ¤higkeit: Schutzschild", duration: 1500, opacity: 0.86 });
			updateHUD();
		}

		function concludeBossVictory(nextLevelIndex) {
			if (nextLevelIndex < getLevelConfigsLength()) {
				advanceLevel(nextLevelIndex, { skipFlash: false, invulnDuration: 1800 });
				return;
			}
			enterCity();
		}

		function finishPendingSymbolAdvance() {
			const pending = state.pendingSymbolAdvance;
			if (!pending) return;
			const nextLevelIndex = pending.nextLevelIndex;
			state.pendingSymbolAdvance = null;
			concludeBossVictory(nextLevelIndex);
		}

		function collectSymbolDrop(drop, opts = {}) {
			if (!drop || drop.collected) return;
			drop.collected = true;
			drop.autoCollected = !!opts.auto;
			drop.cleanupTimer = 420;
			drop.life = 0;
			const { kind } = drop;
			const config = SYMBOL_DATA[kind];
			if (!state.symbolInventory[kind]) {
				state.symbolInventory[kind] = true;
			}
			const label = config ? config.label : "Symbol";
			if (!opts.silent) {
				const autoSuffix = drop.autoCollected ? " (automatisch)" : "";
				showPickupMessage(`${label} gesichert${autoSuffix}!`, drop.autoCollected ? 1600 : 2200);
			}
			updateHUD();
			if (state.pendingSymbolAdvance && state.pendingSymbolAdvance.symbol === kind) {
				finishPendingSymbolAdvance();
			}
		}

	function getCoinValueForFoe(foe) {
		if (!foe) return 1;
		if (foe.type === "oktopus") return 3;
		if (foe.type === "bogenschreck" || foe.type === "ritterfisch") return 2;
		return 1;
	}

	function collectCoinDrop(drop) {
		if (!drop || drop.collected) return;
		drop.collected = true;
		drop.collectTimer = drop.collectDuration;
		drop.vx = 0;
		drop.vy = -0.05;
		const value = drop.value == null ? 1 : drop.value;
		state.coins += value;
		state.score += value;
		updateHUD();
	}

	function spawnCoverRock(opts = {}) {
		const sprite = SPRITES.coverRock;
		const scale = opts.scale == null ? 0.52 : opts.scale;
		const spriteWidth = spriteReady(sprite) ? sprite.naturalWidth : 540;
		const spriteHeight = spriteReady(sprite) ? sprite.naturalHeight : 420;
		const width = (opts.width == null ? spriteWidth : opts.width) * scale;
		const height = (opts.height == null ? spriteHeight : opts.height) * scale;
		const radiusX = (opts.radiusX == null ? width * 0.45 : opts.radiusX);
		const radiusY = (opts.radiusY == null ? height * 0.4 : opts.radiusY);
		const padX = opts.padX == null ? 0 : opts.padX;
		const padY = opts.padY == null ? 0 : opts.padY;
		const padLeft = opts.padLeft == null ? null : opts.padLeft;
		const padRight = opts.padRight == null ? null : opts.padRight;
		const padTop = opts.padTop == null ? null : opts.padTop;
		const padBottom = opts.padBottom == null ? null : opts.padBottom;
		let groundLine = opts.groundLine == null ? canvas.height - 12 : opts.groundLine;
		if (opts.groundLine == null && state.levelIndex === 2) {
			const levelGround = getLevel3GroundLine();
			if (levelGround != null) groundLine = levelGround;
		}
		const minY = canvas.height * 0.22;
		const maxY = Math.max(minY, groundLine - radiusY);
		const targetY = clamp(groundLine - radiusY, minY, maxY);
		const rock = {
			x: clamp(opts.x == null ? canvas.width * 0.5 : opts.x, canvas.width * 0.24, canvas.width * 0.76),
			y: opts.startY == null ? -height : opts.startY,
			radiusX,
			radiusY,
			width,
			height,
			scale,
			padX,
			padY,
			padLeft,
			padRight,
			padTop,
			padBottom,
			collisionOffsetX: opts.collisionOffsetX == null ? 0 : opts.collisionOffsetX,
			collisionOffsetY: opts.collisionOffsetY == null ? 0 : opts.collisionOffsetY,
			vy: 0,
			gravity: opts.gravity == null ? 0.0011 : opts.gravity,
			maxFallSpeed: opts.maxFallSpeed == null ? 0.68 : opts.maxFallSpeed,
			delay: opts.delay == null ? 620 : Math.max(0, opts.delay),
			groundLine,
			targetY,
			landed: false,
			impactTimer: 0,
			damageCooldown: 0,
			hitPulse: 0
		};
		if (spriteReady(sprite)) {
			rock.collisionMask = getCoverRockCollisionMask(sprite, width, height);
		}
		state.coverRocks.push(rock);
		return rock;
	}

	function maybeSpawnLevelThreeCoverRock() {
		if (state.coverRockSpawned) return;
		if ((state.level || 1) !== 3) return;
		if (state.pendingSymbolAdvance) return;
		const threshold = (state.unlockBossScore || 0) * 0.5;
		if (state.levelScore < threshold) return;
		state.coverRockSpawned = true;
		const rock = spawnCoverRock({ x: canvas.width * 0.5 });
		if (rock) {
			triggerEventFlash("cover", { text: "Felsbrocken fÃ¤llt!", duration: 1100, opacity: 0.75 });
		}
	}

	function triggerEventFlash(kind, opts = {}) {
		const now = performance.now();
		const duration = opts.duration == null ? 1600 : opts.duration;
		state.eventFlash = {
			kind,
			started: now,
			duration,
			opacity: opts.opacity == null ? 0.9 : opts.opacity,
			text: opts.text || null
		};
	}

	// ============================================================
	// LEVEL CONFIGURATIONS
	// Die Level-Daten sind auch als JSON in src/data/levels/ gespeichert
	// fÃ¼r zukÃ¼nftige Erweiterungen mit einem Build-System (Vite)
	// ============================================================
	// ============================================================
	// LEVEL_CONFIGS ausgelagert nach src/game/levels.js
	// Wrapper-Funktionen delegieren ans levels-Modul
	// ============================================================

	// Getter fÃ¼r LEVEL_CONFIGS.length (wird vom levels-Modul bereitgestellt)
	function getLevelConfigsLength() {
		return levels.getLevelConfigsLength();
	}

	function getLevelConfig(index) {
		return levels.getLevelConfig(index);
	}

	function scheduleNextFoeSpawn(initial = false) {
		const interval = state.foeSpawnInterval || { min: 1400, max: 2100 };
		const minDelay = interval.min == null ? 1400 : interval.min;
		const maxDelay = interval.max == null ? minDelay + 600 : interval.max;
		const span = Math.max(0, maxDelay - minDelay);
		const delay = minDelay + Math.random() * span;
		state.foeSpawnTimer = initial ? Math.min(delay, 520) : delay;
	}

	function spawnLevelFoe() {
		const config = state.levelConfig;
		if (!config || !Array.isArray(config.spawnTable) || config.spawnTable.length === 0) {
			return spawnFoe();
		}
		const totalWeight = config.spawnTable.reduce((sum, entry) => sum + (entry.weight == null ? 1 : entry.weight), 0);
		let roll = Math.random() * (totalWeight || 1);
		for (const entry of config.spawnTable) {
			const weight = entry.weight == null ? 1 : entry.weight;
			roll -= weight;
			if (roll <= 0) {
				if (typeof entry.spawn === "function") return entry.spawn();
				const opts = typeof entry.options === "function" ? entry.options() : entry.options || {};
				return spawnFoe({ type: entry.type, ...(opts || {}) });
			}
		}
		const fallback = config.spawnTable[config.spawnTable.length - 1];
		if (fallback) {
			const opts = typeof fallback.options === "function" ? fallback.options() : fallback.options || {};
			return spawnFoe({ type: fallback.type, ...(opts || {}) });
		}
		return spawnFoe();
	}

	function applyLevelConfig(index, opts = {}) {
		return levels.applyLevelConfig(index, opts);
	}

	function advanceLevel(nextIndex, opts = {}) {
		// Level-Assets vorladen (non-blocking)
		ManifestAssets.preloadForLevel(nextIndex).catch(err => {
			console.warn("[Cashfisch] Level-Preload Warnung:", err);
		});
		
		const result = levels.advanceLevel(nextIndex, opts);
		// Talent-Effekte nach Level-Start anwenden
		progressionSystem.applyTalentEffects();
		return result;
	}

	function debugJumpToLevel(targetIndex, options = {}) {
		if (!DEBUG_SHORTCUTS) return;
		const skipToBoss = options.skipToBoss === true;
		const levelIndex = Math.max(0, Math.min(getLevelConfigsLength() - 1, targetIndex | 0));
		resetGame();
		state.eventFlash = null;
		advanceLevel(levelIndex, { skipFlash: true, healHeart: false, invulnDuration: 800 });
		state.levelScore = 0;
		state.elapsed = 0;
		if (levelIndex >= 1) {
			state.player.shieldUnlocked = true;
			state.player.shieldActive = false;
			state.player.shieldTimer = 0;
			state.player.shieldCooldown = 0;
			state.player.shieldLastActivation = 0;
			state.player.shieldLastBlock = 0;
		}
		// Boss-Test-Modus: Direkt zum Boss springen
		if (skipToBoss) {
			state.levelScore = state.unlockBossScore;
			activateBoss();
		}
		updateHUD();
		if (bannerEl && state.levelConfig && state.levelConfig.banner) bannerEl.textContent = state.levelConfig.banner;
		const label = skipToBoss ? `Debug: Level ${state.level} (BOSS)` : `Debug: Level ${state.level}`;
		triggerEventFlash("debug", { text: label, duration: 1000, opacity: 0.52 });
	}

	// ============================================================
	// Boss-Spawn-Funktionen ausgelagert nach src/boss/spawn.js
	// ============================================================

	// renderFoeArrows ausgelagert nach src/foes/render.js

	// ============================================================
	// Weitere Boss-Spawn-Funktionen ausgelagert nach src/boss/spawn.js
	// (spawnBossFinSweep, spawnFragranceCloud, spawnBossPerfumeVolley, spawnBossFragranceWave)
	// ============================================================

	// spawnOktopusBolt und spawnBogenschreckArrow â†’ ausgelagert nach src/foes/arrows.js
	// Werden Ã¼ber foeArrows.spawnOktopusBolt() und foeArrows.spawnBogenschreckArrow() aufgerufen

	// playerShoot ist jetzt in src/player/update.js ausgelagert

	function hasKey(keySet) {
		for (const key of keySet) {
			if (keys.has(key)) return true;
		}
		return false;
	}

	function isShieldActivationKey(event) {
		if (!event) return false;
		if (KEY_SHIELD.has(event.key)) return true;
		return CODE_SHIELD.has(event.code || "");
	}

	function isCoralActivationKey(event) {
		if (!event) return false;
		if (KEY_CORAL.has(event.key)) return true;
		return CODE_CORAL.has(event.code || "");
	}

	function isTsunamiActivationKey(event) {
		if (!event) return false;
		if (KEY_TSUNAMI.has(event.key)) return true;
		return CODE_TSUNAMI.has(event.code || "");
	}

	function isCityShortcut(event) {
		if (!event) return false;
		const isFive = event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
		if (!isFive) return false;
		if (event.altKey && event.shiftKey) return true;
		if (event.ctrlKey || event.metaKey) return false;
		return state.mode !== "city";
	}

	function isCityShortcutCandidate(event) {
		if (!event) return false;
		return event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
	}

	// Context fÃ¼r Stadt-State-Erstellung
	const cityStateCtx = {
		get canvas() { return canvas; },
		cityData
	};

	function buildCityState() {
		return buildCityStateModule(cityStateCtx);
	}

	function enterCity() {
		// City-Assets vorladen (non-blocking)
		ManifestAssets.preloadForScene("city").catch(err => {
			console.warn("[Cashfisch] City-Preload Warnung:", err);
		});
		
		state.mode = "city";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.level = 5;
		state.levelIndex = getLevelConfigsLength();
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.eventFlash = null;
		state.pendingSymbolAdvance = null;
		state.city = buildCityState();
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.boss.active = false;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossSpeedboats.length = 0;
		state.tsunamiWave = null;
		state.eventFlash = null;
		pointer.shoot = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		cityUI.reset();
		if (bannerEl) bannerEl.textContent = "Unterwasserstadt";
		if (endOverlay) endOverlay.style.display = "none";
		const gameWrap = document.getElementById("gameWrap");
		const startScreen = document.getElementById("startScreen");
		const cutWrap = document.getElementById("cutWrap");
		if (gameWrap) gameWrap.style.display = "block";
		if (startScreen) startScreen.style.display = "none";
		if (cutWrap) cutWrap.style.display = "none";
		controlsArmed = true;
		updateHUD();
	}

	function resetGame() {
		state.mode = "game";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.score = 0;
		state.coins = 0;
		state.hearts = 3;
		state.levelIndex = 0;
		state.levelScore = 0;
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;
		state.player.shieldUnlocked = false;
		state.player.shieldActive = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		cityUI.reset();
		state.player.shieldTimer = 0;
		state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = 0;
		state.player.shotCooldown = 0;
		state.boss.entryTargetX = canvas.width * 0.72;
		state.boss.entryTargetY = canvas.height * 0.48;
		state.boss.x = state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY;
		state.boss.dir = -1;
		state.boss.active = false;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.unlocked = false;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.coralAbility.cooldown = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.unlocked = false;
		state.tsunamiAbility.used = false;
		state.tsunamiAbility.active = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bubbles.length = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.city = null;
		applyLevelConfig(0, { skipFlash: false });
		state.boss.x = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.dir = -1;
		primeFoes();
		seedBubbles();
		updateHUD();
		hidePickupMessage();
		if (endOverlay) endOverlay.style.display = "none";
		controlsArmed = true;
	}

	function showGameOver(titleText) {
		state.over = true;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.healPickups.length = 0;
		state.eventFlash = null;
		state.healBursts.length = 0;
		state.healBursts.length = 0;
		state.foeArrows.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		state.player.shieldLastBlock = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.pendingSymbolAdvance = null;
		if (endOverlay) endOverlay.style.display = "flex";
		if (endTitle) endTitle.textContent = titleText || "Danke fÃ¼rs Spielen!";
		hidePickupMessage();
	}

	function winGame() {
		if (state.over) return;
		const currentLevelIndex = state.levelIndex || 0;
		const nextLevelIndex = currentLevelIndex + 1;
		const symbolKind = LEVEL_SYMBOL_SEQUENCE[currentLevelIndex];
		state.boss.active = false;
		state.boss.hp = 0;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossShockwaves.length = 0;
		state.bossSpeedboats.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		hidePickupMessage();
		unlockShieldIfNeeded();
		if (symbolKind && !state.symbolInventory[symbolKind]) {
			const dropX = clamp(state.boss.x, canvas.width * 0.32, canvas.width * 0.78);
			const dropY = Math.min(canvas.height * 0.74, state.boss.y + 120);
			const drop = spawnSymbolDrop(symbolKind, { x: dropX, y: dropY });
			state.pendingSymbolAdvance = { symbol: symbolKind, nextLevelIndex };
			const config = SYMBOL_DATA[symbolKind];
			const label = config ? config.label : "Symbol";
			if (drop) {
				triggerEventFlash("symbol", { text: `${label} gefallen!`, duration: 1400, opacity: 0.8 });
				showPickupMessage(`${label} aufnehmen!`, 2600);
				if (bannerEl) bannerEl.textContent = "Symbol einsammeln!";
			} else {
				state.symbolInventory[symbolKind] = true;
				updateHUD();
				finishPendingSymbolAdvance();
			}
			return;
		}
		concludeBossVictory(nextLevelIndex);
	}

	function activateBoss() {
		state.boss.active = true;
		const targetX = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		const targetY = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		const caveEntry = (state.level || 1) === 1;
		if (caveEntry) {
			const startX = canvas.width + Math.max(140, canvas.width * 0.12);
			const startY = Math.min(canvas.height * 0.68, targetY + canvas.height * 0.26);
			state.boss.x = startX;
			state.boss.y = startY;
			state.boss.entering = true;
			state.boss.entryProgress = 0;
			state.boss.entrySpeed = state.boss.entrySpeed == null ? Math.max(0.24, state.boss.speed * 1.25) : state.boss.entrySpeed;
		} else {
			state.boss.x = targetX;
			state.boss.y = targetY;
			state.boss.entering = false;
			state.boss.entryProgress = 1;
		}
		state.boss.oscPhase = 0;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.hp = state.boss.maxHp;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		state.boss.attackTimer = bossCfg && bossCfg.firstAttackDelay != null ? bossCfg.firstAttackDelay : 1600;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		if (bannerEl) bannerEl.textContent = "Bosskampf! Besiege die Bedrohung";
	}

	function updateHUD() {
		if (hudScore) hudScore.textContent = state.score.toString();
		if (hudCoins) hudCoins.textContent = state.coins.toString();
		if (hudLevel) hudLevel.textContent = state.level.toString();
		if (hudHearts) hudHearts.textContent = "â¤".repeat(state.hearts);
		if (hudTime) hudTime.textContent = (state.elapsed / 1000).toFixed(1);
		if (bannerEl && state.boss.active) bannerEl.textContent = `Bosskampf â€“ HP ${state.boss.hp}/${state.boss.maxHp}`;
		if (hudShield) {
			const player = state.player;
			const unlocked = !!player.shieldUnlocked;
			hudShield.classList.toggle("locked", !unlocked);
			hudShield.classList.toggle("active", unlocked && player.shieldActive);
			hudShield.classList.toggle("ready", unlocked && !player.shieldActive && player.shieldCooldown <= 0);
			hudShield.classList.toggle("cooldown", unlocked && !player.shieldActive && player.shieldCooldown > 0);
			if (unlocked && !player.shieldActive && player.shieldCooldown > 0) {
				const seconds = Math.ceil(player.shieldCooldown / 1000);
				hudShield.textContent = seconds.toString();
			} else {
				hudShield.textContent = "ðŸ›¡";
			}
			if (!unlocked) hudShield.title = "Schild (Shift/E) â€“ besiege Boss 1";
			else if (player.shieldActive) hudShield.title = "Schild aktiv";
			else if (player.shieldCooldown > 0) hudShield.title = `Schild lÃ¤dt (${Math.ceil(player.shieldCooldown / 1000)}s)`;
			else hudShield.title = "Schild bereit (Shift/E)";
		}
		if (hudArmor) {
			const armorEquipped = cityInventory.equipment.armor === ARMOR_ITEM_NAME;
			const armorReady = armorEquipped && state.armorShieldCharges > 0 && state.mode === "game";
			hudArmor.classList.toggle("active", armorReady);
			hudArmor.classList.toggle("inactive", !armorReady);
			hudArmor.style.display = armorEquipped ? "inline-flex" : "none";
			hudArmor.title = armorEquipped ? (armorReady ? "RÃ¼stung aktiv â€“ nÃ¤chster Treffer wird neutralisiert" : "RÃ¼stung verbraucht (lÃ¤dt in der Stadt)") : "";
		}
		if (hudSymbols) {
			for (const [kind, el] of Object.entries(hudSymbols)) {
				if (!el) continue;
				const owned = !!(state.symbolInventory && state.symbolInventory[kind]);
				el.classList.toggle("owned", owned);
				const config = SYMBOL_DATA[kind];
				if (owned && config && config.asset) {
					el.style.backgroundImage = `url("${config.asset}")`;
				} else {
					el.style.backgroundImage = "none";
				}
			}
		}
		
		// Progression HUD aktualisieren
		if (hudPlayerLevel) {
			hudPlayerLevel.textContent = state.progression.level.toString();
		}
		if (hudXpBarFill) {
			const progress = progressionSystem.getLevelProgress() * 100;
			hudXpBarFill.style.width = `${progress}%`;
		}
		if (hudSkillPoints && hudSkillPointsNum) {
			const sp = state.progression.skillPoints;
			if (sp > 0) {
				hudSkillPoints.style.display = 'inline';
				hudSkillPointsNum.textContent = sp.toString();
			} else {
				hudSkillPoints.style.display = 'none';
			}
		}
	}

	// updatePlayer ist jetzt in src/player/update.js ausgelagert

	// City Update Context - fÃ¼r das ausgelagerte Modul
	const cityUpdateCtx = {
		getState: () => state,
		hasKey,
		keys: {
			left: KEY_LEFT,
			right: KEY_RIGHT,
			up: KEY_UP,
			down: KEY_DOWN
		}
	};

	// Wrapper fÃ¼r updateCity - nutzt das importierte Modul
	function updateCity(dt) {
		updateCityModule(cityUpdateCtx, dt);
	}

	// Cover-Rock-Funktionen - delegieren an das Cover-Rock-Modul (Wrapper fÃ¼r Hoisting)
	function isPointInsideCover(rock, x, y, padX = 0, padY = 0) {
		return coverRocks.isPointInsideCover(rock, x, y, padX, padY);
	}
	function computeCoverSurfaceNormal(rock, x, y) {
		return coverRocks.computeCoverSurfaceNormal(rock, x, y);
	}
	function resolveCoverCollisionForPoint(rock, currX, currY, prevX, prevY) {
		return coverRocks.resolveCoverCollisionForPoint(rock, currX, currY, prevX, prevY);
	}
	function applyCoverAvoidance(entity, opts = {}) {
		return coverRocks.applyCoverAvoidance(entity, opts);
	}
	function processCoverDetour(entity, dt, bounds = {}) {
		return coverRocks.processCoverDetour(entity, dt, bounds);
	}
	function getRitterfischLaneTarget(foe, rock, minY, maxY) {
		return coverRocks.getRitterfischLaneTarget(foe, rock, minY, maxY);
	}
	function resolvePlayerCoverCollision(player, prevX, prevY) {
		return coverRocks.resolvePlayerCoverCollision(player, prevX, prevY);
	}
	function resolveFoeCoverCollision(foe, prevX, prevY) {
		return coverRocks.resolveFoeCoverCollision(foe, prevX, prevY);
	}
	function findCoverRockHit(x, y, padX = 0, padY = 0) {
		return coverRocks.findCoverRockHit(x, y, padX, padY);
	}
	function registerCoverRockImpact(rock, strength = 1) {
		return coverRocks.registerCoverRockImpact(rock, strength);
	}

	// updateBubbles ist jetzt in src/game/pickups.js
	// updateCoverRocks ist jetzt in src/game/coverRocks.js

	function update(dt) {
		state.frameDt = dt;
		
		// Spatial Grid: Alle Grids aktualisieren fÃ¼r effiziente Kollisionserkennung
		updateAllGrids(state);
		
		playerUpdater.updatePlayer(dt);
		abilities.updateCoralAllies(dt);
		pickups.updateCoralEffects(dt);
		pickups.updateBubbles(dt);
		coverRocks.updateCoverRocks(dt);
		foeUpdater.updateFoes(dt);
		playerUpdater.updateShots(dt);
		foeArrows.updateFoeArrows(dt);
		pickups.updateHealPickups(dt);
		pickups.updateSymbolDrops(dt);
		pickups.updateCoinDrops(dt);
		abilities.updateTsunamiWave(dt);
		bossUpdater.updateBoss(dt);
		bossUpdater.updateBossAttacks(dt);
		foeCollision.handleShotFoeHits();
		foeCollision.handleShotFoeArrowHits();
		foeCollision.handleShotTorpedoHits();
		bossCollision.handleShotBossHits();
		foeCollision.handlePlayerFoeCollisions();
		foeCollision.handlePlayerFoeArrowCollisions();
		bossCollision.handlePlayerTorpedoCollisions();
		bossCollision.handlePlayerFinSweepCollisions();
		bossCollision.handlePlayerWakeWaveCollisions();
		bossCollision.handlePlayerWhirlpoolEffects();
		bossCollision.handlePlayerCoinExplosions();
		bossCollision.handlePlayerDiamondBeams();
		bossCollision.handlePlayerTreasureWaves();
		bossCollision.handlePlayerCardBoomerangs();
		bossCollision.handlePlayerCrownColumns();
		bossCollision.handlePlayerKatapultCollisions();
		bossCollision.handlePlayerShockwaveCollisions();
		bossCollision.handlePlayerSpeedboatCollisions();
		bossCollision.handlePlayerPerfumeOrbCollisions();
		bossCollision.handlePlayerFragranceCloudCollisions();
		foeCollision.handlePlayerHealPickups();
		foeCollision.handlePlayerCoinDrops();
		foeCollision.handlePlayerSymbolDrops();
		bossCollision.handlePlayerBossCollision();
		maybeSpawnLevelThreeCoverRock();
		state.elapsed += dt;
	}

	// ============================================================
	// updateBoss ausgelagert nach src/boss/update.js
	// updateFoes ausgelagert nach src/foes/update.js
	// updateShots ist jetzt in src/player/update.js ausgelagert
	// ============================================================

	// updateFoeArrows ausgelagert nach src/foes/arrows.js
	// updateHealPickups, updateCoralEffects, updateSymbolDrops, updateCoinDrops
	// sind jetzt in src/game/pickups.js ausgelagert

	// ============================================================
	// updateBossAttacks ausgelagert nach src/boss/update.js
	// ============================================================

	function damagePlayer(amount = 1) {
		const player = state.player;
		if (player.shieldActive) {
			const now = performance.now();
			player.shieldTimer = Math.max(0, player.shieldTimer - 600);
			player.shieldLastBlock = now;
			return;
		}
		if (state.mode === "game" && cityInventory.equipment.armor === ARMOR_ITEM_NAME && state.armorShieldCharges > 0) {
			state.armorShieldCharges = 0;
			triggerEventFlash("armorBlock", { text: "RÃ¼stung schÃ¼tzt!", duration: 1200, opacity: 0.9 });
			updateHUD();
			return;
		}
		if (player.invulnFor > 0) return;
		state.hearts = Math.max(0, state.hearts - amount);
		player.invulnFor = 1400;
		triggerEventFlash("playerDamage", { text: "-1 Herz", duration: 1500, opacity: 0.8 });
		if (state.hearts <= 0) showGameOver("Du wurdest besiegt!");
	}

	function awardFoeDefeat(foe) {
		if (!foe) return;
		const bonus = foe.type === "bogenschreck" ? 3 : foe.type === "oktopus" ? 2 : 0;
		const reward = FOE_BASE_SCORE + bonus;
		state.score += reward;
		state.levelScore += reward;
		spawnCoinDrop({ x: foe.x, y: foe.y, value: getCoinValueForFoe(foe) });
		
		// XP fÃ¼r besiegten Gegner vergeben
		const xpGained = progressionSystem.awardXP(foe.type || 'default');
		
		if (!state.boss.active && state.levelScore >= state.unlockBossScore && bannerEl) {
			bannerEl.textContent = "Boss wittert deine PrÃ¤senz...";
		}
	}

	// ============================================================
	// Foe/Pickup Collision-Handler ausgelagert nach src/foes/collision.js
	// handleShotFoeHits, handleShotFoeArrowHits, handleShotTorpedoHits
	// handlePlayerFoeCollisions, handlePlayerFoeArrowCollisions
	// handlePlayerHealPickups, handlePlayerCoinDrops, handlePlayerSymbolDrops
	// ============================================================

	// handleShotBossHits ausgelagert nach src/boss/collision.js
	// handlePlayerTorpedoCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerFinSweepCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerWakeWaveCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerWhirlpoolEffects ausgelagert nach src/boss/collision.js
	// handlePlayerCoinExplosions ausgelagert nach src/boss/collision.js
	// handlePlayerDiamondBeams ausgelagert nach src/boss/collision.js
	// handlePlayerTreasureWaves ausgelagert nach src/boss/collision.js
	// handlePlayerCardBoomerangs ausgelagert nach src/boss/collision.js
	// handlePlayerCrownColumns ausgelagert nach src/boss/collision.js
	// handlePlayerKatapultCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerShockwaveCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerSpeedboatCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerPerfumeOrbCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerFragranceCloudCollisions ausgelagert nach src/boss/collision.js
	// handlePlayerBossCollision ausgelagert nach src/boss/collision.js

	// renderBackground, renderBubbles, renderFloorOverlay, renderCoverRocks, renderTsunamiWave
	// sind jetzt in src/game/background.js ausgelagert

	// renderHeals, renderCoralEffects, renderCoralAllies, renderCoinDrops, renderHealBursts,
	// renderSymbolDrops, renderDebugLabel, renderPlayer, renderShots, renderEventFlash
	// sind jetzt in src/game/render.js ausgelagert

	// Boss-Render-Funktionen sind jetzt in boss/render.js ausgelagert

	// renderFoes ausgelagert nach src/foes/render.js

	// renderBossHpBar ausgelagert nach src/boss/ui.js

	// renderBoss ausgelagert nach src/boss/ui.js

	// Context-Objekt fÃ¼r das Render-Modul
	const cityRenderCtx = {
		get ctx() { return ctx; },
		get canvas() { return canvas; },
		get city() { return state.city; },
		get sprites() { 
			return {
				player: SPRITES.player,
				cityBackground: SPRITES.cityBackground,
				npcHaendler: SPRITES.npcHaendler,
				npcMission: SPRITES.npcMission
			};
		},
		syncVisibility: () => {
			syncCityInventoryVisibility();
			syncCityShopVisibility();
			syncCityMissionVisibility();
		},
		get citySpriteDebugPanel() { return citySpriteDebugPanel; }
	};

	// Context-Objekt fÃ¼r das Game-Render-Modul
	const gameRenderCtx = {
		getCtx: () => ctx,
		getCanvas: () => canvas,
		getState: () => state,
		SPRITES,
		MODELS,
		SYMBOL_DATA,
		spriteReady,
		getHealSprite,
		SHIELD_DURATION,
		SYMBOL_AUTOCOLLECT_MS,
		DEBUG_BUILD_LABEL
	};
	const gameRenderer = createGameRenderSystem(gameRenderCtx);

	// Context-Objekt fÃ¼r das Boss-Render-Modul
	const bossRenderCtx = {
		get ctx() { return ctx; },
		get canvas() { return canvas; },
		get state() { return state; }
	};
	const bossRenderer = createBossRenderSystem(bossRenderCtx);

	// Context-Objekt fÃ¼r das Boss-Spawn-Modul
	const bossSpawnCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		findCoverRockHit,
		registerCoverRockImpact,
		triggerEventFlash
	};
	const bossSpawner = createBossSpawnSystem(bossSpawnCtx);

	// Context-Objekt fÃ¼r das Boss-Update-Modul
	const bossUpdateCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		getSPRITES: () => SPRITES,
		spriteReady,
		activateBoss,
		applyCoverAvoidance,
		processCoverDetour,
		findCoverRockHit,
		registerCoverRockImpact,
		// Spawn-Funktionen aus dem Spawn-Modul
		spawnBossTorpedoBurst: () => bossSpawner.spawnBossTorpedoBurst(),
		spawnBossFinSweep: () => bossSpawner.spawnBossFinSweep(),
		spawnBossPerfumeVolley: () => bossSpawner.spawnBossPerfumeVolley(),
		spawnBossFragranceWave: () => bossSpawner.spawnBossFragranceWave(),
		spawnYachtwalHarborSog: () => bossSpawner.spawnYachtwalHarborSog(),
		spawnYachtwalKielwasserKatapult: () => bossSpawner.spawnYachtwalKielwasserKatapult(),
		spawnYachtwalAnchorDonner: () => bossSpawner.spawnYachtwalAnchorDonner(),
		spawnYachtwalRegattaRaserei: () => bossSpawner.spawnYachtwalRegattaRaserei(),
		spawnCashfishCoinSalvo: () => bossSpawner.spawnCashfishCoinSalvo(),
		spawnCashfishDiamondLattice: () => bossSpawner.spawnCashfishDiamondLattice(),
		spawnCashfishTreasureTsunami: () => bossSpawner.spawnCashfishTreasureTsunami(),
		spawnCashfishCrownFinale: () => bossSpawner.spawnCashfishCrownFinale(),
		spawnCashfishCardShock: () => bossSpawner.spawnCashfishCardShock(),
		spawnFragranceCloud: (x, y, opts) => bossSpawner.spawnFragranceCloud(x, y, opts)
	};
	const bossUpdater = createBossUpdateSystem(bossUpdateCtx);

	// Context-Objekt fÃ¼r das Boss-Collision-Modul
	const bossCollisionCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		damagePlayer,
		winGame,
		updateBannerEl: text => { if (bannerEl) bannerEl.textContent = text; },
		spawnFragranceCloud: (x, y, opts) => bossSpawner.spawnFragranceCloud(x, y, opts)
	};
	const bossCollision = createBossCollisionSystem(bossCollisionCtx);

	// Context-Objekt fÃ¼r das Boss-UI-Modul
	const bossUICtx = {
		getCtx: () => ctx,
		getCanvas: () => canvas,
		getState: () => state,
		getMODELS: () => MODELS
	};
	const bossUI = createBossUISystem(bossUICtx);

	// ============================================================
	// Foes-Module Initialisierung
	// ============================================================

	// Context-Objekt fÃ¼r das Foes-Arrows-Modul
	const foeArrowsCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		findCoverRockHit,
		registerCoverRockImpact,
		USE_CLASSIC_OKTOPUS_PROJECTILE
	};
	const foeArrows = createFoeArrowsSystem(foeArrowsCtx);

	// Context-Objekt fÃ¼r das Foes-Spawn-Modul
	const foeSpawnCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		clamp
	};
	const foeSpawner = createFoeSpawnSystem(foeSpawnCtx);

	// Context-Objekt fÃ¼r das Foes-Update-Modul
	const foeUpdateCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		clamp,
		spawnBogenschreckArrow: (foe) => foeArrows.spawnBogenschreckArrow(foe),
		spawnOktopusBolt: (foe) => foeArrows.spawnOktopusBolt(foe),
		applyCoverAvoidance,
		processCoverDetour,
		getRitterfischLaneTarget,
		resolveFoeCoverCollision,
		spawnLevelFoe: () => spawnLevelFoe(),
		scheduleNextFoeSpawn: (initial) => scheduleNextFoeSpawn(initial)
	};
	const foeUpdater = createFoeUpdateSystem(foeUpdateCtx);

	// Context-Objekt fÃ¼r das Foes-Render-Modul
	const foeRenderCtx = {
		get ctx() { return ctx; },
		get state() { return state; },
		get MODELS() { return MODELS; },
		get SPRITES() { return SPRITES; },
		spriteReady
	};
	const foeRenderer = createFoeRenderSystem(foeRenderCtx);

	// Context-Objekt fÃ¼r das Foes-Collision-Modul
	const foeCollisionCtx = {
		get state() { return state; },
		getFoeHitbox,
		awardFoeDefeat,
		damagePlayer,
		triggerEventFlash,
		updateHUD,
		collectCoinDrop,
		collectSymbolDrop
	};
	const foeCollision = createFoeCollisionSystem(foeCollisionCtx);

	// ============================================================
	// Abilities-Modul Initialisierung
	// ============================================================
	const abilitiesCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		triggerEventFlash,
		updateHUD,
		awardFoeDefeat,
		SHIELD_DURATION,
		SHIELD_COOLDOWN
	};
	const abilities = createAbilitiesSystem(abilitiesCtx);

	// ============================================================
	// Player-Update-Modul Initialisierung
	// ============================================================
	const playerUpdateCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		getPointer: () => pointer,
		hasKey,
		clamp,
		SHIELD_COOLDOWN,
		SHIELD_DURATION,
		KEY_LEFT,
		KEY_RIGHT,
		KEY_UP,
		KEY_DOWN,
		resolvePlayerCoverCollision
	};
	const playerUpdater = createPlayerUpdateSystem(playerUpdateCtx);

	// ============================================================
	// Background-Modul Initialisierung
	// ============================================================
	const backgroundCtx = {
		getCtx: () => ctx,
		getCanvas: () => canvas,
		getState: () => state,
		SPRITES,
		MODELS,
		spriteReady,
		clamp01,
		getLevel3FloorTop,
		getLevel4FloorTop,
		getLevelFloorSprite,
		LEVEL2_FLOOR_OFFSET
	};
	const backgroundRenderer = createBackgroundRenderSystem(backgroundCtx);

	// ============================================================
	// Cover-Rock-Modul Initialisierung
	// ============================================================
	const coverRockCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		clamp,
		getSPRITES: () => SPRITES,
		spriteReady,
		getCoverRockCollisionMask,
		getLevel3GroundLine,
		damagePlayer
	};
	const coverRocks = createCoverRockSystem(coverRockCtx);

	// ============================================================
	// Pickups-Update-Modul Initialisierung
	// ============================================================
	const pickupsCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		clamp,
		spawnHealPickup,
		collectSymbolDrop
	};
	const pickups = createPickupsSystem(pickupsCtx);

	// ============================================================
	// Level-Modul Initialisierung
	// ============================================================
	const levelCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		getBannerEl: () => bannerEl,
		triggerEventFlash,
		updateHUD,
		hidePickupMessage,
		seedBubbles,
		abilities,
		scheduleNextFoeSpawn,
		primeFoes
	};
	const levels = createLevelSystem(levelCtx);

	function renderCity() {
		renderCityModule(cityRenderCtx);
	}

	// Buildings-Manager initialisieren
	const buildingsManager = createBuildingsManager({
		getState: () => state,
		setState: (newState) => Object.assign(state, newState),
		getCanvas: () => canvas,
		getPlayerPosition: () => state.city?.player ? { x: state.city.player.x, y: state.city.player.y } : null,
		setPlayerPosition: (x, y) => { if (state.city?.player) { state.city.player.x = x; state.city.player.y = y; } },
		getPlayerSprite: () => SPRITES.player,
		getCameraOffset: () => state.city?.camera ? { x: state.city.camera.x, y: state.city.camera.y } : { x: 0, y: 0 },
		triggerEventFlash: (type, opts) => triggerEventFlash(type, opts),
		onModeChange: (newMode) => {
			state.mode = newMode;
			if (newMode === 'city') {
				// Stadt-UI wieder einblenden
				syncCityInventoryVisibility();
				syncCityShopVisibility();
				syncCityMissionVisibility();
			}
		}
	});
	buildingsManager.init();

	function render() {
		// Building-Modus (GebÃ¤ude-Szene)
		if (state.mode === "building") {
			buildingsManager.render(ctx);
			gameRenderer.renderDebugLabel();
			return;
		}
		
		if (state.mode === "city") {
			renderCity();
			// Teleporter und Map-Overlay rendern
			buildingsManager.render(ctx);
			gameRenderer.renderDebugLabel();
			return;
		}
		// CSS 3D-Perspektive entfernen wenn nicht im Stadt-Modus
		if (canvas && canvas.classList.contains("city-perspective")) {
			canvas.classList.remove("city-perspective");
		}
		if (cityInventoryEl) cityInventoryEl.style.display = "none";
		if (cityMerchantEl) cityMerchantEl.style.display = "none";
		if (cityMissionEl) cityMissionEl.style.display = "none";
		if (citySpriteDebugPanel) citySpriteDebugPanel.style.display = "none";
		backgroundRenderer.renderBackground();
		backgroundRenderer.renderBubbles();
		foeRenderer.renderFoes();
		backgroundRenderer.renderCoverRocks();
		backgroundRenderer.renderTsunamiWave();
		gameRenderer.renderHeals();
		gameRenderer.renderCoralEffects();
		gameRenderer.renderCoralAllies();
		gameRenderer.renderCoinDrops();
		gameRenderer.renderSymbolDrops();
		bossUI.renderBossHpBar();
		bossRenderer.renderBossDiamondBeams();
		bossRenderer.renderBossFinSweeps();
		bossRenderer.renderBossWakeWaves();
		bossRenderer.renderBossWhirlpools();
		bossRenderer.renderBossCoinBursts();
		bossRenderer.renderBossCoinExplosions();
		bossRenderer.renderBossShockwaves();
		bossRenderer.renderBossSpeedboats();
		bossRenderer.renderBossCardBoomerangs();
		bossRenderer.renderBossKatapultShots();
		bossRenderer.renderBossPerfumeOrbs();
		bossRenderer.renderBossTorpedoes();
		bossRenderer.renderBossFragranceClouds();
		foeRenderer.renderFoeArrows();
		gameRenderer.renderShots();
		bossUI.renderBoss();
		gameRenderer.renderHealBursts();
		gameRenderer.renderEventFlash();
		gameRenderer.renderPlayer();
		backgroundRenderer.renderFloorOverlay();
		gameRenderer.renderDebugLabel();
	}

	function tick(now) {
		// Delta-Time Capping: Verhindert Physik-SprÃ¼nge bei Tab-Wechsel oder Lag
		const rawDt = now - state.lastTick;
		const dt = clamp(rawDt, MIN_DELTA_TIME, MAX_DELTA_TIME);
		
		// Tab-Wechsel Erkennung: Wenn rawDt sehr groÃŸ war, Reset-Logik
		if (rawDt > LONG_FRAME_THRESHOLD) {
			// Optional: Logging fÃ¼r Debug-Zwecke
			// console.log(`Long frame detected: ${rawDt.toFixed(0)}ms (capped to ${dt}ms)`);
		}
		
		state.lastTick = now;
		if (state.started && !state.over && !state.paused) {
			if (state.mode === "building") {
				// Building-Modus: Keys aus dem keys-Set lesen
				const buildingKeys = {
					left: keys.has('a') || keys.has('A') || keys.has('ArrowLeft'),
					right: keys.has('d') || keys.has('D') || keys.has('ArrowRight'),
					up: keys.has('w') || keys.has('W') || keys.has('ArrowUp'),
					down: keys.has('s') || keys.has('S') || keys.has('ArrowDown')
				};
				buildingsManager.update(dt, buildingKeys);
			} else if (state.mode === "city") {
				updateCity(dt);
				// Buildings-Manager auch in Stadt updaten (fÃ¼r Teleporter)
				const buildingKeys = {
					left: keys.has('a') || keys.has('A') || keys.has('ArrowLeft'),
					right: keys.has('d') || keys.has('D') || keys.has('ArrowRight'),
					up: keys.has('w') || keys.has('W') || keys.has('ArrowUp'),
					down: keys.has('s') || keys.has('S') || keys.has('ArrowDown')
				};
				buildingsManager.update(dt, buildingKeys);
			} else {
				update(dt);
			}
			updateHUD();
		}
		render();
		requestAnimationFrame(tick);
	}

	document.addEventListener("keydown", event => {
		// Buildings-Manager Keyboard-Handler (Map, Teleporter, GebÃ¤ude)
		if (state.mode === "city" || state.mode === "building") {
			if (buildingsManager.handleKeyDown(event.key, event.code)) {
				event.preventDefault();
				return;
			}
		}
		
		if (state.mode === "city") {
			// Inventar Ã¶ffnen/schlieÃŸen
			if (event.key === "i" || event.key === "I") {
				cityUI.setInventoryOpen(!cityUI.isInventoryOpen());
				if (bannerEl) bannerEl.textContent = cityUI.isInventoryOpen() ? "Inventar geÃ¶ffnet (I)" : "Inventar geschlossen";
				event.preventDefault();
				return;
			}
		}
		if (isCityShortcutCandidate(event)) {
			const modeLabel = state.started ? (state.mode === "city" ? "city" : "game") : "title";
			const keyInfo = `${event.key || "?"}/${event.code || "?"}`;
			if (bannerEl) bannerEl.textContent = `Shortcut erkannt (${keyInfo}) â€“ Modus: ${modeLabel}`;
			const bootToast = document.getElementById("bootToast");
			if (bootToast) bootToast.textContent = `Taste erkannt: ${keyInfo} â€“ Modus: ${modeLabel}`;
			console.log("City shortcut keydown", { key: event.key, code: event.code, alt: event.altKey, shift: event.shiftKey, mode: modeLabel });
		}
		if (isCityShortcut(event)) {
			event.preventDefault();
			enterCity();
			return;
		}
		if (DEBUG_SHORTCUTS && event.altKey && event.shiftKey) {
			// Alt+Shift+1-4: Zum Anfang des Levels springen (ohne Boss)
			if (event.code === "Digit1") {
				event.preventDefault();
				debugJumpToLevel(0, { skipToBoss: false });
				return;
			}
			if (event.code === "Digit2") {
				event.preventDefault();
				debugJumpToLevel(1, { skipToBoss: false });
				return;
			}
			if (event.code === "Digit3") {
				event.preventDefault();
				debugJumpToLevel(2, { skipToBoss: false });
				return;
			}
			if (event.code === "Digit4") {
				event.preventDefault();
				debugJumpToLevel(3, { skipToBoss: false });
				return;
			}
			// Alt+Shift+Ctrl+1-4: Direkt zum Boss des Levels springen
			if (event.code === "Digit5") {
				event.preventDefault();
				enterCity();
				return;
			}
		}
		keys.add(event.key);
		if (state.started && !state.over && !state.paused && state.mode === "game" && isShieldActivationKey(event)) {
			event.preventDefault();
			abilities.tryActivateShield();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isCoralActivationKey(event)) {
			if (abilities.tryActivateCoralAllies()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isTsunamiActivationKey(event)) {
			if (abilities.tryActivateTsunamiAbility()) event.preventDefault();
		}
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			event.preventDefault();
			if (state.mode === "city") return;
			pointer.shoot = true;
			if (!state.started) {
				if (!controlsArmed) return;
				resetGame();
			} else {
				playerUpdater.playerShoot();
			}
			return;
		}
		if (!state.started) {
			if (!controlsArmed) return;
			resetGame();
		}
	});

	document.addEventListener("keyup", event => {
		keys.delete(event.key);
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			pointer.shoot = false;
		}
	});

	canvas.addEventListener("pointerdown", event => {
		// Building-Modus: Grid-Editor und Debug-Drag haben PrioritÃ¤t
		if (state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleMouseDown(x, y, event.button)) {
				// Pointer-Capture fÃ¼r kontinuierliches Malen
				canvas.setPointerCapture(event.pointerId);
				event.preventDefault();
				event.stopPropagation();
				return;
			}
		}
		
		if (state.mode === "city") {
			if (event.pointerType === "mouse" && event.button !== 0) return;
			const rect = canvas.getBoundingClientRect();
			const localX = (event.clientX - rect.left) * (canvas.width / rect.width);
			const localY = (event.clientY - rect.top) * (canvas.height / rect.height);
			
			const city = state.city;
			if (!city) return;
			
			// Kamera-Offset berÃ¼cksichtigen fÃ¼r Welt-Koordinaten
			const cameraX = city.camera ? city.camera.x : 0;
			const cameraY = city.camera ? city.camera.y : 0;
			const worldX = localX + cameraX;
			const worldY = localY + cameraY;
			
			// Klick auf NPCs prÃ¼fen (Seitenansicht - keine Perspektiv-Korrektur nÃ¶tig)
			const npcClickRadius = 100;
			
			const merchant = city.npcs && city.npcs.find(npc => npc.id === "merchant");
			if (merchant) {
				const dist = Math.hypot(worldX - merchant.x, worldY - merchant.y);
				if (dist <= npcClickRadius) {
					cityUI.setShopOpen(true);
					updateCityShopUI();
					if (bannerEl) bannerEl.textContent = "HÃ¤ndler geÃ¶ffnet";
					return;
				}
			}
			const questGiver = city.npcs && city.npcs.find(npc => npc.id === "quest");
			if (questGiver) {
				const dist = Math.hypot(worldX - questGiver.x, worldY - questGiver.y);
				if (dist <= npcClickRadius) {
					cityUI.setMissionOpen(true);
					updateCityMissionUI();
					if (bannerEl) bannerEl.textContent = "Missionen geÃ¶ffnet";
					return;
				}
			}
			// Upgrade-NPC
			const upgradeNpc = city.npcs && city.npcs.find(npc => npc.id === "upgrade");
			if (upgradeNpc) {
				const dist = Math.hypot(worldX - upgradeNpc.x, worldY - upgradeNpc.y);
				if (dist <= npcClickRadius) {
					upgradeUI.show();
					if (bannerEl) bannerEl.textContent = "Upgrade-Schmiede geÃ¶ffnet";
					return;
				}
			}
			return;
		}
		if (event.pointerType === "mouse") {
			if (event.button === 2) {
				event.preventDefault();
				if (!state.started) {
					if (!controlsArmed) return;
					resetGame();
					return;
				}
				if (!state.over && !state.paused && state.player.shieldUnlocked) abilities.tryActivateShield();
				return;
			}
			if (event.button !== 0) return;
			pointer.shoot = true;
			if (!state.started) {
				if (!controlsArmed) return;
				resetGame();
			}
			else playerUpdater.playerShoot();
			return;
		}
		if (!state.started) {
			if (!controlsArmed) return;
			resetGame();
		}
		pointer.down = true;
	});

	canvas.addEventListener("contextmenu", event => event.preventDefault());
	
	// Mouse-Events fÃ¼r Buildings-Manager (Karte) und Grid-Editor
	canvas.addEventListener("pointermove", event => {
		const rect = canvas.getBoundingClientRect();
		// Skalierung berÃ¼cksichtigen wenn Canvas anders skaliert ist
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;
		buildingsManager.handleMouseMove(x, y);
	});
	
	canvas.addEventListener("click", event => {
		if (state.mode === "city" || state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleClick(x, y)) {
				event.preventDefault();
				return;
			}
		}
	});
	
	// Mouse-Events fÃ¼r Building Debug-Drag-Mode und Grid-Editor
	canvas.addEventListener("mousedown", event => {
		if (state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleMouseDown(x, y, event.button)) {
				event.preventDefault();
				event.stopPropagation();
			}
		}
	});
	
	canvas.addEventListener("mouseup", event => {
		if (state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			buildingsManager.handleMouseUp(x, y, event.button);
		}
	});
	
	// Rechtsklick-MenÃ¼ verhindern im Building-Modus (fÃ¼r Grid-Editor)
	canvas.addEventListener("contextmenu", event => {
		if (state.mode === "building") {
			event.preventDefault();
		}
	});
	
	document.addEventListener("pointerup", (event) => {
		pointer.down = false;
		pointer.shoot = false;
		// Building Grid-Editor beenden (auch wenn Maus auÃŸerhalb des Canvas)
		if (state.mode === "building") {
			buildingsManager.handleMouseUp(0, 0, event.button);
			// Pointer-Capture freigeben
			if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
				canvas.releasePointerCapture(event.pointerId);
			}
		}
	});

	if (btnRestart) btnRestart.addEventListener("click", () => resetGame());
	if (btnQuit)
		btnQuit.addEventListener("click", () => {
			showGameOver("Spiel beendet");
		});
	if (hudShield)
		hudShield.addEventListener("click", () => {
			if (!state.started || state.over || state.paused) return;
			if (!state.player.shieldUnlocked) return;
			abilities.tryActivateShield();
		});

	if (typeof window !== "undefined") {
		window.cashBeginGame = () => {
			if (!bootGame.initialized) bootGame();
			resetGame();
			state.over = false;
			state.paused = false;
			state.started = true;
			state.levelIndex = 0;
			applyLevelConfig(0, { skipFlash: false });
			primeFoes();
			scheduleNextFoeSpawn(true);
			state.lastTick = performance.now();
			state.boss.active = false;
			state.boss.entering = false;
			controlsArmed = true;
			if (bannerEl) bannerEl.style.display = "block";
		};
		window.cashResetGame = resetGame;
		window.cashSpawnBogenschreck = () => spawnFoe({ type: "bogenschreck" });
		window.cashDebugJumpLevel = debugJumpToLevel;
		window.cashEnterCity = () => {
			if (!bootGame.initialized) bootGame();
			enterCity();
		};
		// Debug-Funktion: Hole Stadt-Daten fÃ¼r Floor-Editor
		window.cashGetCityData = () => {
			if (!state.city) return null;
			const city = state.city;
			const FLOOR_OFFSET = city.floorThickness + 0;
			const floors = city.floors.map((floor, i) => ({
				stock: i,
				floorY: floor.y,
				groundY: Math.round(floor.y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET),
				hatchX: floor.hatchX,
				hasHatch: floor.hasHatch
			}));
			return {
				canvasSize: { width: canvas.width, height: canvas.height },
				building: {
					x: city.buildingX,
					y: city.buildingY,
					width: city.buildingWidth,
					height: city.buildingHeight
				},
				floorHeight: CITY_FLOOR_HEIGHT,
				floorThickness: city.floorThickness,
				floors: floors,
				player: {
					x: city.player.x,
					y: city.player.y,
					floor: city.player.floor
				},
				camera: city.camera
			};
		};
	}
	resetGame();
	state.started = true;
	state.paused = false;
	controlsArmed = true;
	if (typeof window !== "undefined") {
		const hash = (window.location.hash || "").toLowerCase();
		const query = (window.location.search || "").toLowerCase();
		if (hash === "#city" || hash === "#stadt" || query.includes("city") || query.includes("stadt")) {
			enterCity();
		}
	}
	requestAnimationFrame(tick);
}

if (typeof window !== "undefined") {
	window.bootGame = window.bootGame || bootGame;
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootGame, { once: true });
	else bootGame();
}
