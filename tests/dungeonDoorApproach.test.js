import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '../src/dungeon/seedRandom.js';
import { generateChunk, TILE_TYPES, CHUNK_COLS, CHUNK_ROWS } from '../src/dungeon/chunkLibrary.js';

function expectDoorApproachClear(grid, dir) {
	const midX = Math.floor(CHUNK_COLS / 2);
	const midY = Math.floor(CHUNK_ROWS / 2);
	const xRange = [midX - 2, midX - 1, midX, midX + 1];
	const yRange = [midY - 2, midY - 1, midY, midY + 1];

	if (dir === 'N') {
		for (const x of xRange) {
			expect(grid[2][x]).not.toBe(TILE_TYPES.WALL);
			expect(grid[3][x]).not.toBe(TILE_TYPES.WALL);
		}
	}
	if (dir === 'S') {
		for (const x of xRange) {
			expect(grid[CHUNK_ROWS - 3][x]).not.toBe(TILE_TYPES.WALL);
			expect(grid[CHUNK_ROWS - 4][x]).not.toBe(TILE_TYPES.WALL);
		}
	}
	if (dir === 'W') {
		for (const y of yRange) {
			expect(grid[y][2]).not.toBe(TILE_TYPES.WALL);
			expect(grid[y][3]).not.toBe(TILE_TYPES.WALL);
		}
	}
	if (dir === 'E') {
		for (const y of yRange) {
			expect(grid[y][CHUNK_COLS - 3]).not.toBe(TILE_TYPES.WALL);
			expect(grid[y][CHUNK_COLS - 4]).not.toBe(TILE_TYPES.WALL);
		}
	}
}

describe('chunk doorway approach safety', () => {
	it('keeps corridor north/south door approaches clear', () => {
		const rng = createSeededRandom('corridor-door-approach');
		const chunk = generateChunk('corridor', { N: true, E: false, S: true, W: false }, rng);
		expectDoorApproachClear(chunk.grid, 'N');
		expectDoorApproachClear(chunk.grid, 'S');
	});

	it('keeps combat room east/west door approaches clear', () => {
		const rng = createSeededRandom('combat-door-approach');
		const chunk = generateChunk('combat', { N: false, E: true, S: false, W: true }, rng);
		expectDoorApproachClear(chunk.grid, 'E');
		expectDoorApproachClear(chunk.grid, 'W');
	});
});
