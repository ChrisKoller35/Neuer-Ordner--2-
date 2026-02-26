// ============================================================
// UTILS - Utility functions
// ============================================================

/**
 * Clamp a value between min and max
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Clamp a value between 0 and 1
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
 * Linear interpolation between two values
 */
export const lerp = (a, b, t) => a + (b - a) * clamp01(t);

/**
 * Random number between min and max
 */
export const randomRange = (min, max) => min + Math.random() * (max - min);

/**
 * Random element from an array
 */
export const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Distance between two points
 */
export const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

/**
 * Angle between two points (radians)
 */
export const angleBetween = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
