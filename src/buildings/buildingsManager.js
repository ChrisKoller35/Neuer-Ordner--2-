// ============================================================
// BUILDINGS MANAGER - Koordiniert Map, Teleporter & Szenen
// ============================================================
// Zentraler Controller für das gesamte Gebäude-System
// Verbindet Map, Teleporter und Building-Szenen

import { createMapSystem } from '../map/map.js';
import { createTeleporterSystem } from '../teleporter/teleporter.js';
import { createBuildingSystem } from './buildingScene.js';
import buildingsData from '../data/buildings.json';
import teleporterData from '../data/teleporter.json';

/**
 * Erstellt den Buildings-Manager
 * @param {Object} ctx - Kontext mit Abhängigkeiten
 */
export function createBuildingsManager(ctx) {
	const {
		getState,
		setState,
		getCanvas,
		getPlayerPosition,
		setPlayerPosition,
		getPlayerSprite,
		getCameraOffset,
		triggerEventFlash,
		onModeChange
	} = ctx;
	
	// Sub-Systeme
	let mapSystem = null;
	let teleporterSystem = null;
	let buildingSystem = null;
	
	// State
	let initialized = false;
	let currentLocation = 'main_city';
	
	/**
	 * Initialisiert alle Sub-Systeme
	 */
	function init() {
		if (initialized) return;
		
		// Map-System
		mapSystem = createMapSystem({
			getState,
			getCanvas,
			getBuildingsData: () => buildingsData,
			onTeleportRequest: handleTeleportRequest
		});
		
		// Teleporter-System
		teleporterSystem = createTeleporterSystem({
			getState,
			setState,
			getCanvas,
			getTeleporterData: () => teleporterData,
			getBuildingsData: () => buildingsData,
			getPlayerPosition,
			getCameraOffset,
			onOpenMap: () => mapSystem.open(),
			onTeleportComplete: handleTeleportComplete
		});
		
		// Building-System
		buildingSystem = createBuildingSystem({
			getState,
			setState,
			getCanvas,
			getBuildingsData: () => buildingsData,
			getPlayerSprite,
			onExitBuilding: handleExitBuilding,
			onOpenMap: () => mapSystem.open(),
			onNPCInteract: handleNPCInteract
		});
		
		teleporterSystem.init();
		initialized = true;
		
		console.log('[BuildingsManager] Initialisiert mit', 
			Object.keys(buildingsData.buildings).length, 'Gebäuden');
	}
	
	/**
	 * Behandelt Teleport-Anfrage von der Karte
	 */
	function handleTeleportRequest(targetId) {
		console.log(`[BuildingsManager] Teleport-Anfrage zu: ${targetId}, currentLocation: ${currentLocation}`);
		
		// Schließe zuerst die Karte
		if (mapSystem?.isOpen) {
			mapSystem.close();
		}
		
		// Wenn wir zur Hauptstadt wollen
		if (targetId === 'main_city') {
			// Schon in der Stadt?
			if (currentLocation === 'main_city' && !buildingSystem.isActive()) {
				console.log('[BuildingsManager] Bereits in der Stadt - nichts zu tun');
				return;
			}
			
			// Wenn wir in einem Gebäude sind
			if (buildingSystem.isActive()) {
				console.log('[BuildingsManager] Verlasse Gebäude und kehre zur Stadt zurück');
				buildingSystem.exitBuilding();
			}
			
			currentLocation = 'main_city';
			
			const state = getState();
			if (state) {
				state.mode = 'city';
				state.currentBuilding = null;
			}
			
			if (triggerEventFlash) {
				triggerEventFlash('teleport', { 
					text: 'Zurück in der Stadt!', 
					duration: 1000, 
					opacity: 0.7 
				});
			}
			
			if (onModeChange) {
				onModeChange('city');
			}
			return;
		}
		
		// Prüfen ob Ziel ein Gebäude ist
		if (buildingsData.buildings[targetId]) {
			// Wenn wir bereits in einem anderen Gebäude sind, erst verlassen
			if (buildingSystem.isActive()) {
				console.log(`[BuildingsManager] Verlasse aktuelles Gebäude um zu ${targetId} zu teleportieren`);
				buildingSystem.exitBuilding();
			}
			
			console.log(`[BuildingsManager] Starte Teleport zu Gebäude: ${targetId}`);
			teleporterSystem.startTeleport(targetId);
		} else {
			console.warn(`[BuildingsManager] Unbekanntes Teleport-Ziel: ${targetId}`);
		}
	}
	
	/**
	 * Behandelt abgeschlossene Teleportation
	 */
	function handleTeleportComplete(targetId) {
		console.log(`[BuildingsManager] Teleport abgeschlossen zu: ${targetId}`);
		
		currentLocation = targetId;
		
		if (targetId === 'main_city') {
			// Zurück zur Stadt
			const state = getState();
			if (state) {
				state.mode = 'city';
				state.currentBuilding = null;
			}
			
			if (onModeChange) {
				onModeChange('city');
			}
		} else if (buildingsData.buildings[targetId]) {
			// Gebäude betreten
			buildingSystem.enterBuilding(targetId);
			
			if (onModeChange) {
				onModeChange('building');
			}
		}
		
		if (triggerEventFlash) {
			const name = targetId === 'main_city' 
				? 'Hauptstadt' 
				: buildingsData.buildings[targetId]?.name || targetId;
			
			triggerEventFlash('teleport', { 
				text: `Angekommen: ${name}`, 
				duration: 1200, 
				opacity: 0.7 
			});
		}
	}
	
	/**
	 * Behandelt Verlassen eines Gebäudes
	 */
	function handleExitBuilding() {
		currentLocation = 'main_city';
		
		const state = getState();
		if (state) {
			state.mode = 'city';
			state.currentBuilding = null;
		}
		
		if (onModeChange) {
			onModeChange('city');
		}
	}
	
	/**
	 * Behandelt NPC-Interaktion
	 */
	function handleNPCInteract(buildingId, npcId, option) {
		console.log(`[BuildingsManager] NPC-Interaktion: ${npcId} in ${buildingId}, Option: ${option}`);
		
		// TODO: Hier können später spezifische NPC-Funktionen implementiert werden
		// z.B. Shop öffnen, Quest starten, Crafting-Menü, etc.
	}
	
	/**
	 * Update-Funktion - ruft alle Sub-Systeme auf
	 */
	function update(dt, keys) {
		if (!initialized) return;
		
		const state = getState();
		
		// Building-Szene hat Priorität
		if (buildingSystem.isActive()) {
			buildingSystem.update(dt, keys);
		}
		
		// Teleporter nur in der Stadt updaten
		if (state?.mode === 'city') {
			teleporterSystem.update(dt);
		}
		
		// Map immer updaten (für Animation)
		mapSystem.update(dt);
	}
	
	/**
	 * Render-Funktion
	 */
	function render(ctx2d) {
		if (!initialized) return;
		
		const state = getState();
		
		// Building-Szene rendern
		if (buildingSystem.isActive()) {
			buildingSystem.render(ctx2d);
		}
		
		// Teleporter in der Stadt rendern
		if (state?.mode === 'city') {
			teleporterSystem.render(ctx2d);
		}
		
		// Map als Overlay (immer zuletzt)
		mapSystem.render(ctx2d);
	}
	
	/**
	 * Behandelt Tastendruck
	 */
	function handleKeyDown(key, code) {
		if (!initialized) return false;
		
		// Map hat höchste Priorität
		if (mapSystem.isOpen) {
			return mapSystem.handleKeyDown(key, code);
		}
		
		// Map öffnen
		if (mapSystem.handleKeyDown(key, code)) {
			return true;
		}
		
		// Building-Szene
		if (buildingSystem.isActive()) {
			return buildingSystem.handleKeyDown(key, code);
		}
		
		// Teleporter in der Stadt
		const state = getState();
		if (state?.mode === 'city') {
			return teleporterSystem.handleKeyDown(key, code);
		}
		
		return false;
	}
	
	/**
	 * Behandelt Mausbewegung
	 */
	function handleMouseMove(x, y) {
		if (!initialized) return;
		
		if (mapSystem.isOpen) {
			mapSystem.handleMouseMove(x, y);
			return;
		}
		
		// Building Debug-Drag-Modus
		if (buildingSystem?.isActive() && buildingSystem.handleMouseMove) {
			buildingSystem.handleMouseMove(x, y);
		}
	}
	
	/**
	 * Behandelt Maus-Runter (mousedown)
	 */
	function handleMouseDown(x, y) {
		if (!initialized) return false;
		
		// Building Debug-Drag-Modus
		if (buildingSystem?.isActive() && buildingSystem.handleMouseDown) {
			return buildingSystem.handleMouseDown(x, y);
		}
		
		return false;
	}
	
	/**
	 * Behandelt Maus-Hoch (mouseup)
	 */
	function handleMouseUp(x, y) {
		if (!initialized) return false;
		
		// Building Debug-Drag-Modus
		if (buildingSystem?.isActive() && buildingSystem.handleMouseUp) {
			return buildingSystem.handleMouseUp(x, y);
		}
		
		return false;
	}
	
	/**
	 * Behandelt Mausklick
	 */
	function handleClick(x, y) {
		if (!initialized) return false;
		
		if (mapSystem.isOpen) {
			return mapSystem.handleClick(x, y);
		}
		
		return false;
	}
	
	/**
	 * Gibt den aktuellen Standort zurück
	 */
	function getCurrentLocation() {
		return currentLocation;
	}
	
	/**
	 * Prüft ob Map offen ist
	 */
	function isMapOpen() {
		return mapSystem?.isOpen || false;
	}
	
	/**
	 * Prüft ob in einem Gebäude
	 */
	function isInBuilding() {
		return buildingSystem?.isActive() || false;
	}
	
	/**
	 * Gibt Gebäude-Daten zurück
	 */
	function getBuildingsData() {
		return buildingsData;
	}
	
	/**
	 * Gibt Teleporter-Daten zurück
	 */
	function getTeleporterData() {
		return teleporterData;
	}
	
	return {
		init,
		update,
		render,
		handleKeyDown,
		handleMouseMove,
		handleMouseDown,
		handleMouseUp,
		handleClick,
		getCurrentLocation,
		isMapOpen,
		isInBuilding,
		getBuildingsData,
		getTeleporterData,
		
		// Sub-System Zugriff (für Debugging)
		get mapSystem() { return mapSystem; },
		get teleporterSystem() { return teleporterSystem; },
		get buildingSystem() { return buildingSystem; }
	};
}

export default { createBuildingsManager };
