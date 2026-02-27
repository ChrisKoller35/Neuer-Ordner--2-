// ============================================================
// CASHFISCH - Hauptspiel
// ============================================================
"use strict";

// === Core Imports ===
import { 
	KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN,
	SHIELD_DURATION, SHIELD_COOLDOWN,
	LEVEL2_FLOOR_OFFSET,
} from './core/constants.js';

import { clamp, clamp01 } from './core/utils.js';

import { 
	spriteReady, 
	configureAssetLoader,
	ManifestAssets,
	createLazySpriteProxy,
	AssetManager,
	updateLazySpriteSource
} from './core/assets.js';

// === Chunk Loading System ===
import { createChunkLoader } from './core/chunkLoader.js';

// === Overworld (Top-Down Open-World Stadt) ===
import { createOverworldState, updateOverworld, renderOverworld } from './overworld/overworld.js';

// === JSON Data ===
import itemsData from './data/items.json';
import shopData from './data/shop.json';
import missionsData from './data/missions.json';
import cityData from './data/city.json';
import symbolsData from './data/symbols.json';
import walkableGridsData from './data/walkableGrids.json';
import spritesData from './data/sprites.json';
import marketJsonData from './data/market.json';

// === City Module Imports ===
import { 
	buildCitySpriteCache as buildCitySpriteCacheModule
} from './city/spriteCache.js';

import {
	CITY_FLOOR_HEIGHT,
	CITY_GRID_CELL_SIZE,
	CITY_GRID_COLS,
	CITY_GRID_ROWS,
} from './city/constants.js';

import { createCityUI } from './city/ui.js';
import { createCityUIElements } from './city/templates.js';
import { createCitySpriteDebug } from './city/spriteDebug.js';

// === Game Module Imports ===
import { createFoeUpdateSystem } from './foes/update.js';
import { createFoeRenderSystem } from './foes/render.js';
import { createFoeArrowsSystem } from './foes/arrows.js';
import { createFoeCollisionSystem } from './foes/collision.js';
import { createGameRenderSystem } from './game/render.js';
import { createAbilitiesSystem } from './player/abilities.js';
import { createPlayerUpdateSystem } from './player/update.js';
import { createLevelSystem } from './game/levels.js';
import { createBackgroundRenderSystem } from './game/background.js';
import { createCoverRockSystem } from './game/coverRocks.js';
import { createPickupsSystem } from './game/pickups.js';
import { createModels } from './game/models.js';
import { createFloorHelpers, getLevelFloorSprite } from './game/floor.js';
import { getHUDElements, getCitySpriteDebugElements } from './core/hudElements.js';
import { createInputHelpers } from './game/inputHelpers.js';
import { createHUDSystem } from './game/hudUpdate.js';
import { createSpawningSystem } from './game/spawning.js';
import { createGameActions } from './game/gameActions.js';
import { createHubMenu } from './ui/hubMenu.js';

// === Boss Module Imports ===
import { createBossRenderSystem } from './boss/render.js';
import { createBossSpawnSystem } from './boss/spawn.js';
import { createBossUpdateSystem } from './boss/update.js';
import { createBossCollisionSystem } from './boss/collision.js';
import { createBossUISystem } from './boss/ui.js';

// === Player Systems ===
import { createProgressionState, createProgressionSystem } from './player/progression.js';
import { createTalentTreeUI } from './player/talentUI.js';
import { createInitialState, clearAllStateArrays } from './core/initialState.js';
import { createUpgradeSystem } from './player/upgrades.js';
import { createUpgradeUI } from './player/upgradeUI.js';

// === Buildings System ===
import { createBuildingsManager } from './buildings/buildingsManager.js';
import { createWorkshopSystem } from './buildings/workshop.js';
import { createWorkshopUI } from './buildings/workshopUI.js';
import { createMarketSystem } from './buildings/market.js';
import { createMarketUI } from './buildings/marketUI.js';
import { createGardenSystem } from './buildings/garden.js';
import { createGardenUI } from './buildings/gardenUI.js';
import { createHarborSystem } from './buildings/harbor.js';
import { createHarborUI } from './buildings/harborUI.js';
import { createAcademySystem } from './buildings/academy.js';
import { createAcademyUI } from './buildings/academyUI.js';
import { createHelpersSystem } from './buildings/helpers.js';
import { createHelpersUI } from './buildings/helpersUI.js';

