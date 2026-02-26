// ============================================================
// BUILDING DEBUG - Debug-Tools, Portal-Editor, Error-Tracking
// ============================================================
// Portal-Drag-Editor, Grid-Zellen-Verwaltung, Position-Export,
// Error-Recording und Maus-Handler für Debug-Modi

import S from '../core/sharedState.js';
import {
	BUILDING_GRID_CELL_SIZE,
	BUILDING_GRID_COLS,
	BUILDING_GRID_ROWS,
	BUILDING_GRID_OFFSET_X
} from './buildingScene.js';

// ===== FEST EINGEBAUTE PORTAL-POSITIONEN =====
// Diese wurden vom Benutzer mit dem Portal-Editor erstellt (2026-02-13)
const DEFAULT_BUILDING_POSITIONS = {
	"market": {
		"npc": { "x": 0.74, "y": 0.83 },
		"exit": { "x": 0.24, "y": 0.24 }
	},
	"workshop": {
		"npc": { "x": 0.79, "y": 0.71 },
		"exit": { "x": 0.21, "y": 0.41 }
	},
	"academy": {
		"npc": { "x": 0.75, "y": 0.70 },
		"exit": { "x": 0.78, "y": 0.90 }
	},
	"harbor": {
		"npc": { "x": 0.16, "y": 0.40 },
		"exit": { "x": 0.61, "y": 0.32 }
	},
	"garden": {
		"npc": { "x": 0.29, "y": 0.48 },
		"exit": { "x": 0.72, "y": 0.95 }
	}
};

const POSITIONS_STORAGE_KEY = 'BUILDING_PORTAL_POSITIONS';

/**
 * Erstellt das Building-Debug-System
 * @param {Object} bState - Shared mutable state
 * @param {Object} ctx - Externe Abhängigkeiten (getCanvas)
 * @param {Object} helpers - Interne Helfer (getNPCPosition, getExitPosition, getWalkableGrid)
 */
