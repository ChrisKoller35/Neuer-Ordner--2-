// ============================================================
// CITY STATE MODULE - Initialisierung des Stadt-States
// ============================================================
"use strict";

import {
	CITY_BUILDING_WIDTH,
	CITY_BUILDING_HEIGHT,
	CITY_FLOOR_COUNT,
	CITY_FLOOR_HEIGHT,
	CITY_HATCH_WIDTH,
	CITY_WALL_THICKNESS,
	CITY_FLOOR_THICKNESS
} from './constants.js';

import { CITY_PLAYER_RADIUS } from '../core/constants.js';

/**
 * Erstellt den initialen Stadt-State
 * @param {Object} ctx - Context mit canvas und cityData
 * @returns {Object} Stadt-State Objekt
 */
export function buildCityState(ctx) {
	const { canvas, cityData } = ctx;
	
	// SEITENANSICHT Stadt wie Level 1-4
	const width = canvas.width;
	const height = canvas.height;
	
	// Gebäude-Position (beginnt links, größer als Canvas)
	const buildingX = 100;
	const buildingY = -CITY_BUILDING_HEIGHT + height;
	
	// Boden-Offset für Spieler/NPC-Positionierung
	const FLOOR_OFFSET = CITY_FLOOR_THICKNESS + 0;
	
	// Individuelle Offsets pro Stockwerk - aus JSON laden
	const FLOOR_INDIVIDUAL_OFFSETS = cityData.floorOffsets;
	
	// Berechne Stockwerk-Positionen
	const floors = [];
	for (let i = 0; i < CITY_FLOOR_COUNT; i++) {
		const floorY = buildingY + CITY_BUILDING_HEIGHT - (i + 1) * CITY_FLOOR_HEIGHT;
		floors.push({
			index: i,
			y: floorY,
			hatchX: buildingX + CITY_BUILDING_WIDTH / 2 - CITY_HATCH_WIDTH / 2,
			hatchY: floorY,
			hasHatch: i < CITY_FLOOR_COUNT - 1
		});
	}
	
	// Hilfsfunktion für Boden-Y-Position
	const getFloorGroundY = (floorIndex) => {
		const indivOffset = FLOOR_INDIVIDUAL_OFFSETS[floorIndex] || 0;
		return floors[floorIndex].y + CITY_FLOOR_HEIGHT - FLOOR_OFFSET + indivOffset;
	};
	
	// Spieler startet aus JSON-Config
	const playerStart = cityData.playerStart;
	const player = {
		x: buildingX + playerStart.xOffset,
		y: getFloorGroundY(playerStart.floorIndex),
		r: CITY_PLAYER_RADIUS,
		dir: 1,
		floor: playerStart.floorIndex,
		moving: false,
		animTime: 0,
		swimming: false
	};
	
	// NPCs aus JSON-Config laden
	const npcs = cityData.npcs.map(npcDef => {
		const xPos = npcDef.fromRight 
			? buildingX + CITY_BUILDING_WIDTH + npcDef.xOffset
			: buildingX + npcDef.xOffset;
		return {
			id: npcDef.id,
			label: npcDef.label,
			x: xPos,
			y: getFloorGroundY(npcDef.floorIndex) + (npcDef.yOffset || 0),
			floor: npcDef.floorIndex
		};
	});
	
	// Kamera folgt dem Spieler
	const cameraY = Math.max(0, Math.min(
		player.y - height / 2,
		CITY_BUILDING_HEIGHT - height
	));
	
	return {
		width,
		height,
		buildingX,
		buildingY,
		buildingWidth: CITY_BUILDING_WIDTH,
		buildingHeight: CITY_BUILDING_HEIGHT,
		floors,
		player,
		camera: { x: 0, y: cameraY },
		npcs,
		floorHeight: CITY_FLOOR_HEIGHT,
		hatchWidth: CITY_HATCH_WIDTH,
		wallThickness: CITY_WALL_THICKNESS,
		floorThickness: CITY_FLOOR_THICKNESS
	};
}