// === Dungeon System ===
import { createDungeonSystem } from './dungeon/dungeonSystem.js';

// === Extrahierte Module (aus bootGame) ===
import { setupDebugShortcuts } from './game/debugShortcuts.js';
import { setupEventBindings } from './game/eventBindings.js';
import { createGameLoop } from './game/gameLoop.js';

// === Shared State (ersetzt window.* Globals) ===
import S from './core/sharedState.js';

let canvas = null;
let ctx = null;

const USE_CLASSIC_OKTOPUS_PROJECTILE = true; // Toggle to compare new blowdart prototype with classic sprite
const USE_WEBP_ASSETS = true; // Optional: generates/loads .webp with PNG fallback

// Stadt-Sprite-Cache kommt aus ./city/spriteCache.js (importiert oben)
const DEBUG_BUILD_LABEL = "BUILD v3";

// Asset Loader konfigurieren (nutzt import.meta.url für relative Pfade)
configureAssetLoader({ 
	useWebP: USE_WEBP_ASSETS, 
	baseUrl: import.meta.url 
});

function buildCitySpriteCache() { buildCitySpriteCacheModule(SPRITES.cityPlayer); }

// Lazy Sprite System
let floorHelpers = null;
const getLevel2FloorTop = () => floorHelpers?.getLevel2FloorTop() ?? null;
const getLevel3FloorTop = () => floorHelpers?.getLevel3FloorTop() ?? null;
const getLevel4FloorTop = () => floorHelpers?.getLevel4FloorTop() ?? null;
const getLevel3GroundLine = () => floorHelpers?.getLevel3GroundLine() ?? null;

// Floor-Sprites werden über getLevelFloorSprite(n) geladen (kein window.* mehr nötig)

// Sprite-Pfade aus JSON (Lazy Loading)
const SPRITE_PATHS = spritesData.sprites;
const CITY_TILE_PATHS = spritesData.cityTiles;
const PLAYER_VARIANTS = spritesData.playerVariants || {
	player: './player/Player.png',
	pinkqualle: './player/Playerpinkqualle.png',
	kleinerdrache: './player/playerkleinerdrache.png',
	engelfisch: './player/Playerengelfisch.png'
};

// Aktiver Spieler-Sprite (wird von Charakterauswahl gesetzt)
let _selectedPlayerSprite = null;
let _lastSelectedCharacter = null;

function getSelectedPlayerSprite() {
	// Hole den aktuell ausgewählten Charakter
	const selectedChar = S.selectedCharacter || 'player';
	
	// Wenn sich die Auswahl geändert hat, Cache invalidieren und Sprite-Pfad aktualisieren
	if (_lastSelectedCharacter !== selectedChar) {
		_selectedPlayerSprite = null;
		_lastSelectedCharacter = selectedChar;
		
		// Aktualisiere den Lazy-Sprite-Pfad
		const spritePath = PLAYER_VARIANTS[selectedChar] || PLAYER_VARIANTS.player;
		updateLazySpriteSource('player', spritePath);
	}
	
	// Sprite laden falls nicht gecacht
	if (!_selectedPlayerSprite) {
		const spritePath = PLAYER_VARIANTS[selectedChar] || PLAYER_VARIANTS.player;
		_selectedPlayerSprite = AssetManager.load(spritePath, "player");
		console.log('[Cashfisch] Player-Sprite geladen:', selectedChar, spritePath);
	}
	
	return _selectedPlayerSprite;
}

