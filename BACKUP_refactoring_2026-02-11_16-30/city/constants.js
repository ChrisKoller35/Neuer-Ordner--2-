// ============================================================
// CITY CONSTANTS - Alle Konstanten für den Stadt-Modus
// ============================================================

// ========== SPRITE-EINSTELLUNGEN ==========
export const USE_CITY_SPRITE = true;
export const CITY_ANIM_SOURCE = "rotate"; // "rotate", "png" or "sheet"
export const CITY_SPRITE_FRAME_SIZE = 256;
export const CITY_SPRITE_SCALE = 0.15;
export const CITY_SPRITE_OFFSET_X_SIDE = -4;
export const CITY_SPRITE_OFFSET_X_VERTICAL = -4;
export const CITY_SPRITE_OFFSET_Y = -4;
export const CITY_SPRITE_PADDING = 8;
export const CITY_SPRITE_CROP_INSET = 0;
export const CITY_SPRITE_ALPHA_THRESHOLD = 10;
export const CITY_SPRITE_CROP_OUTSET_X = 48;
export const CITY_SPRITE_CROP_OUTSET_Y = 20;
export const CITY_SPRITE_DEBUG = false;
export const CITY_ANIM_FRAME_TIME = 140;

// ========== PERSPEKTIVE (aktuell deaktiviert) ==========
export const CITY_PERSPECTIVE_ENABLED = false;
export const CITY_PERSPECTIVE_SKEW_X = 0.0;      // Horizontale Scherung
export const CITY_PERSPECTIVE_SCALE_Y = 0.7;    // Y-Stauchung (0.7 = 30% gestaucht)
export const CITY_PERSPECTIVE_ORIGIN_Y = 0.5;   // Ursprung der Transformation
export const CITY_SPRITE_PERSPECTIVE_STRETCH = 1.0; // Vertikale Streckung (1.0 = keine)

// ========== FRAME OUTSET (pro Frame-Position) ==========
export const CITY_SPRITE_FRAME_OUTSET = {
	"0,0": { left: 0, right: 14, top: 0, bottom: 0 }
};

// ========== GEBÄUDE-STRUKTUR ==========
export const CITY_FLOOR_COUNT = 4;              // Anzahl Stockwerke (0 = Erdgeschoss)
export const CITY_FLOOR_HEIGHT = 360;           // Höhe pro Stockwerk in Pixel
export const CITY_BUILDING_WIDTH = 1600;        // Gebäudebreite
export const CITY_BUILDING_HEIGHT = CITY_FLOOR_HEIGHT * CITY_FLOOR_COUNT; // 1440px
export const CITY_HATCH_WIDTH = 120;            // Breite der Luke zum Hochschwimmen
export const CITY_WALL_THICKNESS = 30;          // Wandstärke
export const CITY_FLOOR_THICKNESS = 25;         // Bodendicke für Kollision

// ========== GRID KOLLISIONS-SYSTEM ==========
export const CITY_GRID_CELL_SIZE = 50;          // Größe einer Zelle in Pixel
export const CITY_GRID_COLS = Math.ceil(CITY_BUILDING_WIDTH / CITY_GRID_CELL_SIZE);  // 32 Spalten
export const CITY_GRID_ROWS = Math.ceil(CITY_BUILDING_HEIGHT / CITY_GRID_CELL_SIZE); // 72 Zeilen

// ========== DEBUG ==========
export const CITY_SPRITE_DEBUG_LABEL = "CITY SPRITE v3";
