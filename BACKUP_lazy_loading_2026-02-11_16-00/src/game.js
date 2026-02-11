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

// JSON-Daten importieren (Vite unterstützt JSON-Imports)
import itemsData from './data/items.json';
import shopData from './data/shop.json';
import missionsData from './data/missions.json';
import cityData from './data/city.json';
import symbolsData from './data/symbols.json';

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

// Buildings-System importieren (Gebäude, Karte, Teleporter)
import { createBuildingsManager } from './buildings/buildingsManager.js';

let canvas = null;
let ctx = null;

// Floor-Funktionen werden weiter unten nach getLevelFloorSprite() definiert
// (siehe LAZY SPRITE SYSTEM Block)

const USE_CLASSIC_OKTOPUS_PROJECTILE = true; // Toggle to compare new blowdart prototype with classic sprite
const USE_WEBP_ASSETS = true; // Optional: generates/loads .webp with PNG fallback

// Stadt-Sprite-Cache kommt aus ./city/spriteCache.js (importiert oben)
const DEBUG_BUILD_LABEL = "BUILD v3";

// Asset Loader konfigurieren (nutzt import.meta.url für relative Pfade)
configureAssetLoader({ 
	useWebP: USE_WEBP_ASSETS, 
	baseUrl: import.meta.url 
});

// Wrapper für buildCitySpriteCache - nutzt das importierte Modul
function buildCitySpriteCache() {
	buildCitySpriteCacheModule(SPRITES.cityPlayer);
}

// ============================================================
// LAZY SPRITE SYSTEM - Assets werden bei Bedarf geladen
// ============================================================

// Floor Sprites - werden lazy geladen
let _level2FloorSprite = null;
let _level3FloorSprite = null;
let _level4FloorSprite = null;

// Getter für Floor Sprites (Lazy Loading)
function getLevelFloorSprite(level) {
	switch(level) {
		case 2:
			if (!_level2FloorSprite) _level2FloorSprite = AssetManager.load("./Bodenlava.png", "level2");
			return _level2FloorSprite;
		case 3:
			if (!_level3FloorSprite) _level3FloorSprite = AssetManager.load("./Boden.png", "level3");
			return _level3FloorSprite;
		case 4:
			if (!_level4FloorSprite) _level4FloorSprite = AssetManager.load("./Bodengold.png", "level4");
			return _level4FloorSprite;
		default:
			return null;
	}
}

// Lazy-Getter für Kompatibilität mit altem Code
Object.defineProperty(window, 'LEVEL2_FLOOR_SPRITE', { get: () => getLevelFloorSprite(2) });
Object.defineProperty(window, 'LEVEL3_FLOOR_SPRITE', { get: () => getLevelFloorSprite(3) });
Object.defineProperty(window, 'LEVEL4_FLOOR_SPRITE', { get: () => getLevelFloorSprite(4) });

// ============================================================
// FLOOR HELPER FUNCTIONS (nutzen Lazy-Loading)
// ============================================================

function getLevel2FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	const sprite = getLevelFloorSprite(2);
	if (!sprite || !spriteReady(sprite)) return null;
	const scale = canvas.width / sprite.naturalWidth;
	const drawH = sprite.naturalHeight * scale;
	return canvas.height - drawH + LEVEL2_FLOOR_OFFSET;
}

function getLevel3FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	const sprite = getLevelFloorSprite(3);
	if (!sprite || !spriteReady(sprite)) return null;
	const scale = canvas.width / sprite.naturalWidth;
	const drawH = sprite.naturalHeight * scale;
	const floorTop = canvas.height - drawH + LEVEL3_FLOOR_OFFSET;
	const minTop = canvas.height - Math.min(drawH, LEVEL3_FLOOR_MIN_VISIBLE);
	return clamp(floorTop, 0, minTop);
}

function getLevel4FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	const sprite = getLevelFloorSprite(4);
	if (!sprite || !spriteReady(sprite)) return null;
	const scale = canvas.width / sprite.naturalWidth;
	const drawH = sprite.naturalHeight * scale;
	return canvas.height - drawH + LEVEL4_FLOOR_OFFSET;
}

function getLevel3GroundLine() {
	const floorTop = getLevel3FloorTop();
	if (floorTop == null) return null;
	const sprite = getLevelFloorSprite(3);
	if (!sprite) return null;
	const scale = canvas.width / sprite.naturalWidth;
	const drawH = sprite.naturalHeight * scale;
	const target = floorTop + drawH * LEVEL3_FLOOR_COLLISION_RATIO;
	const maxLine = canvas.height - LEVEL3_FLOOR_COLLISION_PAD;
	return clamp(target, floorTop, maxLine);
}

// Sprite-Pfade für Lazy Loading (werden NICHT sofort geladen)
const SPRITE_PATHS = {
	player: "./Player.png",
	cityPlayer: "./Playertopdown.png",
	foe: "./foe-jelly.png",
	boss: "./boss-shark.png",
	shot: "./player-shot.png",
	heal: "./heal-potion.png",
	bogenschreck: "./Aquischwer-Bogenschreck.png",
	parfumKraken: "./Parfüm-Kraken.png",
	ritterfisch: "./Ritterfisch.png",
	yachtwal: "./Yachtwal.png",
	oktopus: "./Oktopus.png",
	oktopusProjectile: "./Oktopuspfeil.png",
	cashfish: "./Cashfish.png",
	coverRock: "./Fels.png",
	symbolSchluessel: "./Schlüsselsymbol.png",
	symbolGeldschein: "./Geldscheinsymbol.png",
	symbolYacht: "./Yachtsymbol.png",
	backgroundLevelOne: "./Backgroundlvlone.png",
	coralAllyOne: "./Korallenbegleitereins.png",
	coralAllyTwo: "./Korallenbegleiterzwei.png",
	npcHaendler: "./Npc/Haendler.png",
	npcMission: "./Npc/Mission.png",
	standwaffen: "./Standwaffen.png",
	ruestungMeer: "./Ruestungmeer.png",
	queststand: "./Queststand.png",
	cityBackground: "./Stadthaus.webp"
};

// City Tiles Pfade
const CITY_TILE_PATHS = [
	"./Bodenstadt/openart-image_8vGhGSbW_1769841054304_raw.jpg",
	"./Bodenstadt/openart-image_jTCfEQu9_1769840885505_raw.jpg",
	"./Bodenstadt/openart-image_MifcQ_Zg_1769840721632_raw.jpg",
	"./Bodenstadt/openart-image_Sy6oko6r_1769840795864_raw.jpg",
	"./Bodenstadt/openart-image_umpSDvCE_1769841003548_raw.jpg",
	"./Bodenstadt/openart-image_YGBbUj_W_1769840721095_raw.jpg"
];

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
// Wird über window exportiert für Debug-Editor
window.CITY_WALKABLE_GRID = window.CITY_WALKABLE_GRID || {};
window.CITY_GRID_EDIT_MODE = false;
window.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
window.CITY_GRID_COLS = CITY_GRID_COLS;
window.CITY_GRID_ROWS = CITY_GRID_ROWS;

