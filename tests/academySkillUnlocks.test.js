import { describe, it, expect } from 'vitest';
import { createAcademySystem } from '../src/buildings/academy.js';

function createState() {
	return {
		coins: 20000,
		academy: {
			level: 3,
			unlockedSpells: ['feuerball'],
			unlockedMods: [],
			activeSpell: 'feuerball',
			activeMods: [],
			submissions: [],
			totalSpellsUnlocked: 1,
			totalModsUnlocked: 0,
			unlockedSkillIds: []
		},
		depthMineAbility: { unlocked: false, cooldown: 0 },
		timeBubbleAbility: { unlocked: false, cooldown: 0, active: false, timer: 0 }
	};
}

describe('academy skill unlocks', () => {
	it('persists purchased skill unlock IDs and unlocks ability', () => {
		const state = createState();
		const academy = createAcademySystem({ state });

		const result = academy.unlockSkill('depth_mine');
		expect(result.success).toBe(true);
		expect(state.coins).toBe(15000);
		expect(state.depthMineAbility.unlocked).toBe(true);
		expect(state.academy.unlockedSkillIds).toContain('depth_mine');
	});

	it('re-applies persisted unlocks when academy system is recreated', () => {
		const state = createState();
		state.academy.unlockedSkillIds = ['time_bubble'];
		state.timeBubbleAbility.unlocked = false;

		createAcademySystem({ state });
		expect(state.timeBubbleAbility.unlocked).toBe(true);
	});
});
