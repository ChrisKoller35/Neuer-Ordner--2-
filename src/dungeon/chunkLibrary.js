// ============================================================
// CHUNK LIBRARY — Prozedural generierte Raum-Templates
// ============================================================
// Erzeugt Tile-Raster für verschiedene Chunk-Typen.
// Jeder Chunk ist 32×18 Tiles. Doors = offene Stellen in den Wänden.
// 0=Floor, 1=Wall, 2=Pit, 3=Spikes, 4=Door
"use strict";

const COLS = 32;
const ROWS = 18;
const T = { FLOOR: 0, WALL: 1, PIT: 2, SPIKES: 3, DOOR: 4 };

/**
 * Erstellt ein leeres Tile-Grid (komplett Floor)
 * @returns {number[][]}
 */
function emptyGrid() {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(T.FLOOR));
}

/**
 * Setzt die Außenwände eines Grids und schneidet Türen aus
 * @param {number[][]} grid
 * @param {{ N: boolean, E: boolean, S: boolean, W: boolean }} doors
 */
function applyWallsAndDoors(grid, doors) {
	const doorW = 4; // Breite der Türöffnung in Tiles
	const midX = Math.floor(COLS / 2);
	const midY = Math.floor(ROWS / 2);

	// Wände setzen (2 Tiles dick oben/unten, 2 Tiles links/rechts)
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			if (y < 2 || y >= ROWS - 2 || x < 2 || x >= COLS - 2) {
				grid[y][x] = T.WALL;
			}
		}
	}

	// Türen ausschneiden
	if (doors.N) {
		for (let dx = -doorW / 2; dx < doorW / 2; dx++) {
			const tx = midX + dx;
			grid[0][tx] = T.DOOR;
			grid[1][tx] = T.DOOR;
		}
	}
	if (doors.S) {
		for (let dx = -doorW / 2; dx < doorW / 2; dx++) {
			const tx = midX + dx;
			grid[ROWS - 1][tx] = T.DOOR;
			grid[ROWS - 2][tx] = T.DOOR;
		}
	}
	if (doors.W) {
		for (let dy = -doorW / 2; dy < doorW / 2; dy++) {
			const ty = midY + dy;
			grid[ty][0] = T.DOOR;
			grid[ty][1] = T.DOOR;
		}
	}
	if (doors.E) {
		for (let dy = -doorW / 2; dy < doorW / 2; dy++) {
			const ty = midY + dy;
			grid[ty][COLS - 1] = T.DOOR;
			grid[ty][COLS - 2] = T.DOOR;
		}
	}
}

/**
 * Hält den Bereich direkt hinter offenen Türen frei, damit Room-Transitions
 * niemals in blockierte Engstellen/Wände führen.
 * @param {number[][]} grid
 * @param {{ N: boolean, E: boolean, S: boolean, W: boolean }} doors
 */
function carveDoorApproaches(grid, doors) {
	if (!grid || !doors) return;
	const midX = Math.floor(COLS / 2);
	const midY = Math.floor(ROWS / 2);
	const halfDoorW = 2;
	const depth = 5;

	const clearIfInBounds = (x, y) => {
		if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
			if (grid[y][x] !== T.DOOR) grid[y][x] = T.FLOOR;
		}
	};

	if (doors.N) {
		for (let y = 2; y <= depth; y++) {
			for (let x = midX - halfDoorW; x <= midX + halfDoorW - 1; x++) {
				clearIfInBounds(x, y);
			}
		}
	}
	if (doors.S) {
		for (let y = ROWS - 3; y >= ROWS - 1 - depth; y--) {
			for (let x = midX - halfDoorW; x <= midX + halfDoorW - 1; x++) {
				clearIfInBounds(x, y);
			}
		}
	}
	if (doors.W) {
		for (let x = 2; x <= depth; x++) {
			for (let y = midY - halfDoorW; y <= midY + halfDoorW - 1; y++) {
				clearIfInBounds(x, y);
			}
		}
	}
	if (doors.E) {
		for (let x = COLS - 3; x >= COLS - 1 - depth; x--) {
			for (let y = midY - halfDoorW; y <= midY + halfDoorW - 1; y++) {
				clearIfInBounds(x, y);
			}
		}
	}
}

/**
 * Fügt zufällige Säulen in den Raum ein (für Combat-Räume)
 * @param {number[][]} grid
 * @param {Function} rng - rng.nextInt(min, max)
 * @param {number} count
 */
function addPillars(grid, rng, count) {
	for (let i = 0; i < count; i++) {
		const px = rng.nextInt(5, COLS - 6);
		const py = rng.nextInt(4, ROWS - 5);
		const size = rng.nextInt(1, 2);
		for (let dy = 0; dy < size; dy++) {
			for (let dx = 0; dx < size; dx++) {
				if (grid[py + dy] && grid[py + dy][px + dx] === T.FLOOR) {
					grid[py + dy][px + dx] = T.WALL;
				}
			}
		}
	}
}

