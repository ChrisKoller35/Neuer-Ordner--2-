import { describe, it, expect, vi } from 'vitest';
import { createFoeCollisionSystem } from '../src/foes/collision.js';

describe('leech aura passive', () => {
	it('heals player on successful shot hit', () => {
		const state = {
			over: false,
			hearts: 2,
			maxHearts: 5,
			player: { x: 100, y: 100 },
			leechAura: { unlocked: true, percent: 0.08 },
			shots: [{ x: 100, y: 100, life: 100, damage: 5 }],
			foes: [{ x: 100, y: 100, hp: 2, dead: false }],
			foeArrows: [],
			bossTorpedoes: [],
			healPickups: [],
			healBursts: [],
			coinDrops: [],
			symbolDrops: [],
			score: 0,
			levelScore: 0
		};

		const updateHUD = vi.fn();
		const system = createFoeCollisionSystem({
			state,
			getFoeHitbox: () => ({ width: 30, height: 30 }),
			awardFoeDefeat: vi.fn(),
			damagePlayer: vi.fn(),
			triggerEventFlash: vi.fn(),
			updateHUD,
			collectCoinDrop: vi.fn(),
			collectSymbolDrop: vi.fn()
		});

		system.handleShotFoeHits();

		expect(state.hearts).toBeCloseTo(2.4, 5);
		expect(updateHUD).toHaveBeenCalled();
	});
});
