// ============================================================
// UTILS - Hilfsfunktionen
// ============================================================

/**
 * Begrenzt einen Wert zwischen min und max
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Begrenzt einen Wert zwischen 0 und 1
 */
export const clamp01 = value => clamp(value, 0, 1);

/**
 * Ease-Out Cubic Interpolation
 */
export const easeOutCubic = value => {
	const t = clamp01(value);
	return 1 - Math.pow(1 - t, 3);
};

/**
 * Ease-In-Out Cubic Interpolation
 */
export const easeInOutCubic = value => {
	const t = clamp01(value);
	return t < 0.5 
		? 4 * t * t * t 
		: 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Lineare Interpolation zwischen zwei Werten
 */
export const lerp = (a, b, t) => a + (b - a) * clamp01(t);

/**
 * Zufallszahl zwischen min und max
 */
export const randomRange = (min, max) => min + Math.random() * (max - min);

/**
 * Zufälliges Element aus einem Array
 */
export const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Distanz zwischen zwei Punkten
 */
export const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * Winkel zwischen zwei Punkten (in Radiant)
 */
export const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
