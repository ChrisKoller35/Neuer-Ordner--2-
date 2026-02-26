// ============================================================
// DUNGEON TILE UTILS — Tile-level collision and walkability
// ============================================================
"use strict";

import { CHUNK_COLS, CHUNK_ROWS } from './chunkLibrary.js';
import { T } from './dungeonConstants.js';

/**
 * Creates tile helper functions bound to a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Function} getDungeonState
 * @returns {{ tileSize: Function, walkable: Function, boxHitsWall: Function }}
 */
export function createTileHelpers(canvas, getDungeonState = null) {
	function tileSize() {
		const ds = getDungeonState ? getDungeonState() : null;
		const roomWidth = ds?.roomPixelWidth || canvas.width;
		const roomHeight = ds?.roomPixelHeight || canvas.height;
		return { tw: roomWidth / CHUNK_COLS, th: roomHeight / CHUNK_ROWS };
	}

	function walkable(grid, tx, ty) {
		if (tx < 0 || tx >= CHUNK_COLS || ty < 0 || ty >= CHUNK_ROWS) return false;
		const t = grid[ty]?.[tx];
		return t === T.FLOOR || t === T.DOOR || t === T.SPIKES;
	}

	function boxHitsWall(grid, px, py, hw, hh) {
		const { tw, th } = tileSize();
		const corners = [
			[px - hw, py - hh], [px + hw, py - hh],
			[px - hw, py + hh], [px + hw, py + hh]
		];
		for (const [cx, cy] of corners) {
			if (!walkable(grid, Math.floor(cx / tw), Math.floor(cy / th))) return true;
		}
		return false;
	}

	return { tileSize, walkable, boxHitsWall };
}
