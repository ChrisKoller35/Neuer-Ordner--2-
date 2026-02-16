// ============================================================
// TELEPORTER MODULE - Teleport-System zwischen Locations
// ============================================================
// Handhabt Teleporter-Interaktion in der Stadt
// Öffnet Karte bei Interaktion
// Führt Teleportation zu Gebäuden durch

import { createTeleporterPlaceholder } from '../core/placeholders.js';

/**
 * Teleporter-Konstanten
 */
export const TELEPORTER_CONFIG = {
	interactKey: 'e',
	interactCode: 'KeyE',
	interactRadius: 60,
	animationSpeed: 0.1,
	particleCount: 20,
	teleportDuration: 800
};

// ===== CITY PORTAL POSITION STORAGE =====
const CITY_PORTAL_STORAGE_KEY = 'CITY_TELEPORTER_POSITION';
// Fest eingebaute Position (vom Benutzer mit Portal-Editor festgelegt)
const DEFAULT_CITY_PORTAL_POSITION = { x: 1350.54262597656, y: 521.276874023439 };

/**
 * Erstellt das Teleporter-System
 * @param {Object} ctx - Kontext mit Abhängigkeiten
 */
export function createTeleporterSystem(ctx) {
	const {
		getState,
		setState,
		getCanvas,
		getTeleporterData,
		getBuildingsData,
		getPlayerPosition,
		getCameraOffset,
		onOpenMap,
		onTeleportComplete,
		loadSprite,
		spriteReady
	} = ctx;
	
	// Lokaler State
	let teleporterSprite = null;
	let animationFrame = 0;
	let isNearTeleporter = false;
	let isTeleporting = false;
	let teleportProgress = 0;
	let teleportTarget = null;
	let particles = [];
	
	// Teleporter-Position in der Stadt (FESTE Weltkoordinaten)
	// Diese Position ist relativ zur Stadt-Welt, nicht zur Canvas
	let teleporterWorldPosition = { ...DEFAULT_CITY_PORTAL_POSITION };
	
	// ===== DEBUG DRAG MODE für Stadt-Portal =====
	let debugDragMode = false;
	let isDragging = false;
	
	// Lädt gespeicherte Position aus localStorage
	function loadSavedPosition() {
		try {
			const saved = localStorage.getItem(CITY_PORTAL_STORAGE_KEY);
			if (saved) {
				const pos = JSON.parse(saved);
				teleporterWorldPosition = { x: pos.x, y: pos.y };
				console.log('[Teleporter] Stadt-Portal-Position geladen:', teleporterWorldPosition);
			}
		} catch (e) {
			console.warn('[Teleporter] Fehler beim Laden der Position:', e);
		}
	}
	
	// Speichert aktuelle Position
	function savePosition() {
		try {
			localStorage.setItem(CITY_PORTAL_STORAGE_KEY, JSON.stringify(teleporterWorldPosition));
			console.log('[Teleporter] Stadt-Portal-Position gespeichert:', teleporterWorldPosition);
		} catch (e) {
			console.warn('[Teleporter] Fehler beim Speichern:', e);
		}
	}
	
	// Exportiert Position in Zwischenablage
	function exportPositionToClipboard() {
		savePosition();
		const exportData = `// Stadt-Portal Position
CITY_TELEPORTER: { x: ${teleporterWorldPosition.x}, y: ${teleporterWorldPosition.y} }`;
		
		navigator.clipboard.writeText(exportData).then(() => {
			alert('✅ Stadt-Portal-Position gespeichert & kopiert!\n\n' + exportData);
		}).catch(err => {
			alert('Position: x=' + teleporterWorldPosition.x + ', y=' + teleporterWorldPosition.y);
		});
	}
	
	/**
	 * Initialisiert den Teleporter
	 */
	function init() {
		// Zuerst gespeicherte Position laden
		loadSavedPosition();
		
		const data = getTeleporterData();
		// Position als feste Weltkoordinaten (nicht prozentual)
		// Nur überschreiben wenn KEINE gespeicherte Position existiert
		if (!localStorage.getItem(CITY_PORTAL_STORAGE_KEY)) {
			if (data?.teleporter?.main_city?.worldPosition) {
				teleporterWorldPosition = data.teleporter.main_city.worldPosition;
			}
		}
		
		// Sprite laden oder Platzhalter
		teleporterSprite = createTeleporterPlaceholder(0);
	}
	
	/**
	 * Prüft ob Spieler in Reichweite des Teleporters ist
	 */
	function checkPlayerProximity() {
		const playerPos = getPlayerPosition();
		if (!playerPos) return false;
		
		// Spieler-Position ist bereits in Weltkoordinaten
		const dist = Math.sqrt(
			(playerPos.x - teleporterWorldPosition.x) ** 2 + 
			(playerPos.y - teleporterWorldPosition.y) ** 2
		);
		
		return dist < TELEPORTER_CONFIG.interactRadius;
	}
	
	/**
	 * Startet eine Teleportation
	 */
	function startTeleport(targetId) {
		if (isTeleporting) return false;
		
		const buildings = getBuildingsData();
		if (!buildings) return false;
		
		// Ziel validieren
		let target = null;
		if (targetId === 'main_city') {
			target = buildings.mainCity;
		} else if (buildings.buildings?.[targetId]) {
			target = buildings.buildings[targetId];
		}
		
		if (!target) {
			console.warn(`[Teleporter] Unbekanntes Ziel: ${targetId}`);
			return false;
		}
		
		if (target.unlocked === false) {
			console.warn(`[Teleporter] Ziel noch gesperrt: ${targetId}`);
			return false;
		}
		
		isTeleporting = true;
		teleportProgress = 0;
		teleportTarget = targetId;
		
		// Partikel spawnen
		spawnParticles();
		
		return true;
	}
	
	/**
	 * Spawnt Teleport-Partikel
	 */
	function spawnParticles() {
		const canvas = getCanvas();
		const playerPos = getPlayerPosition();
		if (!canvas || !playerPos) return;
		
		particles = [];
		
		for (let i = 0; i < TELEPORTER_CONFIG.particleCount; i++) {
			particles.push({
				x: playerPos.x,
				y: playerPos.y,
				vx: (Math.random() - 0.5) * 4,
				vy: (Math.random() - 0.5) * 4 - 2,
				size: 4 + Math.random() * 6,
				alpha: 1,
				color: `hsl(${180 + Math.random() * 40}, 100%, 60%)`
			});
		}
	}
	
	/**
	 * Update-Funktion
	 */
	function update(dt) {
		// Animation Frame Update
		animationFrame += dt * 0.01;
		
		// Teleporter-Sprite aktualisieren (für Animation)
		if (animationFrame % 10 < 0.1) {
			teleporterSprite = createTeleporterPlaceholder(Math.floor(animationFrame));
		}
		
		// Proximity Check
		isNearTeleporter = checkPlayerProximity();
		
		// Teleport-Animation
		if (isTeleporting) {
			teleportProgress += dt / TELEPORTER_CONFIG.teleportDuration;
			
			// Partikel updaten
			particles.forEach(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.vy -= 0.1; // Nach oben beschleunigen
				p.alpha -= 0.02;
				p.size *= 0.98;
			});
			
			particles = particles.filter(p => p.alpha > 0);
			
			if (teleportProgress >= 1) {
				completeTeleport();
			}
		}
	}
	
	/**
	 * Beendet die Teleportation
	 */
	function completeTeleport() {
		isTeleporting = false;
		teleportProgress = 0;
		
		if (onTeleportComplete && teleportTarget) {
			onTeleportComplete(teleportTarget);
		}
		
		teleportTarget = null;
		particles = [];
	}
	
	/**
	 * Rendert den Teleporter
	 */
	function render(ctx2d) {
		const canvas = getCanvas();
		if (!canvas) return;
		
		// Kamera-Offset berücksichtigen!
		const camera = getCameraOffset ? getCameraOffset() : { x: 0, y: 0 };
		const x = teleporterWorldPosition.x - camera.x;
		const y = teleporterWorldPosition.y - camera.y;
		
		// Teleporter-Sprite zeichnen
		if (teleporterSprite) {
			const scale = isNearTeleporter ? 1.1 : 1.0;
			const width = teleporterSprite.width * scale;
			const height = teleporterSprite.height * scale;
			
			ctx2d.save();
			
			// Glow wenn in Nähe
			if (isNearTeleporter) {
				ctx2d.shadowColor = '#00e5ff';
				ctx2d.shadowBlur = 20 + Math.sin(animationFrame) * 10;
			}
			
			ctx2d.drawImage(
				teleporterSprite,
				x - width / 2,
				y - height / 2,
				width,
				height
			);
			
			ctx2d.restore();
		}
		
		// Interaktions-Hinweis
		if (isNearTeleporter && !isTeleporting) {
			ctx2d.fillStyle = '#ffffff';
			ctx2d.font = 'bold 14px Arial';
			ctx2d.textAlign = 'center';
			ctx2d.textBaseline = 'bottom';
			ctx2d.shadowColor = 'rgba(0, 0, 0, 0.8)';
			ctx2d.shadowBlur = 4;
			ctx2d.fillText(
				'[E] Teleporter benutzen',
				x,
				y - (teleporterSprite?.height || 60) / 2 - 10
			);
			ctx2d.shadowBlur = 0;
		}
		
		// Partikel zeichnen
		particles.forEach(p => {
			ctx2d.globalAlpha = p.alpha;
			ctx2d.fillStyle = p.color;
			ctx2d.beginPath();
			ctx2d.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx2d.fill();
		});
		ctx2d.globalAlpha = 1;
		
		// Teleport-Effekt
		if (isTeleporting) {
			renderTeleportEffect(ctx2d, canvas);
		}
		
		// ===== DEBUG DRAG MODE UI =====
		if (debugDragMode) {
			// Highlight um Teleporter
			ctx2d.strokeStyle = '#ff00ff';
			ctx2d.lineWidth = 3;
			ctx2d.setLineDash([5, 5]);
			ctx2d.beginPath();
			ctx2d.arc(x, y, 50, 0, Math.PI * 2);
			ctx2d.stroke();
			ctx2d.setLineDash([]);
			
			// Info-Panel
			ctx2d.fillStyle = 'rgba(255, 0, 255, 0.95)';
			ctx2d.fillRect(10, 10, 320, 110);
			ctx2d.fillStyle = '#ffffff';
			ctx2d.font = 'bold 16px Arial';
			ctx2d.textAlign = 'left';
			ctx2d.textBaseline = 'top';
			ctx2d.fillText('🔧 STADT-PORTAL EDITOR', 20, 18);
			ctx2d.font = '12px Arial';
			ctx2d.fillText('Klicke & ziehe das Portal', 20, 40);
			ctx2d.fillStyle = '#00ffff';
			ctx2d.fillText(`Position: x=${teleporterWorldPosition.x.toFixed(0)}, y=${teleporterWorldPosition.y.toFixed(0)}`, 20, 58);
			ctx2d.fillStyle = '#ffff00';
			ctx2d.fillText('[C] Speichern & Kopieren', 20, 78);
			ctx2d.fillStyle = '#ff6666';
			ctx2d.fillText('[P] Editor beenden', 20, 96);
		}
	}
	
	/**
	 * Rendert den Teleport-Übergangseffekt
	 */
	function renderTeleportEffect(ctx2d, canvas) {
		const progress = teleportProgress;
		
		// Weißer Flash
		if (progress > 0.4 && progress < 0.6) {
			const flashAlpha = 1 - Math.abs(progress - 0.5) * 5;
			ctx2d.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
			ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		}
		
		// Zoom-Effekt am Ende
		if (progress > 0.5) {
			const fadeProgress = (progress - 0.5) * 2;
			ctx2d.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
			ctx2d.fillRect(0, 0, canvas.width, canvas.height);
		}
	}
	
	/**
	 * Behandelt Tastendruck
	 */
	function handleKeyDown(key, code) {
		if (isTeleporting) return false;
		
		// P für Debug-Drag-Modus toggle
		if (key.toLowerCase() === 'p' || code === 'KeyP') {
			debugDragMode = !debugDragMode;
			console.log(`%c[Teleporter] PORTAL EDITOR: ${debugDragMode ? 'AKTIVIERT' : 'DEAKTIVIERT'}`, 'color: magenta; font-weight: bold; font-size: 14px;');
			if (debugDragMode) {
				alert('🔧 STADT-PORTAL EDITOR aktiviert!\n\nZiehe das Portal mit der Maus.\n[C] = Speichern & Kopieren\n[P] = Beenden');
			}
			return true;
		}
		
		// C zum Speichern (im Debug-Modus)
		if ((key.toLowerCase() === 'c' || code === 'KeyC') && debugDragMode) {
			exportPositionToClipboard();
			return true;
		}
		
		// E-Taste bei Teleporter (nur wenn Debug-Modus AUS)
		if (!debugDragMode && isNearTeleporter && 
			(key.toLowerCase() === TELEPORTER_CONFIG.interactKey || 
			 code === TELEPORTER_CONFIG.interactCode)) {
			
			// Karte öffnen
			if (onOpenMap) {
				onOpenMap();
			}
			return true;
		}
		
		return false;
	}
	
	/**
	 * Maus-Handler für Debug-Drag-Modus
	 */
	function handleMouseDown(mouseX, mouseY, button = 0) {
		if (!debugDragMode || button !== 0) return false;
		
		const camera = getCameraOffset ? getCameraOffset() : { x: 0, y: 0 };
		const screenX = teleporterWorldPosition.x - camera.x;
		const screenY = teleporterWorldPosition.y - camera.y;
		
		// Prüfe ob Klick in Nähe des Teleporters
		const dist = Math.sqrt((mouseX - screenX) ** 2 + (mouseY - screenY) ** 2);
		if (dist < 100) {
			isDragging = true;
			console.log('[Teleporter] Ziehe Portal...');
			return true;
		}
		return false;
	}
	
	function handleMouseMove(mouseX, mouseY) {
		if (!debugDragMode || !isDragging) return false;
		
		const camera = getCameraOffset ? getCameraOffset() : { x: 0, y: 0 };
		
		// Berechne Weltkoordinaten aus Mausposition
		teleporterWorldPosition.x = mouseX + camera.x;
		teleporterWorldPosition.y = mouseY + camera.y;
		
		return true;
	}
	
	function handleMouseUp(button = 0) {
		if (isDragging) {
			isDragging = false;
			console.log('[Teleporter] Portal platziert bei:', teleporterWorldPosition);
			return true;
		}
		return false;
	}
	
	/**
	 * Setzt die Teleporter-Position
	 */
	function setPosition(x, y) {
		teleporterPosition = { x, y };
	}
	
	/**
	 * Gibt den Teleport-Status zurück
	 */
	function getStatus() {
		return {
			isNear: isNearTeleporter,
			isTeleporting,
			progress: teleportProgress,
			target: teleportTarget
		};
	}
	
	return {
		init,
		update,
		render,
		handleKeyDown,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		startTeleport,
		setPosition,
		getStatus,
		get isNearTeleporter() { return isNearTeleporter; },
		get isTeleporting() { return isTeleporting; },
		get isDebugMode() { return debugDragMode; }
	};
}

export default { createTeleporterSystem, TELEPORTER_CONFIG };
