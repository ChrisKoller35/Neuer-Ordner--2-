import { describe, it, expect, vi } from 'vitest';
import { createAbilitiesSystem } from '../src/player/abilities.js';
import S from '../src/core/sharedState.js';

function createState() {
	return {
		started: true,
		paused: false,
		over: false,
		level: 4,
		worldMode: false,
		player: {
			x: 200,
			y: 220,
			dir: 1,
			lastMoveX: 1,
			lastMoveY: 0,
			invulnFor: 0
		},
		progression: { level: 1 },
		foes: [],
		shots: [],
		foeArrows: [],
		bossTorpedoes: [],
		bossKatapultShots: [],
		bossSpeedboats: [],
		bossCoinBursts: [],
		bossCardBoomerangs: [],
		bossPerfumeOrbs: [],
		bossFragranceClouds: [],
		bossWhirlpools: [],
		boss: { active: false, stunTimer: 0 },
		coralEffects: [],
		coralAllies: [],
		coralAbility: { unlocked: false, active: false, timer: 0, cooldown: 0, cooldownMax: 15000, duration: 10000 },
		tsunamiAbility: { unlocked: false, used: false, active: false, cooldown: 0, cooldownMax: 60000 },
		tsunamiWave: null,
		dashCurrentAbility: { unlocked: false, cooldown: 0, cooldownMax: 8000, invulnDuration: 400 },
		depthMineAbility: { unlocked: false, cooldown: 0, cooldownMax: 12000, radius: 100, damage: 6 },
		timeBubbleAbility: { unlocked: false, active: false, timer: 0, cooldown: 0, cooldownMax: 25000, radius: 200, duration: 4000, slowFactor: 0.45 },
		leechAura: { unlocked: false, percent: 0.08 },
		depthMines: []
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

describe('phase 6.1 active abilities', () => {
	it('dash current moves player and grants short invulnerability', () => {
		const state = createState();
		state.dashCurrentAbility.unlocked = true;
		const system = createSystem(state);

		const oldX = state.player.x;
		expect(system.tryActivateDashCurrent()).toBe(true);
		expect(state.player.x).toBeGreaterThan(oldX);
		expect(state.player.invulnFor).toBe(400);
		expect(state.dashCurrentAbility.cooldown).toBe(8000);
	});

	it('depth mine can be placed and detonates nearby foe', () => {
		const state = createState();
		state.depthMineAbility.unlocked = true;
		state.foes.push({ x: 220, y: 220, hp: 3, dead: false });
		const system = createSystem(state);

		expect(system.tryActivateDepthMine()).toBe(true);
		expect(state.depthMines.length).toBe(1);

		system.updatePhaseSixSkills(400);

		expect(state.foes[0].dead).toBe(true);
		expect(state.depthMines.length).toBe(0);
		expect(state.depthMineAbility.cooldown).toBe(11600);
	});

	it('time bubble activates and enters cooldown after duration', () => {
		const state = createState();
		state.timeBubbleAbility.unlocked = true;
		const system = createSystem(state);

		expect(system.tryActivateTimeBubble()).toBe(true);
		expect(state.timeBubbleAbility.active).toBe(true);
		expect(state.timeBubbleAbility.timer).toBe(4000);

		system.updatePhaseSixSkills(4100);

		expect(state.timeBubbleAbility.active).toBe(false);
		expect(state.timeBubbleAbility.cooldown).toBe(25000);
	});

	it('unlocks dash at progression level 3', () => {
		const state = createState();
		const system = createSystem(state);

		expect(state.dashCurrentAbility.unlocked).toBe(false);
		state.progression.level = 3;
		system.updatePhaseSixSkills(16);
		expect(state.dashCurrentAbility.unlocked).toBe(true);
	});

	it('unlocks leech aura at dungeon depth 20', () => {
		const state = createState();
		const system = createSystem(state);
		const oldDepth = S.dungeonDepth;
		S.dungeonDepth = 20;

		expect(state.leechAura.unlocked).toBe(false);
		system.updatePhaseSixSkills(16);
		expect(state.leechAura.unlocked).toBe(true);
		S.dungeonDepth = oldDepth;
	});
});