// Funktion zum Zurücksetzen des Player-Sprite-Caches (bei Charakterwechsel)
function resetPlayerSpriteCache() {
	const selectedChar = S.selectedCharacter || 'player';
	const spritePath = PLAYER_VARIANTS[selectedChar] || PLAYER_VARIANTS.player;
	
	// Lokalen Cache zurücksetzen
	_selectedPlayerSprite = null;
	_lastSelectedCharacter = null;
	
	// Lazy-Sprite-System aktualisieren
	updateLazySpriteSource('player', spritePath);
	
	console.log('[Cashfisch] Player-Sprite-Cache zurückgesetzt für:', selectedChar);
}

// Exportiere für externe Nutzung (über sharedState statt window)
S.resetPlayerSpriteCache = resetPlayerSpriteCache;

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

// SPRITES Proxy - lädt Assets bei erstem Zugriff
const SPRITES = createLazySpriteProxy(SPRITE_PATHS);

// Player-Sprite wird über updateLazySpriteSource aktualisiert (siehe resetPlayerSpriteCache)

// cityTiles muss separat behandelt werden (ist ein Array)
Object.defineProperty(SPRITES, 'cityTiles', {
	get: getCityTiles,
	enumerable: true
});

let processedHealSprite = null;
const coverRockMaskCache = new Map(); // Cache scaled alpha masks for cover rock collisions

// Stadt Grid-System (über sharedState statt window)
S.CITY_WALKABLE_GRID = walkableGridsData.city || {};
S.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
S.CITY_GRID_COLS = CITY_GRID_COLS;
S.CITY_GRID_ROWS = CITY_GRID_ROWS;

// Gebäude Walkable Grids (aus JSON)
S.buildingWalkableGrids = {
	market: walkableGridsData.market,
	workshop: walkableGridsData.workshop,
	harbor: walkableGridsData.harbor,
	academy: walkableGridsData.academy,
	garden: walkableGridsData.garden,
};

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

