// ============================================================
// SHARED STATE – Central state for cross-module communication
// ============================================================
// Ersetzt window.* Globals durch ein importierbares Modul.
// Alle Module importieren dieses Objekt statt window.* zu lesen/setzen.
// ============================================================
"use strict";

/**
 * Zentraler State für die Kommunikation zwischen Modulen.
 * Jede Eigenschaft war vorher ein window.* Global.
 */
const sharedState = {
	// --- Charakterauswahl (characterSelect ↔ cutscene ↔ game) ---
	selectedCharacter: 'player',
	characterSprites: {},
	characterConfirmed: false,

	// --- Callbacks (gesetzt von einem Modul, aufgerufen von einem anderen) ---
	startCutscene: null,        // cutscene.js → characterSelect.js
	resetPlayerSpriteCache: null, // game.js → characterSelect.js
	bootGame: null,             // game.js → cutscene.js
	cashBeginGame: null,        // game.js → cutscene.js
	cashResetGame: null,        // game.js → cutscene.js

	// --- City Walkable Grid (game ↔ gridEditor ↔ city/render ↔ city/update) ---
	CITY_WALKABLE_GRID: {},
	CITY_GRID_EDIT_MODE: false,
	CITY_GRID_CELL_SIZE: 50,
	CITY_GRID_COLS: 32,
	CITY_GRID_ROWS: 29,

	// --- City Debug Info (city/render → gridEditor) ---
	CITY_CAMERA_X_DEBUG: 0,
	CITY_CAMERA_Y_DEBUG: 0,
	CITY_BUILDING_X_DEBUG: 100,
	CITY_BUILDING_Y_DEBUG: -765,
	CITY_PLAYER_DEBUG: null,
	CITY_HINT_HITBOXES: [],
	nearTeleporter: false,
	hubOpen: false,
	dungeonDepth: 0,

	// --- Grid Editor State ---
	CITY_PLAYER_DRAG_MODE: false,
	isDraggingPlayer: false,
	playerDragOffset: { x: 0, y: 0 },
	DRAG_REFERENCE_POINT: null,

	// --- Building Walkable Grids (game → buildingScene) ---
	buildingWalkableGrids: {},

	// --- Animation (jetzt immer aktiv über playerAnimation.js) ---

	// --- Floor Debug (Konsolen-Variablen → city/render) ---
	SHOW_FLOOR_DEBUG_LINES: false,
	FLOOR_LINE_OFFSET: 0,
	FLOOR_LINE_INDIVIDUAL_OFFSETS: {},
	CITY_FLOORS_DEBUG: [],

	// --- Building Debug (buildingScene) ---
	BUILDING_LAST_ERROR: null,
	BUILDING_ERROR_STACK: [],

	// --- Talent UI (HTML onclick → talentUI.js) ---
	closeTalentTree: null,
	investTalent: null,
	resetTalents: null,

	// --- Debug Console Commands (game.js → Browser-Konsole) ---
	cashSpawnBogenschreck: null,
	cashDebugJumpLevel: null,
	cashEnterCity: null,
	cashGetCityData: null,
};

export default sharedState;
