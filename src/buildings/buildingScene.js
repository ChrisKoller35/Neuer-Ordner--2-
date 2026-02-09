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
	let playerPos = { x: 150, y: 0 }; // Pixel-Position
	let playerFloor = 0; // Aktuelles Stockwerk (0 = unten)
	let playerDir = 1; // Blickrichtung (1 = rechts, -1 = links)
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
	let debugDragMode = false;
	let dragTarget = null; // 'npc' oder 'exit'
	let debugNpcOffset = { x: 0.71, y: 0.74 }; // Standard-Position für alle Gebäude
	let debugExitOffset = { x: 0.72, y: 0.95 }; // Standard-Position für alle Gebäude
	
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
		
		const canvas = getCanvas();
		if (!canvas) return false;
		
		// Layout generieren
		buildingLayout = generateBuildingLayout(canvas, buildingId);
		
		// NPC-Sprite erstellen
		if (currentBuilding.npc) {
			npcSprite = createNPCPlaceholder(currentBuilding.npc.id, currentBuilding.npc.name);
		}
		
		// Spieler-Startposition (Stock 0 = unten/Braun)
		playerPos = { x: buildingLayout.buildingLeft + 100, y: 0 };
		playerFloor = 0; // Spieler startet unten
		playerDir = 1;
		floorChangeDelay = 0; // Delay zurücksetzen
		
		console.log(`[Building] Start auf Stock: ${playerFloor}, Floors: ${BUILDING_CONFIG.floors}`);
		
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
		
		console.log(`[Building] Verlassen: ${currentBuilding?.name}`);
		
		currentBuildingId = null;
		currentBuilding = null;
		buildingLayout = null;
		npcSprite = null;
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
	 * Prüft Proximity zu NPC und Exit
	 */
	function checkProximity() {
		if (!buildingLayout) return;
		
		// NPC-Proximity
		const npcPos = getNPCPosition();
		if (npcPos && playerFloor === npcPos.floor) {
			const dist = Math.abs(playerPos.x - npcPos.x);
			isNearNPC = dist < BUILDING_CONFIG.interactRadius;
		} else {
			isNearNPC = false;
		}
		
		// Exit-Proximity
		const exitPos = getExitPosition();
		if (exitPos && playerFloor === exitPos.floor) {
			const dist = Math.abs(playerPos.x - exitPos.x);
			isNearExit = dist < BUILDING_CONFIG.interactRadius;
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
	
	// Verzögerung für Stockwerkswechsel
	let floorChangeDelay = 0;
	
	/**
	 * Update-Funktion
	 */
	function update(dt, keys) {
		if (!currentBuildingId || !buildingLayout) return;
		
		animTime += dt;
		if (floorChangeDelay > 0) floorChangeDelay -= dt;
		
		// Dialog offen = keine Bewegung
		if (dialogOpen) return;
		
		const canvas = getCanvas();
		if (!canvas) return;
		
		// Sicherstellen dass playerFloor gültig ist
		if (playerFloor < 0) playerFloor = 0;
		if (playerFloor >= BUILDING_CONFIG.floors) playerFloor = BUILDING_CONFIG.floors - 1;
		
		const floor = buildingLayout.floors[playerFloor];
		if (!floor) return;
		
		// Spieler-Bewegung (horizontal)
		const speed = BUILDING_CONFIG.playerSpeed * dt;
		
		if (keys.left) {
			playerPos.x = Math.max(floor.left, playerPos.x - speed);
			playerDir = -1;
		}
		if (keys.right) {
			playerPos.x = Math.min(floor.right, playerPos.x + speed);
			playerDir = 1;
		}
		
		// Stockwerk wechseln (bei Leiter + entsprechende Taste)
		const atLadder = canUseDoor();
		const delayOk = floorChangeDelay <= 0;
		
		if (atLadder && delayOk) {
			// W oder Pfeil-Hoch = Stockwerk hoch
			if (keys.up && playerFloor < BUILDING_CONFIG.floors - 1) {
				playerFloor++;
				floorChangeDelay = 400; // Erhöht auf 400ms
				console.log(`[Building] Stock HOCH: ${playerFloor}`);
			}
			// S oder Pfeil-Runter = Stockwerk runter - JETZT AUCH WENN playerFloor === 0 NICHT BLOCKIERT
			if (keys.down) {
				if (playerFloor > 0) {
					playerFloor--;
					floorChangeDelay = 400;
					console.log(`[Building] Stock RUNTER: ${playerFloor}`);
				} else {
					console.log(`[Building] Bereits auf Stock 0, kann nicht tiefer!`);
				}
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
	
	function renderBuilding(ctx2d, canvas) {
		if (!buildingLayout) return;
		
		const { color, buildingLeft, buildingRight, buildingWidth, startY, floorHeight, floors } = buildingLayout;
		
		// Schwarzer Hintergrund (klar, keine Verwirrung)
		ctx2d.fillStyle = '#000000';
		ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		
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
		
		// Hinweis bei Leiter
		if (canUseDoor()) {
			const floor = buildingLayout.floors[playerFloor];
			ctx2d.fillStyle = '#00ff00';
			ctx2d.font = 'bold 14px Arial';
			ctx2d.textAlign = 'center';
			
			// Zeige welche Richtung möglich ist
			let hint = '';
			if (playerFloor < BUILDING_CONFIG.floors - 1 && playerFloor > 0) {
				hint = '[W] Hoch  |  [S] Runter';
			} else if (playerFloor === 0) {
				hint = '[W] Hoch';
			} else if (playerFloor === BUILDING_CONFIG.floors - 1) {
				hint = '[S] Runter';
			}
			ctx2d.fillText(hint, buildingLayout.doors[0].x + BUILDING_CONFIG.doorWidth / 2, floor.y - BUILDING_CONFIG.doorHeight - 10);
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
		
		// NPC als einfacher Kreis
		const radius = isNearNPC ? 35 : 30;
		
		if (isNearNPC) {
			ctx2d.shadowColor = '#ffcc00';
			ctx2d.shadowBlur = 15;
		}
		
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
		
		ctx2d.shadowBlur = 0;
		
		// NPC-Name
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 14px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.8)';
		ctx2d.shadowBlur = 3;
		ctx2d.fillText(currentBuilding.npc.name, x, y - 75 + bob);
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
		
		const floor = buildingLayout.floors[playerFloor];
		if (!floor) return;
		
		const x = playerPos.x;
		const y = floor.walkableY;
		
		// Player-Sprite laden wenn verfügbar
		let playerSprite = null;
		if (typeof getPlayerSprite === 'function') {
			playerSprite = getPlayerSprite();
		}
		
		ctx2d.save();
		ctx2d.translate(x, y);
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
		
		// Stock-Anzeige oben links mit Debug-Info
		ctx2d.fillStyle = 'rgba(0, 0, 0, 0.8)';
		ctx2d.fillRect(10, 55, 350, 120);
		ctx2d.fillStyle = '#00ff00';
		ctx2d.font = 'bold 16px Arial';
		ctx2d.textAlign = 'left';
		ctx2d.textBaseline = 'top';
		
		// Erweiterte Debug-Anzeige
		const currentFloorData = buildingLayout?.floors?.[playerFloor];
		const playerY = currentFloorData?.walkableY || 0;
		ctx2d.fillText(`playerFloor = ${playerFloor} | Player Y = ${playerY.toFixed(0)}`, 20, 60);
		
		// Zeige Y-Werte aller Stockwerke
		ctx2d.fillStyle = '#ffff00';
		ctx2d.font = '12px Arial';
		if (buildingLayout?.floors) {
			buildingLayout.floors.forEach((f, i) => {
				const color = DEBUG_FLOOR_COLORS[i];
				ctx2d.fillText(`Floor ${i}: y=${f.y.toFixed(0)}, walkY=${f.walkableY.toFixed(0)} [${color}]`, 20, 80 + i * 15);
			});
		}
		
		ctx2d.fillStyle = canUseDoor() ? '#00ff00' : '#ff6666';
		ctx2d.font = 'bold 13px Arial';
		ctx2d.fillText(`Leiter: ${canUseDoor() ? '✓ JA - W/S drücken!' : '✗ Zur Mitte gehen'}`, 20, 130);
		
		ctx2d.fillStyle = '#aaaaaa';
		ctx2d.font = '11px Arial';
		ctx2d.fillText(`Tür: ${buildingLayout?.doors?.[0]?.x?.toFixed(0) || '?'}-${((buildingLayout?.doors?.[0]?.x || 0) + BUILDING_CONFIG.doorWidth).toFixed(0)}`, 20, 150);
		
		// DEBUG DRAG MODE Anzeige
		if (debugDragMode) {
			ctx2d.fillStyle = 'rgba(255, 0, 255, 0.9)';
			ctx2d.fillRect(canvas.width - 320, 10, 310, 110);
			ctx2d.fillStyle = '#ffffff';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText('🔧 DEBUG DRAG MODE', canvas.width - 310, 15);
			ctx2d.font = '12px Arial';
			ctx2d.fillText('Klicke & ziehe NPC oder Teleporter', canvas.width - 310, 35);
			ctx2d.fillText(`NPC: x=${debugNpcOffset.x.toFixed(2)}, y=${debugNpcOffset.y.toFixed(2)}`, canvas.width - 310, 55);
			ctx2d.fillText(`EXIT: x=${debugExitOffset.x.toFixed(2)}, y=${debugExitOffset.y.toFixed(2)}`, canvas.width - 310, 75);
			ctx2d.fillStyle = '#ffff00';
			ctx2d.fillText('[C] Position kopieren | [P] Beenden', canvas.width - 310, 95);
		}
		
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
		if (!currentBuildingId) return false;
		
		// P für Debug-Drag-Modus toggle
		if (key.toLowerCase() === 'p' || code === 'KeyP') {
			debugDragMode = !debugDragMode;
			console.log(`[Building] Debug-Drag-Modus: ${debugDragMode ? 'AN' : 'AUS'}`);
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
		
		// K zum Fehler kopieren
		if ((key.toLowerCase() === 'k' || code === 'KeyK') && lastError) {
			copyErrorToClipboard();
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
			playerPos: { ...playerPos },
			playerFloor
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
Player Floor: ${lastError.playerFloor}

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
	 * Kopiert NPC/Exit Positionen in die Zwischenablage
	 */
	function copyPositionsToClipboard() {
		const positionCode = `// Position für Gebäude: ${currentBuilding?.name || 'unbekannt'}
NPC: { x: ${debugNpcOffset.x.toFixed(2)}, y: ${debugNpcOffset.y.toFixed(2)} }
EXIT: { x: ${debugExitOffset.x.toFixed(2)}, y: ${debugExitOffset.y.toFixed(2)} }`;
		
		navigator.clipboard.writeText(positionCode).then(() => {
			console.log('[Building] Positionen kopiert!');
			alert('Positionen kopiert!\n\n' + positionCode);
		}).catch(err => {
			console.error('[Building] Kopieren fehlgeschlagen:', err);
		});
	}
	
	/**
	 * Maus-Handler für Debug-Drag-Modus
	 */
	function handleMouseDown(x, y) {
		if (!debugDragMode || !buildingLayout) return false;
		
		const npcPos = getNPCPosition();
		const exitPos = getExitPosition();
		
		console.log(`[Debug] MouseDown at x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
		if (npcPos) console.log(`[Debug] NPC at x=${npcPos.x.toFixed(0)}, y=${npcPos.y.toFixed(0)}`);
		if (exitPos) console.log(`[Debug] Exit at x=${exitPos.x.toFixed(0)}, y=${exitPos.y.toFixed(0)}`);
		
		// Prüfe ob Klick auf NPC - größerer Radius und Y korrigieren (Kreis wird oberhalb von walkableY gezeichnet)
		if (npcPos) {
			const npcCenterY = npcPos.y - 30; // Kreis-Mitte ist 30px über walkableY
			const distNpc = Math.sqrt((x - npcPos.x) ** 2 + (y - npcCenterY) ** 2);
			console.log(`[Debug] NPC dist: ${distNpc.toFixed(0)}`);
			if (distNpc < 150) { // Viel größerer Radius
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
	
	function handleMouseUp() {
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
		closeDialog,
		clearErrors,
		getLastError: () => lastError,
		getErrorStack: () => [...errorStack]
	};
}

export default { createBuildingSystem, BUILDING_CONFIG };
