// ============================================================
// BUILDING SCENE - Gebäude-Szenen mit NPCs und Stockwerken
// ============================================================
// Jedes Gebäude hat eine eigene Szene mit begehbaren Stockwerken
// Spieler kann sich bewegen und mit NPC interagieren
// Zurück zur Karte via Teleporter oder ESC
//
// Sub-Module:
//   buildingRender.js  - Alle Render-Funktionen
//   buildingDebug.js   - Debug-Tools, Portal-Editor, Error-Tracking

import { 
	createNPCPlaceholder,
	PLACEHOLDER_COLORS
} from '../core/placeholders.js';
import { loadSprite } from '../core/assets.js';
import S from '../core/sharedState.js';
import { createBuildingRenderer } from './buildingRender.js';
import { createBuildingDebugTools } from './buildingDebug.js';

/**
 * Building-Scene-Konstanten
 */
export const BUILDING_CONFIG = {
	playerSpeed: 0.3,
	interactRadius: 60,
	interactKey: 'e',
	interactCode: 'KeyE',
	exitKey: 'Escape',
	npcBobSpeed: 0.003,
	npcBobAmount: 3,
	// Stockwerk-Konfiguration
	floors: 3,
	floorHeight: 150,
	wallThickness: 40,
	doorWidth: 150,
	doorHeight: 100
};

// ========== GRID KOLLISIONS-SYSTEM FÜR GEBÄUDE ==========
export const BUILDING_GRID_CELL_SIZE = 30;
export const BUILDING_GRID_COLS = 32;
export const BUILDING_GRID_ROWS = 30;
export const BUILDING_GRID_OFFSET_X = 120;

/**
 * Erstellt das Building-Scene-System
 * @param {Object} ctx - Kontext mit Abhängigkeiten
 */
