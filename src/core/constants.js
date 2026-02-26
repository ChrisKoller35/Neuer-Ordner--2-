// ============================================================
// CONSTANTS - Spielkonstanten
// ============================================================

export const TAU = Math.PI * 2;

// Default Boss Stats
export const DEFAULT_BOSS_STATS = {
	maxHp: 20,
	speed: 0.18,
	firstAttackDelay: 2400
};

// Tastenbelegung
export const KEY_LEFT = new Set(["ArrowLeft", "a", "A"]);
export const KEY_RIGHT = new Set(["ArrowRight", "d", "D"]);
export const KEY_UP = new Set(["ArrowUp", "w", "W"]);
export const KEY_DOWN = new Set(["ArrowDown", "s", "S"]);
export const KEY_SHIELD = new Set(["Shift", "e", "E"]);
export const CODE_SHIELD = new Set(["ShiftLeft", "ShiftRight", "KeyE"]);
export const KEY_CORAL = new Set(["r", "R"]);
export const CODE_CORAL = new Set(["KeyR"]);
export const KEY_TSUNAMI = new Set(["t", "T"]);
export const CODE_TSUNAMI = new Set(["KeyT"]);
export const KEY_SHOOT = new Set([" ", "Space"]);
export const CODE_SHOOT = new Set(["Space"]);
export const KEY_TALENT_TREE = new Set(["u", "U"]);
export const CODE_TALENT_TREE = new Set(["KeyU"]);
export const KEY_DASH_CURRENT = new Set(["q", "Q"]);
export const CODE_DASH_CURRENT = new Set(["KeyQ"]);
export const KEY_DEPTH_MINE = new Set(["x", "X"]);
export const CODE_DEPTH_MINE = new Set(["KeyX"]);
export const KEY_TIME_BUBBLE = new Set(["c", "C"]);
export const CODE_TIME_BUBBLE = new Set(["KeyC"]);

// Stadt-Konstanten
export const CITY_SCALE = 3;
export const CITY_VIEW_ZOOM = 0.85;
export const CITY_SPEED = 0.26;
export const CITY_PLAYER_RADIUS = 18;

// Spielmechanik
export const FOE_BASE_SCORE = 5;
export const SHIELD_DURATION = 3000;
export const SHIELD_COOLDOWN = 9000;

// Level-spezifische Offsets
export const LEVEL2_FLOOR_OFFSET = 275;
export const LEVEL3_FLOOR_OFFSET = 120;
export const LEVEL4_FLOOR_OFFSET = 320;
export const LEVEL3_FLOOR_MIN_VISIBLE = 60;
export const LEVEL3_FLOOR_COLLISION_RATIO = 1;
export const LEVEL3_FLOOR_COLLISION_PAD = 0;

// ============================================================
// TIMING CONSTANTS - Delta-Time and Frame Rate
// ============================================================

/**
 * Maximum delta-time per frame (ms)
 * Prevents physics jumps on tab-switch or lag-spikes
 * 100ms = ~10 FPS minimum, anything above is capped
 */
export const MAX_DELTA_TIME = 100;

/**
 * Minimum delta-time per frame (ms)
 * Prevents division by zero and excessively small values
 */
export const MIN_DELTA_TIME = 1;

/**
 * Ideal delta-time for 60 FPS (ms)
 * Used as reference for physics-based calculations
 */
export const IDEAL_DELTA_TIME = 16.67;

/**
 * Threshold for a "long frame" (ms)
 * If exceeded, the game is considered laggy
 */
export const LONG_FRAME_THRESHOLD = 50;

/**
 * Number of frames used for FPS averaging
 */
export const FPS_SAMPLE_SIZE = 60;