// ========== GEBÄUDE WALKABLE GRIDS ==========
// Begehbare Grid-Zellen für Marktplatz (645 Zellen)
window.BUILDING_WALKABLE_GRID_market = {
  "2,1": true, "3,1": true, "4,1": true, "5,1": true, "6,1": true, "7,1": true, "8,1": true, "9,1": true,
  "10,1": true, "11,1": true, "12,1": true, "13,1": true, "14,1": true, "15,1": true, "16,1": true, "17,1": true,
  "18,1": true, "19,1": true, "20,1": true, "21,1": true, "22,1": true, "23,1": true, "24,1": true, "25,1": true,
  "26,1": true, "27,1": true, "28,1": true, "29,1": true,
  "2,2": true, "3,2": true, "4,2": true, "5,2": true, "6,2": true, "7,2": true,
  "23,2": true, "24,2": true, "25,2": true, "26,2": true, "27,2": true, "28,2": true, "29,2": true,
  "2,3": true, "3,3": true, "4,3": true, "5,3": true, "6,3": true, "7,3": true, "8,3": true, "9,3": true,
  "10,3": true, "11,3": true, "12,3": true, "13,3": true, "14,3": true, "15,3": true, "16,3": true, "17,3": true,
  "18,3": true, "19,3": true, "20,3": true, "21,3": true, "22,3": true, "23,3": true, "24,3": true, "25,3": true,
  "26,3": true, "27,3": true, "28,3": true, "29,3": true,
  "2,4": true, "3,4": true, "4,4": true, "5,4": true, "6,4": true, "7,4": true, "8,4": true, "9,4": true,
  "10,4": true, "11,4": true, "12,4": true, "13,4": true, "14,4": true, "15,4": true, "16,4": true, "17,4": true,
  "18,4": true, "19,4": true, "20,4": true, "21,4": true, "22,4": true, "23,4": true, "24,4": true, "25,4": true,
  "26,4": true, "27,4": true, "28,4": true, "29,4": true,
  "2,5": true, "3,5": true, "4,5": true, "5,5": true, "6,5": true, "7,5": true, "8,5": true, "9,5": true,
  "10,5": true, "11,5": true, "12,5": true, "13,5": true, "14,5": true, "15,5": true, "16,5": true, "17,5": true,
  "18,5": true, "19,5": true, "20,5": true, "21,5": true, "22,5": true, "23,5": true, "24,5": true, "25,5": true,
  "26,5": true, "27,5": true, "28,5": true, "29,5": true,
  "14,6": true, "15,6": true, "16,6": true, "17,6": true,
  "14,7": true, "15,7": true, "16,7": true, "17,7": true,
  "2,8": true, "3,8": true, "4,8": true, "5,8": true, "6,8": true, "7,8": true, "8,8": true, "9,8": true,
  "10,8": true, "11,8": true, "12,8": true, "13,8": true, "14,8": true, "15,8": true, "16,8": true, "17,8": true,
  "18,8": true, "19,8": true, "20,8": true, "21,8": true, "22,8": true, "23,8": true, "24,8": true, "25,8": true,
  "26,8": true, "27,8": true, "28,8": true, "29,8": true,
  "2,9": true, "3,9": true, "4,9": true, "5,9": true, "6,9": true, "7,9": true, "8,9": true, "9,9": true,
  "10,9": true, "11,9": true, "12,9": true, "13,9": true, "14,9": true, "15,9": true, "16,9": true, "17,9": true,
  "18,9": true, "19,9": true, "20,9": true, "21,9": true, "22,9": true, "23,9": true, "24,9": true, "25,9": true,
  "26,9": true, "27,9": true, "28,9": true, "29,9": true,
  "2,10": true, "3,10": true, "4,10": true, "5,10": true, "6,10": true, "7,10": true, "8,10": true, "9,10": true,
  "10,10": true, "11,10": true, "12,10": true, "13,10": true, "14,10": true, "15,10": true, "16,10": true, "17,10": true,
  "18,10": true, "19,10": true, "20,10": true, "21,10": true, "22,10": true, "23,10": true, "24,10": true, "25,10": true,
  "26,10": true, "27,10": true, "28,10": true, "29,10": true,
  "14,11": true, "15,11": true, "16,11": true, "17,11": true,
  "14,12": true, "15,12": true, "16,12": true, "17,12": true,
  "2,13": true, "3,13": true, "4,13": true, "5,13": true, "6,13": true, "7,13": true, "8,13": true, "9,13": true,
  "10,13": true, "11,13": true, "12,13": true, "13,13": true, "14,13": true, "15,13": true, "16,13": true, "17,13": true,
  "18,13": true, "19,13": true, "20,13": true, "21,13": true, "22,13": true, "23,13": true, "24,13": true, "25,13": true,
  "26,13": true, "27,13": true, "28,13": true, "29,13": true,
  "2,14": true, "3,14": true, "4,14": true, "5,14": true, "6,14": true, "7,14": true, "8,14": true, "9,14": true,
  "10,14": true, "11,14": true, "12,14": true, "13,14": true, "14,14": true, "15,14": true, "16,14": true, "17,14": true,
  "18,14": true, "19,14": true, "20,14": true, "21,14": true, "22,14": true, "23,14": true, "24,14": true, "25,14": true,
  "26,14": true, "27,14": true, "28,14": true, "29,14": true,
  "2,15": true, "3,15": true, "4,15": true, "5,15": true, "6,15": true, "7,15": true, "8,15": true, "9,15": true,
  "10,15": true, "11,15": true, "12,15": true, "13,15": true, "14,15": true, "15,15": true, "16,15": true, "17,15": true,
  "18,15": true, "19,15": true, "20,15": true, "21,15": true, "22,15": true, "23,15": true, "24,15": true, "25,15": true,
  "26,15": true, "27,15": true, "28,15": true, "29,15": true,
  "2,16": true, "3,16": true, "4,16": true, "5,16": true, "6,16": true, "7,16": true, "8,16": true, "9,16": true,
  "10,16": true, "11,16": true, "12,16": true, "13,16": true, "14,16": true, "15,16": true, "16,16": true, "17,16": true,
  "18,16": true, "19,16": true, "20,16": true, "21,16": true, "22,16": true, "23,16": true, "24,16": true, "25,16": true,
  "26,16": true, "27,16": true, "28,16": true, "29,16": true,
  "2,17": true, "3,17": true, "4,17": true, "5,17": true, "6,17": true, "7,17": true, "8,17": true, "9,17": true,
  "10,17": true, "11,17": true, "12,17": true, "13,17": true, "14,17": true, "15,17": true, "16,17": true, "17,17": true,
  "18,17": true, "19,17": true, "20,17": true, "21,17": true, "22,17": true, "23,17": true, "24,17": true, "25,17": true,
  "26,17": true, "27,17": true, "28,17": true, "29,17": true,
  "2,18": true, "3,18": true, "4,18": true, "5,18": true, "6,18": true, "7,18": true, "8,18": true, "9,18": true,
  "10,18": true, "11,18": true, "12,18": true, "13,18": true, "14,18": true, "15,18": true, "16,18": true, "17,18": true,
  "18,18": true, "19,18": true, "20,18": true, "21,18": true, "22,18": true, "23,18": true, "24,18": true, "25,18": true,
  "26,18": true, "27,18": true, "28,18": true, "29,18": true,
  "2,19": true, "3,19": true, "4,19": true, "5,19": true, "6,19": true, "7,19": true, "8,19": true, "9,19": true,
  "10,19": true, "11,19": true, "12,19": true, "13,19": true, "14,19": true, "15,19": true, "16,19": true, "17,19": true,
  "18,19": true, "19,19": true, "20,19": true, "21,19": true, "22,19": true, "23,19": true, "24,19": true, "25,19": true,
  "26,19": true, "27,19": true, "28,19": true, "29,19": true,
  "2,20": true, "3,20": true, "4,20": true, "5,20": true, "6,20": true, "7,20": true, "8,20": true, "9,20": true,
  "10,20": true, "11,20": true, "12,20": true, "13,20": true, "14,20": true, "15,20": true, "16,20": true, "17,20": true,
  "18,20": true, "19,20": true, "20,20": true, "21,20": true, "22,20": true, "23,20": true, "24,20": true, "25,20": true,
  "26,20": true, "27,20": true, "28,20": true, "29,20": true,
  "2,21": true, "3,21": true, "4,21": true, "5,21": true, "6,21": true, "7,21": true, "8,21": true, "9,21": true,
  "10,21": true, "11,21": true, "12,21": true, "13,21": true, "14,21": true, "15,21": true, "16,21": true, "17,21": true,
  "18,21": true, "19,21": true, "20,21": true, "21,21": true, "22,21": true, "23,21": true, "24,21": true, "25,21": true,
  "26,21": true, "27,21": true, "28,21": true, "29,21": true,
  "14,22": true, "15,22": true, "16,22": true, "17,22": true,
  "14,23": true, "15,23": true, "16,23": true, "17,23": true,
  "0,24": true, "1,24": true, "2,24": true, "3,24": true, "4,24": true, "5,24": true, "6,24": true, "7,24": true,
  "8,24": true, "9,24": true, "10,24": true, "11,24": true, "12,24": true, "13,24": true, "14,24": true, "15,24": true,
  "16,24": true, "17,24": true, "18,24": true, "19,24": true, "20,24": true, "21,24": true, "22,24": true, "23,24": true,
  "24,24": true, "25,24": true, "26,24": true, "27,24": true, "28,24": true, "29,24": true, "30,24": true, "31,24": true,
  "0,25": true, "1,25": true, "2,25": true, "3,25": true, "4,25": true, "5,25": true, "6,25": true, "7,25": true,
  "8,25": true, "9,25": true, "10,25": true, "11,25": true, "12,25": true, "13,25": true, "14,25": true, "15,25": true,
  "16,25": true, "17,25": true, "18,25": true, "19,25": true, "20,25": true, "21,25": true, "22,25": true, "23,25": true,
  "24,25": true, "25,25": true, "26,25": true, "27,25": true, "28,25": true, "29,25": true, "30,25": true, "31,25": true,
  "0,26": true, "1,26": true, "2,26": true, "3,26": true, "4,26": true, "5,26": true, "6,26": true, "7,26": true,
  "8,26": true, "9,26": true, "10,26": true, "11,26": true, "12,26": true, "13,26": true, "14,26": true, "15,26": true,
  "16,26": true, "17,26": true, "18,26": true, "19,26": true, "20,26": true, "21,26": true, "22,26": true, "23,26": true,
  "24,26": true, "25,26": true, "26,26": true, "27,26": true, "28,26": true, "29,26": true, "30,26": true, "31,26": true,
  "0,27": true, "1,27": true, "2,27": true, "3,27": true, "4,27": true, "5,27": true, "6,27": true, "7,27": true,
  "8,27": true, "9,27": true, "10,27": true, "11,27": true, "12,27": true, "13,27": true, "14,27": true, "15,27": true,
  "16,27": true, "17,27": true, "18,27": true, "19,27": true, "20,27": true, "21,27": true, "22,27": true, "23,27": true,
  "24,27": true, "25,27": true, "26,27": true, "27,27": true, "28,27": true, "29,27": true, "30,27": true, "31,27": true,
  "0,28": true, "1,28": true, "2,28": true, "3,28": true, "4,28": true, "5,28": true, "6,28": true, "7,28": true,
  "8,28": true, "9,28": true, "10,28": true, "11,28": true, "12,28": true, "13,28": true, "14,28": true, "15,28": true,
  "16,28": true, "17,28": true, "18,28": true, "19,28": true, "20,28": true, "21,28": true, "22,28": true, "23,28": true,
  "24,28": true, "25,28": true, "26,28": true, "27,28": true, "28,28": true, "29,28": true, "30,28": true, "31,28": true
};

