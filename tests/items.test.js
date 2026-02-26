import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsPath = path.resolve(__dirname, '../src/data/items.json');
const itemsJson = JSON.parse(readFileSync(itemsPath, 'utf8'));

const VALID_CATEGORIES = new Set(['weapon', 'armor', 'utility', 'economy', 'dungeon', 'companion']);
const VALID_ITEM_TYPES = new Set(['permanent', 'consumable']);
const VALID_RARITIES = new Set(['Gewöhnlich', 'Selten', 'Episch', 'Legendär']);
const VALID_RUNTIME_TYPES = new Set(['weapon', 'armor', 'misc', 'consumable']);
const PHASE_5_2_IDS = [
	'rapid_gill',
	'harpoon_x2',
	'depth_charge',
	'sea_glass',
	'coral_vest',
	'titan_scale',
	'current_boots',
	'bubble_dash',
	'magnet_shell',
	'fortune_pearl',
	'treasure_map',
	'black_market',
	'dungeon_flask',
	'rage_elixir',
	'coral_charm',
	'swarm_ring',
	'abyss_lantern',
	'kraken_ink',
	'tide_stone',
	'golden_fin'
];

const PHASE_5_2_EXPECTED = {
	rapid_gill: { category: 'weapon', itemType: 'permanent', rarity: 'Gewöhnlich', price: 1200 },
	harpoon_x2: { category: 'weapon', itemType: 'permanent', rarity: 'Selten', price: 4500 },
	depth_charge: { category: 'weapon', itemType: 'permanent', rarity: 'Episch', price: 8000 },
	sea_glass: { category: 'armor', itemType: 'permanent', rarity: 'Gewöhnlich', price: 2000 },
	coral_vest: { category: 'armor', itemType: 'permanent', rarity: 'Gewöhnlich', price: 3000 },
	titan_scale: { category: 'armor', itemType: 'permanent', rarity: 'Selten', price: 6000 },
	current_boots: { category: 'utility', itemType: 'permanent', rarity: 'Gewöhnlich', price: 1800 },
	bubble_dash: { category: 'utility', itemType: 'permanent', rarity: 'Selten', price: 5500 },
	magnet_shell: { category: 'utility', itemType: 'permanent', rarity: 'Gewöhnlich', price: 2500 },
	fortune_pearl: { category: 'economy', itemType: 'permanent', rarity: 'Gewöhnlich', price: 1500 },
	treasure_map: { category: 'economy', itemType: 'permanent', rarity: 'Selten', price: 7000 },
	black_market: { category: 'economy', itemType: 'permanent', rarity: 'Episch', price: 9500 },
	dungeon_flask: { category: 'dungeon', itemType: 'consumable', rarity: 'Gewöhnlich', price: 800 },
	rage_elixir: { category: 'dungeon', itemType: 'consumable', rarity: 'Selten', price: 1200 },
	coral_charm: { category: 'companion', itemType: 'permanent', rarity: 'Episch', price: 12000 },
	swarm_ring: { category: 'companion', itemType: 'permanent', rarity: 'Selten', price: 8500 },
	abyss_lantern: { category: 'utility', itemType: 'permanent', rarity: 'Gewöhnlich', price: 3500 },
	kraken_ink: { category: 'utility', itemType: 'consumable', rarity: 'Episch', price: 11000 },
	tide_stone: { category: 'armor', itemType: 'permanent', rarity: 'Selten', price: 4000 },
	golden_fin: { category: 'economy', itemType: 'permanent', rarity: 'Selten', price: 6500 }
};

describe('items.json schema (Phase 5.1)', () => {
	it('contains an items object', () => {
		expect(itemsJson).toHaveProperty('items');
		expect(typeof itemsJson.items).toBe('object');
		expect(Object.keys(itemsJson.items).length).toBeGreaterThan(0);
	});

	it('all items have required fields and valid enums', () => {
		for (const [label, item] of Object.entries(itemsJson.items)) {
			expect(item.label).toBe(label);
			expect(typeof item.id).toBe('string');
			expect(item.id.length).toBeGreaterThan(0);
			expect(VALID_RUNTIME_TYPES.has(item.type)).toBe(true);
			expect(VALID_CATEGORIES.has(item.category)).toBe(true);
			expect(VALID_ITEM_TYPES.has(item.itemType)).toBe(true);
			expect(VALID_RARITIES.has(item.rarity)).toBe(true);
			expect(typeof item.price).toBe('number');
			expect(item.price).toBeGreaterThanOrEqual(0);
			expect(typeof item.stats).toBe('object');
			expect(item.stats).not.toBeNull();
		}
	});

	it('consumables are not encoded through rarity', () => {
		for (const item of Object.values(itemsJson.items)) {
			if (item.itemType === 'consumable') {
				expect(VALID_RARITIES.has(item.rarity)).toBe(true);
				expect(item.category === 'dungeon' || item.category === 'utility').toBe(true);
			}
		}
	});

	it('contains the special armor item by stable id', () => {
		const allItems = Object.values(itemsJson.items);
		const armorItem = allItems.find((item) => item.id === 'ruestung-meeresbewohner');
		expect(armorItem).toBeTruthy();
		expect(armorItem.category).toBe('armor');
		expect(armorItem.itemType).toBe('permanent');
	});

	it('contains all planned Phase 5.2 item ids', () => {
		const allIds = new Set(Object.values(itemsJson.items).map((item) => item.id));
		for (const id of PHASE_5_2_IDS) {
			expect(allIds.has(id)).toBe(true);
		}
	});

	it('matches planned Phase 5.2 metadata per item', () => {
		const byId = new Map(Object.values(itemsJson.items).map((item) => [item.id, item]));
		for (const [id, expected] of Object.entries(PHASE_5_2_EXPECTED)) {
			const item = byId.get(id);
			expect(item).toBeTruthy();
			expect(item.category).toBe(expected.category);
			expect(item.itemType).toBe(expected.itemType);
			expect(item.rarity).toBe(expected.rarity);
			expect(item.price).toBe(expected.price);
		}
	});
});
