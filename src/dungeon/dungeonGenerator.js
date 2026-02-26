// ============================================================
// DUNGEON GENERATOR — Seed → Dungeon-Stockwerk (konfigurierbares Grid)
// ============================================================
// Erzeugt ein komplettes Stockwerk mit Main-Path, Side-Branches,
// Mandatory-Chunks und validierter Türkompatibilität.
"use strict";

import { createSeededRandom } from './seedRandom.js';
import { generateChunk, CHUNK_COLS, CHUNK_ROWS } from './chunkLibrary.js';
import dungeonData from '../data/dungeon.json';

const GRID_COLS = dungeonData.gridCols;
const GRID_ROWS = dungeonData.gridRows;

// Richtungsvektoren
const DIR = {
	N: { dx: 0, dy: -1, opposite: "S" },
	S: { dx: 0, dy: 1, opposite: "N" },
	E: { dx: 1, dy: 0, opposite: "W" },
	W: { dx: -1, dy: 0, opposite: "E" }
};

const DIR_KEYS = ["N", "E", "S", "W"];

/**
 * Prüft ob (x, y) im Grid liegt
 */
function inBounds(x, y) {
	return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;
}

/**
 * Generiert den Main-Path via Random Walk (Start links → Exit rechts)
 * Path muss mindestens minLength Chunks lang sein.
 * @param {Object} rng - Seeded Random
 * @param {number} minLength - Mindestpfadlänge
 * @returns {Array<{x: number, y: number}>} - Pfad-Positionen
 */
function generateMainPath(rng, minLength = 10) {
	// Mehrere Versuche, garantiert einen Path zu finden
	for (let attempt = 0; attempt < 50; attempt++) {
		const startY = rng.nextInt(0, GRID_ROWS - 1);
		const endY = rng.nextInt(0, GRID_ROWS - 1);
		const path = findPath(0, startY, GRID_COLS - 1, endY, rng);

		if (path && path.length >= minLength) {
			return path;
		}
	}

	// Fallback: Simplen Zickzack-Pfad erzeugen
	return generateFallbackPath(rng);
}

/**
 * Random Walk von (sx, sy) nach (ex, ey) auf dem Grid
 */
function findPath(sx, sy, ex, ey, rng) {
	const visited = new Set();
	const path = [{ x: sx, y: sy }];
	visited.add(`${sx},${sy}`);

	let cx = sx, cy = sy;
	const maxSteps = GRID_COLS * GRID_ROWS;

	for (let step = 0; step < maxSteps; step++) {
		if (cx === ex && cy === ey) return path;

		// Nachbarn ermitteln (bevorzugt Richtung Ziel)
		const neighbors = [];
		for (const key of DIR_KEYS) {
			const d = DIR[key];
			const nx = cx + d.dx;
			const ny = cy + d.dy;
			if (inBounds(nx, ny) && !visited.has(`${nx},${ny}`)) {
				// Gewichtung: Richtung zum Ziel bevorzugen
				let w = 1;
				if ((nx > cx && ex > cx) || (nx < cx && ex < cx)) w += 3; // horizontal korrekt
				if ((ny > cy && ey > cy) || (ny < cy && ey < cy)) w += 2; // vertikal korrekt
				neighbors.push({ x: nx, y: ny, dir: key, weight: w });
			}
		}

		if (neighbors.length === 0) {
			// Sackgasse - Backtrack
			if (path.length <= 1) return null;
			path.pop();
			const prev = path[path.length - 1];
			cx = prev.x;
			cy = prev.y;
			continue;
		}

		const chosen = rng.pickWeighted(neighbors);
		cx = chosen.x;
		cy = chosen.y;
		visited.add(`${cx},${cy}`);
		path.push({ x: cx, y: cy });
	}

	return cx === ex && cy === ey ? path : null;
}

/**
 * Fallback-Pfad: deterministischer "Snake" von links nach rechts.
 * Garantiert auf kleinen Grids eine robuste Mindestlänge
 * und einen Exit in der rechten Spalte.
 */
function generateFallbackPath(rng) {
	const path = [];
	const maxY = Math.max(0, GRID_ROWS - 1);
	let y = rng.nextInt(0, maxY);

	for (let x = 0; x < GRID_COLS; x++) {
		path.push({ x, y });
		if (x < GRID_COLS - 1 && GRID_ROWS > 1) {
			y = y === 0 ? 1 : 0;
			path.push({ x, y });
		}
	}

	return dedupePath(path);
}