// Begehbare Grid-Zellen für Werkstatt (546 Zellen)
window.BUILDING_WALKABLE_GRID_workshop = {
  "1,0": true, "2,0": true, "3,0": true, "4,0": true, "5,0": true, "6,0": true, "7,0": true, "8,0": true,
  "9,0": true, "10,0": true, "11,0": true, "12,0": true, "13,0": true, "14,0": true, "15,0": true, "16,0": true,
  "17,0": true, "18,0": true, "19,0": true, "20,0": true, "21,0": true, "22,0": true, "23,0": true, "24,0": true,
  "25,0": true, "26,0": true, "27,0": true, "28,0": true, "29,0": true, "30,0": true,
  "1,1": true, "2,1": true, "3,1": true, "4,1": true, "5,1": true, "6,1": true, "7,1": true, "8,1": true,
  "14,1": true, "15,1": true, "16,1": true, "17,1": true, "18,1": true, "19,1": true, "20,1": true, "21,1": true,
  "22,1": true, "23,1": true, "24,1": true, "25,1": true, "26,1": true, "27,1": true, "28,1": true, "29,1": true, "30,1": true,
  "1,2": true, "2,2": true, "3,2": true, "4,2": true, "5,2": true, "6,2": true, "7,2": true, "8,2": true,
  "9,2": true, "10,2": true, "11,2": true, "12,2": true, "13,2": true, "14,2": true, "15,2": true, "16,2": true,
  "17,2": true, "18,2": true, "19,2": true, "20,2": true, "21,2": true, "22,2": true, "23,2": true, "24,2": true,
  "25,2": true, "26,2": true, "27,2": true, "28,2": true, "29,2": true, "30,2": true,
  "1,3": true, "2,3": true, "3,3": true, "4,3": true, "5,3": true, "6,3": true, "7,3": true, "8,3": true,
  "9,3": true, "10,3": true, "11,3": true, "12,3": true, "13,3": true, "14,3": true, "15,3": true, "16,3": true,
  "17,3": true, "18,3": true, "19,3": true, "20,3": true, "21,3": true, "22,3": true, "23,3": true, "24,3": true,
  "25,3": true, "26,3": true, "27,3": true, "28,3": true, "29,3": true, "30,3": true,
  "14,4": true, "15,4": true, "16,4": true, "17,4": true,
  "1,5": true, "2,5": true, "3,5": true, "4,5": true, "5,5": true, "6,5": true, "7,5": true, "8,5": true,
  "9,5": true, "10,5": true, "11,5": true, "12,5": true, "13,5": true, "14,5": true, "15,5": true, "16,5": true,
  "17,5": true, "18,5": true, "19,5": true, "20,5": true, "21,5": true, "22,5": true, "23,5": true, "24,5": true,
  "25,5": true, "26,5": true, "27,5": true, "28,5": true, "29,5": true, "30,5": true,
  "1,6": true, "2,6": true, "3,6": true, "4,6": true, "5,6": true, "6,6": true, "7,6": true, "8,6": true,
  "9,6": true, "10,6": true, "11,6": true, "12,6": true, "13,6": true, "14,6": true, "15,6": true, "16,6": true,
  "17,6": true, "18,6": true, "19,6": true, "20,6": true, "21,6": true, "22,6": true, "23,6": true, "24,6": true,
  "25,6": true, "26,6": true, "27,6": true, "28,6": true, "29,6": true, "30,6": true,
  "1,7": true, "2,7": true, "3,7": true, "4,7": true, "5,7": true, "6,7": true, "7,7": true, "8,7": true,
  "9,7": true, "10,7": true, "11,7": true, "12,7": true, "13,7": true, "14,7": true, "15,7": true, "16,7": true,
  "17,7": true, "18,7": true, "19,7": true, "20,7": true, "21,7": true, "22,7": true, "23,7": true, "24,7": true,
  "25,7": true, "26,7": true, "27,7": true, "28,7": true, "29,7": true, "30,7": true,
  "1,8": true, "2,8": true, "3,8": true, "4,8": true, "5,8": true, "6,8": true, "7,8": true, "8,8": true,
  "9,8": true, "10,8": true, "11,8": true, "12,8": true, "13,8": true, "14,8": true, "15,8": true, "16,8": true,
  "17,8": true, "18,8": true, "19,8": true, "20,8": true, "21,8": true, "22,8": true, "23,8": true, "24,8": true,
  "25,8": true, "26,8": true, "27,8": true, "28,8": true, "29,8": true, "30,8": true,
  "1,9": true, "2,9": true, "3,9": true, "4,9": true, "5,9": true, "6,9": true, "7,9": true, "8,9": true,
  "9,9": true, "10,9": true, "11,9": true, "12,9": true, "13,9": true, "14,9": true, "15,9": true, "16,9": true,
  "17,9": true, "18,9": true, "19,9": true, "20,9": true, "21,9": true, "22,9": true, "23,9": true, "24,9": true,
  "25,9": true, "26,9": true, "27,9": true, "28,9": true, "29,9": true, "30,9": true,
  "14,10": true, "15,10": true, "16,10": true, "17,10": true,
  "1,11": true, "2,11": true, "3,11": true, "4,11": true, "5,11": true, "6,11": true, "7,11": true, "8,11": true,
  "9,11": true, "10,11": true, "11,11": true, "12,11": true, "13,11": true, "14,11": true, "15,11": true, "16,11": true,
  "17,11": true, "18,11": true, "19,11": true, "20,11": true, "21,11": true, "22,11": true, "23,11": true, "24,11": true,
  "25,11": true, "26,11": true, "27,11": true, "28,11": true, "29,11": true, "30,11": true,
  "1,12": true, "2,12": true, "3,12": true, "4,12": true, "5,12": true, "6,12": true, "7,12": true, "8,12": true,
  "9,12": true, "10,12": true, "11,12": true, "12,12": true, "13,12": true, "14,12": true, "15,12": true, "16,12": true,
  "17,12": true, "18,12": true, "19,12": true, "20,12": true, "21,12": true, "22,12": true, "23,12": true, "24,12": true,
  "25,12": true, "26,12": true, "27,12": true, "28,12": true, "29,12": true, "30,12": true,
  "1,13": true, "2,13": true, "3,13": true, "4,13": true, "5,13": true, "6,13": true, "7,13": true, "8,13": true,
  "9,13": true, "10,13": true, "11,13": true, "12,13": true, "13,13": true, "14,13": true, "15,13": true, "16,13": true,
  "17,13": true, "18,13": true, "19,13": true, "20,13": true, "21,13": true, "22,13": true, "23,13": true, "24,13": true,
  "25,13": true, "26,13": true, "27,13": true, "28,13": true, "29,13": true, "30,13": true,
  "1,14": true, "2,14": true, "3,14": true, "4,14": true, "5,14": true, "6,14": true, "7,14": true, "8,14": true,
  "9,14": true, "10,14": true, "11,14": true, "12,14": true, "13,14": true, "14,14": true, "15,14": true, "16,14": true,
  "17,14": true, "18,14": true, "19,14": true, "20,14": true, "21,14": true, "22,14": true, "23,14": true, "24,14": true,
  "25,14": true, "26,14": true, "27,14": true, "28,14": true, "29,14": true, "30,14": true,
  "14,15": true, "15,15": true, "16,15": true, "17,15": true,
  "1,16": true, "2,16": true, "3,16": true, "4,16": true, "5,16": true, "6,16": true, "7,16": true, "8,16": true,
  "9,16": true, "10,16": true, "11,16": true, "12,16": true, "13,16": true, "14,16": true, "15,16": true, "16,16": true,
  "17,16": true, "18,16": true, "19,16": true, "20,16": true, "21,16": true, "22,16": true, "23,16": true, "24,16": true,
  "25,16": true, "26,16": true, "27,16": true, "28,16": true, "29,16": true, "30,16": true,
  "1,17": true, "2,17": true, "3,17": true, "4,17": true, "5,17": true, "6,17": true, "7,17": true, "8,17": true,
  "9,17": true, "10,17": true, "11,17": true, "12,17": true, "13,17": true, "14,17": true, "15,17": true, "16,17": true,
  "17,17": true, "18,17": true, "19,17": true, "20,17": true, "21,17": true, "22,17": true, "23,17": true, "24,17": true,
  "25,17": true, "26,17": true, "27,17": true, "28,17": true, "29,17": true, "30,17": true,
  "1,18": true, "2,18": true, "3,18": true, "4,18": true, "5,18": true, "6,18": true, "7,18": true, "8,18": true,
  "9,18": true, "10,18": true, "11,18": true, "12,18": true, "13,18": true, "14,18": true, "15,18": true, "16,18": true, "17,18": true,
  "18,18": true, "19,18": true, "20,18": true, "21,18": true, "22,18": true, "23,18": true, "24,18": true, "25,18": true,
  "26,18": true, "27,18": true, "28,18": true, "29,18": true, "30,18": true,
  "1,19": true, "2,19": true, "3,19": true, "4,19": true, "5,19": true, "6,19": true, "7,19": true, "8,19": true,
  "9,19": true, "10,19": true, "11,19": true, "12,19": true, "13,19": true, "14,19": true, "15,19": true, "16,19": true,
  "17,19": true, "18,19": true, "19,19": true, "20,19": true, "21,19": true, "22,19": true, "23,19": true, "24,19": true,
  "25,19": true, "26,19": true, "27,19": true, "28,19": true, "29,19": true, "30,19": true,
  "1,20": true, "2,20": true, "3,20": true, "4,20": true, "5,20": true, "6,20": true, "7,20": true, "8,20": true,
  "9,20": true, "10,20": true, "11,20": true, "12,20": true, "13,20": true, "14,20": true, "15,20": true, "16,20": true,
  "17,20": true, "18,20": true, "19,20": true, "20,20": true, "21,20": true, "22,20": true, "23,20": true, "24,20": true,
  "25,20": true, "26,20": true, "27,20": true, "28,20": true, "29,20": true, "30,20": true
};

// Begehbare Grid-Zellen für Hafen (404 Zellen)
window.BUILDING_WALKABLE_GRID_harbor = {
  "1,0": true, "2,0": true, "3,0": true, "4,0": true, "5,0": true, "6,0": true, "7,0": true, "8,0": true,
  "9,0": true, "10,0": true, "11,0": true, "12,0": true, "13,0": true, "14,0": true, "15,0": true, "16,0": true, "17,0": true,
  "1,1": true, "2,1": true, "3,1": true, "4,1": true, "5,1": true, "6,1": true, "7,1": true, "8,1": true,
  "15,1": true, "16,1": true, "17,1": true,
  "15,2": true, "16,2": true, "17,2": true,
  "15,3": true, "16,3": true, "17,3": true,
  "1,4": true, "2,4": true, "3,4": true, "4,4": true, "5,4": true, "6,4": true, "7,4": true, "8,4": true,
  "9,4": true, "10,4": true, "11,4": true, "12,4": true, "13,4": true, "14,4": true, "15,4": true, "16,4": true,
  "17,4": true, "18,4": true, "19,4": true, "20,4": true, "21,4": true,
  "1,5": true, "2,5": true, "3,5": true, "4,5": true, "5,5": true, "6,5": true, "7,5": true, "8,5": true,
  "9,5": true, "10,5": true, "11,5": true, "12,5": true, "13,5": true, "14,5": true, "15,5": true, "16,5": true,
  "17,5": true, "18,5": true, "19,5": true, "20,5": true, "21,5": true,
  "1,6": true, "2,6": true, "3,6": true, "4,6": true, "5,6": true, "6,6": true, "7,6": true, "8,6": true,
  "9,6": true, "10,6": true, "11,6": true, "12,6": true, "13,6": true, "14,6": true, "15,6": true, "16,6": true,
  "17,6": true, "18,6": true, "19,6": true, "20,6": true, "21,6": true,
  "1,7": true, "2,7": true, "3,7": true, "4,7": true, "5,7": true, "6,7": true, "7,7": true, "8,7": true,
  "9,7": true, "10,7": true, "11,7": true, "12,7": true, "13,7": true, "14,7": true, "15,7": true, "16,7": true,
  "17,7": true, "18,7": true, "19,7": true, "20,7": true, "21,7": true,
  "15,8": true, "16,8": true, "17,8": true,
  "1,9": true, "2,9": true, "3,9": true, "4,9": true, "5,9": true, "6,9": true, "7,9": true, "8,9": true,
  "9,9": true, "10,9": true, "11,9": true, "12,9": true, "13,9": true, "14,9": true, "15,9": true, "16,9": true,
  "17,9": true, "18,9": true, "19,9": true, "20,9": true,
  "1,10": true, "2,10": true, "3,10": true, "4,10": true, "5,10": true, "6,10": true, "7,10": true, "8,10": true,
  "9,10": true, "10,10": true, "11,10": true, "12,10": true, "13,10": true, "14,10": true, "15,10": true, "16,10": true,
  "17,10": true, "18,10": true, "19,10": true, "20,10": true,
  "1,11": true, "2,11": true, "3,11": true, "4,11": true, "5,11": true, "6,11": true, "7,11": true, "8,11": true,
  "9,11": true, "10,11": true, "11,11": true, "12,11": true, "13,11": true, "14,11": true, "15,11": true, "16,11": true,
  "17,11": true, "18,11": true, "19,11": true, "20,11": true,
  "1,12": true, "2,12": true, "3,12": true, "4,12": true, "5,12": true, "6,12": true, "7,12": true, "8,12": true,
  "9,12": true, "10,12": true, "11,12": true, "12,12": true, "13,12": true, "14,12": true, "15,12": true, "16,12": true,
  "17,12": true, "18,12": true, "19,12": true, "20,12": true,
  "1,13": true, "2,13": true, "3,13": true, "4,13": true, "5,13": true, "6,13": true, "7,13": true, "8,13": true,
  "9,13": true, "10,13": true, "11,13": true, "12,13": true, "13,13": true, "14,13": true, "15,13": true, "16,13": true,
  "17,13": true, "18,13": true, "19,13": true, "20,13": true,
  "15,14": true, "16,14": true, "17,14": true,
  "1,15": true, "2,15": true, "3,15": true, "4,15": true, "5,15": true, "6,15": true, "7,15": true, "8,15": true,
  "9,15": true, "10,15": true, "11,15": true, "12,15": true, "13,15": true, "14,15": true, "15,15": true, "16,15": true,
  "17,15": true, "18,15": true, "19,15": true, "20,15": true, "21,15": true, "22,15": true, "23,15": true, "24,15": true,
  "25,15": true, "26,15": true, "27,15": true, "28,15": true, "29,15": true, "30,15": true,
  "1,16": true, "2,16": true, "3,16": true, "4,16": true, "5,16": true, "6,16": true, "7,16": true, "8,16": true,
  "9,16": true, "10,16": true, "11,16": true, "12,16": true, "13,16": true, "14,16": true, "15,16": true, "16,16": true,
  "17,16": true, "18,16": true, "19,16": true, "20,16": true, "21,16": true, "22,16": true, "23,16": true, "24,16": true,
  "25,16": true, "26,16": true, "27,16": true, "28,16": true, "29,16": true, "30,16": true,
  "1,17": true, "2,17": true, "3,17": true, "4,17": true, "5,17": true, "6,17": true, "7,17": true, "8,17": true,
  "9,17": true, "10,17": true, "11,17": true, "12,17": true, "13,17": true, "14,17": true, "15,17": true, "16,17": true,
  "17,17": true, "18,17": true, "19,17": true, "20,17": true, "21,17": true, "22,17": true, "23,17": true, "24,17": true,
  "25,17": true, "26,17": true, "27,17": true, "28,17": true, "29,17": true, "30,17": true,
  "1,18": true, "2,18": true, "3,18": true, "4,18": true, "5,18": true, "6,18": true, "7,18": true, "8,18": true,
  "9,18": true, "10,18": true, "11,18": true, "12,18": true, "13,18": true, "14,18": true, "15,18": true, "16,18": true,
  "17,18": true, "18,18": true, "19,18": true, "20,18": true, "21,18": true, "22,18": true, "23,18": true, "24,18": true,
  "25,18": true, "26,18": true, "27,18": true, "28,18": true, "29,18": true, "30,18": true,
  "1,19": true, "2,19": true, "3,19": true, "4,19": true, "5,19": true, "6,19": true, "7,19": true, "8,19": true,
  "9,19": true, "10,19": true, "11,19": true, "12,19": true, "13,19": true, "14,19": true, "15,19": true, "16,19": true,
  "17,19": true, "18,19": true, "19,19": true, "20,19": true, "21,19": true, "22,19": true, "23,19": true, "24,19": true,
  "25,19": true, "26,19": true, "27,19": true, "28,19": true, "29,19": true, "30,19": true,
  "1,20": true, "2,20": true, "3,20": true, "4,20": true, "5,20": true, "6,20": true, "7,20": true, "8,20": true,
  "9,20": true, "10,20": true, "11,20": true, "12,20": true, "13,20": true, "14,20": true, "15,20": true, "16,20": true,
  "17,20": true, "18,20": true, "19,20": true, "20,20": true, "21,20": true, "22,20": true, "23,20": true, "24,20": true,
  "25,20": true, "26,20": true, "27,20": true, "28,20": true, "29,20": true, "30,20": true
};

