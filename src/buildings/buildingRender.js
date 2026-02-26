// ============================================================
// BUILDING RENDER - Alle Render-Funktionen für Gebäude-Szenen
// ============================================================
// Rendert Gebäude-Layout, NPC, Spieler, Dialog, Grid-Editor, Error-Box

import {
	BUILDING_CONFIG,
	BUILDING_GRID_CELL_SIZE,
	BUILDING_GRID_COLS,
	BUILDING_GRID_ROWS,
	BUILDING_GRID_OFFSET_X
} from './buildingScene.js';

// DEBUG: Stockwerk-Farben für klare Unterscheidung
const DEBUG_FLOOR_COLORS = ['#8B4513', '#228B22', '#4169E1']; // Braun=0, Grün=1, Blau=2
const SHOW_DEBUG_FLOORS = false; // DEBUG: Auf true setzen um Platzhalter-Stockwerke anzuzeigen

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
 * Erstellt das Building-Renderer-System
 * @param {Object} bState - Shared mutable state
 * @param {Object} ctx - Externe Abhängigkeiten (getCanvas, getPlayerSprite)
 * @param {Object} helpers - Interne Helfer (getNPCPosition, getExitPosition, getWalkableGrid)
 */
export function createBuildingRenderer(bState, ctx, helpers) {
	const { getCanvas, getPlayerSprite } = ctx;
	const { getNPCPosition, getExitPosition, getWalkableGrid } = helpers;
	
	// Exit-Teleporter Konstante
	const EXIT_FLOOR = 0;
	
	/**
	 * Rendert das Gebäude-Layout (Wände, Böden, Stockwerke)
	 */
	function renderBuilding(ctx2d, canvas) {
		if (!bState.buildingLayout) return;
		
		const { color, buildingLeft, buildingRight, buildingWidth, startY, floorHeight, floors } = bState.buildingLayout;
		
		// Hintergrundbild zeichnen (wenn geladen), sonst schwarzer Fallback
		if (bState.backgroundImage && bState.backgroundLoaded && bState.backgroundImage.naturalWidth > 0) {
			const imgRatio = bState.backgroundImage.naturalWidth / bState.backgroundImage.naturalHeight;
			const canvasRatio = canvas.width / canvas.height;
			let drawW, drawH, drawX, drawY;
			if (imgRatio > canvasRatio) {
				drawH = canvas.height;
				drawW = drawH * imgRatio;
				drawX = (canvas.width - drawW) / 2;
				drawY = 0;
			} else {
				drawW = canvas.width;
				drawH = drawW / imgRatio;
				drawX = 0;
				drawY = canvas.height - drawH;
			}
			ctx2d.drawImage(bState.backgroundImage, drawX, drawY, drawW, drawH);
		} else {
			ctx2d.fillStyle = '#000000';
			ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		}
		
		// DEBUG: Platzhalter nur anzeigen wenn aktiviert
		if (!SHOW_DEBUG_FLOORS) return;
		
		// Außenwände
		ctx2d.fillStyle = '#333333';
		ctx2d.fillRect(buildingLeft, startY - (floors.length * floorHeight), BUILDING_CONFIG.wallThickness, floors.length * floorHeight + 15);
		ctx2d.fillRect(buildingRight - BUILDING_CONFIG.wallThickness, startY - (floors.length * floorHeight), BUILDING_CONFIG.wallThickness, floors.length * floorHeight + 15);
		
		// DEBUG: Jedes Stockwerk mit eigener Farbe zeichnen
		floors.forEach((floor, i) => {
			const debugColor = DEBUG_FLOOR_COLORS[i] || '#888888';
			
			ctx2d.fillStyle = debugColor;
			const floorBottom = floor.y;
			const floorTop = floor.y - floorHeight;
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
		
		// Türöffnungen
		ctx2d.fillStyle = '#1a1a1a';
		for (const door of bState.buildingLayout.doors) {
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
				ctx2d.beginPath();
				ctx2d.moveTo(lx - 15, ly);
				ctx2d.lineTo(lx - 15, ly - BUILDING_CONFIG.doorHeight);
				ctx2d.moveTo(lx + 15, ly);
				ctx2d.lineTo(lx + 15, ly - BUILDING_CONFIG.doorHeight);
				ctx2d.stroke();
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
	 * Rendert den Exit-Teleporter
	 */
	function renderExitTeleporter(ctx2d, canInteract = false) {
		const exitPos = getExitPosition();
		if (!exitPos) return;
		
		const x = exitPos.x;
		const y = exitPos.y;
		
		const alpha = canInteract ? 1.0 : 0.3;
		
		ctx2d.save();
		ctx2d.globalAlpha = alpha;
		
		// Plattform
		ctx2d.fillStyle = '#37474f';
		ctx2d.beginPath();
		ctx2d.ellipse(x, y + 5, 35, 12, 0, 0, Math.PI * 2);
		ctx2d.fill();
		
		// Portal-Glow (animiert)
		const pulse = Math.sin(bState.animTime * 0.005) * 0.2;
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
		
		// Glow bei Nähe
		if (canInteract && bState.isNearExit) {
			ctx2d.shadowColor = '#00e5ff';
			ctx2d.shadowBlur = 20;
			ctx2d.strokeStyle = '#ffffff';
			ctx2d.stroke();
			ctx2d.shadowBlur = 0;
		}
		
		ctx2d.restore();
		
		// Label
		ctx2d.fillStyle = canInteract ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
		ctx2d.font = 'bold 11px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.fillText(`AUSGANG (Stock ${EXIT_FLOOR})`, x, y - 95);
		
		// Interaktions-Hinweis
		if (canInteract && bState.isNearExit && !bState.dialogOpen) {
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
		if (!npcPos || !bState.currentBuilding?.npc) return;
		
		const x = npcPos.x;
		const y = npcPos.y;
		const bob = Math.sin(bState.animTime * BUILDING_CONFIG.npcBobSpeed) * BUILDING_CONFIG.npcBobAmount;
		
		const spriteLoaded = bState.npcSprite && bState.npcSprite.complete && bState.npcSprite.naturalWidth > 0;
		
		if (bState.isNearNPC) {
			ctx2d.shadowColor = '#ffcc00';
			ctx2d.shadowBlur = 15;
		}
		
		if (spriteLoaded) {
			const spriteWidth = bState.npcSprite.naturalWidth;
			const spriteHeight = bState.npcSprite.naturalHeight;
			const scale = Math.min(180 / spriteHeight, 2.2);
			const drawWidth = spriteWidth * scale;
			const drawHeight = spriteHeight * scale;
			
			ctx2d.drawImage(
				bState.npcSprite,
				x - drawWidth / 2,
				y - drawHeight,
				drawWidth,
				drawHeight
			);
		} else {
			const radius = bState.isNearNPC ? 35 : 30;
			
			ctx2d.fillStyle = '#ff6600';
			ctx2d.beginPath();
			ctx2d.arc(x, y - radius + bob, radius, 0, Math.PI * 2);
			ctx2d.fill();
			
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
		ctx2d.fillText(bState.currentBuilding.npc.name, x, y - (spriteLoaded ? 190 : 75));
		ctx2d.shadowBlur = 0;
		
		// Interaktions-Hinweis
		if (bState.isNearNPC && !bState.dialogOpen) {
			ctx2d.fillStyle = '#ffcc00';
			ctx2d.font = '12px Arial';
			ctx2d.fillText('[E] Sprechen', x, y + 15);
		}
	}
	
	/**
	 * Rendert den Spieler
	 */
	function renderPlayer(ctx2d) {
		if (!bState.buildingLayout) return;
		
		const x = bState.playerPos.x;
		const y = bState.playerPos.y;
		
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
		ctx2d.translate(x + bState.playerSpriteOffsetX, y + bState.playerSpriteOffsetY);
		if (bState.playerDir === -1) {
			ctx2d.scale(-1, 1);
		}
		
		if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
			const scale = 0.15;
			const pw = playerSprite.naturalWidth * scale;
			const ph = playerSprite.naturalHeight * scale;
			ctx2d.drawImage(playerSprite, -pw / 2, -ph, pw, ph);
		} else {
			// Platzhalter-Spieler (Fisch-Form)
			ctx2d.fillStyle = '#00aaff';
			ctx2d.beginPath();
			ctx2d.ellipse(0, -30, 25, 18, 0, 0, Math.PI * 2);
			ctx2d.fill();
			
			ctx2d.beginPath();
			ctx2d.moveTo(-25, -30);
			ctx2d.lineTo(-40, -15);
			ctx2d.lineTo(-40, -45);
			ctx2d.closePath();
			ctx2d.fill();
			
			ctx2d.fillStyle = '#ffffff';
			ctx2d.beginPath();
			ctx2d.arc(12, -33, 6, 0, Math.PI * 2);
			ctx2d.fill();
			ctx2d.fillStyle = '#000000';
			ctx2d.beginPath();
			ctx2d.arc(14, -33, 3, 0, Math.PI * 2);
			ctx2d.fill();
			
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
		const boxHeight = bState.dialogMenu.length > 0 ? 180 : 100;
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
		if (bState.currentBuilding?.npc) {
			ctx2d.fillStyle = '#ffcc00';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText(bState.currentBuilding.npc.name, boxX + 20, boxY + 15);
		}
		
		// Dialog-Text
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = '14px Arial';
		ctx2d.fillText(bState.dialogText, boxX + 20, boxY + 45);
		
		// Menü-Optionen
		if (bState.dialogMenu.length > 0) {
			ctx2d.font = '13px Arial';
			bState.dialogMenu.forEach((option, i) => {
				const isSelected = i === bState.dialogMenuIndex;
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
	 * Rendert den Grid-Editor (Debug-Modus)
	 */
	function renderGridEditor(ctx2d, canvas) {
		if (!bState.gridEditMode) return;
		
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
		const playerCol = Math.floor((bState.playerPos.x - offsetX) / cellSize);
		const playerRow = Math.floor(bState.playerPos.y / cellSize);
		
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
		ctx2d.fillText(`🔧 GRID EDITOR - ${bState.currentBuilding?.name || 'Gebäude'}`, canvas.width / 2, 18);
		ctx2d.font = "13px monospace";
		ctx2d.fillText("🖱️ Linksklick halten = Zellen markieren (malen)", canvas.width / 2, 40);
		ctx2d.fillText("🖱️ Rechtsklick halten = Zellen entfernen", canvas.width / 2, 58);
		ctx2d.fillStyle = "#ffff00";
		ctx2d.fillText(`S = Speichern | R = Reset | M = Editor aus | Zellen: ${Object.keys(grid).length}`, canvas.width / 2, 78);
	}
	
	/**
	 * Rendert Error-Box auf Canvas
	 */
	function renderErrorBox(ctx2d, canvas) {
		if (!bState.lastError) return;
		
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
		const msgLines = wrapText(bState.lastError.message, boxWidth - 30, ctx2d);
		msgLines.slice(0, 3).forEach((line, i) => {
			ctx2d.fillText(line, boxX + 15, boxY + 45 + i * 18);
		});
		
		// Kontext
		ctx2d.fillStyle = '#aaaaaa';
		ctx2d.font = '12px Arial';
		ctx2d.fillText(`Kontext: ${bState.lastError.context}  |  Gebäude: ${bState.lastError.buildingId || 'keins'}`, boxX + 15, boxY + 110);
		ctx2d.fillText(`Zeit: ${bState.lastError.timestamp}`, boxX + 15, boxY + 128);
		
		// Kopier-Anleitung
		if (bState.copiedFeedback > 0) {
			ctx2d.fillStyle = '#00ff00';
			ctx2d.font = 'bold 18px Arial';
			ctx2d.fillText('✓ KOPIERT! Jetzt einfügen mit Strg+V', boxX + 15, boxY + 155);
			bState.copiedFeedback--;
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
	 * Rendert Debug-Drag-Modus UI-Overlay
	 */
	function renderDebugDragOverlay(ctx2d, canvas) {
		if (!bState.debugDragMode) return;
		
		const posCount = Object.keys(bState.savedBuildingPositions).length;
		ctx2d.fillStyle = 'rgba(255, 0, 255, 0.95)';
		ctx2d.fillRect(canvas.width - 340, 10, 330, 170);
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 16px Arial';
		ctx2d.textAlign = 'left';
		ctx2d.textBaseline = 'top';
		ctx2d.fillText('🔧 PORTAL & NPC EDITOR', canvas.width - 330, 15);
		ctx2d.font = '12px Arial';
		ctx2d.fillText(`Gebäude: ${bState.currentBuilding?.name || bState.currentBuildingId}`, canvas.width - 330, 35);
		ctx2d.fillText('Klicke & ziehe NPC oder EXIT', canvas.width - 330, 55);
		ctx2d.fillStyle = '#ff9900';
		ctx2d.fillText(`NPC: x=${bState.debugNpcOffset.x.toFixed(2)}, y=${bState.debugNpcOffset.y.toFixed(2)}`, canvas.width - 330, 75);
		ctx2d.fillStyle = '#00ffff';
		ctx2d.fillText(`EXIT: x=${bState.debugExitOffset.x.toFixed(2)}, y=${bState.debugExitOffset.y.toFixed(2)}`, canvas.width - 330, 92);
		ctx2d.fillStyle = '#ffff00';
		ctx2d.fillText('[C] Speichern & Kopieren', canvas.width - 330, 112);
		ctx2d.fillText(`[S] ALLE ${posCount} Positionen exportieren`, canvas.width - 330, 129);
		ctx2d.fillStyle = '#ff6666';
		ctx2d.fillText('[P] Editor beenden', canvas.width - 330, 149);
	}
	
	/**
	 * Rendert Debug-Info oben links
	 */
	function renderDebugInfo(ctx2d, canvas) {
		ctx2d.fillStyle = 'rgba(0, 0, 0, 0.8)';
		ctx2d.fillRect(10, 55, 400, 70);
		ctx2d.fillStyle = '#00ff00';
		ctx2d.font = 'bold 16px Arial';
		ctx2d.textAlign = 'left';
		ctx2d.textBaseline = 'top';
		
		ctx2d.fillText(`Player X = ${bState.playerPos.x.toFixed(0)} | Player Y = ${bState.playerPos.y.toFixed(0)}`, 20, 60);
		ctx2d.fillStyle = '#ffff00';
		ctx2d.font = '12px Arial';
		const col = Math.floor((bState.playerPos.x - BUILDING_GRID_OFFSET_X) / BUILDING_GRID_CELL_SIZE);
		const row = Math.floor(bState.playerPos.y / BUILDING_GRID_CELL_SIZE);
		ctx2d.fillText(`Grid: Col=${col}, Row=${row}`, 20, 80);
		
		ctx2d.fillStyle = '#00ffff';
		ctx2d.fillText(`Sprite Offset: X=${bState.playerSpriteOffsetX}, Y=${bState.playerSpriteOffsetY} (IJKL = anpassen)`, 20, 95);
	}
	
	/**
	 * Rendert Hinweise unten
	 */
	function renderBottomHints(ctx2d, canvas) {
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx2d.font = '12px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'bottom';
		ctx2d.fillText('[A/D] Bewegen  |  [W/S] Stockwerk (bei Leiter)  |  [E] Interagieren  |  [TAB] Karte  |  [ESC] Zurück  |  [P] Debug-Drag', canvas.width / 2, canvas.height - 10);
	}
	
	return {
		renderBuilding,
		renderExitTeleporter,
		renderNPC,
		renderPlayer,
		renderDialog,
		renderGridEditor,
		renderErrorBox,
		renderDebugDragOverlay,
		renderDebugInfo,
		renderBottomHints
	};
}
