/**
 * City Sprite Cache System
 * Verwaltet das Caching und Cropping der Stadt-Spieler-Sprites
 */

import { clamp } from '../core/utils.js';
import { spriteReady } from '../core/assets.js';
import {
	CITY_SPRITE_FRAME_SIZE,
	CITY_SPRITE_PADDING,
	CITY_SPRITE_ALPHA_THRESHOLD,
	CITY_SPRITE_CROP_INSET,
	CITY_SPRITE_CROP_OUTSET_X,
	CITY_SPRITE_CROP_OUTSET_Y,
	CITY_SPRITE_FRAME_OUTSET
} from './constants.js';

// Stadt-Sprite-Zustand (mutable)
let citySpriteCropShift = Array.from({ length: 3 }, () => 
	Array.from({ length: 5 }, () => ({ x: 0, y: 0 }))
);

// Cache-Objekt für die gecropten Sprite-Frames
export const CITY_SPRITE_CACHE = { ready: false, frames: [] };

/**
 * Holt den Crop-Shift für einen bestimmten Frame
 */
export const getCitySpriteCropShift = (row, col) => {
	const r = citySpriteCropShift[row];
	const entry = r && r[col];
	return entry ? entry : { x: 0, y: 0 };
};

/**
 * Setzt den gesamten citySpriteCropShift Array (für Debug/Persistenz)
 */
export const setCitySpriteCropShift = (newShift) => {
	citySpriteCropShift = newShift;
	CITY_SPRITE_CACHE.ready = false;
};

/**
 * Holt den gesamten citySpriteCropShift Array (für Debug/Persistenz)
 */
export const getCitySpriteCropShiftArray = () => citySpriteCropShift;

/**
 * Aktualisiert den Crop-Shift für einen Frame und invalidiert den Cache
 */
export const updateCitySpriteCropShift = (row, col, dx, dy) => {
	if (!citySpriteCropShift[row] || !citySpriteCropShift[row][col]) return;
	citySpriteCropShift[row][col].x += dx;
	citySpriteCropShift[row][col].y += dy;
	CITY_SPRITE_CACHE.ready = false;
};

/**
 * Baut den Sprite-Cache für den Stadt-Spieler auf
 * @param {HTMLImageElement} sprite - Das cityPlayer Sprite
 */
