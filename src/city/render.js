// ============================================================
// CITY RENDER MODULE - Zeichnet die Unterwasserstadt
// ============================================================
"use strict";

import { TAU } from '../core/constants.js';
import { spriteReady } from '../core/assets.js';
import {
	CITY_GRID_CELL_SIZE,
	CITY_GRID_COLS,
	CITY_GRID_ROWS,
	CITY_FLOOR_HEIGHT
} from './constants.js';
import { createAnimationPlayer } from '../animation/animationLoader.js';

// ============================================================
// ANIMATION TEST - Nutzt globale window.ANIM_TEST Variable
// ============================================================
let testAnimationLoading = false;
let lastAnimTime = 0;

function loadTestAnimation() {
	if (testAnimationLoading || window.ANIM_TEST?.player) return;
	testAnimationLoading = true;
	console.log('[AnimTest] Lade Animation...');
	
	createAnimationPlayer('./src/animation/player_walk.anim.json')
		.then(player => {
			console.log('[AnimTest] Animation geladen!', player.data.totalFrames, 'Frames');
			player.play();
			window.ANIM_TEST.player = player;
			lastAnimTime = performance.now();
		})
		.catch(e => {
			console.error('[AnimTest] Fehler:', e);
			testAnimationLoading = false;
		});
}

// Spieler wird ca. 71px oberhalb von y gezeichnet
const PLAYER_VISUAL_OFFSET = 71;

/**
 * Zeichnet den Unterwasser-Hintergrund
 */
function renderBackground(ctx, width, height) {
	ctx.clearRect(0, 0, width, height);
	const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
	bgGrad.addColorStop(0, "#03294a");
	bgGrad.addColorStop(0.55, "#02203b");
	bgGrad.addColorStop(1, "#02111f");
	ctx.fillStyle = bgGrad;
	ctx.fillRect(0, 0, width, height);
}

/**
 * Zeichnet animierte Lichtstrahlen von oben
 */
function renderLightBeams(ctx, width, height) {
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
}

/**
 * Zeichnet Wasser links und rechts vom Gebäude
 */
