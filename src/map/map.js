// ============================================================
// MAP MODULE - Weltkarte mit Gebäude-Übersicht
// ============================================================
// Öffnet sich mit 'TAB' Taste
// Zeigt alle Gebäude und deren Positionen
// Erlaubt Navigation zu Gebäuden (über Teleporter)

import { createMapIcon, createBuildingBackground } from '../core/placeholders.js';

/**
 * Map-Konstanten
 */
export const MAP_CONFIG = {
	key: 'Tab',
	code: 'Tab',
	overlayColor: 'rgba(0, 0, 0, 0.85)',
	titleColor: '#00e5ff',
	buildingHoverColor: '#ffffff',
	buildingLockedColor: '#666666',
	animationDuration: 300
};

/**
 * Erstellt das Map-System
 * @param {Object} ctx - Kontext mit Abhängigkeiten
 */
export function createMapSystem(ctx) {
	const {
		getState,
		getCanvas,
		getBuildingsData,
		onTeleportRequest
	} = ctx;
	
	// Lokaler State
	let isOpen = false;
	let selectedBuilding = null;
	let hoveredBuilding = null;
	let animationProgress = 0;
	let animationDirection = 0; // 0 = keine, 1 = öffnen, -1 = schließen
	const buildingIcons = new Map();
	const mapBackground = null;
	
	/**
	 * Initialisiert die Map-Icons
	 */
	function initIcons() {
		const buildings = getBuildingsData();
		if (!buildings) return;
		
		// Hauptstadt-Icon
		if (buildings.mainCity) {
			buildingIcons.set('main_city', createMapIcon('main_city', 'Stadt'));
		}
		
		// Gebäude-Icons
		Object.entries(buildings.buildings || {}).forEach(([id, building]) => {
			buildingIcons.set(id, createMapIcon(id, building.name));
		});
	}
	
	/**
	 * Öffnet die Karte
	 */
	function open() {
		if (isOpen) return;
		
		// Icons initialisieren wenn noch nicht geschehen
		if (buildingIcons.size === 0) {
			initIcons();
		}
		
		isOpen = true;
		animationDirection = 1;
		selectedBuilding = null;
		hoveredBuilding = null;
	}
	
	/**
	 * Schließt die Karte
	 */
	function close() {
		if (!isOpen) return;
		animationDirection = -1;
		// Auswahl zurücksetzen beim Schließen
		selectedBuilding = null;
		hoveredBuilding = null;
	}
	
	/**
	 * Wechselt den Zustand der Karte
	 */
	function toggle() {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}
	
	/**
	 * Behandelt Mausbewegung
	 */
	function handleMouseMove(x, y) {
		if (!isOpen || animationProgress < 1) return;
		
		const canvas = getCanvas();
		const buildings = getBuildingsData();
		if (!buildings || !canvas) return;
		
		hoveredBuilding = null;
		
		// Gebäude prüfen
		const allLocations = [
			...(buildings.mainCity ? [{ ...buildings.mainCity, id: 'main_city' }] : []),
			...Object.values(buildings.buildings || {})
		];
		
		allLocations.forEach(loc => {
			const bx = loc.mapPosition.x * canvas.width;
			const by = loc.mapPosition.y * canvas.height;
			const radius = 30;
			
			const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
			if (dist < radius) {
				hoveredBuilding = loc.id;
			}
		});
	}
	
	/**
	 * Behandelt Mausklick
	 */
	function handleClick(x, y) {
		if (!isOpen || animationProgress < 1) return false;
		
		const canvas = getCanvas();
		const buildings = getBuildingsData();
		if (!buildings || !canvas) return false;
		
		// Gebäude prüfen
		const allLocations = [
			...(buildings.mainCity ? [{ ...buildings.mainCity, id: 'main_city' }] : []),
			...Object.values(buildings.buildings || {})
		];
		
		for (const loc of allLocations) {
			const bx = loc.mapPosition.x * canvas.width;
			const by = loc.mapPosition.y * canvas.height;
			const radius = 45; // Größerer Klickradius für bessere UX
			
			const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
			if (dist < radius) {
				// Prüfen ob freigeschaltet
				if (loc.unlocked === false) {
					console.log(`[Map] Gebäude gesperrt: ${loc.id}`);
					selectedBuilding = null;
					return true;
				}
				
				console.log(`[Map] Gebäude ausgewählt: ${loc.id}`);
				selectedBuilding = loc.id;
				return true;
			}
		}
		
		// Click außerhalb = Auswahl aufheben
		if (selectedBuilding) {
			console.log('[Map] Auswahl aufgehoben (Klick außerhalb)');
		}
		selectedBuilding = null;
		return true;
	}
	
	/**
	 * Bestätigt die Teleportation zum ausgewählten Gebäude
	 */
	function confirmTeleport() {
		if (!selectedBuilding) {
			console.log('[Map] confirmTeleport abgebrochen - kein Gebäude ausgewählt');
			return false;
		}
		
		const buildings = getBuildingsData();
		const state = getState();
		
		console.log(`[Map] confirmTeleport zu: ${selectedBuilding}, aktuell: ${state.currentBuilding || 'Stadt'}`);
		
		// Wenn bereits am Zielort, nur Karte schließen
		// Prüfe sowohl currentBuilding als auch main_city
		const isAtMainCity = !state.currentBuilding && selectedBuilding === 'main_city';
		const isAtSameBuilding = state.currentBuilding === selectedBuilding;
		
		if (isAtMainCity || isAtSameBuilding) {
			console.log('[Map] Bereits am Zielort - schließe Karte');
			close();
			return true;
		}
		
		// Teleport-Anfrage senden
		if (onTeleportRequest) {
			console.log(`[Map] Sende Teleport-Anfrage zu: ${selectedBuilding}`);
			onTeleportRequest(selectedBuilding);
		}
		
		close();
		return true;
	}
	
	/**
	 * Update (für Animation)
	 */
	function update(dt) {
		if (animationDirection !== 0) {
			const speed = 1 / MAP_CONFIG.animationDuration * dt;
			animationProgress += animationDirection * speed;
			
			if (animationProgress >= 1) {
				animationProgress = 1;
				animationDirection = 0;
			} else if (animationProgress <= 0) {
				animationProgress = 0;
				animationDirection = 0;
				isOpen = false;
			}
		}
	}
	
	/**
	 * Rendert die Karte
	 */
	function render(ctx2d) {
		if (!isOpen && animationProgress === 0) return;
		
		const canvas = getCanvas();
		const buildings = getBuildingsData();
		const state = getState();
		
		if (!canvas || !buildings) return;
		
		const alpha = animationProgress;
		const scale = 0.8 + 0.2 * animationProgress;
		
		// Overlay
		ctx2d.save();
		ctx2d.fillStyle = MAP_CONFIG.overlayColor.replace('0.85', (0.85 * alpha).toString());
		ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		
		// Zentrieren und skalieren
		ctx2d.translate(canvas.width / 2, canvas.height / 2);
		ctx2d.scale(scale, scale);
		ctx2d.translate(-canvas.width / 2, -canvas.height / 2);
		ctx2d.globalAlpha = alpha;
		
		// Titel
		ctx2d.fillStyle = MAP_CONFIG.titleColor;
		ctx2d.font = 'bold 32px Arial, sans-serif';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'top';
		ctx2d.shadowColor = 'rgba(0, 0, 0, 0.5)';
		ctx2d.shadowBlur = 10;
		ctx2d.fillText('WELTKARTE', canvas.width / 2, 30);
		
		// Untertitel
		ctx2d.font = '16px Arial';
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.6)';
		ctx2d.fillText('Klicke auf ein Gebäude zum Teleportieren', canvas.width / 2, 70);
		
		// Verbindungslinien zeichnen
		ctx2d.shadowBlur = 0;
		ctx2d.strokeStyle = 'rgba(0, 188, 212, 0.3)';
		ctx2d.lineWidth = 2;
		ctx2d.setLineDash([5, 5]);
		
		const mainPos = buildings.mainCity?.mapPosition;
		if (mainPos) {
			const mx = mainPos.x * canvas.width;
			const my = mainPos.y * canvas.height;
			
			Object.values(buildings.buildings || {}).forEach(building => {
				if (building.unlocked !== false) {
					const bx = building.mapPosition.x * canvas.width;
					const by = building.mapPosition.y * canvas.height;
					
					ctx2d.beginPath();
					ctx2d.moveTo(mx, my);
					ctx2d.lineTo(bx, by);
					ctx2d.stroke();
				}
			});
		}
		
		ctx2d.setLineDash([]);
		
		// Alle Locations zeichnen
		const allLocations = [
			...(buildings.mainCity ? [{ ...buildings.mainCity, id: 'main_city' }] : []),
			...Object.values(buildings.buildings || {})
		];
		
		allLocations.forEach(loc => {
			const x = loc.mapPosition.x * canvas.width;
			const y = loc.mapPosition.y * canvas.height;
			const isHovered = hoveredBuilding === loc.id;
			const isSelected = selectedBuilding === loc.id;
			const isCurrent = state.currentBuilding === loc.id;
			const isLocked = loc.unlocked === false;
			
			// Icon zeichnen
			const icon = buildingIcons.get(loc.id);
			const baseIconSize = 48;
			let iconSize = isHovered ? 56 : baseIconSize;
			
			// Aktueller Standort = sanftes Pulsieren (ohne Springen!)
			if (isCurrent) {
				const pulse = Math.sin(Date.now() * 0.003) * 4 + baseIconSize; // Langsamer, kleinerer Effekt
				iconSize = pulse;
			}
			
			if (icon) {
				ctx2d.save();
				
				// Glow bei Hover/Selection
				if (isHovered || isSelected) {
					ctx2d.shadowColor = MAP_CONFIG.titleColor;
					ctx2d.shadowBlur = 20;
				}
				
				// Aktueller Standort = grüner Rand
				if (isCurrent) {
					ctx2d.shadowColor = '#00ff00';
					ctx2d.shadowBlur = 15;
				}
				
				// Locked = ausgegraut
				if (isLocked) {
					ctx2d.globalAlpha = 0.4;
				}
				
				ctx2d.drawImage(
					icon,
					x - iconSize / 2,
					y - iconSize / 2,
					iconSize,
					iconSize
				);
				
				ctx2d.restore();
			}
			
			// Name unter Icon
			ctx2d.fillStyle = isLocked ? MAP_CONFIG.buildingLockedColor : '#ffffff';
			ctx2d.font = isHovered ? 'bold 14px Arial' : '12px Arial';
			ctx2d.textAlign = 'center';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText(loc.name, x, y + iconSize / 2 + 5);
			
			// Schloss-Symbol bei gesperrten Gebäuden
			if (isLocked) {
				ctx2d.fillStyle = '#ff4444';
				ctx2d.font = '16px Arial';
				ctx2d.fillText('🔒', x + iconSize / 2, y - iconSize / 2);
			}
			
			// "Du bist hier" Marker
			if (isCurrent) {
				ctx2d.fillStyle = '#00ff00';
				ctx2d.font = '12px Arial';
				ctx2d.fillText('▼ HIER', x, y - iconSize / 2 - 15);
			}
		});
		
		// Ausgewähltes Gebäude: Info-Box
		if (selectedBuilding) {
			const selLoc = allLocations.find(l => l.id === selectedBuilding);
			if (selLoc) {
				renderSelectionBox(ctx2d, canvas, selLoc);
			}
		}
		
		// Hinweis unten
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx2d.font = '14px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'bottom';
		ctx2d.fillText('Drücke [M] oder [ESC] zum Schließen', canvas.width / 2, canvas.height - 20);
		
		ctx2d.restore();
	}
	
	/**
	 * Rendert die Auswahl-Box für ein Gebäude
	 */
	function renderSelectionBox(ctx2d, canvas, building) {
		const boxWidth = 280;
		const boxHeight = 120;
		const boxX = canvas.width / 2 - boxWidth / 2;
		const boxY = canvas.height - 180;
		
		// Box-Hintergrund
		ctx2d.fillStyle = 'rgba(0, 30, 60, 0.9)';
		ctx2d.strokeStyle = MAP_CONFIG.titleColor;
		ctx2d.lineWidth = 2;
		ctx2d.beginPath();
		ctx2d.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
		ctx2d.fill();
		ctx2d.stroke();
		
		// Gebäude-Name
		ctx2d.fillStyle = '#ffffff';
		ctx2d.font = 'bold 18px Arial';
		ctx2d.textAlign = 'center';
		ctx2d.textBaseline = 'top';
		ctx2d.fillText(building.name, canvas.width / 2, boxY + 15);
		
		// Beschreibung
		ctx2d.fillStyle = 'rgba(255, 255, 255, 0.7)';
		ctx2d.font = '12px Arial';
		ctx2d.fillText(building.description || '', canvas.width / 2, boxY + 40);
		
		// Teleport-Button
		const btnWidth = 120;
		const btnHeight = 30;
		const btnX = canvas.width / 2 - btnWidth / 2;
		const btnY = boxY + boxHeight - 45;
		
		ctx2d.fillStyle = MAP_CONFIG.titleColor;
		ctx2d.beginPath();
		ctx2d.roundRect(btnX, btnY, btnWidth, btnHeight, 5);
		ctx2d.fill();
		
		ctx2d.fillStyle = '#000000';
		ctx2d.font = 'bold 14px Arial';
		ctx2d.textBaseline = 'middle';
		ctx2d.fillText('Teleportieren', canvas.width / 2, btnY + btnHeight / 2);
	}
	
	/**
	 * Prüft ob Klick auf Teleport-Button war
	 */
	function isClickOnTeleportButton(x, y) {
		const canvas = getCanvas();
		// Nur prüfen wenn Gebäude ausgewählt ist!
		if (!canvas || !selectedBuilding) return false;
		
		const boxWidth = 280;
		const boxHeight = 120;
		const boxY = canvas.height - 180;
		const btnWidth = 120;
		const btnHeight = 30;
		const btnX = canvas.width / 2 - btnWidth / 2;
		const btnY = boxY + boxHeight - 45;
		
		const isOnButton = x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
		if (isOnButton) {
			console.log(`[Map] Button-Klick erkannt für: ${selectedBuilding}`);
		}
		return isOnButton;
	}
	
	/**
	 * Behandelt Tastendruck
	 */
	function handleKeyDown(key, code) {
		// TAB zum Öffnen/Schließen
		if (key === 'Tab' || code === 'Tab') {
			toggle();
			return true;
		}
		
		if (isOpen && (key === 'Escape' || code === 'Escape')) {
			close();
			return true;
		}
		
		if (isOpen && (key === 'Enter' || code === 'Enter') && selectedBuilding) {
			confirmTeleport();
			return true;
		}
		
		return false;
	}
	
	return {
		get isOpen() { return isOpen; },
		get selectedBuilding() { return selectedBuilding; },
		get hoveredBuilding() { return hoveredBuilding; },
		open,
		close,
		toggle,
		update,
		render,
		handleMouseMove,
		handleClick: (x, y) => {
			// Erst Button prüfen
			if (isClickOnTeleportButton(x, y)) {
				confirmTeleport();
				return true;
			}
			return handleClick(x, y);
		},
		handleKeyDown,
		confirmTeleport
	};
}

export default { createMapSystem, MAP_CONFIG };
