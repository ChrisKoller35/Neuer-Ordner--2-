import { describe, it, expect } from 'vitest';
import { mapItemToInventoryTab } from '../src/city/ui.js';

describe('mapItemToInventoryTab', () => {
	it('maps weapon and armor categories to equipment tab', () => {
		expect(mapItemToInventoryTab({ category: 'weapon', itemType: 'permanent' })).toBe('equipment');
		expect(mapItemToInventoryTab({ category: 'armor', itemType: 'permanent' })).toBe('equipment');
	});

	it('maps utility/economy/companion categories to material tab', () => {
		expect(mapItemToInventoryTab({ category: 'utility', itemType: 'permanent' })).toBe('material');
		expect(mapItemToInventoryTab({ category: 'economy', itemType: 'permanent' })).toBe('material');
		expect(mapItemToInventoryTab({ category: 'companion', itemType: 'permanent' })).toBe('material');
	});

	it('maps dungeon consumables to consumable tab and permanent dungeon items to material', () => {
		expect(mapItemToInventoryTab({ category: 'dungeon', itemType: 'consumable' })).toBe('consumable');
		expect(mapItemToInventoryTab({ category: 'dungeon', itemType: 'permanent' })).toBe('material');
	});

	it('keeps legacy fallback behavior', () => {
		expect(mapItemToInventoryTab({ type: 'armor' })).toBe('equipment');
		expect(mapItemToInventoryTab({ type: 'consumable' })).toBe('consumable');
		expect(mapItemToInventoryTab(null)).toBe('material');
	});
});
