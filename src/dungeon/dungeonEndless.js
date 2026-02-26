// ============================================================
// DUNGEON ENDLESS — Fortschritt, Skalierung, Rewards
// ============================================================
"use strict";

export const EndlessRun = {
	depth: 0,
	roomsCleared: 0,
	pendingRewards: [],
	currentTier: 'silber'
};

export const HARD_SPAWN_BONUS_CAP = 4;

const DEPTH_TIERS = [
	{ min: 1, max: 5, tier: 'silber', enemyHPMult: 1.0, damageMult: 1.0, spawnBonus: 0 },
	{ min: 6, max: 15, tier: 'gold', enemyHPMult: 1.4, damageMult: 1.2, spawnBonus: 1 },
	{ min: 16, max: 30, tier: 'platin', enemyHPMult: 2.0, damageMult: 1.6, spawnBonus: 1 },
	{ min: 31, max: 50, tier: 'diamant', enemyHPMult: 3.0, damageMult: 2.2, spawnBonus: 2 }
];

export function createEndlessRun(initialDepth = 0) {
	const depth = Number.isFinite(initialDepth) ? Math.max(0, Math.floor(initialDepth)) : 0;
	return {
		...EndlessRun,
		depth,
		currentTier: getRewardTierForDepth(depth),
		pendingRewards: []
	};
}

export function getRewardTierForDepth(depth) {
	const d = Math.max(1, Math.floor(depth || 1));
	for (const tier of DEPTH_TIERS) {
		if (d >= tier.min && d <= tier.max) return tier.tier;
	}
	return 'legendär';
}

export function getScalingForDepth(depth) {
	const d = Math.max(1, Math.floor(depth || 1));
	const baseTier = DEPTH_TIERS.find(tier => d >= tier.min && d <= tier.max);
	if (baseTier) {
		return {
			depth: d,
			tier: baseTier.tier,
			enemyHPMult: baseTier.enemyHPMult,
			damageMult: baseTier.damageMult,
			spawnBonus: baseTier.spawnBonus
		};
	}

	return {
		depth: d,
		tier: 'legendär',
		enemyHPMult: 1 + d * 0.05,
		damageMult: Math.min(4.0, 1 + d * 0.03),
		spawnBonus: Math.min(HARD_SPAWN_BONUS_CAP, 3 + Math.floor((d - 50) / 10))
	};
}

export function calcRoomReward(depth) {
	const d = Math.max(1, Math.floor(depth || 1));
	return {
		coins: 50 + d * 12,
		tier: getRewardTierForDepth(d),
		extraKey: d % 10 === 0
	};
}

export function getActiveDepth(baseDepth = 0, roomsCleared = 0) {
	return Math.max(1, Math.floor(baseDepth || 0) + Math.floor(roomsCleared || 0) + 1);
}