function renderWater(ctx, city) {
	const bx = city.buildingX;
	const by = city.buildingY;
	const bw = city.buildingWidth;
	const bh = city.buildingHeight;
	const waterPadding = 400;
	
	// Wasser links
	const waterGradLeft = ctx.createLinearGradient(bx - waterPadding, 0, bx, 0);
	waterGradLeft.addColorStop(0, "rgba(2, 30, 50, 0.95)");
	waterGradLeft.addColorStop(0.5, "rgba(3, 40, 65, 0.9)");
	waterGradLeft.addColorStop(1, "rgba(5, 50, 80, 0.85)");
	ctx.fillStyle = waterGradLeft;
	ctx.fillRect(bx - waterPadding, by, waterPadding, bh);
	
	// Wasser rechts
	const waterGradRight = ctx.createLinearGradient(bx + bw, 0, bx + bw + waterPadding, 0);
	waterGradRight.addColorStop(0, "rgba(5, 50, 80, 0.85)");
	waterGradRight.addColorStop(0.5, "rgba(3, 40, 65, 0.9)");
	waterGradRight.addColorStop(1, "rgba(2, 30, 50, 0.95)");
	ctx.fillStyle = waterGradRight;
	ctx.fillRect(bx + bw, by, waterPadding, bh);
	
	// Animierte Blasen
	ctx.save();
	ctx.globalAlpha = 0.5;
	const bubbleTime = performance.now() * 0.001;
	for (let i = 0; i < 8; i++) {
		const seed = i * 137.5;
		const side = i < 4 ? -1 : 1;
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
}

/**
 * Zeichnet das Gebäude (Hintergrundbild oder Fallback)
 */
function renderBuilding(ctx, city, cityBgSprite) {
	const bx = city.buildingX;
	const by = city.buildingY;
	const bw = city.buildingWidth;
	const bh = city.buildingHeight;
	
	if (spriteReady(cityBgSprite)) {
		const imgAspect = cityBgSprite.naturalWidth / cityBgSprite.naturalHeight;
		const buildingAspect = bw / bh;
		
		let drawW, drawH, drawX, drawY;
		
		if (imgAspect > buildingAspect) {
			drawH = bh;
			drawW = bh * imgAspect;
			drawX = bx - (drawW - bw) / 2;
			drawY = by;
		} else {
			drawW = bw;
			drawH = bw / imgAspect;
			drawX = bx;
			drawY = by - (drawH - bh) / 2;
		}
		
		ctx.drawImage(cityBgSprite, drawX, drawY, drawW, drawH);
	} else {
		// Fallback
		ctx.fillStyle = "rgba(15, 45, 75, 0.85)";
		ctx.fillRect(bx, by, bw, bh);
		ctx.strokeStyle = "rgba(100, 180, 220, 0.6)";
		ctx.lineWidth = 3;
		ctx.strokeRect(bx, by, bw, bh);
	}
}

/**
 * Zeichnet alle NPCs
 */
function renderNPCs(ctx, city, sprites) {
	const NPC_SPRITE_SCALE = 0.22;
	const NPC_MISSION_SCALE = 0.22;
	
	for (const npc of city.npcs) {
		const nx = npc.x;
		const ny = npc.y;
		
		let npcSprite = null;
		let spriteScale = NPC_SPRITE_SCALE;
		if (npc.id === "merchant") {
			npcSprite = sprites.npcHaendler;
		} else if (npc.id === "quest") {
			npcSprite = sprites.npcMission;
			spriteScale = NPC_MISSION_SCALE;
		} else if (npc.id === "upgrade") {
			npcSprite = sprites.npcUpgrade; // Platzhalter - später echtes Bild
			spriteScale = NPC_SPRITE_SCALE;
		}
		
		let labelOffset = 40;
		
		if (npcSprite && spriteReady(npcSprite)) {
			const drawW = npcSprite.naturalWidth * spriteScale;
			const drawH = npcSprite.naturalHeight * spriteScale;
			
			ctx.save();
			ctx.translate(nx, ny);
			ctx.drawImage(npcSprite, -drawW / 2, -drawH, drawW, drawH);
			ctx.restore();
			
			labelOffset = drawH + 15;
		} else {
			// Fallback-Kreis mit NPC-spezifischer Farbe
			let fallbackColor = "rgba(100, 200, 255, 0.9)"; // Standard: blau
			if (npc.id === "merchant") {
				fallbackColor = "rgba(255, 200, 100, 0.9)"; // Gold für Händler
			} else if (npc.id === "upgrade") {
				fallbackColor = "rgba(200, 100, 255, 0.9)"; // Lila für Upgrades
			}
			ctx.fillStyle = fallbackColor;
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
}

/**
 * Zeichnet den Spieler
 */
function renderPlayer(ctx, player, playerSprite) {
	const playerOffsetX = -3.5;
	const playerOffsetY = 50.0;
	
	// ============================================================
	// ANIMATION TEST - Nutzt globale window.ANIM_TEST
	// ============================================================
	const animTest = window.ANIM_TEST;
	
	if (animTest?.enabled) {
		// Lade Animation falls noch nicht geladen
		if (!animTest.player) {
			loadTestAnimation();
			return;
		}
		
		// Update Animation
		const now = performance.now();
		const dt = now - lastAnimTime;
		lastAnimTime = now;
		animTest.player.update(dt);
		
		// Animation zeichnen - gleiche Größe wie Original-Spieler
		// Bild ist 922x1383, wir wollen ~166x249 (wie Original mit scale 0.18)
		const imgW = animTest.player.data.image.width;
		const imgH = animTest.player.data.image.height;
		const scale = 0.18; // Gleich wie normales Spielersprite
		const drawW = imgW * scale;
		const drawH = imgH * scale;
		
		ctx.save();
		ctx.translate(player.x + playerOffsetX, player.y + playerOffsetY);
		if (player.dir < 0) {
			ctx.scale(-1, 1);
		}
		const bob = Math.sin(performance.now() * 0.003) * 2;
		// Render mit offset nach oben (wie beim normalen Spieler)
		// Scale für render = 0.18 * (imgW / canvasW) damit die Bildgröße stimmt
		const renderScale = scale * (imgW / animTest.player.data.canvasWidth);
		animTest.player.render(
			ctx,
			-drawW / 2,
			-drawH + bob,
			renderScale,
			false
		);
		ctx.restore();
		return;
	}
	// ============================================================
	
	if (spriteReady(playerSprite)) {
		const scale = 0.18;
		const drawW = playerSprite.naturalWidth * scale;
		const drawH = playerSprite.naturalHeight * scale;
		
		ctx.save();
		ctx.translate(player.x + playerOffsetX, player.y + playerOffsetY);
		if (player.dir < 0) {
			ctx.scale(-1, 1);
		}
		const bob = Math.sin(performance.now() * 0.003) * 2;
		ctx.drawImage(playerSprite, -drawW / 2, -drawH + bob, drawW, drawH);
		ctx.restore();
	} else {
		// Fallback
		ctx.fillStyle = "rgba(100, 200, 255, 0.95)";
		ctx.beginPath();
		ctx.arc(player.x + playerOffsetX, player.y + playerOffsetY - 15, player.r, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.5)";
		ctx.lineWidth = 2;
		ctx.stroke();
	}
}

/**
 * Zeichnet die UI-Elemente (Stockwerk-Anzeige, Steuerungshinweise)
 */
function renderUI(ctx, width, height, player) {
	// Stockwerk-Anzeige
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
}

/**
 * Zeichnet den Grid-Editor (Debug-Modus)
 */
function renderGridEditor(ctx, city, player) {
	if (!window.CITY_GRID_EDIT_MODE) return;
	
	ctx.save();
	ctx.translate(-city.camera.x, -city.camera.y);
	
	const grid = window.CITY_WALKABLE_GRID || {};
	const cellSize = CITY_GRID_CELL_SIZE;
	
	// Grid zeichnen
	for (let row = 0; row < CITY_GRID_ROWS; row++) {
		for (let col = 0; col < CITY_GRID_COLS; col++) {
			const x = city.buildingX + col * cellSize;
			const y = city.buildingY + row * cellSize;
			const key = `${col},${row}`;
			const isWalkable = grid[key] === true;
			
			if (isWalkable) {
				ctx.fillStyle = "rgba(0, 255, 100, 0.4)";
				ctx.fillRect(x, y, cellSize, cellSize);
			}
			
			ctx.strokeStyle = isWalkable ? "rgba(0, 255, 100, 0.8)" : "rgba(255, 255, 255, 0.2)";
			ctx.lineWidth = isWalkable ? 2 : 1;
			ctx.strokeRect(x, y, cellSize, cellSize);
		}
	}
	
	// Spieler-Position markieren
	const playerCol = Math.floor((player.x - city.buildingX) / cellSize);
	const playerRow = Math.floor(((player.y - PLAYER_VISUAL_OFFSET) - city.buildingY) / cellSize);
	
	ctx.strokeStyle = "#0f0";
	ctx.lineWidth = 3;
	ctx.strokeRect(
		city.buildingX + playerCol * cellSize,
		city.buildingY + playerRow * cellSize,
		cellSize, cellSize
	);
	
	// Spieler-Zentrum
	ctx.fillStyle = "#ff0";
	ctx.beginPath();
	if (window.CITY_PLAYER_DRAG_MODE && window.DRAG_REFERENCE_POINT) {
		ctx.arc(window.DRAG_REFERENCE_POINT.x, window.DRAG_REFERENCE_POINT.y, 8, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#f00";
		ctx.beginPath();
		ctx.arc(player.x, player.y - PLAYER_VISUAL_OFFSET, 5, 0, Math.PI * 2);
		ctx.fill();
	} else {
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
	
	// Debug: Spieler-Position
	const gridKey = `${playerCol},${playerRow}`;
	const isInGrid = window.CITY_WALKABLE_GRID && window.CITY_WALKABLE_GRID[gridKey];
	ctx.fillStyle = isInGrid ? "#0f0" : "#f00";
	ctx.fillText(`Spieler: Col=${playerCol}, Row=${playerRow} | Im Grid: ${isInGrid ? "JA" : "NEIN"}`, 215, 124);
}

/**
 * Zeichnet die Debug-Anzeige für Grid-Position
 */
function renderGridDebug(ctx, city, player) {
	const cellSize = CITY_GRID_CELL_SIZE;
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

/**
 * Exportiert Debug-Variablen für den Grid-Editor
 */
function exportDebugVariables(city, player) {
	if (!window.CITY_GRID_EDIT_MODE) {
		window.CITY_CAMERA_X_DEBUG = city.camera.x;
		window.CITY_CAMERA_Y_DEBUG = city.camera.y;
	}
	window.CITY_BUILDING_X_DEBUG = city.buildingX;
	window.CITY_BUILDING_Y_DEBUG = city.buildingY;
	window.CITY_GRID_CELL_SIZE = CITY_GRID_CELL_SIZE;
	window.CITY_GRID_COLS = CITY_GRID_COLS;
	window.CITY_GRID_ROWS = CITY_GRID_ROWS;
	window.CITY_PLAYER_DEBUG = player;
}

/**
 * Zeichnet die Boden-Debug-Linien für Stockwerke
 */
function renderFloorDebugLines(ctx, city, floors) {
	if (!window.SHOW_FLOOR_DEBUG_LINES) return;
	
	const player = city.player;
	
	ctx.save();
	ctx.translate(-city.camera.x, -city.camera.y);
	
	const FLOOR_OFFSET = city.floorThickness + 0;
	const userOffset = window.FLOOR_LINE_OFFSET || 0;
	const individualOffsets = window.FLOOR_LINE_INDIVIDUAL_OFFSETS || {};
	const innerLeft = city.buildingX + city.wallThickness;
	const innerRight = city.buildingX + city.buildingWidth - city.wallThickness;
	
	window.CITY_FLOORS_DEBUG = [];
	
	for (let i = 0; i < floors.length; i++) {
		const floor = floors[i];
		const indivOffset = individualOffsets[i] || 0;
		const groundY = floor.y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET + userOffset + indivOffset;
		
		window.CITY_FLOORS_DEBUG.push({ index: i, groundY: groundY });
		
		ctx.strokeStyle = indivOffset !== 0 ? "#00ff00" : "#ffff00";
		ctx.lineWidth = indivOffset !== 0 ? 6 : 4;
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(innerLeft, groundY);
		ctx.lineTo(innerRight, groundY);
		ctx.stroke();
		
		ctx.fillStyle = "rgba(255, 255, 0, 0.1)";
		ctx.fillRect(innerLeft, groundY - 15, innerRight - innerLeft, 30);
		
		const offsetText = indivOffset !== 0 ? ` (${indivOffset > 0 ? '+' : ''}${Math.round(indivOffset)})` : '';
		const labelText = `Stock ${i}${offsetText}`;
		ctx.font = "bold 16px monospace";
		const textWidth = ctx.measureText(labelText).width;
		ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
		ctx.fillRect(innerLeft + 100, groundY - 25, textWidth + 14, 24);
		ctx.fillStyle = indivOffset !== 0 ? "#00ff00" : "#ffff00";
		ctx.textAlign = "left";
		ctx.fillText(labelText, innerLeft + 107, groundY - 8);
		
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.font = "14px sans-serif";
		ctx.fillText("⬍", innerLeft + 75, groundY + 5);
	}
	
	ctx.restore();
	
	// Hinweis-Box
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
	
	// Offset-Wert
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

/**
 * Haupt-Render-Funktion für die Stadt
 * @param {Object} renderCtx - Context-Objekt mit allen benötigten Referenzen
 */
export function renderCity(renderCtx) {
	const { 
		ctx, 
		canvas, 
		city, 
		sprites,
		syncVisibility,
		citySpriteDebugPanel
	} = renderCtx;
	
	if (!city) return;
	
	// CSS-Klasse entfernen wenn vorhanden
	if (canvas && canvas.classList.contains("city-perspective")) {
		canvas.classList.remove("city-perspective");
	}
	
	// UI-Sichtbarkeit synchronisieren
	syncVisibility();
	
	// Debug-Panel ausblenden
	if (citySpriteDebugPanel) {
		citySpriteDebugPanel.style.display = "none";
	}
	
	const width = canvas.width;
	const height = canvas.height;
	const player = city.player;
	const floors = city.floors;
	
	// === Hintergrund ===
	renderBackground(ctx, width, height);
	renderLightBeams(ctx, width, height);
	
	// === Kamera-Transformation ===
	ctx.save();
	ctx.translate(-city.camera.x, -city.camera.y);
	
	// === Welt-Elemente ===
	renderWater(ctx, city);
	renderBuilding(ctx, city, sprites.cityBackground);
	renderNPCs(ctx, city, sprites);
	renderPlayer(ctx, player, sprites.player);
	
	// === Kamera-Transformation beenden ===
	ctx.restore();
	
	// === UI-Elemente (ohne Kamera) ===
	renderUI(ctx, width, height, player);
	
	// === Debug-Modi ===
	renderGridEditor(ctx, city, player);
	renderGridDebug(ctx, city, player);
	exportDebugVariables(city, player);
	renderFloorDebugLines(ctx, city, floors);
}