// MODELS: Render-Funktionen f�r Spielobjekte (aus models.js)
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

	// HUD-Elemente holen (aus core/hudElements.js)
	const hud = getHUDElements();
	const { score: hudScore, coins: hudCoins, level: hudLevel, time: hudTime, hearts: hudHearts,
		shield: hudShield, armor: hudArmor, playerLevel: hudPlayerLevel, xpBarFill: hudXpBarFill,
		skillPoints: hudSkillPoints, skillPointsNum: hudSkillPointsNum, symbols: hudSymbols,
		banner: bannerEl, endOverlay, endTitle, btnRestart, btnQuit, pickupMsg } = hud;
	
	// Debug-Elemente holen
	const debugElements = getCitySpriteDebugElements();
	const { panel: citySpriteDebugPanel, canvas: citySpriteDebugCanvas, ctx: citySpriteDebugCtx,
		reset: citySpriteDebugReset, export: citySpriteDebugExport, output: citySpriteDebugOutput,
		current: citySpriteDebugCurrent, copy: citySpriteDebugCopy } = debugElements;
	
	// Stadt-UI-Elemente erstellen (Templates aus city/templates.js)
	const { inventoryEl: cityInventoryEl, merchantEl: cityMerchantEl, missionEl: cityMissionEl } = createCityUIElements();

	// State-Variablen f�r Debug-Modi (werden vom Modul gelesen)
	const cityAlignMode = false;
	const cityCropMode = false;
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

	const keys = new Set();
	const pointer = { down: false, shoot: false };
	let controlsArmed = false;
	const DEBUG_SHORTCUTS = true;

	// Input-Helpers (aus game/inputHelpers.js)
	const { hasKey } = createInputHelpers(keys);

	const cityInventory = {
		equipment: { weapon: null, armor: null, armor2: null },
		items: Array.from({ length: 36 }, () => null)
	};

	// Item Definitions (aus JSON) + Market Items für vollständige Lookup
	const CITY_ITEM_DATA = { ...itemsData.items };

	// Market-Items in die Lookup-Tabelle einfügen (nach Label)
	const MARKET_CATEGORY_MAP = {
		consumables: { category: "dungeon", itemType: "consumable", type: "consumable", rarity: "Gewöhnlich" },
		traps: { category: "dungeon", itemType: "consumable", type: "consumable", rarity: "Selten" },
		dungeonTools: { category: "dungeon", itemType: "permanent", type: "misc", rarity: "Selten" },
		special: { category: "utility", itemType: "permanent", type: "misc", rarity: "Episch" }
	};
	for (const [catKey, catObj] of Object.entries(marketJsonData.categories || {})) {
		const mapped = MARKET_CATEGORY_MAP[catKey] || {
			category: "utility",
			itemType: "permanent",
			type: "misc",
			rarity: "Gewöhnlich"
		};
		for (const item of catObj.items || []) {
			if (!CITY_ITEM_DATA[item.label]) {
				CITY_ITEM_DATA[item.label] = {
					id: item.id,
					label: item.label,
					type: mapped.type,
					category: mapped.category,
					itemType: mapped.itemType,
					rarity: item.rarity || mapped.rarity,
					icon: item.icon || null,
					effect: item.description || "",
					price: item.price || 0,
					stats: {}
				};
			}
		}
	}

	// Konstanten f�r spezielle Items (R�ckw�rtskompatibilit�t)
	const ARMOR_ITEM_NAME = Object.keys(CITY_ITEM_DATA).find(
		(name) => CITY_ITEM_DATA[name]?.id === "ruestung-meeresbewohner"
	) || "Rüstung der Meeresbewohner";
	const ARMOR_ITEM_EFFECT = CITY_ITEM_DATA[ARMOR_ITEM_NAME]?.effect || "";
	const ARMOR_ITEM_ICON = CITY_ITEM_DATA[ARMOR_ITEM_NAME]?.icon || null;

	const getCityItemData = name => {
		if (!name) return null;
		const data = CITY_ITEM_DATA[name];
		if (data) return data;
		return {
			label: name,
			type: "misc",
			category: "utility",
			itemType: "permanent",
			rarity: "Gewöhnlich",
			icon: null,
			effect: "",
			price: 0,
			stats: {}
		};
	};

	// Shop-Inventar aus JSON laden
	const cityShopItems = shopData.inventory;

	// Missionen aus JSON laden
	const cityMissions = missionsData.missions;

	// State aus Factory erstellen
	const state = createInitialState(canvas);
	
	// Chunk Loading System erstellen
	const chunkLoaderCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		SPRITES,
		spriteReady
	};
	const chunkLoader = createChunkLoader(chunkLoaderCtx);
	state.chunkLoader = chunkLoader;
	state.showChunkDebug = true;  // Debug-Anzeige aktivieren (kann später deaktiviert werden)

	// City UI initialisieren
	// startMission wird über gameActions bereitgestellt (late-binding via getCityUI)

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
		onStartMission: (missionId) => {
			if (missionId === 'mission-dungeon') {
				// Dungeon direkt über Missions-NPC starten
				if (dungeonSystem) {
					dungeonSystem.showStartMenu();
					state.mode = 'dungeon_menu';
					syncCityInventoryVisibility();
					syncCityShopVisibility();
					syncCityMissionVisibility();
				}
				return;
			}
			startMission(missionId);
		},
		onUpdateHUD: () => updateHUD(),
		armorItemName: ARMOR_ITEM_NAME
	});

	// City UI Shortcuts (Wrapper f�r h�ufige Aufrufe)
	const syncCityInventoryVisibility = () => cityUI.syncInventoryVisibility();
	const syncCityShopVisibility = () => cityUI.syncShopVisibility();
	const syncCityMissionVisibility = () => cityUI.syncMissionVisibility();
	const updateCityShopUI = () => cityUI.updateShopUI();
	const updateCityMissionUI = () => cityUI.updateMissionUI();

	// Event-Listener �ber das Modul einrichten
	cityUI.setupEventListeners();
	cityUI.updateAllUI();

	const hubMenu = createHubMenu({
		getState: () => state,
		getCityUI: () => cityUI,
		getBuildingsManager: () => buildingsManager
	});

	// Progression System
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
	progressionSystem.applyTalentEffects();

	// Upgrade System
	const upgradeSystem = createUpgradeSystem({ state, player: state.player });
	const upgradeUI = createUpgradeUI({ canvas, state, upgradeSystem });
	upgradeSystem.applyUpgradeEffects();

	// Workshop System (Werkstatt - Ausrüstung verstärken)
	const workshopSystem = createWorkshopSystem({
		state,
		getInventory: () => cityInventory,
		getItemData: getCityItemData
	});
	const workshopUI = createWorkshopUI({ canvas, state, workshopSystem });

	// Market System (Marktplatz - Erweiterter Shop + Daily Deals)
	const marketSystem = createMarketSystem({
		state,
		getInventory: () => cityInventory
	});
	const marketUI = createMarketUI({ canvas, state, marketSystem });

	// Garden System (Gärtnerei - Pflanz-Slots + Buffs)
	const gardenSystem = createGardenSystem({
		state,
		getInventory: () => cityInventory
	});
	const gardenUI = createGardenUI({ canvas, state, gardenSystem });

	// Harbor System (Hafen - Expeditionen)
	const harborSystem = createHarborSystem({
		state,
		getInventory: () => cityInventory
	});
	const harborUI = createHarborUI({ canvas, state, harborSystem });

	// Academy System (Akademie - Skill-Builder)
	const academySystem = createAcademySystem({ state });
	const academyUI = createAcademyUI({ canvas, state, academySystem });

	// Helpers System (NPC-Helfer - Karten-Sammlung)
	const helpersSystem = createHelpersSystem({ state });
	const helpersUI = createHelpersUI({ canvas, state, helpersSystem });

	// Dungeon System (Prozedural generierte Dungeons — Seitenansicht)
	const dungeonSystem = createDungeonSystem({
		canvas,
		ctx,
		getState: () => state,
		helpersSystem,
		getKeys: () => ({
			ArrowLeft: keys.has('ArrowLeft') || keys.has('a') || keys.has('A'),
			ArrowRight: keys.has('ArrowRight') || keys.has('d') || keys.has('D'),
			ArrowUp: keys.has('ArrowUp') || keys.has('w') || keys.has('W'),
			ArrowDown: keys.has('ArrowDown') || keys.has('s') || keys.has('S'),
			Space: keys.has(' '),
			Escape: keys.has('Escape'),
			Enter: keys.has('Enter'),
			KeyA: keys.has('a') || keys.has('A'),
			KeyD: keys.has('d') || keys.has('D'),
			KeyW: keys.has('w') || keys.has('W'),
			KeyS: keys.has('s') || keys.has('S'),
			attack: keys.has(' ')
		}),
		// Spieler-Sprite & Modelle für Seitenansicht
		MODELS,
		SPRITES,
		spriteReady,
		onReturnToCity: (reason) => {
			state.mode = "city";
			if (reason === "complete") {
				state.eventFlash = { text: "Dungeon abgeschlossen! +5000 Gold", timer: 3000, color: "#4ade80" };
			} else if (reason === "death") {
				state.hearts = state.maxHearts;
				state.eventFlash = { text: "Im Dungeon gefallen...", timer: 2000, color: "#ff6b6b" };
			} else {
				state.eventFlash = { text: "Aus dem Dungeon zurückgekehrt", timer: 2000, color: "#cfe4ff" };
			}
		}
	});

	// Debug-Shortcuts und Talent-Tree-Toggle (extrahiert → game/debugShortcuts.js)
	setupDebugShortcuts({
		getState: () => state,
		getTalentTreeUI: () => talentTreeUI,
		getProgressionSystem: () => progressionSystem,
		getCityUI: () => cityUI,
		getDungeonSystem: () => dungeonSystem,
		syncCityInventoryVisibility,
		syncCityShopVisibility,
		syncCityMissionVisibility,
		getUpdateHUD: () => updateHUD
	});

	// Spawning-System (aus game/spawning.js)
	const spawning = createSpawningSystem({
		getState: () => state,
		getCanvas: () => canvas,
		SYMBOL_DATA,
		SYMBOL_AUTOCOLLECT_MS,
		getSPRITES: () => SPRITES,
		spriteReady,
		getCoverRockCollisionMask,
		getLevel3GroundLine
	});
	const { seedBubbles, spawnFoe, scheduleNextFoeSpawn, primeFoes, spawnLevelFoe,
		getFoeHitbox, spawnHealPickup, spawnSymbolDrop, spawnCoinDrop,
		getCoinValueForFoe, spawnCoverRock, triggerEventFlash } = spawning;

	// HUD-Update-System (aus game/hudUpdate.js)
	const hudSystem = createHUDSystem({
		getState: () => state,
		getHUD: () => hud,
		getBannerEl: () => bannerEl,
		getInventory: () => cityInventory,
		armorItemName: ARMOR_ITEM_NAME,
		SYMBOL_DATA,
		progressionSystem
	});
	const updateHUD = () => hudSystem.updateHUD();

	// Game-Actions-System (aus game/gameActions.js)
	const gameActions = createGameActions({
		getState: () => state,
		getCanvas: () => canvas,
		getCityInventory: () => cityInventory,
		ARMOR_ITEM_NAME,
		getCityUI: () => cityUI,
		getEndOverlay: () => endOverlay,
		getEndTitle: () => endTitle,
		getBannerEl: () => bannerEl,
		getPickupMsg: () => pickupMsg,
		getPointer: () => pointer,
		getLevels: () => levels,
		getProgressionSystem: () => progressionSystem,
		cityData,
		cityMissions,
		SYMBOL_DATA,
		LEVEL_SYMBOL_SEQUENCE,
		DEBUG_SHORTCUTS,
		spawnCoinDrop, getCoinValueForFoe, spawnSymbolDrop, spawnCoverRock,
		triggerEventFlash, seedBubbles, primeFoes,
		getUpdateHUD: () => updateHUD,
		setControlsArmed: (v) => { controlsArmed = v; }
	});
	const { showPickupMessage, hidePickupMessage, unlockShieldIfNeeded,
		concludeBossVictory, finishPendingSymbolAdvance,
		collectSymbolDrop, collectCoinDrop, maybeSpawnLevelThreeCoverRock,
		applyLevelConfig, advanceLevel, debugJumpToLevel,
		enterCity, startMission, resetGame, showGameOver, winGame,
		activateBoss, damagePlayer, awardFoeDefeat } = gameActions;

	// City Update Context (für gameLoop)
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

	// Update-Funktionen: src/boss/update.js, src/foes/update.js, src/player/update.js, src/game/pickups.js
	// damagePlayer, awardFoeDefeat: siehe game/gameActions.js

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

	// Cover-Rock-Modul (vor Boss-Modulen initialisiert)
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

	const bossRenderCtx = {
		get ctx() { return ctx; },
		get canvas() { return canvas; },
		get state() { return state; }
	};
	const bossRenderer = createBossRenderSystem(bossRenderCtx);

	const bossSpawnCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		findCoverRockHit: coverRocks.findCoverRockHit,
		registerCoverRockImpact: coverRocks.registerCoverRockImpact,
		triggerEventFlash
	};
	const bossSpawner = createBossSpawnSystem(bossSpawnCtx);

	const bossUpdateCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		getSPRITES: () => SPRITES,
		spriteReady,
		activateBoss,
		applyCoverAvoidance: coverRocks.applyCoverAvoidance,
		processCoverDetour: coverRocks.processCoverDetour,
		findCoverRockHit: coverRocks.findCoverRockHit,
		registerCoverRockImpact: coverRocks.registerCoverRockImpact,
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

	const bossCollisionCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		damagePlayer,
		winGame,
		updateBannerEl: text => { if (bannerEl) bannerEl.textContent = text; },
		spawnFragranceCloud: (x, y, opts) => bossSpawner.spawnFragranceCloud(x, y, opts)
	};
	const bossCollision = createBossCollisionSystem(bossCollisionCtx);

	const bossUICtx = {
		getCtx: () => ctx,
		getCanvas: () => canvas,
		getState: () => state,
		getMODELS: () => MODELS
	};
	const bossUI = createBossUISystem(bossUICtx);

	// Foes-Module

	const foeArrowsCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		findCoverRockHit: coverRocks.findCoverRockHit,
		registerCoverRockImpact: coverRocks.registerCoverRockImpact,
		USE_CLASSIC_OKTOPUS_PROJECTILE
	};
	const foeArrows = createFoeArrowsSystem(foeArrowsCtx);

	const foeUpdateCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		clamp,
		spawnBogenschreckArrow: (foe) => foeArrows.spawnBogenschreckArrow(foe),
		spawnOktopusBolt: (foe) => foeArrows.spawnOktopusBolt(foe),
		applyCoverAvoidance: coverRocks.applyCoverAvoidance,
		processCoverDetour: coverRocks.processCoverDetour,
		getRitterfischLaneTarget: coverRocks.getRitterfischLaneTarget,
		resolveFoeCoverCollision: coverRocks.resolveFoeCoverCollision,
		spawnLevelFoe: () => spawnLevelFoe(),
		scheduleNextFoeSpawn: (initial) => scheduleNextFoeSpawn(initial)
	};
	const foeUpdater = createFoeUpdateSystem(foeUpdateCtx);

	const foeRenderCtx = {
		get ctx() { return ctx; },
		get state() { return state; },
		get MODELS() { return MODELS; },
		get SPRITES() { return SPRITES; },
		spriteReady
	};
	const foeRenderer = createFoeRenderSystem(foeRenderCtx);

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

	// Abilities-Modul
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

	// Player-Update-Modul
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
		resolvePlayerCoverCollision: coverRocks.resolvePlayerCoverCollision
	};
	const playerUpdater = createPlayerUpdateSystem(playerUpdateCtx);

	// Background-Modul
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

	// Pickups-Update-Modul
	const pickupsCtx = {
		getState: () => state,
		getCanvas: () => canvas,
		clamp,
		spawnHealPickup,
		collectSymbolDrop
	};
	const pickups = createPickupsSystem(pickupsCtx);

	// Level-Modul
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

	// === OVERWORLD (Top-Down Open-World Stadt) ===
	function enterOverworld() {
		state.mode = "overworld";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.overworld = createOverworldState(canvas);
		clearAllStateArrays(state);
		state.boss.active = false;
		pointer.shoot = false;
		cityUI.reset();
		if (bannerEl) bannerEl.textContent = "Unterwasser-Oberwelt";
		if (endOverlay) endOverlay.style.display = "none";
		if (cityInventoryEl) cityInventoryEl.style.display = "none";
		if (cityMerchantEl) cityMerchantEl.style.display = "none";
		if (cityMissionEl) cityMissionEl.style.display = "none";
		if (citySpriteDebugPanel) citySpriteDebugPanel.style.display = "none";
		const gameWrap = document.getElementById("gameWrap");
		const startScreen = document.getElementById("startScreen");
		const cutWrap = document.getElementById("cutWrap");
		if (gameWrap) gameWrap.style.display = "block";
		if (startScreen) startScreen.style.display = "none";
		if (cutWrap) cutWrap.style.display = "none";
		controlsArmed = true;
		updateHUD();
		console.log('[Cashfisch] Overworld betreten');
	}

	function exitOverworld() {
		state.overworld = null;
		enterCity();
		console.log('[Cashfisch] Overworld verlassen → Stadt');
	}

	function updateOverworldMode(dt) {
		if (!state.overworld) return;
		const input = {
			left:  keys.has('a') || keys.has('A') || keys.has('ArrowLeft'),
			right: keys.has('d') || keys.has('D') || keys.has('ArrowRight'),
			up:    keys.has('w') || keys.has('W') || keys.has('ArrowUp'),
			down:  keys.has('s') || keys.has('S') || keys.has('ArrowDown')
		};
		updateOverworld(state.overworld, input, dt, canvas);
	}

	function renderOverworldMode() {
		if (!state.overworld) return;
		renderOverworld(ctx, state.overworld);
		gameRenderer.renderDebugLabel();
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
			syncCityInventoryVisibility();
			syncCityShopVisibility();
			syncCityMissionVisibility();
		},
		workshopUI,
		upgradeUI,
		marketUI,
		gardenUI,
		harborUI,
		academyUI,
		helpersUI,
		helpersSystem,
		dungeonSystem
	});
	buildingsManager.init();

	// Game-Loop erstellen (extrahiert → game/gameLoop.js)
	const gameLoop = createGameLoop({
		getState: () => state,
		getCanvas: () => canvas,
		getCtx: () => ctx,
		getKeys: () => keys,
		hasKey,
		getPlayerUpdater: () => playerUpdater,
		getAbilities: () => abilities,
		getPickups: () => pickups,
		getCoverRocks: () => coverRocks,
		getFoeUpdater: () => foeUpdater,
		getFoeArrows: () => foeArrows,
		getFoeCollision: () => foeCollision,
		getFoeRenderer: () => foeRenderer,
		getBossUpdater: () => bossUpdater,
		getBossCollision: () => bossCollision,
		getBossRenderer: () => bossRenderer,
		getBossUI: () => bossUI,
		getGameRenderer: () => gameRenderer,
		getBackgroundRenderer: () => backgroundRenderer,
		getDungeonSystem: () => dungeonSystem,
		getBuildingsManager: () => buildingsManager,
		getUpdateHUD: () => updateHUD,
		maybeSpawnLevelThreeCoverRock,
		updateOverworldMode,
		renderOverworldMode,
		getCityRenderCtx: () => cityRenderCtx,
		getCityUpdateCtx: () => cityUpdateCtx,
		getCityInventoryEl: () => cityInventoryEl,
		getCityMerchantEl: () => cityMerchantEl,
		getCityMissionEl: () => cityMissionEl,
		getCitySpriteDebugPanel: () => citySpriteDebugPanel
	});
	const { tick, update, render, updateCity } = gameLoop;

	// Event-Bindings registrieren (extrahiert → game/eventBindings.js)
	setupEventBindings({
		getState: () => state,
		getCanvas: () => canvas,
		getKeys: () => keys,
		getPointer: () => pointer,
		isControlsArmed: () => controlsArmed,
		getBannerEl: () => bannerEl,
		getBtnRestart: () => btnRestart,
		getBtnQuit: () => btnQuit,
		getHudShield: () => hudShield,
		getDungeonSystem: () => dungeonSystem,
		getBuildingsManager: () => buildingsManager,
		getHubMenu: () => hubMenu,
		getCityUI: () => cityUI,
		getAbilities: () => abilities,
		getPlayerUpdater: () => playerUpdater,
		getUpgradeUI: () => upgradeUI,
		resetGame,
		enterCity,
		enterOverworld,
		exitOverworld,
		showGameOver,
		debugJumpToLevel,
		syncCityInventoryVisibility,
		syncCityShopVisibility,
		syncCityMissionVisibility,
		updateCityShopUI,
		updateCityMissionUI,
		DEBUG_SHORTCUTS
	});

	// Spiel-Funktionen über sharedState bereitstellen
	S.cashBeginGame = () => {
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
	S.cashResetGame = resetGame;
	S.cashSpawnBogenschreck = () => spawnFoe({ type: "bogenschreck" });
	S.cashDebugJumpLevel = debugJumpToLevel;
	S.cashEnterCity = () => {
		if (!bootGame.initialized) bootGame();
		enterCity();
	};
	S.cashGetCityData = () => {
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
			floors,
			player: {
				x: city.player.x,
				y: city.player.y,
				floor: city.player.floor
			},
			camera: city.camera
		};
	};
	// Debug-Zugang über Browser-Konsole
	if (typeof window !== "undefined") {
		Object.assign(window, {
			cashBeginGame: S.cashBeginGame,
			cashResetGame: S.cashResetGame,
			cashSpawnBogenschreck: S.cashSpawnBogenschreck,
			cashDebugJumpLevel: S.cashDebugJumpLevel,
			cashEnterCity: S.cashEnterCity,
			cashGetCityData: S.cashGetCityData,
		});
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

S.bootGame = S.bootGame || bootGame;
if (typeof window !== "undefined") {
	window.bootGame = S.bootGame; // Debug-Zugang
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootGame, { once: true });
	else bootGame();
}