export function createBuildingSystem(ctx) {
	const {
		getState,
		setState,
		getCanvas,
		getBuildingsData,
		getPlayerSprite,
		onExitBuilding,
		onOpenMap,
		onNPCInteract
	} = ctx;
	
	// ===== SHARED MUTABLE STATE =====
	// Wird von allen Sub-Modulen per Referenz geteilt
	const bState = {
		currentBuildingId: null,
		currentBuilding: null,
		npcSprite: null,
		backgroundImage: null,
		backgroundLoaded: false,
		playerPos: { x: 150, y: 0 },
		playerDir: 1,
		playerSpriteOffsetX: 0,
		playerSpriteOffsetY: 75,
		isNearNPC: false,
		isNearExit: false,
		dialogOpen: false,
		dialogText: '',
		dialogMenu: [],
		dialogMenuIndex: 0,
		animTime: 0,
		// Error-Tracking
		lastError: null,
		errorStack: [],
		copiedFeedback: 0,
		// Debug Drag Mode
		debugDragMode: false,
		dragTarget: null,
		debugNpcOffset: { x: 0.71, y: 0.74 },
		debugExitOffset: { x: 0.72, y: 0.95 },
		savedBuildingPositions: {},
		// Grid Editor
		gridEditMode: false,
		isGridPainting: false,
		isGridErasing: false,
		lastPaintedCell: null,
		// Layout
		buildingLayout: null
	};
	
	// Exit-Teleporter Position
	const EXIT_FLOOR = 0;
	
	// ===== INTERNE HELFER =====
	// Diese werden an Sub-Module weitergegeben
	
	function getWalkableGrid() {
		if (!bState.currentBuildingId) return {};
		if (!S.buildingWalkableGrids[bState.currentBuildingId]) {
			S.buildingWalkableGrids[bState.currentBuildingId] = {};
		}
		return S.buildingWalkableGrids[bState.currentBuildingId];
	}
	
	function isPositionWalkable(x, y) {
		const grid = getWalkableGrid();
		const canvas = getCanvas();
		if (!canvas) return true;
		
		if (Object.keys(grid).length === 0) {
			return true;
		}
		
		const col = Math.floor((x - BUILDING_GRID_OFFSET_X) / BUILDING_GRID_CELL_SIZE);
		const row = Math.floor(y / BUILDING_GRID_CELL_SIZE);
		
		if (col < 0 || col >= BUILDING_GRID_COLS || row < 0 || row >= BUILDING_GRID_ROWS) {
			return false;
		}
		
		const key = `${col},${row}`;
		return grid[key] === true;
	}
	
	function getNPCPosition() {
		if (!bState.buildingLayout || !bState.currentBuilding?.npc) return null;
		
		const canvas = getCanvas();
		if (!canvas) return null;
		
		const x = bState.buildingLayout.buildingLeft + bState.buildingLayout.buildingWidth * bState.debugNpcOffset.x;
		const y = canvas.height * bState.debugNpcOffset.y;
		
		let floor = 0;
		for (let i = 0; i < bState.buildingLayout.floors.length; i++) {
			const f = bState.buildingLayout.floors[i];
			if (y <= f.y && y >= f.y - BUILDING_CONFIG.floorHeight) {
				floor = i;
				break;
			}
		}
		
		return { x, y, floor };
	}
	
	function getExitPosition() {
		if (!bState.buildingLayout) return null;
		const canvas = getCanvas();
		if (!canvas) return null;
		
		const x = bState.buildingLayout.buildingLeft + bState.buildingLayout.buildingWidth * bState.debugExitOffset.x;
		const y = canvas.height * bState.debugExitOffset.y;
		
		let floor = 0;
		for (let i = 0; i < bState.buildingLayout.floors.length; i++) {
			const f = bState.buildingLayout.floors[i];
			if (y <= f.y && y >= f.y - BUILDING_CONFIG.floorHeight) {
				floor = i;
				break;
			}
		}
		
		return { x, y, floor };
	}
	
	// ===== SUB-MODULE ERSTELLEN =====
	
	const helpers = {
		getNPCPosition,
		getExitPosition,
		getWalkableGrid
	};
	
	const renderer = createBuildingRenderer(bState, { getCanvas, getPlayerSprite }, helpers);
	const debug = createBuildingDebugTools(bState, { getCanvas }, helpers);
	
	// ===== GEBÄUDE-LAYOUT =====
	
	function generateBuildingLayout(canvas, buildingId) {
		const floors = BUILDING_CONFIG.floors;
		const floorHeight = BUILDING_CONFIG.floorHeight;
		const wallThickness = BUILDING_CONFIG.wallThickness;
		
		const startY = canvas.height - 20;
		
		const layout = {
			floors: [],
			walls: [],
			doors: [],
			color: PLACEHOLDER_COLORS[buildingId] || '#444444',
			startY,
			floorHeight,
			buildingLeft: 60,
			buildingRight: canvas.width - 60,
			buildingWidth: canvas.width - 120
		};
		
		for (let i = 0; i < floors; i++) {
			const floorY = startY - (i * floorHeight);
			layout.floors.push({
				index: i,
				y: floorY,
				walkableY: floorY + 40,
				left: layout.buildingLeft + wallThickness,
				right: layout.buildingRight - wallThickness
			});
		}
		
		const centerX = canvas.width / 2;
		layout.doors.push({
			x: centerX - BUILDING_CONFIG.doorWidth / 2,
			width: BUILDING_CONFIG.doorWidth
		});
		
		return layout;
	}
	
	// ===== GEBÄUDE BETRETEN / VERLASSEN =====
	
	function enterBuilding(buildingId) {
		const buildings = getBuildingsData();
		if (!buildings?.buildings?.[buildingId]) {
			console.warn(`[Building] Unbekanntes Gebäude: ${buildingId}`);
			return false;
		}
		
		bState.currentBuildingId = buildingId;
		bState.currentBuilding = buildings.buildings[buildingId];
		
		// Lade gespeicherte Portal-Position
		debug.loadBuildingPosition(buildingId);
		
		const canvas = getCanvas();
		if (!canvas) return false;
		
		// Hintergrundbild laden
		bState.backgroundLoaded = false;
		bState.backgroundImage = null;
		if (bState.currentBuilding.background) {
			bState.backgroundImage = loadSprite(bState.currentBuilding.background);
			if (bState.backgroundImage.complete && bState.backgroundImage.naturalWidth > 0) {
				bState.backgroundLoaded = true;
				console.log(`[Building] Hintergrund bereits geladen: ${bState.currentBuilding.background}`);
			} else {
				bState.backgroundImage.onload = () => {
					bState.backgroundLoaded = true;
					console.log(`[Building] Hintergrund geladen: ${bState.currentBuilding.background}`);
				};
				bState.backgroundImage.onerror = (e) => {
					console.warn(`[Building] Hintergrund konnte nicht geladen werden: ${bState.currentBuilding.background}`, e);
					bState.backgroundImage = null;
					bState.backgroundLoaded = true;
				};
			}
		}
		
		// Layout generieren
		bState.buildingLayout = generateBuildingLayout(canvas, buildingId);
		
		// NPC-Sprite laden
		if (bState.currentBuilding.npc) {
			const npcSpritePath = bState.currentBuilding.npc.sprite;
			if (npcSpritePath) {
				bState.npcSprite = loadSprite(npcSpritePath);
				console.log(`[Building] Lade NPC-Sprite: ${npcSpritePath}`);
				
				bState.npcSprite.onload = () => {
					console.log(`[Building] NPC-Sprite geladen: ${npcSpritePath}, Größe: ${bState.npcSprite.naturalWidth}x${bState.npcSprite.naturalHeight}`);
				};
				bState.npcSprite.onerror = () => {
					console.warn(`[Building] NPC-Sprite nicht gefunden: ${npcSpritePath}, verwende Platzhalter`);
					bState.npcSprite = createNPCPlaceholder(bState.currentBuilding.npc.id, bState.currentBuilding.npc.name);
				};
			} else {
				bState.npcSprite = createNPCPlaceholder(bState.currentBuilding.npc.id, bState.currentBuilding.npc.name);
			}
		}
		
		// Spieler-Startposition
		const grid = getWalkableGrid();
		let startX = 480;
		let startY = 600;
		
		const gridKeys = Object.keys(grid);
		if (gridKeys.length > 0) {
			for (let row = 20; row >= 10; row--) {
				for (let col = 10; col <= 20; col++) {
					if (grid[`${col},${row}`]) {
						startX = col * BUILDING_GRID_CELL_SIZE + BUILDING_GRID_OFFSET_X + BUILDING_GRID_CELL_SIZE / 2;
						startY = row * BUILDING_GRID_CELL_SIZE + BUILDING_GRID_CELL_SIZE / 2;
						break;
					}
				}
				if (startX !== 480) break;
			}
		}
		
		bState.playerPos = { x: startX, y: startY };
		bState.playerDir = 1;
		
		console.log(`[Building] Start bei X=${bState.playerPos.x}, Y=${bState.playerPos.y}`);
		
		const state = getState();
		if (state) {
			state.currentBuilding = buildingId;
			state.mode = 'building';
		}
		
		bState.dialogOpen = false;
		bState.dialogText = '';
		bState.dialogMenu = [];
		
		console.log(`[Building] Betreten: ${bState.currentBuilding.name}`);
		return true;
	}
	
	function exitBuilding() {
		if (!bState.currentBuildingId) return;
		
		if (bState.debugDragMode) {
			debug.saveCurrentBuildingPosition();
			console.log('[Building] Position automatisch gespeichert beim Verlassen');
		}
		
		console.log(`[Building] Verlassen: ${bState.currentBuilding?.name}`);
		
		bState.currentBuildingId = null;
		bState.currentBuilding = null;
		bState.buildingLayout = null;
		bState.npcSprite = null;
		bState.backgroundImage = null;
		bState.backgroundLoaded = false;
		bState.dialogOpen = false;
		
		if (onExitBuilding) {
			onExitBuilding();
		}
	}
	
	// ===== DIALOG-SYSTEM =====
	
	function openNPCDialog() {
		if (!bState.currentBuilding?.npc) return;
		
		bState.dialogOpen = true;
		bState.dialogText = bState.currentBuilding.npc.dialogues?.greeting || 'Hallo!';
		bState.dialogMenu = bState.currentBuilding.npc.dialogues?.menu || [];
		bState.dialogMenuIndex = 0;
	}
	
	function closeDialog() {
		bState.dialogOpen = false;
		bState.dialogText = '';
		bState.dialogMenu = [];
	}
	
	function selectDialogOption(index) {
		if (index < 0 || index >= bState.dialogMenu.length) return;
		
		const option = bState.dialogMenu[index];
		
		let handled = false;
		if (onNPCInteract) {
			handled = onNPCInteract(bState.currentBuildingId, bState.currentBuilding.npc.id, option);
		}
		
		if (handled) {
			// Interaktion hat ein UI geöffnet → Dialog schließen
			closeDialog();
		} else {
			bState.dialogText = `"${option}" - Diese Funktion kommt bald!`;
			bState.dialogMenu = [];
		}
	}
	
	// ===== PROXIMITY & MOVEMENT =====
	
	function checkProximity() {
		if (!bState.buildingLayout) return;
		
		const npcPos = getNPCPosition();
		if (npcPos) {
			const distX = Math.abs(bState.playerPos.x - npcPos.x);
			const distY = Math.abs(bState.playerPos.y - npcPos.y);
			bState.isNearNPC = distX < BUILDING_CONFIG.interactRadius && distY < BUILDING_CONFIG.interactRadius;
		} else {
			bState.isNearNPC = false;
		}
		
		const exitPos = getExitPosition();
		if (exitPos) {
			const distX = Math.abs(bState.playerPos.x - exitPos.x);
			const distY = Math.abs(bState.playerPos.y - exitPos.y);
			bState.isNearExit = distX < BUILDING_CONFIG.interactRadius && distY < BUILDING_CONFIG.interactRadius;
		} else {
			bState.isNearExit = false;
		}
	}
	
	function canUseDoor() {
		if (!bState.buildingLayout) return false;
		
		for (const door of bState.buildingLayout.doors) {
			if (bState.playerPos.x >= door.x && bState.playerPos.x <= door.x + door.width) {
				return true;
			}
		}
		return false;
	}
	
	// ===== UPDATE =====
	
	function update(dt, keys) {
		if (!bState.currentBuildingId || !bState.buildingLayout) return;
		
		bState.animTime += dt;
		
		if (bState.dialogOpen) return;
		
		const canvas = getCanvas();
		if (!canvas) return;
		
		const speed = BUILDING_CONFIG.playerSpeed * dt;
		
		if (keys.left) {
			const newX = Math.max(0, bState.playerPos.x - speed);
			if (isPositionWalkable(newX, bState.playerPos.y)) {
				bState.playerPos.x = newX;
			}
			bState.playerDir = -1;
		}
		if (keys.right) {
			const newX = Math.min(canvas.width, bState.playerPos.x + speed);
			if (isPositionWalkable(newX, bState.playerPos.y)) {
				bState.playerPos.x = newX;
			}
			bState.playerDir = 1;
		}
		
		if (keys.up) {
			const newY = Math.max(0, bState.playerPos.y - speed);
			if (isPositionWalkable(bState.playerPos.x, newY)) {
				bState.playerPos.y = newY;
			}
		}
		if (keys.down) {
			const newY = Math.min(canvas.height, bState.playerPos.y + speed);
			if (isPositionWalkable(bState.playerPos.x, newY)) {
				bState.playerPos.y = newY;
			}
		}
		
		checkProximity();
	}
	
	// ===== RENDER (orchestriert Sub-Module) =====
	
	function render(ctx2d) {
		if (!bState.currentBuildingId || !bState.currentBuilding) return;
		
		const canvas = getCanvas();
		if (!canvas) return;
		
		// Gebäude zeichnen
		renderer.renderBuilding(ctx2d, canvas);
		
		// Gebäude-Name oben
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 28px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'top';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.7)';
		ctx2d.shadowBlur = 5;
		ctx2d.fillText(bState.currentBuilding.name, canvas.width / 2, 20);
		ctx2d.shadowBlur = 0;
		
		// NPC und Exit
		const exitPos = getExitPosition();
		const npcPos = getNPCPosition();
		
		if (exitPos) {
			renderer.renderExitTeleporter(ctx2d, true);
		}
		
		if (npcPos) {
			renderer.renderNPC(ctx2d);
		}
		
		// Spieler
		renderer.renderPlayer(ctx2d);
		
		// Dialog-Box
		if (bState.dialogOpen) {
			renderer.renderDialog(ctx2d, canvas);
		}
		
		// Debug-Info
		renderer.renderDebugInfo(ctx2d, canvas);
		
		// Debug Drag Mode Overlay
		renderer.renderDebugDragOverlay(ctx2d, canvas);
		
		// Grid Editor
		renderer.renderGridEditor(ctx2d, canvas);
		
		// Hinweise unten
		renderer.renderBottomHints(ctx2d, canvas);
	}
	
	// ===== KEY HANDLER =====
	
	function handleKeyDown(key, code) {
		console.log(`[BuildingScene] handleKeyDown: key=${key}, code=${code}, currentBuildingId=${bState.currentBuildingId}, gridEditMode=${bState.gridEditMode}`);
		if (!bState.currentBuildingId) return false;
		
		// M für Grid-Editor toggle
		if (key.toLowerCase() === 'm' || code === 'KeyM') {
			bState.gridEditMode = !bState.gridEditMode;
			console.log(`[Building] Grid-Editor: ${bState.gridEditMode ? 'AN' : 'AUS'}`);
			if (bState.gridEditMode) {
				console.log(`%c[Grid Editor] AKTIVIERT für ${  bState.currentBuilding?.name}`, 'color: lime; font-weight: bold;');
				console.log('%c🖱️ Linksklick/halten = Zellen markieren', 'color: lime;');
				console.log('%c🖱️ Rechtsklick/halten = Zellen entfernen', 'color: orange;');
				console.log('%cS = Speichern | R = Reset | M = Beenden', 'color: yellow;');
			}
			return true;
		}
		
		// Grid-Editor aktiv - zusätzliche Tasten
		if (bState.gridEditMode) {
			if (key.toLowerCase() === 's' && code !== 'ArrowDown') {
				debug.saveWalkableGrid();
				return true;
			}
			if (key.toLowerCase() === 'r') {
				if (confirm('Grid wirklich komplett löschen?')) {
					S.buildingWalkableGrids[bState.currentBuildingId] = {};
					console.log('%c[Grid] Alle Zellen gelöscht!', 'color: orange; font-weight: bold;');
				}
				return true;
			}
		}
		
		// P für Debug-Drag-Modus toggle
		if (key.toLowerCase() === 'p' || code === 'KeyP') {
			bState.debugDragMode = !bState.debugDragMode;
			console.log(`%c[Building] PORTAL EDITOR: ${bState.debugDragMode ? 'AKTIVIERT' : 'DEAKTIVIERT'}`, 'color: magenta; font-weight: bold; font-size: 14px;');
			if (bState.debugDragMode) {
				alert('🔧 PORTAL EDITOR aktiviert!\n\nZiehe das Portal mit der Maus.\n[C] = Speichern\n[S] = Alle exportieren\n[P] = Beenden');
			}
			return true;
		}
		
		// C zum Positionen kopieren oder Fehler löschen
		if (key.toLowerCase() === 'c' || code === 'KeyC') {
			if (bState.debugDragMode) {
				debug.copyPositionsToClipboard();
				return true;
			} else if (bState.lastError) {
				debug.clearErrors();
				return true;
			}
		}
		
		// S zum ALLE Positionen exportieren (nur im Debug-Modus)
		if ((key.toLowerCase() === 's' || code === 'KeyS') && bState.debugDragMode) {
			debug.exportAllPositionsToClipboard();
			return true;
		}
		
		// IJKL für Player-Sprite-Offset Anpassung
		const offsetStep = 1;
		if (key.toLowerCase() === 'i' || code === 'KeyI') {
			bState.playerSpriteOffsetY -= offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${bState.playerSpriteOffsetX}, Y=${bState.playerSpriteOffsetY}`);
			return true;
		}
		if (key.toLowerCase() === 'k' || code === 'KeyK') {
			if (!bState.lastError) {
				bState.playerSpriteOffsetY += offsetStep;
				console.log(`[Building] Player Sprite Offset: X=${bState.playerSpriteOffsetX}, Y=${bState.playerSpriteOffsetY}`);
				return true;
			}
			debug.copyErrorToClipboard();
			return true;
		}
		if (key.toLowerCase() === 'j' || code === 'KeyJ') {
			bState.playerSpriteOffsetX -= offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${bState.playerSpriteOffsetX}, Y=${bState.playerSpriteOffsetY}`);
			return true;
		}
		if (key.toLowerCase() === 'l' || code === 'KeyL') {
			bState.playerSpriteOffsetX += offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${bState.playerSpriteOffsetX}, Y=${bState.playerSpriteOffsetY}`);
			return true;
		}
		
		// ESC zum Schließen/Verlassen
		if (key === 'Escape' || code === 'Escape') {
			if (bState.dialogOpen) {
				closeDialog();
			} else {
				exitBuilding();
			}
			return true;
		}
		
		// TAB für Karte
		if (key === 'Tab' || code === 'Tab') {
			if (!bState.dialogOpen && onOpenMap) {
				onOpenMap();
			}
			return true;
		}
		
		// E für Interaktion
		if (key.toLowerCase() === BUILDING_CONFIG.interactKey || code === BUILDING_CONFIG.interactCode) {
			if (bState.dialogOpen) return true;
			
			if (bState.isNearNPC) {
				openNPCDialog();
				return true;
			}
			
			if (bState.isNearExit) {
				if (onOpenMap) onOpenMap();
				return true;
			}
		}
		
		// Dialog-Navigation
		if (bState.dialogOpen && bState.dialogMenu.length > 0) {
			if (key === 'ArrowUp' || code === 'ArrowUp') {
				bState.dialogMenuIndex = Math.max(0, bState.dialogMenuIndex - 1);
				return true;
			}
			if (key === 'ArrowDown' || code === 'ArrowDown') {
				bState.dialogMenuIndex = Math.min(bState.dialogMenu.length - 1, bState.dialogMenuIndex + 1);
				return true;
			}
			if (key === 'Enter' || code === 'Enter') {
				selectDialogOption(bState.dialogMenuIndex);
				return true;
			}
		}
		
		return false;
	}
	
	// ===== SAFE WRAPPERS =====
	
	function safeUpdate(dt, keys) {
		try {
			update(dt, keys);
		} catch (error) {
			debug.recordError(error, 'update');
		}
	}
	
	function safeRender(ctx2d) {
		try {
			render(ctx2d);
		} catch (error) {
			debug.recordError(error, 'render');
			
			const canvas = getCanvas();
			if (canvas) {
				ctx2d.fillStyle = '#1a0000';
				ctx2d.fillRect(0, 0, canvas.width, canvas.height);
			}
		}
		
		// Fehler-Box immer anzeigen wenn vorhanden
		if (bState.lastError) {
			const canvas = getCanvas();
			if (canvas) {
				renderer.renderErrorBox(ctx2d, canvas);
			}
		}
	}
	
	// ===== PUBLIC API =====
	
	function isActive() {
		return bState.currentBuildingId !== null;
	}
	
	function getCurrentBuilding() {
		return {
			id: bState.currentBuildingId,
			data: bState.currentBuilding
		};
	}
	
	return {
		enterBuilding,
		exitBuilding,
		update: safeUpdate,
		render: safeRender,
		handleKeyDown,
		handleMouseDown: debug.handleMouseDown,
		handleMouseMove: debug.handleMouseMove,
		handleMouseUp: debug.handleMouseUp,
		isActive,
		getCurrentBuilding,
		get dialogOpen() { return bState.dialogOpen; },
		get isGridEditMode() { return bState.gridEditMode; },
		get currentBuildingId() { return bState.currentBuildingId; },
		closeDialog,
		clearErrors: debug.clearErrors,
		getLastError: () => bState.lastError,
		getErrorStack: () => [...bState.errorStack]
	};
}

export default { createBuildingSystem, BUILDING_CONFIG };