/**
 * Fügt Fallen (Spikes) in den Raum ein
 * @param {number[][]} grid
 * @param {Function} rng
 * @param {number} count
 */
function addSpikes(grid, rng, count) {
	for (let i = 0; i < count; i++) {
		const sx = rng.nextInt(4, COLS - 5);
		const sy = rng.nextInt(4, ROWS - 5);
		const len = rng.nextInt(2, 5);
		const horizontal = rng.chance(0.5);
		for (let k = 0; k < len; k++) {
			const tx = horizontal ? sx + k : sx;
			const ty = horizontal ? sy : sy + k;
			if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && grid[ty][tx] === T.FLOOR) {
				grid[ty][tx] = T.SPIKES;
			}
		}
	}
}

/**
 * Fügt Gruben (Pits) ein
 * @param {number[][]} grid
 * @param {Function} rng
 * @param {number} count
 */
function addPits(grid, rng, count) {
	for (let i = 0; i < count; i++) {
		const px = rng.nextInt(5, COLS - 7);
		const py = rng.nextInt(4, ROWS - 6);
		const w = rng.nextInt(2, 4);
		const h = rng.nextInt(2, 3);
		for (let dy = 0; dy < h; dy++) {
			for (let dx = 0; dx < w; dx++) {
				const ty = py + dy;
				const tx = px + dx;
				if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && grid[ty][tx] === T.FLOOR) {
					grid[ty][tx] = T.PIT;
				}
			}
		}
	}
}

/**
 * Generiert Spawn-Points im begehbaren Bereich
 * @param {number[][]} grid
 * @param {Function} rng
 * @param {string} type - "enemy" | "loot" | "deco"
 * @param {number} count
 * @returns {Array<{x: number, y: number, type: string}>}
 */
function generateSpawnPoints(grid, rng, type, count) {
	const points = [];
	const candidates = [];

	// Begehbare Tiles sammeln (mit Abstand zu Wänden/Türen)
	for (let y = 3; y < ROWS - 3; y++) {
		for (let x = 3; x < COLS - 3; x++) {
			if (grid[y][x] === T.FLOOR) {
				candidates.push({ x, y });
			}
		}
	}

	rng.shuffle(candidates);
	const used = Math.min(count, candidates.length);
	for (let i = 0; i < used; i++) {
		points.push({ x: candidates[i].x, y: candidates[i].y, type });
	}
	return points;
}

// ============================================================
// CHUNK-GENERATOREN PRO TYP
// ============================================================

const chunkGenerators = {
	start(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		const spawns = [{ x: 5, y: Math.floor(ROWS / 2), type: "playerSpawn" }];
		return { grid, spawns };
	},

	exit(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		// Portal in der Mitte
		const cx = Math.floor(COLS / 2);
		const cy = Math.floor(ROWS / 2);
		const spawns = [{ x: cx, y: cy, type: "exitPortal" }];
		return { grid, spawns };
	},

	combat(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		addPillars(grid, rng, rng.nextInt(2, 5));
		if (rng.chance(0.3)) addSpikes(grid, rng, 1);
		const enemies = generateSpawnPoints(grid, rng, "enemy", rng.nextInt(3, 6));
		const loot = rng.chance(0.4) ? generateSpawnPoints(grid, rng, "loot", 1) : [];
		return { grid, spawns: [...enemies, ...loot] };
	},

	corridor(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		// Korridor-artige Verengung
		const narrowTop = rng.nextInt(3, 5);
		const narrowBot = ROWS - rng.nextInt(3, 5);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 2; x < COLS - 2; x++) {
				if ((y > 1 && y < narrowTop) || (y >= narrowBot && y < ROWS - 2)) {
					if (grid[y][x] === T.FLOOR) grid[y][x] = T.WALL;
				}
			}
		}
		// Re-apply doors (die Verengung könnte Türen blockieren)
		applyWallsAndDoors(grid, doors);
		const enemies = generateSpawnPoints(grid, rng, "enemy", rng.nextInt(1, 3));
		return { grid, spawns: enemies };
	},

	treasure(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		// Dekorative Säulen um den Schatz
		const cx = Math.floor(COLS / 2);
		const cy = Math.floor(ROWS / 2);
		for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
			if (grid[cy + dy] && grid[cy + dy][cx + dx] !== undefined) {
				grid[cy + dy][cx + dx] = T.WALL;
			}
		}
		const loot = [
			{ x: cx, y: cy, type: "loot" },
			{ x: cx - 1, y: cy, type: "loot" },
			{ x: cx + 1, y: cy, type: "loot" }
		];
		const guards = rng.chance(0.5) ? generateSpawnPoints(grid, rng, "enemy", rng.nextInt(1, 2)) : [];
		return { grid, spawns: [...loot, ...guards] };
	},

	danger(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		addSpikes(grid, rng, rng.nextInt(4, 8));
		addPits(grid, rng, rng.nextInt(1, 3));
		const loot = rng.chance(0.6) ? generateSpawnPoints(grid, rng, "loot", rng.nextInt(1, 2)) : [];
		return { grid, spawns: loot };
	},

	merchant(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		const cx = Math.floor(COLS / 2);
		const spawns = [{ x: cx, y: 5, type: "merchant" }];
		return { grid, spawns };
	},

	boss(doors, rng) {
		const grid = emptyGrid();
		// Boss-Raum: breiterer offener Bereich
		applyWallsAndDoors(grid, doors);
		// Ein paar Deckungssäulen
		addPillars(grid, rng, rng.nextInt(1, 3));
		const bossX = Math.floor(COLS * 0.75);
		const bossY = Math.floor(ROWS / 2);
		// Freie Zone um Boss-Spawn räumen (3×3 Tiles), damit Boss nicht in Säulen steckt
		for (let dy = -2; dy <= 2; dy++) {
			for (let dx = -2; dx <= 2; dx++) {
				const tx = bossX + dx;
				const ty = bossY + dy;
				if (ty >= 2 && ty < ROWS - 2 && tx >= 2 && tx < COLS - 2) {
					if (grid[ty][tx] === T.WALL) {
						grid[ty][tx] = T.FLOOR;
					}
				}
			}
		}
		const spawns = [{ x: bossX, y: bossY, type: "bossSpawn" }];
		return { grid, spawns };
	},

	checkpoint(doors, rng) {
		const grid = emptyGrid();
		applyWallsAndDoors(grid, doors);
		const cx = Math.floor(COLS / 2);
		const cy = Math.floor(ROWS / 2);
		const spawns = [{ x: cx, y: cy, type: "checkpoint" }];
		return { grid, spawns };
	}
};