// Begehbare Grid-Zellen für Akademie (555 Zellen)
window.BUILDING_WALKABLE_GRID_academy = {
  "1,0": true, "2,0": true, "3,0": true, "4,0": true, "5,0": true, "6,0": true, "7,0": true, "8,0": true,
  "9,0": true, "10,0": true, "11,0": true, "12,0": true, "13,0": true, "14,0": true, "15,0": true, "16,0": true,
  "17,0": true, "18,0": true, "19,0": true, "20,0": true, "21,0": true, "22,0": true, "23,0": true, "24,0": true,
  "25,0": true, "26,0": true, "27,0": true, "28,0": true, "29,0": true, "30,0": true,
  "1,1": true, "2,1": true, "3,1": true, "4,1": true, "5,1": true, "6,1": true, "7,1": true, "8,1": true,
  "9,1": true, "10,1": true, "11,1": true, "12,1": true, "13,1": true, "14,1": true, "15,1": true, "16,1": true,
  "17,1": true, "18,1": true, "19,1": true, "20,1": true, "21,1": true, "22,1": true, "23,1": true, "24,1": true,
  "25,1": true, "26,1": true, "27,1": true, "28,1": true, "29,1": true, "30,1": true,
  "1,2": true, "2,2": true, "3,2": true, "4,2": true, "5,2": true, "6,2": true, "7,2": true, "8,2": true,
  "9,2": true, "10,2": true, "11,2": true, "12,2": true, "13,2": true, "14,2": true, "15,2": true, "16,2": true,
  "17,2": true, "18,2": true, "19,2": true, "20,2": true, "21,2": true, "22,2": true, "23,2": true, "24,2": true,
  "25,2": true, "26,2": true, "27,2": true, "28,2": true, "29,2": true, "30,2": true,
  "1,3": true, "2,3": true, "3,3": true, "4,3": true, "5,3": true, "6,3": true, "7,3": true, "8,3": true,
  "9,3": true, "10,3": true, "11,3": true, "12,3": true, "13,3": true, "14,3": true, "15,3": true, "16,3": true,
  "17,3": true, "18,3": true, "19,3": true, "20,3": true, "21,3": true, "22,3": true, "23,3": true, "24,3": true,
  "25,3": true, "26,3": true, "27,3": true, "28,3": true, "29,3": true, "30,3": true,
  "14,4": true, "15,4": true, "16,4": true, "17,4": true,
  "1,5": true, "2,5": true, "3,5": true, "4,5": true, "5,5": true, "6,5": true, "7,5": true, "8,5": true,
  "9,5": true, "10,5": true, "11,5": true, "12,5": true, "13,5": true, "14,5": true, "15,5": true, "16,5": true,
  "17,5": true, "18,5": true, "19,5": true, "20,5": true, "21,5": true, "22,5": true, "23,5": true, "24,5": true,
  "25,5": true, "26,5": true, "27,5": true, "28,5": true, "29,5": true, "30,5": true,
  "1,6": true, "2,6": true, "3,6": true, "4,6": true, "5,6": true, "6,6": true, "7,6": true, "8,6": true,
  "9,6": true, "10,6": true, "11,6": true, "12,6": true, "13,6": true, "14,6": true, "15,6": true, "16,6": true,
  "17,6": true, "18,6": true, "19,6": true, "20,6": true, "21,6": true, "22,6": true, "23,6": true, "24,6": true,
  "25,6": true, "26,6": true, "27,6": true, "28,6": true, "29,6": true, "30,6": true,
  "1,7": true, "2,7": true, "3,7": true, "4,7": true, "5,7": true, "6,7": true, "7,7": true, "8,7": true,
  "9,7": true, "10,7": true, "11,7": true, "12,7": true, "13,7": true, "14,7": true, "15,7": true, "16,7": true,
  "17,7": true, "18,7": true, "19,7": true, "20,7": true, "21,7": true, "22,7": true, "23,7": true, "24,7": true,
  "25,7": true, "26,7": true, "27,7": true, "28,7": true, "29,7": true, "30,7": true,
  "1,8": true, "2,8": true, "3,8": true, "4,8": true, "5,8": true, "6,8": true, "7,8": true, "8,8": true,
  "9,8": true, "10,8": true, "11,8": true, "12,8": true, "13,8": true, "14,8": true, "15,8": true, "16,8": true,
  "17,8": true, "18,8": true, "19,8": true, "20,8": true, "21,8": true, "22,8": true, "23,8": true, "24,8": true,
  "25,8": true, "26,8": true, "27,8": true, "28,8": true, "29,8": true, "30,8": true,
  "1,9": true, "2,9": true, "3,9": true, "4,9": true, "5,9": true, "6,9": true, "7,9": true, "8,9": true,
  "9,9": true, "10,9": true, "11,9": true, "12,9": true, "13,9": true, "14,9": true, "15,9": true, "16,9": true,
  "17,9": true, "18,9": true, "19,9": true, "20,9": true, "21,9": true, "22,9": true, "23,9": true, "24,9": true,
  "25,9": true, "26,9": true, "27,9": true, "28,9": true, "29,9": true, "30,9": true,
  "14,10": true, "15,10": true, "16,10": true, "17,10": true,
  "1,11": true, "2,11": true, "3,11": true, "4,11": true, "5,11": true, "6,11": true, "7,11": true, "8,11": true,
  "9,11": true, "10,11": true, "11,11": true, "12,11": true, "13,11": true, "14,11": true, "15,11": true, "16,11": true,
  "17,11": true, "18,11": true, "19,11": true, "20,11": true, "21,11": true, "22,11": true, "23,11": true, "24,11": true,
  "25,11": true, "26,11": true, "27,11": true, "28,11": true, "29,11": true, "30,11": true,
  "1,12": true, "2,12": true, "3,12": true, "4,12": true, "5,12": true, "6,12": true, "7,12": true, "8,12": true,
  "9,12": true, "10,12": true, "11,12": true, "12,12": true, "13,12": true, "14,12": true, "15,12": true, "16,12": true,
  "17,12": true, "18,12": true, "19,12": true, "20,12": true, "21,12": true, "22,12": true, "23,12": true, "24,12": true,
  "25,12": true, "26,12": true, "27,12": true, "28,12": true, "29,12": true, "30,12": true,
  "1,13": true, "2,13": true, "3,13": true, "4,13": true, "5,13": true, "6,13": true, "7,13": true, "8,13": true,
  "9,13": true, "10,13": true, "11,13": true, "12,13": true, "13,13": true, "14,13": true, "15,13": true, "16,13": true,
  "17,13": true, "18,13": true, "19,13": true, "20,13": true, "21,13": true, "22,13": true, "23,13": true, "24,13": true,
  "25,13": true, "26,13": true, "27,13": true, "28,13": true, "29,13": true, "30,13": true,
  "1,14": true, "2,14": true, "3,14": true, "4,14": true, "5,14": true, "6,14": true, "7,14": true, "8,14": true,
  "9,14": true, "10,14": true, "11,14": true, "12,14": true, "13,14": true, "14,14": true, "15,14": true, "16,14": true,
  "17,14": true, "18,14": true, "19,14": true, "20,14": true, "21,14": true, "22,14": true, "23,14": true, "24,14": true,
  "25,14": true, "26,14": true, "27,14": true, "28,14": true, "29,14": true, "30,14": true,
  "14,15": true, "15,15": true, "16,15": true, "17,15": true,
  "1,16": true, "2,16": true, "3,16": true, "4,16": true, "5,16": true, "6,16": true, "7,16": true, "8,16": true,
  "9,16": true, "10,16": true, "11,16": true, "12,16": true, "13,16": true, "14,16": true, "15,16": true, "16,16": true,
  "17,16": true, "18,16": true, "19,16": true, "20,16": true, "21,16": true, "22,16": true, "23,16": true, "24,16": true,
  "25,16": true, "26,16": true, "27,16": true, "28,16": true, "29,16": true,
  "1,17": true, "2,17": true, "3,17": true, "4,17": true, "5,17": true, "6,17": true, "7,17": true, "8,17": true,
  "9,17": true, "10,17": true, "11,17": true, "12,17": true, "13,17": true, "14,17": true, "15,17": true, "16,17": true,
  "17,17": true, "18,17": true, "19,17": true, "20,17": true, "21,17": true, "22,17": true, "23,17": true, "24,17": true,
  "25,17": true, "26,17": true, "27,17": true, "28,17": true, "29,17": true,
  "1,18": true, "2,18": true, "3,18": true, "4,18": true, "5,18": true, "6,18": true, "7,18": true, "8,18": true,
  "9,18": true, "10,18": true, "11,18": true, "12,18": true, "13,18": true, "14,18": true, "15,18": true, "16,18": true,
  "17,18": true, "18,18": true, "19,18": true, "20,18": true, "21,18": true, "22,18": true, "23,18": true, "24,18": true,
  "25,18": true, "26,18": true, "27,18": true, "28,18": true, "29,18": true,
  "1,19": true, "2,19": true, "3,19": true, "4,19": true, "5,19": true, "6,19": true, "7,19": true, "8,19": true,
  "9,19": true, "10,19": true, "11,19": true, "12,19": true, "13,19": true, "14,19": true, "15,19": true, "16,19": true,
  "17,19": true, "18,19": true, "19,19": true, "20,19": true, "21,19": true, "22,19": true, "23,19": true, "24,19": true,
  "25,19": true, "26,19": true, "27,19": true, "28,19": true, "29,19": true,
  "1,20": true, "2,20": true, "3,20": true, "4,20": true, "5,20": true, "6,20": true, "7,20": true, "8,20": true,
  "9,20": true, "10,20": true, "11,20": true, "12,20": true, "13,20": true, "14,20": true, "15,20": true, "16,20": true,
  "17,20": true, "18,20": true, "19,20": true, "20,20": true, "21,20": true, "22,20": true, "23,20": true, "24,20": true,
  "25,20": true, "26,20": true, "27,20": true, "28,20": true, "29,20": true,
  "14,21": true, "15,21": true, "16,21": true, "17,21": true,
  "14,22": true, "15,22": true, "16,22": true, "17,22": true
};

