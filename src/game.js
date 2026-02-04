// ============================================================
// CASHFISCH - Hauptspiel
// ============================================================
"use strict";

// Imports aus Modulen
import { 
	TAU, 
	DEFAULT_BOSS_STATS,
	KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN,
	KEY_SHIELD, CODE_SHIELD,
	KEY_CORAL, CODE_CORAL,
	KEY_TSUNAMI, CODE_TSUNAMI,
	KEY_SHOOT, CODE_SHOOT,
	CITY_SCALE, CITY_VIEW_ZOOM, CITY_SPEED, CITY_PLAYER_RADIUS,
	FOE_BASE_SCORE,
	SHIELD_DURATION, SHIELD_COOLDOWN,
	LEVEL2_FLOOR_OFFSET, LEVEL3_FLOOR_OFFSET, LEVEL4_FLOOR_OFFSET,
	LEVEL3_FLOOR_MIN_VISIBLE, LEVEL3_FLOOR_COLLISION_RATIO, LEVEL3_FLOOR_COLLISION_PAD
} from './core/constants.js';

import { clamp, clamp01, easeOutCubic, lerp, distance, randomRange } from './core/utils.js';

import { loadSprite, spriteReady, configureAssetLoader } from './core/assets.js';

// JSON-Daten importieren (Vite unterstützt JSON-Imports)
import itemsData from './data/items.json';
import shopData from './data/shop.json';
import missionsData from './data/missions.json';

// Stadt-Konstanten importieren
import {
	USE_CITY_SPRITE,
	CITY_ANIM_SOURCE,
	CITY_SPRITE_FRAME_SIZE,
	CITY_SPRITE_SCALE,
	CITY_SPRITE_OFFSET_X_SIDE,
	CITY_SPRITE_OFFSET_X_VERTICAL,
	CITY_SPRITE_OFFSET_Y,
	CITY_SPRITE_PADDING,
	CITY_SPRITE_CROP_INSET,
	CITY_SPRITE_ALPHA_THRESHOLD,
	CITY_SPRITE_CROP_OUTSET_X,
	CITY_SPRITE_CROP_OUTSET_Y,
	CITY_SPRITE_DEBUG,
	CITY_ANIM_FRAME_TIME,
	CITY_PERSPECTIVE_ENABLED,
	CITY_PERSPECTIVE_SKEW_X,
	CITY_PERSPECTIVE_SCALE_Y,
	CITY_PERSPECTIVE_ORIGIN_Y,
	CITY_SPRITE_PERSPECTIVE_STRETCH,
	CITY_SPRITE_FRAME_OUTSET,
	CITY_FLOOR_COUNT,
	CITY_FLOOR_HEIGHT,
	CITY_BUILDING_WIDTH,
	CITY_BUILDING_HEIGHT,
	CITY_HATCH_WIDTH,
	CITY_WALL_THICKNESS,
	CITY_FLOOR_THICKNESS,
	CITY_GRID_CELL_SIZE,
	CITY_GRID_COLS,
	CITY_GRID_ROWS,
	CITY_SPRITE_DEBUG_LABEL
} from './city/constants.js';

let canvas = null;
let ctx = null;

function getLevel2FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	if (!LEVEL2_FLOOR_SPRITE) return null;
	if (!spriteReady(LEVEL2_FLOOR_SPRITE)) return null;
	const scale = canvas.width / LEVEL2_FLOOR_SPRITE.naturalWidth;
	const drawH = LEVEL2_FLOOR_SPRITE.naturalHeight * scale;
	return canvas.height - drawH + LEVEL2_FLOOR_OFFSET;
}
function getLevel3FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	if (!LEVEL3_FLOOR_SPRITE) return null;
	if (!spriteReady(LEVEL3_FLOOR_SPRITE)) return null;
	const scale = canvas.width / LEVEL3_FLOOR_SPRITE.naturalWidth;
	const drawH = LEVEL3_FLOOR_SPRITE.naturalHeight * scale;
	const floorTop = canvas.height - drawH + LEVEL3_FLOOR_OFFSET;
	const minTop = canvas.height - Math.min(drawH, LEVEL3_FLOOR_MIN_VISIBLE);
	return clamp(floorTop, 0, minTop);
}
function getLevel4FloorTop() {
	if (typeof canvas === "undefined" || !canvas) return null;
	if (!LEVEL4_FLOOR_SPRITE) return null;
	if (!spriteReady(LEVEL4_FLOOR_SPRITE)) return null;
	const scale = canvas.width / LEVEL4_FLOOR_SPRITE.naturalWidth;
	const drawH = LEVEL4_FLOOR_SPRITE.naturalHeight * scale;
	return canvas.height - drawH + LEVEL4_FLOOR_OFFSET;
}
function getLevel3GroundLine() {
	const floorTop = getLevel3FloorTop();
	if (floorTop == null) return null;
	const scale = canvas.width / LEVEL3_FLOOR_SPRITE.naturalWidth;
	const drawH = LEVEL3_FLOOR_SPRITE.naturalHeight * scale;
	const target = floorTop + drawH * LEVEL3_FLOOR_COLLISION_RATIO;
	const maxLine = canvas.height - LEVEL3_FLOOR_COLLISION_PAD;
	return clamp(target, floorTop, maxLine);
}

const USE_CLASSIC_OKTOPUS_PROJECTILE = true; // Toggle to compare new blowdart prototype with classic sprite
const USE_WEBP_ASSETS = true; // Optional: generates/loads .webp with PNG fallback

// Stadt-Sprite-Zustand (mutable, nicht in constants.js)
let citySpriteCropShift = Array.from({ length: 3 }, () => Array.from({ length: 5 }, () => ({ x: 0, y: 0 })));
const getCitySpriteCropShift = (row, col) => {
	const r = citySpriteCropShift[row];
	const entry = r && r[col];
	return entry ? entry : { x: 0, y: 0 };
};
const updateCitySpriteCropShift = (row, col, dx, dy) => {
	if (!citySpriteCropShift[row] || !citySpriteCropShift[row][col]) return;
	citySpriteCropShift[row][col].x += dx;
	citySpriteCropShift[row][col].y += dy;
		CITY_SPRITE_CACHE.ready = false;
};
const CITY_SPRITE_CACHE = { ready: false, frames: [] };
const DEBUG_BUILD_LABEL = "BUILD v3";

// Asset Loader konfigurieren (nutzt import.meta.url für relative Pfade)
configureAssetLoader({ 
	useWebP: USE_WEBP_ASSETS, 
	baseUrl: import.meta.url 
});

function buildCitySpriteCache() {
	if (CITY_SPRITE_CACHE.ready) return;
	const sprite = SPRITES.cityPlayer;
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


const LEVEL2_FLOOR_SPRITE = loadSprite("./Bodenlava.png");
const LEVEL3_FLOOR_SPRITE = loadSprite("./Boden.png");
const LEVEL4_FLOOR_SPRITE = loadSprite("./Bodengold.png");

const SPRITES = {
	player: loadSprite("./Player.png"),
	cityPlayer: loadSprite("./Playertopdown.png"),
	foe: loadSprite("./foe-jelly.png"),
	boss: loadSprite("./boss-shark.png"),
	shot: loadSprite("./player-shot.png"),
	heal: loadSprite("./heal-potion.png"),
	bogenschreck: loadSprite("./Aquischwer-Bogenschreck.png"),
	parfumKraken: loadSprite("./Parfüm-Kraken.png"),
	ritterfisch: loadSprite("./Ritterfisch.png"),
	yachtwal: loadSprite("./Yachtwal.png"),
	oktopus: loadSprite("./Oktopus.png"),
	oktopusProjectile: loadSprite("./Oktopuspfeil.png"),
	cashfish: loadSprite("./Cashfish.png"),
	coverRock: loadSprite("./Fels.png"),
	symbolSchluessel: loadSprite("./Schlüsselsymbol.png"),
	symbolGeldschein: loadSprite("./Geldscheinsymbol.png"),
	symbolYacht: loadSprite("./Yachtsymbol.png"),
	backgroundLevelOne: loadSprite("./Backgroundlvlone.png"),
	cityTiles: [
		loadSprite("./Bodenstadt/openart-image_8vGhGSbW_1769841054304_raw.jpg"),
		loadSprite("./Bodenstadt/openart-image_jTCfEQu9_1769840885505_raw.jpg"),
		loadSprite("./Bodenstadt/openart-image_MifcQ_Zg_1769840721632_raw.jpg"),
		loadSprite("./Bodenstadt/openart-image_Sy6oko6r_1769840795864_raw.jpg"),
		loadSprite("./Bodenstadt/openart-image_umpSDvCE_1769841003548_raw.jpg"),
		loadSprite("./Bodenstadt/openart-image_YGBbUj_W_1769840721095_raw.jpg")
	],
	coralAllyOne: loadSprite("./Korallenbegleitereins.png"),
	coralAllyTwo: loadSprite("./Korallenbegleiterzwei.png"),
	npcHaendler: loadSprite("./Npc/Haendler.png"),
	npcMission: loadSprite("./Npc/Mission.png"),
	standwaffen: loadSprite("./Standwaffen.png"),
	ruestungMeer: loadSprite("./Ruestungmeer.png"),
	queststand: loadSprite("./Queststand.png"),
	cityBackground: loadSprite("./Stadthaus.webp")
};
let processedHealSprite = null;
let pickupHideTimer = null;
// Cache scaled alpha masks so cover rock collisions align to the sprite silhouette.
const coverRockMaskCache = new Map();

// ========== STADT SEITENANSICHT SYSTEM ==========
// Konstanten importiert aus ./city/constants.js

// Globales Grid - true = begehbar, false = blockiert
// Wird über window exportiert für Debug-Editor
window.CITY_WALKABLE_GRID = window.CITY_WALKABLE_GRID || {};
window.CITY_GRID_EDIT_MODE = false;
window.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
window.CITY_GRID_COLS = CITY_GRID_COLS;
window.CITY_GRID_ROWS = CITY_GRID_ROWS;

const SYMBOL_DATA = {
	pferd: {
		spriteKey: "symbolSchluessel",
		label: "Schlüssel-Symbol",
		asset: "./src/Schlüsselsymbol.png"
	},
	sprinter: {
		spriteKey: "symbolGeldschein",
		label: "Geldschein-Symbol",
		asset: "./src/Geldscheinsymbol.png"
	},
	yacht: {
		spriteKey: "symbolYacht",
		label: "Yacht-Symbol",
		asset: "./src/Yachtsymbol.png"
	}
};

const LEVEL_SYMBOL_SEQUENCE = ["pferd", "sprinter", "yacht"];
const SYMBOL_AUTOCOLLECT_MS = 10000;

function getHealSprite() {
	if (!processedHealSprite && spriteReady(SPRITES.heal)) {
		const source = SPRITES.heal;
		const canvas = document.createElement("canvas");
		canvas.width = source.naturalWidth;
		canvas.height = source.naturalHeight;
		const context = canvas.getContext("2d");
		context.drawImage(source, 0, 0);
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
		const pixels = imageData.data;
		for (let i = 0; i < pixels.length; i += 4) {
			const r = pixels[i];
			const g = pixels[i + 1];
			const b = pixels[i + 2];
			if (r >= 240 && g >= 240 && b >= 240) pixels[i + 3] = 0;
		}
		context.putImageData(imageData, 0, 0);
		processedHealSprite = canvas;
	}
	return processedHealSprite && spriteReady(SPRITES.heal) ? processedHealSprite : SPRITES.heal;
}

function getCoverRockCollisionMask(sprite, width, height) {
		if (!spriteReady(sprite)) return null;
		const key = `${sprite.src || "cover"}:${width.toFixed(3)}x${height.toFixed(3)}`;
		if (coverRockMaskCache.has(key)) return coverRockMaskCache.get(key);
		const drawW = Math.max(1, Math.round(width));
		const drawH = Math.max(1, Math.round(height));
		const canvas = document.createElement("canvas");
		canvas.width = drawW;
		canvas.height = drawH;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		ctx.drawImage(sprite, 0, 0, drawW, drawH);
		const imageData = ctx.getImageData(0, 0, drawW, drawH);
		const { data } = imageData;
		const mask = new Uint8Array(drawW * drawH);
		let minX = drawW;
		let minY = drawH;
		let maxX = -1;
		let maxY = -1;
		for (let y = 0; y < drawH; y++) {
			const rowOffset = y * drawW;
			for (let x = 0; x < drawW; x++) {
				const pixelIndex = (rowOffset + x) * 4;
				const alpha = data[pixelIndex + 3];
				if (alpha > 32) {
					mask[rowOffset + x] = 1;
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		if (maxX < minX || maxY < minY) {
			minX = 0;
			minY = 0;
			maxX = drawW - 1;
			maxY = drawH - 1;
		}
		const info = {
			width: drawW,
			height: drawH,
			data: mask,
			worldWidth: width,
			worldHeight: height,
			scaleX: drawW / Math.max(width, 1e-6),
			scaleY: drawH / Math.max(height, 1e-6),
			minOffsetX: (minX / drawW) * width - width * 0.5,
			maxOffsetX: ((maxX + 1) / drawW) * width - width * 0.5,
			minOffsetY: (minY / drawH) * height - height * 0.5,
			maxOffsetY: ((maxY + 1) / drawH) * height - height * 0.5
		};
		coverRockMaskCache.set(key, info);
		return info;
	}

function drawPlayerFallback(ctx, x, y, opts = {}) {
	const scale = opts.scale == null ? 1 : opts.scale;
	const dir = opts.dir == null ? 1 : opts.dir;
	const accent = opts.accent || "#8df0ff";

	ctx.save();
	ctx.translate(x, y);
	ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	const tailGradient = ctx.createLinearGradient(-96, 0, -56, 0);
	tailGradient.addColorStop(0, "#052c3f");
	tailGradient.addColorStop(1, "#0e5a78");
	ctx.fillStyle = tailGradient;
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-102, -30, -68, -18);
	ctx.quadraticCurveTo(-74, -2, -78, -6);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-98, 18, -68, 10);
	ctx.quadraticCurveTo(-72, -2, -78, -6);
	ctx.closePath();
	ctx.fill();

	const bodyGradient = ctx.createLinearGradient(-78, 0, 72, 0);
	bodyGradient.addColorStop(1, accent);
	ctx.fillStyle = bodyGradient;
	ctx.beginPath();
	ctx.moveTo(-74, -8);
	ctx.quadraticCurveTo(-64, -36, -16, -42);
	ctx.quadraticCurveTo(48, -46, 76, -6);
	ctx.quadraticCurveTo(82, 16, 56, 34);
	ctx.quadraticCurveTo(4, 56, -34, 30);
	ctx.quadraticCurveTo(-70, 12, -74, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0d5780";
	ctx.beginPath();
	ctx.moveTo(-28, -26);
	ctx.quadraticCurveTo(-8, -54, 16, -30);
	ctx.quadraticCurveTo(-4, -22, -28, -26);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(-42, 10);
	ctx.quadraticCurveTo(-8, 0, 12, 18);
	ctx.quadraticCurveTo(-10, 26, -38, 20);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#d3f3ff";
	ctx.beginPath();
	ctx.moveTo(-32, 10);
	ctx.quadraticCurveTo(6, 32, 42, 12);
	ctx.quadraticCurveTo(8, -2, -32, 10);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a3e58";
	ctx.beginPath();
	ctx.moveTo(0, -10);
	ctx.lineTo(10, -36);
	ctx.lineTo(22, -12);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0c4c6d";
	ctx.beginPath();
	ctx.moveTo(4, 16);
	ctx.lineTo(20, 34);
	ctx.lineTo(26, 16);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a1e2d";
	ctx.beginPath();
	ctx.moveTo(34, -8);
	ctx.quadraticCurveTo(52, -2, 46, 8);
	ctx.quadraticCurveTo(30, 6, 34, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(34, -4, 7.6, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#1a4a72";
	ctx.beginPath();
	ctx.arc(36.2, -4.6, 4.4, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#081017";
	ctx.beginPath();
	ctx.arc(37.6, -5, 2.2, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	ctx.beginPath();
	ctx.arc(35, -6.4, 1.2, 0, TAU);
	ctx.fill();

	ctx.strokeStyle = "rgba(214,244,255,0.75)";
	ctx.lineWidth = 1.6 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(18, 2);
	ctx.quadraticCurveTo(12, 12, 6, 18);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(14, -6);
	ctx.quadraticCurveTo(8, -4, 2, -2);
	ctx.quadraticCurveTo(10, 0, 18, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(8, -12);
	ctx.lineTo(4, -8);
	ctx.lineTo(2, -4);
	ctx.stroke();

	ctx.strokeStyle = "rgba(15,53,70,0.65)";
	ctx.lineWidth = 1 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(-6, -6);
	ctx.quadraticCurveTo(-4, -2, -2, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-12, -8);
	ctx.quadraticCurveTo(-10, -4, -8, 0);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-18, -10);
	ctx.quadraticCurveTo(-16, -6, -14, -2);
	ctx.stroke();

	ctx.restore();
}

const MODELS = {
	player(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const dir = opts.dir == null ? 1 : opts.dir;
		const image = SPRITES.player;
		if (spriteReady(image)) {
			const baseScale = opts.spriteScale == null ? 0.16 : opts.spriteScale;
			const drawW = image.naturalWidth * baseScale;
			const drawH = image.naturalHeight * baseScale;
			const offsetX = opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX;
			const offsetY = opts.spriteOffsetY == null ? 0 : opts.spriteOffsetY;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
			ctx.drawImage(image, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		drawPlayerFallback(ctx, x, y, { scale, dir, accent: opts.accent });
	},
	boss(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const pulse = opts.pulse == null ? 0 : opts.pulse;
		const spriteKey = opts.spriteKey;
		const sprite = spriteKey && SPRITES[spriteKey] ? SPRITES[spriteKey] : SPRITES.boss;
		const flip = opts.flip == null ? true : !!opts.flip;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.22 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -20 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			if (flip) ctx.scale(-1, 1);
			ctx.rotate(Math.sin(pulse) * 0.04);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale((flip ? -1 : 1) * scale, scale);
		ctx.rotate(Math.sin(pulse) * 0.04);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const tailGradient = ctx.createLinearGradient(-170, 0, -120, 0);
		tailGradient.addColorStop(0, "#07141f");
		tailGradient.addColorStop(1, "#1b3242");
		ctx.fillStyle = tailGradient;
		ctx.beginPath();
		ctx.moveTo(-162, -6);
		ctx.quadraticCurveTo(-188, -42, -140, -28);
		ctx.quadraticCurveTo(-154, -6, -162, -6);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-160, -2);
		ctx.quadraticCurveTo(-184, 30, -138, 16);
		ctx.quadraticCurveTo(-150, -4, -160, -2);
		ctx.closePath();
		ctx.fill();

		const bodyGradient = ctx.createLinearGradient(-164, 0, 150, 0);
		bodyGradient.addColorStop(0, "#06111b");
		bodyGradient.addColorStop(0.45, "#1a2f41");
		bodyGradient.addColorStop(1, "#5a7e93");
		ctx.fillStyle = bodyGradient;
		ctx.beginPath();
		ctx.moveTo(-160, -20);
		ctx.quadraticCurveTo(-130, -70, -34, -76);
		ctx.quadraticCurveTo(60, -82, 140, -30);
		ctx.quadraticCurveTo(166, -6, 146, 26);
		ctx.quadraticCurveTo(118, 64, -38, 60);
		ctx.quadraticCurveTo(-122, 54, -160, -2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#1d374a";
		ctx.beginPath();
		ctx.moveTo(-74, -64);
		ctx.quadraticCurveTo(-24, -104, 34, -64);
		ctx.quadraticCurveTo(-12, -50, -74, -64);
		ctx.closePath();
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(-32, 18);
		ctx.quadraticCurveTo(-22, 10, -16, -6);
		ctx.quadraticCurveTo(-10, 4, -8, 18);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#ecf6ff";
		ctx.beginPath();
		ctx.moveTo(-40, -6);
		ctx.quadraticCurveTo(36, -36, 98, -12);
		ctx.quadraticCurveTo(44, 24, -26, 14);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#102231";
		ctx.beginPath();
		ctx.moveTo(94, -6);
		ctx.quadraticCurveTo(108, -4, 110, 8);
		ctx.quadraticCurveTo(94, 8, 94, -6);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#f5fbff";
		ctx.beginPath();
		ctx.arc(96, -6, 10, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "#1a3142";
		ctx.beginPath();
		ctx.arc(99, -6.6, 6, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "#070d12";
		ctx.beginPath();
		ctx.arc(101, -7, 2.8, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(97.2, -8.4, 1.6, 0, TAU);
		ctx.fill();

		ctx.fillStyle = "#f9fbff";
		ctx.beginPath();
		ctx.moveTo(54, 18);
		ctx.lineTo(86, 12);
		ctx.lineTo(94, 24);
		ctx.lineTo(60, 32);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(38, 22);
		ctx.lineTo(66, 20);
		ctx.lineTo(72, 36);
		ctx.lineTo(40, 36);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(33,56,74,0.85)";
		ctx.lineWidth = 3.2;
		ctx.beginPath();
		ctx.moveTo(28, -2);
		ctx.quadraticCurveTo(34, 0, 48, 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(16, -4);
		ctx.quadraticCurveTo(24, -2, 36, 0);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(6, -6);
		ctx.quadraticCurveTo(16, -4, 28, -2);
		ctx.stroke();

		ctx.strokeStyle = "rgba(243,249,255,0.7)";
		ctx.lineWidth = 3.2;
		ctx.beginPath();
		ctx.moveTo(-24, -6);
		ctx.quadraticCurveTo(44, -34, 110, -12);
		ctx.stroke();

		ctx.fillStyle = "#fefefe";
		ctx.beginPath();
		ctx.moveTo(32, 8);
		ctx.lineTo(70, 6);
		ctx.lineTo(66, 18);
		ctx.lineTo(50, 18);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "#132330";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(32, 8);
		ctx.lineTo(50, 18);
		ctx.lineTo(66, 18);
		ctx.lineTo(70, 6);
		ctx.stroke();

		ctx.fillStyle = "#fbffff";
		ctx.beginPath();
		ctx.moveTo(16, 6);
		for (let i = 0; i < 6; i += 1) {
			const x = 20 + i * 8;
			ctx.lineTo(x, 6 + (i % 2 === 0 ? 6 : 0));
			ctx.lineTo(x + 6, 6);
		}
		ctx.lineTo(16 + 6 * 8, 6);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(255,255,255,0.65)";
		ctx.lineWidth = 1.6;
		for (let i = 0; i < 4; i += 1) {
			ctx.beginPath();
			ctx.moveTo(-10 - i * 8, -10);
			ctx.lineTo(-8 - i * 8, 6);
			ctx.stroke();
		}

		ctx.restore();
	},
	foe(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.foe;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.15 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -6 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -6 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.08);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.18);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const tailGradient = ctx.createLinearGradient(-46, 0, -20, 0);
		tailGradient.addColorStop(0, "#0b2640");
		tailGradient.addColorStop(1, "#1e5d84");
		ctx.fillStyle = tailGradient;
		ctx.beginPath();
		ctx.moveTo(-40, -6);
		ctx.quadraticCurveTo(-60, -24, -30, -18);
		ctx.quadraticCurveTo(-36, -4, -40, -6);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-40, -4);
		ctx.quadraticCurveTo(-58, 18, -28, 12);
		ctx.quadraticCurveTo(-34, -2, -40, -4);
		ctx.closePath();
		ctx.fill();

		const bodyGradient = ctx.createLinearGradient(-36, 0, 36, 0);
		bodyGradient.addColorStop(0, "#112f49");
		bodyGradient.addColorStop(0.6, "#2d86bc");
		bodyGradient.addColorStop(1, "#79d5ff");
		ctx.fillStyle = bodyGradient;
		ctx.beginPath();
		ctx.moveTo(-36, -10);
		ctx.quadraticCurveTo(-12, -32, 24, -22);
		ctx.quadraticCurveTo(40, -8, 34, 12);
		ctx.quadraticCurveTo(10, 30, -24, 20);
		ctx.quadraticCurveTo(-38, 12, -36, -10);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#115273";
		ctx.beginPath();
		ctx.moveTo(-18, -18);
		ctx.quadraticCurveTo(-6, -40, 8, -22);
		ctx.quadraticCurveTo(-8, -16, -18, -18);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#b8ecff";
		ctx.beginPath();
		ctx.moveTo(-18, 2);
		ctx.quadraticCurveTo(6, 16, 20, 6);
		ctx.quadraticCurveTo(2, -6, -18, 2);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#0a1b28";
		ctx.beginPath();
		ctx.arc(14, -4, 3.6, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(12.6, -5.2, 1.2, 0, TAU);
		ctx.fill();

		ctx.fillStyle = "#184b6d";
		ctx.beginPath();
		ctx.moveTo(-18, 10);
		ctx.lineTo(-10, 26);
		ctx.lineTo(-2, 12);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(170,214,255,0.55)";
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.moveTo(-4, -2);
		ctx.quadraticCurveTo(2, 2, 10, 4);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-10, -4);
		ctx.quadraticCurveTo(-4, 0, 2, 4);
		ctx.stroke();

		ctx.restore();
	},
	oktopus(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.oktopus;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.2 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -14 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.06);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.12);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const mantleGrad = ctx.createLinearGradient(-28, 0, 36, 0);
		mantleGrad.addColorStop(0, "#1a2d4d");
		mantleGrad.addColorStop(0.4, "#274a7e");
		mantleGrad.addColorStop(1, "#7cc6ff");
		ctx.fillStyle = mantleGrad;
		ctx.beginPath();
		ctx.moveTo(-26, -18);
		ctx.quadraticCurveTo(6, -36, 32, -10);
		ctx.quadraticCurveTo(14, 24, -18, 24);
		ctx.quadraticCurveTo(-34, 8, -26, -18);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "rgba(110,190,255,0.75)";
		ctx.lineWidth = 3.2;
		for (let i = 0; i < 4; i += 1) {
			const t = -8 + i * 6;
			ctx.beginPath();
			ctx.moveTo(-12 + t, 12 + i * 4);
			ctx.quadraticCurveTo(-2 + t * 0.4, 28 + i * 6, 8 + t * 0.2, 18 + i * 5);
			ctx.stroke();
		}

		ctx.fillStyle = "#0b1929";
		ctx.beginPath();
		ctx.arc(16, -6, 4, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.beginPath();
		ctx.arc(14.6, -7.4, 1.4, 0, TAU);
		ctx.fill();

		ctx.restore();
	},
	bogenschreck(ctx, x, y, opts = {}) {
		const scale = opts.scale == null ? 1 : opts.scale;
		const sway = opts.sway == null ? 0 : opts.sway;
		const sprite = SPRITES.bogenschreck;
		if (spriteReady(sprite)) {
			const baseScale = opts.spriteScale == null ? 0.178 : opts.spriteScale;
			const overallScale = baseScale * scale;
			const drawW = sprite.naturalWidth * overallScale;
			const drawH = sprite.naturalHeight * overallScale;
			const offsetX = (opts.spriteOffsetX == null ? -12 : opts.spriteOffsetX) * scale;
			const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(-1, 1);
			ctx.rotate(Math.sin(sway) * 0.06);
			ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			ctx.restore();
			return;
		}

		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.rotate(Math.sin(sway) * 0.1);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const bodyGrad = ctx.createLinearGradient(-36, 0, 40, 0);
		bodyGrad.addColorStop(0, "#123051");
		bodyGrad.addColorStop(0.5, "#1f6c9f");
		bodyGrad.addColorStop(1, "#8be6ff");
		ctx.fillStyle = bodyGrad;
		ctx.beginPath();
		ctx.moveTo(-34, -14);
		ctx.quadraticCurveTo(-6, -34, 36, -10);
		ctx.quadraticCurveTo(22, 12, -18, 20);
		ctx.quadraticCurveTo(-38, 10, -34, -14);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#0d2134";
		ctx.beginPath();
		ctx.moveTo(18, -6);
		ctx.quadraticCurveTo(24, -10, 30, -4);
		ctx.quadraticCurveTo(26, 0, 18, -2);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = "#f8fbff";
		ctx.lineWidth = 2.4;
		ctx.beginPath();
		ctx.moveTo(-10, -20);
		ctx.quadraticCurveTo(12, -4, 30, 12);
		ctx.stroke();
		ctx.strokeStyle = "rgba(255,255,255,0.4)";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.arc(24, 4, 12, -Math.PI / 3, Math.PI / 2);
		ctx.stroke();

		ctx.strokeStyle = "#dfc49a";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(8, -4);
		ctx.quadraticCurveTo(16, -2, 24, 4);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(-12, 4);
		ctx.quadraticCurveTo(0, 0, 8, -4);
		ctx.stroke();

		ctx.fillStyle = "#092031";
		ctx.beginPath();
		ctx.arc(12, -6, 3.2, 0, TAU);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.8)";
		ctx.beginPath();
		ctx.arc(10.8, -7.2, 1.2, 0, TAU);
		ctx.fill();

		ctx.restore();
	},
		ritterfisch(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const charging = !!opts.charging;
			const sprite = SPRITES.ritterfisch;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.18 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(Math.sin(sway) * 0.05 + (charging ? Math.sin(performance.now() * 0.01) * 0.04 : 0));
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.12);
			const bodyGradient = ctx.createLinearGradient(-32, 0, 26, 0);
			bodyGradient.addColorStop(0, "#0d2034");
			bodyGradient.addColorStop(0.6, "#264b6f");
			bodyGradient.addColorStop(1, "#7da3d8");
			ctx.fillStyle = bodyGradient;
			ctx.beginPath();
			ctx.moveTo(-30, -12);
			ctx.quadraticCurveTo(-4, -34, 32, -10);
			ctx.quadraticCurveTo(12, 22, -20, 22);
			ctx.quadraticCurveTo(-34, 8, -30, -12);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#0a1522";
			ctx.beginPath();
			ctx.arc(18, -6, 3.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.82)";
			ctx.beginPath();
			ctx.arc(16.8, -7.4, 1.2, 0, TAU);
			ctx.fill();

			ctx.strokeStyle = "#d2ecff";
			ctx.lineWidth = 2.4;
			ctx.beginPath();
			ctx.moveTo(-6, -14);
			ctx.quadraticCurveTo(20, -8, 30, 12);
			ctx.stroke();

			ctx.restore();
		},
	simpleShadow(ctx, x, y, radius) {
		ctx.save();
		ctx.translate(x, y);
		const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
		grad.addColorStop(0, "rgba(0,0,0,0.35)");
		grad.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, TAU);
		ctx.fill();
		ctx.restore();
	},

	sparkle(ctx, x, y, opts = {}) {
		const radius = opts.radius == null ? 8 : opts.radius;
		const inner = radius * 0.2;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(opts.rotation || 0);
		const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, radius);
		gradient.addColorStop(0, "rgba(210,255,255,0.9)");
		gradient.addColorStop(0.6, "rgba(140,220,240,0.6)");
		gradient.addColorStop(1, "rgba(100,200,230,0)");
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, TAU);
		ctx.fill();
		ctx.restore();
	}
};

function bootGame() {
	if (bootGame.initialized) return;
	bootGame.initialized = true;

	canvas = document.getElementById("game");
	if (!canvas) throw new Error("Canvas 'game' not found");
	ctx = canvas.getContext("2d");

	const hudScore = document.getElementById("score");
	const hudCoins = document.getElementById("coins");
	const hudLevel = document.getElementById("lvl");
	const hudTime = document.getElementById("time");
	const hudHearts = document.getElementById("hearts");
	const hudShield = document.getElementById("ab-shield");
	const hudArmor = document.getElementById("hudArmor");
	const hudSymbols = {
		pferd: document.getElementById("sym-pferd"),
		sprinter: document.getElementById("sym-sprinter"),
		yacht: document.getElementById("sym-yacht")
	};
	const bannerEl = document.getElementById("banner");
	const endOverlay = document.getElementById("endOverlay");
	const endTitle = document.getElementById("endTitle");
	const btnRestart = document.getElementById("btnRestart");
	const btnQuit = document.getElementById("btnQuit");
	const pickupMsg = document.getElementById("pickupMsg");
	const citySpriteDebugPanel = document.getElementById("citySpriteDebugPanel");
	const citySpriteDebugCanvas = document.getElementById("citySpriteDebugCanvas");
	const citySpriteDebugCtx = citySpriteDebugCanvas ? citySpriteDebugCanvas.getContext("2d") : null;
	const citySpriteDebugReset = document.getElementById("citySpriteDebugReset");
	const citySpriteDebugExport = document.getElementById("citySpriteDebugExport");
	const citySpriteDebugOutput = document.getElementById("citySpriteDebugOutput");
	const citySpriteDebugCurrent = document.getElementById("citySpriteDebugCurrent");
	const citySpriteDebugCopy = document.getElementById("citySpriteDebugCopy");
	let cityInventoryEl = document.getElementById("cityInventory");
	if (!cityInventoryEl) {
		cityInventoryEl = document.createElement("aside");
		cityInventoryEl.id = "cityInventory";
		cityInventoryEl.className = "city-inventory";
		cityInventoryEl.setAttribute("aria-label", "Inventar");
		cityInventoryEl.innerHTML = `
			<div class="city-inventory-title">Inventar <span class="city-inventory-sub">I</span></div>
			<div class="city-inventory-section">
				<div class="city-inventory-sub">Ausrüstung</div>
				<div class="city-equip-grid">
					<div class="city-slot" data-slot="weapon">Waffe</div>
					<div class="city-slot" data-slot="armor">Rüstung</div>
					<div class="city-slot" data-slot="armor2">Rüstung II</div>
				</div>
			</div>
			<div class="city-inventory-section">
				<div class="city-inventory-sub">Inventar</div>
				<div class="city-inventory-grid">
					<div class="city-slot" data-slot="inv-1"><span class="city-slot-label">Slot 1</span></div>
					<div class="city-slot" data-slot="inv-2"><span class="city-slot-label">Slot 2</span></div>
					<div class="city-slot" data-slot="inv-3"><span class="city-slot-label">Slot 3</span></div>
					<div class="city-slot" data-slot="inv-4"><span class="city-slot-label">Slot 4</span></div>
					<div class="city-slot" data-slot="inv-5"><span class="city-slot-label">Slot 5</span></div>
					<div class="city-slot" data-slot="inv-6"><span class="city-slot-label">Slot 6</span></div>
					<div class="city-slot" data-slot="inv-7"><span class="city-slot-label">Slot 7</span></div>
					<div class="city-slot" data-slot="inv-8"><span class="city-slot-label">Slot 8</span></div>
					<div class="city-slot" data-slot="inv-9"><span class="city-slot-label">Slot 9</span></div>
				</div>
			</div>
		`;
		document.body.appendChild(cityInventoryEl);
	}
	let cityMerchantEl = document.getElementById("cityMerchant");
	if (!cityMerchantEl) {
		cityMerchantEl = document.createElement("aside");
		cityMerchantEl.id = "cityMerchant";
		cityMerchantEl.className = "city-merchant";
		cityMerchantEl.setAttribute("aria-label", "Händler");
		cityMerchantEl.innerHTML = `
			<div class="city-merchant-title">
				<span>Händler</span>
				<span class="city-merchant-actions">
					<button class="btn" data-action="close-merchant">Schließen</button>
				</span>
			</div>
			<div class="city-merchant-grid" id="cityMerchantGrid"></div>
			<div class="city-merchant-confirm" id="cityMerchantConfirm">
				<div class="city-merchant-confirm-text" id="cityMerchantConfirmText">Item kaufen?</div>
				<div class="city-merchant-confirm-preview" id="cityMerchantConfirmPreview"></div>
				<div class="city-merchant-confirm-effect" id="cityMerchantConfirmEffect"></div>
				<div class="city-merchant-confirm-actions">
					<button class="btn primary" data-action="buy-item">Kaufen</button>
					<button class="btn" data-action="cancel-buy">Abbrechen</button>
				</div>
			</div>
		`;
		document.body.appendChild(cityMerchantEl);
	}
	let cityMissionEl = document.getElementById("cityMission");
	if (!cityMissionEl) {
		cityMissionEl = document.createElement("aside");
		cityMissionEl.id = "cityMission";
		cityMissionEl.className = "city-mission";
		cityMissionEl.setAttribute("aria-label", "Missionen");
		cityMissionEl.innerHTML = `
			<div class="city-mission-title">
				<span>Missionen</span>
				<span class="city-mission-actions">
					<button class="btn" data-action="close-mission">Schließen</button>
				</span>
			</div>
			<div class="city-mission-list" id="cityMissionList"></div>
			<div class="city-mission-confirm" id="cityMissionConfirm">
				<div class="city-mission-confirm-text" id="cityMissionConfirmText">Mission starten?</div>
				<div class="city-mission-confirm-actions">
					<button class="btn primary" data-action="start-mission">Ja</button>
					<button class="btn" data-action="cancel-mission">Nein</button>
				</div>
			</div>
		`;
		document.body.appendChild(cityMissionEl);
	}
	const CITY_DEBUG_ROWS = 3;
	const CITY_DEBUG_COLS = 5;
	const CITY_DEBUG_STORAGE_KEY = "cashfish.citySpriteOffsets.v1";
	const CITY_DEBUG_CROP_KEY = "cashfish.citySpriteCropShift.v1";
	const CITY_DEBUG_STORAGE_VERSION_KEY = "cashfish.citySpriteOffsets.version";
	const CITY_DEBUG_STORAGE_VERSION = "2026-01-29-8";
	let citySpriteOffsets = [
		[
			{ x: 71.33333333333334, y: 9.999999999999996 },
			{ x: 76.66666666666663, y: 22.000000000000004 },
			{ x: 75.3333333333334, y: 13.999999999999996 },
			{ x: 63.33333333333358, y: 17.333333333333 },
			{ x: 82.00000000000018, y: 23.33333333333332 }
		],
		[
			{ x: 68.66666666666659, y: -2.00000000000003 },
			{ x: 80, y: -6.000000000000012 },
			{ x: 87.99999999999999, y: -3.108624468950438e-14 },
			{ x: 64.66666666666659, y: -16.66666666666667 },
			{ x: 74.6666666666667, y: 15.333333333333321 }
		],
		[
			{ x: 75.33333333333334, y: -21.333333333333357 },
			{ x: 60.00000000000002, y: -17.33333333333337 },
			{ x: 68.6666666666667, y: -17.999999999999996 },
			{ x: 48, y: -16.666666666666654 },
			{ x: 65.33333333333336, y: -19.999999999999968 }
		]
	];
	citySpriteCropShift = Array.from(
		{ length: CITY_DEBUG_ROWS },
		() => Array.from(
			{ length: CITY_DEBUG_COLS },
			() => ({ x: 42.66666666666667, y: 13.333333333333336 })
		)
	);
	try {
		const storedVersion = localStorage.getItem(CITY_DEBUG_STORAGE_VERSION_KEY);
		if (storedVersion !== CITY_DEBUG_STORAGE_VERSION) {
			localStorage.removeItem(CITY_DEBUG_STORAGE_KEY);
			localStorage.setItem(CITY_DEBUG_STORAGE_VERSION_KEY, CITY_DEBUG_STORAGE_VERSION);
		}
		const stored = localStorage.getItem(CITY_DEBUG_STORAGE_KEY);
		const storedCrop = localStorage.getItem(CITY_DEBUG_CROP_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed) && parsed.length >= CITY_DEBUG_ROWS) {
				citySpriteOffsets = parsed.map((row, r) => (
					Array.isArray(row) ? row.slice(0, CITY_DEBUG_COLS).map(cell => ({
						x: Number(cell && cell.x) || 0,
						y: Number(cell && cell.y) || 0
					})) : Array.from({ length: CITY_DEBUG_COLS }, () => ({ x: 0, y: 0 }))
				)).slice(0, CITY_DEBUG_ROWS);
			}
		}
		if (storedCrop) {
			const parsed = JSON.parse(storedCrop);
			if (Array.isArray(parsed) && parsed.length >= CITY_DEBUG_ROWS) {
				citySpriteCropShift = parsed.map((row, r) => (
					Array.isArray(row) ? row.slice(0, CITY_DEBUG_COLS).map(cell => ({
						x: Number(cell && cell.x) || 0,
						y: Number(cell && cell.y) || 0
					})) : Array.from({ length: CITY_DEBUG_COLS }, () => ({ x: 0, y: 0 }))
				)).slice(0, CITY_DEBUG_ROWS);
			}
		}
	} catch (err) {
		console.warn("Failed to load city sprite offsets", err);
	}
	const persistCitySpriteOffsets = () => {
		try {
			localStorage.setItem(CITY_DEBUG_STORAGE_KEY, JSON.stringify(citySpriteOffsets));
			localStorage.setItem(CITY_DEBUG_CROP_KEY, JSON.stringify(citySpriteCropShift));
		} catch (err) {
			console.warn("Failed to persist city sprite offsets", err);
		}
	};
	const getCitySpriteOffset = (row, col) => {
		const r = citySpriteOffsets[row];
		const entry = r && r[col];
		return entry ? entry : { x: 0, y: 0 };
	};
	const updateCitySpriteOffset = (row, col, dx, dy) => {
		if (!citySpriteOffsets[row] || !citySpriteOffsets[row][col]) return;
		citySpriteOffsets[row][col].x += dx;
		citySpriteOffsets[row][col].y += dy;
		persistCitySpriteOffsets();
	};
	let citySpriteDrag = null;
	const getDebugCanvasMetrics = () => {
		if (!citySpriteDebugCanvas) return null;
		const sprite = SPRITES.cityPlayer;
		if (!spriteReady(sprite)) return null;
		const frameSize = CITY_SPRITE_FRAME_SIZE;
		const rows = CITY_DEBUG_ROWS;
		const cols = CITY_DEBUG_COLS;
		const scale = Math.min(
			citySpriteDebugCanvas.width / (frameSize * cols),
			citySpriteDebugCanvas.height / (frameSize * rows)
		);
		const sheetW = frameSize * cols * scale;
		const sheetH = frameSize * rows * scale;
		const originX = (citySpriteDebugCanvas.width - sheetW) * 0.5;
		const originY = (citySpriteDebugCanvas.height - sheetH) * 0.5;
		return { frameSize, rows, cols, scale, originX, originY };
	};
	if (citySpriteDebugCanvas) {
		citySpriteDebugCanvas.addEventListener("contextmenu", event => {
			event.preventDefault();
		});
		citySpriteDebugCanvas.addEventListener("mousedown", event => {
			if (!CITY_SPRITE_DEBUG) return;
			const metrics = getDebugCanvasMetrics();
			if (!metrics) return;
			const rect = citySpriteDebugCanvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const localX = x - metrics.originX;
			const localY = y - metrics.originY;
			if (localX < 0 || localY < 0 || localX >= metrics.frameSize * metrics.cols * metrics.scale || localY >= metrics.frameSize * metrics.rows * metrics.scale) return;
			const col = Math.floor(localX / (metrics.frameSize * metrics.scale));
			const row = Math.floor(localY / (metrics.frameSize * metrics.scale));
			if (cityCropMode) {
				const shift = getCitySpriteCropShift(row, col);
				cityCropDrag = {
					row,
					col,
					startX: x,
					startY: y,
					origX: shift.x,
					origY: shift.y,
					scale: metrics.scale
				};
				return;
			}
			if (cityAlignMode || cityCropMode) {
				cityAlignSelectedFrame = { row, col };
				currentCityFrame = { row, col, flip: false };
			}
			const offset = getCitySpriteOffset(row, col);
			citySpriteDrag = {
				row,
				col,
				startX: x,
				startY: y,
				origX: offset.x,
				origY: offset.y,
				scale: metrics.scale
			};
		});
		citySpriteDebugCanvas.addEventListener("mousemove", event => {
			if (!citySpriteDrag && !cityCropDrag) return;
			const rect = citySpriteDebugCanvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			if (citySpriteDrag) {
				const dx = (x - citySpriteDrag.startX) / citySpriteDrag.scale;
				const dy = (y - citySpriteDrag.startY) / citySpriteDrag.scale;
				const row = citySpriteDrag.row;
				const col = citySpriteDrag.col;
				if (citySpriteOffsets[row] && citySpriteOffsets[row][col]) {
					citySpriteOffsets[row][col].x = citySpriteDrag.origX + dx;
					citySpriteOffsets[row][col].y = citySpriteDrag.origY + dy;
					persistCitySpriteOffsets();
				}
			}
			if (cityCropDrag) {
				const dx = (x - cityCropDrag.startX) / cityCropDrag.scale;
				const dy = (y - cityCropDrag.startY) / cityCropDrag.scale;
				const row = cityCropDrag.row;
				const col = cityCropDrag.col;
				if (citySpriteCropShift[row] && citySpriteCropShift[row][col]) {
					citySpriteCropShift[row][col].x = cityCropDrag.origX + dx;
					citySpriteCropShift[row][col].y = cityCropDrag.origY + dy;
					CITY_SPRITE_CACHE.ready = false;
					persistCitySpriteOffsets();
				}
			}
		});
		const endDrag = () => {
			citySpriteDrag = null;
			cityCropDrag = null;
		};
		citySpriteDebugCanvas.addEventListener("mouseup", endDrag);
		citySpriteDebugCanvas.addEventListener("mouseleave", endDrag);
	}
	if (canvas) {
		canvas.addEventListener("mousedown", event => {
			if (!cityAlignMode || state.mode !== "city") return;
			const rect = canvas.getBoundingClientRect();
			const x = (event.clientX - rect.left) * (canvas.width / rect.width);
			const y = (event.clientY - rect.top) * (canvas.height / rect.height);
			cityAlignDrag = {
				startX: x,
				startY: y,
				row: currentCityFrame.row,
				col: currentCityFrame.col,
				flip: currentCityFrame.flip
			};
		});
		canvas.addEventListener("mousemove", event => {
			if (!cityAlignDrag || !cityAlignMode || state.mode !== "city") return;
			const rect = canvas.getBoundingClientRect();
			const x = (event.clientX - rect.left) * (canvas.width / rect.width);
			const y = (event.clientY - rect.top) * (canvas.height / rect.height);
			const dx = (x - cityAlignDrag.startX) / CITY_SPRITE_SCALE;
			const dy = (y - cityAlignDrag.startY) / CITY_SPRITE_SCALE;
			cityAlignDrag.startX = x;
			cityAlignDrag.startY = y;
			updateCitySpriteOffset(cityAlignDrag.row, cityAlignDrag.col, dx, dy);
		});
		const endAlignDrag = () => {
			cityAlignDrag = null;
		};
		canvas.addEventListener("mouseup", endAlignDrag);
		canvas.addEventListener("mouseleave", endAlignDrag);
	}
	if (citySpriteDebugReset) {
		citySpriteDebugReset.addEventListener("click", () => {
			citySpriteOffsets = Array.from({ length: CITY_DEBUG_ROWS }, () => Array.from({ length: CITY_DEBUG_COLS }, () => ({ x: 0, y: 0 })));
			persistCitySpriteOffsets();
			if (citySpriteDebugOutput) citySpriteDebugOutput.value = "";
		});
	}
	if (citySpriteDebugExport) {
		citySpriteDebugExport.addEventListener("click", () => {
			const payload = JSON.stringify({ offsets: citySpriteOffsets, cropShift: citySpriteCropShift }, null, 2);
			if (citySpriteDebugOutput) {
				citySpriteDebugOutput.value = payload;
				citySpriteDebugOutput.focus();
				citySpriteDebugOutput.select();
			}
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(payload).catch(() => {
					// ignore clipboard errors, selection fallback is active
				});
			}
		});
	}
	if (citySpriteDebugCopy) {
		citySpriteDebugCopy.addEventListener("click", async () => {
			if (!citySpriteDebugCurrent) return;
			const text = citySpriteDebugCurrent.textContent || "";
			try {
				await navigator.clipboard.writeText(text);
			} catch (err) {
				if (citySpriteDebugOutput) citySpriteDebugOutput.value = text;
			}
		});
	}
	if (citySpriteDebugOutput) {
		citySpriteDebugOutput.addEventListener("click", () => {
			citySpriteDebugOutput.focus();
			citySpriteDebugOutput.select();
		});
		citySpriteDebugOutput.addEventListener("focus", () => {
			citySpriteDebugOutput.select();
		});
	}

	const keys = new Set();
	const pointer = { down: false, shoot: false };
	let controlsArmed = false;
	const DEBUG_SHORTCUTS = true;
	let cityAlignMode = false;
	let cityAlignDrag = null;
	let currentCityFrame = { row: 0, col: 0, flip: false };
	let cityAlignSelectedFrame = null;
	let cityCropDrag = null;
	let cityCropMode = false;
	let cityInventoryOpen = false;
	let cityShopOpen = false;
	let cityShopSelection = null;
	let cityMissionOpen = false;
	let cityMissionSelection = null;
	let cityDragState = null;
	let cityDragGhost = null;
	const cityInventory = {
		equipment: { weapon: null, armor: null, armor2: null },
		items: Array.from({ length: 9 }, () => null)
	};

	// ============================================================
	// ITEM DEFINITIONS - aus JSON geladen
	// ============================================================
	const CITY_ITEM_DATA = itemsData.items;

	// Konstanten für spezielle Items (Rückwärtskompatibilität)
	const ARMOR_ITEM_NAME = "Rüstung der Meeresbewohner";
	const ARMOR_ITEM_EFFECT = CITY_ITEM_DATA[ARMOR_ITEM_NAME].effect;
	const ARMOR_ITEM_ICON = CITY_ITEM_DATA[ARMOR_ITEM_NAME].icon;

	const getCityItemData = name => {
		if (!name) return null;
		return CITY_ITEM_DATA[name] || { label: name, type: "misc", icon: null, effect: "", price: 0, stats: {} };
	};

	// Shop-Inventar aus JSON laden
	const cityShopItems = shopData.inventory;

	// Missionen aus JSON laden
	const cityMissions = missionsData.missions;

	const state = {
		mode: "game",
		started: false,
		paused: false,
		over: false,
		win: false,
		score: 0,
		coins: 0,
		hearts: 3,
		maxHearts: 5,
		level: 1,
		levelScore: 0,
		elapsed: 0,
		lastTick: performance.now(),
		frameDt: 16,
		player: {
			x: canvas.width * 0.28,
			y: canvas.height * 0.6,
			speed: 0.32,
			baseSpeed: 0.32,
			dir: 1,
			invulnFor: 0,
			shotCooldown: 0,
			energyMax: 100,
			energy: 100,
			energyCost: 35,
			energyRegenRate: 0.04,
			energyRegenDelay: 1200,
			energyRegenTimer: 0,
			perfumeSlowTimer: 0,
			shieldUnlocked: false,
			shieldActive: false,
			shieldTimer: 0,
			shieldCooldown: 0,
			shieldCooldownMax: SHIELD_COOLDOWN,
			shieldDuration: SHIELD_DURATION,
			shieldLastActivation: 0,
			shieldLastBlock: 0
		},
		boss: {
			x: canvas.width * 0.72,
			y: canvas.height * 0.32,
			speed: DEFAULT_BOSS_STATS.speed,
			dir: -1,
			active: false,
			pulse: 0,
			maxHp: DEFAULT_BOSS_STATS.maxHp,
			hp: DEFAULT_BOSS_STATS.maxHp,
			attackTimer: DEFAULT_BOSS_STATS.firstAttackDelay,
			lastAttack: null,
			finFlip: false,
			spriteKey: null,
			spriteScale: null,
			spriteOffsetX: null,
			spriteOffsetY: null,
			spriteFlip: true,
			shadowRadius: 48,
			shadowOffsetX: 16,
			shadowOffsetY: 52,
			entryTargetX: canvas.width * 0.72,
			entryTargetY: canvas.height * 0.48,
			entering: false,
			entryProgress: 0,
			entrySpeed: DEFAULT_BOSS_STATS.speed * 1.4,
			verticalTracking: 0.0024,
			verticalMin: canvas.height * 0.24,
			verticalMax: canvas.height * 0.68,
			verticalOffset: -canvas.height * 0.12,
			horizontalTracking: 0.0024,
			horizontalMin: canvas.width * 0.52,
			horizontalMax: canvas.width * 0.9,
			horizontalOffset: canvas.width * 0.12,
			horizontalOscAmp: canvas.width * 0.08,
			horizontalOscSpeed: 0.0026,
			horizontalForwardBoost: 2.2,
			horizontalBackBoost: 1.25,
			horizontalForwardBias: canvas.width * 0.1,
			horizontalEdgePad: null,
			oscPhase: 0
		},
		foes: [],
		foeSpawnTimer: 0,
		shots: [],
		bossTorpedoes: [],
		bossSweeps: [],
		bossWakeWaves: [],
		bossPerfumeOrbs: [],
		bossFragranceClouds: [],
		bossWhirlpools: [],
		bossKatapultShots: [],
		bossShockwaves: [],
		bossSpeedboats: [],
		bossCoinBursts: [],
		bossCoinExplosions: [],
		bossDiamondBeams: [],
		bossCardBoomerangs: [],
		bossTreasureWaves: [],
		bossCrownColumns: [],
		cashfishUltLock: 0,
		cashfishUltHistory: { tsunamiUsed: false, crownUsed: false },
		healPickups: [],
		healSpawnTimer: 9600,
		healBursts: [],
		symbolDrops: [],
		coinDrops: [],
		coralEffects: [],
		coralAllies: [],
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 14000,
			duration: 6000
		},
		tsunamiWave: null,
		tsunamiAbility: {
			unlocked: false,
			used: false,
			active: false
		},
		symbolInventory: { pferd: false, sprinter: false, yacht: false },
		pendingSymbolAdvance: null,
		eventFlash: null,
		foeArrows: [],
		unlockBossScore: 50,
		bubbles: [],
		coverRocks: [],
		coverRockSpawned: false,
		levelIndex: 0,
		levelConfig: null,
		foeSpawnInterval: { min: 1400, max: 2100 },
		city: null,
		armorShieldCharges: 0
	};
	const syncCityInventoryVisibility = () => {
		if (!cityInventoryEl) return;
		cityInventoryEl.style.display = (state.mode === "city" && cityInventoryOpen) ? "block" : "none";
	};
	const syncCityShopVisibility = () => {
		if (!cityMerchantEl) return;
		cityMerchantEl.style.display = (state.mode === "city" && cityShopOpen) ? "block" : "none";
	};
	const syncCityMissionVisibility = () => {
		if (!cityMissionEl) return;
		cityMissionEl.style.display = (state.mode === "city" && cityMissionOpen) ? "block" : "none";
	};
	const updateCityInventoryUI = () => {
		if (!cityInventoryEl) return;
		const renderSlot = (slotName, label, value) => {
			const el = cityInventoryEl.querySelector(`[data-slot="${slotName}"]`);
			if (!el) return;
			const data = value ? getCityItemData(value) : null;
			el.classList.toggle("filled", !!value);
			el.dataset.item = value || "";
			if (!value) {
				el.innerHTML = `<span class="city-slot-label">${label}</span>`;
				el.title = "";
				return;
			}
			const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
			el.innerHTML = `${iconHtml}<span class="city-slot-name">${data ? data.label : value}</span>`;
			el.title = data ? data.label : value;
		};
		renderSlot("weapon", "Waffe", cityInventory.equipment.weapon);
		renderSlot("armor", "Rüstung", cityInventory.equipment.armor);
		renderSlot("armor2", "Rüstung II", cityInventory.equipment.armor2);
		for (let i = 0; i < cityInventory.items.length; i += 1) {
			const label = `Slot ${i + 1}`;
			const value = cityInventory.items[i];
			renderSlot(`inv-${i + 1}`, label, value);
		}
	};
	const updateCityShopUI = () => {
		if (!cityMerchantEl) return;
		const grid = cityMerchantEl.querySelector("#cityMerchantGrid");
		if (grid && grid.childElementCount === 0) {
			cityShopItems.forEach(item => {
				const data = getCityItemData(item);
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "city-merchant-item";
				if (data && data.icon) {
					btn.classList.add("has-icon");
					btn.innerHTML = `<span class="city-item-name">${data.label}</span><span class="city-item-icon" style="background-image:url('${data.icon}')"></span>`;
					btn.title = data.label;
					btn.setAttribute("aria-label", data.label);
				} else {
					btn.textContent = data ? data.label : item;
				}
				btn.dataset.item = item;
				grid.appendChild(btn);
			});
		}
		const confirm = cityMerchantEl.querySelector("#cityMerchantConfirm");
		const confirmText = cityMerchantEl.querySelector("#cityMerchantConfirmText");
		const confirmPreview = cityMerchantEl.querySelector("#cityMerchantConfirmPreview");
		const confirmEffect = cityMerchantEl.querySelector("#cityMerchantConfirmEffect");
		if (confirm && confirmText) {
			if (cityShopSelection) {
				const data = getCityItemData(cityShopSelection);
				confirm.classList.add("active");
				confirmText.textContent = data ? data.label : cityShopSelection;
				if (confirmPreview) {
					const typeLabel = data && data.type === "armor" ? "Rüstung" : "Item";
					const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
					confirmPreview.innerHTML = `
						<div class="city-merchant-type">${typeLabel}</div>
						<div class="city-merchant-image">${iconHtml}</div>
					`;
				}
				if (confirmEffect) {
					confirmEffect.textContent = data && data.effect ? data.effect : "";
				}
			} else {
				confirm.classList.remove("active");
				confirmText.textContent = "Item kaufen?";
				if (confirmPreview) confirmPreview.textContent = "";
				if (confirmEffect) confirmEffect.textContent = "";
			}
		}
	};
	const updateCityMissionUI = () => {
		if (!cityMissionEl) return;
		const list = cityMissionEl.querySelector("#cityMissionList");
		if (list && list.childElementCount === 0) {
			cityMissions.forEach(mission => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "city-mission-item";
				btn.textContent = `${mission.label} · ${mission.description}`;
				btn.dataset.mission = mission.id;
				list.appendChild(btn);
			});
		}
		const confirm = cityMissionEl.querySelector("#cityMissionConfirm");
		const confirmText = cityMissionEl.querySelector("#cityMissionConfirmText");
		if (confirm && confirmText) {
			if (cityMissionSelection) {
				confirm.classList.add("active");
				confirmText.textContent = "Möchten Sie die Mission starten?";
			} else {
				confirm.classList.remove("active");
				confirmText.textContent = "Mission starten?";
			}
		}
	};
	const getCitySlotItem = slotName => {
		if (!slotName) return null;
		if (slotName.startsWith("inv-")) {
			const index = Math.max(0, Number.parseInt(slotName.split("-")[1], 10) - 1);
			return cityInventory.items[index] || null;
		}
		return cityInventory.equipment[slotName] || null;
	};
	const setCitySlotItem = (slotName, value) => {
		if (!slotName) return;
		if (slotName.startsWith("inv-")) {
			const index = Math.max(0, Number.parseInt(slotName.split("-")[1], 10) - 1);
			cityInventory.items[index] = value || null;
			return;
		}
		cityInventory.equipment[slotName] = value || null;
	};
	const canEquipCityItem = (slotName, itemName) => {
		if (!itemName) return false;
		const data = getCityItemData(itemName);
		if (slotName === "armor") return data && data.type === "armor";
		return slotName === "weapon" || slotName === "armor2";
	};
	const refreshArmorCharge = () => {
		const armorEquipped = cityInventory.equipment.armor === ARMOR_ITEM_NAME;
		state.armorShieldCharges = armorEquipped ? 1 : 0;
		updateHUD();
	};
	const cleanupCityDrag = () => {
		if (cityDragGhost && cityDragGhost.parentElement) cityDragGhost.parentElement.removeChild(cityDragGhost);
		cityDragGhost = null;
		cityDragState = null;
	};
	const beginCityDrag = (slotEl, slotName, itemName, startEvent) => {
		if (!slotEl || !slotName || !itemName) return;
		const data = getCityItemData(itemName);
		cityDragState = { item: itemName, from: slotName };
		cityDragGhost = document.createElement("div");
		cityDragGhost.className = "city-drag-ghost";
		const iconHtml = data && data.icon ? `<span class="city-item-icon" style="background-image:url('${data.icon}')"></span>` : "";
		cityDragGhost.innerHTML = `${iconHtml}<span>${data ? data.label : itemName}</span>`;
		document.body.appendChild(cityDragGhost);
		const moveGhost = e => {
			if (!cityDragGhost) return;
			cityDragGhost.style.left = `${e.clientX + 12}px`;
			cityDragGhost.style.top = `${e.clientY + 12}px`;
		};
		moveGhost(startEvent);
		const handleMove = e => moveGhost(e);
		const handleUp = e => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);
			const target = document.elementFromPoint(e.clientX, e.clientY);
			const slotTarget = target ? target.closest(".city-slot") : null;
			const toSlot = slotTarget ? slotTarget.dataset.slot : null;
			if (toSlot && toSlot !== slotName) {
				const targetItem = getCitySlotItem(toSlot);
				if (toSlot.startsWith("inv-") || canEquipCityItem(toSlot, itemName)) {
					setCitySlotItem(toSlot, itemName);
					setCitySlotItem(slotName, targetItem);
					if (toSlot === "armor" || slotName === "armor") refreshArmorCharge();
					updateCityInventoryUI();
				}
			}
			cleanupCityDrag();
		};
		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp, { once: true });
	};
	const tryAddCityItem = itemName => {
		const slotIndex = cityInventory.items.findIndex(item => !item);
		if (slotIndex === -1) {
			if (bannerEl) bannerEl.textContent = "Inventar voll";
			return false;
		}
		cityInventory.items[slotIndex] = itemName;
		updateCityInventoryUI();
		if (bannerEl) bannerEl.textContent = `Gekauft: ${itemName}`;
		return true;
	};
	updateCityInventoryUI();
	updateCityShopUI();
	updateCityMissionUI();
	if (cityInventoryEl) {
		cityInventoryEl.addEventListener("pointerdown", event => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const slot = target.closest(".city-slot");
			if (!slot) return;
			const slotName = slot.dataset.slot;
			const item = getCitySlotItem(slotName);
			if (!item) return;
			event.preventDefault();
			beginCityDrag(slot, slotName, item, event);
		});
	}
	if (cityMerchantEl) {
		cityMerchantEl.addEventListener("click", event => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const action = target.dataset.action;
			if (action === "close-merchant") {
				cityShopOpen = false;
				cityShopSelection = null;
				updateCityShopUI();
				syncCityShopVisibility();
				return;
			}
			if (action === "cancel-buy") {
				cityShopSelection = null;
				updateCityShopUI();
				return;
			}
			if (action === "buy-item") {
				if (!cityShopSelection) return;
				if (tryAddCityItem(cityShopSelection)) {
					cityShopSelection = null;
					updateCityShopUI();
				}
				return;
			}
			const itemBtn = target.closest(".city-merchant-item");
			const item = itemBtn ? itemBtn.dataset.item : null;
			if (item) {
				cityShopSelection = item;
				updateCityShopUI();
			}
		});
	}
	if (cityMissionEl) {
		cityMissionEl.addEventListener("click", event => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const action = target.dataset.action;
			if (action === "close-mission") {
				cityMissionOpen = false;
				cityMissionSelection = null;
				updateCityMissionUI();
				syncCityMissionVisibility();
				return;
			}
			if (action === "cancel-mission") {
				cityMissionSelection = null;
				updateCityMissionUI();
				return;
			}
			if (action === "start-mission") {
				if (!cityMissionSelection) return;
				cityMissionOpen = false;
				cityMissionSelection = null;
				syncCityMissionVisibility();
				resetGame();
				if (bannerEl) bannerEl.textContent = "Mission gestartet";
				return;
			}
			const missionBtn = target.closest(".city-mission-item");
			const mission = missionBtn ? missionBtn.dataset.mission : null;
			if (mission) {
				cityMissionSelection = mission;
				updateCityMissionUI();
			}
		});
	}
	function seedBubbles() {
		const count = 24;
		state.bubbles = Array.from({ length: count }, () => ({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			r: Math.random() * 3 + 1.4,
			spd: Math.random() * 0.08 + 0.04
		}));
	}

	function spawnFoe(opts = {}) {
		const type = opts.type || "jelly";
		const baseY = opts.baseY == null ? canvas.height * 0.28 + Math.random() * canvas.height * 0.36 : opts.baseY;
		const entry = opts.entryX == null ? canvas.width + 320 : opts.entryX;
		const scale = opts.scale == null ? 0.7 + Math.random() * 0.3 : opts.scale;
		const foe = {
			type,
			x: entry,
			y: baseY,
			baseY,
			speed: opts.speed == null ? (type === "bogenschreck" ? 0.16 + Math.random() * 0.04 : 0.12 + Math.random() * 0.08) : opts.speed,
			sway: Math.random() * TAU,
			scale,
			dead: false
		};
		if (type === "bogenschreck") {
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.64 + Math.random() * 0.06) : opts.anchorX;
			foe.shootTimer = opts.shootTimer == null ? 1200 + Math.random() * 600 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 2400 + Math.random() * 900 : opts.shootCooldown;
			foe.hoverAmplitude = opts.hoverAmplitude == null ? 12 + Math.random() * 6 : opts.hoverAmplitude;
			foe.hoverPhase = Math.random() * TAU;
		} else if (type === "oktopus") {
			const minAnchorX = canvas.width * 0.5;
			const maxAnchorX = canvas.width * 0.8;
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			const initialAnchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const initialAnchorY = opts.anchorY == null ? foe.baseY : opts.anchorY;
			foe.anchorX = clamp(initialAnchorX, minAnchorX, maxAnchorX);
			foe.anchorY = clamp(initialAnchorY, minAnchorY, maxAnchorY);
			foe.shootTimer = opts.shootTimer == null ? 1600 + Math.random() * 380 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 3200 + Math.random() * 620 : opts.shootCooldown;
			foe.volleySpacing = opts.volleySpacing == null ? 260 : opts.volleySpacing;
			foe.burstCount = opts.burstCount == null ? (Math.random() < 0.6 ? 2 : 1) : opts.burstCount;
			foe.burstQueue = 0;
			foe.projectileSpeed = opts.projectileSpeed == null ? 0.38 + Math.random() * 0.04 : opts.projectileSpeed;
			foe.orbitAngle = opts.orbitAngle == null ? Math.random() * TAU : opts.orbitAngle;
			foe.orbitRadius = opts.orbitRadius == null ? 28 + Math.random() * 12 : opts.orbitRadius;
			foe.orbitVertical = opts.orbitVertical == null ? 32 + Math.random() * 14 : opts.orbitVertical;
			foe.orbitSpeed = opts.orbitSpeed == null ? 0.0014 + Math.random() * 0.0006 : opts.orbitSpeed;
			foe.dashDuration = opts.dashDuration == null ? 420 : opts.dashDuration;
			foe.dashDistance = opts.dashDistance == null ? 48 + Math.random() * 12 : opts.dashDistance;
			foe.dashDir = Math.random() < 0.5 ? -1 : 1;
			foe.dashTimer = 0;
			foe.laneShiftTimer = opts.laneShiftTimer == null ? 2400 + Math.random() * 600 : opts.laneShiftTimer;
			foe.laneShiftCooldown = opts.laneShiftCooldown == null ? 2400 + Math.random() * 600 : opts.laneShiftCooldown;
		} else if (type === "ritterfisch") {
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const rawAnchorY = opts.anchorY == null ? baseY + (Math.random() - 0.5) * canvas.height * 0.12 : opts.anchorY;
			foe.anchorY = clamp(rawAnchorY, minAnchorY, maxAnchorY);
			foe.patrolRange = opts.patrolRange == null ? 18 + Math.random() * 10 : opts.patrolRange;
			foe.chargeCooldown = opts.chargeCooldown == null ? 3200 + Math.random() * 600 : opts.chargeCooldown;
			foe.chargeTimer = opts.chargeTimer == null ? 1400 + Math.random() * 600 : opts.chargeTimer;
			foe.charging = false;
			foe.chargeDuration = 0;
			foe.recoverTimer = 0;
			foe.cruiseSpeed = opts.cruiseSpeed == null ? 0.18 + Math.random() * 0.04 : opts.cruiseSpeed;
			foe.chargeSpeed = opts.chargeSpeed == null ? 0.46 + Math.random() * 0.04 : opts.chargeSpeed;
			foe.speed = foe.cruiseSpeed;
		}
		state.foes.push(foe);
		return foe;
	}

	function primeFoes() {
		if (state.levelConfig && typeof state.levelConfig.initialSpawnDelay === "number") state.foeSpawnTimer = state.levelConfig.initialSpawnDelay;
		else scheduleNextFoeSpawn(true);
	}

	function getFoeHitbox(foe, opts = {}) {
		const forPlayer = !!opts.forPlayer;
		if (foe.type === "bogenschreck") {
			const width = forPlayer ? 52 : 44;
			const height = forPlayer ? 36 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "oktopus") {
			const width = forPlayer ? 54 : 46;
			const height = forPlayer ? 40 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "ritterfisch") {
			const width = forPlayer ? 48 : 40;
			const height = forPlayer ? 34 : 26;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		const width = forPlayer ? 42 : 36;
		const height = forPlayer ? 36 : 28;
		return { width: width * foe.scale, height: height * foe.scale };
	}

	function spawnHealPickup() {
		const baseY = canvas.height * 0.28 + Math.random() * canvas.height * 0.42;
		state.healPickups.push({
			x: canvas.width + 120,
			y: baseY,
			vx: 0.08 + Math.random() * 0.05,
			sway: Math.random() * TAU,
			scale: 0.9 + Math.random() * 0.2,
			life: 16000
		});
	}

		function spawnSymbolDrop(kind, opts = {}) {
			const config = SYMBOL_DATA[kind];
			if (!config) return null;
			const now = performance.now();
			const drop = {
				kind,
				x: opts.x == null ? canvas.width * 0.6 : opts.x,
				y: opts.y == null ? canvas.height * 0.5 : opts.y,
				vy: opts.vy == null ? 0.015 : opts.vy,
				sway: Math.random() * TAU,
				swaySpeed: opts.swaySpeed == null ? 0.0024 : opts.swaySpeed,
				amplitude: opts.amplitude == null ? 10 : opts.amplitude,
				scale: opts.scale == null ? 0.26 : opts.scale,
				life: SYMBOL_AUTOCOLLECT_MS,
				spawnTime: now,
				collected: false,
				autoCollected: false,
				cleanupTimer: null
			};
			state.symbolDrops.push(drop);
			return drop;
		}

		function spawnCoinDrop(opts = {}) {
			const initialY = opts.y == null ? canvas.height * 0.5 : opts.y;
			const hoverBandTop = canvas.height * 0.34;
			const hoverBandBottom = canvas.height * 0.68;
			const targetHoverY = clamp(opts.hoverY == null ? initialY : opts.hoverY, hoverBandTop, hoverBandBottom);
			const baseScroll = opts.scrollSpeed == null ? 0.24 + Math.random() * 0.14 : Math.abs(opts.scrollSpeed);
			const drop = {
				x: opts.x == null ? canvas.width * 0.6 : opts.x,
				y: initialY,
				vx: opts.vx == null ? -baseScroll : -Math.abs(opts.vx),
				vy: opts.vy == null ? 0 : opts.vy,
				gravity: opts.gravity == null ? 0.0007 : opts.gravity,
				spin: Math.random() * TAU,
				spinSpeed: opts.spinSpeed == null ? 0.005 + Math.random() * 0.003 : opts.spinSpeed,
				value: Math.max(1, opts.value == null ? 1 : opts.value),
				life: opts.life == null ? 12000 : opts.life,
				collectDuration: opts.collectDuration == null ? 420 : opts.collectDuration,
				collectTimer: 0,
				collected: false,
				dead: false,
				scale: opts.scale == null ? 0.95 + Math.random() * 0.15 : opts.scale,
				hoverY: targetHoverY,
				hoverAmplitude: opts.hoverAmplitude == null ? 24 + Math.random() * 10 : opts.hoverAmplitude,
				hoverPhase: Math.random() * TAU,
				hoverSpeed: opts.hoverSpeed == null ? 0.002 + Math.random() * 0.0012 : opts.hoverSpeed,
				hoverFollow: opts.hoverFollow == null ? 0.0042 : opts.hoverFollow,
				scrollSpeed: baseScroll
			};
			state.coinDrops.push(drop);
			return drop;
		}

		function showPickupMessage(text, duration = 2000) {
			if (!pickupMsg) return;
			pickupMsg.textContent = text;
			pickupMsg.style.display = "block";
			if (pickupHideTimer != null) clearTimeout(pickupHideTimer);
			pickupHideTimer = window.setTimeout(() => {
				if (pickupMsg) pickupMsg.style.display = "none";
				pickupHideTimer = null;
			}, duration);
		}

		function hidePickupMessage() {
			if (pickupHideTimer != null) {
				clearTimeout(pickupHideTimer);
				pickupHideTimer = null;
			}
			if (pickupMsg) pickupMsg.style.display = "none";
		}

		function unlockShieldIfNeeded() {
			if (state.player.shieldUnlocked || state.levelIndex !== 0) return;
			state.player.shieldUnlocked = true;
			state.player.shieldCooldown = 0;
			state.player.shieldActive = false;
			state.player.shieldTimer = 0;
			state.player.shieldLastActivation = 0;
			state.player.shieldLastBlock = 0;
			triggerEventFlash("unlock", { text: "Neue Fähigkeit: Schutzschild", duration: 1500, opacity: 0.86 });
			updateHUD();
		}

		function concludeBossVictory(nextLevelIndex) {
			if (nextLevelIndex < LEVEL_CONFIGS.length) {
				advanceLevel(nextLevelIndex, { skipFlash: false, invulnDuration: 1800 });
				return;
			}
			enterCity();
		}

		function finishPendingSymbolAdvance() {
			const pending = state.pendingSymbolAdvance;
			if (!pending) return;
			const nextLevelIndex = pending.nextLevelIndex;
			state.pendingSymbolAdvance = null;
			concludeBossVictory(nextLevelIndex);
		}

		function collectSymbolDrop(drop, opts = {}) {
			if (!drop || drop.collected) return;
			drop.collected = true;
			drop.autoCollected = !!opts.auto;
			drop.cleanupTimer = 420;
			drop.life = 0;
			const { kind } = drop;
			const config = SYMBOL_DATA[kind];
			if (!state.symbolInventory[kind]) {
				state.symbolInventory[kind] = true;
			}
			const label = config ? config.label : "Symbol";
			if (!opts.silent) {
				const autoSuffix = drop.autoCollected ? " (automatisch)" : "";
				showPickupMessage(`${label} gesichert${autoSuffix}!`, drop.autoCollected ? 1600 : 2200);
			}
			updateHUD();
			if (state.pendingSymbolAdvance && state.pendingSymbolAdvance.symbol === kind) {
				finishPendingSymbolAdvance();
			}
		}

	function getCoinValueForFoe(foe) {
		if (!foe) return 1;
		if (foe.type === "oktopus") return 3;
		if (foe.type === "bogenschreck" || foe.type === "ritterfisch") return 2;
		return 1;
	}

	function collectCoinDrop(drop) {
		if (!drop || drop.collected) return;
		drop.collected = true;
		drop.collectTimer = drop.collectDuration;
		drop.vx = 0;
		drop.vy = -0.05;
		const value = drop.value == null ? 1 : drop.value;
		state.coins += value;
		state.score += value;
		updateHUD();
	}

	function spawnCoverRock(opts = {}) {
		const sprite = SPRITES.coverRock;
		const scale = opts.scale == null ? 0.52 : opts.scale;
		const spriteWidth = spriteReady(sprite) ? sprite.naturalWidth : 540;
		const spriteHeight = spriteReady(sprite) ? sprite.naturalHeight : 420;
		const width = (opts.width == null ? spriteWidth : opts.width) * scale;
		const height = (opts.height == null ? spriteHeight : opts.height) * scale;
		const radiusX = (opts.radiusX == null ? width * 0.45 : opts.radiusX);
		const radiusY = (opts.radiusY == null ? height * 0.4 : opts.radiusY);
		const padX = opts.padX == null ? 0 : opts.padX;
		const padY = opts.padY == null ? 0 : opts.padY;
		const padLeft = opts.padLeft == null ? null : opts.padLeft;
		const padRight = opts.padRight == null ? null : opts.padRight;
		const padTop = opts.padTop == null ? null : opts.padTop;
		const padBottom = opts.padBottom == null ? null : opts.padBottom;
		let groundLine = opts.groundLine == null ? canvas.height - 12 : opts.groundLine;
		if (opts.groundLine == null && state.levelIndex === 2) {
			const levelGround = getLevel3GroundLine();
			if (levelGround != null) groundLine = levelGround;
		}
		const minY = canvas.height * 0.22;
		const maxY = Math.max(minY, groundLine - radiusY);
		const targetY = clamp(groundLine - radiusY, minY, maxY);
		const rock = {
			x: clamp(opts.x == null ? canvas.width * 0.5 : opts.x, canvas.width * 0.24, canvas.width * 0.76),
			y: opts.startY == null ? -height : opts.startY,
			radiusX,
			radiusY,
			width,
			height,
			scale,
			padX,
			padY,
			padLeft,
			padRight,
			padTop,
			padBottom,
			collisionOffsetX: opts.collisionOffsetX == null ? 0 : opts.collisionOffsetX,
			collisionOffsetY: opts.collisionOffsetY == null ? 0 : opts.collisionOffsetY,
			vy: 0,
			gravity: opts.gravity == null ? 0.0011 : opts.gravity,
			maxFallSpeed: opts.maxFallSpeed == null ? 0.68 : opts.maxFallSpeed,
			delay: opts.delay == null ? 620 : Math.max(0, opts.delay),
			groundLine,
			targetY,
			landed: false,
			impactTimer: 0,
			damageCooldown: 0,
			hitPulse: 0
		};
		if (spriteReady(sprite)) {
			rock.collisionMask = getCoverRockCollisionMask(sprite, width, height);
		}
		state.coverRocks.push(rock);
		return rock;
	}

	function maybeSpawnLevelThreeCoverRock() {
		if (state.coverRockSpawned) return;
		if ((state.level || 1) !== 3) return;
		if (state.pendingSymbolAdvance) return;
		const threshold = (state.unlockBossScore || 0) * 0.5;
		if (state.levelScore < threshold) return;
		state.coverRockSpawned = true;
		const rock = spawnCoverRock({ x: canvas.width * 0.5 });
		if (rock) {
			triggerEventFlash("cover", { text: "Felsbrocken fällt!", duration: 1100, opacity: 0.75 });
		}
	}

	function triggerEventFlash(kind, opts = {}) {
		const now = performance.now();
		const duration = opts.duration == null ? 1600 : opts.duration;
		state.eventFlash = {
			kind,
			started: now,
			duration,
			opacity: opts.opacity == null ? 0.9 : opts.opacity,
			text: opts.text || null
		};
	}

	// ============================================================
	// LEVEL CONFIGURATIONS
	// Die Level-Daten sind auch als JSON in src/data/levels/ gespeichert
	// für zukünftige Erweiterungen mit einem Build-System (Vite)
	// ============================================================
	const LEVEL_CONFIGS = [
		{
			id: 1,
			banner: "Level 1: Freischwimmen",
			unlockBossScore: 50,
			spawnInterval: { min: 1400, max: 2100 },
			initialSpawnDelay: 520,
			spawnTable: [{ type: "jelly", weight: 1 }],
			introFlash: { text: "Level 1 – Freischwimmen", duration: 1400, opacity: 0.78 },
			heal: { initialTimer: 6200 },
			boss: {
				maxHp: DEFAULT_BOSS_STATS.maxHp,
				speed: DEFAULT_BOSS_STATS.speed,
				firstAttackDelay: DEFAULT_BOSS_STATS.firstAttackDelay,
				horizontalTracking: 0.0017,
				horizontalMin: canvas.width * 0.38,
				horizontalMax: canvas.width * 0.92,
				horizontalOscAmp: canvas.width * 0.11,
				horizontalOscSpeed: 0.0019,
				horizontalForwardBoost: 2,
				horizontalBackBoost: 2.4,
				horizontalForwardBias: canvas.width * 0.02,
				horizontalEdgePad: 0
			}
		},
		{
			id: 2,
			banner: "Level 2: Pfeilhagelriff",
			unlockBossScore: 120,
			spawnInterval: { min: 1100, max: 1800 },
			initialSpawnDelay: 460,
			spawnTable: [
				{
					type: "bogenschreck",
					weight: 0.42,
					options: () => ({
						scale: 0.8 + Math.random() * 0.18,
						anchorX: canvas.width * (0.62 + Math.random() * 0.08),
						shootCooldown: 2200 + Math.random() * 600,
						shootTimer: 1200 + Math.random() * 600,
						hoverAmplitude: 15 + Math.random() * 6
					})
				},
				{
					type: "jelly",
					weight: 0.58,
					options: () => ({
						scale: 0.7 + Math.random() * 0.24
					})
				}
			],
			introFlash: { text: "Level 2 – Aquischer Bogenschreck", duration: 1600, opacity: 0.82 },
			heal: { initialTimer: 5400 },
			boss: {
				maxHp: 26,
				speed: 0.22,
				firstAttackDelay: 2000,
				pattern: "arrowVolley",
				spriteKey: "parfumKraken",
				spriteScale: 0.36,
				spriteOffsetX: -18,
				spriteOffsetY: -10,
				shadowRadius: 54,
				shadowOffsetX: 10,
				shadowOffsetY: 58,
				volleyCooldown: 2200,
				cloudCooldown: 3000,
				perfumeSpeed: 0.3,
				perfumeSpread: 44,
				cloudDuration: 4200,
				cloudRadius: 68
			}
		},
		{
			id: 3,
			banner: "Level 3: Regatta der Tiefe",
			unlockBossScore: 210,
			spawnInterval: { min: 900, max: 1600 },
			initialSpawnDelay: 420,
			spawnTable: [
				{
					type: "ritterfisch",
					weight: 0.45,
					options: () => ({
						scale: 0.9 + Math.random() * 0.22,
						anchorX: canvas.width * (0.64 + Math.random() * 0.06),
						patrolRange: 22 + Math.random() * 10,
						chargeCooldown: 2800 + Math.random() * 400,
						chargeTimer: 1300 + Math.random() * 400,
						chargeSpeed: 0.48 + Math.random() * 0.05,
						cruiseSpeed: 0.19 + Math.random() * 0.05
					})
				},
				{
					type: "bogenschreck",
					weight: 0.24,
					options: () => ({
						scale: 0.82 + Math.random() * 0.18,
						anchorX: canvas.width * (0.6 + Math.random() * 0.08),
						shootCooldown: 2100 + Math.random() * 560,
						shootTimer: 1000 + Math.random() * 480,
						hoverAmplitude: 16 + Math.random() * 6
					})
				},
				{
					type: "jelly",
					weight: 0.31,
					options: () => ({
						scale: 0.78 + Math.random() * 0.2,
						speed: 0.14 + Math.random() * 0.06
					})
				}
			],
			introFlash: { text: "Level 3 – Regatta der Tiefe", duration: 1700, opacity: 0.82 },
			heal: { initialTimer: 5200 },
			boss: {
				maxHp: 30,
				speed: 0.26,
				firstAttackDelay: 2200,
				pattern: "regatta",
				spriteKey: "yachtwal",
				spriteScale: 0.24,
				spriteOffsetX: -16,
				spriteOffsetY: -16,
				spriteFlip: false,
				shadowRadius: 52,
				shadowOffsetX: 14,
				shadowOffsetY: 56,
				entryTargetX: canvas.width * 0.8,
				horizontalMin: canvas.width * 0.8,
				horizontalMax: canvas.width * 0.8,
				horizontalTracking: 0,
				horizontalOscAmp: 0,
				horizontalForwardBias: 0,
				horizontalEdgePad: 0,
				verticalMin: canvas.height * 0.0,
				verticalMax: canvas.height * 0.9,
				verticalTracking: 0.0036,
				verticalOffset: -canvas.height * 0.1,
				verticalOscAmp: canvas.height * 0.4,
				verticalOscSpeed: 0.0024,
				wakeCooldown: 3200,
				broadsideCooldown: 2500,
				wakeCount: 4,
				broadsideBursts: 2,
				harborCooldown: 4800,
				katapultCooldown: 3600,
				anchorCooldown: 5400,
				regattaRushCooldown: 4400
			}
		},
		{
			id: 4,
			banner: "Level 4: Schatzkammer-Showdown",
			unlockBossScore: 320,
			spawnInterval: { min: 760, max: 1380 },
			initialSpawnDelay: 360,
			spawnTable: [
				{
					type: "oktopus",
					weight: 0.48,
					options: () => ({
						scale: 0.92 + Math.random() * 0.16,
						anchorX: canvas.width * (0.62 + Math.random() * 0.1),
						shootCooldown: 3200 + Math.random() * 620,
						shootTimer: 1500 + Math.random() * 420,
						burstCount: Math.random() < 0.6 ? 2 : 1,
						volleySpacing: 240 + Math.random() * 140,
						projectileSpeed: 0.38 + Math.random() * 0.05,
						orbitRadius: 26 + Math.random() * 12,
						orbitVertical: 32 + Math.random() * 12,
						orbitSpeed: 0.0013 + Math.random() * 0.0005,
						laneShiftCooldown: 2200 + Math.random() * 520,
						laneShiftTimer: 1600 + Math.random() * 360,
						dashDuration: 420 + Math.random() * 120,
						dashDistance: 46 + Math.random() * 18
					})
				},
				{
					type: "ritterfisch",
					weight: 0.3,
					options: () => ({
						scale: 0.94 + Math.random() * 0.18,
						anchorX: canvas.width * (0.64 + Math.random() * 0.05),
						patrolRange: 22 + Math.random() * 12,
						chargeCooldown: 2800 + Math.random() * 360,
						chargeTimer: 1100 + Math.random() * 360,
						chargeSpeed: 0.5 + Math.random() * 0.05,
						cruiseSpeed: 0.2 + Math.random() * 0.05
					})
				},
				{
					type: "bogenschreck",
					weight: 0.22,
					options: () => ({
						scale: 0.88 + Math.random() * 0.16,
						anchorX: canvas.width * (0.62 + Math.random() * 0.08),
						shootCooldown: 2200 + Math.random() * 520,
						shootTimer: 1000 + Math.random() * 420,
						hoverAmplitude: 16 + Math.random() * 6
					})
				}
			],
			introFlash: { text: "Level 4 – Schatzkammer des Cashfish", duration: 1700, opacity: 0.86 },
			heal: { initialTimer: 5000 },
			boss: {
				maxHp: 40,
				speed: 0.24,
				firstAttackDelay: 2200,
				pattern: "cashfish",
				spriteKey: "cashfish",
				spriteScale: 0.425,
				spriteOffsetX: -16,
				spriteOffsetY: -14,
				spriteFlip: false,
				shadowRadius: 72,
				shadowOffsetX: 14,
				shadowOffsetY: 62,
				salvoCooldown: 2700,
				salvoCoinCount: 6,
				salvoKnockback: 0.18,
				latticeCooldown: 3600,
				latticeTelegraph: 1080,
				latticeLaserWidth: 52,
				cardCooldown: 3200,
				cardRingCount: 2,
				cardSpiralDelay: 560,
				cardBoomerangSpeed: 0.36,
				tsunamiCooldown: 5600,
				tsunamiLock: 6400,
				tsunamiWaveCount: 3,
				tsunamiTelegraph: 1200,
				tsunamiActive: 2100,
				tsunamiFade: 520,
				tsunamiSpeed: 0.44,
				tsunamiRadiusX: 124,
				tsunamiRadiusY: 52,
				tsunamiAmplitude: 36,
				tsunamiKnockback: 0.24,
				crownCooldown: 6500,
				crownLock: 7200,
				crownColumnCount: 4,
				crownColumnWidth: 92,
				crownTelegraph: 1300,
				crownActive: 1500,
				crownFade: 520,
				crownKnockback: 0.23
			}
		}
	];

	function getLevelConfig(index) {
		if (index < 0) return LEVEL_CONFIGS[0];
		return LEVEL_CONFIGS[index] || LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
	}

	function scheduleNextFoeSpawn(initial = false) {
		const interval = state.foeSpawnInterval || { min: 1400, max: 2100 };
		const minDelay = interval.min == null ? 1400 : interval.min;
		const maxDelay = interval.max == null ? minDelay + 600 : interval.max;
		const span = Math.max(0, maxDelay - minDelay);
		const delay = minDelay + Math.random() * span;
		state.foeSpawnTimer = initial ? Math.min(delay, 520) : delay;
	}

	function spawnLevelFoe() {
		const config = state.levelConfig;
		if (!config || !Array.isArray(config.spawnTable) || config.spawnTable.length === 0) {
			return spawnFoe();
		}
		const totalWeight = config.spawnTable.reduce((sum, entry) => sum + (entry.weight == null ? 1 : entry.weight), 0);
		let roll = Math.random() * (totalWeight || 1);
		for (const entry of config.spawnTable) {
			const weight = entry.weight == null ? 1 : entry.weight;
			roll -= weight;
			if (roll <= 0) {
				if (typeof entry.spawn === "function") return entry.spawn();
				const opts = typeof entry.options === "function" ? entry.options() : entry.options || {};
				return spawnFoe({ type: entry.type, ...(opts || {}) });
			}
		}
		const fallback = config.spawnTable[config.spawnTable.length - 1];
		if (fallback) {
			const opts = typeof fallback.options === "function" ? fallback.options() : fallback.options || {};
			return spawnFoe({ type: fallback.type, ...(opts || {}) });
		}
		return spawnFoe();
	}

	function applyLevelConfig(index, opts = {}) {
		const config = getLevelConfig(index);
		state.levelIndex = index;
		state.level = config.id == null ? index + 1 : config.id;
		state.levelConfig = config;
		if (state.level >= 3) unlockCoralAllies();
		if (state.level >= 4) unlockTsunamiAbility();
		else {
			state.tsunamiWave = null;
			if (state.tsunamiAbility) {
				state.tsunamiAbility.unlocked = false;
				state.tsunamiAbility.used = false;
				state.tsunamiAbility.active = false;
			}
		}
		state.unlockBossScore = config.unlockBossScore == null ? state.unlockBossScore : config.unlockBossScore;
		state.foeSpawnInterval = {
			min: config.spawnInterval && config.spawnInterval.min != null ? config.spawnInterval.min : 1400,
			max: config.spawnInterval && config.spawnInterval.max != null ? config.spawnInterval.max : 2100
		};
		const healTimer = config.heal && config.heal.initialTimer != null ? config.heal.initialTimer : 6200;
		state.healSpawnTimer = healTimer;
		const bossCfg = config.boss || {};
		state.boss.maxHp = bossCfg.maxHp == null ? DEFAULT_BOSS_STATS.maxHp : bossCfg.maxHp;
		state.boss.hp = state.boss.maxHp;
		state.boss.speed = bossCfg.speed == null ? DEFAULT_BOSS_STATS.speed : bossCfg.speed;
		state.boss.attackTimer = bossCfg.firstAttackDelay == null ? DEFAULT_BOSS_STATS.firstAttackDelay : bossCfg.firstAttackDelay;
		state.boss.spriteKey = bossCfg.spriteKey || null;
		state.boss.spriteScale = bossCfg.spriteScale == null ? null : bossCfg.spriteScale;
		state.boss.spriteOffsetX = bossCfg.spriteOffsetX == null ? null : bossCfg.spriteOffsetX;
		state.boss.spriteOffsetY = bossCfg.spriteOffsetY == null ? null : bossCfg.spriteOffsetY;
		state.boss.spriteFlip = bossCfg.spriteFlip === false ? false : true;
		state.boss.shadowRadius = bossCfg.shadowRadius == null ? 48 : bossCfg.shadowRadius;
		state.boss.shadowOffsetX = bossCfg.shadowOffsetX == null ? 16 : bossCfg.shadowOffsetX;
		state.boss.shadowOffsetY = bossCfg.shadowOffsetY == null ? 52 : bossCfg.shadowOffsetY;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.active = false;
		state.boss.entrySpeed = bossCfg.entrySpeed == null ? Math.max(0.22, state.boss.speed * 1.25) : bossCfg.entrySpeed;
		state.boss.entryTargetX = bossCfg.entryTargetX == null ? canvas.width * 0.72 : bossCfg.entryTargetX;
		state.boss.entryTargetY = bossCfg.entryTargetY == null ? canvas.height * 0.48 : bossCfg.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.oscPhase = 0;
		state.boss.verticalTracking = bossCfg.verticalTracking == null ? 0.0024 : bossCfg.verticalTracking;
		state.boss.verticalMin = bossCfg.verticalMin == null ? canvas.height * 0.24 : bossCfg.verticalMin;
		state.boss.verticalMax = bossCfg.verticalMax == null ? canvas.height * 0.68 : bossCfg.verticalMax;
		state.boss.verticalOffset = bossCfg.verticalOffset == null ? -canvas.height * 0.12 : bossCfg.verticalOffset;
		state.boss.verticalOscAmp = bossCfg.verticalOscAmp == null ? 0 : bossCfg.verticalOscAmp;
		state.boss.verticalOscSpeed = bossCfg.verticalOscSpeed == null ? 0 : bossCfg.verticalOscSpeed;
		state.boss.verticalOscPhase = bossCfg.verticalOscPhase == null ? Math.random() * TAU : bossCfg.verticalOscPhase;
		state.boss.horizontalTracking = bossCfg.horizontalTracking == null ? 0.0024 : bossCfg.horizontalTracking;
		state.boss.horizontalMin = bossCfg.horizontalMin == null ? canvas.width * 0.52 : bossCfg.horizontalMin;
		state.boss.horizontalMax = bossCfg.horizontalMax == null ? canvas.width * 0.9 : bossCfg.horizontalMax;
		state.boss.horizontalOffset = bossCfg.horizontalOffset == null ? canvas.width * 0.12 : bossCfg.horizontalOffset;
		state.boss.horizontalOscAmp = bossCfg.horizontalOscAmp == null ? canvas.width * 0.08 : bossCfg.horizontalOscAmp;
		state.boss.horizontalOscSpeed = bossCfg.horizontalOscSpeed == null ? 0.0026 : bossCfg.horizontalOscSpeed;
		state.boss.horizontalForwardBoost = bossCfg.horizontalForwardBoost == null ? 2.2 : bossCfg.horizontalForwardBoost;
		state.boss.horizontalBackBoost = bossCfg.horizontalBackBoost == null ? 1.25 : bossCfg.horizontalBackBoost;
		state.boss.horizontalForwardBias = bossCfg.horizontalForwardBias == null ? canvas.width * 0.1 : bossCfg.horizontalForwardBias;
		state.boss.horizontalEdgePad = bossCfg.horizontalEdgePad == null ? null : bossCfg.horizontalEdgePad;
		state.boss.oscPhase = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;

		if (bannerEl && config.banner) bannerEl.textContent = config.banner;
		if (!opts.skipFlash && config.introFlash && config.introFlash.text) {
			triggerEventFlash("level", {
				text: config.introFlash.text,
				duration: config.introFlash.duration,
				opacity: config.introFlash.opacity == null ? 0.82 : config.introFlash.opacity
			});
		}

		if (typeof config.initialSpawnDelay === "number") state.foeSpawnTimer = config.initialSpawnDelay;
		else scheduleNextFoeSpawn(true);
	}

	function advanceLevel(nextIndex, opts = {}) {
		state.win = false;
		state.over = false;
		state.paused = false;
		state.started = true;

		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.tsunamiAbility.used = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossShockwaves.length = 0;
		state.bossSpeedboats.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };

		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		if (state.player.shieldUnlocked) state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = opts.invulnDuration == null ? 1600 : opts.invulnDuration;
		state.player.shotCooldown = 0;
		state.player.energyMax = state.player.energyMax == null ? 100 : state.player.energyMax;
		state.player.energy = state.player.energyMax;
		state.player.energyRegenTimer = 0;
		if (opts.healHeart !== false) state.hearts = Math.min(state.hearts + 1, state.maxHearts);

		applyLevelConfig(nextIndex, opts);
		state.levelScore = 0;
		primeFoes();
		const nextEntryX = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		const nextEntryY = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.x = nextEntryX;
		state.boss.y = nextEntryY;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.lastTick = performance.now();
		seedBubbles();
		updateHUD();
		hidePickupMessage();
	}

	function debugJumpToLevel(targetIndex) {
		if (!DEBUG_SHORTCUTS) return;
		const levelIndex = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, targetIndex | 0));
		resetGame();
		state.eventFlash = null;
		advanceLevel(levelIndex, { skipFlash: true, healHeart: false, invulnDuration: 800 });
		state.levelScore = 0;
		state.elapsed = 0;
		if (levelIndex >= 1) {
			state.player.shieldUnlocked = true;
			state.player.shieldActive = false;
			state.player.shieldTimer = 0;
			state.player.shieldCooldown = 0;
			state.player.shieldLastActivation = 0;
			state.player.shieldLastBlock = 0;
		}
		updateHUD();
		if (bannerEl && state.levelConfig && state.levelConfig.banner) bannerEl.textContent = state.levelConfig.banner;
		triggerEventFlash("debug", { text: `Debug: Level ${state.level}`, duration: 1000, opacity: 0.52 });
	}

	function spawnBossTorpedoBurst() {
		const boss = state.boss;
		const enraged = boss.hp <= boss.maxHp * 0.35;
		const count = enraged ? 4 : 3;
		const spread = enraged ? 22 : 18;
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			state.bossTorpedoes.push({
				x: boss.x - 90,
				y: boss.y + offsetIndex * spread,
				vx: -0.46 - Math.random() * 0.06,
				vy: offsetIndex * 0.05,
				life: 5200,
				sway: Math.random() * TAU,
				radius: 18
			});
		}
	}

	function spawnYachtwalBroadside() {
		// Launch staggered, angled torpedoes that mimic a naval broadside.
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const bursts = config && config.broadsideBursts != null ? config.broadsideBursts : 2;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		const lanes = enraged ? 5 : 4;
		for (let b = 0; b < bursts; b += 1) {
			for (let lane = 0; lane < lanes; lane += 1) {
				const offsetIndex = lane - (lanes - 1) / 2;
				const angle = (offsetIndex * 0.14) + (Math.random() - 0.5) * 0.04;
				const speed = 0.52 + b * 0.05 + Math.random() * 0.05 + (enraged ? 0.06 : 0);
				const vx = -Math.cos(angle) * speed;
				const vy = Math.sin(angle) * speed;
				state.bossTorpedoes.push({
					x: boss.x - 80 - b * 18,
					y: boss.y + offsetIndex * 32 + (enraged ? offsetIndex * 6 : 0),
					vx,
					vy,
					life: 5600,
					sway: Math.random() * TAU,
					radius: 20,
					kind: "broadside"
				});
			}
		}
		triggerEventFlash("boss", { text: "Breitseite!", duration: 900, opacity: 0.7 });
	}

	function spawnYachtwalWakeWall() {
		// Generate rolling wake segments that sweep across the arena.
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const count = config && config.wakeCount != null ? config.wakeCount : 4;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			const baseY = clamp(
				boss.y + offsetIndex * (enraged ? 46 : 36),
				canvas.height * 0.22,
				canvas.height * 0.78
			);
			const amplitude = (18 + Math.abs(offsetIndex) * 4) * (enraged ? 1.4 : 1);
			const radiusX = 78 + Math.abs(offsetIndex) * 18;
			const radiusY = 26 + Math.abs(offsetIndex) * 6;
			const life = 3600 + Math.random() * 600 + (enraged ? 500 : 0);
			state.bossWakeWaves.push({
				x: boss.x - 96 - i * 18,
				y: baseY,
				baseY,
				amplitude,
				radiusX,
				radiusY,
				vx: -0.32 - Math.abs(offsetIndex) * 0.03 - (enraged ? 0.05 : 0),
				life,
				initialLife: life,
				phase: Math.random() * TAU,
				freq: 0.0032 + Math.random() * 0.0016,
				hurtCooldown: 0
			});
		}
		triggerEventFlash("boss", { text: "Bugwelle!", duration: 900, opacity: 0.68 });
	}

	function spawnYachtwalHarborSog() {
		const player = state.player;
		const boss = state.boss;
		const minX = canvas.width * 0.18;
		const maxX = canvas.width * 0.6;
		const minY = canvas.height * 0.3;
		const maxY = canvas.height * 0.76;
		const leftBias = canvas.width * 0.06;
		const centerX = clamp(player.x * 0.75 + boss.x * 0.25 - leftBias, minX, maxX);
		const centerY = clamp(player.y, minY, maxY);
		const initialLife = 3200 + Math.random() * 400;
		state.bossWhirlpools.push({
			x: centerX,
			y: centerY,
			minRadius: 52,
			maxRadius: 128,
			radius: 52,
			life: initialLife,
			initialLife,
			spin: Math.random() * TAU,
			pull: 0.0011,
			damageTimer: 0,
			telegraph: 720,
			releaseTriggered: false,
			explosionTimer: 0,
			explosionRadius: 0,
			explosionApplied: false,
			dead: false
		});
		triggerEventFlash("boss", { text: "Hafen-Sog!", duration: 1000, opacity: 0.72 });
	}

	function spawnYachtwalKielwasserKatapult() {
		const boss = state.boss;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		const count = enraged ? 4 : 3;
		const coverRock = state.coverRocks.find(rock => rock.landed);
		const clearanceY = coverRock
			? coverRock.y - (coverRock.radiusY == null ? 60 : coverRock.radiusY) - 40
			: null;
		for (let i = 0; i < count; i += 1) {
			const delay = i * 160;
			const speedBoost = Math.random() * 0.08;
			const launchY = clearanceY == null ? boss.y + 8 : Math.min(boss.y + 8, clearanceY);
			state.bossKatapultShots.push({
				x: boss.x - 70,
				y: launchY,
				vx: -0.46 - speedBoost,
				vy: -0.5 - Math.random() * 0.06,
				gravity: 0.0009 + Math.random() * 0.0002,
				life: 4600 + Math.random() * 400,
				delay,
				radius: 26,
				spin: Math.random() * TAU,
				exploding: false,
				explosionLife: 0,
				explosionRadius: 110,
				damageDone: false,
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Kielwasser-Katapult!", duration: 1000, opacity: 0.7 });
	}

	function spawnYachtwalAnchorDonner() {
		const boss = state.boss;
		const player = state.player;
		const centerX = clamp((boss.x + player.x) / 2, canvas.width * 0.4, canvas.width * 0.8);
		const centerY = clamp(player.y, canvas.height * 0.32, canvas.height * 0.68);
		state.bossShockwaves.push({
			x: centerX,
			y: centerY,
			stage: "telegraph",
			telegraphTimer: 1040,
			waveOneRadius: 0,
			waveTwoRadius: 0,
			waveSpeedOne: 0.28,
			waveSpeedTwo: 0.22,
			waveThicknessOne: 110,
			waveThicknessTwo: 150,
			waitTimer: 560,
			maxRadius: Math.max(canvas.width, canvas.height) * 1.2,
			damageWaveOne: false,
			damageWaveTwo: false,
			anchorPulse: Math.random() * TAU,
			cleanupTimer: 820,
			dead: false
		});
		triggerEventFlash("boss", { text: "Anker-Donner!", duration: 1020, opacity: 0.74 });
	}

	function spawnYachtwalRegattaRaserei() {
		const boss = state.boss;
		const lanes = 10;
		const baseY = canvas.height * 0.24;
		const span = canvas.height * 0.5;
		for (let i = 0; i < lanes; i += 1) {
			const t = lanes <= 1 ? 0.5 : i / (lanes - 1);
			const jitter = (Math.random() - 0.5) * 28;
			const posY = clamp(baseY + span * t + jitter, canvas.height * 0.22, canvas.height * 0.78);
			state.bossSpeedboats.push({
				x: canvas.width + 60 + i * 26,
				y: posY,
				baseY: posY,
				vx: -0.7 - Math.random() * 0.08 - (boss.hp <= boss.maxHp * 0.45 ? 0.06 : 0),
				sway: Math.random() * TAU,
				swaySpeed: 0.0026 + Math.random() * 0.0014,
				swayAmplitude: 14 + Math.random() * 12,
				life: 4200 + Math.random() * 400,
				damageCooldown: 0,
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Regatta-Raserei!", duration: 1050, opacity: 0.7 });
	}

	function spawnCashfishCoinSalvo() {
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const count = config.salvoCoinCount == null ? 6 : Math.max(3, config.salvoCoinCount);
		const knockback = config.salvoKnockback == null ? 0.16 : config.salvoKnockback;
		for (let i = 0; i < count; i += 1) {
			const t = count <= 1 ? 0.5 : i / (count - 1);
			const angle = (-0.22 + t * 0.52) + (Math.random() - 0.5) * 0.12;
			const speed = 0.34 + Math.random() * 0.08;
			const vx = -Math.cos(angle) * speed;
			const vy = -Math.sin(angle) * speed - 0.06;
			state.bossCoinBursts.push({
				x: boss.x - 42,
				y: boss.y + 18,
				vx,
				vy,
				gravity: 0.00032 + Math.random() * 0.00008,
				life: 2600 + Math.random() * 420,
				scale: 0.88 + Math.random() * 0.22,
				knockback,
				damage: 1,
				exploded: false,
				spin: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Goldgier-Salve!", duration: 1000, opacity: 0.78 });
	}

	function spawnCashfishDiamondLattice() {
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const telegraph = config.latticeTelegraph == null ? 1100 : config.latticeTelegraph;
		const active = config.latticeActive == null ? 1200 : config.latticeActive;
		const fade = config.latticeFade == null ? 320 : config.latticeFade;
		const width = config.latticeLaserWidth == null ? 48 : config.latticeLaserWidth;
		const knockback = config.latticeKnockback == null ? 0.16 : config.latticeKnockback;
		const baseOriginX = boss.x - 36;
		const baseOriginY = boss.y + 18;
		const angles = [-0.55, 0, 0.55];
		const splitOffset = 0.24;
		for (const baseAngle of angles) {
			state.bossDiamondBeams.push({
				originX: baseOriginX,
				originY: baseOriginY,
				angle: baseAngle,
				width,
				knockback,
				stage: "telegraph",
				telegraphTimer: telegraph,
				telegraphTotal: telegraph,
				activeTimer: active,
				activeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				damageCooldown: 0
			});
			if (baseAngle !== 0) {
				state.bossDiamondBeams.push({
					originX: baseOriginX,
					originY: baseOriginY + (baseAngle > 0 ? 42 : -42),
					angle: baseAngle + splitOffset * (baseAngle > 0 ? 1 : -1),
					width: width * 0.82,
					knockback,
					stage: "telegraph",
					telegraphTimer: telegraph + 220,
					telegraphTotal: telegraph + 220,
					activeTimer: active * 0.92,
					activeDuration: active * 0.92,
					fadeTimer: fade,
					fadeDuration: fade,
					damageCooldown: 0
				});
			}
		}
		triggerEventFlash("boss", { text: "Diamant-Gitter!", duration: 1100, opacity: 0.82 });
	}

	function spawnCashfishCardShock() {
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const ringCount = config.cardRingCount == null ? 2 : Math.max(1, config.cardRingCount);
		const baseCount = Math.max(4, ringCount * 4);
		const speed = config.cardBoomerangSpeed == null ? 0.34 : config.cardBoomerangSpeed;
		const bounceX = canvas.width * 0.26;
		const orbitDelay = config.cardSpiralDelay == null ? 560 : config.cardSpiralDelay;
		for (let i = 0; i < baseCount; i += 1) {
			const t = i / baseCount;
			const angle = t * TAU;
			const verticalOffset = Math.sin(angle) * 42;
			const vx = -(speed + 0.12 + Math.random() * 0.04);
			const vy = Math.sin(angle) * speed * 0.65;
			state.bossCardBoomerangs.push({
				phase: "outbound",
				x: boss.x - 36,
				y: boss.y + verticalOffset * 0.4,
				vx,
				vy,
				speed,
				bounceX,
				orbitAngle: angle,
				orbitRadius: 70 + (i % ringCount) * 14,
				orbitTimer: orbitDelay,
				life: 6400,
				damage: 1,
				knockback: 0.14,
				elapsed: 0,
				stageTimer: 0,
				ringIndex: i,
				ringTotal: baseCount
			});
		}
		triggerEventFlash("boss", { text: "Kreditkarten-Schock!", duration: 1040, opacity: 0.8 });
	}

	function spawnCashfishTreasureTsunami() {
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const waveCount = config.tsunamiWaveCount == null ? 3 : Math.max(2, config.tsunamiWaveCount);
		const telegraph = config.tsunamiTelegraph == null ? 1100 : config.tsunamiTelegraph;
		const active = config.tsunamiActive == null ? 2000 : config.tsunamiActive;
		const fade = config.tsunamiFade == null ? 420 : config.tsunamiFade;
		const radiusX = config.tsunamiRadiusX == null ? 120 : config.tsunamiRadiusX;
		const radiusY = config.tsunamiRadiusY == null ? 48 : config.tsunamiRadiusY;
		const baseSpeed = config.tsunamiSpeed == null ? 0.42 : config.tsunamiSpeed;
		const amplitude = config.tsunamiAmplitude == null ? 34 : config.tsunamiAmplitude;
		const knockback = config.tsunamiKnockback == null ? 0.22 : config.tsunamiKnockback;
		const damage = config.tsunamiDamage == null ? 1 : config.tsunamiDamage;
		const minY = canvas.height * 0.24;
		const maxY = canvas.height * 0.78;
		for (let i = 0; i < waveCount; i += 1) {
			const t = waveCount <= 1 ? 0.5 : i / (waveCount - 1);
			const jitter = (Math.random() - 0.5) * canvas.height * 0.06;
			const posY = clamp(minY + (maxY - minY) * t + jitter, minY + 28, maxY - 28);
			const speed = baseSpeed + Math.random() * 0.08 + i * 0.02;
			state.bossTreasureWaves.push({
				stage: "telegraph",
				telegraphTimer: telegraph + i * 120,
				telegraphTotal: telegraph + i * 120,
				surgeTimer: active,
				surgeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				x: boss.x + 80 + i * 42,
				y: posY,
				baseY: posY,
				radiusX,
				radiusY,
				vx: -(speed),
				amplitude: amplitude * (0.9 + Math.random() * 0.2),
				wobblePhase: Math.random() * TAU,
				wobbleSpeed: 0.003 + Math.random() * 0.0014,
				damageCooldown: 0,
				knockback,
				damage,
				foamPhase: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Schatzkammer-Tsunami!", duration: 1200, opacity: 0.84 });
	}

	function spawnCashfishCrownFinale() {
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const columnCount = config.crownColumnCount == null ? 4 : Math.max(2, config.crownColumnCount);
		const telegraph = config.crownTelegraph == null ? 1300 : config.crownTelegraph;
		const active = config.crownActive == null ? 1500 : config.crownActive;
		const fade = config.crownFade == null ? 520 : config.crownFade;
		const halfWidth = (config.crownColumnWidth == null ? 92 : config.crownColumnWidth) * 0.5;
		const knockback = config.crownKnockback == null ? 0.24 : config.crownKnockback;
		const damage = config.crownDamage == null ? 1 : config.crownDamage;
		const top = canvas.height * 0.22;
		const bottom = canvas.height * 0.82;
		const left = canvas.width * 0.4;
		const right = canvas.width * 0.84;
		for (let i = 0; i < columnCount; i += 1) {
			const t = columnCount <= 1 ? 0.5 : (i + 0.5) / columnCount;
			let x = left + (right - left) * t + (Math.random() - 0.5) * 40;
			x = clamp(x, canvas.width * 0.36 + halfWidth, canvas.width * 0.88 - halfWidth);
			const delay = (i % 2) * 220 + Math.random() * 140;
			state.bossCrownColumns.push({
				stage: "telegraph",
				telegraphTimer: telegraph + delay,
				telegraphTotal: telegraph + delay,
				activeTimer: active,
				activeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				x,
				top,
				bottom,
				halfWidth,
				damageCooldown: 0,
				knockback,
				damage,
				sparklePhase: Math.random() * TAU,
				pillarPulse: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Kronen-Schlusskonto!", duration: 1280, opacity: 0.84 });
	}

	function renderFoeArrows() {
		if (state.foeArrows.length === 0) return;
		ctx.save();
		for (const arrow of state.foeArrows) {
			const sprite = arrow.spriteKey ? SPRITES[arrow.spriteKey] : null;
			if (sprite && spriteReady(sprite)) {
				const scale = arrow.spriteScale == null ? 0.18 : arrow.spriteScale;
				const drawW = sprite.naturalWidth * scale;
				const drawH = sprite.naturalHeight * scale;
				const offsetX = arrow.spriteOffsetX == null ? 0 : arrow.spriteOffsetX;
				const offsetY = arrow.spriteOffsetY == null ? 0 : arrow.spriteOffsetY;
				ctx.save();
				ctx.translate(arrow.x, arrow.y);
				ctx.rotate(arrow.rotation || 0);
				if (arrow.flip) ctx.scale(-1, 1);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				continue;
			}
			ctx.save();
			ctx.translate(arrow.x, arrow.y);
			ctx.rotate(arrow.rotation || 0);
			const variant = arrow.type || "arrow";
			if (variant === "octo-bolt") {
				const shaftLength = 26;
				const shaftWidth = 6;
				const grad = ctx.createLinearGradient(-shaftLength * 0.5, 0, shaftLength * 0.5, 0);
				grad.addColorStop(0, "rgba(90,140,255,0.25)");
				grad.addColorStop(0.5, "rgba(180,230,255,0.8)");
				grad.addColorStop(1, "rgba(90,140,255,0.25)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.ellipse(0, 0, shaftLength * 0.55, shaftWidth, 0, 0, TAU);
				ctx.fill();
			}
			else if (variant === "octo-blowdart") {
				const bodyLength = 34;
				const bodyRadius = 3.4;
				const tipLength = 9;
				const tailLength = 6;
				const glow = ctx.createRadialGradient(bodyLength * 0.32, 0, 0, bodyLength * 0.32, 0, 12);
				glow.addColorStop(0, "rgba(140,255,240,0.45)");
				glow.addColorStop(1, "rgba(40,120,140,0)");
				ctx.save();
				ctx.globalCompositeOperation = "lighter";
				ctx.globalAlpha = 0.35;
				ctx.fillStyle = glow;
				ctx.beginPath();
				ctx.ellipse(bodyLength * 0.34, 0, 14, 6, 0, 0, TAU);
				ctx.fill();
				ctx.restore();

				const bodyGrad = ctx.createLinearGradient(-bodyLength * 0.5, 0, bodyLength * 0.5, 0);
				bodyGrad.addColorStop(0, "rgba(20,40,80,0.65)");
				bodyGrad.addColorStop(0.45, "rgba(24,140,180,0.95)");
				bodyGrad.addColorStop(1, "rgba(180,255,255,0.9)");
				ctx.fillStyle = bodyGrad;
				ctx.beginPath();
				ctx.moveTo(-bodyLength * 0.5, -bodyRadius * 0.9);
				ctx.lineTo(bodyLength * 0.5 - tipLength, -bodyRadius * 0.9);
				ctx.quadraticCurveTo(bodyLength * 0.5 - bodyRadius * 0.2, -bodyRadius * 0.4, bodyLength * 0.5, 0);
				ctx.quadraticCurveTo(bodyLength * 0.5 - bodyRadius * 0.2, bodyRadius * 0.4, bodyLength * 0.5 - tipLength, bodyRadius * 0.9);
				ctx.lineTo(-bodyLength * 0.5, bodyRadius * 0.9);
				ctx.quadraticCurveTo(-bodyLength * 0.5 - tailLength * 0.5, bodyRadius * 0.6, -bodyLength * 0.5 - tailLength, 0);
				ctx.quadraticCurveTo(-bodyLength * 0.5 - tailLength * 0.5, -bodyRadius * 0.6, -bodyLength * 0.5, -bodyRadius * 0.9);
				ctx.closePath();
				ctx.fill();

				const spineGrad = ctx.createLinearGradient(-bodyLength * 0.4, 0, bodyLength * 0.38, 0);
				spineGrad.addColorStop(0, "rgba(220,255,255,0)");
				spineGrad.addColorStop(0.6, "rgba(240,255,255,0.68)");
				spineGrad.addColorStop(1, "rgba(255,255,255,0.95)");
				ctx.fillStyle = spineGrad;
				ctx.beginPath();
				ctx.moveTo(-bodyLength * 0.32, -bodyRadius * 0.45);
				ctx.quadraticCurveTo(bodyLength * 0.12, -bodyRadius * 0.15, bodyLength * 0.42, 0);
				ctx.quadraticCurveTo(bodyLength * 0.12, bodyRadius * 0.15, -bodyLength * 0.32, bodyRadius * 0.45);
				ctx.closePath();
				ctx.fill();

				ctx.fillStyle = "rgba(24,70,110,0.85)";
				ctx.beginPath();
				ctx.moveTo(-bodyLength * 0.5 - tailLength * 0.2, 0);
				ctx.lineTo(-bodyLength * 0.5 - tailLength, bodyRadius * 1.3);
				ctx.lineTo(-bodyLength * 0.5 - tailLength, -bodyRadius * 1.3);
				ctx.closePath();
				ctx.fill();

				ctx.fillStyle = "rgba(180,255,255,0.9)";
				ctx.beginPath();
				ctx.moveTo(bodyLength * 0.5, 0);
				ctx.lineTo(bodyLength * 0.5 - tipLength * 0.6, bodyRadius * 0.95);
				ctx.lineTo(bodyLength * 0.5 - tipLength * 0.6, -bodyRadius * 0.95);
				ctx.closePath();
				ctx.fill();

				ctx.globalAlpha = 0.75;
				ctx.strokeStyle = "rgba(15,50,90,0.55)";
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(-bodyLength * 0.48, -bodyRadius * 0.8);
				ctx.lineTo(bodyLength * 0.45, -bodyRadius * 0.2);
				ctx.moveTo(-bodyLength * 0.48, bodyRadius * 0.8);
				ctx.lineTo(bodyLength * 0.45, bodyRadius * 0.2);
				ctx.stroke();
				ctx.globalAlpha = 1;
			} else {
				const shaftLength = 32;
				const shaftWidth = 3;
				ctx.fillStyle = "#e6d6b8";
				ctx.fillRect(-shaftLength * 0.5, -shaftWidth * 0.5, shaftLength, shaftWidth);
				ctx.fillStyle = "#c9a86f";
				ctx.fillRect(-shaftLength * 0.5, -shaftWidth * 0.5, shaftLength * 0.7, shaftWidth);
				ctx.fillStyle = "#f0f6ff";
				ctx.beginPath();
				ctx.moveTo(shaftLength * 0.5, 0);
				ctx.lineTo(shaftLength * 0.5 - 6, 4);
				ctx.lineTo(shaftLength * 0.5 - 6, -4);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#b0c6ff";
				ctx.beginPath();
				ctx.moveTo(-shaftLength * 0.5, 0);
				ctx.lineTo(-shaftLength * 0.5 - 6, 4);
				ctx.lineTo(-shaftLength * 0.5 - 6, -4);
				ctx.closePath();
				ctx.fill();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function spawnBossFinSweep() {
		const boss = state.boss;
		boss.finFlip = !boss.finFlip;
		const downward = boss.finFlip;
		const baseY = downward ? canvas.height * 0.28 : canvas.height * 0.72;
		const dirY = downward ? 1 : -1;
		const enraged = boss.hp <= boss.maxHp * 0.35;
		const segments = enraged ? 6 : 5;
		for (let i = 0; i < segments; i += 1) {
			state.bossSweeps.push({
				x: canvas.width + 160 + i * 40,
				y: baseY + dirY * i * 34,
				vx: -0.56,
				vy: dirY * 0.14,
				radius: 38,
				life: 3600,
				delay: i * 160,
				phase: Math.random() * TAU
			});
		}
	}

	function spawnFragranceCloud(x, y, opts = {}) {
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		const duration = opts.duration == null ? (bossCfg && bossCfg.cloudDuration != null ? bossCfg.cloudDuration : 3800) : opts.duration;
		const radius = opts.radius == null ? (bossCfg && bossCfg.cloudRadius != null ? bossCfg.cloudRadius : 60) : opts.radius;
		state.bossFragranceClouds.push({
			x,
			y,
			radius,
			baseRadius: radius,
			life: duration,
			duration,
			growth: opts.growth == null ? 0.015 : opts.growth,
			driftX: opts.driftX == null ? -0.02 : opts.driftX,
			driftY: opts.driftY == null ? -0.01 : opts.driftY,
			swirl: Math.random() * TAU,
			pulse: Math.random() * TAU
		});
	}

	function spawnBossPerfumeVolley() {
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const spread = config && config.perfumeSpread != null ? config.perfumeSpread : 38;
		const baseSpeed = config && config.perfumeSpeed != null ? config.perfumeSpeed : 0.32;
		const count = 3;
		const player = state.player;
		const targetX = player.x;
		const targetY = player.y;
		const originBaseX = boss.x - 62;
		const originBaseY = boss.y;
		const baseAngle = Math.atan2(targetY - originBaseY, targetX - originBaseX);
		const angleStep = (spread * Math.PI) / 360; // convert spread degrees-ish into radians
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			const angle = baseAngle + offsetIndex * angleStep + (Math.random() - 0.5) * 0.05;
			const speed = baseSpeed + Math.random() * 0.06;
			const dirX = Math.cos(angle);
			const dirY = Math.sin(angle);
			const perpendicularX = -dirY;
			const perpendicularY = dirX;
			const lateralOffset = offsetIndex * (spread * 0.32);
			const forwardOffset = 28;
			const spawnX = originBaseX + dirX * forwardOffset + perpendicularX * lateralOffset * 0.1;
			const spawnY = originBaseY + dirY * forwardOffset + perpendicularY * lateralOffset * 0.1;
			const life = 5200 + Math.random() * 800;
			state.bossPerfumeOrbs.push({
				x: spawnX,
				y: spawnY,
				vx: dirX * speed,
				vy: dirY * speed,
				life,
				initialLife: life,
				sway: Math.random() * TAU,
				spin: Math.random() * TAU,
				trailTimer: 360 + Math.random() * 160,
				trailInterval: 420 + Math.random() * 160,
				radius: 18,
				spawnedAt: performance.now(),
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Duftsalve!", duration: 1000, opacity: 0.7 });
	}

	function spawnBossFragranceWave() {
		const config = state.levelConfig && state.levelConfig.boss;
		const cloudCount = 4;
		const positions = [];
		const xMin = canvas.width * 0.32;
		const xMax = canvas.width * 0.9;
		const yMin = canvas.height * 0.22;
		const yMax = canvas.height * 0.78;
		const baseRadius = config && config.cloudRadius ? config.cloudRadius * 0.7 : 48;
		const minDistance = baseRadius * 1.4;
		for (let i = 0; i < cloudCount; i += 1) {
			let posX = 0;
			let posY = 0;
			let attempts = 0;
			do {
				posX = xMin + Math.random() * (xMax - xMin);
				posY = yMin + Math.random() * (yMax - yMin);
				attempts += 1;
			} while (
				attempts < 12 &&
				positions.some(p => Math.hypot(p.x - posX, p.y - posY) < minDistance)
			);
			positions.push({ x: posX, y: posY });
			spawnFragranceCloud(posX, posY, {
				growth: 0.018,
				driftX: -0.035 + (Math.random() - 0.5) * 0.015,
				driftY: (Math.random() - 0.5) * 0.03,
				radius: baseRadius,
				duration: config && config.cloudDuration ? config.cloudDuration * 0.85 : 3200
			});
		}
		triggerEventFlash("boss", { text: "Duftwolken!", duration: 1100, opacity: 0.75 });
	}

	function spawnOktopusBolt(foe) {
		const player = state.player;
		const originX = foe.x - 28;
		const originY = foe.y - 6;
		const targetX = player.x + (Math.random() - 0.5) * 26;
		const targetY = player.y + (Math.random() - 0.5) * 20;
		const dx = targetX - originX;
		const dy = targetY - originY;
		const dist = Math.hypot(dx, dy) || 1;
		const speed = foe.projectileSpeed == null ? 0.38 + Math.random() * 0.04 : foe.projectileSpeed;
		const vx = (dx / dist) * speed;
		const vy = (dy / dist) * speed;
		const wobbleSpeed = 0.0036 + Math.random() * 0.0014;
		const useClassic = !!USE_CLASSIC_OKTOPUS_PROJECTILE;
		state.foeArrows.push({
			type: useClassic ? "octo-bolt" : "octo-blowdart",
			x: originX,
			y: originY,
			vx,
			vy,
			life: 4200,
			rotation: Math.atan2(vy, vx) + Math.PI,
			damage: 1,
			spriteKey: useClassic ? "oktopusProjectile" : null,
			spriteScale: useClassic ? 0.15 : undefined,
			spriteOffsetX: useClassic ? 4 : undefined,
			spriteOffsetY: useClassic ? -1 : undefined,
			flip: useClassic ? true : undefined,
			wobblePhase: Math.random() * TAU,
			wobbleSpeed,
			wobbleAmplitude: 12 + Math.random() * 6,
			hitRadius: useClassic ? 18 : 26,
			parryRadius: useClassic ? 13 : 18
		});
	}

	function spawnBogenschreckArrow(foe) {
		const player = state.player;
		const originX = foe.x - 34;
		const originY = foe.y - 10;
		const dx = player.x - originX;
		const dy = player.y - originY;
		const dist = Math.hypot(dx, dy) || 1;
		const speed = 0.46 + Math.random() * 0.06;
		const vx = (dx / dist) * speed;
		const vy = (dy / dist) * speed;
		state.foeArrows.push({
			type: "arrow",
			x: originX,
			y: originY,
			vx,
			vy,
			life: 4800,
			rotation: Math.atan2(vy, vx),
			damage: 1,
			hitRadius: 24,
			parryRadius: 16
		});
	}

	function playerShoot() {
		if (state.over || state.paused || !state.started) return;
		const player = state.player;
		if (player.shotCooldown > 0) return;
		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		const energyCost = player.energyCost == null ? 35 : player.energyCost;
		if ((player.energy == null ? energyMax : player.energy) < energyCost) return;
		state.shots.push({
			x: player.x + 26,
			y: player.y - 6,
			vx: 0.64,
			vy: -0.02,
			life: 900,
			spriteScale: 0.1,
			spriteOffsetX: 6,
			spriteOffsetY: 0
		});
		player.energy = Math.max(0, (player.energy == null ? energyMax : player.energy) - energyCost);
		if (player.energy <= 0) player.energyRegenTimer = player.energyRegenDelay == null ? 1200 : player.energyRegenDelay;
		player.shotCooldown = 220;
	}

	function hasKey(keySet) {
		for (const key of keySet) {
			if (keys.has(key)) return true;
		}
		return false;
	}

	function isShieldActivationKey(event) {
		if (!event) return false;
		if (KEY_SHIELD.has(event.key)) return true;
		return CODE_SHIELD.has(event.code || "");
	}

	function isCoralActivationKey(event) {
		if (!event) return false;
		if (KEY_CORAL.has(event.key)) return true;
		return CODE_CORAL.has(event.code || "");
	}

	function isTsunamiActivationKey(event) {
		if (!event) return false;
		if (KEY_TSUNAMI.has(event.key)) return true;
		return CODE_TSUNAMI.has(event.code || "");
	}

	function isCityShortcut(event) {
		if (!event) return false;
		const isFive = event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
		if (!isFive) return false;
		if (event.altKey && event.shiftKey) return true;
		if (event.ctrlKey || event.metaKey) return false;
		return state.mode !== "city";
	}

	function isCityShortcutCandidate(event) {
		if (!event) return false;
		return event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
	}

	function tryActivateShield() {
		const player = state.player;
		if (!player.shieldUnlocked || player.shieldActive || player.shieldCooldown > 0) return;
		if (state.over || state.paused || !state.started) return;
		player.shieldActive = true;
		player.shieldTimer = player.shieldDuration || SHIELD_DURATION;
		player.shieldCooldown = 0;
		player.shieldLastActivation = performance.now();
		player.perfumeSlowTimer = 0;
		triggerEventFlash("shield", { text: "Schild aktiv!", duration: 900, opacity: 0.7 });
		updateHUD();
	}

	// --- Coral allies ability (test block for easy removal) ---
	function unlockCoralAllies() {
		const ability = state.coralAbility;
		if (!ability || ability.unlocked) return;
		ability.unlocked = true;
		ability.active = false;
		ability.timer = 0;
		ability.cooldown = 0;
		triggerEventFlash("ally", { text: "Korallenverbündete bereit (R)", duration: 1400, opacity: 0.75 });
	}

	function spawnCoralAppearanceFx(x, y) {
		state.coralEffects.push({
			kind: "ring",
			mode: "spawn",
			x,
			y,
			life: 520,
			maxLife: 520,
			startRadius: 10,
			endRadius: 58,
			startAlpha: 0.65,
			endAlpha: 0,
			startLine: 6,
			endLine: 1.2
		});
		state.coralEffects.push({
			kind: "spark",
			mode: "spawn",
			x,
			y,
			life: 660,
			maxLife: 660,
			radiusStart: 12,
			radiusEnd: 30,
			rotation: Math.random() * TAU,
			rotationSpeed: (Math.random() - 0.5) * 0.004
		});
	}

	function spawnCoralFadeFx(x, y) {
		state.coralEffects.push({
			kind: "ring",
			mode: "fade",
			x,
			y,
			life: 520,
			maxLife: 520,
			startRadius: 46,
			endRadius: 10,
			startAlpha: 0.55,
			endAlpha: 0,
			startLine: 4,
			endLine: 0.8
		});
		state.coralEffects.push({
			kind: "spark",
			mode: "fade",
			x,
			y,
			life: 520,
			maxLife: 520,
			radiusStart: 26,
			radiusEnd: 6,
			rotation: Math.random() * TAU,
			rotationSpeed: (Math.random() - 0.5) * 0.0035
		});
	}

	function spawnCoralAlliesFormation() {
		const player = state.player;
		const allies = [];
		const count = 2;
		for (let i = 0; i < count; i += 1) {
			const orbitDir = i === 0 ? 1 : -1;
			const baseAngle = orbitDir === 1 ? Math.PI * 0.12 : Math.PI * 0.88;
			const radius = 128 + i * 8;
			const bobPhase = Math.random() * TAU;
			const ally = {
				angle: baseAngle,
				radius,
				turnSpeed: 0.0016 + i * 0.0003,
				orbitDir,
				shootTimer: 120 + i * 80,
				shootInterval: 420 + i * 60,
				bobPhase,
				contactRadius: 42,
				spriteKey: i === 0 ? "coralAllyOne" : "coralAllyTwo",
				spriteScale: 0.16,
				spriteOffsetX: -4,
				spriteOffsetY: -10,
				spriteRotationOffset: 0
			};
			const verticalOffset = Math.sin(bobPhase) * 6;
			ally.x = player.x + Math.cos(baseAngle) * radius;
			ally.y = player.y + Math.sin(baseAngle) * (radius * 0.42) + verticalOffset - 24;
			allies.push(ally);
			spawnCoralAppearanceFx(ally.x, ally.y);
		}
		state.coralAllies = allies;
	}

	function spawnCoralAllyShot(origin) {
		state.shots.push({
			x: (origin && origin.x) == null ? state.player.x + 24 : origin.x + 18,
			y: (origin && origin.y) == null ? state.player.y - 8 : origin.y - 6,
			vx: 0.7,
			vy: -0.02 + Math.sin(origin && origin.angle != null ? origin.angle : 0) * 0.015,
			life: 1300,
			spriteScale: 0.085,
			spriteOffsetX: 5,
			spriteOffsetY: 0,
			coralShot: true
		});
	}

	function tryActivateCoralAllies() {
		const ability = state.coralAbility;
		if (!ability || !ability.unlocked) return false;
		if (ability.active || ability.cooldown > 0) return false;
		if (state.level < 3) return false;
		if (state.over || state.paused || !state.started) return false;
		spawnCoralAlliesFormation();
		ability.active = true;
		ability.timer = ability.duration == null ? 6000 : ability.duration;
		triggerEventFlash("ally", { text: "Korallenverbündete aktiv!", duration: 900, opacity: 0.65 });
		return true;
	}

	function updateCoralAllies(dt) {
		const ability = state.coralAbility;
		if (!ability) return;
		if (!ability.active) {
			if (state.coralAllies.length) {
				for (const ally of state.coralAllies) {
					if (ally && ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
				}
			}
			state.coralAllies.length = 0;
			if (ability.cooldown > 0) ability.cooldown = Math.max(0, ability.cooldown - dt);
			return;
		}
		const player = state.player;
		ability.timer = Math.max(0, ability.timer - dt);
		for (const ally of state.coralAllies) {
			const orbitDir = ally.orbitDir == null ? 1 : ally.orbitDir;
			const turnSpeed = ally.turnSpeed == null ? 0.0018 : ally.turnSpeed;
			ally.angle = (ally.angle == null ? (orbitDir > 0 ? Math.PI * 0.2 : Math.PI * 0.8) : ally.angle) + turnSpeed * dt * orbitDir;
			ally.bobPhase = (ally.bobPhase || 0) + dt * 0.0042;
			const radius = ally.radius == null ? 120 : ally.radius;
			const offsetY = Math.sin(ally.bobPhase) * 6;
			ally.x = player.x + Math.cos(ally.angle) * radius;
			ally.y = player.y + Math.sin(ally.angle) * (radius * 0.42) + offsetY - 24;
			ally.shotTimer = (ally.shotTimer == null ? 0 : ally.shotTimer) - dt;
			if (ally.shotTimer <= 0) {
				spawnCoralAllyShot(ally);
				ally.shotTimer = ally.shootInterval == null ? 420 : ally.shootInterval;
			}
			const contactRadius = ally.contactRadius == null ? 40 : ally.contactRadius;
			for (const foe of state.foes) {
				if (foe.dead) continue;
				const dx = foe.x - ally.x;
				const dy = foe.y - ally.y;
				if (Math.hypot(dx, dy) < contactRadius) {
					foe.dead = true;
					awardFoeDefeat(foe);
					if (ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
					ally.destroyed = true;
					break;
				}
			}
		}
		if (state.coralAllies.length) state.coralAllies = state.coralAllies.filter(ally => !ally.destroyed);
		if (ability.timer <= 0) {
			if (state.coralAllies.length) {
				for (const ally of state.coralAllies) {
					if (ally && ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
				}
			}
			ability.active = false;
			ability.timer = 0;
			ability.cooldown = ability.cooldownMax == null ? 14000 : ability.cooldownMax;
			state.coralAllies.length = 0;
		}
	}
	// --- End coral allies block ---

	// --- Tsunami ability (Level 4 single-use) ---
	function unlockTsunamiAbility(opts = {}) {
		const ability = state.tsunamiAbility;
		if (!ability) return;
		const firstUnlock = !ability.unlocked;
		ability.unlocked = true;
		ability.used = false;
		ability.active = false;
		state.tsunamiWave = null;
		if (!opts.silent && firstUnlock) {
			triggerEventFlash("tsunami", { text: "Neue Kraft: Tsunami (T)", duration: 1400, opacity: 0.78 });
		}
	}

	function tryActivateTsunamiAbility() {
		const ability = state.tsunamiAbility;
		if (!ability || !ability.unlocked) return false;
		if (ability.used || ability.active) return false;
		if (state.level < 4) return false;
		if (state.over || state.paused || !state.started) return false;
		ability.active = true;
		ability.used = true;
		const waveWidth = Math.max(canvas.width * 0.24, 240);
		const bubbleCount = 26;
		const bubbles = [];
		for (let i = 0; i < bubbleCount; i += 1) {
			bubbles.push({
				x: Math.random(),
				y: Math.random(),
				radius: 10 + Math.random() * 20,
				speed: 0.00016 + Math.random() * 0.00022,
				drift: 0.6 + Math.random() * 1.6,
				alpha: 0.16 + Math.random() * 0.22
			});
		}
		state.tsunamiWave = {
			x: -waveWidth - 140,
			width: waveWidth,
			speed: 0.46,
			energy: 1,
			elapsed: 0,
			crestY: canvas.height * 0.58,
			amplitude: canvas.height * 0.18,
			bubbles,
			detailOffset: Math.random() * TAU
		};
		triggerEventFlash("tsunami", { text: "Tsunami der Stille!", duration: 1100, opacity: 0.8 });
		return true;
	}

	function updateTsunamiWave(dt) {
		const wave = state.tsunamiWave;
		if (!wave) return;
		wave.elapsed = (wave.elapsed || 0) + dt;
		wave.x += (wave.speed || 0.4) * dt;
		wave.energy = Math.max(0, (wave.energy == null ? 1 : wave.energy) - dt * 0.00004);
		const width = wave.width == null ? 220 : wave.width;
		const left = wave.x;
		const right = wave.x + width;
		for (const foe of state.foes) {
			if (foe.dead) continue;
			if (foe.x <= right + 8) {
				foe.dead = true;
				awardFoeDefeat(foe);
			}
		}
		state.foes = state.foes.filter(foe => !foe.dead);
		state.foeArrows = state.foeArrows.filter(arrow => arrow.x > right + 12);
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.x > right + 24);
		state.bossKatapultShots = state.bossKatapultShots.filter(shot => shot.x > right + 16);
		state.bossSpeedboats = state.bossSpeedboats.filter(boat => boat.x > right + 32);
		state.bossCoinBursts = state.bossCoinBursts.filter(coin => coin.x > right + 18);
		state.bossCardBoomerangs = state.bossCardBoomerangs.filter(card => card.x > right + 20);
		state.bossPerfumeOrbs = state.bossPerfumeOrbs.filter(orb => orb.x > right + 18);
		state.bossFragranceClouds = state.bossFragranceClouds.filter(cloud => cloud.x > right + 18);
		state.bossWhirlpools = state.bossWhirlpools.filter(whirl => whirl.x > right + 18 || whirl.dead);
		const boss = state.boss;
		if (boss.active && !state.over && right >= boss.x - 60) {
			boss.stunTimer = Math.max(boss.stunTimer || 0, 2600);
		}
		if (left > canvas.width + width + 20) {
			state.tsunamiWave = null;
			if (state.tsunamiAbility) state.tsunamiAbility.active = false;
		}
	}
	// --- End tsunami block ---

	function buildCityState() {
		// SEITENANSICHT Stadt wie Level 1-4
		// Gebäude mit 10 Stockwerken, von unten nach oben - VERDOPPELT
		const width = canvas.width;
		const height = canvas.height;
		
		// Gebäude-Position (beginnt links, größer als Canvas)
		const buildingX = 100; // Fester Startpunkt links
		const buildingY = -CITY_BUILDING_HEIGHT + height; // Gebäude ragt nach oben über Canvas
		
		// Boden-Offset für Spieler/NPC-Positionierung (muss mit updateCity übereinstimmen)
		const FLOOR_OFFSET = CITY_FLOOR_THICKNESS + 0;
		
		// Individuelle Offsets pro Stockwerk (gemessen mit Debug-Tool)
		// Stock 0: -32px, Stock 1: +40px, Stock 2: +133px, Stock 3: +220px
		const FLOOR_INDIVIDUAL_OFFSETS = {
			0: -32,
			1: 40,
			2: 133,
			3: 220
		};
		
		// Berechne Stockwerk-Positionen (Y-Koordinate für jeden Stock)
		// Stock 0 = Erdgeschoss (unten), Stock 9 = oben
		const floors = [];
		for (let i = 0; i < CITY_FLOOR_COUNT; i++) {
			const floorY = buildingY + CITY_BUILDING_HEIGHT - (i + 1) * CITY_FLOOR_HEIGHT;
			floors.push({
				index: i,
				y: floorY,
				// Luke-Position (mittig im Stockwerk)
				hatchX: buildingX + CITY_BUILDING_WIDTH / 2 - CITY_HATCH_WIDTH / 2,
				hatchY: floorY, // Luke ist am oberen Rand des Stockwerks
				hasHatch: i < CITY_FLOOR_COUNT - 1 // Oberstes Stockwerk hat keine Luke nach oben
			});
		}
		
		// Hilfsfunktion für Boden-Y-Position (mit individuellen Offsets)
		const getFloorGroundY = (floorIndex) => {
			const indivOffset = FLOOR_INDIVIDUAL_OFFSETS[floorIndex] || 0;
			return floors[floorIndex].y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET + indivOffset;
		};
		
		// Spieler startet links im Erdgeschoss (ursprüngliche Position)
		const player = {
			x: buildingX + 150,
			y: getFloorGroundY(0), // Korrekte Boden-Position
			r: CITY_PLAYER_RADIUS,
			dir: 1, // Blickrichtung (1 = rechts, -1 = links)
			floor: 0, // Aktuelles Stockwerk (nur für Referenz, nicht für Kollision)
			moving: false,
			animTime: 0,
			swimming: false // true wenn durch Luke schwimmend
		};
		
		// NPCs auf verschiedenen Stockwerken - verteilt über das größere Gebäude
		// Missionen auf Stock 1, Händler auf Stock 2
		const npcs = [
			{ 
				id: "quest", 
				label: "Missionen", 
				x: buildingX + 400, 
				y: getFloorGroundY(1), // Korrekte Boden-Position
				floor: 1
			},
			{ 
				id: "merchant", 
				label: "Händler", 
				x: buildingX + CITY_BUILDING_WIDTH - 500, 
				y: getFloorGroundY(2) + 10, // Etwas nach unten verschoben
				floor: 2
			}
		];
		
		// Kamera folgt dem Spieler
		const cameraY = Math.max(0, Math.min(
			player.y - height / 2,
			CITY_BUILDING_HEIGHT - height
		));
		
		return {
			width,
			height,
			buildingX,
			buildingY,
			buildingWidth: CITY_BUILDING_WIDTH,
			buildingHeight: CITY_BUILDING_HEIGHT,
			floors,
			player,
			camera: { x: 0, y: cameraY },
			npcs,
			floorHeight: CITY_FLOOR_HEIGHT,
			hatchWidth: CITY_HATCH_WIDTH,
			wallThickness: CITY_WALL_THICKNESS,
			floorThickness: CITY_FLOOR_THICKNESS
		};
	}

	function enterCity() {
		state.mode = "city";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.level = 5;
		state.levelIndex = LEVEL_CONFIGS.length;
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.eventFlash = null;
		state.pendingSymbolAdvance = null;
		state.city = buildCityState();
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.boss.active = false;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossSpeedboats.length = 0;
		state.tsunamiWave = null;
		state.eventFlash = null;
		pointer.shoot = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		cityInventoryOpen = false;
		cityShopOpen = false;
		cityShopSelection = null;
		cityMissionOpen = false;
		cityMissionSelection = null;
		syncCityInventoryVisibility();
		syncCityShopVisibility();
		syncCityMissionVisibility();
		if (bannerEl) bannerEl.textContent = "Unterwasserstadt";
		if (endOverlay) endOverlay.style.display = "none";
		const gameWrap = document.getElementById("gameWrap");
		const startScreen = document.getElementById("startScreen");
		const cutWrap = document.getElementById("cutWrap");
		if (gameWrap) gameWrap.style.display = "block";
		if (startScreen) startScreen.style.display = "none";
		if (cutWrap) cutWrap.style.display = "none";
		controlsArmed = true;
		updateHUD();
	}

	function resetGame() {
		state.mode = "game";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.score = 0;
		state.coins = 0;
		state.hearts = 3;
		state.levelIndex = 0;
		state.levelScore = 0;
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;
		state.player.shieldUnlocked = false;
		state.player.shieldActive = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		cityInventoryOpen = false;
		cityShopOpen = false;
		cityShopSelection = null;
		cityMissionOpen = false;
		cityMissionSelection = null;
		syncCityInventoryVisibility();
		syncCityShopVisibility();
		syncCityMissionVisibility();
		state.player.shieldTimer = 0;
		state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = 0;
		state.player.shotCooldown = 0;
		state.boss.entryTargetX = canvas.width * 0.72;
		state.boss.entryTargetY = canvas.height * 0.48;
		state.boss.x = state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY;
		state.boss.dir = -1;
		state.boss.active = false;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.unlocked = false;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.coralAbility.cooldown = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.unlocked = false;
		state.tsunamiAbility.used = false;
		state.tsunamiAbility.active = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bubbles.length = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.city = null;
		applyLevelConfig(0, { skipFlash: false });
		state.boss.x = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.dir = -1;
		primeFoes();
		seedBubbles();
		updateHUD();
		hidePickupMessage();
		if (endOverlay) endOverlay.style.display = "none";
		controlsArmed = true;
	}

	function showGameOver(titleText) {
		state.over = true;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.healPickups.length = 0;
		state.eventFlash = null;
		state.healBursts.length = 0;
		state.healBursts.length = 0;
		state.foeArrows.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		state.player.shieldLastBlock = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.pendingSymbolAdvance = null;
		if (endOverlay) endOverlay.style.display = "flex";
		if (endTitle) endTitle.textContent = titleText || "Danke fürs Spielen!";
		hidePickupMessage();
	}

	function winGame() {
		if (state.over) return;
		const currentLevelIndex = state.levelIndex || 0;
		const nextLevelIndex = currentLevelIndex + 1;
		const symbolKind = LEVEL_SYMBOL_SEQUENCE[currentLevelIndex];
		state.boss.active = false;
		state.boss.hp = 0;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossShockwaves.length = 0;
		state.bossSpeedboats.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralEffects.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		hidePickupMessage();
		unlockShieldIfNeeded();
		if (symbolKind && !state.symbolInventory[symbolKind]) {
			const dropX = clamp(state.boss.x, canvas.width * 0.32, canvas.width * 0.78);
			const dropY = Math.min(canvas.height * 0.74, state.boss.y + 120);
			const drop = spawnSymbolDrop(symbolKind, { x: dropX, y: dropY });
			state.pendingSymbolAdvance = { symbol: symbolKind, nextLevelIndex };
			const config = SYMBOL_DATA[symbolKind];
			const label = config ? config.label : "Symbol";
			if (drop) {
				triggerEventFlash("symbol", { text: `${label} gefallen!`, duration: 1400, opacity: 0.8 });
				showPickupMessage(`${label} aufnehmen!`, 2600);
				if (bannerEl) bannerEl.textContent = "Symbol einsammeln!";
			} else {
				state.symbolInventory[symbolKind] = true;
				updateHUD();
				finishPendingSymbolAdvance();
			}
			return;
		}
		concludeBossVictory(nextLevelIndex);
	}

	function activateBoss() {
		state.boss.active = true;
		const targetX = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		const targetY = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		const caveEntry = (state.level || 1) === 1;
		if (caveEntry) {
			const startX = canvas.width + Math.max(140, canvas.width * 0.12);
			const startY = Math.min(canvas.height * 0.68, targetY + canvas.height * 0.26);
			state.boss.x = startX;
			state.boss.y = startY;
			state.boss.entering = true;
			state.boss.entryProgress = 0;
			state.boss.entrySpeed = state.boss.entrySpeed == null ? Math.max(0.24, state.boss.speed * 1.25) : state.boss.entrySpeed;
		} else {
			state.boss.x = targetX;
			state.boss.y = targetY;
			state.boss.entering = false;
			state.boss.entryProgress = 1;
		}
		state.boss.oscPhase = 0;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.hp = state.boss.maxHp;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		state.boss.attackTimer = bossCfg && bossCfg.firstAttackDelay != null ? bossCfg.firstAttackDelay : 1600;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		if (bannerEl) bannerEl.textContent = "Bosskampf! Besiege die Bedrohung";
	}

	function updateHUD() {
		if (hudScore) hudScore.textContent = state.score.toString();
		if (hudCoins) hudCoins.textContent = state.coins.toString();
		if (hudLevel) hudLevel.textContent = state.level.toString();
		if (hudHearts) hudHearts.textContent = "❤".repeat(state.hearts);
		if (hudTime) hudTime.textContent = (state.elapsed / 1000).toFixed(1);
		if (bannerEl && state.boss.active) bannerEl.textContent = `Bosskampf – HP ${state.boss.hp}/${state.boss.maxHp}`;
		if (hudShield) {
			const player = state.player;
			const unlocked = !!player.shieldUnlocked;
			hudShield.classList.toggle("locked", !unlocked);
			hudShield.classList.toggle("active", unlocked && player.shieldActive);
			hudShield.classList.toggle("ready", unlocked && !player.shieldActive && player.shieldCooldown <= 0);
			hudShield.classList.toggle("cooldown", unlocked && !player.shieldActive && player.shieldCooldown > 0);
			if (unlocked && !player.shieldActive && player.shieldCooldown > 0) {
				const seconds = Math.ceil(player.shieldCooldown / 1000);
				hudShield.textContent = seconds.toString();
			} else {
				hudShield.textContent = "🛡";
			}
			if (!unlocked) hudShield.title = "Schild (Shift/E) – besiege Boss 1";
			else if (player.shieldActive) hudShield.title = "Schild aktiv";
			else if (player.shieldCooldown > 0) hudShield.title = `Schild lädt (${Math.ceil(player.shieldCooldown / 1000)}s)`;
			else hudShield.title = "Schild bereit (Shift/E)";
		}
		if (hudArmor) {
			const armorEquipped = cityInventory.equipment.armor === ARMOR_ITEM_NAME;
			const armorReady = armorEquipped && state.armorShieldCharges > 0 && state.mode === "game";
			hudArmor.classList.toggle("active", armorReady);
			hudArmor.classList.toggle("inactive", !armorReady);
			hudArmor.style.display = armorEquipped ? "inline-flex" : "none";
			hudArmor.title = armorEquipped ? (armorReady ? "Rüstung aktiv – nächster Treffer wird neutralisiert" : "Rüstung verbraucht (lädt in der Stadt)") : "";
		}
		if (hudSymbols) {
			for (const [kind, el] of Object.entries(hudSymbols)) {
				if (!el) continue;
				const owned = !!(state.symbolInventory && state.symbolInventory[kind]);
				el.classList.toggle("owned", owned);
				const config = SYMBOL_DATA[kind];
				if (owned && config && config.asset) {
					el.style.backgroundImage = `url("${config.asset}")`;
				} else {
					el.style.backgroundImage = "none";
				}
			}
		}
	}

	function updatePlayer(dt) {
		const player = state.player;
		const prevX = player.x;
		const prevY = player.y;
		if (player.invulnFor > 0) player.invulnFor = Math.max(0, player.invulnFor - dt);
		if (player.shotCooldown > 0) player.shotCooldown = Math.max(0, player.shotCooldown - dt);
		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		if (player.energy == null) player.energy = energyMax;
		if (player.energyRegenTimer == null) player.energyRegenTimer = 0;
		if (player.energyRegenTimer > 0) {
			player.energyRegenTimer = Math.max(0, player.energyRegenTimer - dt);
		} else if (player.energy < energyMax) {
			const regenRate = player.energyRegenRate == null ? 0.04 : player.energyRegenRate;
			player.energy = Math.min(energyMax, player.energy + regenRate * dt);
		}
		if (player.perfumeSlowTimer > 0) player.perfumeSlowTimer = Math.max(0, player.perfumeSlowTimer - dt);
		if (pointer.shoot) playerShoot();
		if (player.shieldActive) {
			player.shieldTimer = Math.max(0, player.shieldTimer - dt);
			if (player.shieldTimer <= 0) {
				player.shieldActive = false;
				player.shieldTimer = 0;
				player.shieldCooldown = player.shieldCooldownMax == null ? SHIELD_COOLDOWN : player.shieldCooldownMax;
			}
		} else if (player.shieldCooldown > 0) {
			player.shieldCooldown = Math.max(0, player.shieldCooldown - dt);
		}
		const baseSpeed = player.baseSpeed == null ? player.speed : player.baseSpeed;
		const effectiveSpeed = player.perfumeSlowTimer > 0 ? baseSpeed * 0.72 : baseSpeed;
		let moveX = 0;
		let moveY = 0;
		if (hasKey(KEY_LEFT)) moveX -= 1;
		if (hasKey(KEY_RIGHT)) moveX += 1;
		if (hasKey(KEY_UP)) moveY -= 1;
		if (hasKey(KEY_DOWN)) moveY += 1;
		if (pointer.down) moveY -= 0.4;
		if (moveX || moveY) {
			const len = Math.hypot(moveX, moveY) || 1;
			const dx = (moveX / len) * effectiveSpeed * dt;
			const dy = (moveY / len) * effectiveSpeed * dt;
			player.x = clamp(player.x + dx, 60, canvas.width - 60);
			player.y = clamp(player.y + dy, 60, canvas.height - 60);
			if (Math.abs(moveX) > 0.1) player.dir = moveX > 0 ? 1 : -1;
		}
		resolvePlayerCoverCollision(player, prevX, prevY);
	}

	function updateCity(dt) {
		const city = state.city;
		if (!city) return;
		const player = city.player;
		const floors = city.floors;
		
		// ===== BEWEGUNGSEINGABE =====
		let moveX = 0;
		let moveY = 0;
		if (hasKey(KEY_LEFT)) moveX -= 1;
		if (hasKey(KEY_RIGHT)) moveX += 1;
		if (hasKey(KEY_UP)) moveY -= 1;
		if (hasKey(KEY_DOWN)) moveY += 1;
		
		player.moving = !!(moveX || moveY);
		
		// ===== GRID-BASIERTE KOLLISION =====
		// Prüft ob eine Position im begehbaren Grid liegt
		// WICHTIG: y ist die Füße-Position, aber wir prüfen die Mitte des Spielers
		const PLAYER_VISUAL_OFFSET = 71; // Spieler wird ca. 71px oberhalb von y gezeichnet
		
		const isPositionWalkable = (x, y) => {
			// Position relativ zum Gebäude
			// Wir prüfen die MITTE des Spielers, nicht die Füße
			const relX = x - city.buildingX;
			const relY = (y - PLAYER_VISUAL_OFFSET) - city.buildingY;
			
			// Grid-Zelle berechnen
			const col = Math.floor(relX / CITY_GRID_CELL_SIZE);
			const row = Math.floor(relY / CITY_GRID_CELL_SIZE);
			
			// Außerhalb des Grids = blockiert (Spieler bleibt im Haus)
			if (col < 0 || col >= CITY_GRID_COLS || row < 0 || row >= CITY_GRID_ROWS) {
				return false;
			}
			
			// Prüfe Grid
			const key = `${col},${row}`;
			const grid = window.CITY_WALKABLE_GRID || {};
			
			// Wenn Grid leer ist, erlaube alles (noch nicht konfiguriert)
			if (Object.keys(grid).length === 0) {
				return true;
			}
			
			return grid[key] === true;
		};
		
		// ===== BEWEGUNG IM WASSER - GRID-BASIERT =====
		// Der Fisch kann sich nur auf markierten Grid-Zellen bewegen
		
		if (player.moving) {
			player.animTime += dt;
			
			// Berechne neue Position
			let newX = player.x;
			let newY = player.y;
			
			if (moveX !== 0) {
				newX += moveX * CITY_SPEED * dt;
				player.dir = moveX > 0 ? 1 : -1;
			}
			if (moveY !== 0) {
				newY += moveY * CITY_SPEED * dt;
			}
			
			// Gebäude-Grenzen
			const minX = city.buildingX + city.wallThickness + player.r;
			const maxX = city.buildingX + city.buildingWidth - city.wallThickness - player.r;
			const minY = city.buildingY + player.r;
			const maxY = city.buildingY + city.buildingHeight - player.r;
			
			newX = clamp(newX, minX, maxX);
			newY = clamp(newY, minY, maxY);
			
			// Prüfe ob neue Position begehbar ist
			if (isPositionWalkable(newX, newY)) {
				player.x = newX;
				player.y = newY;
			} else {
				// Versuche nur horizontale Bewegung
				if (moveX !== 0 && isPositionWalkable(newX, player.y)) {
					player.x = newX;
				}
				// Versuche nur vertikale Bewegung
				else if (moveY !== 0 && isPositionWalkable(player.x, newY)) {
					player.y = newY;
				}
			}
		} else {
			player.animTime = 0;
		}
		
		// ===== KAMERA UPDATE - folgt dem Spieler =====
		// Im Grid-Editor-Modus: Kamera wird extern gesteuert
		if (!window.CITY_GRID_EDIT_MODE) {
			// Kamera Y-Offset so dass Spieler im sichtbaren Bereich bleibt
			const targetCamY = player.y - city.height / 2;
			// Kamera-Grenzen: nicht über das Gebäude hinaus scrollen (vertikal)
			const minCamY = city.buildingY;
			const maxCamY = city.buildingY + city.buildingHeight - city.height;
			city.camera.y = clamp(targetCamY, minCamY, maxCamY);
			
			// Kamera X für horizontales Scrollen - ERWEITERT um Wasser zu sehen
			// Kamera folgt dem Spieler immer, auch über Gebäudegrenzen hinaus
			const targetCamX = player.x - city.width / 2;
			// Erweiterte Grenzen: 200px links und rechts vom Gebäude sichtbar
			const waterPadding = 200;
			const minCamX = city.buildingX - waterPadding;
			const maxCamX = city.buildingX + city.buildingWidth - city.width + waterPadding;
			city.camera.x = clamp(targetCamX, minCamX, maxCamX);
		} else {
			// Grid-Editor-Modus: Kamera-Werte von außen übernehmen
			if (typeof window.CITY_CAMERA_X_DEBUG === 'number') {
				city.camera.x = window.CITY_CAMERA_X_DEBUG;
			}
			if (typeof window.CITY_CAMERA_Y_DEBUG === 'number') {
				city.camera.y = window.CITY_CAMERA_Y_DEBUG;
			}
		}
		
		state.elapsed += dt;
	}

function isPointInsideCover(rock, x, y, padX = 0, padY = 0) {
		if (rock.collisionMask) {
			const mask = rock.collisionMask;
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const width = mask.worldWidth;
			const height = mask.worldHeight;
			const localX = x - centerX + width * 0.5;
			const localY = y - centerY + height * 0.5;
			if (localX < 0 || localY < 0 || localX > width || localY > height) return false;
			const px = Math.floor(localX * mask.scaleX);
			const py = Math.floor(localY * mask.scaleY);
			if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) return false;
			const expandX = Math.max(0, Math.ceil(Math.max(0, padX) * mask.scaleX));
			const expandY = Math.max(0, Math.ceil(Math.max(0, padY) * mask.scaleY));
			const startX = Math.max(0, px - expandX);
			const endX = Math.min(mask.width - 1, px + expandX);
			const startY = Math.max(0, py - expandY);
			const endY = Math.min(mask.height - 1, py + expandY);
			for (let iy = startY; iy <= endY; iy++) {
				const rowOffset = iy * mask.width;
				for (let ix = startX; ix <= endX; ix++) {
					if (mask.data[rowOffset + ix]) return true;
				}
			}
			return false;
		}
		const baseRadiusX = rock.radiusX == null ? 80 : rock.radiusX;
		const baseRadiusY = rock.radiusY == null ? 60 : rock.radiusY;
		const padBaseX = rock.padX == null ? 0 : rock.padX;
		const padBaseY = rock.padY == null ? 0 : rock.padY;
		const radiusX = Math.max(1, baseRadiusX + padBaseX + padX);
		const radiusY = Math.max(1, baseRadiusY + padBaseY + padY);
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		const dx = x - centerX;
		const dy = y - centerY;
		const nx = dx / radiusX;
		const ny = dy / radiusY;
		return nx * nx + ny * ny < 1;
	}

function computeCoverSurfaceNormal(rock, x, y) {
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		if (rock.collisionMask) {
			const mask = rock.collisionMask;
			const localX = x - centerX + mask.worldWidth * 0.5;
			const localY = y - centerY + mask.worldHeight * 0.5;
			const px = Math.floor(localX * mask.scaleX);
			const py = Math.floor(localY * mask.scaleY);
			const sample = (ix, iy) => {
				if (ix < 0 || ix >= mask.width || iy < 0 || iy >= mask.height) return 0;
				return mask.data[iy * mask.width + ix] ? 1 : 0;
			};
			let dx = sample(px + 1, py) - sample(px - 1, py);
			let dy = sample(px, py + 1) - sample(px, py - 1);
			let nx = -dx;
			let ny = -dy;
			let len = Math.hypot(nx, ny);
			if (len < 1e-3) {
				nx = x - centerX;
				ny = y - centerY;
				len = Math.hypot(nx, ny);
			}
			if (len < 1e-3) return { x: 1, y: 0 };
			return { x: nx / len, y: ny / len };
		}
		const nx = x - centerX;
		const ny = y - centerY;
		const len = Math.hypot(nx, ny);
		if (len < 1e-3) return { x: 1, y: 0 };
		return { x: nx / len, y: ny / len };
	}

function resolveCoverCollisionForPoint(rock, currX, currY, prevX, prevY) {
		// Project the moving point back to the first safe position outside the sprite mask.
		if (!isPointInsideCover(rock, currX, currY)) return null;
		let insideX = currX;
		let insideY = currY;
		let outsideX = prevX;
		let outsideY = prevY;
		if (isPointInsideCover(rock, outsideX, outsideY)) {
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const dirX = insideX - centerX;
			const dirY = insideY - centerY;
			const len = Math.hypot(dirX, dirY) || 1;
			let step = 0;
			let found = false;
			while (step < 96) {
				outsideX = insideX + (dirX / len) * (step + 2);
				outsideY = insideY + (dirY / len) * (step + 2);
				if (!isPointInsideCover(rock, outsideX, outsideY)) {
					found = true;
					break;
				}
				step += 4;
			}
			if (!found) {
				const safeRadiusX = Math.max(rock.radiusX == null ? 80 : rock.radiusX, rock.width == null ? 0 : rock.width * 0.5);
				const safeRadiusY = Math.max(rock.radiusY == null ? 60 : rock.radiusY, rock.height == null ? 0 : rock.height * 0.5);
				outsideX = centerX + (dirX / len) * (safeRadiusX + 80);
				outsideY = centerY + (dirY / len) * (safeRadiusY + 80);
			}
		}
		for (let i = 0; i < 8; i++) {
			const midX = (insideX + outsideX) * 0.5;
			const midY = (insideY + outsideY) * 0.5;
			if (isPointInsideCover(rock, midX, midY)) {
				insideX = midX;
				insideY = midY;
			} else {
				outsideX = midX;
				outsideY = midY;
			}
		}
		let resolvedX = outsideX;
		let resolvedY = outsideY;
		if (isPointInsideCover(rock, resolvedX, resolvedY)) {
			const fallbackNormal = computeCoverSurfaceNormal(rock, insideX, insideY);
			resolvedX -= fallbackNormal.x * 2;
			resolvedY -= fallbackNormal.y * 2;
		}
		const normal = computeCoverSurfaceNormal(rock, insideX, insideY);
		return {
			collided: true,
			x: resolvedX,
			y: resolvedY,
			normal,
			hitPointX: insideX,
			hitPointY: insideY
		};
	}

// Encourage AI agents to step around the rock instead of sticking to its surface.
function applyCoverAvoidance(entity, opts = {}) {
	if (state.coverRocks.length === 0) return false;
	const padX = opts.padX == null ? 60 : opts.padX;
	const padY = opts.padY == null ? 52 : opts.padY;
	const detourDuration = opts.detourDuration == null ? 820 : opts.detourDuration;
	const detourSpeed = opts.detourSpeed;
	const pushSpeed = opts.pushSpeed;
	const cooldown = opts.cooldown == null ? 420 : opts.cooldown;
	const allowHorizontal = opts.allowHorizontal !== false;
	for (const rock of state.coverRocks) {
		if (!rock.landed) continue;
		const alreadyDetouring = entity.coverDetourTimer != null && entity.coverDetourTimer > 0;
		if (!alreadyDetouring && entity.coverDetourCooldown > 0) continue;
		if (!isPointInsideCover(rock, entity.x, entity.y, padX, padY)) continue;
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		if (alreadyDetouring && entity.coverDetourRockX != null) {
			const entrySide = entity.coverDetourEntrySide == null ? (entity.x >= entity.coverDetourRockX ? 1 : -1) : entity.coverDetourEntrySide;
			const relX = entity.x - entity.coverDetourRockX;
			const storedPad = entity.coverDetourPadX == null ? padX : Math.max(entity.coverDetourPadX, padX);
			const padMargin = Math.max(22, storedPad * 0.6);
			const radius = entity.coverDetourRockRadiusX == null
				? Math.max(storedPad, rock.radiusX == null ? (rock.width == null ? padX : rock.width * 0.5) : rock.radiusX)
				: entity.coverDetourRockRadiusX;
			const clear = radius + padMargin;
			if ((entrySide < 0 && relX > clear) || (entrySide > 0 && relX < -clear)) continue;
		}
		let dirY = entity.y >= centerY ? 1 : -1;
		if (Math.abs(entity.y - centerY) < 12) dirY = dirY === 0 ? (Math.random() < 0.5 ? -1 : 1) : dirY;
		const dirX = allowHorizontal ? (entity.x >= centerX ? 1 : -1) : 0;
		entity.coverDetourTimer = Math.max(entity.coverDetourTimer || 0, detourDuration);
		entity.coverDetourDirY = dirY === 0 ? (Math.random() < 0.5 ? -1 : 1) : dirY;
		entity.coverDetourDirX = dirX;
		entity.coverDetourRockX = centerX;
		const baseRadiusX = rock.radiusX == null ? (rock.width == null ? padX : rock.width * 0.5) : rock.radiusX;
		entity.coverDetourRockRadiusX = entity.coverDetourRockRadiusX == null ? Math.max(baseRadiusX, padX) : Math.max(entity.coverDetourRockRadiusX, Math.max(baseRadiusX, padX));
		entity.coverDetourEntrySide = dirX === 0 ? (entity.x >= centerX ? 1 : -1) : dirX;
		entity.coverDetourPadX = Math.max(entity.coverDetourPadX == null ? padX : entity.coverDetourPadX, padX);
		if (detourSpeed != null) entity.coverDetourSpeed = detourSpeed;
		else if (entity.coverDetourSpeed == null) entity.coverDetourSpeed = Math.max(entity.speed || 0.22, 0.18);
		if (allowHorizontal) {
			if (pushSpeed != null) entity.coverDetourPushSpeed = pushSpeed;
			else if (entity.coverDetourPushSpeed == null) entity.coverDetourPushSpeed = (entity.coverDetourSpeed || 0.22) * 0.6;
		} else {
			entity.coverDetourDirX = 0;
		}
		if (!alreadyDetouring) {
			const priorCooldown = entity.coverDetourCooldown == null ? 0 : entity.coverDetourCooldown;
			entity.coverDetourCooldown = Math.max(priorCooldown, cooldown);
		} else if (entity.coverDetourCooldown != null && entity.coverDetourCooldown < cooldown) {
			entity.coverDetourCooldown = cooldown;
		}
		return true;
	}
	return false;
}

function processCoverDetour(entity, dt, bounds = {}) {
	if (!entity.coverDetourTimer || entity.coverDetourTimer <= 0) return;
	entity.coverDetourTimer = Math.max(0, entity.coverDetourTimer - dt);
	const verticalSpeed = entity.coverDetourSpeed == null ? Math.max(entity.speed || 0.22, 0.18) : entity.coverDetourSpeed;
	const horizontalSpeed = entity.coverDetourPushSpeed == null ? verticalSpeed * 0.6 : entity.coverDetourPushSpeed;
	let dirX = entity.coverDetourDirX;
	if (dirX) {
		const storedPad = entity.coverDetourPadX == null ? 60 : entity.coverDetourPadX;
		const margin = Math.max(22, storedPad * 0.6);
		const rockX = entity.coverDetourRockX == null ? null : entity.coverDetourRockX;
		const rockRadius = entity.coverDetourRockRadiusX == null ? Math.max(72, storedPad) : entity.coverDetourRockRadiusX;
		if (rockX != null) {
			const distance = entity.x - rockX;
			const entrySide = entity.coverDetourEntrySide == null ? (distance >= 0 ? 1 : -1) : entity.coverDetourEntrySide;
			const clearDistance = rockRadius + margin;
			if ((entrySide < 0 && distance > clearDistance) || (entrySide > 0 && distance < -clearDistance)) {
				entity.coverDetourDirX = 0;
				dirX = 0;
			}
		}
	}
	if (dirX) entity.x += dirX * horizontalSpeed * dt;
	if (entity.coverDetourDirY) entity.y += entity.coverDetourDirY * verticalSpeed * dt;
	if (bounds.minX != null) entity.x = Math.max(bounds.minX, entity.x);
	if (bounds.maxX != null) entity.x = Math.min(bounds.maxX, entity.x);
	if (bounds.minY != null) {
		if (entity.y <= bounds.minY + 2 && entity.coverDetourDirY < 0) entity.coverDetourDirY = 1;
		entity.y = Math.max(bounds.minY, entity.y);
	}
	if (bounds.maxY != null) {
		if (entity.y >= bounds.maxY - 2 && entity.coverDetourDirY > 0) entity.coverDetourDirY = -1;
		entity.y = Math.min(bounds.maxY, entity.y);
	}
	if (entity.coverDetourTimer <= 0) {
		entity.coverDetourDirX = null;
		entity.coverDetourDirY = null;
		const minCooldown = entity.type === "ritterfisch" ? 520 : 640;
		if (entity.coverDetourCooldown == null || entity.coverDetourCooldown < minCooldown) entity.coverDetourCooldown = minCooldown;
	}
}

function getRitterfischLaneTarget(foe, rock, minY, maxY) {
	const baseLane = foe.anchorY == null ? foe.baseY : foe.anchorY;
	let target = baseLane + Math.sin(foe.sway * 0.45) * canvas.height * 0.035;
	if (rock && rock.landed) {
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		const radiusX = rock.radiusX == null ? (rock.width == null ? 80 : rock.width * 0.5) : rock.radiusX;
		const radiusY = rock.radiusY == null ? (rock.height == null ? 60 : rock.height * 0.5) : rock.radiusY;
		const topEdge = centerY - radiusY;
		const laneA = clamp(topEdge - Math.max(26, radiusY * 0.35), minY, maxY);
		const laneB = clamp(topEdge - Math.max(50, radiusY * 0.6), minY, maxY);
		const useUpperLane = foe.lanePick == null ? Math.random() < 0.5 : foe.lanePick === 1;
		const preferredLane = useUpperLane ? laneB : laneA;
		const nearRock = foe.x < centerX + radiusX + 110 && foe.x > centerX - radiusX - 60;
		if (nearRock) target = preferredLane;
	}
	return clamp(target, minY, maxY);
}

function resolvePlayerCoverCollision(player, prevX, prevY) {
		if (state.coverRocks.length === 0) return;
		let lastSafeX = prevX;
		let lastSafeY = prevY;
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			const collision = resolveCoverCollisionForPoint(rock, player.x, player.y, lastSafeX, lastSafeY);
			if (!collision) continue;
			player.x = clamp(collision.x, 60, canvas.width - 60);
			player.y = clamp(collision.y, 60, canvas.height - 60);
			lastSafeX = player.x;
			lastSafeY = player.y;
		}
	}

function resolveFoeCoverCollision(foe, prevX, prevY) {
		if (state.coverRocks.length === 0) {
			foe.coverCollisionDirection = null;
			return false;
		}
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			const collision = resolveCoverCollisionForPoint(rock, foe.x, foe.y, prevX, prevY);
			if (!collision) continue;
			foe.x = collision.x;
			foe.y = collision.y;
			const normal = collision.normal || { x: 0, y: 0 };
			let direction = null;
			if (Math.abs(normal.x) > Math.abs(normal.y)) direction = normal.x > 0 ? "right" : "left";
			else direction = normal.y > 0 ? "bottom" : "top";
			foe.coverCollisionDirection = direction;
			return true;
		}
		foe.coverCollisionDirection = null;
		return false;
	}

	function updateBubbles(dt) {
		for (const bubble of state.bubbles) {
			bubble.y -= bubble.spd * dt;
			if (bubble.y < -10) {
				bubble.y = canvas.height + 10;
				bubble.x = Math.random() * canvas.width;
			}
		}
	}

	function updateCoverRocks(dt) {
		if (state.coverRocks.length === 0) return;
		const player = state.player;
		for (const rock of state.coverRocks) {
			if (!rock.collisionMask && spriteReady(SPRITES.coverRock)) {
				rock.collisionMask = getCoverRockCollisionMask(SPRITES.coverRock, rock.width, rock.height);
			}
			if (!rock.landed && state.levelIndex === 2) {
				const levelGround = getLevel3GroundLine();
				if (levelGround != null) {
					const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
					const minY = canvas.height * 0.22;
					rock.groundLine = levelGround;
					const maxY = Math.max(minY, rock.groundLine - radiusY);
					rock.targetY = clamp(rock.groundLine - radiusY, minY, maxY);
				}
			}
			if (rock.damageCooldown > 0) rock.damageCooldown = Math.max(0, rock.damageCooldown - dt);
			if (rock.impactTimer > 0 && rock.landed) rock.impactTimer = Math.max(0, rock.impactTimer - dt);
			if (rock.hitPulse > 0) rock.hitPulse = Math.max(0, rock.hitPulse - dt);
			if (rock.landed) continue;
			if (rock.delay > 0) {
				rock.delay = Math.max(0, rock.delay - dt);
				continue;
			}
			const gravity = rock.gravity == null ? 0.0011 : rock.gravity;
			const maxSpeed = rock.maxFallSpeed == null ? 0.68 : rock.maxFallSpeed;
			rock.vy = (rock.vy || 0) + gravity * dt;
			if (rock.vy > maxSpeed) rock.vy = maxSpeed;
			rock.y += rock.vy * dt;
			const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
			if (rock.y + radiusY >= rock.groundLine) {
				rock.y = rock.targetY == null ? rock.groundLine - radiusY : rock.targetY;
				rock.vy = 0;
				rock.landed = true;
				rock.impactTimer = rock.impactTimer == null || rock.impactTimer <= 0 ? 520 : rock.impactTimer;
				continue;
			}
			const baseRadiusX = rock.radiusX == null ? 80 : rock.radiusX;
			const padX = rock.padX == null ? 42 : rock.padX;
			const padY = rock.padY == null ? 50 : rock.padY;
			const padLeft = rock.padLeft == null ? padX : rock.padLeft;
			const padRight = rock.padRight == null ? padX : rock.padRight;
			const padTop = rock.padTop == null ? padY : rock.padTop;
			const padBottom = rock.padBottom == null ? padY : rock.padBottom;
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const dx = player.x - centerX;
			const dy = player.y - centerY;
			const guardRadiusX = dx < 0 ? Math.max(20, baseRadiusX + padLeft) : Math.max(20, baseRadiusX + padRight);
			const guardRadiusY = dy < 0 ? Math.max(20, radiusY + padTop) : Math.max(20, radiusY + padBottom);
			const guardX = Math.max(46, guardRadiusX * 0.75);
			const guardY = Math.max(52, guardRadiusY * 0.8);
			const nx = dx / guardX;
			const ny = dy / guardY;
			if (nx * nx + ny * ny < 1) {
				if ((rock.damageCooldown || 0) <= 0) {
					damagePlayer(1);
					rock.damageCooldown = 900;
				}
				const pushDir = dx >= 0 ? 1 : -1;
				const pushRadius = pushDir < 0 ? Math.max(20, baseRadiusX + padLeft) : Math.max(20, baseRadiusX + padRight);
				player.x = clamp(centerX + pushDir * (pushRadius + 50), 60, canvas.width - 60);
				player.y = clamp(player.y, 60, canvas.height - 60);
			}
		}
	}

	function findCoverRockHit(x, y, padX = 0, padY = 0) {
		if (state.coverRocks.length === 0) return null;
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			if (isPointInsideCover(rock, x, y, padX, padY)) return rock;
		}
		return null;
	}

	function registerCoverRockImpact(rock, strength = 1) {
		if (!rock) return;
		const pulse = rock.hitPulse == null ? 0 : rock.hitPulse;
		const added = 140 * clamp(strength, 0.6, 2.4);
		rock.hitPulse = Math.min(520, pulse + added);
	}

	function update(dt) {
		state.frameDt = dt;
		updatePlayer(dt);
		updateCoralAllies(dt);
		updateCoralEffects(dt);
		updateBubbles(dt);
		updateCoverRocks(dt);
		updateFoes(dt);
		updateShots(dt);
		updateFoeArrows(dt);
		updateHealPickups(dt);
		updateSymbolDrops(dt);
		updateCoinDrops(dt);
		updateTsunamiWave(dt);
		updateBoss(dt);
		updateBossAttacks(dt);
		handleShotFoeHits();
		handleShotFoeArrowHits();
		handleShotTorpedoHits();
		handleShotBossHits();
		handlePlayerFoeCollisions();
		handlePlayerFoeArrowCollisions();
		handlePlayerTorpedoCollisions();
		handlePlayerFinSweepCollisions();
		handlePlayerWakeWaveCollisions();
		handlePlayerWhirlpoolEffects();
		handlePlayerCoinExplosions();
		handlePlayerDiamondBeams();
		handlePlayerTreasureWaves();
		handlePlayerCardBoomerangs();
		handlePlayerCrownColumns();
		handlePlayerKatapultCollisions();
		handlePlayerShockwaveCollisions();
		handlePlayerSpeedboatCollisions();
		handlePlayerPerfumeOrbCollisions();
		handlePlayerFragranceCloudCollisions();
		handlePlayerHealPickups();
		handlePlayerCoinDrops();
		handlePlayerSymbolDrops();
		handlePlayerBossCollision();
		maybeSpawnLevelThreeCoverRock();
		state.elapsed += dt;
	}

	function updateBoss(dt) {
		const boss = state.boss;
		if (state.pendingSymbolAdvance) return;
		if (!boss.active) {
			if (state.levelScore >= state.unlockBossScore) activateBoss();
			else return;
		}

		if (boss.coverDetourCooldown > 0) boss.coverDetourCooldown = Math.max(0, boss.coverDetourCooldown - dt);
		boss.pulse += dt * 0.0032;
		const targetX = boss.entryTargetX == null ? canvas.width * 0.72 : boss.entryTargetX;
		const targetY = boss.entryTargetY == null ? canvas.height * 0.48 : boss.entryTargetY;
		if (boss.entering) {
			const travelSpeed = boss.entrySpeed == null ? Math.max(boss.speed * 1.2, 0.24) : boss.entrySpeed;
			const dx = targetX - boss.x;
			const dy = targetY - boss.y;
			const dist = Math.hypot(dx, dy);
			const step = travelSpeed * dt;
			const sway = Math.sin(boss.pulse * 0.8) * 0.12;
			if (dist <= step || dist === 0) {
				boss.x = targetX;
				boss.y = targetY;
				boss.entering = false;
				boss.entryProgress = 1;
				boss.dir = -1;
				boss.attackTimer = Math.max(boss.attackTimer, 900);
			} else {
				const nx = dx / dist;
				const ny = dy / dist;
				boss.x += nx * step;
				boss.y += ny * step + sway * dt;
				boss.dir = nx < 0 ? -1 : 1;
				boss.entryProgress = Math.min(1, (boss.entryProgress || 0) + step / Math.max(dist, 1));
			}
			return;
		}

		let verticalMin = boss.verticalMin == null ? canvas.height * 0.24 : boss.verticalMin;
		if (state.levelIndex === 2) {
			const hpBarBottom = 26 + 18 + 6;
			const spriteKey = boss.spriteKey || "boss";
			const sprite = SPRITES[spriteKey] || SPRITES.boss;
			const scale = boss.spriteScale == null ? 0.22 : boss.spriteScale;
			const offsetY = boss.spriteOffsetY == null ? -12 : boss.spriteOffsetY;
			const drawH = spriteReady(sprite) ? sprite.naturalHeight * scale : 180 * scale;
			const topSafe = -120;
			const minYFromBar = hpBarBottom + topSafe + drawH * 0.5 - offsetY;
			verticalMin = Math.max(verticalMin, minYFromBar);
		}
		let verticalMax = boss.verticalMax == null ? canvas.height * 0.68 : boss.verticalMax;
		const coverRock = state.coverRocks.find(rock => rock.landed);
		if (coverRock) {
			const rockRadiusY = coverRock.radiusY == null ? (coverRock.height == null ? 60 : coverRock.height * 0.5) : coverRock.radiusY;
			const rockBottom = coverRock.y + rockRadiusY;
			verticalMax = Math.min(verticalMax, rockBottom - 6);
		}
		const verticalTracking = boss.verticalTracking == null ? 0.0024 : boss.verticalTracking;
		const verticalCenter = (verticalMin + verticalMax) * 0.5;
		let verticalOscSpeed = boss.verticalOscSpeed == null ? 0 : boss.verticalOscSpeed;
		let verticalOscAmp = boss.verticalOscAmp == null ? 0 : boss.verticalOscAmp;
		let verticalOffset = boss.verticalOffset == null ? 0 : boss.verticalOffset;
		if (state.levelIndex === 2) {
			const span = Math.max(40, verticalMax - verticalMin);
			verticalOffset = span * 0.06;
			verticalOscAmp = span * 0.5;
			if (!verticalOscSpeed) verticalOscSpeed = 0.0024;
		}
		boss.verticalOscPhase = (boss.verticalOscPhase == null ? Math.random() * TAU : boss.verticalOscPhase) + verticalOscSpeed * dt;
		const verticalOsc = verticalOscAmp > 0 ? Math.sin(boss.verticalOscPhase) * verticalOscAmp : 0;
		const verticalTargetY = clamp(verticalCenter + verticalOffset + verticalOsc, verticalMin, verticalMax);
		const bob = Math.sin(boss.pulse * 0.8) * 0.04;
		boss.y = clamp(boss.y + (verticalTargetY - boss.y) * verticalTracking * dt + bob * dt, verticalMin, verticalMax);

		const horizontalMin = boss.horizontalMin == null ? canvas.width * 0.52 : boss.horizontalMin;
		const horizontalMax = boss.horizontalMax == null ? canvas.width * 0.9 : boss.horizontalMax;
		const horizontalTracking = boss.horizontalTracking == null ? 0.0024 : boss.horizontalTracking;
		const oscSpeed = boss.horizontalOscSpeed == null ? 0.0026 : boss.horizontalOscSpeed;
		const rawOscAmp = boss.horizontalOscAmp == null ? canvas.width * 0.08 : boss.horizontalOscAmp;
		const span = Math.max(40, horizontalMax - horizontalMin);
		const baseMax = Math.max(16, span * 0.35);
		const baseAmp = Math.min(Math.max(Math.abs(rawOscAmp), 16), baseMax);
		const midCenter = (horizontalMin + horizontalMax) * 0.5;
		const defaultEdgePad = Math.max(8, span * 0.04);
		const rawEdgePad = boss.horizontalEdgePad;
		const edgePad = rawEdgePad == null ? defaultEdgePad : clamp(rawEdgePad, 0, Math.max(0, span * 0.48));
		const forwardLimit = Math.max(12, horizontalMax - midCenter - edgePad);
		const backwardLimit = Math.max(12, midCenter - horizontalMin - edgePad);
		const forwardBoost = boss.horizontalForwardBoost == null ? 2.2 : boss.horizontalForwardBoost;
		const backwardBoost = boss.horizontalBackBoost == null ? 1.25 : boss.horizontalBackBoost;
		const scaledForward = Math.min(baseAmp * forwardBoost, Math.max(24, span * 0.5));
		const scaledBackward = Math.min(baseAmp * backwardBoost, Math.max(24, span * 0.38));
		const forwardAmp = Math.max(16, Math.min(scaledForward, forwardLimit));
		const backwardAmp = Math.max(16, Math.min(scaledBackward, backwardLimit));
		const biasRaw = boss.horizontalForwardBias == null ? canvas.width * 0.1 : boss.horizontalForwardBias;
		const biasMax = Math.max(0, horizontalMax - (midCenter + forwardAmp) - edgePad);
		const forwardBias = clamp(biasRaw, 0, biasMax);
		boss.oscPhase = (boss.oscPhase == null ? 0 : boss.oscPhase) + oscSpeed * dt;
		const osc = Math.sin(boss.oscPhase);
		const amp = osc >= 0 ? forwardAmp : backwardAmp;
		const bias = Math.max(0, osc) * forwardBias;
		const desiredX = clamp(midCenter + osc * amp + bias, horizontalMin, horizontalMax);
		const deltaX = desiredX - boss.x;
		boss.x = clamp(boss.x + deltaX * horizontalTracking * dt, horizontalMin, horizontalMax);
		if (Math.abs(deltaX) > 0.6) boss.dir = deltaX > 0 ? 1 : -1;

		applyCoverAvoidance(boss, {
			padX: 96,
			padY: 88,
			detourDuration: 920,
			detourSpeed: boss.speed == null ? 0.28 : Math.max(boss.speed * 0.82, 0.24),
			pushSpeed: 0.3,
			cooldown: 640
		});
		processCoverDetour(boss, dt, {
			minX: horizontalMin,
			maxX: horizontalMax,
			minY: verticalMin,
			maxY: verticalMax
		});

		const enraged = boss.hp <= boss.maxHp * 0.35;
		const attackDelay = (enraged ? 1400 : 2200) + Math.random() * 600;
		boss.attackTimer -= dt;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		const pattern = bossCfg && bossCfg.pattern;
		if (pattern === "arrowVolley") {
			if (boss.attackTimer <= 0) {
				const nextAttack = boss.lastAttack === "perfume-volley" ? "fragrance-wave" : "perfume-volley";
				if (nextAttack === "perfume-volley") spawnBossPerfumeVolley();
				else spawnBossFragranceWave();
				boss.lastAttack = nextAttack;
				const cooldown = nextAttack === "perfume-volley"
					? (bossCfg && bossCfg.volleyCooldown != null ? bossCfg.volleyCooldown : 2200)
					: (bossCfg && bossCfg.cloudCooldown != null ? bossCfg.cloudCooldown : 2800);
				boss.attackTimer = cooldown + Math.random() * 380;
			}
			return;
		}
		if (pattern === "regatta") {
			if (boss.attackTimer <= 0) {
				const config = bossCfg || {};
				const enragedRegatta = boss.hp <= boss.maxHp * 0.45;
				const baseOptions = ["harbor-sog", "katapult", "anchor", "regatta-rush"];
				let pool = baseOptions.filter(option => option !== boss.lastAttack);
				if (pool.length === 0) pool = baseOptions.slice();
				if (enragedRegatta) {
					pool.push("katapult", "regatta-rush");
				}
				const nextAttack = pool[Math.floor(Math.random() * pool.length)];
				let cooldown;
				switch (nextAttack) {
					case "harbor-sog":
						spawnYachtwalHarborSog();
						cooldown = config.harborCooldown != null ? config.harborCooldown : 4800;
						break;
					case "katapult":
						spawnYachtwalKielwasserKatapult();
						cooldown = config.katapultCooldown != null ? config.katapultCooldown : 3600;
						break;
					case "anchor":
						spawnYachtwalAnchorDonner();
						cooldown = config.anchorCooldown != null ? config.anchorCooldown : 5400;
						break;
					default:
						spawnYachtwalRegattaRaserei();
						cooldown = config.regattaRushCooldown != null ? config.regattaRushCooldown : 4400;
						break;
				}
				if (enragedRegatta) cooldown *= 0.82;
				boss.lastAttack = nextAttack;
				boss.attackTimer = cooldown + Math.random() * 420;
			}
			return;
		}
		if (pattern === "cashfish") {
			state.cashfishUltLock = Math.max(0, (state.cashfishUltLock || 0) - dt);
			if (!state.cashfishUltHistory) state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
			if (boss.attackTimer <= 0) {
				const config = bossCfg || {};
				const enragedCashfish = boss.hp <= boss.maxHp * 0.45;
				const baseOptions = ["coin-salvo", "diamond-lattice", "card-shock"];
				let pool = baseOptions.filter(option => option !== boss.lastAttack);
				if (pool.length === 0) pool = baseOptions.slice();
				if (enragedCashfish) {
					pool.push("coin-salvo", "card-shock");
					const hist = state.cashfishUltHistory;
					if (state.cashfishUltLock <= 0) {
						if (!hist.tsunamiUsed || Math.random() < 0.35) pool.push("treasure-tsunami");
						if (!hist.crownUsed || Math.random() < 0.35) pool.push("crown-ledger");
					}
				}
				pool = pool.filter((option, index, arr) => option !== boss.lastAttack && arr.indexOf(option) === index);
				if (pool.length === 0) pool = baseOptions.slice();
				const nextAttack = pool[Math.floor(Math.random() * pool.length)];
				let cooldown;
				switch (nextAttack) {
					case "coin-salvo":
						spawnCashfishCoinSalvo();
						cooldown = config.salvoCooldown == null ? 2700 : config.salvoCooldown;
						break;
					case "diamond-lattice":
						spawnCashfishDiamondLattice();
						cooldown = config.latticeCooldown == null ? 3600 : config.latticeCooldown;
						break;
					case "treasure-tsunami":
						spawnCashfishTreasureTsunami();
						cooldown = config.tsunamiCooldown == null ? 5600 : config.tsunamiCooldown;
						state.cashfishUltLock = config.tsunamiLock == null ? 6400 : config.tsunamiLock;
						state.cashfishUltHistory.tsunamiUsed = true;
						break;
					case "crown-ledger":
						spawnCashfishCrownFinale();
						cooldown = config.crownCooldown == null ? 6200 : config.crownCooldown;
						state.cashfishUltLock = config.crownLock == null ? 7000 : config.crownLock;
						state.cashfishUltHistory.crownUsed = true;
						break;
					default:
						spawnCashfishCardShock();
						cooldown = config.cardCooldown == null ? 3200 : config.cardCooldown;
						break;
				}
				if (enragedCashfish && (nextAttack === "coin-salvo" || nextAttack === "diamond-lattice" || nextAttack === "card-shock")) {
					cooldown *= 0.82;
				}
				boss.lastAttack = nextAttack;
				boss.attackTimer = cooldown + Math.random() * 420;
			}
			return;
		}
		if (boss.attackTimer <= 0) {
			const nextAttack = boss.lastAttack === "fin-sweep" ? "torpedo" : boss.lastAttack === "torpedo" ? "fin-sweep" : Math.random() > 0.5 ? "torpedo" : "fin-sweep";
			if (nextAttack === "torpedo") spawnBossTorpedoBurst();
			else spawnBossFinSweep();
			boss.lastAttack = nextAttack;
			boss.attackTimer = attackDelay;
		}
	}

	function updateFoes(dt) {
		const player = state.player;
		const primaryCoverRock = state.coverRocks.find(rock => rock.landed);
		for (const foe of state.foes) {
			if (foe.dead) continue;
			if (foe.coverDetourCooldown > 0) foe.coverDetourCooldown = Math.max(0, foe.coverDetourCooldown - dt);
			foe.sway += dt * 0.0036;
			const drift = Math.sin(foe.sway * 1.4) * 0.06 * dt;
			const prevX = foe.x;
			const prevY = foe.y;
			if (foe.type === "bogenschreck") {
				const rock = primaryCoverRock;
				let rockCenterX = null;
				let rockCenterY = null;
				let rockRadiusX = null;
				let rockRadiusY = null;
				let desiredHoverX = null;
				let hoveringOverCover = false;
				if (rock && rock.landed) {
					rockCenterX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
					rockCenterY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
					rockRadiusX = rock.radiusX == null ? (rock.width == null ? 80 : rock.width * 0.5) : rock.radiusX;
					rockRadiusY = rock.radiusY == null ? (rock.height == null ? 60 : rock.height * 0.5) : rock.radiusY;
					const forwardThreshold = rockCenterX + rockRadiusX + 36;
					const hoverX = rockCenterX + Math.max(rockRadiusX * 0.12, 18);
					desiredHoverX = hoverX;
					const topEdge = rockCenterY - rockRadiusY;
					const baseHoverY = clamp(topEdge - Math.max(24, rockRadiusY * 0.28), canvas.height * 0.18, canvas.height * 0.58);
					const hoverAmplitude = Math.max(18, Math.min(34, rockRadiusY * 0.36));
					if (!foe.coverHoverMode && foe.x <= forwardThreshold) {
						foe.coverHoverMode = true;
						foe.coverHoverPhase = foe.coverHoverPhase == null ? Math.random() * TAU : foe.coverHoverPhase;
						foe.coverHoverBaseY = baseHoverY;
						foe.coverHoverAmplitude = hoverAmplitude;
						foe.coverHoverX = hoverX;
						foe.coverDetourTimer = 0;
					} else if (foe.coverHoverMode && foe.x > forwardThreshold + 84) {
						foe.coverHoverMode = false;
					}
					if (foe.coverHoverMode) {
						hoveringOverCover = true;
						foe.coverHoverPhase = (foe.coverHoverPhase == null ? Math.random() * TAU : foe.coverHoverPhase) + dt * 0.0028;
						const approachSpeed = Math.max(foe.speed || 0.18, 0.22);
						const targetX = foe.coverHoverX == null ? hoverX : foe.coverHoverX;
						foe.x += clamp(targetX - foe.x, -approachSpeed * dt, approachSpeed * dt);
						const amplitude = foe.coverHoverAmplitude == null ? hoverAmplitude : foe.coverHoverAmplitude;
						const baseY = foe.coverHoverBaseY == null ? baseHoverY : foe.coverHoverBaseY;
						const bob = Math.sin(foe.coverHoverPhase) * amplitude;
						const targetY = clamp(baseY + bob + drift * 6, canvas.height * 0.18, canvas.height * 0.66);
						foe.y += clamp(targetY - foe.y, -0.28 * dt, 0.28 * dt);
						foe.anchorX = targetX;
						foe.anchorY = baseY;
					}
				} else if (foe.coverHoverMode) {
					foe.coverHoverMode = false;
				}
				if (!hoveringOverCover) {
					if (desiredHoverX != null && rockRadiusX != null) {
						const entryAnchor = desiredHoverX + Math.max(12, rockRadiusX * 0.08);
						if (foe.anchorX == null || foe.anchorX > entryAnchor + 1) foe.anchorX = entryAnchor;
					}
					if (foe.x > foe.anchorX) foe.x = Math.max(foe.anchorX, foe.x - foe.speed * dt);
					else foe.x += Math.sin(foe.sway * 0.5) * 0.015 * dt;
					if (foe.hoverPhase == null) foe.hoverPhase = Math.random() * TAU;
					foe.hoverPhase += dt * 0.0026;
					const hover = Math.sin(foe.hoverPhase) * (foe.hoverAmplitude || 16) * 0.03 * dt;
					foe.y += drift * 0.4 + hover;
					foe.y = clamp(foe.y, canvas.height * 0.24, canvas.height * 0.76);
				} else {
					foe.y = clamp(foe.y, canvas.height * 0.18, canvas.height * 0.7);
				}
				foe.shootTimer -= dt;
				if (foe.shootTimer <= 0) {
					spawnBogenschreckArrow(foe);
					foe.shootTimer = (foe.shootCooldown || 2400) + Math.random() * 400;
				}
			} else if (foe.type === "oktopus") {
				const minY = canvas.height * 0.24;
				const maxY = canvas.height * 0.78;
				const minAnchorX = canvas.width * 0.48;
				const maxAnchorX = canvas.width * 0.8;
				if (foe.laneShiftTimer != null) {
					foe.laneShiftTimer -= dt;
					if (foe.laneShiftTimer <= 0) {
						const cooldown = foe.laneShiftCooldown == null ? 2400 : foe.laneShiftCooldown;
						foe.laneShiftTimer = cooldown + Math.random() * 420;
						const verticalShift = (Math.random() - 0.5) * canvas.height * 0.22;
						const horizontalShift = (Math.random() - 0.5) * 120;
						const baseAnchorY = foe.anchorY == null ? foe.y : foe.anchorY;
						const baseAnchorX = foe.anchorX == null ? canvas.width * 0.64 : foe.anchorX;
						foe.anchorY = clamp(baseAnchorY + verticalShift, minY + 36, maxY - 36);
						foe.anchorX = clamp(baseAnchorX + horizontalShift, minAnchorX, maxAnchorX);
						foe.dashDir = horizontalShift < 0 ? -1 : 1;
						foe.dashTimer = foe.dashDuration == null ? 420 : foe.dashDuration;
					}
				}
				const orbitSpeed = foe.orbitSpeed == null ? 0.0016 : foe.orbitSpeed;
				const orbitRadius = foe.orbitRadius == null ? 30 : foe.orbitRadius;
				const orbitVertical = foe.orbitVertical == null ? 28 : foe.orbitVertical;
				foe.orbitAngle = (foe.orbitAngle == null ? Math.random() * TAU : foe.orbitAngle) + orbitSpeed * dt;
				const anchorX = clamp(foe.anchorX == null ? canvas.width * 0.64 : foe.anchorX, minAnchorX, maxAnchorX);
				const anchorY = clamp(foe.anchorY == null ? foe.baseY : foe.anchorY, minY + 24, maxY - 24);
				let dashOffset = 0;
				if (foe.dashTimer > 0) {
					const dashDuration = foe.dashDuration == null || foe.dashDuration <= 0 ? 420 : foe.dashDuration;
					foe.dashTimer = Math.max(0, foe.dashTimer - dt);
					const elapsed = dashDuration - foe.dashTimer;
					const progress = clamp(elapsed / dashDuration, 0, 1);
					const eased = Math.sin(progress * Math.PI);
					const dashDistance = foe.dashDistance == null ? 54 : foe.dashDistance;
					dashOffset = foe.dashDir * dashDistance * eased;
				}
				const swirl = Math.sin(foe.orbitAngle * 0.75) * 4;
				const desiredX = clamp(anchorX + Math.cos(foe.orbitAngle) * orbitRadius + dashOffset, minAnchorX, canvas.width * 0.82);
				const desiredY = clamp(anchorY + Math.sin(foe.orbitAngle * 1.35) * orbitVertical + swirl + drift * 6, minY, maxY);
				const lateralSpeed = Math.max(0.18, foe.speed || 0.18);
				const verticalSpeed = lateralSpeed * 0.92 + 0.06;
				const stepX = clamp(desiredX - foe.x, -lateralSpeed * dt, lateralSpeed * dt);
				const stepY = clamp(desiredY - foe.y, -verticalSpeed * dt, verticalSpeed * dt);
				foe.x += stepX;
				foe.y += stepY;
				foe.anchorX = anchorX;
				foe.anchorY = anchorY;
				foe.shootTimer -= dt;
				if (foe.shootTimer <= 0) {
					const burstCount = Math.max(1, foe.burstCount == null ? 2 : foe.burstCount);
					if (!foe.burstQueue || foe.burstQueue <= 0) foe.burstQueue = burstCount;
					foe.burstQueue -= 1;
					spawnOktopusBolt(foe);
					if (foe.burstQueue > 0) {
						foe.shootTimer = (foe.volleySpacing || 260) + Math.random() * 160;
					} else {
						foe.shootTimer = (foe.shootCooldown || 3200) + Math.random() * 520;
						foe.burstQueue = 0;
					}
				}
			} else if (foe.type === "ritterfisch") {
				const minY = canvas.height * 0.24;
				const maxY = canvas.height * 0.78;
				if (foe.anchorX == null) foe.anchorX = canvas.width * 0.68;
				const anchorDrift = primaryCoverRock ? 0.022 : 0.015;
				foe.anchorX -= anchorDrift * dt;
				foe.anchorX = Math.min(foe.anchorX, foe.x + 60);
				if (foe.passing) foe.anchorX = Math.min(foe.anchorX, foe.x + 10);
				const anchorX = foe.anchorX;
				if (foe.lanePick == null) foe.lanePick = Math.random() < 0.5 ? 0 : 1;
				foe.anchorY = getRitterfischLaneTarget(foe, primaryCoverRock, minY, maxY);
				const homeY = foe.anchorY == null ? foe.baseY : foe.anchorY;
				const patrolRange = foe.patrolRange == null ? 20 : foe.patrolRange;
				const cruiseSpeed = foe.cruiseSpeed == null ? 0.18 : foe.cruiseSpeed;
				const chargeSpeed = foe.chargeSpeed == null ? 0.46 : foe.chargeSpeed;
				if (!foe.passing && (foe.x < player.x + 70 || foe.x < canvas.width * 0.22)) {
					foe.passing = true;
					foe.chargeTimer = Math.max(foe.chargeTimer || 0, 500);
				}
				if (foe.recoverTimer > 0) foe.recoverTimer = Math.max(0, foe.recoverTimer - dt);
				if (foe.charging) {
					foe.chargeDuration += dt;
					foe.x -= chargeSpeed * dt;
					const targetY = clamp(player.y, minY, maxY);
					const dy = targetY - foe.y;
					const adjust = clamp(dy * 0.0022 * dt, -0.32 * dt, 0.32 * dt);
					foe.y = clamp(foe.y + adjust + Math.sin(foe.chargeDuration * 0.008) * 0.08 * dt, minY, maxY);
					foe.damage = 2;
					if (foe.x < player.x - 140 || foe.chargeDuration >= 900 || foe.x < -80) {
						foe.charging = false;
						foe.chargeDuration = 0;
						foe.damage = 1;
						foe.recoverTimer = 600;
						foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 400;
						foe.speed = cruiseSpeed;
					}
				} else {
					if (foe.passing) {
						foe.damage = 1;
						foe.speed = cruiseSpeed;
						foe.x -= cruiseSpeed * dt;
						const pursue = (player.y - foe.y) * 0.0012 * dt;
						const homePull = (homeY - foe.y) * 0.0016 * dt;
						foe.y = clamp(foe.y + pursue + homePull + drift * 0.25, minY, maxY);
					} else {
					foe.damage = 1;
					foe.speed = cruiseSpeed;
						const patrolOffset = Math.sin(foe.sway * 0.55) * patrolRange;
					const desiredX = anchorX + patrolOffset;
					const dx = desiredX - foe.x;
					const step = clamp(dx, -foe.speed * dt, foe.speed * dt);
					foe.x += step;
						foe.y += drift * 0.25;
						const pursue = (player.y - foe.y) * 0.0012 * dt;
						const homePull = (homeY - foe.y) * 0.0018 * dt;
						foe.y = clamp(foe.y + pursue + homePull, minY, maxY);
					foe.chargeTimer -= dt;
					if (foe.chargeTimer <= 0 && (foe.recoverTimer || 0) <= 0) {
						const horizontalGap = foe.x - player.x;
						const verticalGap = Math.abs(foe.y - player.y);
						if (horizontalGap > canvas.width * 0.18 && verticalGap < canvas.height * 0.2) {
							foe.charging = true;
							foe.chargeDuration = 0;
							foe.chargeTimer = foe.chargeCooldown || 3200;
						} else {
							foe.chargeTimer = 600 + Math.random() * 400;
						}
					}
					}
				}
				const hitCover = resolveFoeCoverCollision(foe, prevX, prevY);
				if (hitCover && foe.charging) {
					foe.charging = false;
					foe.chargeDuration = 0;
					foe.damage = 1;
					foe.recoverTimer = Math.max(foe.recoverTimer || 0, 700);
					foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 160;
					foe.speed = cruiseSpeed;
				}
			} else {
				foe.x -= foe.speed * dt;
				foe.y += drift;
				foe.y = clamp(foe.y, canvas.height * 0.2, canvas.height * 0.78);
			}
			if (foe.type !== "ritterfisch") resolveFoeCoverCollision(foe, prevX, prevY);
			const isRitterfisch = foe.type === "ritterfisch";
			const isBogenschreck = foe.type === "bogenschreck";
			const ritterBaseSpeed = isRitterfisch
				? (foe.charging ? Math.max(foe.chargeSpeed || 0.46, 0.46) * 0.75 : Math.max(foe.speed || 0.24, 0.26) + 0.09)
				: 0;
			const detourSpeed = isRitterfisch ? Math.max(0.34, ritterBaseSpeed) : Math.max(0.24, foe.speed || 0.24);
			const pushSpeed = isRitterfisch ? Math.max(0.36, detourSpeed * 0.95) : detourSpeed * 0.62;
			const wantsAvoidance = !(isBogenschreck && foe.coverHoverMode);
			const avoidanceTriggered = wantsAvoidance && applyCoverAvoidance(foe, {
				padX: isRitterfisch ? 132 : isBogenschreck ? 60 : 72,
				padY: isRitterfisch ? 108 : isBogenschreck ? 52 : 58,
				detourDuration: isRitterfisch ? 1400 : 760,
				detourSpeed,
				pushSpeed,
				cooldown: isRitterfisch ? 420 : 360
			});
			if (isRitterfisch && avoidanceTriggered) {
				if (foe.charging) {
					foe.charging = false;
					foe.chargeDuration = 0;
					foe.damage = 1;
					foe.recoverTimer = Math.max(foe.recoverTimer || 0, 520);
					foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 200;
					foe.speed = foe.cruiseSpeed == null ? (foe.speed || 0.22) : foe.cruiseSpeed;
				}
				if (primaryCoverRock) {
					const centerY = primaryCoverRock.y + (primaryCoverRock.collisionOffsetY == null ? 0 : primaryCoverRock.collisionOffsetY);
					if (!foe.coverDetourDirY) {
						const homeY = foe.anchorY == null ? foe.baseY : foe.anchorY;
						const preferDown = foe.y > homeY + 6;
						const preferUp = foe.y < homeY - 6;
						if (preferDown) foe.coverDetourDirY = -1;
						else if (preferUp) foe.coverDetourDirY = 1;
						else foe.coverDetourDirY = foe.y >= centerY ? 1 : -1;
					}
					if (foe.coverDetourSpeed == null || foe.coverDetourSpeed < detourSpeed) foe.coverDetourSpeed = detourSpeed;
					if (foe.coverDetourPushSpeed == null || foe.coverDetourPushSpeed < pushSpeed) foe.coverDetourPushSpeed = pushSpeed;
				}
			}
			processCoverDetour(foe, dt, {
				minX: -140,
				maxX: canvas.width - 40,
				minY: canvas.height * 0.2,
				maxY: canvas.height * 0.82
			});
		}

		state.foes = state.foes.filter(foe => !foe.dead && foe.x > (foe.type === "ritterfisch" ? -160 : -90));

		if (!state.over && !state.boss.active && !state.pendingSymbolAdvance) {
			state.foeSpawnTimer -= dt;
			if (state.foeSpawnTimer <= 0) {
				spawnLevelFoe();
				scheduleNextFoeSpawn();
			}
		}
	}

	function updateShots(dt) {
		for (const shot of state.shots) {
			shot.x += shot.vx * dt;
			shot.y += shot.vy * dt;
			shot.life -= dt;
			shot.vy -= 0.00012 * dt;
		}
		state.shots = state.shots.filter(shot => shot.life > 0 && shot.x < canvas.width + 120 && shot.y > -80 && shot.y < canvas.height + 80);
	}

	function updateFoeArrows(dt) {
		for (const arrow of state.foeArrows) {
			const type = arrow.type || "arrow";
			arrow.x += arrow.vx * dt;
			arrow.y += arrow.vy * dt;
			if (type === "octo-bolt" || type === "octo-blowdart") {
				arrow.wobblePhase = (arrow.wobblePhase || 0) + (arrow.wobbleSpeed || 0) * dt;
				const wobble = Math.sin(arrow.wobblePhase) * (arrow.wobbleAmplitude || 0) * 0.003 * dt;
				arrow.y += wobble;
				arrow.rotation = Math.atan2(arrow.vy, arrow.vx) + Math.PI;
			} else if (arrow.rotation == null) {
				arrow.rotation = Math.atan2(arrow.vy, arrow.vx);
			}
			const padX = arrow.blockPadX == null ? 28 : arrow.blockPadX;
			const padY = arrow.blockPadY == null ? 38 : arrow.blockPadY;
			const cover = findCoverRockHit(arrow.x, arrow.y, padX, padY);
			if (cover) {
				arrow.life = 0;
				registerCoverRockImpact(cover, type === "octo-bolt" ? 0.9 : 0.7);
				continue;
			}
			arrow.life -= dt;
		}
		state.foeArrows = state.foeArrows.filter(arrow => arrow.life > 0 && arrow.x > -160 && arrow.x < canvas.width + 160 && arrow.y > -120 && arrow.y < canvas.height + 120);
	}

	function updateHealPickups(dt) {
		state.healSpawnTimer -= dt;
		const canSpawn = !state.over && state.healPickups.length < 2;
		if (canSpawn && state.healSpawnTimer <= 0) {
			spawnHealPickup();
			state.healSpawnTimer = 10800 + Math.random() * 5200;
		}

		for (const heal of state.healPickups) {
			heal.x -= heal.vx * dt;
			heal.sway += dt * 0.0026;
			heal.y += Math.sin(heal.sway) * 0.08 * dt;
			heal.life -= dt;
		}
		state.healPickups = state.healPickups.filter(heal => heal.life > 0 && heal.x > -160 && heal.y > -120 && heal.y < canvas.height + 120);
		for (const burst of state.healBursts) {
			burst.x += burst.vx * dt;
			burst.y += burst.vy * dt;
			burst.vx *= 0.994;
			burst.vy *= 0.992;
			burst.life -= dt;
		}
		state.healBursts = state.healBursts.filter(burst => burst.life > 0);
	}

	function updateCoralEffects(dt) {
		if (state.coralEffects.length === 0) return;
		for (const fx of state.coralEffects) {
			fx.life = Math.max(0, fx.life - dt);
			if (fx.kind === "spark") {
				fx.rotation = (fx.rotation || 0) + (fx.rotationSpeed || 0) * dt;
			}
		}
		state.coralEffects = state.coralEffects.filter(fx => fx.life > 0);
	}

	function updateSymbolDrops(dt) {
		if (state.symbolDrops.length === 0) return;
		for (const drop of state.symbolDrops) {
			drop.sway = (drop.sway || 0) + (drop.swaySpeed || 0.0024) * dt;
			const bob = Math.sin(drop.sway) * (drop.amplitude == null ? 8 : drop.amplitude) * 0.0022 * dt;
			drop.y += (drop.vy == null ? 0.014 : drop.vy) * dt + bob;
			drop.x += Math.cos(drop.sway * 0.65) * 0.0018 * dt * (drop.amplitude == null ? 8 : drop.amplitude);
			drop.x = clamp(drop.x, 80, canvas.width - 80);
			drop.y = clamp(drop.y, canvas.height * 0.18, canvas.height * 0.88);
			if (!drop.collected) {
				drop.life = Math.max(0, drop.life - dt);
				if (drop.life <= 0) collectSymbolDrop(drop, { auto: true });
			} else if (drop.cleanupTimer != null) {
				drop.cleanupTimer = Math.max(0, drop.cleanupTimer - dt);
			}
		}
		state.symbolDrops = state.symbolDrops.filter(drop => !drop.collected || drop.cleanupTimer == null || drop.cleanupTimer > 0);
	}

	function updateCoinDrops(dt) {
		if (state.coinDrops.length === 0) return;
		const hoverBandTop = canvas.height * 0.34;
		const hoverBandBottom = canvas.height * 0.7;
		for (const coin of state.coinDrops) {
			if (coin.dead) continue;
			coin.spin = (coin.spin || 0) + (coin.spinSpeed || 0.006) * dt;
			if (coin.collected) {
				coin.collectTimer = Math.max(0, (coin.collectTimer || 0) - dt);
				coin.y -= 0.06 * dt;
				if (coin.collectTimer <= 0) coin.dead = true;
				continue;
			}
			coin.life = Math.max(0, (coin.life == null ? 12000 : coin.life) - dt);
			if (coin.life <= 0) {
				coin.dead = true;
				continue;
			}
			const hoverTarget = clamp(coin.hoverY == null ? canvas.height * 0.5 : coin.hoverY, hoverBandTop, hoverBandBottom);
			coin.hoverPhase = (coin.hoverPhase || 0) + (coin.hoverSpeed || 0.0026) * dt;
			const hoverOffset = Math.sin(coin.hoverPhase) * (coin.hoverAmplitude == null ? 24 : coin.hoverAmplitude);
			const targetY = hoverTarget + hoverOffset;
			const follow = coin.hoverFollow == null ? 0.0042 : coin.hoverFollow;
			coin.y += (targetY - coin.y) * follow * dt;
			const baseScroll = coin.scrollSpeed == null ? Math.abs(coin.vx == null ? 0.22 : coin.vx) : coin.scrollSpeed;
			const flow = -Math.max(0.14, baseScroll);
			coin.vx = flow;
			coin.x += coin.vx * dt;
			coin.x += Math.sin((coin.hoverPhase || 0) * 0.7 + (state.elapsed || 0) * 0.0018) * 0.02 * dt;
			coin.y = clamp(coin.y, hoverBandTop - 30, hoverBandBottom + 30);
			if (coin.x <= -40) {
				coin.dead = true;
				continue;
			}
		}
		state.coinDrops = state.coinDrops.filter(coin => !coin.dead);
	}

	function updateBossAttacks(dt) {
		if (!state.boss.active) {
			state.bossTorpedoes.length = 0;
			state.bossSweeps.length = 0;
			state.bossWakeWaves.length = 0;
			state.bossWhirlpools.length = 0;
			state.bossKatapultShots.length = 0;
			state.bossShockwaves.length = 0;
			state.bossSpeedboats.length = 0;
			state.bossCoinBursts.length = 0;
			state.bossCoinExplosions.length = 0;
			state.bossDiamondBeams.length = 0;
			state.bossCardBoomerangs.length = 0;
			return;
		}
		for (const torpedo of state.bossTorpedoes) {
			torpedo.x += torpedo.vx * dt;
			torpedo.y += torpedo.vy * dt;
			torpedo.sway += dt * 0.004;
			torpedo.y += Math.sin(torpedo.sway) * 0.04 * dt;
			const torpedoPad = Math.max(18, (torpedo.radius || 18) + 6);
			const torpedoCover = findCoverRockHit(torpedo.x, torpedo.y, torpedoPad, torpedoPad * 0.6);
			if (torpedoCover) {
				torpedo.life = 0;
				registerCoverRockImpact(torpedoCover, 1.1);
				continue;
			}
			torpedo.life -= dt;
		}
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0 && torpedo.x > -160 && torpedo.y > -120 && torpedo.y < canvas.height + 120);

		for (const sweep of state.bossSweeps) {
			if (sweep.delay > 0) {
				sweep.delay = Math.max(0, sweep.delay - dt);
				continue;
			}
			sweep.x += sweep.vx * dt;
			sweep.y += sweep.vy * dt;
			sweep.phase += dt * 0.003;
			sweep.life -= dt;
		}
		state.bossSweeps = state.bossSweeps.filter(sweep => sweep.life > 0 && sweep.x > -220 && sweep.y > -140 && sweep.y < canvas.height + 140);

		const bossCfg = state.levelConfig && state.levelConfig.boss;
		for (const orb of state.bossPerfumeOrbs) {
			orb.x += orb.vx * dt;
			orb.y += orb.vy * dt;
			orb.life -= dt;
			orb.sway += dt * 0.0024;
			orb.spin = (orb.spin == null ? Math.random() * TAU : orb.spin + dt * 0.0036);
			orb.y += Math.sin(orb.sway) * 0.04 * dt;
			orb.trailTimer -= dt;
			if (orb.trailTimer <= 0) {
				spawnFragranceCloud(orb.x - 12, orb.y + 6, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.55 : 42,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration * 0.6 : 2600,
					growth: 0.014,
					driftX: -0.03,
					driftY: -0.006
				});
				orb.trailTimer = orb.trailInterval || 360;
			}
			if (orb.life <= 0 && !orb.dead) {
				spawnFragranceCloud(orb.x, orb.y, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.9 : 58,
					growth: 0.02,
					driftX: -0.04,
					driftY: -0.012,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration : 3800
				});
				orb.dead = true;
			}
		}
		state.bossPerfumeOrbs = state.bossPerfumeOrbs.filter(orb => !orb.dead && orb.life > 0 && orb.x > -180 && orb.x < canvas.width + 80 && orb.y > -160 && orb.y < canvas.height + 160);
		for (const cloud of state.bossFragranceClouds) {
			cloud.life -= dt;
			const progress = 1 - cloud.life / Math.max(1, cloud.duration);
			const growth = cloud.growth == null ? 0.015 : cloud.growth;
			cloud.radius = cloud.baseRadius * (1 + growth * progress * 6);
			cloud.x += (cloud.driftX == null ? 0 : cloud.driftX) * dt;
			cloud.y += (cloud.driftY == null ? 0 : cloud.driftY) * dt;
			cloud.swirl = (cloud.swirl == null ? Math.random() * TAU : cloud.swirl + dt * 0.0018);
			cloud.pulse = (cloud.pulse == null ? Math.random() * TAU : cloud.pulse + dt * 0.0024);
		}
		state.bossFragranceClouds = state.bossFragranceClouds.filter(cloud => cloud.life > 0 && cloud.x > -200 && cloud.x < canvas.width + 120 && cloud.y > -200 && cloud.y < canvas.height + 200);

		for (const wave of state.bossWakeWaves) {
			wave.x += (wave.vx == null ? -0.32 : wave.vx) * dt;
			wave.phase = (wave.phase == null ? Math.random() * TAU : wave.phase + (wave.freq == null ? 0.003 : wave.freq) * dt);
			const amplitude = wave.amplitude == null ? 18 : wave.amplitude;
			const baseY = wave.baseY == null ? wave.y : wave.baseY;
			wave.y = clamp(baseY + Math.sin(wave.phase) * amplitude, canvas.height * 0.2, canvas.height * 0.82);
			if (wave.hurtCooldown > 0) wave.hurtCooldown = Math.max(0, wave.hurtCooldown - dt);
			wave.life -= dt;
		}
		state.bossWakeWaves = state.bossWakeWaves.filter(wave => wave.life > 0 && wave.x > -260);

		for (const whirl of state.bossWhirlpools) {
			if (whirl.dead) continue;
			whirl.spin = (whirl.spin == null ? Math.random() * TAU : whirl.spin + dt * (whirl.releaseTriggered ? 0.006 : 0.0042));
			if (whirl.telegraph > 0) {
				whirl.telegraph = Math.max(0, whirl.telegraph - dt);
				continue;
			}
			if (whirl.damageTimer > 0) whirl.damageTimer = Math.max(0, whirl.damageTimer - dt);
			if (!whirl.releaseTriggered) {
				whirl.life -= dt;
				const ratio = 1 - whirl.life / Math.max(1, whirl.initialLife || whirl.life);
				const targetRadius = (whirl.minRadius || 48) + ((whirl.maxRadius || 120) - (whirl.minRadius || 48)) * clamp01(ratio * 1.1);
				whirl.radius = whirl.radius == null ? targetRadius : whirl.radius + (targetRadius - whirl.radius) * Math.min(1, dt * 0.0028);
				if (whirl.life <= 520) {
					whirl.releaseTriggered = true;
					whirl.explosionTimer = 520;
					whirl.explosionRadius = (whirl.radius || 96) * 1.35;
				}
			} else {
				whirl.explosionTimer = Math.max(0, whirl.explosionTimer - dt);
				if (whirl.explosionTimer <= 0) whirl.dead = true;
			}
		}
		state.bossWhirlpools = state.bossWhirlpools.filter(whirl => !whirl.dead);

		for (const shot of state.bossKatapultShots) {
			if (shot.dead) continue;
			if (shot.delay > 0) {
				shot.delay = Math.max(0, shot.delay - dt);
				continue;
			}
			if (shot.exploding) {
				shot.explosionLife = Math.max(0, shot.explosionLife - dt);
				if (shot.explosionLife <= 0) shot.dead = true;
				continue;
			}
			shot.x += shot.vx * dt;
			shot.y += shot.vy * dt;
			shot.vy += (shot.gravity == null ? 0.001 : shot.gravity) * dt;
			shot.spin = (shot.spin == null ? Math.random() * TAU : shot.spin + dt * 0.0032);
			const padX = Math.max(28, (shot.radius || 26) + 12);
			const padY = Math.max(26, (shot.radius || 26));
			const cover = findCoverRockHit(shot.x, shot.y, padX, padY);
			if (cover) {
				shot.dead = true;
				registerCoverRockImpact(cover, 1.35);
				continue;
			}
			shot.life -= dt;
			if (shot.life <= 0 || shot.y >= canvas.height * 0.84) {
				shot.exploding = true;
				shot.explosionLife = 620;
				shot.vx = 0;
				shot.vy = 0;
			}
		}
		state.bossKatapultShots = state.bossKatapultShots.filter(shot => !shot.dead && shot.x > -220 && shot.x < canvas.width + 220 && shot.y > -160 && shot.y < canvas.height + 200);

		for (const wave of state.bossShockwaves) {
			if (wave.dead) continue;
			wave.anchorPulse = (wave.anchorPulse == null ? Math.random() * TAU : wave.anchorPulse + dt * 0.004);
			if (wave.stage === "telegraph") {
				wave.telegraphTimer = Math.max(0, wave.telegraphTimer - dt);
				if (wave.telegraphTimer <= 0) {
					wave.stage = "wave1";
					wave.waveOneRadius = 48;
				}
				continue;
			}
			if (wave.stage === "wave1") {
				wave.waveOneRadius += (wave.waveSpeedOne || 1.1) * dt;
				if (wave.waveOneRadius >= (wave.maxRadius || Math.max(canvas.width, canvas.height))) {
					wave.stage = "pause";
				}
				continue;
			}
			if (wave.stage === "pause") {
				wave.waitTimer = Math.max(0, wave.waitTimer - dt);
				if (wave.waitTimer <= 0) {
					wave.stage = "wave2";
					wave.waveTwoRadius = Math.max(wave.waveOneRadius * 0.55, 72);
				}
				continue;
			}
			if (wave.stage === "wave2") {
				wave.waveTwoRadius += (wave.waveSpeedTwo || 1.36) * dt;
				if (wave.waveTwoRadius >= (wave.maxRadius || Math.max(canvas.width, canvas.height))) {
					wave.stage = "cleanup";
				}
				continue;
			}
			if (wave.stage === "cleanup") {
				wave.cleanupTimer = Math.max(0, wave.cleanupTimer - dt);
				if (wave.cleanupTimer <= 0) wave.dead = true;
			}
		}
		state.bossShockwaves = state.bossShockwaves.filter(wave => !wave.dead);

		for (const boat of state.bossSpeedboats) {
			if (boat.dead) continue;
			boat.life -= dt;
			if (boat.life <= 0) {
				boat.dead = true;
				continue;
			}
			boat.x += boat.vx * dt;
			boat.sway = (boat.sway == null ? Math.random() * TAU : boat.sway + (boat.swaySpeed || 0.0028) * dt);
			const swayAmp = boat.swayAmplitude == null ? 16 : boat.swayAmplitude;
			const baseY = boat.baseY == null ? boat.y : boat.baseY;
			boat.y = clamp(baseY + Math.sin(boat.sway) * swayAmp, canvas.height * 0.2, canvas.height * 0.78);
			const coverBoat = findCoverRockHit(boat.x, boat.y, 50, 42);
			if (coverBoat) {
				boat.dead = true;
				registerCoverRockImpact(coverBoat, 1.5);
				continue;
			}
			if (boat.damageCooldown > 0) boat.damageCooldown = Math.max(0, boat.damageCooldown - dt);
			if (boat.x < -220) boat.dead = true;
		}
		state.bossSpeedboats = state.bossSpeedboats.filter(boat => !boat.dead && boat.x > -260 && boat.y > -200 && boat.y < canvas.height + 200);

		const explodeCoin = coin => {
			if (coin.exploded) return;
			state.bossCoinExplosions.push({
				x: coin.x,
				y: coin.y,
				radius: 54 * (coin.scale || 1),
				life: 520,
				duration: 520,
				knockback: coin.knockback == null ? 0.16 : coin.knockback,
				damage: coin.damage == null ? 1 : coin.damage,
				hitApplied: false,
				elapsed: 0
			});
			coin.exploded = true;
		};

		const coinGround = canvas.height * 0.82;
		for (const coin of state.bossCoinBursts) {
			if (coin.exploded) continue;
			coin.x += coin.vx * dt;
			coin.y += coin.vy * dt;
			coin.vy += (coin.gravity == null ? 0.00034 : coin.gravity) * dt;
			coin.life -= dt;
			coin.spin = (coin.spin || 0) + dt * 0.01;
			if (coin.life <= 0 || coin.y >= coinGround) {
				coin.y = Math.min(coin.y, coinGround);
				explodeCoin(coin);
			}
		}
		state.bossCoinBursts = state.bossCoinBursts.filter(coin => !coin.exploded && coin.life > 0 && coin.x > -180 && coin.x < canvas.width + 160 && coin.y > -140 && coin.y < canvas.height + 160);

		for (const blast of state.bossCoinExplosions) {
			blast.life -= dt;
			blast.elapsed = (blast.elapsed || 0) + dt;
			if (blast.life <= 0) blast.dead = true;
		}
		state.bossCoinExplosions = state.bossCoinExplosions.filter(blast => !blast.dead);

		for (const beam of state.bossDiamondBeams) {
			if (beam.stage === "telegraph") {
				beam.telegraphTimer = Math.max(0, (beam.telegraphTimer || 0) - dt);
				if (beam.telegraphTimer <= 0) {
					beam.stage = "active";
					beam.activeTimer = beam.activeDuration == null ? 1000 : beam.activeDuration;
					beam.damageCooldown = 0;
				}
			} else if (beam.stage === "active") {
				beam.activeTimer = Math.max(0, (beam.activeTimer || 0) - dt);
				beam.damageCooldown = Math.max(0, (beam.damageCooldown || 0) - dt);
				if (beam.activeTimer <= 0) {
					beam.stage = "fade";
					beam.fadeTimer = beam.fadeDuration == null ? 280 : beam.fadeDuration;
				}
			} else if (beam.stage === "fade") {
				beam.fadeTimer = Math.max(0, (beam.fadeTimer || 0) - dt);
				if (beam.fadeTimer <= 0) beam.dead = true;
			}
		}
		state.bossDiamondBeams = state.bossDiamondBeams.filter(beam => !beam.dead);

		const boss = state.boss;
		for (const card of state.bossCardBoomerangs) {
			card.life -= dt;
			card.elapsed = (card.elapsed || 0) + dt;
			card.hitCooldown = Math.max(0, (card.hitCooldown || 0) - dt);
			if (card.phase === "outbound") {
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
				if (card.x <= (card.bounceX == null ? canvas.width * 0.26 : card.bounceX)) {
					card.phase = "return";
					card.targetX = boss.x - 24 + Math.cos(card.orbitAngle || 0) * 20;
					card.targetY = boss.y + Math.sin(card.orbitAngle || 0) * 36;
				}
			} else if (card.phase === "return") {
				const targetX = card.targetX == null ? boss.x - 24 : card.targetX;
				const targetY = card.targetY == null ? boss.y : card.targetY;
				const dx = targetX - card.x;
				const dy = targetY - card.y;
				const dist = Math.hypot(dx, dy) || 1;
				const speed = card.speed == null ? 0.34 : card.speed * 1.08;
				card.vx = (dx / dist) * speed;
				card.vy = (dy / dist) * speed;
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
				if (dist < 8) {
					card.phase = "orbit";
					card.orbitAngle = card.orbitAngle == null ? 0 : card.orbitAngle;
					card.orbitTimer = card.orbitTimer == null ? (state.levelConfig && state.levelConfig.boss && state.levelConfig.boss.cardSpiralDelay != null ? state.levelConfig.boss.cardSpiralDelay : 560) : card.orbitTimer;
				}
			} else if (card.phase === "orbit") {
				const orbitRadius = card.orbitRadius == null ? 72 : card.orbitRadius;
				const orbitDir = (card.ringIndex || 0) % 2 === 0 ? 1 : -1;
				card.orbitTimer = Math.max(0, (card.orbitTimer || 0) - dt);
				card.orbitAngle = (card.orbitAngle || 0) + orbitDir * dt * 0.0038;
				card.x = boss.x + Math.cos(card.orbitAngle) * orbitRadius;
				card.y = boss.y + Math.sin(card.orbitAngle) * orbitRadius;
				card.rotation = card.orbitAngle + Math.PI / 2;
				if (card.orbitTimer <= 0) {
					card.phase = "burst";
					const launchSpeed = (card.speed == null ? 0.34 : card.speed) * 1.32;
					card.vx = Math.cos(card.orbitAngle) * launchSpeed;
					card.vy = Math.sin(card.orbitAngle) * launchSpeed;
					card.rotation = Math.atan2(card.vy, card.vx);
				}
			} else {
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
			}
			if (card.life <= 0 || card.x < -240 || card.x > canvas.width + 240 || card.y < -240 || card.y > canvas.height + 240) {
				card.dead = true;
			}
		}
		state.bossCardBoomerangs = state.bossCardBoomerangs.filter(card => !card.dead);

		for (const wave of state.bossTreasureWaves) {
			if (wave.stage === "telegraph") {
				wave.telegraphTimer = Math.max(0, (wave.telegraphTimer || 0) - dt);
				wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0036;
				if (wave.telegraphTimer <= 0) {
					wave.stage = "surge";
					wave.surgeTimer = wave.surgeDuration == null ? 2000 : wave.surgeDuration;
				}
				continue;
			}
			if (wave.stage === "surge") {
				wave.x += (wave.vx == null ? -0.42 : wave.vx) * dt;
				wave.wobblePhase = (wave.wobblePhase || 0) + (wave.wobbleSpeed == null ? 0.0032 : wave.wobbleSpeed) * dt;
				const amplitude = wave.amplitude == null ? 34 : wave.amplitude;
				const baseY = wave.baseY == null ? wave.y : wave.baseY;
				wave.y = clamp(baseY + Math.sin(wave.wobblePhase) * amplitude, canvas.height * 0.24, canvas.height * 0.82);
				wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0042;
				if (wave.damageCooldown > 0) wave.damageCooldown = Math.max(0, wave.damageCooldown - dt);
				wave.surgeTimer = Math.max(0, (wave.surgeTimer || 0) - dt);
				if (wave.surgeTimer <= 0 || wave.x < -((wave.radiusX || 120) + 160)) {
					wave.stage = "foam";
					wave.fadeTimer = wave.fadeDuration == null ? 420 : wave.fadeDuration;
				}
				continue;
			}
			wave.fadeTimer = Math.max(0, (wave.fadeTimer || 0) - dt);
			wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0024;
			if (wave.fadeTimer <= 0) wave.dead = true;
		}
		state.bossTreasureWaves = state.bossTreasureWaves.filter(wave => !wave.dead);

		for (const column of state.bossCrownColumns) {
			column.sparklePhase = (column.sparklePhase || 0) + dt * 0.0045;
			if (column.stage === "telegraph") {
				column.telegraphTimer = Math.max(0, (column.telegraphTimer || 0) - dt);
				if (column.telegraphTimer <= 0) {
					column.stage = "active";
					column.activeTimer = column.activeDuration == null ? 1400 : column.activeDuration;
				}
				continue;
			}
			if (column.stage === "active") {
				column.pillarPulse = (column.pillarPulse || 0) + dt * 0.0038;
				if (column.damageCooldown > 0) column.damageCooldown = Math.max(0, column.damageCooldown - dt);
				column.activeTimer = Math.max(0, (column.activeTimer || 0) - dt);
				if (column.activeTimer <= 0) {
					column.stage = "fade";
					column.fadeTimer = column.fadeDuration == null ? 420 : column.fadeDuration;
				}
				continue;
			}
			column.pillarPulse = (column.pillarPulse || 0) + dt * 0.0026;
			column.fadeTimer = Math.max(0, (column.fadeTimer || 0) - dt);
			if (column.fadeTimer <= 0) column.dead = true;
		}
		state.bossCrownColumns = state.bossCrownColumns.filter(column => !column.dead);
	}

	function damagePlayer(amount = 1) {
		const player = state.player;
		if (player.shieldActive) {
			const now = performance.now();
			player.shieldTimer = Math.max(0, player.shieldTimer - 600);
			player.shieldLastBlock = now;
			return;
		}
		if (state.mode === "game" && cityInventory.equipment.armor === ARMOR_ITEM_NAME && state.armorShieldCharges > 0) {
			state.armorShieldCharges = 0;
			triggerEventFlash("armorBlock", { text: "Rüstung schützt!", duration: 1200, opacity: 0.9 });
			updateHUD();
			return;
		}
		if (player.invulnFor > 0) return;
		state.hearts = Math.max(0, state.hearts - amount);
		player.invulnFor = 1400;
		triggerEventFlash("playerDamage", { text: "-1 Herz", duration: 1500, opacity: 0.8 });
		if (state.hearts <= 0) showGameOver("Du wurdest besiegt!");
	}

	function awardFoeDefeat(foe) {
		if (!foe) return;
		const bonus = foe.type === "bogenschreck" ? 3 : foe.type === "oktopus" ? 2 : 0;
		const reward = FOE_BASE_SCORE + bonus;
		state.score += reward;
		state.levelScore += reward;
		spawnCoinDrop({ x: foe.x, y: foe.y, value: getCoinValueForFoe(foe) });
		if (!state.boss.active && state.levelScore >= state.unlockBossScore && bannerEl) {
			bannerEl.textContent = "Boss wittert deine Präsenz...";
		}
	}

	function handleShotFoeHits() {
		if (state.shots.length === 0) return;
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			for (const foe of state.foes) {
				if (foe.dead) continue;
				const dx = foe.x - shot.x;
				const dy = foe.y - shot.y;
				const { width: hitWidth, height: hitHeight } = getFoeHitbox(foe);
				const nx = dx / hitWidth;
				const ny = dy / hitHeight;
				if (nx * nx + ny * ny < 1) {
					foe.dead = true;
					shot.life = 0;
					awardFoeDefeat(foe);
					break;
				}
			}
		}
	}

	function handleShotFoeArrowHits() {
		if (state.shots.length === 0 || state.foeArrows.length === 0) return;
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			for (const arrow of state.foeArrows) {
				if (arrow.life <= 0) continue;
				const dx = arrow.x - shot.x;
				const dy = arrow.y - shot.y;
				const radius = arrow.parryRadius == null ? 16 : arrow.parryRadius;
				if (Math.hypot(dx, dy) < radius) {
					arrow.life = 0;
					shot.life = 0;
					break;
				}
			}
		}
		state.foeArrows = state.foeArrows.filter(arrow => arrow.life > 0);
	}

	function handleShotTorpedoHits() {
		if (state.shots.length === 0 || state.bossTorpedoes.length === 0) return;
		const reward = 3;
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			for (const torpedo of state.bossTorpedoes) {
				if (torpedo.life <= 0) continue;
				const dx = torpedo.x - shot.x;
				const dy = torpedo.y - shot.y;
				const hitRadius = torpedo.radius || 18;
				if (Math.hypot(dx, dy) < hitRadius) {
					torpedo.life = 0;
					shot.life = 0;
					state.score += reward;
					state.levelScore += reward;
					triggerEventFlash("torpedo", { text: "+Rammung" });
					break;
				}
			}
		}
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0);
	}

	function handleShotBossHits() {
		if (state.over) return;
		const boss = state.boss;
		if (!boss.active) return;
		const scorePerHit = 10;
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			const dx = shot.x - boss.x;
			const dy = (shot.y - boss.y) * 0.7;
			const dist = Math.hypot(dx, dy);
			const hitRadius = 64;
			if (dist < hitRadius) {
				shot.life = 0;
				boss.hp = Math.max(0, boss.hp - 1);
				state.score += scorePerHit;
				state.levelScore += scorePerHit;
				if (boss.hp <= 0) {
					winGame();
					break;
				} else if (bannerEl) {
					bannerEl.textContent = `Bosskampf – HP ${boss.hp}/${boss.maxHp}`;
				}
			}
		}
	}

	function handlePlayerFoeCollisions() {
		if (state.over) return;
		const player = state.player;
		for (const foe of state.foes) {
			if (foe.dead) continue;
			const dx = player.x - foe.x;
			const dy = player.y - foe.y;
			const { width: hitWidth, height: hitHeight } = getFoeHitbox(foe, { forPlayer: true });
			const nx = dx / hitWidth;
			const ny = dy / hitHeight;
			if (nx * nx + ny * ny < 1) {
				foe.dead = true;
				damagePlayer(foe.damage == null ? 1 : foe.damage);
			}
		}
	}

	function handlePlayerFoeArrowCollisions() {
		if (state.over || state.foeArrows.length === 0) return;
		const player = state.player;
		for (const arrow of state.foeArrows) {
			if (arrow.life <= 0) continue;
			const dx = player.x - arrow.x;
			const dy = player.y - arrow.y;
			const hitRadius = arrow.hitRadius == null ? 28 : arrow.hitRadius;
			if (Math.hypot(dx, dy) < hitRadius) {
				arrow.life = 0;
				damagePlayer(arrow.damage || 1);
			}
		}
		state.foeArrows = state.foeArrows.filter(arrow => arrow.life > 0);
	}

	function handlePlayerTorpedoCollisions() {
		if (state.over || state.bossTorpedoes.length === 0) return;
		const player = state.player;
		for (const torpedo of state.bossTorpedoes) {
			if (torpedo.life <= 0) continue;
			const dx = player.x - torpedo.x;
			const dy = player.y - torpedo.y;
			const radius = (torpedo.radius || 18) + 4;
			if (Math.hypot(dx, dy) < radius) {
				torpedo.life = 0;
				damagePlayer(1);
			}
		}
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0);
	}

	function handlePlayerFinSweepCollisions() {
		if (state.over || state.bossSweeps.length === 0) return;
		const player = state.player;
		for (const sweep of state.bossSweeps) {
			if (sweep.delay > 0 || sweep.life <= 0) continue;
			const dx = player.x - sweep.x;
			const dy = player.y - sweep.y;
			const radius = (sweep.radius || 38) + 6;
			if (Math.hypot(dx, dy) < radius) {
				sweep.life = 0;
				damagePlayer(1);
			}
		}
		state.bossSweeps = state.bossSweeps.filter(sweep => sweep.life > 0);
	}

	function handlePlayerWakeWaveCollisions() {
		if (state.over || state.bossWakeWaves.length === 0) return;
		const player = state.player;
		for (const wave of state.bossWakeWaves) {
			if (wave.life <= 0) continue;
			if (wave.hurtCooldown > 0) continue;
			const radiusX = (wave.radiusX == null ? 82 : wave.radiusX) * 0.9;
			const radiusY = (wave.radiusY == null ? 28 : wave.radiusY) * 1.05;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const nx = dx / Math.max(1, radiusX);
			const ny = dy / Math.max(1, radiusY);
			if (nx * nx + ny * ny < 1) {
				wave.hurtCooldown = 700;
				damagePlayer(1);
			}
		}
	}

	function handlePlayerWhirlpoolEffects() {
		if (state.over || state.bossWhirlpools.length === 0) return;
		const player = state.player;
		const dt = state.frameDt || 16;
		for (const whirl of state.bossWhirlpools) {
			if (whirl.dead || whirl.telegraph > 0) continue;
			const dx = player.x - whirl.x;
			const dy = player.y - whirl.y;
			const dist = Math.hypot(dx, dy) || 1;
			const activeRadius = whirl.radius == null ? 96 : whirl.radius;
			const pullRadius = whirl.releaseTriggered ? (whirl.explosionRadius || activeRadius * 1.4) : activeRadius * 1.25;
			if (dist < pullRadius) {
				const pullStrength = (whirl.pull == null ? 0.001 : whirl.pull) * dt * (1 - dist / Math.max(1, pullRadius));
				player.x = clamp(player.x - dx * pullStrength, 60, canvas.width - 60);
				player.y = clamp(player.y - dy * pullStrength, 60, canvas.height - 60);
			}
			if (!whirl.releaseTriggered) {
				if (dist < activeRadius * 0.92) {
					if (whirl.damageTimer <= 0) {
						damagePlayer(1);
						whirl.damageTimer = 800;
					}
				}
			} else if (!whirl.explosionApplied && dist < (whirl.explosionRadius || activeRadius * 1.4)) {
				whirl.explosionApplied = true;
				damagePlayer(1);
			}
		}
	}

	function handlePlayerCoinExplosions() {
		if (state.over || state.bossCoinExplosions.length === 0) return;
		const player = state.player;
		for (const blast of state.bossCoinExplosions) {
			if (blast.life <= 0 || blast.hitApplied) continue;
			const radius = blast.radius == null ? 54 : blast.radius;
			const dx = player.x - blast.x;
			const dy = player.y - blast.y;
			if (Math.hypot(dx, dy) < radius) {
				blast.hitApplied = true;
				damagePlayer(blast.damage == null ? 1 : blast.damage);
				const knock = blast.knockback == null ? 0.16 : blast.knockback;
				const pushX = knock * 520 * (dx >= 0 ? 1 : -1);
				const pushY = knock * 280 * (dy >= 0 ? 1 : -1);
				player.x = clamp(player.x + pushX, 60, canvas.width - 60);
				player.y = clamp(player.y + pushY, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerDiamondBeams() {
		if (state.over || state.bossDiamondBeams.length === 0) return;
		const player = state.player;
		for (const beam of state.bossDiamondBeams) {
			const stage = beam.stage || "telegraph";
			if (stage !== "active") continue;
			const angle = beam.angle || 0;
			const cosA = Math.cos(angle);
			const sinA = Math.sin(angle);
			const dx = player.x - beam.originX;
			const dy = player.y - beam.originY;
			const projection = dx * cosA + dy * sinA;
			if (projection < -80 || projection > canvas.width + 220) continue;
			const distance = Math.abs(dx * sinA - dy * cosA);
			const halfWidth = (beam.width == null ? 48 : beam.width) * 0.5;
			if (distance <= halfWidth) {
				if (beam.damageCooldown && beam.damageCooldown > 0) continue;
				damagePlayer(1);
				beam.damageCooldown = 260;
				const knock = beam.knockback == null ? 0.16 : beam.knockback;
				player.x = clamp(player.x - cosA * knock * 540, 60, canvas.width - 60);
				player.y = clamp(player.y - sinA * knock * 420, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerTreasureWaves() {
		if (state.over || state.bossTreasureWaves.length === 0) return;
		const player = state.player;
		for (const wave of state.bossTreasureWaves) {
			if (wave.stage !== "surge") continue;
			if (wave.damageCooldown > 0) continue;
			const radiusX = (wave.radiusX == null ? 120 : wave.radiusX) * 0.82;
			const radiusY = (wave.radiusY == null ? 48 : wave.radiusY) * 1.08;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const nx = dx / Math.max(1, radiusX);
			const ny = dy / Math.max(1, radiusY);
			if (nx * nx + ny * ny < 1) {
				damagePlayer(wave.damage == null ? 1 : wave.damage);
				wave.damageCooldown = 520;
				const knock = wave.knockback == null ? 0.22 : wave.knockback;
				player.x = clamp(player.x + (dx >= 0 ? 1 : -1) * knock * 540, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy >= 0 ? 1 : -1) * knock * 320, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerCardBoomerangs() {
		if (state.over || state.bossCardBoomerangs.length === 0) return;
		const player = state.player;
		for (const card of state.bossCardBoomerangs) {
			if (card.dead) continue;
			if (card.phase === "orbit") continue;
			if (card.hitCooldown && card.hitCooldown > 0) continue;
			const radius = card.phase === "burst" ? 34 : 28;
			const dx = player.x - card.x;
			const dy = player.y - card.y;
			if (Math.hypot(dx, dy) < radius) {
				card.hitCooldown = 420;
				damagePlayer(card.damage == null ? 1 : card.damage);
				const knock = card.knockback == null ? 0.14 : card.knockback;
				player.x = clamp(player.x + (dx >= 0 ? 1 : -1) * knock * 480, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy >= 0 ? 1 : -1) * knock * 220, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerCrownColumns() {
		if (state.over || state.bossCrownColumns.length === 0) return;
		const player = state.player;
		for (const column of state.bossCrownColumns) {
			if (column.stage !== "active") continue;
			if (column.damageCooldown > 0) continue;
			const halfWidth = column.halfWidth == null ? 46 : column.halfWidth;
			const top = column.top == null ? canvas.height * 0.22 : column.top;
			const bottom = column.bottom == null ? canvas.height * 0.82 : column.bottom;
			if (player.x >= column.x - halfWidth && player.x <= column.x + halfWidth && player.y >= top && player.y <= bottom) {
				damagePlayer(column.damage == null ? 1 : column.damage);
				column.damageCooldown = 560;
				const knock = column.knockback == null ? 0.24 : column.knockback;
				const dirX = player.x >= column.x ? 1 : -1;
				const dirY = player.y >= (top + bottom) * 0.5 ? 1 : -1;
				player.x = clamp(player.x + dirX * knock * 620, 60, canvas.width - 60);
				player.y = clamp(player.y + dirY * knock * 260, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerKatapultCollisions() {
		if (state.over || state.bossKatapultShots.length === 0) return;
		const player = state.player;
		for (const shot of state.bossKatapultShots) {
			if (shot.dead || shot.delay > 0) continue;
			const dx = player.x - shot.x;
			const dy = player.y - shot.y;
			const dist = Math.hypot(dx, dy);
			if (!shot.exploding) {
				const radius = (shot.radius || 24) + 6;
				if (dist < radius) {
					shot.exploding = true;
					shot.explosionLife = Math.max(shot.explosionLife, 520);
					shot.damageDone = true;
					if (player.invulnFor <= 0) damagePlayer(1);
				}
			} else if (!shot.damageDone) {
				const explosionRadius = shot.explosionRadius || 110;
				if (dist < explosionRadius * 0.8) {
					if (player.invulnFor <= 0) damagePlayer(1);
					shot.damageDone = true;
				}
			}
		}
	}

	function handlePlayerShockwaveCollisions() {
		if (state.over || state.bossShockwaves.length === 0) return;
		const player = state.player;
		const dt = state.frameDt || 16;
		for (const wave of state.bossShockwaves) {
			if (wave.dead) continue;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const dist = Math.hypot(dx, dy) || 1;
			if (wave.stage === "wave1" && !wave.damageWaveOne) {
				const thickness = wave.waveThicknessOne || 90;
				const radius = wave.waveOneRadius || 0;
				if (dist < radius + thickness * 0.5 && dist > Math.max(0, radius - thickness * 0.5)) {
					damagePlayer(1);
					wave.damageWaveOne = true;
				}
			}
			if (wave.stage === "wave2" && !wave.damageWaveTwo) {
				const thickness = wave.waveThicknessTwo || 120;
				const radius = wave.waveTwoRadius || 0;
				if (dist < radius + thickness * 0.5 && dist > Math.max(0, radius - thickness * 0.5)) {
					if (player.shieldActive) {
						player.shieldLastBlock = performance.now();
					} else {
						damagePlayer(1);
					}
					wave.damageWaveTwo = true;
				}
			}
			if ((wave.stage === "wave1" || wave.stage === "wave2") && dist > 0) {
				const pushForce = (wave.stage === "wave2" ? 0.0009 : 0.0005) * dt;
				const nx = dx / dist;
				player.x = clamp(player.x + nx * pushForce, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy / dist) * pushForce * 0.6, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerSpeedboatCollisions() {
		if (state.over || state.bossSpeedboats.length === 0) return;
		const player = state.player;
		for (const boat of state.bossSpeedboats) {
			if (boat.dead) continue;
			const dx = player.x - boat.x;
			const dy = player.y - boat.y;
			const radiusX = 36;
			const radiusY = 22;
			const nx = dx / radiusX;
			const ny = dy / radiusY;
			if (nx * nx + ny * ny < 1) {
				if ((boat.damageCooldown || 0) <= 0) {
					damagePlayer(1);
					boat.damageCooldown = 640;
				}
			}
		}
	}

	function handlePlayerPerfumeOrbCollisions() {
		if (state.over || state.bossPerfumeOrbs.length === 0) return;
		const player = state.player;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		for (const orb of state.bossPerfumeOrbs) {
			if (orb.dead || orb.life <= 0) continue;
			const dx = player.x - orb.x;
			const dy = player.y - orb.y;
			const radius = (orb.radius || 18) + 14;
			if (Math.hypot(dx, dy) < radius) {
				orb.dead = true;
				orb.life = 0;
				spawnFragranceCloud(orb.x, orb.y, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.75 : 52,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration * 0.72 : 2800,
					growth: 0.02,
					driftX: -0.035,
					driftY: -0.012
				});
				if (player.invulnFor <= 0) damagePlayer(1);
				break;
			}
		}
	}

	function handlePlayerFragranceCloudCollisions() {
		if (state.over || state.bossFragranceClouds.length === 0) return;
		const player = state.player;
		for (const cloud of state.bossFragranceClouds) {
			const dx = player.x - cloud.x;
			const dy = player.y - cloud.y;
			const radius = cloud.radius || cloud.baseRadius || 60;
			if (Math.hypot(dx, dy) < radius * 0.86) {
				if (!player.shieldActive) player.perfumeSlowTimer = Math.max(player.perfumeSlowTimer || 0, 2200);
				if (player.invulnFor <= 0) damagePlayer(cloud.damage || 1);
				if (player.invulnFor > 0) break;
			}
		}
	}

	function handlePlayerHealPickups() {
		if (state.over || state.healPickups.length === 0) return;
		const player = state.player;
		let collected = false;
		for (const heal of state.healPickups) {
			if (heal.life <= 0) continue;
			const dx = player.x - heal.x;
			const dy = player.y - heal.y;
			const radius = 26 * (heal.scale || 1);
			if (Math.hypot(dx, dy) < radius) {
				heal.life = 0;
				if (state.hearts < state.maxHearts) {
					state.hearts = Math.min(state.maxHearts, state.hearts + 1);
					collected = true;
					triggerEventFlash("heal", { text: "Erfrischt!" });
					const burstCount = 10;
					for (let i = 0; i < burstCount; i += 1) {
						const angle = (i / burstCount) * TAU + Math.random() * 0.6;
						state.healBursts.push({
							x: player.x,
							y: player.y,
							vx: Math.cos(angle) * 0.14,
							vy: Math.sin(angle) * 0.18,
							rad: 12 + Math.random() * 8,
							life: 900,
							fade: 900
						});
					}
				}
			}
		}
		if (collected) updateHUD();
		state.healPickups = state.healPickups.filter(heal => heal.life > 0);
	}

	function handlePlayerCoinDrops() {
		if (state.over || state.coinDrops.length === 0) return;
		const player = state.player;
		for (const coin of state.coinDrops) {
			if (coin.collected || coin.dead) continue;
			const dx = player.x - coin.x;
			const dy = player.y - coin.y;
			if (Math.hypot(dx, dy) < 34) {
				collectCoinDrop(coin);
			}
		}
	}

	function handlePlayerSymbolDrops() {
		if (state.over || state.symbolDrops.length === 0) return;
		const player = state.player;
		for (const drop of state.symbolDrops) {
			if (drop.collected) continue;
			const dx = player.x - drop.x;
			const dy = player.y - drop.y;
			const radius = 40;
			if (Math.hypot(dx, dy) < radius) {
				collectSymbolDrop(drop, { auto: false });
			}
		}
	}

	function handlePlayerBossCollision() {
		const boss = state.boss;
		if (!boss.active || state.over) return;
		const player = state.player;
		const dx = player.x - boss.x;
		const dy = (player.y - boss.y) * 0.7;
		const dist = Math.hypot(dx, dy);
		const hitRadius = 72;
		if (dist < hitRadius) damagePlayer(1);
	}

	function renderBackground() {
		const width = canvas.width;
		const height = canvas.height;
		const level = state.level || 1;
		const palette = level === 2
			? {
				top: "#1d0f35",
				mid: "#0f1633",
				bottom: "#07091b",
				haze: "rgba(90,50,120,0.32)",
				hazeStrong: "rgba(180,110,220,0.22)",
				ridges: "#12031f",
				foreground: "#1a0633"
			}
			: {
				top: "#03294a",
				mid: "#02203b",
				bottom: "#02111f",
				haze: "rgba(40,80,120,0.28)",
				hazeStrong: "rgba(110,170,220,0.22)",
				ridges: "#031728",
				foreground: "#05233b"
			};
		const time = state.elapsed || 0;
		const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
		baseGrad.addColorStop(0, palette.top);
		baseGrad.addColorStop(0.55, palette.mid);
		baseGrad.addColorStop(1, palette.bottom);
		ctx.fillStyle = baseGrad;
		ctx.fillRect(0, 0, width, height);

		ctx.save();
		ctx.fillStyle = palette.ridges;
		ctx.globalAlpha = 0.7;
		ctx.beginPath();
		ctx.moveTo(0, height * 0.76);
		ctx.bezierCurveTo(width * 0.18, height * 0.7, width * 0.34, height * 0.82, width * 0.52, height * 0.78);
		ctx.bezierCurveTo(width * 0.7, height * 0.74, width * 0.82, height * 0.86, width, height * 0.8);
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		ctx.save();
		ctx.fillStyle = palette.foreground;
		ctx.globalAlpha = 0.85;
		ctx.beginPath();
		ctx.moveTo(0, height * 0.88);
		ctx.bezierCurveTo(width * 0.16, height * 0.82, width * 0.3, height * 0.92, width * 0.46, height * 0.9);
		ctx.bezierCurveTo(width * 0.68, height * 0.86, width * 0.82, height * 0.96, width, height * 0.94);
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		if (level === 1) {
			const bgSprite = SPRITES.backgroundLevelOne;
			if (spriteReady(bgSprite)) {
				const scale = Math.max(width / bgSprite.naturalWidth, height / bgSprite.naturalHeight);
				const drawW = bgSprite.naturalWidth * scale;
				const drawH = bgSprite.naturalHeight * scale;
				const overflowX = drawW - width;
				const overflowY = drawH - height;
				const drawX = overflowX > 0 ? -overflowX * 0.15 : 0;
				const drawY = overflowY > 0 ? -overflowY * 0.45 : 0; // keep rocks hugging top edge
				ctx.drawImage(bgSprite, drawX, drawY, drawW, drawH);
			}
		}



		ctx.save();
		const glowGrad = ctx.createRadialGradient(width * 0.5, height * 0.08, 0, width * 0.5, height * 0.08, height * 0.9);
		glowGrad.addColorStop(0, palette.hazeStrong);
		glowGrad.addColorStop(1, "rgba(0,0,0,0)");
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = 0.85;
		ctx.fillStyle = glowGrad;
		ctx.fillRect(0, 0, width, height);
		ctx.restore();

		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = 0.22;
		const beamCount = 4;
		for (let i = 0; i < beamCount; i += 1) {
			const phase = time * 0.00025 + i * 1.37;
			const beamCenter = (width / (beamCount + 1)) * (i + 1) + Math.sin(phase) * width * 0.08;
			const beamWidth = width * 0.18;
			ctx.beginPath();
			ctx.moveTo(beamCenter - beamWidth * 0.3, -height * 0.1);
			ctx.lineTo(beamCenter + beamWidth * 0.3, -height * 0.1);
			ctx.lineTo(beamCenter + beamWidth * 0.55, height * 0.72);
			ctx.lineTo(beamCenter - beamWidth * 0.55, height * 0.72);
			ctx.closePath();
			const beamGrad = ctx.createLinearGradient(beamCenter, 0, beamCenter, height * 0.75);
			beamGrad.addColorStop(0, "rgba(255,255,255,0.28)");
			beamGrad.addColorStop(0.6, palette.haze);
			beamGrad.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = beamGrad;
			ctx.fill();
		}
		ctx.restore();

		ctx.save();
		ctx.globalAlpha = 0.35;
		ctx.fillStyle = palette.haze;
		ctx.beginPath();
		ctx.moveTo(0, height * 0.35);
		ctx.bezierCurveTo(width * 0.2, height * 0.28, width * 0.4, height * 0.32, width * 0.7, height * 0.42);
		ctx.lineTo(width, height * 0.48);
		ctx.lineTo(width, height * 0.65);
		ctx.lineTo(0, height * 0.55);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		const pseudoRand = seed => {
			const s = Math.sin(seed) * 43758.5453;
			return s - Math.floor(s);
		};
		ctx.save();
		ctx.globalAlpha = 0.22;
		ctx.fillStyle = "rgba(255,255,255,0.35)";
		const moteCount = 42;
		for (let i = 0; i < moteCount; i += 1) {
			const noise = pseudoRand(i * 12.93);
			const noise2 = pseudoRand(i * 34.37);
			const scroll = (time * 0.00004 + noise2) % 1;
			const x = noise * width;
			const y = scroll * height;
			const size = 1 + pseudoRand(i * 91.77) * 3;
			ctx.beginPath();
			ctx.arc(x, y, size, 0, TAU);
			ctx.fill();
		}
		ctx.restore();

		if (level === 3 || state.levelIndex === 2) {
			const floorSprite = LEVEL3_FLOOR_SPRITE;
			const floorTop = getLevel3FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				const drawX = 0;
				const drawY = floorTop;
				ctx.drawImage(floorSprite, drawX, drawY, drawW, drawH);
			}
		}
	}

	function renderBubbles() {
		ctx.save();
		ctx.strokeStyle = "rgba(210,240,255,0.35)";
		for (const bubble of state.bubbles) {
			ctx.beginPath();
			ctx.arc(bubble.x, bubble.y, bubble.r, 0, TAU);
			ctx.stroke();
		}
		ctx.restore();
	}

	function renderFloorOverlay() {
		const level = state.level || 1;
		if (level === 2 || state.levelIndex === 1) {
			const floorSprite = LEVEL2_FLOOR_SPRITE;
			if (spriteReady(floorSprite)) {
				const scale = canvas.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				const drawY = canvas.height - drawH + LEVEL2_FLOOR_OFFSET;
				ctx.drawImage(floorSprite, 0, drawY, drawW, drawH);
				const pseudoRand = seed => {
					const s = Math.sin(seed) * 43758.5453;
					return s - Math.floor(s);
				};
				const time = state.elapsed || 0;
				const riseSpan = 220;
				const baseY = drawY + drawH * 0.46;
				ctx.save();
				ctx.globalCompositeOperation = "lighter";
				for (let i = 0; i < 18; i += 1) {
					const noise = pseudoRand(i * 19.3);
					const drift = Math.sin(time * 0.0012 + i) * 6;
					const phase = (time * 0.035 + i * 120) % riseSpan;
					const x = 160 + noise * 140 + drift;
					const y = baseY - phase;
					const size = 2 + pseudoRand(i * 91.7) * 3;
					const alpha = 0.55 * (1 - phase / riseSpan);
					ctx.fillStyle = `rgba(190, 90, 255, ${alpha.toFixed(3)})`;
					ctx.beginPath();
					ctx.arc(x, y, size, 0, TAU);
					ctx.fill();
				}
				ctx.restore();
			}
			return;
		}
		if (level === 3 || state.levelIndex === 2) {
			const floorSprite = LEVEL3_FLOOR_SPRITE;
			const floorTop = getLevel3FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = canvas.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				ctx.drawImage(floorSprite, 0, floorTop, drawW, drawH);
			}
			return;
		}
		if (level === 4 || state.levelIndex === 3) {
			const floorSprite = LEVEL4_FLOOR_SPRITE;
			const floorTop = getLevel4FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = canvas.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				ctx.drawImage(floorSprite, 0, floorTop, drawW, drawH);
			}
		}
	}

	function renderCoverRocks() {
		if (state.coverRocks.length === 0) return;
		const sprite = SPRITES.coverRock;
		for (const rock of state.coverRocks) {
			const radiusX = rock.radiusX == null ? 80 : rock.radiusX;
			const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
			const dropRatio = clamp01((rock.y + radiusY) / Math.max(1, rock.groundLine || canvas.height));
			const shadowRadius = Math.max(36, radiusX * (0.55 + dropRatio * 0.35));
			const shadowY = (rock.groundLine == null ? canvas.height * 0.88 : rock.groundLine) + 8;
			MODELS.simpleShadow(ctx, rock.x + 10, shadowY, shadowRadius);
			ctx.save();
			ctx.translate(rock.x, rock.y);
			const impactRatio = rock.landed && rock.impactTimer > 0 ? rock.impactTimer / 520 : 0;
			if (impactRatio > 0) {
				const sway = Math.sin(impactRatio * TAU * 2.4) * 0.06;
				ctx.rotate(sway);
			}
			if (rock.delay > 0) ctx.globalAlpha = 0.75;
			const hitGlow = rock.hitPulse > 0 ? clamp01(rock.hitPulse / 520) : 0;
			if (spriteReady(sprite)) {
				const drawW = rock.width == null ? sprite.naturalWidth * (rock.scale == null ? 0.26 : rock.scale) : rock.width;
				const drawH = rock.height == null ? sprite.naturalHeight * (rock.scale == null ? 0.26 : rock.scale) : rock.height;
				ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
			} else {
				ctx.fillStyle = "#2b2f45";
				ctx.beginPath();
				ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
				ctx.fill();
				ctx.strokeStyle = "#151827";
				ctx.lineWidth = 4;
				ctx.stroke();
			}
			if (hitGlow > 0) {
				ctx.save();
				ctx.globalAlpha = hitGlow * 0.32;
				ctx.fillStyle = "#ffe9b6";
				ctx.beginPath();
				ctx.ellipse(0, 0, radiusX * 0.86, radiusY * 0.78, 0, 0, TAU);
				ctx.fill();
				ctx.restore();
			}
			ctx.restore();
		}
	}

	function renderHeals() {
		if (state.healPickups.length === 0) return;
		const sprite = getHealSprite();
		if (sprite) {
			for (const heal of state.healPickups) {
				if (heal.life <= 0) continue;
				const scale = (heal.spriteScale || 0.1) * (heal.scale || 1);
				const baseW = sprite.naturalWidth || sprite.width;
				const baseH = sprite.naturalHeight || sprite.height;
				const drawW = baseW * scale;
				const drawH = baseH * scale;
				const alpha = clamp01(heal.life / 1000);
				ctx.save();
				ctx.translate(heal.x, heal.y);
				ctx.rotate(Math.sin(heal.sway * 0.4) * 0.04);
				ctx.globalAlpha = alpha < 0.9 ? Math.max(alpha, 0.1) : 0.95;
				ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
				ctx.restore();
			}
			return;
		}

		ctx.save();
		for (const heal of state.healPickups) {
			if (heal.life <= 0) continue;
			const radius = 14 * (heal.scale || 1);
			ctx.fillStyle = "rgba(120,220,200,0.55)";
			ctx.beginPath();
			ctx.arc(heal.x, heal.y, radius, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	function renderCoralEffects() {
		if (state.coralEffects.length === 0) return;
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		for (const fx of state.coralEffects) {
			const progress = fx.maxLife > 0 ? clamp01(1 - fx.life / fx.maxLife) : 1;
			const eased = easeOutCubic(progress);
			if (fx.kind === "ring") {
				const radius = fx.startRadius + (fx.endRadius - fx.startRadius) * eased;
				const thickness = fx.startLine + (fx.endLine - fx.startLine) * eased;
				const alpha = clamp01(fx.startAlpha + (fx.endAlpha - fx.startAlpha) * eased);
				ctx.save();
				ctx.globalAlpha = alpha;
				ctx.lineWidth = Math.max(0.6, thickness);
				ctx.strokeStyle = fx.mode === "spawn" ? "rgba(255,200,220,1)" : "rgba(255,170,200,1)";
				ctx.beginPath();
				ctx.arc(fx.x, fx.y, Math.max(2, radius), 0, TAU);
				ctx.stroke();
				ctx.restore();
			} else if (fx.kind === "spark") {
				const radius = fx.radiusStart + (fx.radiusEnd - fx.radiusStart) * eased;
				const fade = fx.mode === "spawn" ? 0.8 - progress * 0.45 : 0.7 - progress * 0.3;
				ctx.save();
				ctx.globalAlpha = clamp01(fade);
				MODELS.sparkle(ctx, fx.x, fx.y, { radius: Math.max(4, radius), rotation: fx.rotation || 0 });
				ctx.restore();
			}
		}
		ctx.restore();
	}

	function renderCoralAllies() {
		if (state.coralAllies.length === 0) return;
		const now = performance.now();
		ctx.save();
		for (const ally of state.coralAllies) {
			ctx.save();
			const x = ally.x == null ? state.player.x : ally.x;
			const y = ally.y == null ? state.player.y : ally.y;
			ctx.translate(x, y);
			const wobble = Math.sin((ally.bobPhase || 0) + now * 0.0022) * 0.1;
			const spriteKey = ally.spriteKey;
			const sprite = spriteKey && SPRITES[spriteKey] ? SPRITES[spriteKey] : null;
			const usingSprite = sprite && spriteReady(sprite);
			const baseRotation = usingSprite ? ally.spriteRotationOffset || 0 : 0;
			ctx.rotate(baseRotation + wobble * 0.2);
			if (usingSprite) {
				const scale = ally.spriteScale == null ? 0.22 : ally.spriteScale;
				const drawW = sprite.naturalWidth * scale;
				const drawH = sprite.naturalHeight * scale;
				const offsetX = ally.spriteOffsetX == null ? 0 : ally.spriteOffsetX;
				const offsetY = ally.spriteOffsetY == null ? 0 : ally.spriteOffsetY;
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			} else {
				const bodyRadius = 18;
				const grad = ctx.createLinearGradient(0, -bodyRadius, 0, bodyRadius);
				grad.addColorStop(0, "rgba(255,188,210,0.95)");
				grad.addColorStop(1, "rgba(255,132,120,0.85)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.ellipse(0, 0, bodyRadius * 0.9, bodyRadius * 0.6, 0, 0, TAU);
				ctx.fill();
				ctx.lineWidth = 3;
				ctx.strokeStyle = "rgba(255,245,235,0.65)";
				ctx.stroke();
				ctx.lineWidth = 2;
				ctx.strokeStyle = "rgba(255,110,120,0.65)";
				ctx.beginPath();
				ctx.moveTo(-bodyRadius * 0.3, bodyRadius * 0.4);
				ctx.lineTo(0, bodyRadius * 0.85);
				ctx.lineTo(bodyRadius * 0.3, bodyRadius * 0.4);
				ctx.stroke();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderTsunamiWave() {
		const wave = state.tsunamiWave;
		if (!wave) return;
		const width = wave.width == null ? Math.max(260, canvas.width * 0.24) : wave.width;
		const left = wave.x;
		const right = left + width;
		const strength = clamp01(wave.energy == null ? 1 : wave.energy);
		const elapsed = wave.elapsed || 0;
		ctx.save();
		ctx.beginPath();
		ctx.rect(left, 0, width, canvas.height);
		ctx.clip();
		const grad = ctx.createLinearGradient(left, 0, right, 0);
		grad.addColorStop(0, `rgba(80,150,240,${0.22 + 0.28 * strength})`);
		grad.addColorStop(0.42, `rgba(110,195,255,${0.3 + 0.32 * strength})`);
		grad.addColorStop(1, `rgba(200,245,255,${0.35 + 0.28 * strength})`);
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = 1;
		ctx.fillStyle = grad;
		ctx.fillRect(left, 0, width, canvas.height);
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = 0.25 * strength;
		ctx.fillStyle = "rgba(255,255,255,0.9)";
		ctx.fillRect(Math.max(left, right - width * 0.3), 0, width * 0.08, canvas.height);
		ctx.globalAlpha = 0.18 * strength;
		ctx.fillRect(Math.max(left, right - width * 0.46), 0, width * 0.06, canvas.height);
		ctx.globalCompositeOperation = "source-over";
		const shimmerPhase = (wave.detailOffset || 0) + elapsed * 0.0021;
		const shimmerCount = 3;
		for (let i = 0; i < shimmerCount; i += 1) {
			const phase = shimmerPhase + i * 1.7;
			const center = (Math.sin(phase) * 0.5 + 0.5) * canvas.height;
			const bandHeight = 90 + Math.sin(phase * 1.4 + i * 2.1) * 38;
			const top = center - bandHeight * 0.5;
			const gradBand = ctx.createLinearGradient(left, top, left, top + bandHeight);
			gradBand.addColorStop(0, "rgba(160,215,255,0)");
			gradBand.addColorStop(0.45, `rgba(210,245,255,${0.14 * strength})`);
			gradBand.addColorStop(0.85, "rgba(200,240,255,0)");
			ctx.globalAlpha = 0.9;
			ctx.fillStyle = gradBand;
			ctx.fillRect(left, top, width, bandHeight);
		}
		if (wave.bubbles && wave.bubbles.length) {
			const span = canvas.height + 160;
			ctx.globalCompositeOperation = "lighter";
			for (const bubble of wave.bubbles) {
				const driftPhase = shimmerPhase * (0.9 + bubble.drift * 0.18) + bubble.x * 4.8;
				const drift = Math.sin(driftPhase) * width * 0.08;
				const x = left + width * bubble.x + drift;
				const travel = (bubble.y * span + elapsed * bubble.speed * span) % span;
				const y = canvas.height + 80 - travel;
				const radius = Math.max(3, bubble.radius * (0.45 + strength * 0.55));
				const alpha = Math.max(0, bubble.alpha * strength * 1.2);
				if (y < -radius || y > canvas.height + radius) continue;
				ctx.globalAlpha = alpha;
				const bubbleGrad = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
				bubbleGrad.addColorStop(0, "rgba(255,255,255,0.95)");
				bubbleGrad.addColorStop(0.5, "rgba(195,235,255,0.45)");
				bubbleGrad.addColorStop(1, "rgba(150,210,255,0)");
				ctx.fillStyle = bubbleGrad;
				ctx.beginPath();
				ctx.arc(x, y, radius, 0, TAU);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	function renderCoinDrops() {
		if (state.coinDrops.length === 0) return;
		ctx.save();
		for (const coin of state.coinDrops) {
			if (coin.dead) continue;
			const radius = 14 * (coin.scale || 1);
			const ratio = coin.collectDuration ? (coin.collectTimer || 0) / coin.collectDuration : 1;
			const alpha = coin.collected ? Math.max(0, ratio) : 1;
			ctx.save();
			ctx.translate(coin.x, coin.y);
			ctx.rotate(coin.spin || 0);
			ctx.globalAlpha = 0.85 * alpha;
			const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
			grad.addColorStop(0, "rgba(255,255,220,0.95)");
			grad.addColorStop(0.45, "rgba(255,215,110,0.9)");
			grad.addColorStop(1, "rgba(200,140,40,0.6)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius, radius * 0.7, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,240,180,0.85)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius * 0.85, radius * 0.58, 0, 0, TAU);
			ctx.stroke();
			ctx.restore();
			if (coin.collected && coin.collectTimer > 0) {
				const collectRatio = coin.collectDuration ? 1 - coin.collectTimer / coin.collectDuration : 0;
				ctx.save();
				ctx.globalAlpha = 0.7 * (1 - collectRatio * 0.8);
				ctx.fillStyle = "#ffe4a6";
				ctx.font = "bold 18px 'Trebuchet MS', 'Segoe UI', sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(`+${coin.value || 1}`, coin.x, coin.y - 24 - collectRatio * 28);
				ctx.restore();
			}
		}
		ctx.restore();
	}

	function renderHealBursts() {
		if (state.healBursts.length === 0) return;
		ctx.save();
		for (const burst of state.healBursts) {
			const lifeRatio = clamp01(burst.life / (burst.fade || 900));
			ctx.globalAlpha = lifeRatio * 0.8;
			MODELS.sparkle(ctx, burst.x, burst.y, { radius: burst.rad * lifeRatio * 0.9, rotation: burst.life * 0.002 });
		}
		ctx.restore();
	}

	function renderSymbolDrops() {
		if (state.symbolDrops.length === 0) return;
		ctx.save();
		for (const drop of state.symbolDrops) {
			const config = SYMBOL_DATA[drop.kind];
			const spriteKey = config && config.spriteKey;
			const sprite = spriteKey && SPRITES[spriteKey];
			const cleanup = drop.cleanupTimer == null ? SYMBOL_AUTOCOLLECT_MS : drop.cleanupTimer;
			const alpha = drop.collected ? clamp01(cleanup / 420) : 1;
			ctx.save();
			ctx.translate(drop.x, drop.y);
			ctx.globalAlpha = alpha;
			ctx.shadowColor = drop.collected ? "rgba(119,255,204,0.35)" : "rgba(119,255,204,0.5)";
			ctx.shadowBlur = drop.collected ? 6 : 16;
			const baseScale = drop.scale == null ? 0.26 : drop.scale;
			if (sprite && spriteReady(sprite)) {
				const drawW = sprite.naturalWidth * baseScale;
				const drawH = sprite.naturalHeight * baseScale;
				ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
			} else {
				ctx.fillStyle = "rgba(255,255,255,0.85)";
				ctx.beginPath();
				ctx.arc(0, 0, 18 * baseScale * 4, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossTorpedoes() {
		if (state.bossTorpedoes.length === 0) return;
		ctx.save();
		for (const torpedo of state.bossTorpedoes) {
			if (torpedo.life <= 0) continue;
			const radius = torpedo.radius || 18;
			const length = radius * 1.7;
			const angle = Math.atan2(torpedo.vy, torpedo.vx);
			ctx.save();
			ctx.translate(torpedo.x, torpedo.y);
			ctx.rotate(angle);
			const grad = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
			grad.addColorStop(0, "rgba(255,180,120,0.15)");
			grad.addColorStop(0.35, "rgba(255,220,160,0.4)");
			grad.addColorStop(1, "rgba(255,140,80,0.75)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(0, 0, length, radius * 0.72, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,210,130,0.55)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(-length * 0.6, -radius * 0.55);
			ctx.lineTo(length * 0.7, 0);
			ctx.lineTo(-length * 0.6, radius * 0.55);
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		}
		ctx.restore();
	}

	function renderDebugLabel() {
		ctx.save();
		ctx.fillStyle = "rgba(255,255,255,0.8)";
		ctx.font = "12px 'Segoe UI', sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(DEBUG_BUILD_LABEL, 12, canvas.height - 8);
		ctx.restore();
	}

	function renderBossPerfumeOrbs() {
		if (state.bossPerfumeOrbs.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const orb of state.bossPerfumeOrbs) {
			ctx.save();
			ctx.translate(orb.x, orb.y);
			const radius = (orb.radius || 18) * 1.2;
			const baseLife = orb.initialLife || 5200;
			const lifeRatio = clamp01(orb.life / Math.max(1, baseLife));
			const spin = orb.spin || 0;
			const flash = 0.6 + Math.sin((now * 0.004) + (orb.spawnedAt || now) * 0.0006 + spin * 2.4) * 0.2;
			const glow = 0.8 + Math.sin((now * 0.007) + (orb.sway || 0)) * 0.18;
			const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
			grad.addColorStop(0, `rgba(255,255,255,${0.95 * flash})`);
			grad.addColorStop(0.25, `rgba(255,210,255,${0.75 * flash})`);
			grad.addColorStop(0.6, `rgba(230,120,230,${0.55 * glow})`);
			grad.addColorStop(1, "rgba(130,20,180,0)");
			ctx.globalCompositeOperation = "lighter";
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.lineWidth = 3.4;
			ctx.strokeStyle = `rgba(255,160,245,${0.45 + 0.35 * (1 - lifeRatio)})`;
			ctx.beginPath();
			ctx.arc(0, 0, radius * 0.84, 0, TAU);
			ctx.stroke();
			ctx.save();
			ctx.rotate(spin);
			ctx.lineWidth = 2.1;
			ctx.strokeStyle = `rgba(255,235,255,${0.75})`;
			ctx.beginPath();
			ctx.arc(0, 0, radius * 0.54, -0.7, 0.7);
			ctx.stroke();
			ctx.lineWidth = 1.4;
			ctx.strokeStyle = `rgba(200,60,200,0.6)`;
			ctx.beginPath();
			ctx.arc(0, 0, radius * 1.05, 0.2, TAU * 0.42);
			ctx.stroke();
			ctx.restore();
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossFragranceClouds() {
		if (state.bossFragranceClouds.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const cloud of state.bossFragranceClouds) {
			const alpha = clamp01(cloud.life / Math.max(1, cloud.duration));
			const radius = cloud.radius || 60;
			const pulse = 0.8 + Math.sin((cloud.pulse || 0) + now * 0.0027) * 0.25;
			const glow = 0.65 + Math.sin((cloud.swirl || 0) * 1.6 + now * 0.0018) * 0.18;
			const grad = ctx.createRadialGradient(cloud.x, cloud.y, radius * 0.12, cloud.x, cloud.y, radius * 1.05);
			grad.addColorStop(0, `rgba(255,250,255,${0.6 * pulse})`);
			grad.addColorStop(0.35, `rgba(255,175,240,${0.48 * pulse})`);
			grad.addColorStop(0.65, `rgba(210,90,220,${0.4 * glow})`);
			grad.addColorStop(1, "rgba(80,20,110,0)");
			ctx.globalCompositeOperation = "lighter";
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(cloud.x, cloud.y, radius, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.strokeStyle = `rgba(255,150,240,${0.35 + 0.4 * (1 - alpha)})`;
			ctx.lineWidth = 4.4;
			ctx.beginPath();
			ctx.arc(cloud.x, cloud.y, radius * 0.92, 0, TAU);
			ctx.stroke();
			const swirl = cloud.swirl || 0;
			const ellipseCount = 3;
			for (let i = 0; i < ellipseCount; i += 1) {
				const angle = swirl + i * (TAU / ellipseCount);
				const ellRadius = radius * (0.48 + i * 0.18);
				ctx.lineWidth = 1.8;
				ctx.strokeStyle = `rgba(255,215,250,${0.28 * alpha})`;
				ctx.beginPath();
				ctx.ellipse(
					cloud.x + Math.cos(angle) * radius * 0.12,
					cloud.y + Math.sin(angle) * radius * 0.12,
					ellRadius,
					ellRadius * 0.45,
					angle,
					0,
					TAU
				);
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	function renderBossWakeWaves() {
		if (state.bossWakeWaves.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const wave of state.bossWakeWaves) {
			const radiusX = wave.radiusX == null ? 82 : wave.radiusX;
			const radiusY = wave.radiusY == null ? 28 : wave.radiusY;
			const lifeRatio = wave.initialLife ? clamp01(wave.life / Math.max(1, wave.initialLife)) : 1;
			ctx.save();
			ctx.translate(wave.x, wave.y);
			const tilt = Math.sin((wave.phase || 0) * 1.3 + now * 0.0012) * 0.18;
			ctx.rotate(tilt);
			const grad = ctx.createRadialGradient(0, 0, radiusX * 0.2, 0, 0, radiusX * 1.05);
			grad.addColorStop(0, `rgba(190,235,255,${0.46 + 0.3 * lifeRatio})`);
			grad.addColorStop(0.55, `rgba(120,195,245,${0.36 + 0.2 * lifeRatio})`);
			grad.addColorStop(1, "rgba(40,115,180,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = `rgba(210,245,255,${0.35 + 0.28 * lifeRatio})`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.ellipse(0, 0, radiusX * 0.86, radiusY * 0.7, 0, 0, TAU);
			ctx.stroke();
			ctx.strokeStyle = `rgba(150,210,255,${0.24 + 0.18 * lifeRatio})`;
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.moveTo(-radiusX * 0.6, -radiusY * 0.4);
			ctx.quadraticCurveTo(0, -radiusY * 0.8, radiusX * 0.72, -radiusY * 0.1);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-radiusX * 0.5, radiusY * 0.2);
			ctx.quadraticCurveTo(0, radiusY * 0.7, radiusX * 0.68, radiusY * 0.12);
			ctx.stroke();
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossWhirlpools() {
		if (state.bossWhirlpools.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const whirl of state.bossWhirlpools) {
			if (whirl.dead) continue;
			ctx.save();
			ctx.translate(whirl.x, whirl.y);
			const telegraph = whirl.telegraph > 0;
			const baseRadius = telegraph
				? (whirl.minRadius || 52) * (0.9 + 0.3 * (1 - whirl.telegraph / 720))
				: whirl.releaseTriggered
				? (whirl.explosionRadius || (whirl.radius || 110) * 1.3)
				: whirl.radius || 96;
			const rimPulse = Math.sin((whirl.spin || 0) * 1.3 + now * 0.0022) * 0.08;
			const rimRadius = baseRadius * (1.02 + rimPulse * 0.3);
			ctx.globalAlpha = telegraph ? 0.5 : 0.68;
			ctx.strokeStyle = telegraph ? "rgba(220,240,255,0.65)" : "rgba(190,225,255,0.75)";
			ctx.lineWidth = telegraph ? 3.4 : 4.6;
			ctx.beginPath();
			ctx.arc(0, 0, rimRadius, 0, TAU);
			ctx.stroke();
			ctx.globalAlpha = 1;
			if (telegraph) {
				ctx.globalAlpha = 0.65;
				ctx.strokeStyle = "rgba(240,245,255,0.6)";
				ctx.lineWidth = 2.4;
				ctx.beginPath();
				ctx.arc(0, 0, baseRadius, 0, TAU);
				ctx.stroke();
				const markers = 5;
				ctx.lineWidth = 3.2;
				for (let i = 0; i < markers; i += 1) {
					const angle = (i / markers) * TAU + now * 0.002;
					ctx.beginPath();
					ctx.moveTo(Math.cos(angle) * (baseRadius - 10), Math.sin(angle) * (baseRadius - 10));
					ctx.lineTo(Math.cos(angle) * (baseRadius + 14), Math.sin(angle) * (baseRadius + 14));
					ctx.stroke();
				}
			} else {
				const ratio = whirl.initialLife ? clamp01(whirl.life / Math.max(1, whirl.initialLife)) : 0.5;
				const swirl = whirl.spin || 0;
				const innerRadius = baseRadius * 0.25;
				const grad = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, baseRadius);
				grad.addColorStop(0, `rgba(220,240,255,${0.6 + 0.3 * (1 - ratio)})`);
				grad.addColorStop(0.45, `rgba(120,170,255,${0.45 + 0.2 * (1 - ratio)})`);
				grad.addColorStop(1, "rgba(30,70,140,0)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.arc(0, 0, baseRadius, 0, TAU);
				ctx.fill();
				ctx.save();
				ctx.rotate(swirl);
				const plankCount = whirl.releaseTriggered ? 10 : 6;
				for (let i = 0; i < plankCount; i += 1) {
					const angle = (i / plankCount) * TAU;
					const dist = innerRadius + (i % 2 === 0 ? baseRadius * 0.45 : baseRadius * 0.58);
					ctx.save();
					ctx.rotate(angle);
					ctx.translate(dist, 0);
					ctx.rotate(0.6 * Math.sin(now * 0.004 + i));
					ctx.fillStyle = "rgba(255,235,200,0.65)";
					ctx.fillRect(-12, -3, 24, 6);
					ctx.strokeStyle = "rgba(120,70,40,0.55)";
					ctx.lineWidth = 1.2;
					ctx.strokeRect(-12, -3, 24, 6);
					ctx.restore();
				}
				ctx.restore();
				ctx.globalAlpha = 0.38;
				ctx.strokeStyle = "rgba(180,220,255,0.45)";
				ctx.lineWidth = 1.8;
				for (let i = 0; i < 3; i += 1) {
					const angle = now * 0.0023 + i * (TAU / 3);
					ctx.beginPath();
					ctx.ellipse(
						Math.cos(angle) * baseRadius * 0.18,
						Math.sin(angle) * baseRadius * 0.12,
						baseRadius * (0.5 + i * 0.12),
						baseRadius * 0.32,
						angle,
						0,
						TAU
					);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
				if (whirl.releaseTriggered && whirl.explosionTimer > 0) {
					const burstRatio = clamp01(whirl.explosionTimer / 520);
					ctx.globalAlpha = 0.55 * burstRatio;
					ctx.strokeStyle = "rgba(255,245,220,0.8)";
					ctx.lineWidth = 6 * (1 - burstRatio * 0.6);
					ctx.beginPath();
					ctx.arc(0, 0, baseRadius * (1 + 0.25 * (1 - burstRatio)), 0, TAU);
					ctx.stroke();
					ctx.globalAlpha = 0.32 * burstRatio;
					ctx.fillStyle = "rgba(255,255,230,0.55)";
					ctx.beginPath();
					ctx.arc(0, 0, baseRadius * 0.58, 0, TAU);
					ctx.fill();
				}
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossKatapultShots() {
		if (state.bossKatapultShots.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const shot of state.bossKatapultShots) {
			if (shot.dead || shot.delay > 0) continue;
			ctx.save();
			ctx.translate(shot.x, shot.y);
			if (!shot.exploding) {
				const dir = Math.atan2(shot.vy || 0.1, shot.vx || -0.1);
				const trailLen = (shot.radius || 24) * 2.1;
				ctx.save();
				ctx.rotate(dir);
				ctx.globalAlpha = 0.4;
				ctx.strokeStyle = "rgba(180,220,255,0.45)";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(-trailLen * 0.9, -4);
				ctx.quadraticCurveTo(-trailLen * 0.4, -10, -trailLen * 0.1, -2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(-trailLen * 0.9, 4);
				ctx.quadraticCurveTo(-trailLen * 0.4, 10, -trailLen * 0.1, 2);
				ctx.stroke();
				ctx.globalAlpha = 0.28;
				ctx.fillStyle = "rgba(150,200,255,0.5)";
				ctx.beginPath();
				ctx.ellipse(-trailLen * 0.6, 0, trailLen * 0.35, 10, 0, 0, TAU);
				ctx.fill();
				ctx.restore();
				ctx.rotate(Math.atan2(shot.vy || 0.1, shot.vx || -0.1));
				const length = (shot.radius || 24) * 1.6;
				const width = (shot.radius || 24) * 0.8;
				const grad = ctx.createLinearGradient(-length * 0.6, 0, length * 0.6, 0);
				grad.addColorStop(0, "rgba(200,230,255,0.05)");
				grad.addColorStop(0.5, "rgba(200,245,255,0.45)");
				grad.addColorStop(1, "rgba(110,200,255,0.65)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.moveTo(-length * 0.6, -width * 0.5);
				ctx.quadraticCurveTo(length * 0.2, -width * 0.8, length * 0.6, 0);
				ctx.quadraticCurveTo(length * 0.2, width * 0.8, -length * 0.6, width * 0.5);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = "rgba(140,200,255,0.6)";
				ctx.lineWidth = 2.2;
				ctx.beginPath();
				ctx.moveTo(-length * 0.5, 0);
				ctx.lineTo(length * 0.6, 0);
				ctx.stroke();
			} else {
				const ratio = clamp01(shot.explosionLife / 620);
				const radius = (shot.explosionRadius || 110) * (1 - ratio * 0.35);
				ctx.globalCompositeOperation = "lighter";
				const grad = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
				grad.addColorStop(0, `rgba(255,255,255,${0.8 * ratio})`);
				grad.addColorStop(0.4, `rgba(160,225,255,${0.56 * ratio})`);
				grad.addColorStop(0.85, `rgba(80,160,255,${0.25 * ratio})`);
				grad.addColorStop(1, "rgba(40,120,200,0)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.arc(0, 0, radius, 0, TAU);
				ctx.fill();
				ctx.globalCompositeOperation = "source-over";
				ctx.globalAlpha = 0.5 * ratio;
				ctx.strokeStyle = "rgba(190,240,255,0.8)";
				ctx.lineWidth = 5 * ratio;
				ctx.beginPath();
				ctx.arc(0, 0, radius * 0.82, 0, TAU);
				ctx.stroke();
				ctx.globalAlpha = 0.28 * ratio;
				ctx.fillStyle = "rgba(255,255,255,0.45)";
				ctx.beginPath();
				ctx.arc(0, 0, radius * 0.32, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossCoinBursts() {
		if (state.bossCoinBursts.length === 0) return;
		ctx.save();
		for (const coin of state.bossCoinBursts) {
			if (coin.exploded) continue;
			ctx.save();
			ctx.translate(coin.x, coin.y);
			ctx.rotate(coin.spin || 0);
			const radius = 16 * (coin.scale || 1);
			const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
			grad.addColorStop(0, "rgba(255,250,210,0.85)");
			grad.addColorStop(0.5, "rgba(255,220,100,0.85)");
			grad.addColorStop(1, "rgba(200,140,40,0.4)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius, radius * 0.68, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,240,180,0.8)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius * 0.9, radius * 0.6, 0, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossCoinExplosions() {
		if (state.bossCoinExplosions.length === 0) return;
		ctx.save();
		for (const blast of state.bossCoinExplosions) {
			const duration = blast.duration == null ? 520 : blast.duration;
			const lifeRatio = clamp01((blast.life || 0) / Math.max(1, duration));
			const radius = (blast.radius || 54) * (1 + (1 - lifeRatio) * 0.35);
			const grad = ctx.createRadialGradient(blast.x, blast.y, radius * 0.18, blast.x, blast.y, radius);
			grad.addColorStop(0, `rgba(255,255,215,${0.75 * lifeRatio})`);
			grad.addColorStop(0.45, `rgba(255,205,100,${0.5 * lifeRatio})`);
			grad.addColorStop(1, "rgba(255,120,40,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(blast.x, blast.y, radius, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 0.4 * lifeRatio;
			ctx.strokeStyle = "rgba(255,225,180,0.7)";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(blast.x, blast.y, radius * 0.82, 0, TAU);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		ctx.restore();
	}

	function renderBossDiamondBeams() {
		if (state.bossDiamondBeams.length === 0) return;
		ctx.save();
		const beamLength = Math.max(canvas.width, canvas.height) * 1.5;
		for (const beam of state.bossDiamondBeams) {
			ctx.save();
			ctx.translate(beam.originX, beam.originY);
			const angle = beam.angle || 0;
			ctx.rotate(angle);
			if (beam.stage === "telegraph") {
				const ratio = beam.telegraphTotal ? clamp01((beam.telegraphTimer || 0) / Math.max(1, beam.telegraphTotal)) : 0.4;
				ctx.globalAlpha = 0.2 + 0.45 * ratio;
				ctx.strokeStyle = "rgba(180,225,255,0.8)";
				ctx.setLineDash([10, 12]);
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(-beamLength, 0);
				ctx.stroke();
				ctx.setLineDash([]);
			} else {
				const width = beam.width == null ? 48 : beam.width;
				const intensity = beam.stage === "active" ? 1 : 0.55 * clamp01((beam.fadeTimer || 0) / Math.max(1, beam.fadeDuration || 320));
				ctx.globalAlpha = intensity;
				const grad = ctx.createLinearGradient(0, -width * 0.5, 0, width * 0.5);
				grad.addColorStop(0, "rgba(150,220,255,0.2)");
				grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
				grad.addColorStop(1, "rgba(150,220,255,0.2)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.moveTo(0, -width * 0.5);
				ctx.lineTo(-beamLength, -width * 0.5);
				ctx.lineTo(-beamLength, width * 0.5);
				ctx.lineTo(0, width * 0.5);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = "rgba(235,255,255,0.7)";
				ctx.lineWidth = 4;
				ctx.beginPath();
				ctx.moveTo(0, -width * 0.5);
				ctx.lineTo(-beamLength, -width * 0.5);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, width * 0.5);
				ctx.lineTo(-beamLength, width * 0.5);
				ctx.stroke();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossCardBoomerangs() {
		if (state.bossCardBoomerangs.length === 0) return;
		ctx.save();
		for (const card of state.bossCardBoomerangs) {
			if (card.dead) continue;
			ctx.save();
			ctx.translate(card.x, card.y);
			ctx.rotate(card.rotation || 0);
			const width = card.phase === "burst" ? 30 : 26;
			const height = card.phase === "burst" ? 20 : 18;
			ctx.fillStyle = card.phase === "burst" ? "rgba(20,20,20,0.9)" : "rgba(32,32,32,0.85)";
			ctx.fillRect(-width / 2, -height / 2, width, height);
			ctx.strokeStyle = "rgba(210,210,210,0.6)";
			ctx.lineWidth = 2;
			ctx.strokeRect(-width / 2, -height / 2, width, height);
			ctx.fillStyle = "rgba(255,215,120,0.7)";
			ctx.fillRect(-width * 0.28, -height / 2, width * 0.56, height);
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossShockwaves() {
		if (state.bossShockwaves.length === 0) return;
		ctx.save();
		const now = performance.now();
		for (const wave of state.bossShockwaves) {
			if (wave.dead) continue;
			ctx.save();
			ctx.translate(wave.x, wave.y);
			const pulse = Math.sin((wave.anchorPulse || 0) + now * 0.0024);
			const telegraphProgress = wave.stage === "telegraph" && wave.telegraphTimer > 0
				? 1 - clamp01(wave.telegraphTimer / 1040)
				: 1;
			const anchorGlow = ctx.createRadialGradient(0, 12, 6, 0, 12, 46);
			anchorGlow.addColorStop(0, `rgba(30,45,80,${0.4 + telegraphProgress * 0.2})`);
			anchorGlow.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = anchorGlow;
			ctx.beginPath();
			ctx.arc(0, 12, 44, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(40,60,110,0.85)";
			ctx.beginPath();
			ctx.moveTo(-9, -22);
			ctx.lineTo(-17, 18);
			ctx.quadraticCurveTo(0, 30 + pulse * 4, 17, 18);
			ctx.lineTo(9, -22);
			ctx.closePath();
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = "rgba(140,190,240,0.7)";
			ctx.stroke();
			ctx.save();
			ctx.translate(0, -20);
			ctx.fillStyle = "rgba(120,170,230,0.9)";
			ctx.beginPath();
			ctx.rect(-12, -6, 24, 12);
			ctx.fill();
			ctx.fillStyle = "rgba(200,230,255,0.6)";
			ctx.beginPath();
			ctx.rect(-6, -10, 12, 20);
			ctx.fill();
			ctx.restore();
			const impactRing = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
			impactRing.addColorStop(0, "rgba(255,255,255,0.5)");
			impactRing.addColorStop(0.35, "rgba(90,150,220,0.35)");
			impactRing.addColorStop(1, "rgba(0,0,0,0)");
			ctx.globalAlpha = 0.6;
			ctx.fillStyle = impactRing;
			ctx.beginPath();
			ctx.arc(0, 0, 82 + pulse * 6, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 1;
			if (wave.stage === "telegraph") {
				const sweepRadius = (wave.maxRadius || canvas.width * 0.9) * 0.18;
				ctx.strokeStyle = "rgba(200,230,255,0.6)";
				ctx.lineWidth = 4.2;
				ctx.beginPath();
				ctx.arc(0, 0, sweepRadius, 0, TAU);
				ctx.stroke();
				ctx.save();
				ctx.rotate(now * 0.0015);
				ctx.strokeStyle = "rgba(160,200,250,0.45)";
				ctx.lineWidth = 3;
				for (let i = 0; i < 4; i += 1) {
					const angle = (i / 4) * TAU;
					ctx.beginPath();
					ctx.moveTo(Math.cos(angle) * sweepRadius * 0.62, Math.sin(angle) * sweepRadius * 0.62);
					ctx.lineTo(Math.cos(angle) * sweepRadius, Math.sin(angle) * sweepRadius);
					ctx.stroke();
				}
				ctx.restore();
			} else {
				ctx.globalCompositeOperation = "lighter";
				if (wave.stage === "wave1" || wave.stage === "pause") {
					const radius = wave.waveOneRadius || 0;
					const thickness = (wave.waveThicknessOne || 90) * 0.5;
					const inner = Math.max(0, radius - thickness);
					const outer = radius + thickness * 0.6;
					const grad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
					grad.addColorStop(0, "rgba(120,200,255,0.05)");
					grad.addColorStop(0.55, "rgba(120,210,255,0.35)");
					grad.addColorStop(1, "rgba(120,210,255,0)");
					ctx.fillStyle = grad;
					ctx.beginPath();
					ctx.arc(0, 0, outer, 0, TAU);
					ctx.fill();
				}
				if (wave.stage === "wave2" || wave.stage === "cleanup") {
					const radius = wave.waveTwoRadius || 0;
					const thickness = (wave.waveThicknessTwo || 150) * 0.5;
					const inner = Math.max(0, radius - thickness * 0.9);
					const outer = radius + thickness * 0.7;
					const grad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
					grad.addColorStop(0, "rgba(255,225,180,0.04)");
					grad.addColorStop(0.6, "rgba(255,215,160,0.3)");
					grad.addColorStop(1, "rgba(255,215,160,0)");
					ctx.fillStyle = grad;
					ctx.beginPath();
					ctx.arc(0, 0, outer, 0, TAU);
					ctx.fill();
					ctx.strokeStyle = "rgba(255,240,210,0.65)";
					ctx.lineWidth = 6;
					ctx.beginPath();
					ctx.arc(0, 0, radius, 0, TAU);
					ctx.stroke();
				}
				ctx.globalCompositeOperation = "source-over";
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossSpeedboats() {
		if (state.bossSpeedboats.length === 0) return;
		ctx.save();
		for (const boat of state.bossSpeedboats) {
			if (boat.dead) continue;
			ctx.save();
			ctx.translate(boat.x, boat.y);
			ctx.rotate(Math.sin((boat.sway || 0) * 1.2) * 0.08);
			const scale = 0.72;
			ctx.globalAlpha = 0.45;
			ctx.strokeStyle = "rgba(180,220,255,0.4)";
			ctx.lineWidth = 2.2;
			ctx.beginPath();
			ctx.moveTo(-34 * scale, -8 * scale);
			ctx.quadraticCurveTo(-18 * scale, -18 * scale, -2 * scale, -4 * scale);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-34 * scale, 8 * scale);
			ctx.quadraticCurveTo(-18 * scale, 18 * scale, -2 * scale, 4 * scale);
			ctx.stroke();
			ctx.globalAlpha = 1;
			ctx.fillStyle = "rgba(220,245,255,0.82)";
			ctx.beginPath();
			ctx.moveTo(-18 * scale, 6 * scale);
			ctx.quadraticCurveTo(0, -16 * scale, 22 * scale, 0);
			ctx.quadraticCurveTo(6 * scale, 12 * scale, -18 * scale, 6 * scale);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = "rgba(120,180,230,0.82)";
			ctx.lineWidth = 1.8;
			ctx.stroke();
			const canopyGrad = ctx.createLinearGradient(-12 * scale, -8 * scale, 10 * scale, 6 * scale);
			canopyGrad.addColorStop(0, "rgba(150,210,255,0.9)");
			canopyGrad.addColorStop(1, "rgba(60,140,210,0.8)");
			ctx.fillStyle = canopyGrad;
			ctx.beginPath();
			ctx.moveTo(-10 * scale, -2 * scale);
			ctx.lineTo(6 * scale, -8 * scale);
			ctx.lineTo(4 * scale, 4 * scale);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = "rgba(40,90,140,0.75)";
			ctx.lineWidth = 1.4;
			ctx.stroke();
			ctx.globalAlpha = 0.55;
			ctx.fillStyle = "rgba(200,235,255,0.5)";
			ctx.beginPath();
			ctx.ellipse(-6 * scale, 8 * scale, 10 * scale, 3 * scale, 0.2, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 1;
			ctx.restore();
		}
		ctx.restore();
	}

	function renderBossFinSweeps() {
		if (state.bossSweeps.length === 0) return;
		ctx.save();
		for (const sweep of state.bossSweeps) {
			if (sweep.life <= 0 || sweep.delay > 0) continue;
			const radius = sweep.radius || 38;
			const intensity = clamp01(sweep.life / 3600);
			const grad = ctx.createRadialGradient(sweep.x, sweep.y, radius * 0.1, sweep.x, sweep.y, radius * 1.2);
			grad.addColorStop(0, `rgba(120,200,255,${0.4 * intensity})`);
			grad.addColorStop(1, "rgba(30,80,140,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(sweep.x, sweep.y, radius * 1.2, radius * 0.66, sweep.phase * 0.6, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = `rgba(190,240,255,${0.55 * intensity})`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.ellipse(sweep.x, sweep.y, radius, radius * 0.5, sweep.phase * 0.6, 0, TAU);
			ctx.stroke();
		}
		ctx.restore();
	}

	function renderPlayer() {
		const player = state.player;
		const now = performance.now();
		if (player.shieldUnlocked) {
			const duration = player.shieldDuration || SHIELD_DURATION;
			if (player.shieldActive) {
				const ratio = clamp01(player.shieldTimer / Math.max(1, duration));
				const outerRadius = 88 + Math.sin(now * 0.006 + ratio * 5.4) * 8;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalCompositeOperation = "lighter";
				ctx.globalAlpha = 0.75;
				const shieldGrad = ctx.createRadialGradient(0, 0, outerRadius * 0.35, 0, 0, outerRadius);
				shieldGrad.addColorStop(0, "rgba(210,250,255,0.82)");
				shieldGrad.addColorStop(0.45, `rgba(140,220,255,${0.58 + ratio * 0.24})`);
				shieldGrad.addColorStop(1, "rgba(20,80,140,0)");
				ctx.fillStyle = shieldGrad;
				ctx.beginPath();
				ctx.arc(0, 0, outerRadius, 0, TAU);
				ctx.fill();
				ctx.globalCompositeOperation = "source-over";
				ctx.lineWidth = 3.6;
				ctx.strokeStyle = `rgba(170,230,255,${0.55 + 0.35 * ratio})`;
				ctx.beginPath();
				ctx.arc(0, 0, outerRadius * 0.84, 0, TAU);
				ctx.stroke();
				const swings = 4;
				for (let i = 0; i < swings; i += 1) {
					const angle = now * 0.002 + i * (TAU / swings);
					ctx.save();
					ctx.rotate(angle);
					ctx.globalAlpha = 0.4 + 0.25 * Math.sin(now * 0.004 + i);
					ctx.strokeStyle = "rgba(210,255,255,0.4)";
					ctx.lineWidth = 1.6;
					ctx.beginPath();
					ctx.ellipse(0, 0, outerRadius * 0.62, outerRadius * 0.2, 0, 0, TAU);
					ctx.stroke();
					ctx.restore();
				}
				ctx.restore();
			} else if (player.shieldCooldown <= 0) {
				const haloRadius = 58 + Math.sin(now * 0.008) * 4;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalAlpha = 0.35;
				ctx.strokeStyle = "rgba(170,230,255,0.7)";
				ctx.lineWidth = 2.2;
				ctx.beginPath();
				ctx.arc(0, 0, haloRadius, 0, TAU);
				ctx.stroke();
				ctx.restore();
			}
			if (player.shieldLastBlock && now - player.shieldLastBlock < 360) {
				const pulseRatio = 1 - (now - player.shieldLastBlock) / 360;
				const rippleRadius = 60 + pulseRatio * 30;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalAlpha = 0.35 * pulseRatio;
				ctx.strokeStyle = "rgba(220,255,255,0.6)";
				ctx.lineWidth = 3 * pulseRatio;
				ctx.beginPath();
				ctx.arc(0, 0, rippleRadius, 0, TAU);
				ctx.stroke();
				ctx.restore();
			}
		}
		if (player.perfumeSlowTimer > 0) {
			const slowRatio = clamp01((player.perfumeSlowTimer || 0) / 2600);
			const auraRadius = 56 + Math.sin(now * 0.005 + (player.perfumeSlowTimer || 0) * 0.001) * 6;
			ctx.save();
			ctx.translate(player.x, player.y);
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = 0.55 * slowRatio;
			const auraGrad = ctx.createRadialGradient(0, 0, auraRadius * 0.25, 0, 0, auraRadius);
			auraGrad.addColorStop(0, "rgba(255,245,255,0.85)");
			auraGrad.addColorStop(0.45, "rgba(255,170,240,0.5)");
			auraGrad.addColorStop(1, "rgba(150,40,180,0)");
			ctx.fillStyle = auraGrad;
			ctx.beginPath();
			ctx.arc(0, 0, auraRadius, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.lineWidth = 2.8;
			ctx.strokeStyle = `rgba(255,160,245,${0.4 + 0.3 * slowRatio})`;
			ctx.beginPath();
			ctx.arc(0, 0, auraRadius * 0.82, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}
		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		const energyValue = clamp(player.energy == null ? energyMax : player.energy, 0, energyMax);
		const energyRatio = energyMax > 0 ? energyValue / energyMax : 0;
		const barWidth = 90;
		const barHeight = 8;
		const barCenterX = player.x - player.dir * 70;
		const barX = barCenterX - barWidth / 2;
		const barY = player.y - 44;
		ctx.save();
		ctx.globalAlpha = 0.82;
		ctx.fillStyle = "rgba(6,16,28,0.65)";
		ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
		ctx.fillStyle = "rgba(18,32,52,0.9)";
		ctx.fillRect(barX, barY, barWidth, barHeight);
		const energyGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
		energyGrad.addColorStop(0, "#62f5ff");
		energyGrad.addColorStop(1, "#2fb8ff");
		ctx.fillStyle = energyGrad;
		ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);
		ctx.strokeStyle = "rgba(220,245,255,0.5)";
		ctx.lineWidth = 1.6;
		ctx.strokeRect(barX, barY, barWidth, barHeight);
		ctx.restore();
		ctx.save();
		if (player.invulnFor > 0 && Math.floor(player.invulnFor / 120) % 2 === 0) ctx.globalAlpha = 0.45;
		MODELS.simpleShadow(ctx, player.x + 12, player.y + 36, 26);
		MODELS.player(ctx, player.x, player.y, { dir: player.dir, scale: 1 });
		ctx.restore();
	}

	function renderFoes() {
		for (const foe of state.foes) {
			const isBogenschreck = foe.type === "bogenschreck";
			const isRitterfisch = foe.type === "ritterfisch";
			const isOktopus = foe.type === "oktopus";
			const shadowRadius = (isBogenschreck ? 22 : isRitterfisch ? 24 : isOktopus ? 20 : 18) * foe.scale;
			MODELS.simpleShadow(ctx, foe.x + 8, foe.y + 24, shadowRadius);
			const renderer = isBogenschreck ? MODELS.bogenschreck : isRitterfisch ? MODELS.ritterfisch : isOktopus ? MODELS.oktopus : MODELS.foe;
			renderer(ctx, foe.x, foe.y, { scale: foe.scale, sway: foe.sway, charging: foe.charging });
		}
	}

	function renderShots() {
		const sprite = SPRITES.shot;
		if (spriteReady(sprite)) {
			ctx.save();
			for (const shot of state.shots) {
				if (shot.life <= 0) continue;
				const scale = shot.spriteScale == null ? 0.1 : shot.spriteScale;
				const drawW = sprite.naturalWidth * scale;
				const drawH = sprite.naturalHeight * scale;
				const offsetX = shot.spriteOffsetX == null ? 0 : shot.spriteOffsetX;
				const offsetY = shot.spriteOffsetY == null ? 0 : shot.spriteOffsetY;
				ctx.save();
				ctx.translate(shot.x, shot.y);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
			}
			ctx.restore();
			return;
		}

		ctx.save();
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			const radius = shot.coralShot ? 5.2 : 4;
			const grad = ctx.createRadialGradient(shot.x, shot.y, radius * 0.2, shot.x, shot.y, radius);
			if (shot.coralShot) {
				grad.addColorStop(0, "rgba(255,225,210,0.95)");
				grad.addColorStop(1, "rgba(255,140,120,0.12)");
			} else {
				grad.addColorStop(0, "rgba(180,240,255,0.9)");
				grad.addColorStop(1, "rgba(120,200,255,0.05)");
			}
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(shot.x, shot.y, radius, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	function renderBossHpBar() {
		const boss = state.boss;
		if (!boss.active) return;
		const padX = 160;
		const padY = 26;
		const barWidth = canvas.width - padX * 2;
		const barHeight = 18;
		const ratio = boss.maxHp > 0 ? clamp01(boss.hp / boss.maxHp) : 0;
		ctx.save();
		ctx.translate(padX, padY);
		ctx.fillStyle = "rgba(4,12,24,0.6)";
		ctx.fillRect(-6, -6, barWidth + 12, barHeight + 12);
		ctx.fillStyle = "rgba(18,32,52,0.9)";
		ctx.fillRect(0, 0, barWidth, barHeight);
		const gradient = ctx.createLinearGradient(0, 0, barWidth, 0);
		gradient.addColorStop(0, "#ff7aa2");
		gradient.addColorStop(1, "#ffd18d");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, barWidth * ratio, barHeight);
		ctx.strokeStyle = "rgba(240,248,255,0.45)";
		ctx.lineWidth = 2;
		ctx.strokeRect(0, 0, barWidth, barHeight);
		ctx.fillStyle = "#f2f7ff";
		ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`Boss HP ${Math.ceil(boss.hp)}/${boss.maxHp}`, barWidth / 2, barHeight / 2);
		ctx.restore();
	}

	function renderEventFlash() {
		const flash = state.eventFlash;
		if (!flash) return;
		const now = performance.now();
		const elapsed = now - flash.started;
		if (elapsed >= flash.duration) {
			state.eventFlash = null;
			return;
		}
		const fade = clamp01(1 - elapsed / flash.duration);
		const eased = fade * fade;
		const overlayOpacity = (flash.opacity || 0.9) * eased * 0.45;
		ctx.save();
		if (flash.kind !== "heal") {
			ctx.fillStyle = `rgba(255,250,230,${overlayOpacity})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		if (flash.text) {
			ctx.font = "28px 'Trebuchet MS', 'Segoe UI', sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			if (flash.kind === "heal") {
				ctx.fillStyle = `rgba(180,255,240,${Math.min(0.85, eased)})`;
				ctx.strokeStyle = "rgba(0,110,140,0.35)";
			} else {
				ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, overlayOpacity * 2)})`;
				ctx.strokeStyle = "rgba(15,40,60,0.45)";
			}
			ctx.lineWidth = 4;
			ctx.strokeText(flash.text, canvas.width / 2, canvas.height * 0.18);
			ctx.fillText(flash.text, canvas.width / 2, canvas.height * 0.18);
		}
		ctx.restore();
	}

	function renderBoss() {
		const boss = state.boss;
		if (!boss.active) return;
		const shadowRadius = boss.shadowRadius == null ? 48 : boss.shadowRadius;
		const shadowOffsetX = boss.shadowOffsetX == null ? 16 : boss.shadowOffsetX;
		const shadowOffsetY = boss.shadowOffsetY == null ? 52 : boss.shadowOffsetY;
		MODELS.simpleShadow(ctx, boss.x + shadowOffsetX, boss.y + shadowOffsetY, shadowRadius);
		MODELS.boss(ctx, boss.x, boss.y, {
			pulse: boss.pulse,
			spriteKey: boss.spriteKey,
			spriteScale: boss.spriteScale == null ? undefined : boss.spriteScale,
			spriteOffsetX: boss.spriteOffsetX == null ? undefined : boss.spriteOffsetX,
			spriteOffsetY: boss.spriteOffsetY == null ? undefined : boss.spriteOffsetY,
			flip: boss.spriteFlip !== false
		});
	}

	function renderCity() {
		const city = state.city;
		if (!city) return;
		
		// CSS 3D-Perspektive DEAKTIVIERT für Seitenansicht
		if (canvas && canvas.classList.contains("city-perspective")) {
			canvas.classList.remove("city-perspective");
		}
		syncCityInventoryVisibility();
		syncCityShopVisibility();
		syncCityMissionVisibility();
		if (citySpriteDebugPanel) {
			citySpriteDebugPanel.style.display = "none";
		}
		
		const width = canvas.width;
		const height = canvas.height;
		const player = city.player;
		const floors = city.floors;

		// Hintergrund - Unterwasser-Gradient wie in Level 1-4
		ctx.clearRect(0, 0, width, height);
		const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
		bgGrad.addColorStop(0, "#03294a");
		bgGrad.addColorStop(0.55, "#02203b");
		bgGrad.addColorStop(1, "#02111f");
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, width, height);
		
		// Lichtstrahlen von oben (wie Cutscene)
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = 0.18;
		for (let i = 0; i < 3; i++) {
			const phase = performance.now() * 0.0003 + i * 1.5;
			const center = (width / 4) * (i + 1) + Math.sin(phase) * 40;
			const beamWidth = 80;
			const grad = ctx.createLinearGradient(center, 0, center, height * 0.7);
			grad.addColorStop(0, "rgba(255,255,255,0.3)");
			grad.addColorStop(0.6, "rgba(40,80,120,0.2)");
			grad.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.moveTo(center - beamWidth * 0.3, 0);
			ctx.lineTo(center + beamWidth * 0.3, 0);
			ctx.lineTo(center + beamWidth * 0.6, height * 0.7);
			ctx.lineTo(center - beamWidth * 0.6, height * 0.7);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
		
		// ===== KAMERA-TRANSFORMATION =====
		// Speichere aktuelle Transformation und wende Kamera-Offset an
		ctx.save();
		ctx.translate(-city.camera.x, -city.camera.y);
		
		// ===== GEBÄUDE MIT STADT.PNG ZEICHNEN =====
		const bx = city.buildingX;
		const by = city.buildingY;
		const bw = city.buildingWidth;
		const bh = city.buildingHeight;
		
		// ===== WASSER LINKS UND RECHTS VOM GEBÄUDE =====
		const waterPadding = 400; // Wie weit das Wasser sichtbar ist
		
		// Wasser links vom Gebäude
		const waterGradLeft = ctx.createLinearGradient(bx - waterPadding, 0, bx, 0);
		waterGradLeft.addColorStop(0, "rgba(2, 30, 50, 0.95)");
		waterGradLeft.addColorStop(0.5, "rgba(3, 40, 65, 0.9)");
		waterGradLeft.addColorStop(1, "rgba(5, 50, 80, 0.85)");
		ctx.fillStyle = waterGradLeft;
		ctx.fillRect(bx - waterPadding, by, waterPadding, bh);
		
		// Wasser rechts vom Gebäude
		const waterGradRight = ctx.createLinearGradient(bx + bw, 0, bx + bw + waterPadding, 0);
		waterGradRight.addColorStop(0, "rgba(5, 50, 80, 0.85)");
		waterGradRight.addColorStop(0.5, "rgba(3, 40, 65, 0.9)");
		waterGradRight.addColorStop(1, "rgba(2, 30, 50, 0.95)");
		ctx.fillStyle = waterGradRight;
		ctx.fillRect(bx + bw, by, waterPadding, bh);
		
		// Blasen im Wasser (animiert)
		ctx.save();
		ctx.globalAlpha = 0.5;
		const bubbleTime = performance.now() * 0.001;
		for (let i = 0; i < 8; i++) {
			const seed = i * 137.5;
			const side = i < 4 ? -1 : 1; // Links oder rechts
			const baseX = side < 0 ? bx - waterPadding / 2 : bx + bw + waterPadding / 2;
			const offsetX = Math.sin(seed) * (waterPadding * 0.3);
			const bubbleX = baseX + offsetX;
			const bubbleY = by + bh - ((bubbleTime * 30 + seed * 10) % bh);
			const bubbleR = 3 + Math.sin(seed * 2) * 2;
			
			ctx.strokeStyle = "rgba(150, 200, 255, 0.6)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(bubbleX, bubbleY, bubbleR, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
		
		// Stadt-Hintergrundbild zeichnen (wenn geladen)
		const cityBg = SPRITES.cityBackground;
		if (spriteReady(cityBg)) {
			// Bild so skalieren, dass es das Gebäude abdeckt
			const imgAspect = cityBg.naturalWidth / cityBg.naturalHeight;
			const buildingAspect = bw / bh;
			
			let drawW, drawH, drawX, drawY;
			
			// Bild auf Gebäude-Bereich anpassen (cover-Modus)
			if (imgAspect > buildingAspect) {
				// Bild ist breiter - Höhe anpassen
				drawH = bh;
				drawW = bh * imgAspect;
				drawX = bx - (drawW - bw) / 2;
				drawY = by;
			} else {
				// Bild ist höher - Breite anpassen
				drawW = bw;
				drawH = bw / imgAspect;
				drawX = bx;
				drawY = by - (drawH - bh) / 2;
			}
			
			ctx.drawImage(cityBg, drawX, drawY, drawW, drawH);
		} else {
			// Fallback: Einfacher Gebäude-Rahmen
			ctx.fillStyle = "rgba(15, 45, 75, 0.85)";
			ctx.fillRect(bx, by, bw, bh);
			ctx.strokeStyle = "rgba(100, 180, 220, 0.6)";
			ctx.lineWidth = 3;
			ctx.strokeRect(bx, by, bw, bh);
		}
		
		// ===== NPCs ZEICHNEN =====
		const NPC_SPRITE_SCALE = 0.22; // Größere Skalierung für Händler-NPC
		const NPC_MISSION_SCALE = 0.22; // Größere Skalierung für Missionen-NPC
		
		for (const npc of city.npcs) {
			const nx = npc.x;
			const ny = npc.y;
			
			// NPC-Sprite auswählen
			let npcSprite = null;
			let spriteScale = NPC_SPRITE_SCALE;
			if (npc.id === "merchant") {
				npcSprite = SPRITES.npcHaendler;
			} else if (npc.id === "quest") {
				npcSprite = SPRITES.npcMission;
				spriteScale = NPC_MISSION_SCALE;
			}
			
			let labelOffset = 40;
			
			if (npcSprite && spriteReady(npcSprite)) {
				const drawW = npcSprite.naturalWidth * spriteScale;
				const drawH = npcSprite.naturalHeight * spriteScale;
				
				// NPC-Sprite (Seitenansicht, nicht gestaucht)
				ctx.save();
				ctx.translate(nx, ny);
				ctx.drawImage(npcSprite, -drawW / 2, -drawH, drawW, drawH);
				ctx.restore();
				
				labelOffset = drawH + 15;
			} else {
				// Fallback-Kreis
				ctx.fillStyle = npc.id === "merchant" ? "rgba(255, 200, 100, 0.9)" : "rgba(100, 200, 255, 0.9)";
				ctx.beginPath();
				ctx.arc(nx, ny - 15, 20, 0, TAU);
				ctx.fill();
				ctx.strokeStyle = "rgba(255,255,255,0.5)";
				ctx.lineWidth = 2;
				ctx.stroke();
			}
			
			// NPC-Label
			ctx.fillStyle = "rgba(255,255,255,0.9)";
			ctx.font = "bold 14px 'Segoe UI', sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(npc.label, nx, ny - labelOffset);
			
			// Interaktions-Hinweis
			ctx.fillStyle = "rgba(200, 230, 255, 0.6)";
			ctx.font = "12px 'Segoe UI', sans-serif";
			ctx.fillText("[Klick zum Öffnen]", nx, ny - labelOffset + 16);
		}
		
		// ===== SPIELER ZEICHNEN (mit Player.png wie in Level 1-4) =====
		const playerSprite = SPRITES.player;
		
		// Offset-Korrektur für präzise Positionierung auf dem gelben Punkt
		const playerOffsetX = -3.5;
		const playerOffsetY = 50.0;
		
		if (spriteReady(playerSprite)) {
			const scale = 0.18;
			const drawW = playerSprite.naturalWidth * scale;
			const drawH = playerSprite.naturalHeight * scale;
			
			// Spieler-Sprite
			ctx.save();
			ctx.translate(player.x + playerOffsetX, player.y + playerOffsetY);
			// Flip horizontal basierend auf Blickrichtung
			if (player.dir < 0) {
				ctx.scale(-1, 1);
			}
			// Leichte Schwimm-Animation
			const bob = Math.sin(performance.now() * 0.003) * 2;
			ctx.drawImage(playerSprite, -drawW / 2, -drawH + bob, drawW, drawH);
			ctx.restore();
		} else {
			// Fallback wenn Sprite nicht geladen
			ctx.fillStyle = "rgba(100, 200, 255, 0.95)";
			ctx.beginPath();
			ctx.arc(player.x + playerOffsetX, player.y + playerOffsetY - 15, player.r, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,255,255,0.5)";
			ctx.lineWidth = 2;
			ctx.stroke();
		}
		
		// ===== KAMERA-TRANSFORMATION BEENDEN =====
		ctx.restore();
		
		// ===== UI-ELEMENTE (ohne Kamera-Transformation) =====
		
		// Aktuelles Stockwerk anzeigen
		ctx.fillStyle = "rgba(0, 20, 40, 0.7)";
		ctx.fillRect(10, 10, 180, 50);
		ctx.strokeStyle = "rgba(100, 180, 220, 0.5)";
		ctx.lineWidth = 2;
		ctx.strokeRect(10, 10, 180, 50);
		
		ctx.fillStyle = "rgba(255,255,255,0.9)";
		ctx.font = "bold 16px 'Segoe UI', sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("Unterwasserstadt", 20, 30);
		ctx.font = "14px 'Segoe UI', sans-serif";
		ctx.fillStyle = "rgba(180, 220, 255, 0.9)";
		ctx.fillText(`Stockwerk: ${player.floor}`, 20, 50);
		
		// Steuerungshinweise
		ctx.fillStyle = "rgba(0, 20, 40, 0.6)";
		ctx.fillRect(width - 200, height - 70, 190, 60);
		ctx.fillStyle = "rgba(180, 220, 255, 0.8)";
		ctx.font = "12px 'Segoe UI', sans-serif";
		ctx.textAlign = "right";
		ctx.fillText("A/D - Laufen", width - 20, height - 50);
		ctx.fillText("W/S - Schwimmen", width - 20, height - 35);
		ctx.fillText("M - Grid Editor", width - 20, height - 20);
		
		// ===== GRID EDITOR - BEGEHBARE BEREICHE MARKIEREN =====
		if (window.CITY_GRID_EDIT_MODE) {
			ctx.save();
			ctx.translate(-city.camera.x, -city.camera.y);
			
			const grid = window.CITY_WALKABLE_GRID || {};
			const cellSize = CITY_GRID_CELL_SIZE;
			
			// Zeichne Grid über das ganze Gebäude
			for (let row = 0; row < CITY_GRID_ROWS; row++) {
				for (let col = 0; col < CITY_GRID_COLS; col++) {
					const x = city.buildingX + col * cellSize;
					const y = city.buildingY + row * cellSize;
					const key = `${col},${row}`;
					const isWalkable = grid[key] === true;
					
					// Zelle zeichnen
					if (isWalkable) {
						// Begehbar = grün
						ctx.fillStyle = "rgba(0, 255, 100, 0.4)";
						ctx.fillRect(x, y, cellSize, cellSize);
					}
					
					// Raster-Linien
					ctx.strokeStyle = isWalkable ? "rgba(0, 255, 100, 0.8)" : "rgba(255, 255, 255, 0.2)";
					ctx.lineWidth = isWalkable ? 2 : 1;
					ctx.strokeRect(x, y, cellSize, cellSize);
				}
			}
			
			// Spieler-Position im Grid markieren
			// WICHTIG: player.y ist die Füße-Position, der Sprite wird darüber gezeichnet
			// Für die Kollision verwenden wir einen Offset von 71px
			const PLAYER_VISUAL_OFFSET = 71;
			const playerCol = Math.floor((player.x - city.buildingX) / cellSize);
			const playerRow = Math.floor(((player.y - PLAYER_VISUAL_OFFSET) - city.buildingY) / cellSize);
			
			// Zeige die Grid-Zelle die tatsächlich geprüft wird (grün)
			ctx.strokeStyle = "#0f0";
			ctx.lineWidth = 3;
			ctx.strokeRect(
				city.buildingX + playerCol * cellSize,
				city.buildingY + playerRow * cellSize,
				cellSize, cellSize
			);
			
			// Spieler-Zentrum markieren (gelber Punkt)
			// Im Drag-Modus: Zeige den FESTEN Referenzpunkt
			ctx.fillStyle = "#ff0";
			ctx.beginPath();
			if (window.CITY_PLAYER_DRAG_MODE && window.DRAG_REFERENCE_POINT) {
				// Fester Referenzpunkt (bewegt sich nicht)
				ctx.arc(window.DRAG_REFERENCE_POINT.x, window.DRAG_REFERENCE_POINT.y, 8, 0, Math.PI * 2);
				ctx.fill();
				// Roter Punkt für aktuelle Spielerposition zum Vergleich
				ctx.fillStyle = "#f00";
				ctx.beginPath();
				ctx.arc(player.x, player.y - PLAYER_VISUAL_OFFSET, 5, 0, Math.PI * 2);
				ctx.fill();
			} else {
				// Normal: Gelber Punkt folgt dem Spieler
				ctx.arc(player.x, player.y - PLAYER_VISUAL_OFFSET, 5, 0, Math.PI * 2);
				ctx.fill();
			}
			
			ctx.restore();
			
			// Editor-Hinweise
			ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
			ctx.fillRect(200, 10, 400, 90);
			ctx.strokeStyle = "#0f0";
			ctx.lineWidth = 3;
			ctx.strokeRect(200, 10, 450, 130);
			
			ctx.fillStyle = "#0f0";
			ctx.font = "bold 16px monospace";
			ctx.textAlign = "left";
			ctx.fillText("🔧 GRID EDITOR - Begehbare Bereiche", 215, 32);
			ctx.font = "13px monospace";
			ctx.fillText("🖱️ Linksklick halten = Zellen markieren (malen)", 215, 52);
			ctx.fillText("🖱️ Rechtsklick halten = Zellen entfernen", 215, 70);
			ctx.fillText("⬆⬇⬅➡ Pfeiltasten = Kamera bewegen", 215, 88);
			ctx.fillText("S = Speichern | R = Reset | M = Editor aus", 215, 106);
			
			// Debug: Spieler-Position anzeigen
			const gridKey = `${playerCol},${playerRow}`;
			const isInGrid = window.CITY_WALKABLE_GRID && window.CITY_WALKABLE_GRID[gridKey];
			ctx.fillStyle = isInGrid ? "#0f0" : "#f00";
			ctx.fillText(`Spieler: Col=${playerCol}, Row=${playerRow} | Im Grid: ${isInGrid ? "JA" : "NEIN"}`, 215, 124);
		}
		
		// ===== IMMER: Debug-Anzeige für Spieler-Grid-Position =====
		{
			const cellSize = CITY_GRID_CELL_SIZE;
			const PLAYER_VISUAL_OFFSET = 71;
			const pCol = Math.floor((player.x - city.buildingX) / cellSize);
			const pRow = Math.floor(((player.y - PLAYER_VISUAL_OFFSET) - city.buildingY) / cellSize);
			const gKey = `${pCol},${pRow}`;
			const inGrid = window.CITY_WALKABLE_GRID && window.CITY_WALKABLE_GRID[gKey];
			
			ctx.save();
			ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
			ctx.fillRect(10, city.height - 60, 320, 50);
			ctx.fillStyle = inGrid ? "#0f0" : "#f00";
			ctx.font = "bold 14px monospace";
			ctx.textAlign = "left";
			ctx.fillText(`Grid: Col=${pCol}, Row=${pRow}`, 20, city.height - 40);
			ctx.fillText(`Im Grid: ${inGrid ? "JA ✓" : "NEIN ✗"} | Zellen: ${Object.keys(window.CITY_WALKABLE_GRID || {}).length}`, 20, city.height - 20);
			ctx.restore();
		}
		
		// ===== Debug-Variablen für Grid-Editor exportieren =====
		if (!window.CITY_GRID_EDIT_MODE) {
			// Normale Kamera-Werte exportieren
			window.CITY_CAMERA_X_DEBUG = city.camera.x;
			window.CITY_CAMERA_Y_DEBUG = city.camera.y;
		}
		window.CITY_BUILDING_X_DEBUG = city.buildingX;
		window.CITY_BUILDING_Y_DEBUG = city.buildingY;
		window.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
		window.CITY_GRID_COLS = CITY_GRID_COLS;
		window.CITY_GRID_ROWS = CITY_GRID_ROWS;
		
		// Spieler-Referenz für Drag-Modus exportieren
		window.CITY_PLAYER_DEBUG = player;
		
		// ===== DEBUG: GELBE BODEN-LINIEN FÜR JEDES STOCKWERK =====
		// Diese Linien zeigen wo der Spieler tatsächlich stehen kann
		if (window.SHOW_FLOOR_DEBUG_LINES) {
			ctx.save();
			ctx.translate(-city.camera.x, -city.camera.y);
			
			const FLOOR_OFFSET = city.floorThickness + 0; // Korrigiert auf +0
			const userOffset = window.FLOOR_LINE_OFFSET || 0; // Globaler Offset
			const individualOffsets = window.FLOOR_LINE_INDIVIDUAL_OFFSETS || {};
			const innerLeft = city.buildingX + city.wallThickness;
			const innerRight = city.buildingX + city.buildingWidth - city.wallThickness;
			
			// Export Floor-Daten für Maus-Erkennung
			window.CITY_FLOORS_DEBUG = [];
			
			for (let i = 0; i < floors.length; i++) {
				const floor = floors[i];
				const indivOffset = individualOffsets[i] || 0;
				// Die Y-Position wo der Spieler steht (Füße) + Offsets
				const groundY = floor.y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET + userOffset + indivOffset;
				
				// Speichere für Maus-Erkennung
				window.CITY_FLOORS_DEBUG.push({ index: i, groundY: groundY });
				
				// Gelbe Debug-Linie (dicker wenn individ. Offset)
				ctx.strokeStyle = indivOffset !== 0 ? "#00ff00" : "#ffff00";
				ctx.lineWidth = indivOffset !== 0 ? 6 : 4;
				ctx.setLineDash([]);
				ctx.beginPath();
				ctx.moveTo(innerLeft, groundY);
				ctx.lineTo(innerRight, groundY);
				ctx.stroke();
				
				// Greif-Bereich anzeigen (halbtransparent)
				ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
				ctx.fillRect(innerLeft, groundY - 15, innerRight - innerLeft, 30);
				
				// Label mit schwarzem Hintergrund für bessere Lesbarkeit
				const offsetText = indivOffset !== 0 ? ` (${indivOffset > 0 ? '+' : ''}${Math.round(indivOffset)})` : '';
				const labelText = `Stock ${i}${offsetText}`;
				ctx.font = "bold 16px monospace";
				const textWidth = ctx.measureText(labelText).width;
				ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
				ctx.fillRect(innerLeft + 100, groundY - 25, textWidth + 14, 24);
				ctx.fillStyle = indivOffset !== 0 ? "#00ff00" : "#ffff00";
				ctx.textAlign = "left";
				ctx.fillText(labelText, innerLeft + 107, groundY - 8);
				
				// Greif-Symbol
				ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
				ctx.font = "14px sans-serif";
				ctx.fillText("⬍", innerLeft + 75, groundY + 5);
			}
			
			ctx.restore();
			
			// Hinweis-Box oben links
			ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
			ctx.fillRect(200, 10, 350, 110);
			ctx.strokeStyle = "#ffff00";
			ctx.lineWidth = 3;
			ctx.strokeRect(200, 10, 350, 110);
			ctx.fillStyle = "#ffff00";
			ctx.font = "bold 16px monospace";
			ctx.textAlign = "left";
			ctx.fillText("🔧 BODEN-LINIEN EDITOR", 215, 32);
			ctx.font = "14px monospace";
			ctx.fillText("🖱️ Linien mit Maus ziehen", 215, 52);
			ctx.fillText("↑/↓ = Alle verschieben | Shift = 10px", 215, 70);
			ctx.fillText("R = Reset | S = Speichern | M = Aus", 215, 88);
			ctx.fillStyle = "#00ff00";
			ctx.fillText("Grün = individuell angepasst", 215, 106);
			
			// Aktueller Offset-Wert groß anzeigen
			ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
			ctx.fillRect(560, 10, 130, 40);
			ctx.strokeStyle = userOffset === 0 ? "#888" : "#00ff00";
			ctx.lineWidth = 2;
			ctx.strokeRect(560, 10, 130, 40);
			ctx.fillStyle = userOffset === 0 ? "#888" : "#00ff00";
			ctx.font = "bold 20px monospace";
			ctx.textAlign = "center";
			ctx.fillText("Global: " + (userOffset >= 0 ? "+" : "") + userOffset, 625, 38);
		}
	}

	function render() {
		if (state.mode === "city") {
			renderCity();
			renderDebugLabel();
			return;
		}
		// CSS 3D-Perspektive entfernen wenn nicht im Stadt-Modus
		if (canvas && canvas.classList.contains("city-perspective")) {
			canvas.classList.remove("city-perspective");
		}
		if (cityInventoryEl) cityInventoryEl.style.display = "none";
		if (cityMerchantEl) cityMerchantEl.style.display = "none";
		if (cityMissionEl) cityMissionEl.style.display = "none";
		if (citySpriteDebugPanel) citySpriteDebugPanel.style.display = "none";
		renderBackground();
		renderBubbles();
		renderFoes();
		renderCoverRocks();
		renderTsunamiWave();
		renderHeals();
		renderCoralEffects();
		renderCoralAllies();
		renderCoinDrops();
		renderSymbolDrops();
		renderBossHpBar();
		renderBossDiamondBeams();
		renderBossFinSweeps();
		renderBossWakeWaves();
		renderBossWhirlpools();
		renderBossCoinBursts();
		renderBossCoinExplosions();
		renderBossShockwaves();
		renderBossSpeedboats();
		renderBossCardBoomerangs();
		renderBossKatapultShots();
		renderBossPerfumeOrbs();
		renderBossTorpedoes();
		renderBossFragranceClouds();
		renderFoeArrows();
		renderShots();
		renderBoss();
		renderHealBursts();
		renderEventFlash();
		renderPlayer();
		renderFloorOverlay();
		renderDebugLabel();
	}

	function tick(now) {
		const dt = clamp(now - state.lastTick, 0, 48);
		state.lastTick = now;
		if (state.started && !state.over && !state.paused) {
			if (state.mode === "city") updateCity(dt);
			else update(dt);
			updateHUD();
		}
		render();
		requestAnimationFrame(tick);
	}

	document.addEventListener("keydown", event => {
		if (state.mode === "city") {
			// Inventar öffnen/schließen
			if (event.key === "i" || event.key === "I") {
				cityInventoryOpen = !cityInventoryOpen;
				syncCityInventoryVisibility();
				if (bannerEl) bannerEl.textContent = cityInventoryOpen ? "Inventar geöffnet (I)" : "Inventar geschlossen";
				event.preventDefault();
				return;
			}
		}
		if (isCityShortcutCandidate(event)) {
			const modeLabel = state.started ? (state.mode === "city" ? "city" : "game") : "title";
			const keyInfo = `${event.key || "?"}/${event.code || "?"}`;
			if (bannerEl) bannerEl.textContent = `Shortcut erkannt (${keyInfo}) – Modus: ${modeLabel}`;
			const bootToast = document.getElementById("bootToast");
			if (bootToast) bootToast.textContent = `Taste erkannt: ${keyInfo} – Modus: ${modeLabel}`;
			console.log("City shortcut keydown", { key: event.key, code: event.code, alt: event.altKey, shift: event.shiftKey, mode: modeLabel });
		}
		if (isCityShortcut(event)) {
			event.preventDefault();
			enterCity();
			return;
		}
		if (DEBUG_SHORTCUTS && event.altKey && event.shiftKey) {
			if (event.code === "Digit1") {
				event.preventDefault();
				debugJumpToLevel(0);
				return;
			}
			if (event.code === "Digit2") {
				event.preventDefault();
				debugJumpToLevel(1);
				return;
			}
			if (event.code === "Digit3") {
				event.preventDefault();
				debugJumpToLevel(2);
				return;
			}
			if (event.code === "Digit4") {
				event.preventDefault();
				debugJumpToLevel(3);
				return;
			}
			if (event.code === "Digit5") {
				event.preventDefault();
				enterCity();
				return;
			}
		}
		keys.add(event.key);
		if (state.started && !state.over && !state.paused && state.mode === "game" && isShieldActivationKey(event)) {
			event.preventDefault();
			tryActivateShield();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isCoralActivationKey(event)) {
			if (tryActivateCoralAllies()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isTsunamiActivationKey(event)) {
			if (tryActivateTsunamiAbility()) event.preventDefault();
		}
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			event.preventDefault();
			if (state.mode === "city") return;
			pointer.shoot = true;
			if (!state.started) {
				if (!controlsArmed) return;
				resetGame();
			} else {
				playerShoot();
			}
			return;
		}
		if (!state.started) {
			if (!controlsArmed) return;
			resetGame();
		}
	});

	document.addEventListener("keyup", event => {
		keys.delete(event.key);
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			pointer.shoot = false;
		}
	});

	canvas.addEventListener("pointerdown", event => {
		if (state.mode === "city") {
			if (event.pointerType === "mouse" && event.button !== 0) return;
			const rect = canvas.getBoundingClientRect();
			const localX = (event.clientX - rect.left) * (canvas.width / rect.width);
			const localY = (event.clientY - rect.top) * (canvas.height / rect.height);
			
			const city = state.city;
			if (!city) return;
			
			// Kamera-Offset berücksichtigen für Welt-Koordinaten
			const cameraX = city.camera ? city.camera.x : 0;
			const cameraY = city.camera ? city.camera.y : 0;
			const worldX = localX + cameraX;
			const worldY = localY + cameraY;
			
			// Klick auf NPCs prüfen (Seitenansicht - keine Perspektiv-Korrektur nötig)
			const npcClickRadius = 100;
			
			const merchant = city.npcs && city.npcs.find(npc => npc.id === "merchant");
			if (merchant) {
				const dist = Math.hypot(worldX - merchant.x, worldY - merchant.y);
				if (dist <= npcClickRadius) {
					cityShopOpen = true;
					cityShopSelection = null;
					updateCityShopUI();
					syncCityShopVisibility();
					if (bannerEl) bannerEl.textContent = "Händler geöffnet";
					return;
				}
			}
			const questGiver = city.npcs && city.npcs.find(npc => npc.id === "quest");
			if (questGiver) {
				const dist = Math.hypot(worldX - questGiver.x, worldY - questGiver.y);
				if (dist <= npcClickRadius) {
					cityMissionOpen = true;
					cityMissionSelection = null;
					updateCityMissionUI();
					syncCityMissionVisibility();
					if (bannerEl) bannerEl.textContent = "Missionen geöffnet";
					return;
				}
			}
			return;
		}
		if (event.pointerType === "mouse") {
			if (event.button === 2) {
				event.preventDefault();
				if (!state.started) {
					if (!controlsArmed) return;
					resetGame();
					return;
				}
				if (!state.over && !state.paused && state.player.shieldUnlocked) tryActivateShield();
				return;
			}
			if (event.button !== 0) return;
			pointer.shoot = true;
			if (!state.started) {
				if (!controlsArmed) return;
				resetGame();
			}
			else playerShoot();
			return;
		}
		if (!state.started) {
			if (!controlsArmed) return;
			resetGame();
		}
		pointer.down = true;
	});

	canvas.addEventListener("contextmenu", event => event.preventDefault());
	
	document.addEventListener("pointerup", () => {
		pointer.down = false;
		pointer.shoot = false;
	});

	if (btnRestart) btnRestart.addEventListener("click", () => resetGame());
	if (btnQuit)
		btnQuit.addEventListener("click", () => {
			showGameOver("Spiel beendet");
		});
	if (hudShield)
		hudShield.addEventListener("click", () => {
			if (!state.started || state.over || state.paused) return;
			if (!state.player.shieldUnlocked) return;
			tryActivateShield();
		});

	if (typeof window !== "undefined") {
		window.cashBeginGame = () => {
			if (!bootGame.initialized) bootGame();
			resetGame();
			state.over = false;
			state.paused = false;
			state.started = true;
			state.levelIndex = 0;
			applyLevelConfig(0, { skipFlash: false });
			primeFoes();
			scheduleNextFoeSpawn(true);
			state.lastTick = performance.now();
			state.boss.active = false;
			state.boss.entering = false;
			controlsArmed = true;
			if (bannerEl) bannerEl.style.display = "block";
		};
		window.cashResetGame = resetGame;
		window.cashSpawnBogenschreck = () => spawnFoe({ type: "bogenschreck" });
		window.cashDebugJumpLevel = debugJumpToLevel;
		window.cashEnterCity = () => {
			if (!bootGame.initialized) bootGame();
			enterCity();
		};
		// Debug-Funktion: Hole Stadt-Daten für Floor-Editor
		window.cashGetCityData = () => {
			if (!state.city) return null;
			const city = state.city;
			const FLOOR_OFFSET = city.floorThickness + 0;
			const floors = city.floors.map((floor, i) => ({
				stock: i,
				floorY: floor.y,
				groundY: Math.round(floor.y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET),
				hatchX: floor.hatchX,
				hasHatch: floor.hasHatch
			}));
			return {
				canvasSize: { width: canvas.width, height: canvas.height },
				building: {
					x: city.buildingX,
					y: city.buildingY,
					width: city.buildingWidth,
					height: city.buildingHeight
				},
				floorHeight: CITY_FLOOR_HEIGHT,
				floorThickness: city.floorThickness,
				floors: floors,
				player: {
					x: city.player.x,
					y: city.player.y,
					floor: city.player.floor
				},
				camera: city.camera
			};
		};
	}
	resetGame();
	state.started = true;
	state.paused = false;
	controlsArmed = true;
	if (typeof window !== "undefined") {
		const hash = (window.location.hash || "").toLowerCase();
		const query = (window.location.search || "").toLowerCase();
		if (hash === "#city" || hash === "#stadt" || query.includes("city") || query.includes("stadt")) {
			enterCity();
		}
	}
	requestAnimationFrame(tick);
}

if (typeof window !== "undefined") {
	window.bootGame = window.bootGame || bootGame;
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootGame, { once: true });
	else bootGame();
}