export function createBuildingDebugTools(bState, ctx, helpers) {
	const { getCanvas } = ctx;
	const { getNPCPosition, getExitPosition, getWalkableGrid } = helpers;

	// ===== POSITION PERSISTENCE =====
	
	/**
	 * Lädt gespeicherte Positionen aus localStorage
	 */
	function loadSavedPositions() {
		try {
			const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
			if (saved) {
				bState.savedBuildingPositions = JSON.parse(saved);
				console.log('[Building] Portal-Positionen geladen:', Object.keys(bState.savedBuildingPositions).length, 'Gebäude');
			}
		} catch (e) {
			console.warn('[Building] Fehler beim Laden der Positionen:', e);
		}
	}
	
	/**
	 * Speichert aktuelle Position für das aktuelle Gebäude
	 */
	function saveCurrentBuildingPosition() {
		if (!bState.currentBuildingId) return;
		bState.savedBuildingPositions[bState.currentBuildingId] = {
			npc: { x: bState.debugNpcOffset.x, y: bState.debugNpcOffset.y },
			exit: { x: bState.debugExitOffset.x, y: bState.debugExitOffset.y }
		};
		try {
			localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(bState.savedBuildingPositions));
			console.log(`[Building] Position gespeichert für: ${bState.currentBuildingId}`);
		} catch (e) {
			console.warn('[Building] Fehler beim Speichern:', e);
		}
	}
	
	/**
	 * Lädt Position für ein bestimmtes Gebäude
	 */
	function loadBuildingPosition(buildingId) {
		// 1. Prüfe localStorage (vom Benutzer angepasst)
		if (bState.savedBuildingPositions[buildingId]) {
			const pos = bState.savedBuildingPositions[buildingId];
			bState.debugNpcOffset = { ...pos.npc };
			bState.debugExitOffset = { ...pos.exit };
			console.log(`[Building] Position geladen für: ${buildingId} (localStorage)`);
			return;
		}
		// 2. Prüfe fest eingebaute Positionen
		if (DEFAULT_BUILDING_POSITIONS[buildingId]) {
			const pos = DEFAULT_BUILDING_POSITIONS[buildingId];
			bState.debugNpcOffset = { ...pos.npc };
			bState.debugExitOffset = { ...pos.exit };
			console.log(`[Building] Position geladen für: ${buildingId} (Default)`);
			return;
		}
		// 3. Fallback Standard-Positionen
		bState.debugNpcOffset = { x: 0.71, y: 0.74 };
		bState.debugExitOffset = { x: 0.72, y: 0.95 };
		console.log(`[Building] Keine Position für: ${buildingId}, nutze Fallback`);
	}
	
	// ===== ERROR TRACKING =====
	
	/**
	 * Fehler aufzeichnen
	 */
	function recordError(error, context) {
		const errorInfo = {
			message: error.message || String(error),
			stack: error.stack || '',
			context,
			timestamp: new Date().toISOString(),
			buildingId: bState.currentBuildingId,
			playerPos: { ...bState.playerPos }
		};
		bState.lastError = errorInfo;
		bState.errorStack.push(errorInfo);
		if (bState.errorStack.length > 10) bState.errorStack.shift();
		console.error(`[Building Error] ${context}:`, error);
		
		S.BUILDING_LAST_ERROR = errorInfo;
		S.BUILDING_ERROR_STACK = bState.errorStack;
	}
	
	/**
	 * Fehler löschen
	 */
	function clearErrors() {
		bState.lastError = null;
		bState.errorStack = [];
		S.BUILDING_LAST_ERROR = null;
		S.BUILDING_ERROR_STACK = [];
	}
	
	/**
	 * Fehler in Zwischenablage kopieren
	 */
	async function copyErrorToClipboard() {
		if (!bState.lastError) return false;
		
		const errorText = `=== BUILDING ERROR ===
Message: ${bState.lastError.message}
Context: ${bState.lastError.context}
Building: ${bState.lastError.buildingId || 'none'}
Time: ${bState.lastError.timestamp}
Player Position: x=${bState.lastError.playerPos?.x}, y=${bState.lastError.playerPos?.y}

Stack Trace:
${bState.lastError.stack || 'N/A'}
======================`;
		
		try {
			await navigator.clipboard.writeText(errorText);
			console.log('[Building] Fehler in Zwischenablage kopiert!');
			bState.copiedFeedback = 120;
			return true;
		} catch (err) {
			console.error('[Building] Konnte nicht kopieren:', err);
			window.prompt('Fehler (Strg+C zum Kopieren):', errorText);
			return false;
		}
	}
	
	// ===== GRID CELL OPERATIONS =====
	
	/**
	 * Markiert eine Grid-Zelle als begehbar
	 */
	function markGridCell(col, row) {
		if (col < 0 || col >= BUILDING_GRID_COLS || row < 0 || row >= BUILDING_GRID_ROWS) {
			return false;
		}
		
		const grid = getWalkableGrid();
		const key = `${col},${row}`;
		if (!grid[key]) {
			grid[key] = true;
			console.log(`%c[Grid] ✓ ${key}`, 'color: lime;');
			return true;
		}
		return false;
	}
	
	/**
	 * Entfernt eine Grid-Zelle
	 */
	function removeGridCell(col, row) {
		const grid = getWalkableGrid();
		const key = `${col},${row}`;
		if (grid[key]) {
			delete grid[key];
			console.log(`%c[Grid] ✗ ${key}`, 'color: orange;');
			return true;
		}
		return false;
	}
	
	/**
	 * Konvertiert Mausposition zu Grid-Zelle (mit Offset)
	 */
	function mouseToGridCell(mouseX, mouseY) {
		const col = Math.floor((mouseX - BUILDING_GRID_OFFSET_X) / BUILDING_GRID_CELL_SIZE);
		const row = Math.floor(mouseY / BUILDING_GRID_CELL_SIZE);
		return { col, row };
	}
	
	/**
	 * Speichert das Walkable-Grid in die Zwischenablage
	 */
	function saveWalkableGrid() {
		const grid = getWalkableGrid();
		const keys = Object.keys(grid).sort((a, b) => {
			const [ax, ay] = a.split(',').map(Number);
			const [bx, by] = b.split(',').map(Number);
			return ay - by || ax - bx;
		});
		
		const varName = `BUILDING_WALKABLE_GRID_${bState.currentBuildingId}`;
		let result = `// Begehbare Grid-Zellen für ${bState.currentBuilding?.name || bState.currentBuildingId} (${keys.length} Zellen)\n`;
		result += `// S.buildingWalkableGrids.${bState.currentBuildingId}\n`;
		result += `{\n`;
		for (const k of keys) {
			result += `  "${k}": true,\n`;
		}
		result += '};\n';
		
		console.log('%c[Grid] GESPEICHERT:', 'color: lime; font-weight: bold; font-size: 16px;');
		console.log(result);
		
		if (navigator.clipboard) {
			navigator.clipboard.writeText(result).then(() => {
				alert(`Grid für "${bState.currentBuilding?.name}" gespeichert!\n${keys.length} begehbare Zellen.\n\nCode in Zwischenablage kopiert.\nFüge den Code in index.html ein um ihn zu speichern.`);
			}).catch(() => {
				alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
			});
		} else {
			alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
		}
	}
	
	// ===== CLIPBOARD EXPORT =====
	
	/**
	 * Kopiert NPC/Exit Positionen für aktuelles Gebäude + speichert sie
	 */
	function copyPositionsToClipboard() {
		saveCurrentBuildingPosition();
		
		const positionCode = `// Position für Gebäude: ${bState.currentBuilding?.name || bState.currentBuildingId || 'unbekannt'}
"${bState.currentBuildingId}": {
  "npc": { "x": ${bState.debugNpcOffset.x.toFixed(2)}, "y": ${bState.debugNpcOffset.y.toFixed(2)} },
  "exit": { "x": ${bState.debugExitOffset.x.toFixed(2)}, "y": ${bState.debugExitOffset.y.toFixed(2)} }
}`;
		
		navigator.clipboard.writeText(positionCode).then(() => {
			console.log('[Building] Position kopiert & gespeichert!');
			alert(`✅ Position gespeichert & kopiert!\n\n${  positionCode}`);
		}).catch(err => {
			console.error('[Building] Kopieren fehlgeschlagen:', err);
		});
	}
	
	/**
	 * Exportiert ALLE gespeicherten Portal-Positionen als JSON
	 */
	function exportAllPositionsToClipboard() {
		if (bState.currentBuildingId) {
			saveCurrentBuildingPosition();
		}
		
		const exportData = {
			_info: "Portal-Positionen für alle Gebäude - Schick diese Daten an den Entwickler!",
			_generiert: new Date().toISOString(),
			positionen: bState.savedBuildingPositions
		};
		
		const jsonString = JSON.stringify(exportData, null, 2);
		
		navigator.clipboard.writeText(jsonString).then(() => {
			console.log('[Building] Alle Positionen exportiert!');
			alert(`📋 ALLE Portal-Positionen exportiert!\n\nAnzahl Gebäude: ${  Object.keys(bState.savedBuildingPositions).length  }\n\nDie JSON-Daten wurden in die Zwischenablage kopiert.\nSchicke sie an den Entwickler!`);
		}).catch(err => {
			console.error('[Building] Export fehlgeschlagen:', err);
			alert(`⚠️ Zwischenablage nicht verfügbar!\n\nKopiere diese Daten manuell:\n\n${  jsonString}`);
		});
	}
	
	// ===== MOUSE HANDLERS =====
	
	/**
	 * Maus-Handler für Debug-Drag-Modus und Grid-Editor
	 */
	function handleMouseDown(x, y, button = 0) {
		console.log(`[BuildingScene] handleMouseDown: x=${x.toFixed(0)}, y=${y.toFixed(0)}, button=${button}, gridEditMode=${bState.gridEditMode}`);
		
		// Grid-Editor hat Priorität
		if (bState.gridEditMode) {
			const { col, row } = mouseToGridCell(x, y);
			bState.lastPaintedCell = `${col},${row}`;
			console.log(`[Grid] Click at col=${col}, row=${row}`);
			
			if (button === 0) {
				bState.isGridPainting = true;
				console.log(`[Grid] Painting started! isGridPainting=${bState.isGridPainting}`);
				markGridCell(col, row);
				return true;
			} else if (button === 2) {
				bState.isGridErasing = true;
				console.log(`[Grid] Erasing started! isGridErasing=${bState.isGridErasing}`);
				removeGridCell(col, row);
				return true;
			}
			return false;
		}
		
		// Debug-Drag-Modus
		if (!bState.debugDragMode || !bState.buildingLayout) return false;
		
		const npcPos = getNPCPosition();
		const exitPos = getExitPosition();
		
		console.log(`[Debug] MouseDown at x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
		if (npcPos) console.log(`[Debug] NPC at x=${npcPos.x.toFixed(0)}, y=${npcPos.y.toFixed(0)}`);
		if (exitPos) console.log(`[Debug] Exit at x=${exitPos.x.toFixed(0)}, y=${exitPos.y.toFixed(0)}`);
		
		// Prüfe ob Klick auf NPC
		if (npcPos) {
			const npcCenterY = npcPos.y - 60;
			const distNpc = Math.sqrt((x - npcPos.x) ** 2 + (y - npcCenterY) ** 2);
			console.log(`[Debug] NPC dist: ${distNpc.toFixed(0)}`);
			if (distNpc < 200) {
				bState.dragTarget = 'npc';
				console.log('[Building] Ziehe NPC...');
				return true;
			}
		}
		
		// Prüfe ob Klick auf Exit
		if (exitPos) {
			const exitCenterY = exitPos.y - 40;
			const distExit = Math.sqrt((x - exitPos.x) ** 2 + (y - exitCenterY) ** 2);
			console.log(`[Debug] Exit dist: ${distExit.toFixed(0)}`);
			if (distExit < 150) {
				bState.dragTarget = 'exit';
				console.log('[Building] Ziehe Teleporter...');
				return true;
			}
		}
		
		return false;
	}
	
	function handleMouseMove(x, y) {
		// Grid-Editor Malen
		if (bState.gridEditMode && (bState.isGridPainting || bState.isGridErasing)) {
			if (bState.isGridPainting || bState.isGridErasing) {
				console.log(`[Grid] handleMouseMove: x=${x.toFixed(0)}, y=${y.toFixed(0)}, painting=${bState.isGridPainting}, erasing=${bState.isGridErasing}`);
			}
			
			const { col, row } = mouseToGridCell(x, y);
			const cellKey = `${col},${row}`;
			
			if (cellKey !== bState.lastPaintedCell) {
				bState.lastPaintedCell = cellKey;
				console.log(`[Grid] Move: col=${col}, row=${row}, painting=${bState.isGridPainting}, erasing=${bState.isGridErasing}`);
				
				if (bState.isGridPainting) {
					markGridCell(col, row);
				} else if (bState.isGridErasing) {
					removeGridCell(col, row);
				}
			}
			return true;
		}
		
		// Debug-Drag-Modus
		if (!bState.debugDragMode || !bState.dragTarget || !bState.buildingLayout) return false;
		
		const canvas = getCanvas();
		if (!canvas) return false;
		
		const relX = Math.max(0.1, Math.min(0.9, (x - bState.buildingLayout.buildingLeft) / bState.buildingLayout.buildingWidth));
		const relY = Math.max(0.2, Math.min(0.95, y / canvas.height));
		
		console.log(`[Debug] Mouse: x=${x.toFixed(0)}, y=${y.toFixed(0)} -> relX=${relX.toFixed(2)}, relY=${relY.toFixed(2)}`);
		
		if (bState.dragTarget === 'npc') {
			bState.debugNpcOffset.x = relX;
			bState.debugNpcOffset.y = relY;
		} else if (bState.dragTarget === 'exit') {
			bState.debugExitOffset.x = relX;
			bState.debugExitOffset.y = relY;
		}
		
		return true;
	}
	
	function handleMouseUp(button = 0) {
		if (button === 0) {
			bState.isGridPainting = false;
		}
		if (button === 2) {
			bState.isGridErasing = false;
		}
		bState.lastPaintedCell = null;
		
		if (bState.dragTarget) {
			console.log(`[Building] ${bState.dragTarget === 'npc' ? 'NPC' : 'Teleporter'} platziert.`);
			bState.dragTarget = null;
			return true;
		}
		return false;
	}
	
	// Initialisiere gespeicherte Positionen beim Start
	loadSavedPositions();
	
	return {
		// Position persistence
		loadSavedPositions,
		saveCurrentBuildingPosition,
		loadBuildingPosition,
		// Error tracking
		recordError,
		clearErrors,
		copyErrorToClipboard,
		// Grid operations
		markGridCell,
		removeGridCell,
		mouseToGridCell,
		saveWalkableGrid,
		// Clipboard export
		copyPositionsToClipboard,
		exportAllPositionsToClipboard,
		// Mouse handlers
		handleMouseDown,
		handleMouseMove,
		handleMouseUp
	};
}