export function buildCitySpriteCache(sprite) {
	if (CITY_SPRITE_CACHE.ready) return;
	if (!spriteReady(sprite)) return;
	
	const frameSize = CITY_SPRITE_FRAME_SIZE;
	const rows = 3;
	const cols = 5;
	const pad = CITY_SPRITE_PADDING;
	
	const temp = document.createElement("canvas");
	temp.width = frameSize;
	temp.height = frameSize;
	const tctx = temp.getContext("2d");
	
	CITY_SPRITE_CACHE.frames = Array.from({ length: rows }, () => Array(cols).fill(null));
	
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			tctx.clearRect(0, 0, frameSize, frameSize);
			tctx.drawImage(sprite, c * frameSize, r * frameSize, frameSize, frameSize, 0, 0, frameSize, frameSize);
			
			const img = tctx.getImageData(0, 0, frameSize, frameSize);
			const data = img.data;
			const alphaAt = (x, y) => data[(y * frameSize + x) * 4 + 3];
			
			let seedX = Math.floor(frameSize / 2);
			let seedY = Math.floor(frameSize / 2);
			
			if (alphaAt(seedX, seedY) <= CITY_SPRITE_ALPHA_THRESHOLD) {
				let found = false;
				for (let radius = 1; radius < frameSize / 2 && !found; radius += 1) {
					for (let dy = -radius; dy <= radius && !found; dy += 1) {
						for (let dx = -radius; dx <= radius && !found; dx += 1) {
							const x = seedX + dx;
							const y = seedY + dy;
							if (x < 0 || y < 0 || x >= frameSize || y >= frameSize) continue;
							if (alphaAt(x, y) > CITY_SPRITE_ALPHA_THRESHOLD) {
								seedX = x;
								seedY = y;
								found = true;
							}
						}
					}
				}
				if (!found) {
					CITY_SPRITE_CACHE.frames[r][c] = null;
					continue;
				}
			}
			
			const visited = new Uint8Array(frameSize * frameSize);
			const queue = [[seedX, seedY]];
			visited[seedY * frameSize + seedX] = 1;
			let minX = seedX;
			let maxX = seedX;
			let minY = seedY;
			let maxY = seedY;
			
			while (queue.length) {
				const [x, y] = queue.pop();
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
				const neighbors = [
					[x - 1, y],
					[x + 1, y],
					[x, y - 1],
					[x, y + 1]
				];
				for (const [nx, ny] of neighbors) {
					if (nx < 0 || ny < 0 || nx >= frameSize || ny >= frameSize) continue;
					const idx = ny * frameSize + nx;
					if (visited[idx]) continue;
					if (alphaAt(nx, ny) > CITY_SPRITE_ALPHA_THRESHOLD) {
						visited[idx] = 1;
						queue.push([nx, ny]);
					}
				}
			}
			
			const inset = CITY_SPRITE_CROP_INSET;
			const outsetX = CITY_SPRITE_CROP_OUTSET_X;
			const outsetY = CITY_SPRITE_CROP_OUTSET_Y;
			const frameKey = `${r},${c}`;
			const frameOutset = CITY_SPRITE_FRAME_OUTSET[frameKey] || { left: 0, right: 0, top: 0, bottom: 0 };
			const frameShift = getCitySpriteCropShift(r, c);
			
			minX = Math.min(maxX, minX + inset);
			minY = Math.min(maxY, minY + inset);
			maxX = Math.max(minX, maxX - inset);
			maxY = Math.max(minY, maxY - inset);
			
			const baseMinX = Math.max(0, minX - outsetX - frameOutset.left);
			const baseMinY = Math.max(0, minY - outsetY - frameOutset.top);
			const baseMaxX = Math.min(frameSize - 1, maxX + outsetX + frameOutset.right);
			const baseMaxY = Math.min(frameSize - 1, maxY + outsetY + frameOutset.bottom);
			const baseCenterX = (baseMinX + baseMaxX) / 2;
			const baseCenterY = (baseMinY + baseMaxY) / 2;
			
			const desiredMinX = Math.floor(baseMinX + frameShift.x);
			const desiredMinY = Math.floor(baseMinY + frameShift.y);
			const desiredMaxX = Math.ceil(baseMaxX + frameShift.x);
			const desiredMaxY = Math.ceil(baseMaxY + frameShift.y);
			
			minX = desiredMinX;
			minY = desiredMinY;
			maxX = desiredMaxX;
			maxY = desiredMaxY;
			
			const cropW = maxX - minX + 1;
			const cropH = maxY - minY + 1;
			const centerX = baseCenterX;
			const centerY = baseCenterY;
			
			const frameCanvas = document.createElement("canvas");
			frameCanvas.width = cropW + pad * 2;
			frameCanvas.height = cropH + pad * 2;
			const fctx = frameCanvas.getContext("2d");
			fctx.imageSmoothingEnabled = false;
			fctx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
			
			const srcMinX = clamp(minX, 0, frameSize - 1);
			const srcMinY = clamp(minY, 0, frameSize - 1);
			const srcMaxX = clamp(maxX, 0, frameSize - 1);
			const srcMaxY = clamp(maxY, 0, frameSize - 1);
			const srcW = Math.max(0, srcMaxX - srcMinX + 1);
			const srcH = Math.max(0, srcMaxY - srcMinY + 1);
			
			if (srcW > 0 && srcH > 0) {
				const destX = pad + (srcMinX - minX);
				const destY = pad + (srcMinY - minY);
				fctx.drawImage(
					sprite,
					c * frameSize + srcMinX,
					r * frameSize + srcMinY,
					srcW,
					srcH,
					destX,
					destY,
					srcW,
					srcH
				);
			}
			
			const anchorX = baseCenterX - minX + pad;
			const anchorY = baseCenterY - minY + pad;
			
			CITY_SPRITE_CACHE.frames[r][c] = {
				canvas: frameCanvas,
				centerX,
				centerY,
				anchorX,
				anchorY,
				crop: { minX, minY, maxX, maxY }
			};
		}
	}
	CITY_SPRITE_CACHE.ready = true;
}
