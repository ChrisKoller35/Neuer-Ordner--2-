import { describe, it, expect, beforeEach } from 'vitest';
import {
	registerNPC, getNPC, getAllNPCs, unregisterNPC, clearNPCs,
	findNearestNPC, isPlayerNearNPC, bobOffset, interactWithNPC,
	NPC_CLICK_RADIUS, NPC_INTERACT_RADIUS
} from '../src/npc/npcSystem.js';

beforeEach(() => {
	clearNPCs();
});

// ---- Registry ----
describe('NPC registry', () => {
	it('registers and retrieves an NPC', () => {
		registerNPC('test', { name: 'Tester', location: 'city' });
		const npc = getNPC('test');
		expect(npc).toBeDefined();
		expect(npc.id).toBe('test');
		expect(npc.name).toBe('Tester');
	});

	it('returns undefined for unknown id', () => {
		expect(getNPC('unknown')).toBeUndefined();
	});

	it('getAllNPCs returns all registered', () => {
		registerNPC('a', { name: 'A', location: 'city' });
		registerNPC('b', { name: 'B', location: 'harbor' });
		expect(getAllNPCs()).toHaveLength(2);
	});

	it('getAllNPCs filters by location', () => {
		registerNPC('a', { name: 'A', location: 'city' });
		registerNPC('b', { name: 'B', location: 'harbor' });
		expect(getAllNPCs('city')).toHaveLength(1);
		expect(getAllNPCs('city')[0].id).toBe('a');
	});

	it('unregisterNPC removes an NPC', () => {
		registerNPC('x', { name: 'X' });
		unregisterNPC('x');
		expect(getNPC('x')).toBeUndefined();
	});

	it('clearNPCs removes all', () => {
		registerNPC('a', { name: 'A' });
		registerNPC('b', { name: 'B' });
		clearNPCs();
		expect(getAllNPCs()).toHaveLength(0);
	});
});

// ---- Hit-testing ----
describe('findNearestNPC', () => {
	it('returns null when no NPCs in range', () => {
		const npcs = [{ x: 500, y: 500 }];
		expect(findNearestNPC(0, 0, npcs, 50)).toBeNull();
	});

	it('returns closest NPC within radius', () => {
		const npcs = [
			{ id: 'far', x: 80, y: 0 },
			{ id: 'close', x: 20, y: 0 }
		];
		const result = findNearestNPC(0, 0, npcs, 100);
		expect(result).not.toBeNull();
		expect(result.npc.id).toBe('close');
	});

	it('uses default NPC_CLICK_RADIUS', () => {
		const npcs = [{ id: 'a', x: NPC_CLICK_RADIUS - 1, y: 0 }];
		expect(findNearestNPC(0, 0, npcs)).not.toBeNull();
	});
});

describe('isPlayerNearNPC', () => {
	it('returns true when within radius', () => {
		expect(isPlayerNearNPC({ x: 0, y: 0 }, { x: 30, y: 0 })).toBe(true);
	});

	it('returns false when outside radius', () => {
		expect(isPlayerNearNPC({ x: 0, y: 0 }, { x: 200, y: 0 })).toBe(false);
	});

	it('accepts playerPx/playerPy keys', () => {
		expect(isPlayerNearNPC({ playerPx: 0, playerPy: 0 }, { x: 30, y: 0 })).toBe(true);
	});
});

// ---- Rendering helpers ----
describe('bobOffset', () => {
	it('returns 0 at time=0', () => {
		expect(bobOffset(0)).toBe(0);
	});

	it('returns non-zero at time > 0', () => {
		expect(bobOffset(500)).not.toBe(0);
	});

	it('is bounded by amount', () => {
		for (let t = 0; t < 10000; t += 100) {
			expect(Math.abs(bobOffset(t, 0.003, 5))).toBeLessThanOrEqual(5);
		}
	});
});

// ---- Interaction dispatch ----
describe('interactWithNPC', () => {
	it('calls onInteract callback and returns true', () => {
		let called = false;
		registerNPC('npc1', { name: 'N', onInteract: () => { called = true; } });
		const result = interactWithNPC('npc1');
		expect(result).toBe(true);
		expect(called).toBe(true);
	});

	it('returns false when NPC has no handler', () => {
		registerNPC('npc2', { name: 'N' });
		expect(interactWithNPC('npc2')).toBe(false);
	});

	it('returns false for unknown NPC', () => {
		expect(interactWithNPC('ghost')).toBe(false);
	});

	it('passes option to callback', () => {
		let receivedOpt = null;
		registerNPC('npc3', { name: 'N', onInteract: (opt) => { receivedOpt = opt; } });
		interactWithNPC('npc3', 'Kaufen');
		expect(receivedOpt).toBe('Kaufen');
	});
});
