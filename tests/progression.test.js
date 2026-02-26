import { describe, it, expect } from 'vitest';
import {
	getXPForLevel,
	getLevelFromXP,
	FOE_XP_VALUES,
	TALENTS,
	createProgressionState
} from '../src/player/progression.js';

// ---- XP Curve ----
describe('getXPForLevel', () => {
	it('Level 1 requires 0 XP', () => {
		expect(getXPForLevel(1)).toBe(0);
	});

	it('Level 0 and negative return 0', () => {
		expect(getXPForLevel(0)).toBe(0);
		expect(getXPForLevel(-1)).toBe(0);
	});

	it('Level 2 requires 200 XP', () => {
		expect(getXPForLevel(2)).toBe(200);
	});

	it('Level 3 requires 600 XP', () => {
		// Formula: 100 * 3^2 - 100*3 = 900 - 300 = 600
		expect(getXPForLevel(3)).toBe(600);
	});

	it('XP requirements increase with level', () => {
		for (let i = 2; i <= 20; i++) {
			expect(getXPForLevel(i + 1)).toBeGreaterThan(getXPForLevel(i));
		}
	});

	it('returns an integer', () => {
		for (let i = 1; i <= 50; i++) {
			expect(Number.isInteger(getXPForLevel(i))).toBe(true);
		}
	});
});

// ---- Level from XP ----
describe('getLevelFromXP', () => {
	it('0 XP = Level 1', () => {
		expect(getLevelFromXP(0)).toBe(1);
	});

	it('199 XP = still Level 1', () => {
		expect(getLevelFromXP(199)).toBe(1);
	});

	it('200 XP = Level 2', () => {
		expect(getLevelFromXP(200)).toBe(2);
	});

	it('exact threshold XP gives correct level', () => {
		for (let level = 1; level <= 10; level++) {
			const xp = getXPForLevel(level);
			expect(getLevelFromXP(xp)).toBe(level);
		}
	});

	it('XP just below threshold stays at previous level', () => {
		for (let level = 2; level <= 10; level++) {
			const xp = getXPForLevel(level) - 1;
			expect(getLevelFromXP(xp)).toBe(level - 1);
		}
	});

	it('caps at level 99', () => {
		expect(getLevelFromXP(999999999)).toBe(99);
	});

	it('negative XP = Level 1', () => {
		expect(getLevelFromXP(-100)).toBe(1);
	});
});

// ---- roundtrip ----
describe('XP/Level roundtrip', () => {
	it('getLevelFromXP(getXPForLevel(n)) === n for all levels', () => {
		for (let level = 1; level <= 50; level++) {
			expect(getLevelFromXP(getXPForLevel(level))).toBe(level);
		}
	});
});

// ---- FOE_XP_VALUES ----
describe('FOE_XP_VALUES', () => {
	it('has a default value', () => {
		expect(FOE_XP_VALUES.default).toBeGreaterThan(0);
	});

	it('boss gives more XP than regular foes', () => {
		expect(FOE_XP_VALUES.boss).toBeGreaterThan(FOE_XP_VALUES.default);
		expect(FOE_XP_VALUES.boss).toBeGreaterThan(FOE_XP_VALUES.jelly);
		expect(FOE_XP_VALUES.boss).toBeGreaterThan(FOE_XP_VALUES.bogenschreck);
	});

	it('all values are positive', () => {
		for (const [_key, val] of Object.entries(FOE_XP_VALUES)) {
			expect(val).toBeGreaterThan(0);
		}
	});
});

// ---- TALENTS ----
describe('TALENTS', () => {
	it('has 5 talents', () => {
		expect(Object.keys(TALENTS)).toHaveLength(5);
	});

	it('each talent has required fields', () => {
		for (const [_id, talent] of Object.entries(TALENTS)) {
			expect(talent).toHaveProperty('id');
			expect(talent).toHaveProperty('name');
			expect(talent).toHaveProperty('description');
			expect(talent).toHaveProperty('maxRank');
			expect(talent).toHaveProperty('effect');
			expect(typeof talent.effect).toBe('function');
			expect(talent.maxRank).toBeGreaterThan(0);
		}
	});

	it('effect(0) returns neutral values', () => {
		const swift = TALENTS.swiftFins.effect(0);
		expect(swift.speedBonus).toBe(0);
	});

	it('effect increases with rank', () => {
		const rank1 = TALENTS.swiftFins.effect(1);
		const rank3 = TALENTS.swiftFins.effect(3);
		expect(rank3.speedBonus).toBeGreaterThan(rank1.speedBonus);
	});

	it('sharpShooter reduces cooldown per rank', () => {
		const rank2 = TALENTS.sharpShooter.effect(2);
		expect(rank2.shotCooldownReduction).toBeCloseTo(0.16, 5);
	});

	it('energyReserves adds 50 per rank', () => {
		expect(TALENTS.energyReserves.effect(1).energyMaxBonus).toBe(50);
		expect(TALENTS.energyReserves.effect(3).energyMaxBonus).toBe(150);
	});

	it('quickRecovery adds 20% regen per rank', () => {
		expect(TALENTS.quickRecovery.effect(1).energyRegenBonus).toBeCloseTo(0.20, 5);
		expect(TALENTS.quickRecovery.effect(2).energyRegenBonus).toBeCloseTo(0.40, 5);
	});
});

// ---- Progression State ----
describe('createProgressionState', () => {
	it('returns a fresh state object', () => {
		const state = createProgressionState();
		expect(state).toHaveProperty('totalXP', 0);
		expect(state).toHaveProperty('level', 1);
		expect(state).toHaveProperty('skillPoints', 0);
		expect(state).toHaveProperty('talents');
	});

	it('creates independent instances', () => {
		const a = createProgressionState();
		const b = createProgressionState();
		a.totalXP = 999;
		expect(b.totalXP).toBe(0);
	});

	it('talents start at rank 0', () => {
		const state = createProgressionState();
		for (const [_id, rank] of Object.entries(state.talents)) {
			expect(rank).toBe(0);
		}
	});
});
