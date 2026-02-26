import { describe, it, expect } from 'vitest';
import { createMarketSystem } from '../src/buildings/market.js';

function createBaseState(seed = 12345) {
	return {
		coins: 999999,
		market: {
			shopRotationSeed: seed,
			shopRotationIds: [],
			purchaseHistory: {}
		}
	};
}

describe('market rotation (Phase 5.3)', () => {
	it('creates exactly 5 unique rotated items', () => {
		const state = createBaseState(777);
		const inventory = { items: Array.from({ length: 36 }, () => null) };
		const market = createMarketSystem({
			state,
			getInventory: () => inventory
		});

		const categories = market.getCategories();
		expect(categories).toHaveLength(1);
		expect(categories[0].key).toBe('consumables');
		expect(categories[0].items).toHaveLength(5);

		const ids = categories[0].items.map((item) => item.id);
		expect(new Set(ids).size).toBe(5);
	});

	it('applies 60/30/10 rarity target for 5-item rotation', () => {
		const state = createBaseState(999);
		const inventory = { items: Array.from({ length: 36 }, () => null) };
		const market = createMarketSystem({
			state,
			getInventory: () => inventory
		});

		const items = market.getCategories()[0].items;
		const counts = items.reduce((acc, item) => {
			acc[item.rarity] = (acc[item.rarity] || 0) + 1;
			return acc;
		}, {});

		expect(counts['Gewöhnlich'] || 0).toBe(3);
		expect(counts['Selten'] || 0).toBe(1);
		expect(counts['Episch'] || 0).toBe(1);
	});

	it('does not include dungeon-category items in city market rotation', () => {
		const state = createBaseState(2026);
		const inventory = { items: Array.from({ length: 36 }, () => null) };
		const market = createMarketSystem({
			state,
			getInventory: () => inventory
		});

		const items = market.getCategories()[0].items;
		for (const item of items) {
			expect(item.category).not.toBe('dungeon');
		}
	});
});
