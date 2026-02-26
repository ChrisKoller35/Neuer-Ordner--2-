import { describe, it, expect } from 'vitest';
import { generateDungeonFloor, getBiomeForFloor, getBiomePalette, getFloorDifficulty } from '../src/dungeon/dungeonGenerator.js';

// ---- Biomes ----
describe('getBiomeForFloor', () => {
	it('floors 1-15 → "stein"', () => {
		expect(getBiomeForFloor(1)).toBe('stein');
		expect(getBiomeForFloor(15)).toBe('stein');
	});

	it('floors 16-30 → "eis"', () => {
		expect(getBiomeForFloor(16)).toBe('eis');
		expect(getBiomeForFloor(30)).toBe('eis');
	});

	it('floors 31-50 → "lava"', () => {
		expect(getBiomeForFloor(31)).toBe('lava');
		expect(getBiomeForFloor(50)).toBe('lava');
	});

	it('floor 0 or negative returns fallback "stein"', () => {
		expect(getBiomeForFloor(0)).toBe('stein');
	});
});

// ---- Biome Palette ----
describe('getBiomePalette', () => {
	it('returns a palette object with floor, wall, etc.', () => {
		const pal = getBiomePalette('stein');
		expect(pal).toHaveProperty('floor');
		expect(pal).toHaveProperty('wall');
		expect(pal).toHaveProperty('pit');
		expect(pal).toHaveProperty('door');
	});

	it('unknown biome returns stein palette (fallback)', () => {
		const pal = getBiomePalette('doesnt_exist');
		expect(pal).toEqual(getBiomePalette('stein'));
	});
});

// ---- Floor Difficulty ----
describe('getFloorDifficulty', () => {
	it('returns difficulty object', () => {
		const d = getFloorDifficulty(1);
		expect(d).toHaveProperty('enemyCount');
		expect(d).toHaveProperty('enemyHPScale');
		expect(d).toHaveProperty('bossHP');
		expect(d).toHaveProperty('lootChance');
		expect(d).toHaveProperty('coinReward');
	});

	it('all values are positive', () => {
		const d = getFloorDifficulty(1);
		expect(d.enemyCount).toBeGreaterThan(0);
		expect(d.enemyHPScale).toBeGreaterThan(0);
		expect(d.bossHP).toBeGreaterThan(0);
		expect(d.lootChance).toBeGreaterThan(0);
		expect(d.coinReward).toBeGreaterThan(0);
	});

	it('difficulty increases with floor', () => {
		const d1 = getFloorDifficulty(1);
		const d10 = getFloorDifficulty(10);
		const d50 = getFloorDifficulty(50);
		expect(d10.enemyHPScale).toBeGreaterThan(d1.enemyHPScale);
		expect(d50.bossHP).toBeGreaterThan(d10.bossHP);
		expect(d50.coinReward).toBeGreaterThan(d10.coinReward);
	});

	it('lootChance capped at 0.8', () => {
		const d = getFloorDifficulty(999);
		expect(d.lootChance).toBeLessThanOrEqual(0.8);
	});
});

// ---- Floor Generation ----
describe('generateDungeonFloor', () => {
	it('returns a valid floor object', () => {
		const floor = generateDungeonFloor(1, 42);
		expect(floor.floor).toBe(1);
		expect(floor.seed).toBe(42);
		expect(floor.biome).toBe('stein');
		expect(floor.gridCols).toBe(6);
		expect(floor.gridRows).toBe(3);
		expect(floor.grid).toHaveLength(3);
		expect(floor.grid[0]).toHaveLength(6);
		expect(floor.chunks.length).toBeGreaterThan(0);
		expect(floor.completed).toBe(false);
	});

	it('same seed + floor → identical result', () => {
		const a = generateDungeonFloor(3, 'hello');
		const b = generateDungeonFloor(3, 'hello');
		expect(a.chunks.length).toBe(b.chunks.length);
		expect(a.startPos).toEqual(b.startPos);
		expect(a.mainPath.length).toBe(b.mainPath.length);
		for (let i = 0; i < a.mainPath.length; i++) {
			expect(a.mainPath[i]).toEqual(b.mainPath[i]);
		}
	});

	it('different seed → different result', () => {
		const a = generateDungeonFloor(1, 42);
		const b = generateDungeonFloor(1, 99);
		// At least one thing differs (path, chunks, or startPos)
		const differ =
			a.mainPath.length !== b.mainPath.length ||
			a.startPos.gridX !== b.startPos.gridX ||
			a.startPos.gridY !== b.startPos.gridY ||
			a.chunks.length !== b.chunks.length;
		expect(differ).toBe(true);
	});

	it('always has a start and exit chunk', () => {
		for (const seed of [1, 2, 3, 100, 999]) {
			const floor = generateDungeonFloor(1, seed);
			const hasStart = floor.chunks.some(c => c.type === 'start');
			const hasExit = floor.chunks.some(c => c.type === 'exit');
			expect(hasStart).toBe(true);
			expect(hasExit).toBe(true);
		}
	});

	it('mainPath starts at column 0 and ends at right edge', () => {
		const floor = generateDungeonFloor(1, 42);
		expect(floor.mainPath[0].x).toBe(0);
		expect(floor.mainPath[floor.mainPath.length - 1].x).toBe(floor.gridCols - 1);
	});

	it('generates different biomes for different floors', () => {
		const f1 = generateDungeonFloor(1, 42);
		const f20 = generateDungeonFloor(20, 42);
		const f40 = generateDungeonFloor(40, 42);
		expect(f1.biome).toBe('stein');
		expect(f20.biome).toBe('eis');
		expect(f40.biome).toBe('lava');
	});

	it('chunks have door info and grid tiles', () => {
		const floor = generateDungeonFloor(1, 42);
		for (const chunk of floor.chunks) {
			expect(chunk.doors).toBeDefined();
			expect(chunk.grid).toBeDefined();
			expect(chunk.grid.length).toBeGreaterThan(0);
			expect(chunk.grid[0].length).toBeGreaterThan(0);
		}
	});

	it('main path is contiguous (no jumps > 1 cell)', () => {
		const floor = generateDungeonFloor(5, 77);
		for (let i = 0; i < floor.mainPath.length - 1; i++) {
			const a = floor.mainPath[i];
			const b = floor.mainPath[i + 1];
			const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
			expect(dist).toBe(1); // Manhattan distance = 1
		}
	});
});
