import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '../src/dungeon/seedRandom.js';

describe('createSeededRandom', () => {
	it('returns an object with all expected methods', () => {
		const rng = createSeededRandom(1);
		expect(rng).toHaveProperty('next');
		expect(rng).toHaveProperty('nextInt');
		expect(rng).toHaveProperty('nextFloat');
		expect(rng).toHaveProperty('pick');
		expect(rng).toHaveProperty('pickWeighted');
		expect(rng).toHaveProperty('shuffle');
		expect(rng).toHaveProperty('chance');
		expect(rng).toHaveProperty('getSeed');
	});

	it('getSeed returns the original seed', () => {
		expect(createSeededRandom(42).getSeed()).toBe(42);
		expect(createSeededRandom('hello').getSeed()).toBe('hello');
	});
});

describe('determinism', () => {
	it('same seed produces same sequence', () => {
		const a = createSeededRandom(12345);
		const b = createSeededRandom(12345);
		for (let i = 0; i < 100; i++) {
			expect(a.next()).toBe(b.next());
		}
	});

	it('different seeds produce different sequences', () => {
		const a = createSeededRandom(1);
		const b = createSeededRandom(2);
		// At least one of the first 5 values should differ
		const results = Array.from({ length: 5 }, () => a.next() === b.next());
		expect(results).toContain(false);
	});

	it('string seed is deterministic', () => {
		const a = createSeededRandom('dungeon');
		const b = createSeededRandom('dungeon');
		for (let i = 0; i < 20; i++) {
			expect(a.next()).toBe(b.next());
		}
	});
});

describe('next', () => {
	it('returns values in [0, 1)', () => {
		const rng = createSeededRandom(99);
		for (let i = 0; i < 500; i++) {
			const val = rng.next();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThan(1);
		}
	});
});

describe('nextInt', () => {
	it('returns integers within inclusive range', () => {
		const rng = createSeededRandom(7);
		for (let i = 0; i < 200; i++) {
			const val = rng.nextInt(3, 8);
			expect(Number.isInteger(val)).toBe(true);
			expect(val).toBeGreaterThanOrEqual(3);
			expect(val).toBeLessThanOrEqual(8);
		}
	});

	it('works with min === max', () => {
		const rng = createSeededRandom(1);
		expect(rng.nextInt(5, 5)).toBe(5);
	});
});

describe('nextFloat', () => {
	it('returns floats in [min, max)', () => {
		const rng = createSeededRandom(42);
		for (let i = 0; i < 200; i++) {
			const val = rng.nextFloat(2.0, 5.0);
			expect(val).toBeGreaterThanOrEqual(2.0);
			expect(val).toBeLessThan(5.0);
		}
	});
});

describe('pick', () => {
	it('returns null for empty array', () => {
		const rng = createSeededRandom(1);
		expect(rng.pick([])).toBeNull();
	});

	it('returns null for null/undefined', () => {
		const rng = createSeededRandom(1);
		expect(rng.pick(null)).toBeNull();
	});

	it('returns an element from the array', () => {
		const rng = createSeededRandom(1);
		const items = ['a', 'b', 'c'];
		for (let i = 0; i < 50; i++) {
			expect(items).toContain(rng.pick(items));
		}
	});

	it('returns the only element for single-element array', () => {
		const rng = createSeededRandom(1);
		expect(rng.pick(['only'])).toBe('only');
	});
});

describe('pickWeighted', () => {
	it('returns null for empty array', () => {
		const rng = createSeededRandom(1);
		expect(rng.pickWeighted([])).toBeNull();
	});

	it('returns items from weighted list', () => {
		const rng = createSeededRandom(42);
		const items = [
			{ weight: 10, type: 'common' },
			{ weight: 1, type: 'rare' }
		];
		const results = Array.from({ length: 200 }, () => rng.pickWeighted(items));
		const commonCount = results.filter(r => r.type === 'common').length;
		// Common should appear significantly more often
		expect(commonCount).toBeGreaterThan(150);
	});

	it('handles items without explicit weight (defaults to 1)', () => {
		const rng = createSeededRandom(1);
		const items = [{ type: 'a' }, { type: 'b' }];
		const result = rng.pickWeighted(items);
		expect(['a', 'b']).toContain(result.type);
	});
});

describe('shuffle', () => {
	it('returns same array (in-place)', () => {
		const rng = createSeededRandom(1);
		const arr = [1, 2, 3, 4, 5];
		const result = rng.shuffle(arr);
		expect(result).toBe(arr);
	});

	it('keeps all elements', () => {
		const rng = createSeededRandom(42);
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		rng.shuffle(arr);
		expect(arr.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	it('is deterministic', () => {
		const a = createSeededRandom(100);
		const b = createSeededRandom(100);
		const arr1 = [1, 2, 3, 4, 5];
		const arr2 = [1, 2, 3, 4, 5];
		a.shuffle(arr1);
		b.shuffle(arr2);
		expect(arr1).toEqual(arr2);
	});
});

describe('chance', () => {
	it('chance(0) always returns false', () => {
		const rng = createSeededRandom(1);
		for (let i = 0; i < 100; i++) {
			expect(rng.chance(0)).toBe(false);
		}
	});

	it('chance(1) always returns true', () => {
		const rng = createSeededRandom(1);
		for (let i = 0; i < 100; i++) {
			expect(rng.chance(1)).toBe(true);
		}
	});

	it('chance(0.5) returns a mix of true and false', () => {
		const rng = createSeededRandom(42);
		const results = Array.from({ length: 200 }, () => rng.chance(0.5));
		const trueCount = results.filter(Boolean).length;
		expect(trueCount).toBeGreaterThan(50);
		expect(trueCount).toBeLessThan(150);
	});
});
