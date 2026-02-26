import { describe, it, expect } from 'vitest';
import {
	clamp, clamp01, easeOutCubic, easeInOutCubic,
	lerp, distance, angleBetween
} from '../src/core/utils.js';

// ---- clamp ----
describe('clamp', () => {
	it('returns value when within range', () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});
	it('clamps to min', () => {
		expect(clamp(-3, 0, 10)).toBe(0);
	});
	it('clamps to max', () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});
	it('works when min === max', () => {
		expect(clamp(99, 5, 5)).toBe(5);
	});
});

// ---- clamp01 ----
describe('clamp01', () => {
	it('passes through 0..1 values', () => {
		expect(clamp01(0.5)).toBe(0.5);
	});
	it('clamps negative to 0', () => {
		expect(clamp01(-0.1)).toBe(0);
	});
	it('clamps > 1 to 1', () => {
		expect(clamp01(2)).toBe(1);
	});
});

// ---- easeOutCubic ----
describe('easeOutCubic', () => {
	it('returns 0 at t=0', () => {
		expect(easeOutCubic(0)).toBe(0);
	});
	it('returns 1 at t=1', () => {
		expect(easeOutCubic(1)).toBe(1);
	});
	it('is > 0.5 at t=0.5 (ease-out curve)', () => {
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
	});
	it('clamps input below 0', () => {
		expect(easeOutCubic(-1)).toBe(0);
	});
});

// ---- easeInOutCubic ----
describe('easeInOutCubic', () => {
	it('returns 0 at t=0', () => {
		expect(easeInOutCubic(0)).toBe(0);
	});
	it('returns 1 at t=1', () => {
		expect(easeInOutCubic(1)).toBe(1);
	});
	it('returns 0.5 at t=0.5 (symmetry)', () => {
		expect(easeInOutCubic(0.5)).toBe(0.5);
	});
});

// ---- lerp ----
describe('lerp', () => {
	it('returns a at t=0', () => {
		expect(lerp(10, 20, 0)).toBe(10);
	});
	it('returns b at t=1', () => {
		expect(lerp(10, 20, 1)).toBe(20);
	});
	it('interpolates at t=0.5', () => {
		expect(lerp(0, 100, 0.5)).toBe(50);
	});
	it('clamps t to [0,1]', () => {
		expect(lerp(0, 100, 2)).toBe(100);
		expect(lerp(0, 100, -1)).toBe(0);
	});
});

// ---- distance ----
describe('distance', () => {
	it('returns 0 for same point', () => {
		expect(distance(3, 4, 3, 4)).toBe(0);
	});
	it('returns correct distance (3-4-5 triangle)', () => {
		expect(distance(0, 0, 3, 4)).toBe(5);
	});
});

// ---- angleBetween ----
describe('angleBetween', () => {
	it('returns 0 for east direction', () => {
		expect(angleBetween(0, 0, 1, 0)).toBe(0);
	});
	it('returns π/2 for south direction', () => {
		expect(angleBetween(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
	});
	it('returns π for west direction', () => {
		expect(angleBetween(0, 0, -1, 0)).toBeCloseTo(Math.PI);
	});
});