// Begehbare Grid-Zellen für Gärtnerei (487 Zellen)
window.BUILDING_WALKABLE_GRID_garden = {
  "4,0": true, "5,0": true, "6,0": true, "7,0": true, "8,0": true, "9,0": true, "10,0": true, "11,0": true,
  "12,0": true, "13,0": true, "14,0": true, "15,0": true, "16,0": true, "17,0": true, "18,0": true, "19,0": true,
  "20,0": true, "21,0": true, "22,0": true, "23,0": true, "24,0": true, "25,0": true, "26,0": true,
  "4,1": true, "5,1": true, "6,1": true, "7,1": true, "8,1": true, "9,1": true, "10,1": true, "11,1": true,
  "12,1": true, "13,1": true, "14,1": true, "15,1": true, "16,1": true, "17,1": true, "18,1": true, "19,1": true,
  "20,1": true, "21,1": true, "22,1": true, "23,1": true, "24,1": true, "25,1": true, "26,1": true,
  "4,2": true, "5,2": true, "6,2": true, "7,2": true, "8,2": true, "9,2": true, "10,2": true, "11,2": true,
  "12,2": true, "13,2": true, "14,2": true, "15,2": true, "16,2": true, "17,2": true, "18,2": true, "19,2": true,
  "20,2": true, "21,2": true, "22,2": true, "23,2": true, "24,2": true, "25,2": true, "26,2": true,
  "4,3": true, "5,3": true, "6,3": true, "7,3": true, "8,3": true, "9,3": true, "10,3": true, "11,3": true,
  "12,3": true, "13,3": true, "14,3": true, "15,3": true, "16,3": true, "17,3": true, "18,3": true, "19,3": true,
  "20,3": true, "21,3": true, "22,3": true, "23,3": true, "24,3": true, "25,3": true, "26,3": true,
  "14,4": true, "15,4": true, "16,4": true, "17,4": true,
  "4,5": true, "5,5": true, "6,5": true, "7,5": true, "8,5": true, "9,5": true, "10,5": true, "11,5": true,
  "12,5": true, "13,5": true, "14,5": true, "15,5": true, "16,5": true, "17,5": true, "18,5": true, "19,5": true,
  "20,5": true, "21,5": true, "22,5": true, "23,5": true, "24,5": true, "25,5": true, "26,5": true,
  "4,6": true, "5,6": true, "6,6": true, "7,6": true, "8,6": true, "9,6": true, "10,6": true, "11,6": true,
  "12,6": true, "13,6": true, "14,6": true, "15,6": true, "16,6": true, "17,6": true, "18,6": true, "19,6": true,
  "20,6": true, "21,6": true, "22,6": true, "23,6": true, "24,6": true, "25,6": true, "26,6": true,
  "4,7": true, "5,7": true, "6,7": true, "7,7": true, "8,7": true, "9,7": true, "10,7": true, "11,7": true,
  "12,7": true, "13,7": true, "14,7": true, "15,7": true, "16,7": true, "17,7": true, "18,7": true, "19,7": true,
  "20,7": true, "21,7": true, "22,7": true, "23,7": true, "24,7": true, "25,7": true, "26,7": true,
  "4,8": true, "5,8": true, "6,8": true, "7,8": true, "8,8": true, "9,8": true, "10,8": true, "11,8": true,
  "12,8": true, "13,8": true, "14,8": true, "15,8": true, "16,8": true, "17,8": true, "18,8": true, "19,8": true,
  "20,8": true, "21,8": true, "22,8": true, "23,8": true, "24,8": true, "25,8": true, "26,8": true,
  "4,9": true, "5,9": true, "6,9": true, "7,9": true, "8,9": true, "9,9": true, "10,9": true, "11,9": true,
  "12,9": true, "13,9": true, "14,9": true, "15,9": true, "16,9": true, "17,9": true, "18,9": true, "19,9": true,
  "20,9": true, "21,9": true, "22,9": true, "23,9": true, "24,9": true, "25,9": true, "26,9": true,
  "14,10": true, "15,10": true, "16,10": true, "17,10": true,
  "0,11": true, "1,11": true, "2,11": true, "3,11": true, "4,11": true, "5,11": true, "6,11": true, "7,11": true,
  "8,11": true, "9,11": true, "10,11": true, "11,11": true, "12,11": true, "13,11": true, "14,11": true, "15,11": true,
  "16,11": true, "17,11": true, "18,11": true, "19,11": true, "20,11": true, "21,11": true, "22,11": true, "23,11": true,
  "24,11": true, "25,11": true, "26,11": true,
  "0,12": true, "1,12": true, "2,12": true, "3,12": true, "4,12": true, "5,12": true, "6,12": true, "7,12": true,
  "8,12": true, "9,12": true, "10,12": true, "11,12": true, "12,12": true, "13,12": true, "14,12": true, "15,12": true,
  "16,12": true, "17,12": true, "18,12": true, "19,12": true, "20,12": true, "21,12": true, "22,12": true, "23,12": true,
  "24,12": true, "25,12": true, "26,12": true,
  "0,13": true, "1,13": true, "2,13": true, "3,13": true, "4,13": true, "5,13": true, "6,13": true, "7,13": true,
  "8,13": true, "9,13": true, "10,13": true, "11,13": true, "12,13": true, "13,13": true, "14,13": true, "15,13": true,
  "16,13": true, "17,13": true, "18,13": true, "19,13": true, "20,13": true, "21,13": true, "22,13": true, "23,13": true,
  "24,13": true, "25,13": true, "26,13": true,
  "0,14": true, "1,14": true, "2,14": true, "3,14": true, "4,14": true, "5,14": true, "6,14": true, "7,14": true,
  "8,14": true, "9,14": true, "10,14": true, "11,14": true, "12,14": true, "13,14": true, "14,14": true, "15,14": true,
  "16,14": true, "17,14": true, "18,14": true, "19,14": true, "20,14": true, "21,14": true, "22,14": true, "23,14": true,
  "24,14": true, "25,14": true, "26,14": true,
  "14,15": true, "15,15": true, "16,15": true, "17,15": true,
  "0,16": true, "1,16": true, "2,16": true, "3,16": true, "4,16": true, "5,16": true, "6,16": true, "7,16": true,
  "8,16": true, "9,16": true, "10,16": true, "11,16": true, "12,16": true, "13,16": true, "14,16": true, "15,16": true,
  "16,16": true, "17,16": true, "18,16": true, "19,16": true, "20,16": true, "21,16": true, "22,16": true, "23,16": true,
  "24,16": true, "25,16": true, "26,16": true, "27,16": true, "28,16": true, "29,16": true, "30,16": true, "31,16": true,
  "0,17": true, "1,17": true, "2,17": true, "3,17": true, "4,17": true, "5,17": true, "6,17": true, "7,17": true,
  "8,17": true, "9,17": true, "10,17": true, "11,17": true, "12,17": true, "13,17": true, "14,17": true, "15,17": true,
  "16,17": true, "17,17": true, "18,17": true, "19,17": true, "20,17": true, "21,17": true, "22,17": true, "23,17": true,
  "24,17": true, "25,17": true, "26,17": true, "27,17": true, "28,17": true, "29,17": true, "30,17": true, "31,17": true,
  "0,18": true, "1,18": true, "2,18": true, "3,18": true, "4,18": true, "5,18": true, "6,18": true, "7,18": true,
  "8,18": true, "9,18": true, "10,18": true, "11,18": true, "12,18": true, "13,18": true, "14,18": true, "15,18": true,
  "16,18": true, "17,18": true, "18,18": true, "19,18": true, "20,18": true, "21,18": true, "22,18": true, "23,18": true,
  "24,18": true, "25,18": true, "26,18": true, "27,18": true, "28,18": true, "29,18": true, "30,18": true, "31,18": true,
  "0,19": true, "1,19": true, "2,19": true, "3,19": true, "4,19": true, "5,19": true, "6,19": true, "7,19": true,
  "8,19": true, "9,19": true, "10,19": true, "11,19": true, "12,19": true, "13,19": true, "14,19": true, "15,19": true,
  "16,19": true, "17,19": true, "18,19": true, "19,19": true, "20,19": true, "21,19": true, "22,19": true, "23,19": true,
  "24,19": true, "25,19": true, "26,19": true, "27,19": true, "28,19": true, "29,19": true, "30,19": true, "31,19": true,
  "0,20": true, "1,20": true, "2,20": true, "3,20": true, "4,20": true, "5,20": true, "6,20": true, "7,20": true,
  "8,20": true, "9,20": true, "10,20": true, "11,20": true, "12,20": true, "13,20": true, "14,20": true, "15,20": true,
  "16,20": true, "17,20": true, "18,20": true, "19,20": true, "20,20": true, "21,20": true, "22,20": true, "23,20": true,
  "24,20": true, "25,20": true, "26,20": true, "27,20": true, "28,20": true, "29,20": true, "30,20": true, "31,20": true
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

function drawPlayerFallback(ctx, x, y, opts = {}) {
	const scale = opts.scale == null ? 1 : opts.scale;
	const dir = opts.dir == null ? 1 : opts.dir;
	const accent = opts.accent || "#8df0ff";

	ctx.save();
	ctx.translate(x, y);
	ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	const tailGradient = ctx.createLinearGradient(-96, 0, -56, 0);
	tailGradient.addColorStop(0, "#052c3f");
	tailGradient.addColorStop(1, "#0e5a78");
	ctx.fillStyle = tailGradient;
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-102, -30, -68, -18);
	ctx.quadraticCurveTo(-74, -2, -78, -6);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-98, 18, -68, 10);
	ctx.quadraticCurveTo(-72, -2, -78, -6);
	ctx.closePath();
	ctx.fill();

	const bodyGradient = ctx.createLinearGradient(-78, 0, 72, 0);
	bodyGradient.addColorStop(1, accent);
	ctx.fillStyle = bodyGradient;
	ctx.beginPath();
	ctx.moveTo(-74, -8);
	ctx.quadraticCurveTo(-64, -36, -16, -42);
	ctx.quadraticCurveTo(48, -46, 76, -6);
	ctx.quadraticCurveTo(82, 16, 56, 34);
	ctx.quadraticCurveTo(4, 56, -34, 30);
	ctx.quadraticCurveTo(-70, 12, -74, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0d5780";
	ctx.beginPath();
	ctx.moveTo(-28, -26);
	ctx.quadraticCurveTo(-8, -54, 16, -30);
	ctx.quadraticCurveTo(-4, -22, -28, -26);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(-42, 10);
	ctx.quadraticCurveTo(-8, 0, 12, 18);
	ctx.quadraticCurveTo(-10, 26, -38, 20);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#d3f3ff";
	ctx.beginPath();
	ctx.moveTo(-32, 10);
	ctx.quadraticCurveTo(6, 32, 42, 12);
	ctx.quadraticCurveTo(8, -2, -32, 10);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a3e58";
	ctx.beginPath();
	ctx.moveTo(0, -10);
	ctx.lineTo(10, -36);
	ctx.lineTo(22, -12);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0c4c6d";
	ctx.beginPath();
	ctx.moveTo(4, 16);
	ctx.lineTo(20, 34);
	ctx.lineTo(26, 16);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a1e2d";
	ctx.beginPath();
	ctx.moveTo(34, -8);
	ctx.quadraticCurveTo(52, -2, 46, 8);
	ctx.quadraticCurveTo(30, 6, 34, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(34, -4, 7.6, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#1a4a72";
	ctx.beginPath();
	ctx.arc(36.2, -4.6, 4.4, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#081017";
	ctx.beginPath();
	ctx.arc(37.6, -5, 2.2, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	ctx.beginPath();
	ctx.arc(35, -6.4, 1.2, 0, TAU);
	ctx.fill();

	ctx.strokeStyle = "rgba(214,244,255,0.75)";
	ctx.lineWidth = 1.6 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(18, 2);
	ctx.quadraticCurveTo(12, 12, 6, 18);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(14, -6);
	ctx.quadraticCurveTo(8, -4, 2, -2);
	ctx.quadraticCurveTo(10, 0, 18, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(8, -12);
	ctx.lineTo(4, -8);
	ctx.lineTo(2, -4);
	ctx.stroke();

	ctx.strokeStyle = "rgba(15,53,70,0.65)";
	ctx.lineWidth = 1 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(-6, -6);
	ctx.quadraticCurveTo(-4, -2, -2, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-12, -8);
	ctx.quadraticCurveTo(-10, -4, -8, 0);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-18, -10);
	ctx.quadraticCurveTo(-16, -6, -14, -2);
	ctx.stroke();

	ctx.restore();
}

const MODELS = {
	player(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const dir = opts.dir == null ? 1 : opts.dir;
		const image = SPRITES.player;
		if (spriteReady(image)) {
			const baseScale = opts.spriteScale == null ? 0.16 : opts.spriteScale;
			const drawW = image.naturalWidth * baseScale;
			const drawH = image.naturalHeight * baseScale;
			const offsetX = opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX;
			const offsetY = opts.spriteOffsetY == null ? 0 : opts.spriteOffsetY;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
			ctx.drawImage(image, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		drawPlayerFallback(ctx, x, y, { scale, dir, accent: opts.accent });
	},
	boss(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const pulse = opts.pulse == null ? 0 : opts.pulse;
		const spriteKey = opts.spriteKey;
		const sprite = spriteKey && SPRITES[spriteKey] ? SPRITES[spriteKey] : SPRITES.boss;
		const flip = opts.flip == null ? true : !!opts.flip;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.22 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -20 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			if (flip) ctx.scale(-1, 1);
			ctx.rotate(Math.sin(pulse) * 0.04);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale((flip ? -1 : 1) * scale, scale);
		ctx.rotate(Math.sin(pulse) * 0.04);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const tailGradient = ctx.createLinearGradient(-170, 0, -120, 0);
		tailGradient.addColorStop(0, "#07141f");
		tailGradient.addColorStop(1, "#1b3242");
		ctx.fillStyle = tailGradient;
		ctx.beginPath();
		ctx.moveTo(-162, -6);
		ctx.quadraticCurveTo(-188, -42, -140, -28);
		ctx.quadraticCurveTo(-154, -6, -162, -6);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-160, -2);
		ctx.quadraticCurveTo(-184, 30, -138, 16);
		ctx.quadraticCurveTo(-150, -4, -160, -2);
		ctx.closePath();
		ctx.fill();

		const bodyGradient = ctx.createLinearGradient(-164, 0, 150, 0);
		bodyGradient.addColorStop(0, "#06111b");
		bodyGradient.addColorStop(0.45, "#1a2f41");
		bodyGradient.addColorStop(1, "#5a7e93");
		ctx.fillStyle = bodyGradient;
		ctx.beginPath();
		ctx.moveTo(-160, -20);
		ctx.quadraticCurveTo(-130, -70, -34, -76);
		ctx.quadraticCurveTo(60, -82, 140, -30);
		ctx.quadraticCurveTo(166, -6, 146, 26);
		ctx.quadraticCurveTo(118, 64, -38, 60);
		ctx.quadraticCurveTo(-122, 54, -160, -2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#1d374a";
		ctx.beginPath();
		ctx.moveTo(-74, -64);
		ctx.quadraticCurveTo(-24, -104, 34, -64);
		ctx.quadraticCurveTo(-12, -50, -74, -64);
		ctx.closePath();
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(-32, 18);
		ctx.quadraticCurveTo(-22, 10, -16, -6);
		ctx.quadraticCurveTo(-10, 4, -8, 18);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#ecf6ff";
		ctx.beginPath();
		ctx.moveTo(-40, -6);
		ctx.quadraticCurveTo(36, -36, 98, -12);
		ctx.quadraticCurveTo(44, 24, -26, 14);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#102231";
		ctx.beginPath();
		ctx.moveTo(94, -6);
		ctx.quadraticCurveTo(108, -4, 110, 8);
		ctx.quadraticCurveTo(94, 8, 94, -6);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#f5fbff";
		ctx.beginPath();
		ctx.arc(96, -6, 10, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "#1a3142";
		ctx.beginPath();
		ctx.arc(99, -6.6, 6, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "#070d12";
		ctx.beginPath();
		ctx.arc(101, -7, 2.8, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(97.2, -8.4, 1.6, 0, TAU);
		ctx.fill();

		ctx.fillStyle = "#f9fbff";
		ctx.beginPath();
		ctx.moveTo(54, 18);
		ctx.lineTo(86, 12);
		ctx.lineTo(94, 24);
		ctx.lineTo(60, 32);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(38, 22);
		ctx.lineTo(66, 20);
		ctx.lineTo(72, 36);
		ctx.lineTo(40, 36);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(33,56,74,0.85)";
		ctx.lineWidth = 3.2;
		ctx.beginPath();
		ctx.moveTo(28, -2);
		ctx.quadraticCurveTo(34, 0, 48, 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(16, -4);
		ctx.quadraticCurveTo(24, -2, 36, 0);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(6, -6);
		ctx.quadraticCurveTo(16, -4, 28, -2);
		ctx.stroke();

		ctx.strokeStyle = "rgba(243,249,255,0.7)";
		ctx.lineWidth = 3.2;
		ctx.beginPath();
		ctx.moveTo(-24, -6);
		ctx.quadraticCurveTo(44, -34, 110, -12);
		ctx.stroke();

		ctx.fillStyle = "#fefefe";
		ctx.beginPath();
		ctx.moveTo(32, 8);
		ctx.lineTo(70, 6);
		ctx.lineTo(66, 18);
		ctx.lineTo(50, 18);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "#132330";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(32, 8);
		ctx.lineTo(50, 18);
		ctx.lineTo(66, 18);
		ctx.lineTo(70, 6);
		ctx.stroke();

		ctx.fillStyle = "#fbffff";
		ctx.beginPath();
		ctx.moveTo(16, 6);
		for (let i = 0; i < 6; i += 1) {
			const x = 20 + i * 8;
			ctx.lineTo(x, 6 + (i % 2 === 0 ? 6 : 0));
			ctx.lineTo(x + 6, 6);
		}
		ctx.lineTo(16 + 6 * 8, 6);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(255,255,255,0.65)";
		ctx.lineWidth = 1.6;
		for (let i = 0; i < 4; i += 1) {
			ctx.beginPath();
			ctx.moveTo(-10 - i * 8, -10);
			ctx.lineTo(-8 - i * 8, 6);
			ctx.stroke();
		}

		ctx.restore();
	},
	foe(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.foe;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.15 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -6 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -6 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.08);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.18);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const tailGradient = ctx.createLinearGradient(-46, 0, -20, 0);
		tailGradient.addColorStop(0, "#0b2640");
		tailGradient.addColorStop(1, "#1e5d84");
		ctx.fillStyle = tailGradient;
		ctx.beginPath();
		ctx.moveTo(-40, -6);
		ctx.quadraticCurveTo(-60, -24, -30, -18);
		ctx.quadraticCurveTo(-36, -4, -40, -6);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-40, -4);
		ctx.quadraticCurveTo(-58, 18, -28, 12);
		ctx.quadraticCurveTo(-34, -2, -40, -4);
		ctx.closePath();
		ctx.fill();

		const bodyGradient = ctx.createLinearGradient(-36, 0, 36, 0);
		bodyGradient.addColorStop(0, "#112f49");
		bodyGradient.addColorStop(0.6, "#2d86bc");
		bodyGradient.addColorStop(1, "#79d5ff");
		ctx.fillStyle = bodyGradient;
		ctx.beginPath();
		ctx.moveTo(-36, -10);
		ctx.quadraticCurveTo(-12, -32, 24, -22);
		ctx.quadraticCurveTo(40, -8, 34, 12);
		ctx.quadraticCurveTo(10, 30, -24, 20);
		ctx.quadraticCurveTo(-38, 12, -36, -10);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#115273";
		ctx.beginPath();
		ctx.moveTo(-18, -18);
		ctx.quadraticCurveTo(-6, -40, 8, -22);
		ctx.quadraticCurveTo(-8, -16, -18, -18);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#b8ecff";
		ctx.beginPath();
		ctx.moveTo(-18, 2);
		ctx.quadraticCurveTo(6, 16, 20, 6);
		ctx.quadraticCurveTo(2, -6, -18, 2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#0a1b28";
		ctx.beginPath();
		ctx.arc(14, -4, 3.6, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(12.6, -5.2, 1.2, 0, TAU);
		ctx.fill();

		ctx.fillStyle = "#184b6d";
		ctx.beginPath();
		ctx.moveTo(-18, 10);
		ctx.lineTo(-10, 26);
		ctx.lineTo(-2, 12);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(170,214,255,0.55)";
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.moveTo(-4, -2);
		ctx.quadraticCurveTo(2, 2, 10, 4);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-10, -4);
		ctx.quadraticCurveTo(-4, 0, 2, 4);
		ctx.stroke();

		ctx.restore();
	},
	oktopus(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.oktopus;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.2 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -14 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.06);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.12);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const mantleGrad = ctx.createLinearGradient(-28, 0, 36, 0);
		mantleGrad.addColorStop(0, "#1a2d4d");
		mantleGrad.addColorStop(0.4, "#274a7e");
		mantleGrad.addColorStop(1, "#7cc6ff");
		ctx.fillStyle = mantleGrad;
		ctx.beginPath();
		ctx.moveTo(-26, -18);
		ctx.quadraticCurveTo(6, -36, 32, -10);
		ctx.quadraticCurveTo(14, 24, -18, 24);
		ctx.quadraticCurveTo(-34, 8, -26, -18);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(110,190,255,0.75)";
		ctx.lineWidth = 3.2;
		for (let i = 0; i < 4; i += 1) {
			const t = -8 + i * 6;
			ctx.beginPath();
			ctx.moveTo(-12 + t, 12 + i * 4);
			ctx.quadraticCurveTo(-2 + t * 0.4, 28 + i * 6, 8 + t * 0.2, 18 + i * 5);
			ctx.stroke();
		}

		ctx.fillStyle = "#0b1929";
		ctx.beginPath();
		ctx.arc(16, -6, 4, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(14.6, -7.4, 1.4, 0, TAU);
		ctx.fill();

		ctx.restore();
	},
	bogenschreck(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.bogenschreck;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.178 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -12 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.06);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.1);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const bodyGrad = ctx.createLinearGradient(-36, 0, 40, 0);
		bodyGrad.addColorStop(0, "#123051");
		bodyGrad.addColorStop(0.5, "#1f6c9f");
		bodyGrad.addColorStop(1, "#8be6ff");
		ctx.fillStyle = bodyGrad;
		ctx.beginPath();
		ctx.moveTo(-34, -14);
		ctx.quadraticCurveTo(-6, -34, 36, -10);
		ctx.quadraticCurveTo(22, 12, -18, 20);
		ctx.quadraticCurveTo(-38, 10, -34, -14);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#0d2134";
		ctx.beginPath();
		ctx.moveTo(18, -6);
		ctx.quadraticCurveTo(24, -10, 30, -4);
		ctx.quadraticCurveTo(26, 0, 18, -2);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "#f8fbff";
		ctx.lineWidth = 2.4;
		ctx.beginPath();
		ctx.moveTo(-10, -20);
		ctx.quadraticCurveTo(12, -4, 30, 12);
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(24, 4, 12, -Math.PI / 3, Math.PI / 2);
		ctx.stroke();

		ctx.strokeStyle = "#dfc49a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(8, -4);
		ctx.quadraticCurveTo(16, -2, 24, 4);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-12, 4);
		ctx.quadraticCurveTo(0, 0, 8, -4);
		ctx.stroke();

		ctx.fillStyle = "#092031";
		ctx.beginPath();
		ctx.arc(12, -6, 3.2, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.8)";
		ctx.beginPath();
		ctx.arc(10.8, -7.2, 1.2, 0, TAU);
		ctx.fill();

		ctx.restore();
	},
		ritterfisch(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const charging = !!opts.charging;
			const sprite = SPRITES.ritterfisch;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.18 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(Math.sin(sway) * 0.05 + (charging ? Math.sin(performance.now() * 0.01) * 0.04 : 0));
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.12);
			const bodyGradient = ctx.createLinearGradient(-32, 0, 26, 0);
			bodyGradient.addColorStop(0, "#0d2034");
			bodyGradient.addColorStop(0.6, "#264b6f");
			bodyGradient.addColorStop(1, "#7da3d8");
			ctx.fillStyle = bodyGradient;
			ctx.beginPath();
			ctx.moveTo(-30, -12);
			ctx.quadraticCurveTo(-4, -34, 32, -10);
			ctx.quadraticCurveTo(12, 22, -20, 22);
			ctx.quadraticCurveTo(-34, 8, -30, -12);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#0a1522";
			ctx.beginPath();
			ctx.arc(18, -6, 3.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.82)";
			ctx.beginPath();
			ctx.arc(16.8, -7.4, 1.2, 0, TAU);
			ctx.fill();

			ctx.strokeStyle = "#d2ecff";
			ctx.lineWidth = 2.4;
			ctx.beginPath();
			ctx.moveTo(-6, -14);
			ctx.quadraticCurveTo(20, -8, 30, 12);
			ctx.stroke();

			ctx.restore();
		},
	simpleShadow(ctx, x, y, radius) {
		ctx.save();
		ctx.translate(x, y);
		const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
		grad.addColorStop(0, "rgba(0,0,0,0.35)");
		grad.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, TAU);
		ctx.fill();
		ctx.restore();
	},

	sparkle(ctx, x, y, opts = {}) {
		const radius = opts.radius == null ? 8 : opts.radius;
		const inner = radius * 0.2;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(opts.rotation || 0);
		const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, radius);
		gradient.addColorStop(0, "rgba(210,255,255,0.9)");
		gradient.addColorStop(0.6, "rgba(140,220,240,0.6)");
		gradient.addColorStop(1, "rgba(100,200,230,0)");
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, TAU);
		ctx.fill();
		ctx.restore();
	}
};

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
	let cityInventoryEl = document.getElementById("cityInventory");
	if (!cityInventoryEl) {
		cityInventoryEl = document.createElement("aside");
		cityInventoryEl.id = "cityInventory";
		cityInventoryEl.className = "city-inventory";
		cityInventoryEl.setAttribute("aria-label", "Inventar");
		cityInventoryEl.innerHTML = `
			<div class="city-inventory-title">Inventar <span class="city-inventory-sub">I</span></div>
			<div class="city-inventory-section">
				<div class="city-inventory-sub">Ausrüstung</div>
				<div class="city-equip-grid">
					<div class="city-slot" data-slot="weapon">Waffe</div>
					<div class="city-slot" data-slot="armor">Rüstung</div>
					<div class="city-slot" data-slot="armor2">Rüstung II</div>
				</div>
			</div>
			<div class="city-inventory-section">
				<div class="city-inventory-sub">Inventar</div>
				<div class="city-inventory-grid">
					<div class="city-slot" data-slot="inv-1"><span class="city-slot-label">Slot 1</span></div>
					<div class="city-slot" data-slot="inv-2"><span class="city-slot-label">Slot 2</span></div>
					<div class="city-slot" data-slot="inv-3"><span class="city-slot-label">Slot 3</span></div>
					<div class="city-slot" data-slot="inv-4"><span class="city-slot-label">Slot 4</span></div>
					<div class="city-slot" data-slot="inv-5"><span class="city-slot-label">Slot 5</span></div>
					<div class="city-slot" data-slot="inv-6"><span class="city-slot-label">Slot 6</span></div>
					<div class="city-slot" data-slot="inv-7"><span class="city-slot-label">Slot 7</span></div>
					<div class="city-slot" data-slot="inv-8"><span class="city-slot-label">Slot 8</span></div>
					<div class="city-slot" data-slot="inv-9"><span class="city-slot-label">Slot 9</span></div>
				</div>
			</div>
		`;
		document.body.appendChild(cityInventoryEl);
	}
	let cityMerchantEl = document.getElementById("cityMerchant");
	if (!cityMerchantEl) {
		cityMerchantEl = document.createElement("aside");
		cityMerchantEl.id = "cityMerchant";
		cityMerchantEl.className = "city-merchant";
		cityMerchantEl.setAttribute("aria-label", "Händler");
		cityMerchantEl.innerHTML = `
			<div class="city-merchant-title">
				<span>Händler</span>
				<span class="city-merchant-actions">
					<button class="btn" data-action="close-merchant">Schließen</button>
				</span>
			</div>
			<div class="city-merchant-grid" id="cityMerchantGrid"></div>
			<div class="city-merchant-confirm" id="cityMerchantConfirm">
				<div class="city-merchant-confirm-text" id="cityMerchantConfirmText">Item kaufen?</div>
				<div class="city-merchant-confirm-preview" id="cityMerchantConfirmPreview"></div>
				<div class="city-merchant-confirm-effect" id="cityMerchantConfirmEffect"></div>
				<div class="city-merchant-confirm-actions">
					<button class="btn primary" data-action="buy-item">Kaufen</button>
					<button class="btn" data-action="cancel-buy">Abbrechen</button>
				</div>
			</div>
		`;
		document.body.appendChild(cityMerchantEl);
	}
	let cityMissionEl = document.getElementById("cityMission");
	if (!cityMissionEl) {
		cityMissionEl = document.createElement("aside");
		cityMissionEl.id = "cityMission";
		cityMissionEl.className = "city-mission";
		cityMissionEl.setAttribute("aria-label", "Missionen");
		cityMissionEl.innerHTML = `
			<div class="city-mission-title">
				<span>Missionen</span>
				<span class="city-mission-actions">
					<button class="btn" data-action="close-mission">Schließen</button>
				</span>
			</div>
			<div class="city-mission-list" id="cityMissionList"></div>
			<div class="city-mission-confirm" id="cityMissionConfirm">
				<div class="city-mission-confirm-text" id="cityMissionConfirmText">Mission starten?</div>
				<div class="city-mission-confirm-actions">
					<button class="btn primary" data-action="start-mission">Ja</button>
					<button class="btn" data-action="cancel-mission">Nein</button>
				</div>
			</div>
		`;
		document.body.appendChild(cityMissionEl);
	}

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

	// Wrapper-Funktionen für Rückwärtskompatibilität
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
	const ARMOR_ITEM_EFFECT = CITY_ITEM_DATA[ARMOR_ITEM_NAME].effect;
	const ARMOR_ITEM_ICON = CITY_ITEM_DATA[ARMOR_ITEM_NAME].icon;

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

	// Für Rückwärtskompatibilität: Wrapper-Funktionen
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

	// Event-Listener über das Modul einrichten
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

	// Keyboard-Handler für Talentbaum (U-Taste)
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

	// Click-Handler für XP-Anzeige
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
			triggerEventFlash("unlock", { text: "Neue Fähigkeit: Schutzschild", duration: 1500, opacity: 0.86 });
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
			triggerEventFlash("cover", { text: "Felsbrocken fällt!", duration: 1100, opacity: 0.75 });
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
	// für zukünftige Erweiterungen mit einem Build-System (Vite)
	// ============================================================
	// ============================================================
	// LEVEL_CONFIGS ausgelagert nach src/game/levels.js
	// Wrapper-Funktionen delegieren ans levels-Modul
	// ============================================================

	// Getter für LEVEL_CONFIGS.length (wird vom levels-Modul bereitgestellt)
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

	// spawnOktopusBolt und spawnBogenschreckArrow → ausgelagert nach src/foes/arrows.js
	// Werden über foeArrows.spawnOktopusBolt() und foeArrows.spawnBogenschreckArrow() aufgerufen

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

	// Context für Stadt-State-Erstellung
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
		if (endTitle) endTitle.textContent = titleText || "Danke fürs Spielen!";
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
		if (hudHearts) hudHearts.textContent = "❤".repeat(state.hearts);
		if (hudTime) hudTime.textContent = (state.elapsed / 1000).toFixed(1);
		if (bannerEl && state.boss.active) bannerEl.textContent = `Bosskampf – HP ${state.boss.hp}/${state.boss.maxHp}`;
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
				hudShield.textContent = "🛡";
			}
			if (!unlocked) hudShield.title = "Schild (Shift/E) – besiege Boss 1";
			else if (player.shieldActive) hudShield.title = "Schild aktiv";
			else if (player.shieldCooldown > 0) hudShield.title = `Schild lädt (${Math.ceil(player.shieldCooldown / 1000)}s)`;
			else hudShield.title = "Schild bereit (Shift/E)";
		}
		if (hudArmor) {
			const armorEquipped = cityInventory.equipment.armor === ARMOR_ITEM_NAME;
			const armorReady = armorEquipped && state.armorShieldCharges > 0 && state.mode === "game";
			hudArmor.classList.toggle("active", armorReady);
			hudArmor.classList.toggle("inactive", !armorReady);
			hudArmor.style.display = armorEquipped ? "inline-flex" : "none";
			hudArmor.title = armorEquipped ? (armorReady ? "Rüstung aktiv – nächster Treffer wird neutralisiert" : "Rüstung verbraucht (lädt in der Stadt)") : "";
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

	// City Update Context - für das ausgelagerte Modul
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

	// Wrapper für updateCity - nutzt das importierte Modul
	function updateCity(dt) {
		updateCityModule(cityUpdateCtx, dt);
	}

	// Cover-Rock-Funktionen - delegieren an das Cover-Rock-Modul (Wrapper für Hoisting)
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
		
		// Spatial Grid: Alle Grids aktualisieren für effiziente Kollisionserkennung
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
			triggerEventFlash("armorBlock", { text: "Rüstung schützt!", duration: 1200, opacity: 0.9 });
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
		
		// XP für besiegten Gegner vergeben
		const xpGained = progressionSystem.awardXP(foe.type || 'default');
		
		if (!state.boss.active && state.levelScore >= state.unlockBossScore && bannerEl) {
			bannerEl.textContent = "Boss wittert deine Präsenz...";
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

	// Context-Objekt für das Render-Modul
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

	// Context-Objekt für das Game-Render-Modul
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

	// Context-Objekt für das Boss-Render-Modul
	const bossRenderCtx = {
		get ctx() { return ctx; },
		get canvas() { return canvas; },
		get state() { return state; }
	};
	const bossRenderer = createBossRenderSystem(bossRenderCtx);

	// Context-Objekt für das Boss-Spawn-Modul
	const bossSpawnCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		findCoverRockHit,
		registerCoverRockImpact,
		triggerEventFlash
	};
	const bossSpawner = createBossSpawnSystem(bossSpawnCtx);

	// Context-Objekt für das Boss-Update-Modul
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

	// Context-Objekt für das Boss-Collision-Modul
	const bossCollisionCtx = {
		getCanvas: () => canvas,
		getState: () => state,
		damagePlayer,
		winGame,
		updateBannerEl: text => { if (bannerEl) bannerEl.textContent = text; },
		spawnFragranceCloud: (x, y, opts) => bossSpawner.spawnFragranceCloud(x, y, opts)
	};
	const bossCollision = createBossCollisionSystem(bossCollisionCtx);

	// Context-Objekt für das Boss-UI-Modul
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

	// Context-Objekt für das Foes-Arrows-Modul
	const foeArrowsCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		findCoverRockHit,
		registerCoverRockImpact,
		USE_CLASSIC_OKTOPUS_PROJECTILE
	};
	const foeArrows = createFoeArrowsSystem(foeArrowsCtx);

	// Context-Objekt für das Foes-Spawn-Modul
	const foeSpawnCtx = {
		get canvas() { return canvas; },
		get state() { return state; },
		clamp
	};
	const foeSpawner = createFoeSpawnSystem(foeSpawnCtx);

	// Context-Objekt für das Foes-Update-Modul
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

	// Context-Objekt für das Foes-Render-Modul
	const foeRenderCtx = {
		get ctx() { return ctx; },
		get state() { return state; },
		get MODELS() { return MODELS; },
		get SPRITES() { return SPRITES; },
		spriteReady
	};
	const foeRenderer = createFoeRenderSystem(foeRenderCtx);

	// Context-Objekt für das Foes-Collision-Modul
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
		// Building-Modus (Gebäude-Szene)
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
		// Delta-Time Capping: Verhindert Physik-Sprünge bei Tab-Wechsel oder Lag
		const rawDt = now - state.lastTick;
		const dt = clamp(rawDt, MIN_DELTA_TIME, MAX_DELTA_TIME);
		
		// Tab-Wechsel Erkennung: Wenn rawDt sehr groß war, Reset-Logik
		if (rawDt > LONG_FRAME_THRESHOLD) {
			// Optional: Logging für Debug-Zwecke
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
				// Buildings-Manager auch in Stadt updaten (für Teleporter)
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
		// Buildings-Manager Keyboard-Handler (Map, Teleporter, Gebäude)
		if (state.mode === "city" || state.mode === "building") {
			if (buildingsManager.handleKeyDown(event.key, event.code)) {
				event.preventDefault();
				return;
			}
		}
		
		if (state.mode === "city") {
			// Inventar öffnen/schließen
			if (event.key === "i" || event.key === "I") {
				cityUI.setInventoryOpen(!cityUI.isInventoryOpen());
				if (bannerEl) bannerEl.textContent = cityUI.isInventoryOpen() ? "Inventar geöffnet (I)" : "Inventar geschlossen";
				event.preventDefault();
				return;
			}
		}
		if (isCityShortcutCandidate(event)) {
			const modeLabel = state.started ? (state.mode === "city" ? "city" : "game") : "title";
			const keyInfo = `${event.key || "?"}/${event.code || "?"}`;
			if (bannerEl) bannerEl.textContent = `Shortcut erkannt (${keyInfo}) – Modus: ${modeLabel}`;
			const bootToast = document.getElementById("bootToast");
			if (bootToast) bootToast.textContent = `Taste erkannt: ${keyInfo} – Modus: ${modeLabel}`;
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
		// Building-Modus: Grid-Editor und Debug-Drag haben Priorität
		if (state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleMouseDown(x, y, event.button)) {
				// Pointer-Capture für kontinuierliches Malen
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
			
			// Kamera-Offset berücksichtigen für Welt-Koordinaten
			const cameraX = city.camera ? city.camera.x : 0;
			const cameraY = city.camera ? city.camera.y : 0;
			const worldX = localX + cameraX;
			const worldY = localY + cameraY;
			
			// Klick auf NPCs prüfen (Seitenansicht - keine Perspektiv-Korrektur nötig)
			const npcClickRadius = 100;
			
			const merchant = city.npcs && city.npcs.find(npc => npc.id === "merchant");
			if (merchant) {
				const dist = Math.hypot(worldX - merchant.x, worldY - merchant.y);
				if (dist <= npcClickRadius) {
					cityUI.setShopOpen(true);
					updateCityShopUI();
					if (bannerEl) bannerEl.textContent = "Händler geöffnet";
					return;
				}
			}
			const questGiver = city.npcs && city.npcs.find(npc => npc.id === "quest");
			if (questGiver) {
				const dist = Math.hypot(worldX - questGiver.x, worldY - questGiver.y);
				if (dist <= npcClickRadius) {
					cityUI.setMissionOpen(true);
					updateCityMissionUI();
					if (bannerEl) bannerEl.textContent = "Missionen geöffnet";
					return;
				}
			}
			// Upgrade-NPC
			const upgradeNpc = city.npcs && city.npcs.find(npc => npc.id === "upgrade");
			if (upgradeNpc) {
				const dist = Math.hypot(worldX - upgradeNpc.x, worldY - upgradeNpc.y);
				if (dist <= npcClickRadius) {
					upgradeUI.show();
					if (bannerEl) bannerEl.textContent = "Upgrade-Schmiede geöffnet";
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
	
	// Mouse-Events für Buildings-Manager (Karte) und Grid-Editor
	canvas.addEventListener("pointermove", event => {
		const rect = canvas.getBoundingClientRect();
		// Skalierung berücksichtigen wenn Canvas anders skaliert ist
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
	
	// Mouse-Events für Building Debug-Drag-Mode und Grid-Editor
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
	
	// Rechtsklick-Menü verhindern im Building-Modus (für Grid-Editor)
	canvas.addEventListener("contextmenu", event => {
		if (state.mode === "building") {
			event.preventDefault();
		}
	});
	
	document.addEventListener("pointerup", (event) => {
		pointer.down = false;
		pointer.shoot = false;
		// Building Grid-Editor beenden (auch wenn Maus außerhalb des Canvas)
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
		// Debug-Funktion: Hole Stadt-Daten für Floor-Editor
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