function dedupePath(path) {
	const out = [];
	const seen = new Set();
	for (const p of path) {
		const key = `${p.x},${p.y}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(p);
	}
	return out;
}

/**
 * Bestimmt den Chunk-Typ für eine Position im Main-Path
 */
function assignChunkType(pathIndex, pathLength, rng) {
	if (pathIndex === 0) return "start";
	if (pathIndex === pathLength - 1) return "exit";
	if (pathIndex === pathLength - 2) return "checkpoint";
	if (pathIndex === pathLength - 3) return "boss";

	// Gewichtete Auswahl für normale Chunks
	const types = Object.entries(dungeonData.chunkTypes)
		.filter(([_, cfg]) => !cfg.mandatory && cfg.weight > 0)
		.map(([type, cfg]) => ({ type, weight: cfg.weight }));

	return rng.pickWeighted(types).type;
}

/**
 * Berechnet die benötigten Türen für eine Grid-Position
 * basierend auf den benachbarten belegten Positionen.
 * @param {number} x
 * @param {number} y
 * @param {Map} gridMap - Map<"x,y", chunkInfo>
 * @returns {{ N: boolean, E: boolean, S: boolean, W: boolean }}
 */
function computeDoors(x, y, gridMap) {
	const doors = { N: false, E: false, S: false, W: false };
	for (const key of DIR_KEYS) {
		const d = DIR[key];
		const nx = x + d.dx;
		const ny = y + d.dy;
		if (gridMap.has(`${nx},${ny}`)) {
			doors[key] = true;
		}
	}
	return doors;
}

/**
 * Füllt Side-Branches (leere Grid-Zellen neben dem Pfad)
 * @param {Map} gridMap
 * @param {Object} rng
 * @param {Object} params - { density }
 */
function fillSideBranches(gridMap, rng, params = {}) {
	const density = params.density || 0.4;
	const typeCounts = {};

	// Alle leeren Zellen neben belegten finden
	const candidates = [];
	for (let y = 0; y < GRID_ROWS; y++) {
		for (let x = 0; x < GRID_COLS; x++) {
			if (gridMap.has(`${x},${y}`)) continue;
			// Hat mindestens einen belegten Nachbarn?
			let hasNeighbor = false;
			for (const key of DIR_KEYS) {
				const d = DIR[key];
				if (gridMap.has(`${x + d.dx},${y + d.dy}`)) {
					hasNeighbor = true;
					break;
				}
			}
			if (hasNeighbor) candidates.push({ x, y });
		}
	}

	rng.shuffle(candidates);

	for (const pos of candidates) {
		if (!rng.chance(density)) continue;

		// Typ auswählen (mit maxPerFloor Limit)
		const types = Object.entries(dungeonData.chunkTypes)
			.filter(([type, cfg]) => {
				if (cfg.mandatory) return false;
				if (cfg.weight <= 0) return false;
				const count = typeCounts[type] || 0;
				return count < cfg.maxPerFloor;
			})
			.map(([type, cfg]) => ({ type, weight: cfg.weight }));

		if (types.length === 0) continue;
		const chosen = rng.pickWeighted(types);
		typeCounts[chosen.type] = (typeCounts[chosen.type] || 0) + 1;

		gridMap.set(`${pos.x},${pos.y}`, {
			x: pos.x, y: pos.y,
			type: chosen.type,
			onMainPath: false
		});
	}
}

/**
 * Generiert ein komplettes Dungeon-Stockwerk
 * @param {number} floor - Stockwerk-Nummer (1-50)
 * @param {number|string} seed - Seed für PRNG
 * @param {Object} [params] - Generator-Parameter
 * @param {number} [params.density=0.4] - Chunk-Fülldichte (0-1)
 * @param {number} [params.dangerBias=1] - Fallen-Häufigkeit Multiplikator
 * @param {number} [params.lootBias=1] - Schatz-Häufigkeit Multiplikator
 * @returns {Object} Dungeon-Floor Objekt
 */
export function generateDungeonFloor(floor, seed, params = {}) {
	const combinedSeed = typeof seed === "string" ? `${seed}_F${floor}` : seed * 1000 + floor;
	const rng = createSeededRandom(combinedSeed);

	// 1. Biome bestimmen
	const biome = getBiomeForFloor(floor);

	// 2. Main-Path generieren
	const mainPath = generateMainPath(rng, Math.min(10, GRID_COLS * GRID_ROWS - 2));

	// 3. Grid-Map aufbauen (position → chunk info)
	const gridMap = new Map();
	for (let i = 0; i < mainPath.length; i++) {
		const pos = mainPath[i];
		gridMap.set(`${pos.x},${pos.y}`, {
			x: pos.x,
			y: pos.y,
			type: assignChunkType(i, mainPath.length, rng),
			onMainPath: true,
			pathIndex: i
		});
	}

	// 4. Side-Branches füllen
	fillSideBranches(gridMap, rng, params);

	// 5. Türen berechnen + Chunks generieren
	const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
	const chunks = [];

	for (const [key, info] of gridMap) {
		const doors = computeDoors(info.x, info.y, gridMap);
		const chunk = generateChunk(info.type, doors, rng);
		chunk.gridX = info.x;
		chunk.gridY = info.y;
		chunk.onMainPath = info.onMainPath;
		chunk.pathIndex = info.pathIndex ?? -1;
		chunk.cleared = false;
		chunk.visited = false;

		grid[info.y][info.x] = chunk;
		chunks.push(chunk);
	}

	// 6. Validierung
	validateFloor(grid, gridMap, mainPath);

	// 7. Startposition finden
	const startChunk = chunks.find(c => c.type === "start");
	const startPos = startChunk
		? { gridX: startChunk.gridX, gridY: startChunk.gridY }
		: { gridX: 0, gridY: Math.floor(GRID_ROWS / 2) };

	return {
		floor,
		seed,
		biome,
		grid,
		chunks,
		startPos,
		mainPath,
		gridCols: GRID_COLS,
		gridRows: GRID_ROWS,
		chunkCols: CHUNK_COLS,
		chunkRows: CHUNK_ROWS,
		completed: false
	};
}

/**
 * Validiert und REPARIERT ein generiertes Stockwerk:
 * - Alle Tür-Paare sind beidseitig offen
 * - Main-Path-Verbindungen werden erzwungen
 * - Tür-Tiles im Grid werden nachgetragen
 * - Start erreicht Exit (Connectivity garantiert)
 */
function validateFloor(grid, gridMap, mainPath) {
	const warnings = [];

	// 1. Pflicht-Chunks prüfen
	const required = ["start", "exit", "boss", "checkpoint"];
	for (const type of required) {
		let found = false;
		for (const [, info] of gridMap) {
			if (info.type === type) { found = true; break; }
		}
		if (!found) warnings.push(`Pflicht-Chunk '${type}' fehlt!`);
	}

	// 2. Main-Path: Erzwinge Türen zwischen aufeinanderfolgenden Pfad-Knoten
	for (let i = 0; i < mainPath.length - 1; i++) {
		const curr = mainPath[i];
		const next = mainPath[i + 1];
		const dx = next.x - curr.x;
		const dy = next.y - curr.y;

		// Welche Richtung?
		let dirKey = null;
		if (dx === 1 && dy === 0) dirKey = "E";
		else if (dx === -1 && dy === 0) dirKey = "W";
		else if (dx === 0 && dy === 1) dirKey = "S";
		else if (dx === 0 && dy === -1) dirKey = "N";

		if (!dirKey) continue;

		const cChunk = grid[curr.y]?.[curr.x];
		const nChunk = grid[next.y]?.[next.x];
		const opp = DIR[dirKey].opposite;

		if (cChunk && !cChunk.doors[dirKey]) {
			cChunk.doors[dirKey] = true;
			carveDoorTiles(cChunk.grid, dirKey);
		}
		if (nChunk && !nChunk.doors[opp]) {
			nChunk.doors[opp] = true;
			carveDoorTiles(nChunk.grid, opp);
		}
	}

	// 3. Tür-Konsistenz: Alle Chunks prüfen
	for (let y = 0; y < GRID_ROWS; y++) {
		for (let x = 0; x < GRID_COLS; x++) {
			const chunk = grid[y]?.[x];
			if (!chunk) continue;

			for (const key of DIR_KEYS) {
				const d = DIR[key];
				const nx = x + d.dx;
				const ny = y + d.dy;

				if (chunk.doors?.[key]) {
					const neighbor = grid[ny]?.[nx];
					if (!neighbor) {
						// Tür ins Nichts → schließen
						chunk.doors[key] = false;
					} else if (!neighbor.doors?.[d.opposite]) {
						// Einseitige Tür → beim Nachbar öffnen + Tiles carven
						neighbor.doors[d.opposite] = true;
						carveDoorTiles(neighbor.grid, d.opposite);
					}
				}
			}
		}
	}

	// 4. Connectivity: BFS vom Start zum Exit (sollte jetzt immer passen)
	const start = mainPath[0];
	const end = mainPath[mainPath.length - 1];
	const visited = new Set();
	const queue = [`${start.x},${start.y}`];
	visited.add(queue[0]);

	while (queue.length > 0) {
		const [cx, cy] = queue.shift().split(",").map(Number);
		const chunk = grid[cy]?.[cx];
		if (!chunk) continue;

		for (const key of DIR_KEYS) {
			if (!chunk.doors?.[key]) continue;
			const d = DIR[key];
			const nk = `${cx + d.dx},${cy + d.dy}`;
			if (!visited.has(nk) && gridMap.has(nk)) {
				visited.add(nk);
				queue.push(nk);
			}
		}
	}

	if (!visited.has(`${end.x},${end.y}`)) {
		warnings.push("Start kann Exit nicht erreichen! (Connectivity-Fehler)");
	}

	if (warnings.length > 0) {
		console.warn("[DungeonGenerator] Validierung:", warnings.join("; "));
	}

	return warnings;
}

/**
 * Schnitzt Tür-Tiles in ein Chunk-Grid, falls dort Wände sind.
 * Wird aufgerufen wenn eine Tür nachträglich geöffnet wird.
 */
function carveDoorTiles(grid, dir) {
	if (!grid) return;
	const CHUNK_C = grid[0]?.length || 32;
	const CHUNK_R = grid.length || 18;
	const doorW = 4;
	const midX = Math.floor(CHUNK_C / 2);
	const midY = Math.floor(CHUNK_R / 2);
	const DOOR_TILE = 4; // T.DOOR

	if (dir === "N") {
		for (let dx = -doorW / 2; dx < doorW / 2; dx++) {
			const tx = midX + dx;
			if (tx >= 0 && tx < CHUNK_C) {
				grid[0][tx] = DOOR_TILE;
				grid[1][tx] = DOOR_TILE;
			}
		}
	} else if (dir === "S") {
		for (let dx = -doorW / 2; dx < doorW / 2; dx++) {
			const tx = midX + dx;
			if (tx >= 0 && tx < CHUNK_C) {
				grid[CHUNK_R - 1][tx] = DOOR_TILE;
				grid[CHUNK_R - 2][tx] = DOOR_TILE;
			}
		}
	} else if (dir === "W") {
		for (let dy = -doorW / 2; dy < doorW / 2; dy++) {
			const ty = midY + dy;
			if (ty >= 0 && ty < CHUNK_R) {
				grid[ty][0] = DOOR_TILE;
				grid[ty][1] = DOOR_TILE;
			}
		}
	} else if (dir === "E") {
		for (let dy = -doorW / 2; dy < doorW / 2; dy++) {
			const ty = midY + dy;
			if (ty >= 0 && ty < CHUNK_R) {
				grid[ty][CHUNK_C - 1] = DOOR_TILE;
				grid[ty][CHUNK_C - 2] = DOOR_TILE;
			}
		}
	}
}

/**
 * Bestimmt das Biome für ein Stockwerk
 * @param {number} floor
 * @returns {string}
 */
export function getBiomeForFloor(floor) {
	for (const [biomeKey, biome] of Object.entries(dungeonData.biomes)) {
		const [min, max] = biome.floorRange;
		if (floor >= min && floor <= max) return biomeKey;
	}
	return "stein";
}

/**
 * Holt die Farbpalette für ein Biome
 * @param {string} biome
 * @returns {Object}
 */
export function getBiomePalette(biome) {
	return dungeonData.biomes[biome]?.palette || dungeonData.biomes.stein.palette;
}

/**
 * Berechnet feindliche Stärke für ein Stockwerk
 * @param {number} floor
 * @returns {Object}
 */
export function getFloorDifficulty(floor, scaling = null) {
	const p = dungeonData.floorProgression;
	const hpMult = scaling?.enemyHPMult ?? 1;
	const damageMult = scaling?.damageMult ?? 1;
	const spawnBonus = Math.max(0, Math.floor(scaling?.spawnBonus ?? 0));
	return {
		enemyCount: Math.floor(p.enemyCountBase + p.enemyCountPerFloor * floor),
		enemyHPScale: (p.enemyHPScale + p.enemyHPPerFloor * floor) * hpMult,
		bossHP: Math.floor(p.bossHPBase + p.bossHPPerFloor * floor),
		lootChance: Math.min(0.8, p.lootChanceBase + p.lootChancePerFloor * floor),
		coinReward: Math.floor(p.coinRewardBase + p.coinRewardPerFloor * floor),
		damageScale: damageMult,
		spawnCountBonus: spawnBonus
	};
}

export { GRID_COLS, GRID_ROWS };
