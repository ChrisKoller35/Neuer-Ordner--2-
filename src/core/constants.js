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
// TIMING CONSTANTS - Delta-Time und Frame-Rate
// ============================================================

/**
 * Maximale Delta-Zeit pro Frame (ms)
 * Verhindert Physik-Sprünge bei Tab-Wechsel oder Lag-Spikes
 * 100ms = ~10 FPS Minimum, alles darüber wird gecappt
 */
export const MAX_DELTA_TIME = 100;

/**
 * Minimale Delta-Zeit pro Frame (ms)
 * Verhindert Division durch 0 und zu kleine Werte
 */
export const MIN_DELTA_TIME = 1;

/**
 * Ideale Delta-Zeit für 60 FPS (ms)
 * Verwendet als Referenz für physikbasierte Berechnungen
 */
export const IDEAL_DELTA_TIME = 16.67;

/**
 * Schwellenwert für "langes Frame" (ms)
 * Wenn überschritten, wird das Spiel als "laggy" betrachtet
 */
export const LONG_FRAME_THRESHOLD = 50;

/**
 * Anzahl Frames die für FPS-Durchschnittsberechnung verwendet werden
 */
export const FPS_SAMPLE_SIZE = 60;