/**
 * Generiert einen Chunk mit Tiles und Spawn-Points
 * @param {string} type - Chunk-Typ (combat, corridor, start, etc.)
 * @param {{ N: boolean, E: boolean, S: boolean, W: boolean }} doors - Offene Türen
 * @param {Object} rng - Seeded Random Generator
 * @param {number} [rotation=0] - Rotation in 90°-Schritten (0, 1, 2, 3)
 * @returns {{ grid: number[][], spawns: Array, type: string, doors: Object, rotatable: boolean }}
 */
export function generateChunk(type, doors, rng, rotation = 0) {
	const generator = chunkGenerators[type] || chunkGenerators.combat;

	// Bei Rotation: Türen rückwärts rotieren, damit Generator originale Türen bekommt
	const rotatedDoors = rotation > 0 ? rotateDoors(doors, (4 - rotation) % 4) : doors;
	const { grid, spawns } = generator(rotatedDoors, rng);
	carveDoorApproaches(grid, rotatedDoors);

	// Grid + Spawns rotieren
	let finalGrid = grid;
	let finalSpawns = spawns;
	if (rotation > 0) {
		for (let r = 0; r < rotation; r++) {
			finalGrid = rotateGrid90(finalGrid);
			finalSpawns = rotateSpawns90(finalSpawns, COLS, ROWS);
		}
	}

	// Pflicht-Chunks sind nicht rotierbar
	const nonRotatable = ["start", "exit", "checkpoint"];
	const rotatable = !nonRotatable.includes(type);

	return { grid: finalGrid, spawns: finalSpawns, type, doors: { ...doors }, rotatable };
}

/**
 * Rotiert ein Tile-Grid um 90° im Uhrzeigersinn
 */
function rotateGrid90(grid) {
	const rows = grid.length;
	const cols = grid[0].length;
	const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			rotated[x][rows - 1 - y] = grid[y][x];
		}
	}
	return rotated;
}

/**
 * Rotiert Spawn-Points um 90° im Uhrzeigersinn
 */
function rotateSpawns90(spawns, gridCols, gridRows) {
	return spawns.map(sp => ({
		...sp,
		x: gridRows - 1 - sp.y,
		y: sp.x
	}));
}

/**
 * Rotiert DoorMask um 90° im Uhrzeigersinn (n-mal)
 */
function rotateDoors(doors, n) {
	const order = ["N", "E", "S", "W"];
	const result = {};
	for (let i = 0; i < 4; i++) {
		const from = order[i];
		const to = order[(i + n) % 4];
		result[to] = doors[from] || false;
	}
	return result;
}

export { T as TILE_TYPES, COLS as CHUNK_COLS, ROWS as CHUNK_ROWS, rotateDoors };
