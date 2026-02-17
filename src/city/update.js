// ============================================================
// CITY UPDATE MODULE - Spieler-Bewegung und Kamera in der Stadt
// ============================================================
"use strict";

import { clamp } from '../core/utils.js';
import { CITY_SPEED } from '../core/constants.js';
import S from '../core/sharedState.js';
import {
	CITY_GRID_CELL_SIZE,
	CITY_GRID_COLS,
	CITY_GRID_ROWS
} from './constants.js';

// Spieler wird ca. 71px oberhalb von y gezeichnet
const PLAYER_VISUAL_OFFSET = 71;

/**
 * Prüft ob eine Position im begehbaren Grid liegt
 */
function isPositionWalkable(city, x, y) {
	// Position relativ zum Gebäude
	// Wir prüfen die MITTE des Spielers, nicht die Füße
	const relX = x - city.buildingX;
	const relY = (y - PLAYER_VISUAL_OFFSET) - city.buildingY;
	
	// Grid-Zelle berechnen
	const col = Math.floor(relX / CITY_GRID_CELL_SIZE);
	const row = Math.floor(relY / CITY_GRID_CELL_SIZE);
	
	// Außerhalb des Grids = blockiert (Spieler bleibt im Haus)
	if (col < 0 || col >= CITY_GRID_COLS || row < 0 || row >= CITY_GRID_ROWS) {
		return false;
	}
	
	// Prüfe Grid
	const key = `${col},${row}`;
	const grid = S.CITY_WALKABLE_GRID || {};
	
	// Wenn Grid leer ist, erlaube alles (noch nicht konfiguriert)
	if (Object.keys(grid).length === 0) {
		return true;
	}
	
	return grid[key] === true;
}

/**
 * Aktualisiert Spieler-Bewegung in der Stadt
 */
function updateCityPlayer(city, player, moveX, moveY, dt) {
	player.moving = !!(moveX || moveY);
	
	if (player.moving) {
		player.animTime += dt;
		
		// Berechne neue Position
		let newX = player.x;
		let newY = player.y;
		
		if (moveX !== 0) {
			newX += moveX * CITY_SPEED * dt;
			player.dir = moveX > 0 ? 1 : -1;
		}
		if (moveY !== 0) {
			newY += moveY * CITY_SPEED * dt;
		}
		
		// Gebäude-Grenzen
		const minX = city.buildingX + city.wallThickness + player.r;
		const maxX = city.buildingX + city.buildingWidth - city.wallThickness - player.r;
		const minY = city.buildingY + player.r;
		const maxY = city.buildingY + city.buildingHeight - player.r;
		
		newX = clamp(newX, minX, maxX);
		newY = clamp(newY, minY, maxY);
		
		// Prüfe ob neue Position begehbar ist
		if (isPositionWalkable(city, newX, newY)) {
			player.x = newX;
			player.y = newY;
		} else {
			// Versuche nur horizontale Bewegung
			if (moveX !== 0 && isPositionWalkable(city, newX, player.y)) {
				player.x = newX;
			}
			// Versuche nur vertikale Bewegung
			else if (moveY !== 0 && isPositionWalkable(city, player.x, newY)) {
				player.y = newY;
			}
		}
	} else {
		player.animTime = 0;
	}
}

/**
 * Aktualisiert die Kamera-Position
 */
function updateCityCamera(city, player) {
	// Im Grid-Editor-Modus: Kamera wird extern gesteuert
	if (S.CITY_GRID_EDIT_MODE) {
		if (typeof S.CITY_CAMERA_X_DEBUG === 'number') {
			city.camera.x = S.CITY_CAMERA_X_DEBUG;
		}
		if (typeof S.CITY_CAMERA_Y_DEBUG === 'number') {
			city.camera.y = S.CITY_CAMERA_Y_DEBUG;
		}
		return;
	}
	
	// Kamera Y-Offset so dass Spieler im sichtbaren Bereich bleibt
	const targetCamY = player.y - city.height / 2;
	// Kamera-Grenzen: nicht über das Gebäude hinaus scrollen (vertikal)
	const minCamY = city.buildingY;
	const maxCamY = city.buildingY + city.buildingHeight - city.height;
	city.camera.y = clamp(targetCamY, minCamY, maxCamY);
	
	// Kamera X für horizontales Scrollen - ERWEITERT um Wasser zu sehen
	// Kamera folgt dem Spieler immer, auch über Gebäudegrenzen hinaus
	const targetCamX = player.x - city.width / 2;
	// Erweiterte Grenzen: 200px links und rechts vom Gebäude sichtbar
	const waterPadding = 200;
	const minCamX = city.buildingX - waterPadding;
	const maxCamX = city.buildingX + city.buildingWidth - city.width + waterPadding;
	city.camera.x = clamp(targetCamX, minCamX, maxCamX);
}

/**
 * Haupt-Update-Funktion für die Stadt
 * @param {Object} ctx - Kontext mit Abhängigkeiten
 * @param {Function} ctx.getState - Funktion die den State zurückgibt
 * @param {Function} ctx.hasKey - Funktion zum Prüfen von Tasteneingaben
 * @param {Object} ctx.keys - Tasten-Konstanten { left, right, up, down }
 * @param {number} dt - Delta-Zeit in Millisekunden
 */
export function updateCity(ctx, dt) {
	const state = ctx.getState();
	const city = state.city;
	if (!city) return;
	
	const player = city.player;
	const { hasKey, keys } = ctx;
	
	// ===== BEWEGUNGSEINGABE =====
	let moveX = 0;
	let moveY = 0;
	if (hasKey(keys.left)) moveX -= 1;
	if (hasKey(keys.right)) moveX += 1;
	if (hasKey(keys.up)) moveY -= 1;
	if (hasKey(keys.down)) moveY += 1;
	
	// Spieler-Bewegung aktualisieren
	updateCityPlayer(city, player, moveX, moveY, dt);
	
	// Kamera aktualisieren
	updateCityCamera(city, player);
	
	// Spielzeit aktualisieren
	state.elapsed += dt;
}

// Exportiere auch die Hilfsfunktionen für Tests
export { isPositionWalkable, updateCityPlayer, updateCityCamera };
