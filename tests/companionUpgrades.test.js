import { describe, it, expect } from 'vitest';
import { createUpgradeSystem } from '../src/player/upgrades.js';

function createState(coins = 0) {
	return {
		coins,
		upgrades: {
			currentLevel: 0,
			purchasedLevels: [],
			purchasedCompanionUpgrades: []
		}
	};
}

describe('companion upgrades', () => {
	it('exposes companion upgrades from data', () => {
		const state = createState(0);
		const player = {};
		const system = createUpgradeSystem({ state, player });

		const upgrades = system.getCompanionUpgrades();
		expect(upgrades.length).toBeGreaterThanOrEqual(2);
		expect(upgrades.some(u => u.id === 'companion_fireRate')).toBe(true);
		expect(upgrades.some(u => u.id === 'companion_extra')).toBe(true);
	});

	it('purchases companion upgrade and applies coral fire rate bonus', () => {
		const state = createState(10000);
		const player = {};
		const system = createUpgradeSystem({ state, player });

		expect(system.canPurchaseCompanionUpgrade('companion_fireRate')).toBe(true);
		const ok = system.purchaseCompanionUpgrade('companion_fireRate');
		expect(ok).toBe(true);
		expect(system.isCompanionUpgradePurchased('companion_fireRate')).toBe(true);
		expect(player.coralFireRateBonus).toBeCloseTo(0.3, 6);
		expect(state.coins).toBe(2000);
	});

	it('purchases companion extra and caps bonus count as integer', () => {
		const state = createState(20000);
		const player = {};
		const system = createUpgradeSystem({ state, player });

		expect(system.purchaseCompanionUpgrade('companion_extra')).toBe(true);
		expect(player.coralMaxCountBonus).toBe(1);
		expect(state.coins).toBe(8000);
	});

	it('cannot buy same companion upgrade twice', () => {
		const state = createState(30000);
		const player = {};
		const system = createUpgradeSystem({ state, player });

		expect(system.purchaseCompanionUpgrade('companion_fireRate')).toBe(true);
		expect(system.purchaseCompanionUpgrade('companion_fireRate')).toBe(false);
	});
});
