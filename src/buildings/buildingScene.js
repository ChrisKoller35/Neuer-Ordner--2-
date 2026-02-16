// ============================================================
// BUILDING SCENE - Gebäude-Szenen mit NPCs und Stockwerken
// ============================================================
// Jedes Gebäude hat eine eigene Szene mit begehbaren Stockwerken
// Spieler kann sich bewegen und mit NPC interagieren
// Zurück zur Karte via Teleporter oder ESC

import { 
	createNPCPlaceholder,
	PLACEHOLDER_COLORS
} from '../core/placeholders.js';
import { loadSprite } from '../core/assets.js';

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
	doorWidth: 150, // Verbreitert für einfacheres Treffen
	doorHeight: 100
};

// ========== GRID KOLLISIONS-SYSTEM FÜR GEBÄUDE ==========
export const BUILDING_GRID_CELL_SIZE = 30;  // Größe einer Zelle in Pixel
export const BUILDING_GRID_COLS = 32;       // Anzahl Spalten
export const BUILDING_GRID_ROWS = 30;       // Anzahl Zeilen (erhöht für größere Gebäude)
export const BUILDING_GRID_OFFSET_X = 120;  // Grid um 4 Zellen (120px) nach rechts verschieben

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
	
	// Lokaler State
	let currentBuildingId = null;
	let currentBuilding = null;
	let npcSprite = null;
	let backgroundImage = null; // Hintergrundbild für das aktuelle Gebäude
	let backgroundLoaded = false;
	let playerPos = { x: 150, y: 0 }; // Pixel-Position
	let playerDir = 1; // Blickrichtung (1 = rechts, -1 = links)
	
	// Player Sprite Offset (IJKL Tasten zum Anpassen)
	let playerSpriteOffsetX = 0;
	let playerSpriteOffsetY = 75; // Sprite nach unten versetzt damit Füße auf dem Punkt sind
	let isNearNPC = false;
	let isNearExit = false;
	let dialogOpen = false;
	let dialogText = '';
	let dialogMenu = [];
	let dialogMenuIndex = 0;
	let animTime = 0;
	
	// Error-Tracking für Debug
	let lastError = null;
	let errorStack = [];
	
	// ===== DEBUG DRAG MODE =====
	// Drücke [P] um Debug-Drag-Modus zu aktivieren
	// Dann: Klicke und ziehe NPC oder Teleporter
	// Drücke [C] um Positionen in Zwischenablage zu kopieren
	// Drücke [S] um ALLE Positionen als JSON zu exportieren (für alle Gebäude)
	let debugDragMode = false;
	let dragTarget = null; // 'npc' oder 'exit'
	let debugNpcOffset = { x: 0.71, y: 0.74 }; // Aktuelle Position (wird pro Gebäude geladen)
	let debugExitOffset = { x: 0.72, y: 0.95 }; // Aktuelle Position (wird pro Gebäude geladen)
	
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
	
	// Gespeicherte Positionen pro Gebäude (aus localStorage, überschreibt Defaults)
	let savedBuildingPositions = {};
	const POSITIONS_STORAGE_KEY = 'BUILDING_PORTAL_POSITIONS';
	
	// Lädt gespeicherte Positionen aus localStorage
	function loadSavedPositions() {
		try {
			const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
			if (saved) {
				savedBuildingPositions = JSON.parse(saved);
				console.log('[Building] Portal-Positionen geladen:', Object.keys(savedBuildingPositions).length, 'Gebäude');
			}
		} catch (e) {
			console.warn('[Building] Fehler beim Laden der Positionen:', e);
		}
	}
	
	// Speichert aktuelle Position für das aktuelle Gebäude
	function saveCurrentBuildingPosition() {
		if (!currentBuildingId) return;
		savedBuildingPositions[currentBuildingId] = {
			npc: { x: debugNpcOffset.x, y: debugNpcOffset.y },
			exit: { x: debugExitOffset.x, y: debugExitOffset.y }
		};
		try {
			localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(savedBuildingPositions));
			console.log(`[Building] Position gespeichert für: ${currentBuildingId}`);
		} catch (e) {
			console.warn('[Building] Fehler beim Speichern:', e);
		}
	}
	
	// Lädt Position für ein bestimmtes Gebäude
	function loadBuildingPosition(buildingId) {
		// 1. Prüfe localStorage (vom Benutzer angepasst)
		if (savedBuildingPositions[buildingId]) {
			const pos = savedBuildingPositions[buildingId];
			debugNpcOffset = { ...pos.npc };
			debugExitOffset = { ...pos.exit };
			console.log(`[Building] Position geladen für: ${buildingId} (localStorage)`);
			return;
		}
		// 2. Prüfe fest eingebaute Positionen
		if (DEFAULT_BUILDING_POSITIONS[buildingId]) {
			const pos = DEFAULT_BUILDING_POSITIONS[buildingId];
			debugNpcOffset = { ...pos.npc };
			debugExitOffset = { ...pos.exit };
			console.log(`[Building] Position geladen für: ${buildingId} (Default)`);
			return;
		}
		// 3. Fallback Standard-Positionen
		debugNpcOffset = { x: 0.71, y: 0.74 };
		debugExitOffset = { x: 0.72, y: 0.95 };
		console.log(`[Building] Keine Position für: ${buildingId}, nutze Fallback`);
	}
	
	// Initialisiere gespeicherte Positionen beim Start
	loadSavedPositions();
	
	// ===== GRID EDITOR MODE =====
	// Drücke [M] um Grid-Editor zu aktivieren
	// Malen mit Linksklick, Löschen mit Rechtsklick
	let gridEditMode = false;
	let isGridPainting = false;
	let isGridErasing = false;
	let lastPaintedCell = null;
	
	// Gebäude-Layout (wird pro Gebäude generiert)
	let buildingLayout = null;
	
	// Exit-Teleporter Position (fix rechts oben)
	const EXIT_X = 0.88;
	const EXIT_FLOOR = 0; // Unterster Stock (Ausgang)
	
	/**
	 * Generiert das Gebäude-Layout
	 */
	function generateBuildingLayout(canvas, buildingId) {
		const floors = BUILDING_CONFIG.floors;
		const floorHeight = BUILDING_CONFIG.floorHeight;
		const wallThickness = BUILDING_CONFIG.wallThickness;
		
		const startY = canvas.height - 20; // Boden ganz unten
		
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
		
		// Stockwerke generieren
		for (let i = 0; i < floors; i++) {
			const floorY = startY - (i * floorHeight);
			layout.floors.push({
				index: i,
				y: floorY,
				walkableY: floorY + 40, // Spieler tief im Stockwerk
				left: layout.buildingLeft + wallThickness,
				right: layout.buildingRight - wallThickness
			});
		}
		
		// Türöffnung in der Mitte (zum Durchgehen)
		const centerX = canvas.width / 2;
		layout.doors.push({
			x: centerX - BUILDING_CONFIG.doorWidth / 2,
			width: BUILDING_CONFIG.doorWidth
		});
		
		return layout;
	}
	
	/**
	 * Betritt ein Gebäude
	 */
	function enterBuilding(buildingId) {
		const buildings = getBuildingsData();
		if (!buildings?.buildings?.[buildingId]) {
			console.warn(`[Building] Unbekanntes Gebäude: ${buildingId}`);
			return false;
		}
		
		currentBuildingId = buildingId;
		currentBuilding = buildings.buildings[buildingId];
		
		// Lade gespeicherte Portal-Position für dieses Gebäude
		loadBuildingPosition(buildingId);
		
		const canvas = getCanvas();
		if (!canvas) return false;
		
		// Hintergrundbild laden
		backgroundLoaded = false;
		backgroundImage = null;
		if (currentBuilding.background) {
			backgroundImage = loadSprite(currentBuilding.background);
			// Prüfen ob bereits geladen oder auf Load-Event warten
			if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
				backgroundLoaded = true;
				console.log(`[Building] Hintergrund bereits geladen: ${currentBuilding.background}`);
			} else {
				backgroundImage.onload = () => {
					backgroundLoaded = true;
					console.log(`[Building] Hintergrund geladen: ${currentBuilding.background}`);
				};
				backgroundImage.onerror = (e) => {
					console.warn(`[Building] Hintergrund konnte nicht geladen werden: ${currentBuilding.background}`, e);
					backgroundImage = null;
					backgroundLoaded = true;
				};
			}
		}
		
		// Layout generieren
		buildingLayout = generateBuildingLayout(canvas, buildingId);
		
		// NPC-Sprite laden (echtes Bild mit Platzhalter als Fallback)
		if (currentBuilding.npc) {
			const npcSpritePath = currentBuilding.npc.sprite;
			if (npcSpritePath) {
				// Echtes NPC-Sprite laden - direkt mit Image() für mehr Kontrolle
				npcSprite = new Image();
				// Korrekter Pfad für Vite: ./Npc/xxx.png -> /src/Npc/xxx.png
				const correctedPath = npcSpritePath.replace(/^\.\//, '/src/');
				npcSprite.src = correctedPath;
				console.log(`[Building] Lade NPC-Sprite: ${correctedPath}`);
				
				npcSprite.onload = () => {
					console.log(`[Building] NPC-Sprite geladen: ${correctedPath}, Größe: ${npcSprite.naturalWidth}x${npcSprite.naturalHeight}`);
				};
				npcSprite.onerror = () => {
					console.warn(`[Building] NPC-Sprite nicht gefunden: ${correctedPath}, verwende Platzhalter`);
					npcSprite = createNPCPlaceholder(currentBuilding.npc.id, currentBuilding.npc.name);
				};
			} else {
				// Kein Sprite definiert, Platzhalter verwenden
				npcSprite = createNPCPlaceholder(currentBuilding.npc.id, currentBuilding.npc.name);
			}
		}
		
		// Spieler-Startposition
		// Suche erste walkable Position im Grid
		const grid = getWalkableGrid();
		let startX = 480;
		let startY = 600;
		
		// Wenn Grid Daten hat, finde eine walkable Startposition
		const gridKeys = Object.keys(grid);
		if (gridKeys.length > 0) {
			// Finde walkable Zelle in der Mitte/unten
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
		
		playerPos = { x: startX, y: startY };
		playerDir = 1;
		
		console.log(`[Building] Start bei X=${playerPos.x}, Y=${playerPos.y}`);
		
		// State updaten
		const state = getState();
		if (state) {
			state.currentBuilding = buildingId;
			state.mode = 'building';
		}
		
		dialogOpen = false;
		dialogText = '';
		dialogMenu = [];
		
		console.log(`[Building] Betreten: ${currentBuilding.name}`);
		return true;
	}
	
	/**
	 * Verlässt das aktuelle Gebäude
	 */
	function exitBuilding() {
		if (!currentBuildingId) return;
		
		// Automatisch speichern falls im Debug-Modus geändert
		if (debugDragMode) {
			saveCurrentBuildingPosition();
			console.log('[Building] Position automatisch gespeichert beim Verlassen');
		}
		
		console.log(`[Building] Verlassen: ${currentBuilding?.name}`);
		
		currentBuildingId = null;
		currentBuilding = null;
		buildingLayout = null;
		npcSprite = null;
		backgroundImage = null;
		backgroundLoaded = false;
		dialogOpen = false;
		
		if (onExitBuilding) {
			onExitBuilding();
		}
	}
	
	/**
	 * Öffnet Dialog mit NPC
	 */
	function openNPCDialog() {
		if (!currentBuilding?.npc) return;
		
		dialogOpen = true;
		dialogText = currentBuilding.npc.dialogues?.greeting || 'Hallo!';
		dialogMenu = currentBuilding.npc.dialogues?.menu || [];
		dialogMenuIndex = 0;
	}
	
	/**
	 * Schließt den Dialog
	 */
	function closeDialog() {
		dialogOpen = false;
		dialogText = '';
		dialogMenu = [];
	}
	
	/**
	 * Wählt eine Dialog-Option
	 */
	function selectDialogOption(index) {
		if (index < 0 || index >= dialogMenu.length) return;
		
		const option = dialogMenu[index];
		
		if (onNPCInteract) {
			onNPCInteract(currentBuildingId, currentBuilding.npc.id, option);
		}
		
		// Vorerst: Zeige "Kommt bald" Nachricht
		dialogText = `"${option}" - Diese Funktion kommt bald!`;
		dialogMenu = [];
	}
	
	/**
	 * Berechnet NPC-Position basierend auf Gebäude
	 */
	function getNPCPosition() {
		if (!buildingLayout || !currentBuilding?.npc) return null;
		
		const canvas = getCanvas();
		if (!canvas) return null;
		
		// NPC Position aus Debug-Offset (freie X/Y Position)
		const x = buildingLayout.buildingLeft + buildingLayout.buildingWidth * debugNpcOffset.x;
		const y = canvas.height * debugNpcOffset.y;
		
		// Berechne welcher Stock das ist (für Proximity-Check)
		let floor = 0;
		for (let i = 0; i < buildingLayout.floors.length; i++) {
			const f = buildingLayout.floors[i];
			if (y <= f.y && y >= f.y - BUILDING_CONFIG.floorHeight) {
				floor = i;
				break;
			}
		}
		
		return { x, y, floor };
	}
	
	/**
	 * Berechnet Exit-Teleporter-Position
	 */
	function getExitPosition() {
		if (!buildingLayout) return null;
		const canvas = getCanvas();
		if (!canvas) return null;
		
		// Exit Position aus Debug-Offset (freie X/Y Position)
		const x = buildingLayout.buildingLeft + buildingLayout.buildingWidth * debugExitOffset.x;
		const y = canvas.height * debugExitOffset.y;
		
		// Berechne welcher Stock das ist (für Proximity-Check)
		let floor = 0;
		for (let i = 0; i < buildingLayout.floors.length; i++) {
			const f = buildingLayout.floors[i];
			if (y <= f.y && y >= f.y - BUILDING_CONFIG.floorHeight) {
				floor = i;
				break;
			}
		}
		
		return { x, y, floor };
	}
	
	/**
	 * Prüft Proximity zu NPC und Exit (basierend auf X und Y Distanz)
	 */
	function checkProximity() {
		if (!buildingLayout) return;
		
		// NPC-Proximity (2D Distanz)
		const npcPos = getNPCPosition();
		if (npcPos) {
			const distX = Math.abs(playerPos.x - npcPos.x);
			const distY = Math.abs(playerPos.y - npcPos.y);
			isNearNPC = distX < BUILDING_CONFIG.interactRadius && distY < BUILDING_CONFIG.interactRadius;
		} else {
			isNearNPC = false;
		}
		
		// Exit-Proximity (2D Distanz)
		const exitPos = getExitPosition();
		if (exitPos) {
			const distX = Math.abs(playerPos.x - exitPos.x);
			const distY = Math.abs(playerPos.y - exitPos.y);
			isNearExit = distX < BUILDING_CONFIG.interactRadius && distY < BUILDING_CONFIG.interactRadius;
		} else {
			isNearExit = false;
		}
	}
	
	/**
	 * Prüft ob Spieler durch Tür gehen kann (Stockwerk wechseln)
	 */
	function canUseDoor() {
		if (!buildingLayout) return false;
		
		// Prüft ob Spieler in Türbereich ist
		for (const door of buildingLayout.doors) {
			if (playerPos.x >= door.x && playerPos.x <= door.x + door.width) {
				return true;
			}
		}
		return false;
	}
	
	/**
	 * Update-Funktion
	 */
	function update(dt, keys) {
		if (!currentBuildingId || !buildingLayout) return;
		
		animTime += dt;
		
		// Dialog offen = keine Bewegung
		if (dialogOpen) return;
		
		const canvas = getCanvas();
		if (!canvas) return;
		
		// Spieler-Bewegung (frei in X und Y, beschränkt durch Grid)
		const speed = BUILDING_CONFIG.playerSpeed * dt;
		
		// Horizontale Bewegung
		if (keys.left) {
			const newX = Math.max(0, playerPos.x - speed);
			if (isPositionWalkable(newX, playerPos.y)) {
				playerPos.x = newX;
			}
			playerDir = -1;
		}
		if (keys.right) {
			const newX = Math.min(canvas.width, playerPos.x + speed);
			if (isPositionWalkable(newX, playerPos.y)) {
				playerPos.x = newX;
			}
			playerDir = 1;
		}
		
		// Vertikale Bewegung (W/S oder Pfeiltasten)
		if (keys.up) {
			const newY = Math.max(0, playerPos.y - speed);
			if (isPositionWalkable(playerPos.x, newY)) {
				playerPos.y = newY;
			}
		}
		if (keys.down) {
			const newY = Math.min(canvas.height, playerPos.y + speed);
			if (isPositionWalkable(playerPos.x, newY)) {
				playerPos.y = newY;
			}
		}
		
		// Proximity Check
		checkProximity();
	}
	
	/**
	 * Rendert das Gebäude-Layout (Wände, Böden, Stockwerke)
	 */
	// DEBUG: Stockwerk-Farben für klare Unterscheidung
	const DEBUG_FLOOR_COLORS = ['#8B4513', '#228B22', '#4169E1']; // Braun=0, Grün=1, Blau=2
	const SHOW_DEBUG_FLOORS = false; // DEBUG: Auf true setzen um Platzhalter-Stockwerke anzuzeigen
	
	function renderBuilding(ctx2d, canvas) {
		if (!buildingLayout) return;
		
		const { color, buildingLeft, buildingRight, buildingWidth, startY, floorHeight, floors } = buildingLayout;
		
		// Hintergrundbild zeichnen (wenn geladen), sonst schwarzer Fallback
		if (backgroundImage && backgroundLoaded && backgroundImage.naturalWidth > 0) {
			// Bild skalieren um Canvas zu füllen (cover)
			// Wichtig: Bild wird am UNTEREN Rand ausgerichtet, damit nichts abgeschnitten wird
			const imgRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
			const canvasRatio = canvas.width / canvas.height;
			let drawW, drawH, drawX, drawY;
			if (imgRatio > canvasRatio) {
				// Bild ist breiter - Höhe anpassen
				drawH = canvas.height;
				drawW = drawH * imgRatio;
				drawX = (canvas.width - drawW) / 2;
				drawY = 0;
			} else {
				// Bild ist höher - Breite anpassen, aber am UNTEREN Rand ausrichten
				drawW = canvas.width;
				drawH = drawW / imgRatio;
				drawX = 0;
				drawY = canvas.height - drawH; // Unten ausrichten statt zentrieren
			}
			ctx2d.drawImage(backgroundImage, drawX, drawY, drawW, drawH);
		} else {
			// Schwarzer Hintergrund als Fallback
			ctx2d.fillStyle = '#000000';
			ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		}
		
		// DEBUG: Platzhalter nur anzeigen wenn aktiviert
		if (!SHOW_DEBUG_FLOORS) return;
		
		// Außenwände
		ctx2d.fillStyle = '#333333';
		ctx2d.fillRect(buildingLeft, startY - (floors.length * floorHeight), BUILDING_CONFIG.wallThickness, floors.length * floorHeight + 15);
		ctx2d.fillRect(buildingRight - BUILDING_CONFIG.wallThickness, startY - (floors.length * floorHeight), BUILDING_CONFIG.wallThickness, floors.length * floorHeight + 15);
		
		// DEBUG: Jedes Stockwerk mit eigener Farbe zeichnen (KEINE LÜCKEN!)
		floors.forEach((floor, i) => {
			const debugColor = DEBUG_FLOOR_COLORS[i] || '#888888';
			
			// Hintergrund des Stockwerks - von Boden bis zur Decke (nächster Boden)
			ctx2d.fillStyle = debugColor;
			const floorBottom = floor.y; // Boden dieses Stockwerks
			const floorTop = floor.y - floorHeight; // Decke dieses Stockwerks
			ctx2d.fillRect(buildingLeft + BUILDING_CONFIG.wallThickness, floorTop, 
				buildingWidth - BUILDING_CONFIG.wallThickness * 2, floorHeight);
			
			// Boden (weiße Linie)
			ctx2d.fillStyle = '#FFFFFF';
			ctx2d.fillRect(buildingLeft, floor.y, buildingWidth, 5);
			
			// GROSSE Stockwerk-Nummer in der Mitte
			ctx2d.fillStyle = '#FFFFFF';
			ctx2d.font = 'bold 80px Arial';
			ctx2d.textAlign = 'center';
			ctx2d.textBaseline = 'middle';
			ctx2d.fillText(`${i}`, canvas.width / 2, floor.y - floorHeight / 2);
			
			// Label links
			const floorLabel = i === 0 ? 'STOCK 0' : i === 1 ? 'STOCK 1' : 'STOCK 2';
			ctx2d.font = 'bold 20px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.fillText(floorLabel, buildingLeft + 60, floor.y - 20);
		});
		
		// Türöffnungen (Durchgänge zwischen Stockwerken)
		ctx2d.fillStyle = '#1a1a1a';
		for (const door of buildingLayout.doors) {
			// Tür-Öffnung in jedem Stockwerk (außer obersten)
			for (let i = 0; i < floors.length - 1; i++) {
				ctx2d.fillRect(
					door.x - 10, 
					floors[i].y - BUILDING_CONFIG.doorHeight, 
					door.width + 20, 
					BUILDING_CONFIG.doorHeight
				);
				
				// Leiter/Treppe Symbol
				ctx2d.strokeStyle = '#666666';
				ctx2d.lineWidth = 3;
				const lx = door.x + door.width / 2;
				const ly = floors[i].y;
				// Vertikale Linien
				ctx2d.beginPath();
				ctx2d.moveTo(lx - 15, ly);
				ctx2d.lineTo(lx - 15, ly - BUILDING_CONFIG.doorHeight);
				ctx2d.moveTo(lx + 15, ly);
				ctx2d.lineTo(lx + 15, ly - BUILDING_CONFIG.doorHeight);
				ctx2d.stroke();
				// Sprossen
				for (let s = 0; s < 5; s++) {
					const sy = ly - 15 - s * 18;
					ctx2d.beginPath();
					ctx2d.moveTo(lx - 15, sy);
					ctx2d.lineTo(lx + 15, sy);
					ctx2d.stroke();
				}
			}
		}
		

		
		// Dach
		ctx2d.fillStyle = adjustColor(color, -40);
		const roofY = startY - (floors.length * floorHeight);
		ctx2d.beginPath();
		ctx2d.moveTo(buildingLeft - 20, roofY);
		ctx2d.lineTo(canvas.width / 2, roofY - 60);
		ctx2d.lineTo(buildingRight + 20, roofY);
		ctx2d.closePath();
		ctx2d.fill();
	}
	
	/**
	 * Rendert den Exit-Teleporter (fixe Position)
	 * @param {boolean} canInteract - Ob der Spieler auf dem richtigen Stock ist
	 */
	function renderExitTeleporter(ctx2d, canInteract = false) {
		const exitPos = getExitPosition();
		if (!exitPos) return;
		
		const x = exitPos.x;
		const y = exitPos.y;
		
		// Transparenz basierend auf Stock (transparent wenn nicht erreichbar)
		const alpha = canInteract ? 1.0 : 0.3;
		
		ctx2d.save();
		ctx2d.globalAlpha = alpha;
		
		// Plattform
		ctx2d.fillStyle = '#37474f';
		ctx2d.beginPath();
		ctx2d.ellipse(x, y + 5, 35, 12, 0, 0, Math.PI * 2);
		ctx2d.fill();
		
		// Portal-Glow (animiert aber Position fix)
		const pulse = Math.sin(animTime * 0.005) * 0.2;
		ctx2d.fillStyle = `rgba(0, 188, 212, ${0.5 + pulse})`;
		ctx2d.beginPath();
		ctx2d.ellipse(x, y - 40, 25 + pulse * 10, 45, 0, 0, Math.PI * 2);
		ctx2d.fill();
		
		// Ring
		ctx2d.strokeStyle = '#00e5ff';
		ctx2d.lineWidth = 3;
		ctx2d.beginPath();
		ctx2d.ellipse(x, y - 40, 22, 40, 0, 0, Math.PI * 2);
		ctx2d.stroke();
		
		// Glow bei Nähe (nur wenn erreichbar)
		if (canInteract && isNearExit) {
			ctx2d.shadowColor = '#00e5ff';
			ctx2d.shadowBlur = 20;
			ctx2d.strokeStyle = '#ffffff';
			ctx2d.stroke();
			ctx2d.shadowBlur = 0;
		}
		
		ctx2d.restore();
		
		// Label (immer sichtbar)
		ctx2d.fillStyle = canInteract ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
		ctx2d.font = 'bold 11px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.fillText(`AUSGANG (Stock ${EXIT_FLOOR})`, x, y - 95);
		
		// Interaktions-Hinweis (nur wenn erreichbar und in Nähe)
		if (canInteract && isNearExit && !dialogOpen) {
			ctx2d.fillStyle = '#00e5ff';
			ctx2d.font = '12px Arial';
			ctx2d.fillText('[E] Zur Karte', x, y + 25);
		}
	}
	
	/**
	 * Rendert den NPC
	 */
	function renderNPC(ctx2d) {
		const npcPos = getNPCPosition();
		if (!npcPos || !currentBuilding?.npc) return;
		
		const x = npcPos.x;
		const y = npcPos.y;
		const bob = Math.sin(animTime * BUILDING_CONFIG.npcBobSpeed) * BUILDING_CONFIG.npcBobAmount;
		
		// Prüfe ob NPC-Sprite geladen ist
		const spriteLoaded = npcSprite && npcSprite.complete && npcSprite.naturalWidth > 0;
		
		if (isNearNPC) {
			ctx2d.shadowColor = '#ffcc00';
			ctx2d.shadowBlur = 15;
		}
		
		if (spriteLoaded) {
			// Echtes NPC-Sprite zeichnen
			const spriteWidth = npcSprite.naturalWidth;
			const spriteHeight = npcSprite.naturalHeight;
			// Skalierung anpassen - NPC sollte etwa 180px hoch sein
			const scale = Math.min(180 / spriteHeight, 2.2);
			const drawWidth = spriteWidth * scale;
			const drawHeight = spriteHeight * scale;
			
			ctx2d.drawImage(
				npcSprite,
				x - drawWidth / 2,
				y - drawHeight,
				drawWidth,
				drawHeight
			);
		} else {
			// Fallback: NPC als einfacher Kreis
			const radius = isNearNPC ? 35 : 30;
			
			// Kreis zeichnen
			ctx2d.fillStyle = '#ff6600';
			ctx2d.beginPath();
			ctx2d.arc(x, y - radius + bob, radius, 0, Math.PI * 2);
			ctx2d.fill();
			
			// Augen
			ctx2d.fillStyle = '#ffffff';
			ctx2d.beginPath();
			ctx2d.arc(x - 10, y - radius - 5 + bob, 6, 0, Math.PI * 2);
			ctx2d.arc(x + 10, y - radius - 5 + bob, 6, 0, Math.PI * 2);
			ctx2d.fill();
			ctx2d.fillStyle = '#000000';
			ctx2d.beginPath();
			ctx2d.arc(x - 8, y - radius - 5 + bob, 3, 0, Math.PI * 2);
			ctx2d.arc(x + 12, y - radius - 5 + bob, 3, 0, Math.PI * 2);
			ctx2d.fill();
		}
		
		ctx2d.shadowBlur = 0;
		
		// NPC-Name
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 16px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.8)';
		ctx2d.shadowBlur = 3;
		ctx2d.fillText(currentBuilding.npc.name, x, y - (spriteLoaded ? 190 : 75));
		ctx2d.shadowBlur = 0;
		
		// Interaktions-Hinweis
		if (isNearNPC && !dialogOpen) {
			ctx2d.fillStyle = '#ffcc00';
			ctx2d.font = '12px Arial';
			ctx2d.fillText('[E] Sprechen', x, y + 15);
		}
	}
	
	/**
	 * Rendert den Spieler
	 */
	function renderPlayer(ctx2d) {
		if (!buildingLayout) return;
		
		const x = playerPos.x;
		const y = playerPos.y;
		
		// DEBUG: Gelber Punkt wo der Code denkt dass der Spieler ist
		ctx2d.fillStyle = '#ffff00';
		ctx2d.beginPath();
		ctx2d.arc(x, y, 10, 0, Math.PI * 2);
		ctx2d.fill();
		ctx2d.strokeStyle = '#000000';
		ctx2d.lineWidth = 2;
		ctx2d.stroke();
		
		// Player-Sprite laden wenn verfügbar
		let playerSprite = null;
		if (typeof getPlayerSprite === 'function') {
			playerSprite = getPlayerSprite();
		}
		
		ctx2d.save();
		ctx2d.translate(x + playerSpriteOffsetX, y + playerSpriteOffsetY);
		if (playerDir === -1) {
			ctx2d.scale(-1, 1);
		}
		
		if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
			// Echten Sprite zeichnen
			const scale = 0.15;
			const pw = playerSprite.naturalWidth * scale;
			const ph = playerSprite.naturalHeight * scale;
			ctx2d.drawImage(playerSprite, -pw / 2, -ph, pw, ph);
		} else {
			// Platzhalter-Spieler (Fisch-Form)
			// Körper (Oval)
			ctx2d.fillStyle = '#00aaff';
			ctx2d.beginPath();
			ctx2d.ellipse(0, -30, 25, 18, 0, 0, Math.PI * 2);
			ctx2d.fill();
			
			// Schwanzflosse
			ctx2d.beginPath();
			ctx2d.moveTo(-25, -30);
			ctx2d.lineTo(-40, -15);
			ctx2d.lineTo(-40, -45);
			ctx2d.closePath();
			ctx2d.fill();
			
			// Auge
			ctx2d.fillStyle = '#ffffff';
			ctx2d.beginPath();
			ctx2d.arc(12, -33, 6, 0, Math.PI * 2);
			ctx2d.fill();
			ctx2d.fillStyle = '#000000';
			ctx2d.beginPath();
			ctx2d.arc(14, -33, 3, 0, Math.PI * 2);
			ctx2d.fill();
			
			// Flosse oben
			ctx2d.fillStyle = '#0088dd';
			ctx2d.beginPath();
			ctx2d.moveTo(-5, -48);
			ctx2d.lineTo(5, -55);
			ctx2d.lineTo(10, -48);
			ctx2d.closePath();
			ctx2d.fill();
		}
		
		ctx2d.restore();
		
		// Name
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 10px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.8)';
		ctx2d.shadowBlur = 2;
		ctx2d.fillText('SPIELER', x, y - 55);
		ctx2d.shadowBlur = 0;
	}
	
	/**
	 * Rendert die Dialog-Box
	 */
	function renderDialog(ctx2d, canvas) {
		const boxWidth = 500;
		const boxHeight = dialogMenu.length > 0 ? 180 : 100;
		const boxX = (canvas.width - boxWidth) / 2;
		const boxY = canvas.height - boxHeight - 50;
		
		// Box
		ctx2d.fillStyle = 'rgba(0, 20, 40, 0.95)';
		ctx2d.strokeStyle = '#00aaff';
		ctx2d.lineWidth = 2;
		ctx2d.beginPath();
		ctx2d.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
		ctx2d.fill();
		ctx2d.stroke();
		
		// NPC-Name
		if (currentBuilding?.npc) {
			ctx2d.fillStyle = '#ffcc00';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText(currentBuilding.npc.name, boxX + 20, boxY + 15);
		}
		
		// Dialog-Text
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = '14px Arial';
		ctx2d.fillText(dialogText, boxX + 20, boxY + 45);
		
		// Menü-Optionen
		if (dialogMenu.length > 0) {
			ctx2d.font = '13px Arial';
			dialogMenu.forEach((option, i) => {
				const isSelected = i === dialogMenuIndex;
				ctx2d.fillStyle = isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)';
				const prefix = isSelected ? '► ' : '  ';
				ctx2d.fillText(`${prefix}${option}`, boxX + 30, boxY + 75 + i * 22);
			});
		}
		
		// Schließen-Hinweis
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx2d.font = '11px Arial';
		ctx2d.textAlign = 'right';
		ctx2d.fillText('[ESC] Schließen  |  [↑↓] Wählen  |  [Enter] Bestätigen', boxX + boxWidth - 15, boxY + boxHeight - 10);
	}
	
	/**
	 * Holt das Walkable-Grid für das aktuelle Gebäude
	 */
	function getWalkableGrid() {
		if (!currentBuildingId) return {};
		const key = `BUILDING_WALKABLE_GRID_${currentBuildingId}`;
		if (!window[key]) {
			window[key] = {};
		}
		return window[key];
	}
	
	/**
	 * Prüft ob eine Position im begehbaren Grid liegt
	 */
	function isPositionWalkable(x, y) {
		const grid = getWalkableGrid();
		const canvas = getCanvas();
		if (!canvas) return true;
		
		// Wenn Grid leer ist, erlaube alles (noch nicht konfiguriert)
		if (Object.keys(grid).length === 0) {
			return true;
		}
		
		// Grid-Zelle berechnen (mit Offset)
		const col = Math.floor((x - BUILDING_GRID_OFFSET_X) / BUILDING_GRID_CELL_SIZE);
		const row = Math.floor(y / BUILDING_GRID_CELL_SIZE);
		
		// Außerhalb des Grids = blockiert
		if (col < 0 || col >= BUILDING_GRID_COLS || row < 0 || row >= BUILDING_GRID_ROWS) {
			return false;
		}
		
		const key = `${col},${row}`;
		return grid[key] === true;
	}
	
	/**
	 * Rendert den Grid-Editor (Debug-Modus)
	 */
	function renderGridEditor(ctx2d, canvas) {
		if (!gridEditMode) return;
		
		const grid = getWalkableGrid();
		const cellSize = BUILDING_GRID_CELL_SIZE;
		const offsetX = BUILDING_GRID_OFFSET_X;
		
		// Grid zeichnen (mit Offset)
		for (let row = 0; row < BUILDING_GRID_ROWS; row++) {
			for (let col = 0; col < BUILDING_GRID_COLS; col++) {
				const x = col * cellSize + offsetX;
				const y = row * cellSize;
				const key = `${col},${row}`;
				const isWalkable = grid[key] === true;
				
				if (isWalkable) {
					ctx2d.fillStyle = "rgba(0, 255, 100, 0.4)";
					ctx2d.fillRect(x, y, cellSize, cellSize);
				}
				
				ctx2d.strokeStyle = isWalkable ? "rgba(0, 255, 100, 0.8)" : "rgba(255, 255, 255, 0.15)";
				ctx2d.lineWidth = isWalkable ? 2 : 1;
				ctx2d.strokeRect(x, y, cellSize, cellSize);
			}
		}
		
		// Spieler-Position markieren im Grid (mit Offset)
		const playerCol = Math.floor((playerPos.x - offsetX) / cellSize);
		const playerRow = Math.floor(playerPos.y / cellSize);
		
		ctx2d.strokeStyle = "#ff0";
		ctx2d.lineWidth = 3;
		ctx2d.strokeRect(playerCol * cellSize + offsetX, playerRow * cellSize, cellSize, cellSize);
		
		// Editor-Hinweise
		ctx2d.fillStyle = "rgba(0, 0, 0, 0.9)";
		ctx2d.fillRect(canvas.width / 2 - 250, 10, 500, 100);
		ctx2d.strokeStyle = "#0f0";
		ctx2d.lineWidth = 3;
		ctx2d.strokeRect(canvas.width / 2 - 250, 10, 500, 100);
		
		ctx2d.fillStyle = "#0f0";
		ctx2d.font = "bold 16px monospace";
		ctx2d.textAlign = "center";
		ctx2d.textBaseline = "top";
		ctx2d.fillText(`🔧 GRID EDITOR - ${currentBuilding?.name || 'Gebäude'}`, canvas.width / 2, 18);
		ctx2d.font = "13px monospace";
		ctx2d.fillText("🖱️ Linksklick halten = Zellen markieren (malen)", canvas.width / 2, 40);
		ctx2d.fillText("🖱️ Rechtsklick halten = Zellen entfernen", canvas.width / 2, 58);
		ctx2d.fillStyle = "#ffff00";
		ctx2d.fillText(`S = Speichern | R = Reset | M = Editor aus | Zellen: ${Object.keys(grid).length}`, canvas.width / 2, 78);
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
		
		const varName = `BUILDING_WALKABLE_GRID_${currentBuildingId}`;
		let result = `// Begehbare Grid-Zellen für ${currentBuilding?.name || currentBuildingId} (${keys.length} Zellen)\n`;
		result += `window.${varName} = {\n`;
		for (const k of keys) {
			result += `  "${k}": true,\n`;
		}
		result += '};\n';
		
		console.log('%c[Grid] GESPEICHERT:', 'color: lime; font-weight: bold; font-size: 16px;');
		console.log(result);
		
		if (navigator.clipboard) {
			navigator.clipboard.writeText(result).then(() => {
				alert(`Grid für "${currentBuilding?.name}" gespeichert!\n${keys.length} begehbare Zellen.\n\nCode in Zwischenablage kopiert.\nFüge den Code in index.html ein um ihn zu speichern.`);
			}).catch(() => {
				alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
			});
		} else {
			alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
		}
	}
	
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
	 * Haupt-Render-Funktion
	 */
	function render(ctx2d) {
		if (!currentBuildingId || !currentBuilding) return;
		
		const canvas = getCanvas();
		if (!canvas) return;
		
		// Gebäude zeichnen
		renderBuilding(ctx2d, canvas);
		
		// Gebäude-Name oben
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 28px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'top';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.7)';
		ctx2d.shadowBlur = 5;
		ctx2d.fillText(currentBuilding.name, canvas.width / 2, 20);
		ctx2d.shadowBlur = 0;
		
		// NPC und Exit immer anzeigen (Position ist jetzt nicht mehr an Stockwerke gebunden)
		const exitPos = getExitPosition();
		const npcPos = getNPCPosition();
		
		// Exit-Teleporter (immer sichtbar wenn Position existiert)
		if (exitPos) {
			renderExitTeleporter(ctx2d, true);
		}
		
		// NPC (immer sichtbar wenn Position existiert)
		if (npcPos) {
			renderNPC(ctx2d);
		}
		
		// Spieler
		renderPlayer(ctx2d);
		
		// Dialog-Box
		if (dialogOpen) {
			renderDialog(ctx2d, canvas);
		}
		
		// Debug-Info oben links
		ctx2d.fillStyle = 'rgba(0, 0, 0, 0.8)';
		ctx2d.fillRect(10, 55, 400, 70);
		ctx2d.fillStyle = '#00ff00';
		ctx2d.font = 'bold 16px Arial';
		ctx2d.textAlign = 'left';
		ctx2d.textBaseline = 'top';
		
		// Erweiterte Debug-Anzeige - Spieler Position
		ctx2d.fillText(`Player X = ${playerPos.x.toFixed(0)} | Player Y = ${playerPos.y.toFixed(0)}`, 20, 60);
		ctx2d.fillStyle = '#ffff00';
		ctx2d.font = '12px Arial';
		const col = Math.floor((playerPos.x - BUILDING_GRID_OFFSET_X) / BUILDING_GRID_CELL_SIZE);
		const row = Math.floor(playerPos.y / BUILDING_GRID_CELL_SIZE);
		ctx2d.fillText(`Grid: Col=${col}, Row=${row}`, 20, 80);
		
		// Offset-Anzeige
		ctx2d.fillStyle = '#00ffff';
		ctx2d.fillText(`Sprite Offset: X=${playerSpriteOffsetX}, Y=${playerSpriteOffsetY} (IJKL = anpassen)`, 20, 95);
		
		// DEBUG DRAG MODE Anzeige
		if (debugDragMode) {
			const posCount = Object.keys(savedBuildingPositions).length;
			ctx2d.fillStyle = 'rgba(255, 0, 255, 0.95)';
			ctx2d.fillRect(canvas.width - 340, 10, 330, 170);
			ctx2d.fillStyle = '#ffffff';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText('🔧 PORTAL & NPC EDITOR', canvas.width - 330, 15);
			ctx2d.font = '12px Arial';
			ctx2d.fillText(`Gebäude: ${currentBuilding?.name || currentBuildingId}`, canvas.width - 330, 35);
			ctx2d.fillText('Klicke & ziehe NPC oder EXIT', canvas.width - 330, 55);
			ctx2d.fillStyle = '#ff9900';
			ctx2d.fillText(`NPC: x=${debugNpcOffset.x.toFixed(2)}, y=${debugNpcOffset.y.toFixed(2)}`, canvas.width - 330, 75);
			ctx2d.fillStyle = '#00ffff';
			ctx2d.fillText(`EXIT: x=${debugExitOffset.x.toFixed(2)}, y=${debugExitOffset.y.toFixed(2)}`, canvas.width - 330, 92);
			ctx2d.fillStyle = '#ffff00';
			ctx2d.fillText('[C] Speichern & Kopieren', canvas.width - 330, 112);
			ctx2d.fillText(`[S] ALLE ${posCount} Positionen exportieren`, canvas.width - 330, 129);
			ctx2d.fillStyle = '#ff6666';
			ctx2d.fillText('[P] Editor beenden', canvas.width - 330, 149);
		}
		
		// GRID EDITOR Overlay (wenn aktiv)
		renderGridEditor(ctx2d, canvas);
		
		// Hinweise unten
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx2d.font = '12px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'bottom';
		ctx2d.fillText('[A/D] Bewegen  |  [W/S] Stockwerk (bei Leiter)  |  [E] Interagieren  |  [TAB] Karte  |  [ESC] Zurück  |  [P] Debug-Drag', canvas.width / 2, canvas.height - 10);
	}
	
	/**
	 * Behandelt Tastendruck
	 */
	function handleKeyDown(key, code) {
		console.log(`[BuildingScene] handleKeyDown: key=${key}, code=${code}, currentBuildingId=${currentBuildingId}, gridEditMode=${gridEditMode}`);
		if (!currentBuildingId) return false;
		
		// M für Grid-Editor toggle
		if (key.toLowerCase() === 'm' || code === 'KeyM') {
			gridEditMode = !gridEditMode;
			console.log(`[Building] Grid-Editor: ${gridEditMode ? 'AN' : 'AUS'}`);
			if (gridEditMode) {
				console.log('%c[Grid Editor] AKTIVIERT für ' + currentBuilding?.name, 'color: lime; font-weight: bold;');
				console.log('%c🖱️ Linksklick/halten = Zellen markieren', 'color: lime;');
				console.log('%c🖱️ Rechtsklick/halten = Zellen entfernen', 'color: orange;');
				console.log('%cS = Speichern | R = Reset | M = Beenden', 'color: yellow;');
			}
			return true;
		}
		
		// Grid-Editor aktiv - zusätzliche Tasten
		if (gridEditMode) {
			// S = Speichern
			if (key.toLowerCase() === 's' && code !== 'ArrowDown') {
				saveWalkableGrid();
				return true;
			}
			// R = Reset
			if (key.toLowerCase() === 'r') {
				if (confirm('Grid wirklich komplett löschen?')) {
					const gridKey = `BUILDING_WALKABLE_GRID_${currentBuildingId}`;
					window[gridKey] = {};
					console.log('%c[Grid] Alle Zellen gelöscht!', 'color: orange; font-weight: bold;');
				}
				return true;
			}
		}
		
		// P für Debug-Drag-Modus toggle
		if (key.toLowerCase() === 'p' || code === 'KeyP') {
			debugDragMode = !debugDragMode;
			console.log(`%c[Building] PORTAL EDITOR: ${debugDragMode ? 'AKTIVIERT' : 'DEAKTIVIERT'}`, 'color: magenta; font-weight: bold; font-size: 14px;');
			if (debugDragMode) {
				alert('🔧 PORTAL EDITOR aktiviert!\n\nZiehe das Portal mit der Maus.\n[C] = Speichern\n[S] = Alle exportieren\n[P] = Beenden');
			}
			return true;
		}
		
		// C zum Positionen kopieren (im Debug-Modus) oder Fehler löschen
		if (key.toLowerCase() === 'c' || code === 'KeyC') {
			if (debugDragMode) {
				copyPositionsToClipboard();
				return true;
			} else if (lastError) {
				clearErrors();
				return true;
			}
		}
		
		// S zum ALLE Positionen exportieren (nur im Debug-Modus)
		if ((key.toLowerCase() === 's' || code === 'KeyS') && debugDragMode) {
			exportAllPositionsToClipboard();
			return true;
		}
		
		// IJKL für Player-Sprite-Offset Anpassung (Debug)
		// I = hoch, K = runter, J = links, L = rechts
		const offsetStep = 1;
		if (key.toLowerCase() === 'i' || code === 'KeyI') {
			playerSpriteOffsetY -= offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${playerSpriteOffsetX}, Y=${playerSpriteOffsetY}`);
			return true;
		}
		if (key.toLowerCase() === 'k' || code === 'KeyK') {
			// K für Sprite runter (außer wenn Fehler vorhanden)
			if (!lastError) {
				playerSpriteOffsetY += offsetStep;
				console.log(`[Building] Player Sprite Offset: X=${playerSpriteOffsetX}, Y=${playerSpriteOffsetY}`);
				return true;
			}
			// Ansonsten Fehler kopieren
			copyErrorToClipboard();
			return true;
		}
		if (key.toLowerCase() === 'j' || code === 'KeyJ') {
			playerSpriteOffsetX -= offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${playerSpriteOffsetX}, Y=${playerSpriteOffsetY}`);
			return true;
		}
		if (key.toLowerCase() === 'l' || code === 'KeyL') {
			playerSpriteOffsetX += offsetStep;
			console.log(`[Building] Player Sprite Offset: X=${playerSpriteOffsetX}, Y=${playerSpriteOffsetY}`);
			return true;
		}
		
		// ESC zum Schließen/Verlassen
		if (key === 'Escape' || code === 'Escape') {
			if (dialogOpen) {
				closeDialog();
			} else {
				exitBuilding();
			}
			return true;
		}
		
		// TAB für Karte
		if (key === 'Tab' || code === 'Tab') {
			if (!dialogOpen && onOpenMap) {
				onOpenMap();
			}
			return true;
		}
		
		// E für Interaktion
		if (key.toLowerCase() === BUILDING_CONFIG.interactKey || code === BUILDING_CONFIG.interactCode) {
			if (dialogOpen) return true;
			
			if (isNearNPC) {
				openNPCDialog();
				return true;
			}
			
			if (isNearExit) {
				if (onOpenMap) onOpenMap();
				return true;
			}
		}
		
		// Dialog-Navigation
		if (dialogOpen && dialogMenu.length > 0) {
			if (key === 'ArrowUp' || code === 'ArrowUp') {
				dialogMenuIndex = Math.max(0, dialogMenuIndex - 1);
				return true;
			}
			if (key === 'ArrowDown' || code === 'ArrowDown') {
				dialogMenuIndex = Math.min(dialogMenu.length - 1, dialogMenuIndex + 1);
				return true;
			}
			if (key === 'Enter' || code === 'Enter') {
				selectDialogOption(dialogMenuIndex);
				return true;
			}
		}
		
		return false;
	}
	
	/**
	 * Prüft ob ein Gebäude aktiv ist
	 */
	function isActive() {
		return currentBuildingId !== null;
	}
	
	/**
	 * Gibt das aktuelle Gebäude zurück
	 */
	function getCurrentBuilding() {
		return {
			id: currentBuildingId,
			data: currentBuilding
		};
	}
	
	/**
	 * Hilfsfunktion: Farbe anpassen
	 */
	function adjustColor(hex, amount) {
		const color = hex.replace('#', '');
		const r = Math.max(0, Math.min(255, parseInt(color.substr(0, 2), 16) + amount));
		const g = Math.max(0, Math.min(255, parseInt(color.substr(2, 2), 16) + amount));
		const b = Math.max(0, Math.min(255, parseInt(color.substr(4, 2), 16) + amount));
		return `rgb(${r}, ${g}, ${b})`;
	}
	
	/**
	 * Fehler aufzeichnen
	 */
	function recordError(error, context) {
		const errorInfo = {
			message: error.message || String(error),
			stack: error.stack || '',
			context: context,
			timestamp: new Date().toISOString(),
			buildingId: currentBuildingId,
			playerPos: { ...playerPos }
		};
		lastError = errorInfo;
		errorStack.push(errorInfo);
		if (errorStack.length > 10) errorStack.shift(); // Max 10 Fehler behalten
		console.error(`[Building Error] ${context}:`, error);
		
		// Error auch in window für einfaches Kopieren
		window.BUILDING_LAST_ERROR = errorInfo;
		window.BUILDING_ERROR_STACK = errorStack;
	}
	
	/**
	 * Rendert Error-Box auf Canvas (kopierbar per Button)
	 */
	function renderErrorBox(ctx2d, canvas) {
		if (!lastError) return;
		
		const boxWidth = Math.min(canvas.width - 40, 600);
		const boxHeight = 200;
		const boxX = (canvas.width - boxWidth) / 2;
		const boxY = 60;
		
		// Hintergrund (rot/dunkel)
		ctx2d.fillStyle = 'rgba(80, 0, 0, 0.95)';
		ctx2d.strokeStyle = '#ff3333';
		ctx2d.lineWidth = 3;
		ctx2d.beginPath();
		ctx2d.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
		ctx2d.fill();
		ctx2d.stroke();
		
		// Titel
		ctx2d.fillStyle = '#ff6666';
		ctx2d.font = 'bold 18px Arial';
		ctx2d.textAlign = 'left';
		ctx2d.textBaseline = 'top';
		ctx2d.fillText('⚠ FEHLER im Gebäude-System', boxX + 15, boxY + 15);
		
		// Fehler-Message
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = '14px Consolas, monospace';
		const msgLines = wrapText(lastError.message, boxWidth - 30, ctx2d);
		msgLines.slice(0, 3).forEach((line, i) => {
			ctx2d.fillText(line, boxX + 15, boxY + 45 + i * 18);
		});
		
		// Kontext
		ctx2d.fillStyle = '#aaaaaa';
		ctx2d.font = '12px Arial';
		ctx2d.fillText(`Kontext: ${lastError.context}  |  Gebäude: ${lastError.buildingId || 'keins'}`, boxX + 15, boxY + 110);
		ctx2d.fillText(`Zeit: ${lastError.timestamp}`, boxX + 15, boxY + 128);
		
		// Kopier-Anleitung
		if (copiedFeedback > 0) {
			ctx2d.fillStyle = '#00ff00';
			ctx2d.font = 'bold 18px Arial';
			ctx2d.fillText('✓ KOPIERT! Jetzt einfügen mit Strg+V', boxX + 15, boxY + 155);
			copiedFeedback--;
		} else {
			ctx2d.fillStyle = '#00ff00';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.fillText('[K] FEHLER KOPIEREN', boxX + 15, boxY + 155);
		}
		
		// ESC zum Schließen
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.6)';
		ctx2d.font = '12px Arial';
		ctx2d.textAlign = 'right';
		ctx2d.fillText('[C] Fehler löschen  |  [ESC] Zurück zur Stadt', boxX + boxWidth - 15, boxY + boxHeight - 12);
	}
	
	/**
	 * Text umbrechen
	 */
	function wrapText(text, maxWidth, ctx2d) {
		const words = text.split(' ');
		const lines = [];
		let currentLine = '';
		
		for (const word of words) {
			const testLine = currentLine ? `${currentLine} ${word}` : word;
			const metrics = ctx2d.measureText(testLine);
			if (metrics.width > maxWidth && currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		}
		if (currentLine) lines.push(currentLine);
		return lines;
	}
	
	/**
	 * Fehler löschen
	 */
	function clearErrors() {
		lastError = null;
		errorStack = [];
		window.BUILDING_LAST_ERROR = null;
		window.BUILDING_ERROR_STACK = [];
	}
	
	/**
	 * Fehler in Zwischenablage kopieren
	 */
	async function copyErrorToClipboard() {
		if (!lastError) return false;
		
		const errorText = `=== BUILDING ERROR ===
Message: ${lastError.message}
Context: ${lastError.context}
Building: ${lastError.buildingId || 'none'}
Time: ${lastError.timestamp}
Player Position: x=${lastError.playerPos?.x}, y=${lastError.playerPos?.y}

Stack Trace:
${lastError.stack || 'N/A'}
======================`;
		
		try {
			await navigator.clipboard.writeText(errorText);
			console.log('[Building] Fehler in Zwischenablage kopiert!');
			// Kurze Bestätigung anzeigen
			copiedFeedback = 120; // ~2 Sekunden
			return true;
		} catch (err) {
			console.error('[Building] Konnte nicht kopieren:', err);
			// Fallback: In prompt anzeigen
			window.prompt('Fehler (Strg+C zum Kopieren):', errorText);
			return false;
		}
	}
	
	// Feedback für Kopieren
	let copiedFeedback = 0;
	
	/**
	 * Sichere Update-Funktion mit Error-Handling
	 */
	function safeUpdate(dt, keys) {
		try {
			update(dt, keys);
		} catch (error) {
			recordError(error, 'update');
		}
	}
	
	/**
	 * Sichere Render-Funktion mit Error-Handling
	 */
	function safeRender(ctx2d) {
		try {
			render(ctx2d);
		} catch (error) {
			recordError(error, 'render');
			
			// Fallback: Mindest-Hintergrund zeichnen
			const canvas = getCanvas();
			if (canvas) {
				ctx2d.fillStyle = '#1a0000';
				ctx2d.fillRect(0, 0, canvas.width, canvas.height);
			}
		}
		
		// Fehler-Box immer anzeigen wenn vorhanden
		if (lastError) {
			const canvas = getCanvas();
			if (canvas) {
				renderErrorBox(ctx2d, canvas);
			}
		}
	}
	
	/**
	 * Kopiert NPC/Exit Positionen für aktuelles Gebäude + speichert sie
	 */
	function copyPositionsToClipboard() {
		// Speichere die aktuelle Position automatisch
		saveCurrentBuildingPosition();
		
		const positionCode = `// Position für Gebäude: ${currentBuilding?.name || currentBuildingId || 'unbekannt'}
"${currentBuildingId}": {
  "npc": { "x": ${debugNpcOffset.x.toFixed(2)}, "y": ${debugNpcOffset.y.toFixed(2)} },
  "exit": { "x": ${debugExitOffset.x.toFixed(2)}, "y": ${debugExitOffset.y.toFixed(2)} }
}`;
		
		navigator.clipboard.writeText(positionCode).then(() => {
			console.log('[Building] Position kopiert & gespeichert!');
			alert('✅ Position gespeichert & kopiert!\n\n' + positionCode);
		}).catch(err => {
			console.error('[Building] Kopieren fehlgeschlagen:', err);
		});
	}
	
	/**
	 * Exportiert ALLE gespeicherten Portal-Positionen als JSON
	 * Zum Kopieren und Senden an den Entwickler
	 */
	function exportAllPositionsToClipboard() {
		// Aktuelle Position auch speichern falls geändert
		if (currentBuildingId) {
			saveCurrentBuildingPosition();
		}
		
		const exportData = {
			_info: "Portal-Positionen für alle Gebäude - Schick diese Daten an den Entwickler!",
			_generiert: new Date().toISOString(),
			positionen: savedBuildingPositions
		};
		
		const jsonString = JSON.stringify(exportData, null, 2);
		
		navigator.clipboard.writeText(jsonString).then(() => {
			console.log('[Building] Alle Positionen exportiert!');
			alert('📋 ALLE Portal-Positionen exportiert!\n\nAnzahl Gebäude: ' + Object.keys(savedBuildingPositions).length + '\n\nDie JSON-Daten wurden in die Zwischenablage kopiert.\nSchicke sie an den Entwickler!');
		}).catch(err => {
			console.error('[Building] Export fehlgeschlagen:', err);
			// Fallback: Zeige die Daten im Alert zum manuellen Kopieren
			alert('⚠️ Zwischenablage nicht verfügbar!\n\nKopiere diese Daten manuell:\n\n' + jsonString);
		});
	}
	
	/**
	 * Maus-Handler für Debug-Drag-Modus und Grid-Editor
	 */
	function handleMouseDown(x, y, button = 0) {
		console.log(`[BuildingScene] handleMouseDown: x=${x.toFixed(0)}, y=${y.toFixed(0)}, button=${button}, gridEditMode=${gridEditMode}`);
		
		// Grid-Editor hat Priorität
		if (gridEditMode) {
			const { col, row } = mouseToGridCell(x, y);
			lastPaintedCell = `${col},${row}`;
			console.log(`[Grid] Click at col=${col}, row=${row}`);
			
			if (button === 0) { // Linksklick = markieren
				isGridPainting = true;
				console.log(`[Grid] Painting started! isGridPainting=${isGridPainting}`);
				markGridCell(col, row);
				return true;
			} else if (button === 2) { // Rechtsklick = entfernen
				isGridErasing = true;
				console.log(`[Grid] Erasing started! isGridErasing=${isGridErasing}`);
				removeGridCell(col, row);
				return true;
			}
			return false;
		}
		
		// Debug-Drag-Modus
		if (!debugDragMode || !buildingLayout) return false;
		
		const npcPos = getNPCPosition();
		const exitPos = getExitPosition();
		
		console.log(`[Debug] MouseDown at x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
		if (npcPos) console.log(`[Debug] NPC at x=${npcPos.x.toFixed(0)}, y=${npcPos.y.toFixed(0)}`);
		if (exitPos) console.log(`[Debug] Exit at x=${exitPos.x.toFixed(0)}, y=${exitPos.y.toFixed(0)}`);
		
		// Prüfe ob Klick auf NPC - Sprite ist etwa 120px hoch, gezeichnet von (y-120) bis y
		if (npcPos) {
			const npcCenterY = npcPos.y - 60; // Mitte des NPC-Sprites (ca. 120px hoch)
			const distNpc = Math.sqrt((x - npcPos.x) ** 2 + (y - npcCenterY) ** 2);
			console.log(`[Debug] NPC dist: ${distNpc.toFixed(0)}`);
			if (distNpc < 200) { // Sehr großer Radius für einfaches Greifen
				dragTarget = 'npc';
				console.log('[Building] Ziehe NPC...');
				return true;
			}
		}
		
		// Prüfe ob Klick auf Exit - größerer Radius
		if (exitPos) {
			const exitCenterY = exitPos.y - 40; // Teleporter-Mitte
			const distExit = Math.sqrt((x - exitPos.x) ** 2 + (y - exitCenterY) ** 2);
			console.log(`[Debug] Exit dist: ${distExit.toFixed(0)}`);
			if (distExit < 150) { // Viel größerer Radius
				dragTarget = 'exit';
				console.log('[Building] Ziehe Teleporter...');
				return true;
			}
		}
		
		return false;
	}
	
	function handleMouseMove(x, y) {
		// Debug: Zeige alle Bewegungen im Grid-Edit-Modus
		if (gridEditMode) {
			// Nur loggen wenn Maustaste gedrückt
			if (isGridPainting || isGridErasing) {
				console.log(`[Grid] handleMouseMove: x=${x.toFixed(0)}, y=${y.toFixed(0)}, painting=${isGridPainting}, erasing=${isGridErasing}`);
			}
		}
		
		// Grid-Editor Malen - fortlaufend während Maustaste gedrückt
		if (gridEditMode && (isGridPainting || isGridErasing)) {
			const { col, row } = mouseToGridCell(x, y);
			const cellKey = `${col},${row}`;
			
			// Nur wenn neue Zelle (verhindert Spam)
			if (cellKey !== lastPaintedCell) {
				lastPaintedCell = cellKey;
				console.log(`[Grid] Move: col=${col}, row=${row}, painting=${isGridPainting}, erasing=${isGridErasing}`);
				
				if (isGridPainting) {
					markGridCell(col, row);
				} else if (isGridErasing) {
					removeGridCell(col, row);
				}
			}
			return true;
		}
		
		// Debug-Drag-Modus
		if (!debugDragMode || !dragTarget || !buildingLayout) return false;
		
		const canvas = getCanvas();
		if (!canvas) return false;
		
		// Berechne relative X-Position (0-1)
		const relX = Math.max(0.1, Math.min(0.9, (x - buildingLayout.buildingLeft) / buildingLayout.buildingWidth));
		
		// Berechne relative Y-Position (0-1) - frei beweglich
		const relY = Math.max(0.2, Math.min(0.95, y / canvas.height));
		
		console.log(`[Debug] Mouse: x=${x.toFixed(0)}, y=${y.toFixed(0)} -> relX=${relX.toFixed(2)}, relY=${relY.toFixed(2)}`);
		
		if (dragTarget === 'npc') {
			debugNpcOffset.x = relX;
			debugNpcOffset.y = relY;
		} else if (dragTarget === 'exit') {
			debugExitOffset.x = relX;
			debugExitOffset.y = relY;
		}
		
		return true;
	}
	
	function handleMouseUp(button = 0) {
		// Grid-Editor beenden
		if (button === 0) {
			isGridPainting = false;
		}
		if (button === 2) {
			isGridErasing = false;
		}
		lastPaintedCell = null;
		
		// Debug-Drag-Modus
		if (dragTarget) {
			console.log(`[Building] ${dragTarget === 'npc' ? 'NPC' : 'Teleporter'} platziert.`);
			dragTarget = null;
			return true;
		}
		return false;
	}
	
	return {
		enterBuilding,
		exitBuilding,
		update: safeUpdate,
		render: safeRender,
		handleKeyDown,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		isActive,
		getCurrentBuilding,
		get dialogOpen() { return dialogOpen; },
		get isGridEditMode() { return gridEditMode; },
		get currentBuildingId() { return currentBuildingId; },
		closeDialog,
		clearErrors,
		getLastError: () => lastError,
		getErrorStack: () => [...errorStack]
	};
}

export default { createBuildingSystem, BUILDING_CONFIG };
