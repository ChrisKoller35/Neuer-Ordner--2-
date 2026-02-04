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
