// ============================================================
// DUNGEON EDITOR — Lock & Reroll Editor für Dungeon-Floors
// ============================================================
// Dev-Tool: Zeigt das 6×3 Grid, erlaubt Lock/Unlock einzelner Chunks,
// Reroll der unlocked Chunks, und Export als JSON.
// Erreichbar via Ctrl+Shift+E im Dungeon-Modus.
"use strict";

import { generateDungeonFloor, getBiomePalette, GRID_COLS, GRID_ROWS } from './dungeonGenerator.js';

/**
 * Erstellt den Dungeon-Editor
 * @param {Object} ctx - { canvas, ctx, getDungeonState }
 */
export function createDungeonEditor(ctx) {
	const { canvas, ctx: c, getDungeonState } = ctx;

	let active = false;
	const lockedCells = new Set();   // "x,y" → locked
	let cursorX = 0, cursorY = 0;
	let rerollSeed = 1;
	let statusMessage = '';
	let statusTimer = 0;

	function toggle() {
		const ds = getDungeonState();
		if (!ds || !ds.currentFloor) return;
		active = !active;
		if (active) {
			cursorX = ds.currentRoomX;
			cursorY = ds.currentRoomY;
			// Alle existierenden Chunks initial locken
			lockedCells.clear();
		}
	}

	function isActive() { return active; }

	function handleKey(key) {
		if (!active) return false;
		const ds = getDungeonState();
		if (!ds || !ds.currentFloor) return false;

		switch (key) {
			case 'ArrowLeft': cursorX = Math.max(0, cursorX - 1); return true;
			case 'ArrowRight': cursorX = Math.min(GRID_COLS - 1, cursorX + 1); return true;
			case 'ArrowUp': cursorY = Math.max(0, cursorY - 1); return true;
			case 'ArrowDown': cursorY = Math.min(GRID_ROWS - 1, cursorY + 1); return true;

			case 'l': case 'L':
				// Lock/Unlock Toggle
				{
					const key = `${cursorX},${cursorY}`;
					if (lockedCells.has(key)) lockedCells.delete(key);
					else lockedCells.add(key);
					showStatus(lockedCells.has(key) ? '🔒 Gesperrt' : '🔓 Entsperrt');
				}
				return true;

			case 'r': case 'R':
				// Reroll unlocked chunks
				rerollUnlocked(ds);
				return true;

			case 'e': case 'E':
				// Export
				exportFloor(ds);
				return true;

			case 'Escape':
				active = false;
				return true;

			default: return false;
		}
	}

	function rerollUnlocked(ds) {
		rerollSeed++;
		const floor = ds.currentFloor;
		const newFloor = generateDungeonFloor(floor.floor, ds.seed * 1000 + rerollSeed);

		let rerolled = 0;
		for (let y = 0; y < GRID_ROWS; y++) {
			for (let x = 0; x < GRID_COLS; x++) {
				const key = `${x},${y}`;
				if (lockedCells.has(key)) continue; // locked → keep
				if (newFloor.grid[y][x] && floor.grid[y][x]) {
					// Kopieren: Grid, Doors, Spawns etc. übernehmen, aber visited/cleared beibehalten
					const oldState = { visited: floor.grid[y][x].visited, cleared: floor.grid[y][x].cleared };
					floor.grid[y][x] = newFloor.grid[y][x];
					floor.grid[y][x].visited = oldState.visited;
					floor.grid[y][x].cleared = oldState.cleared;
					floor.grid[y][x].gridX = x;
					floor.grid[y][x].gridY = y;
					rerolled++;
				}
			}
		}
		showStatus(`♻️ ${rerolled} Chunks rerolled (Seed-Variante ${rerollSeed})`);
	}

	function exportFloor(ds) {
		const floor = ds.currentFloor;
		const exportData = {
			floor: floor.floor,
			seed: ds.seed,
			biome: floor.biome,
			locked: Array.from(lockedCells),
			grid: []
		};

		for (let y = 0; y < GRID_ROWS; y++) {
			for (let x = 0; x < GRID_COLS; x++) {
				const chunk = floor.grid[y][x];
				if (chunk) {
					exportData.grid.push({
						x, y,
						type: chunk.type,
						doors: chunk.doors,
						locked: lockedCells.has(`${x},${y}`)
					});
				}
			}
		}

		const json = JSON.stringify(exportData, null, 2);
		console.log('[DungeonEditor] Export:', json);

		// In Clipboard kopieren
		try {
			navigator.clipboard.writeText(json);
			showStatus('📋 Floor-JSON in Zwischenablage kopiert!');
		} catch (e) {
			showStatus('📋 Export in Konsole (F12)');
		}
	}

	function showStatus(msg) {
		statusMessage = msg;
		statusTimer = 2000;
	}

	function render() {
		if (!active) return;
		const ds = getDungeonState();
		if (!ds || !ds.currentFloor) return;

		const floor = ds.currentFloor;
		const palette = getBiomePalette(floor.biome);
		const w = canvas.width, h = canvas.height;

		// Overlay-Hintergrund
		c.fillStyle = "rgba(0, 5, 15, 0.88)";
		c.fillRect(0, 0, w, h);

		// Titel
		c.fillStyle = "#ffffff";
		c.font = "bold 18px 'Segoe UI', monospace";
		c.textAlign = "center";
		c.fillText(`🔧 Dungeon Editor — Etage ${floor.floor} (${floor.biome})`, w / 2, 30);

		// Grid zeichnen
		const cellW = Math.min(100, (w - 80) / GRID_COLS);
		const cellH = Math.min(60, (h - 160) / GRID_ROWS);
		const gridW = GRID_COLS * cellW;
		const gridH = GRID_ROWS * cellH;
		const startX = (w - gridW) / 2;
		const startY = 55;

		for (let y = 0; y < GRID_ROWS; y++) {
			for (let x = 0; x < GRID_COLS; x++) {
				const chunk = floor.grid[y][x];
				const px = startX + x * cellW;
				const py = startY + y * cellH;
				const key = `${x},${y}`;
				const isLocked = lockedCells.has(key);
				const isCursor = x === cursorX && y === cursorY;
				const isCurrentRoom = x === ds.currentRoomX && y === ds.currentRoomY;

				// Zelle
				if (chunk) {
					const typeColors = {
						start: "#22aa44", exit: "#cc8800", boss: "#cc2222",
						combat: "#4466cc", treasure: "#ddaa22", checkpoint: "#44ddaa",
						secret: "#aa44dd", empty: "#334466"
					};
					c.fillStyle = typeColors[chunk.type] || "#334455";
					if (isLocked) c.globalAlpha = 0.9;
					c.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);
					c.globalAlpha = 1;

					// Chunk-Type Label
					c.fillStyle = "#fff";
					c.font = "bold 10px monospace";
					c.textAlign = "center";
					c.fillText(chunk.type.slice(0, 6).toUpperCase(), px + cellW / 2, py + cellH / 2 + 4);

					// Visited/Cleared Indicator
					if (chunk.cleared) {
						c.fillStyle = "#4ade80";
						c.fillText("✓", px + cellW - 12, py + 14);
					} else if (chunk.visited) {
						c.fillStyle = "#aab";
						c.fillText("•", px + cellW - 12, py + 14);
					}

					// Lock-Icon
					if (isLocked) {
						c.fillStyle = "#ffd700";
						c.font = "14px sans-serif";
						c.fillText("🔒", px + 14, py + 16);
					}
				} else {
					// Leere Zelle
					c.fillStyle = "rgba(30, 40, 50, 0.5)";
					c.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);
				}

				// Cursor
				if (isCursor) {
					c.strokeStyle = "#ffcc00";
					c.lineWidth = 3;
					c.strokeRect(px, py, cellW, cellH);
				}
				// Aktiver Raum
				if (isCurrentRoom) {
					c.strokeStyle = "#4ade80";
					c.lineWidth = 2;
					c.strokeRect(px + 4, py + 4, cellW - 8, cellH - 8);
				}
			}
		}

		// Grid-Rahmen
		c.strokeStyle = "#445566";
		c.lineWidth = 1;
		c.strokeRect(startX, startY, gridW, gridH);

		// Hilfetext
		const helpY = startY + gridH + 30;
		c.font = "13px 'Segoe UI', monospace";
		c.fillStyle = "#88aacc";
		c.textAlign = "center";
		c.fillText("Pfeiltasten = Navigieren  |  L = Lock/Unlock  |  R = Reroll  |  E = Export  |  ESC = Schließen", w / 2, helpY);

		// Lock-Statistik
		c.font = "12px 'Segoe UI'";
		c.fillStyle = "#667";
		const totalChunks = floor.chunks.length;
		c.fillText(`${lockedCells.size} von ${totalChunks} Chunks gesperrt  |  Reroll-Seed: ${rerollSeed}`, w / 2, helpY + 22);

		// Status-Nachricht
		if (statusTimer > 0) {
			statusTimer -= 16; // ~1 Frame
			c.font = "bold 14px 'Segoe UI'";
			c.fillStyle = "#ffcc00";
			c.globalAlpha = Math.min(1, statusTimer / 500);
			c.fillText(statusMessage, w / 2, helpY + 50);
			c.globalAlpha = 1;
		}

		c.textAlign = "left";
	}

	return { toggle, isActive, handleKey, render };
}
