// ============================================================
// CITY SPRITE DEBUG MODULE - Debug-Panel für Sprite-Offsets
// ============================================================
"use strict";

import { spriteReady } from '../core/assets.js';
import { 
	CITY_SPRITE_CACHE,
	getCitySpriteCropShift,
	setCitySpriteCropShift,
	getCitySpriteCropShiftArray
} from './spriteCache.js';
import { CITY_SPRITE_FRAME_SIZE, CITY_SPRITE_SCALE, CITY_SPRITE_DEBUG } from './constants.js';

// Debug-Konstanten
const DEBUG_ROWS = 3;
const DEBUG_COLS = 5;
const STORAGE_KEY = "cashfish.citySpriteOffsets.v1";
const CROP_KEY = "cashfish.citySpriteCropShift.v1";
const STORAGE_VERSION_KEY = "cashfish.citySpriteOffsets.version";
const STORAGE_VERSION = "2026-01-29-8";

// Standard-Offsets
const DEFAULT_OFFSETS = [
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

const DEFAULT_CROP_SHIFT = { x: 42.66666666666667, y: 13.333333333333336 };

/**
 * Erstellt das City Sprite Debug System
 * @param {Object} ctx - Context mit DOM-Elementen und Sprites
 * @returns {Object} Debug-Controller
 */
export function createCitySpriteDebug(ctx) {
	const {
		debugCanvas,
		debugReset,
		debugExport,
		debugOutput,
		debugCurrent,
		debugCopy,
		canvas,
		getSprites,
		getState,
		getCurrentFrame,
		setCurrentFrame,
		getAlignMode,
		getCropMode,
		setAlignSelectedFrame
	} = ctx;
	
	const debugCtx = debugCanvas ? debugCanvas.getContext("2d") : null;
	
	// Sprite-Offsets (kopiert von DEFAULT_OFFSETS)
	let spriteOffsets = DEFAULT_OFFSETS.map(row => row.map(cell => ({ ...cell })));
	
	// Drag-State
	let spriteDrag = null;
	let cropDrag = null;
	let alignDrag = null;
	
	// Initialisiere Crop-Shift
	setCitySpriteCropShift(Array.from(
		{ length: DEBUG_ROWS },
		() => Array.from(
			{ length: DEBUG_COLS },
			() => ({ ...DEFAULT_CROP_SHIFT })
		)
	));
	
	// Lade gespeicherte Werte
	function loadFromStorage() {
		try {
			const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
			if (storedVersion !== STORAGE_VERSION) {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
			}
			
			const stored = localStorage.getItem(STORAGE_KEY);
			const storedCrop = localStorage.getItem(CROP_KEY);
			
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length >= DEBUG_ROWS) {
					spriteOffsets = parsed.map((row) => (
						Array.isArray(row) ? row.slice(0, DEBUG_COLS).map(cell => ({
							x: Number(cell && cell.x) || 0,
							y: Number(cell && cell.y) || 0
						})) : Array.from({ length: DEBUG_COLS }, () => ({ x: 0, y: 0 }))
					)).slice(0, DEBUG_ROWS);
				}
			}
			
			if (storedCrop) {
				const parsed = JSON.parse(storedCrop);
				if (Array.isArray(parsed) && parsed.length >= DEBUG_ROWS) {
					setCitySpriteCropShift(parsed.map((row) => (
						Array.isArray(row) ? row.slice(0, DEBUG_COLS).map(cell => ({
							x: Number(cell && cell.x) || 0,
							y: Number(cell && cell.y) || 0
						})) : Array.from({ length: DEBUG_COLS }, () => ({ x: 0, y: 0 }))
					)).slice(0, DEBUG_ROWS));
				}
			}
		} catch (err) {
			console.warn("Failed to load city sprite offsets", err);
		}
	}
	
	// Speichere Werte
	function persist() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(spriteOffsets));
			localStorage.setItem(CROP_KEY, JSON.stringify(getCitySpriteCropShiftArray()));
		} catch (err) {
			console.warn("Failed to persist city sprite offsets", err);
		}
	}
	
	// Offset abrufen
	function getOffset(row, col) {
		const r = spriteOffsets[row];
		const entry = r && r[col];
		return entry ? entry : { x: 0, y: 0 };
	}
	
	// Offset aktualisieren
	function updateOffset(row, col, dx, dy) {
		if (!spriteOffsets[row] || !spriteOffsets[row][col]) return;
		spriteOffsets[row][col].x += dx;
		spriteOffsets[row][col].y += dy;
		persist();
	}
	
	// Canvas-Metriken berechnen
	function getCanvasMetrics() {
		if (!debugCanvas) return null;
		const sprite = getSprites().cityPlayer;
		if (!spriteReady(sprite)) return null;
		
		const frameSize = CITY_SPRITE_FRAME_SIZE;
		const scale = Math.min(
			debugCanvas.width / (frameSize * DEBUG_COLS),
			debugCanvas.height / (frameSize * DEBUG_ROWS)
		);
		const sheetW = frameSize * DEBUG_COLS * scale;
		const sheetH = frameSize * DEBUG_ROWS * scale;
		const originX = (debugCanvas.width - sheetW) * 0.5;
		const originY = (debugCanvas.height - sheetH) * 0.5;
		
		return { frameSize, rows: DEBUG_ROWS, cols: DEBUG_COLS, scale, originX, originY };
	}
	
	// Event-Handler für Debug-Canvas
	function setupDebugCanvasEvents() {
		if (!debugCanvas) return;
		
		debugCanvas.addEventListener("contextmenu", e => e.preventDefault());
		
		debugCanvas.addEventListener("mousedown", event => {
			if (!CITY_SPRITE_DEBUG) return;
			const metrics = getCanvasMetrics();
			if (!metrics) return;
			
			const rect = debugCanvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const localX = x - metrics.originX;
			const localY = y - metrics.originY;
			
			if (localX < 0 || localY < 0 || 
				localX >= metrics.frameSize * metrics.cols * metrics.scale || 
				localY >= metrics.frameSize * metrics.rows * metrics.scale) return;
			
			const col = Math.floor(localX / (metrics.frameSize * metrics.scale));
			const row = Math.floor(localY / (metrics.frameSize * metrics.scale));
			
			if (getCropMode()) {
				const shift = getCitySpriteCropShift(row, col);
				cropDrag = {
					row, col,
					startX: x, startY: y,
					origX: shift.x, origY: shift.y,
					scale: metrics.scale
				};
				return;
			}
			
			if (getAlignMode() || getCropMode()) {
				setAlignSelectedFrame({ row, col });
				setCurrentFrame({ row, col, flip: false });
			}
			
			const offset = getOffset(row, col);
			spriteDrag = {
				row, col,
				startX: x, startY: y,
				origX: offset.x, origY: offset.y,
				scale: metrics.scale
			};
		});
		
		debugCanvas.addEventListener("mousemove", event => {
			if (!spriteDrag && !cropDrag) return;
			
			const rect = debugCanvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			
			if (spriteDrag) {
				const dx = (x - spriteDrag.startX) / spriteDrag.scale;
				const dy = (y - spriteDrag.startY) / spriteDrag.scale;
				const { row, col } = spriteDrag;
				
				if (spriteOffsets[row] && spriteOffsets[row][col]) {
					spriteOffsets[row][col].x = spriteDrag.origX + dx;
					spriteOffsets[row][col].y = spriteDrag.origY + dy;
					persist();
				}
			}
			
			if (cropDrag) {
				const dx = (x - cropDrag.startX) / cropDrag.scale;
				const dy = (y - cropDrag.startY) / cropDrag.scale;
				const { row, col } = cropDrag;
				const cropShiftArr = getCitySpriteCropShiftArray();
				
				if (cropShiftArr[row] && cropShiftArr[row][col]) {
					cropShiftArr[row][col].x = cropDrag.origX + dx;
					cropShiftArr[row][col].y = cropDrag.origY + dy;
					CITY_SPRITE_CACHE.ready = false;
					persist();
				}
			}
		});
		
		const endDrag = () => {
			spriteDrag = null;
			cropDrag = null;
		};
		
		debugCanvas.addEventListener("mouseup", endDrag);
		debugCanvas.addEventListener("mouseleave", endDrag);
	}
	
	// Event-Handler für Game-Canvas (Align-Modus)
	function setupCanvasAlignEvents() {
		if (!canvas) return;
		
		canvas.addEventListener("mousedown", event => {
			const state = getState();
			if (!getAlignMode() || state.mode !== "city") return;
			
			const rect = canvas.getBoundingClientRect();
			const x = (event.clientX - rect.left) * (canvas.width / rect.width);
			const y = (event.clientY - rect.top) * (canvas.height / rect.height);
			const frame = getCurrentFrame();
			
			alignDrag = {
				startX: x, startY: y,
				row: frame.row, col: frame.col,
				flip: frame.flip
			};
		});
		
		canvas.addEventListener("mousemove", event => {
			const state = getState();
			if (!alignDrag || !getAlignMode() || state.mode !== "city") return;
			
			const rect = canvas.getBoundingClientRect();
			const x = (event.clientX - rect.left) * (canvas.width / rect.width);
			const y = (event.clientY - rect.top) * (canvas.height / rect.height);
			const dx = (x - alignDrag.startX) / CITY_SPRITE_SCALE;
			const dy = (y - alignDrag.startY) / CITY_SPRITE_SCALE;
			
			alignDrag.startX = x;
			alignDrag.startY = y;
			updateOffset(alignDrag.row, alignDrag.col, dx, dy);
		});
		
		const endAlignDrag = () => {
			alignDrag = null;
		};
		
		canvas.addEventListener("mouseup", endAlignDrag);
		canvas.addEventListener("mouseleave", endAlignDrag);
	}
	
	// Button-Handler
	function setupButtonEvents() {
		if (debugReset) {
			debugReset.addEventListener("click", () => {
				spriteOffsets = Array.from(
					{ length: DEBUG_ROWS }, 
					() => Array.from({ length: DEBUG_COLS }, () => ({ x: 0, y: 0 }))
				);
				persist();
				if (debugOutput) debugOutput.value = "";
			});
		}
		
		if (debugExport) {
			debugExport.addEventListener("click", () => {
				const payload = JSON.stringify({
					offsets: spriteOffsets,
					cropShift: getCitySpriteCropShiftArray()
				}, null, 2);
				
				if (debugOutput) {
					debugOutput.value = payload;
					debugOutput.focus();
					debugOutput.select();
				}
				
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(payload).catch(() => {});
				}
			});
		}
		
		if (debugCopy) {
			debugCopy.addEventListener("click", async () => {
				if (!debugCurrent) return;
				const text = debugCurrent.textContent || "";
				try {
					await navigator.clipboard.writeText(text);
				} catch (err) {
					if (debugOutput) debugOutput.value = text;
				}
			});
		}
		
		if (debugOutput) {
			debugOutput.addEventListener("click", () => {
				debugOutput.focus();
				debugOutput.select();
			});
			debugOutput.addEventListener("focus", () => {
				debugOutput.select();
			});
		}
	}
	
	// Initialisieren
	loadFromStorage();
	setupDebugCanvasEvents();
	setupCanvasAlignEvents();
	setupButtonEvents();
	
	// Public API
	return {
		getOffset,
		updateOffset,
		getCanvasMetrics,
		get offsets() { return spriteOffsets; },
		get debugCtx() { return debugCtx; },
		DEBUG_ROWS,
		DEBUG_COLS
	};
}
