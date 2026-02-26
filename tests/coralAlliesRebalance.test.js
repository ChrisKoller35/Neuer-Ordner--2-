import { describe, it, expect, vi } from 'vitest';
import { createAbilitiesSystem } from '../src/player/abilities.js';

function createState() {
	return {
		started: true,
		paused: false,
		over: false,
		level: 3,
		player: { x: 200, y: 220 },
		shots: [],
		foes: [],
		foeArrows: [],
		bossTorpedoes: [],
		bossKatapultShots: [],
		bossSpeedboats: [],
		bossCoinBursts: [],
		bossCardBoomerangs: [],
		bossPerfumeOrbs: [],
		bossFragranceClouds: [],
		bossWhirlpools: [],
		coralEffects: [],
		coralAllies: [],
		boss: { active: false, stunTimer: 0 },
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 15000,
			duration: 10000
		},
		tsunamiAbility: { unlocked: false, used: false, active: false, cooldown: 0, cooldownMax: 60000 },
		tsunamiWave: null
	};
}

function createSystem(state) {
	return createAbilitiesSystem({
		getState: () => state,
		getCanvas: () => ({ width: 1200, height: 700 }),
		triggerEventFlash: () => {},
		updateHUD: () => {},
		awardFoeDefeat: vi.fn(),
		SHIELD_DURATION: 1000,
		SHIELD_COOLDOWN: 1000
	});
}

describe('coral allies rebalance', () => {
	it('spawns 2 allies on activation by default', () => {
		const state = createState();
		const system = createSystem(state);

		system.unlockCoralAllies();
		const activated = system.tryActivateCoralAllies();

		expect(activated).toBe(true);
		expect(state.coralAbility.active).toBe(true);
		expect(state.coralAbility.timer).toBe(10000);
		expect(state.coralAllies).toHaveLength(2);
		for (const ally of state.coralAllies) {
			expect(ally.radius).toBe(80);
			expect(typeof ally.spawnedAt).toBe('number');
			expect(ally.spawnZoomDuration).toBe(260);
		}
	});

	it('sets cooldown to 15s after ability expires', () => {
		const state = createState();
		const system = createSystem(state);

		system.unlockCoralAllies();
		system.tryActivateCoralAllies();
		system.updateCoralAllies(11000);

		expect(state.coralAbility.active).toBe(false);
		expect(state.coralAbility.cooldown).toBe(15000);
		expect(state.coralAllies).toHaveLength(0);
	});

	it('fires coral ally shots with 1.5 damage multiplier', () => {
		const state = createState();
		const system = createSystem(state);

		system.unlockCoralAllies();
		system.tryActivateCoralAllies();
		for (const ally of state.coralAllies) ally.shotTimer = 0;

		system.updateCoralAllies(16);

		expect(state.shots.length).toBeGreaterThan(0);
		for (const shot of state.shots) {
			expect(shot.coralShot).toBe(true);
			expect(shot.damage).toBe(1.5);
		}
	});

	it('caps ally count at 4 with companion bonus', () => {
		const state = createState();
		state.player.coralMaxCountBonus = 99;
		const system = createSystem(state);

		system.unlockCoralAllies();
		system.tryActivateCoralAllies();

		expect(state.coralAllies).toHaveLength(4);
	});

	it('reduces shoot interval with companion fire rate bonus', () => {
		const baseState = createState();
		const baseSystem = createSystem(baseState);
		baseSystem.unlockCoralAllies();
		baseSystem.tryActivateCoralAllies();
		const baseInterval = baseState.coralAllies[0].shootInterval;

		const boostedState = createState();
		boostedState.player.coralFireRateBonus = 0.3;
		const boostedSystem = createSystem(boostedState);
		boostedSystem.unlockCoralAllies();
		boostedSystem.tryActivateCoralAllies();
		const boostedInterval = boostedState.coralAllies[0].shootInterval;

		expect(boostedInterval).toBeLessThan(baseInterval);
	});

	it('applies tsunami cooldown after wave ends and ticks it down', () => {
		const state = createState();
		state.level = 4;
		const system = createSystem(state);

		system.unlockTsunamiAbility({ silent: true });
		expect(system.tryActivateTsunamiAbility()).toBe(true);
		expect(state.tsunamiAbility.active).toBe(true);

		for (let i = 0; i < 80 && state.tsunamiWave; i += 1) {
			system.updateTsunamiWave(100);
		}

		expect(state.tsunamiWave).toBeNull();
		expect(state.tsunamiAbility.active).toBe(false);
		expect(state.tsunamiAbility.cooldown).toBe(60000);

		system.updateTsunamiWave(1500);
		expect(state.tsunamiAbility.cooldown).toBe(58500);
	});
});
