import { describe, it, expect } from 'vitest';
import {
	EndlessRun,
	createEndlessRun,
	getRewardTierForDepth,
	getScalingForDepth,
	calcRoomReward,
	getActiveDepth
} from '../src/dungeon/dungeonEndless.js';

describe('dungeonEndless', () => {
	it('EndlessRun has required default fields', () => {
		expect(EndlessRun).toHaveProperty('depth', 0);
		expect(EndlessRun).toHaveProperty('roomsCleared', 0);
		expect(EndlessRun).toHaveProperty('pendingRewards');
		expect(EndlessRun).toHaveProperty('currentTier');
	});

	it('createEndlessRun initializes from depth', () => {
		const run = createEndlessRun(12);
		expect(run.depth).toBe(12);
		expect(run.roomsCleared).toBe(0);
		expect(run.currentTier).toBe('gold');
	});

	it('maps reward tiers by depth ranges', () => {
		expect(getRewardTierForDepth(1)).toBe('silber');
		expect(getRewardTierForDepth(10)).toBe('gold');
		expect(getRewardTierForDepth(25)).toBe('platin');
		expect(getRewardTierForDepth(45)).toBe('diamant');
		expect(getRewardTierForDepth(80)).toBe('legendär');
	});

	it('returns fixed scaling for non-legendary tiers', () => {
		const low = getScalingForDepth(5);
		expect(low.enemyHPMult).toBe(1);
		expect(low.damageMult).toBe(1);
		expect(low.spawnBonus).toBe(0);

		const mid = getScalingForDepth(20);
		expect(mid.enemyHPMult).toBe(2);
		expect(mid.damageMult).toBe(1.6);
		expect(mid.spawnBonus).toBe(1);
	});

	it('returns progressive scaling for legendary depths', () => {
		const depth60 = getScalingForDepth(60);
		expect(depth60.tier).toBe('legendär');
		expect(depth60.enemyHPMult).toBeCloseTo(1 + 60 * 0.05, 6);
		expect(depth60.damageMult).toBeCloseTo(Math.min(4.0, 1 + 60 * 0.03), 6);
		expect(depth60.spawnBonus).toBeGreaterThanOrEqual(3);
	});

	it('caps legendary spawn bonus at hard limit', () => {
		const veryDeep = getScalingForDepth(999);
		expect(veryDeep.spawnBonus).toBe(4);
	});

	it('calcRoomReward follows depth formula and key cadence', () => {
		const reward1 = calcRoomReward(1);
		expect(reward1.coins).toBe(62);
		expect(reward1.extraKey).toBe(false);

		const reward10 = calcRoomReward(10);
		expect(reward10.coins).toBe(170);
		expect(reward10.extraKey).toBe(true);
	});

	it('getActiveDepth combines base progress and run clears', () => {
		expect(getActiveDepth(0, 0)).toBe(1);
		expect(getActiveDepth(4, 0)).toBe(5);
		expect(getActiveDepth(4, 6)).toBe(11);
	});
});
