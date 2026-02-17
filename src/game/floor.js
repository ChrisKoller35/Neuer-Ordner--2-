// ============================================================
// Floor Helper Functions - Floor-Sprite-Berechnung
// ============================================================
"use strict";

import { clamp } from '../core/utils.js';
import { spriteReady, AssetManager } from '../core/assets.js';
import { 
	LEVEL2_FLOOR_OFFSET, 
	LEVEL3_FLOOR_OFFSET, 
	LEVEL4_FLOOR_OFFSET,
	LEVEL3_FLOOR_MIN_VISIBLE, 
	LEVEL3_FLOOR_COLLISION_RATIO, 
	LEVEL3_FLOOR_COLLISION_PAD 
} from '../core/constants.js';

// Floor Sprites - werden lazy geladen
let _level2FloorSprite = null;
let _level3FloorSprite = null;
let _level4FloorSprite = null;

/**
 * Lädt Floor-Sprite für ein Level (Lazy Loading)
 * @param {number} level - Level-Nummer (2, 3, oder 4)
 * @returns {HTMLImageElement|null} Sprite oder null
 */
export function getLevelFloorSprite(level) {
	switch(level) {
		case 2:
			if (!_level2FloorSprite) _level2FloorSprite = AssetManager.load("./game/Bodenlava.png", "level2");
			return _level2FloorSprite;
		case 3:
			if (!_level3FloorSprite) _level3FloorSprite = AssetManager.load("./game/Boden.png", "level3");
			return _level3FloorSprite;
		case 4:
			if (!_level4FloorSprite) _level4FloorSprite = AssetManager.load("./game/Bodengold.png", "level4");
			return _level4FloorSprite;
		default:
			return null;
	}
}

/**
 * Erstellt Floor-Helper-Funktionen für ein Canvas
 * @param {Function} getCanvas - Funktion die das Canvas zurückgibt
 * @returns {Object} Floor-Helper-Funktionen
 */
export function createFloorHelpers(getCanvas) {
	function getLevel2FloorTop() {
		const canvas = getCanvas();
		if (!canvas) return null;
		const sprite = getLevelFloorSprite(2);
		if (!sprite || !spriteReady(sprite)) return null;
		const scale = canvas.width / sprite.naturalWidth;
		const drawH = sprite.naturalHeight * scale;
		return canvas.height - drawH + LEVEL2_FLOOR_OFFSET;
	}

	function getLevel3FloorTop() {
		const canvas = getCanvas();
		if (!canvas) return null;
		const sprite = getLevelFloorSprite(3);
		if (!sprite || !spriteReady(sprite)) return null;
		const scale = canvas.width / sprite.naturalWidth;
		const drawH = sprite.naturalHeight * scale;
		const floorTop = canvas.height - drawH + LEVEL3_FLOOR_OFFSET;
		const minTop = canvas.height - Math.min(drawH, LEVEL3_FLOOR_MIN_VISIBLE);
		return clamp(floorTop, 0, minTop);
	}

	function getLevel4FloorTop() {
		const canvas = getCanvas();
		if (!canvas) return null;
		const sprite = getLevelFloorSprite(4);
		if (!sprite || !spriteReady(sprite)) return null;
		const scale = canvas.width / sprite.naturalWidth;
		const drawH = sprite.naturalHeight * scale;
		return canvas.height - drawH + LEVEL4_FLOOR_OFFSET;
	}

	function getLevel3GroundLine() {
		const canvas = getCanvas();
		const floorTop = getLevel3FloorTop();
		if (floorTop == null) return null;
		const sprite = getLevelFloorSprite(3);
		if (!sprite) return null;
		const scale = canvas.width / sprite.naturalWidth;
		const drawH = sprite.naturalHeight * scale;
		return floorTop + drawH * LEVEL3_FLOOR_COLLISION_RATIO;
	}

	function getLevel3FloorCollisionTop() {
		const canvas = getCanvas();
		const groundLine = getLevel3GroundLine();
		if (groundLine == null) return null;
		return groundLine - LEVEL3_FLOOR_COLLISION_PAD;
	}

	function computeLevel3MaxBottomY(target) {
		const canvas = getCanvas();
		if (!canvas) return target;
		const floorTop = getLevel3FloorCollisionTop();
		const maxLine = floorTop != null ? floorTop : canvas.height * 0.82;
		return clamp(target, floorTop || 0, maxLine);
	}

	return {
		getLevel2FloorTop,
		getLevel3FloorTop,
		getLevel4FloorTop,
		getLevel3GroundLine,
		getLevel3FloorCollisionTop,
		computeLevel3MaxBottomY,
		getLevelFloorSprite
	};
}
