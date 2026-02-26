import { describe, it, expect } from 'vitest';
import { createHUDSystem } from '../src/game/hudUpdate.js';

function createClassList() {
	const classes = new Set();
	return {
		toggle(name, force) {
			if (force) classes.add(name);
			else classes.delete(name);
		},
		contains(name) {
			return classes.has(name);
		}
	};
}

function createAbilityElement() {
	const styleValues = {};
	return {
		classList: createClassList(),
		style: {
			setProperty(name, value) {
				styleValues[name] = value;
			},
			getPropertyValue(name) {
				return styleValues[name] || '';
			}
		},
		dataset: {},
		textContent: '',
		title: ''
	};
}

function createHUD() {
	return {
		score: { textContent: '' },
		coins: { textContent: '' },
		level: { textContent: '' },
		time: { textContent: '' },
		hearts: { textContent: '' },
		shield: createAbilityElement(),
		coral: createAbilityElement(),
		tsunami: createAbilityElement(),
		dash: createAbilityElement(),
		mine: createAbilityElement(),
		leech: createAbilityElement(),
		timeBubble: createAbilityElement(),
		armor: null,
		playerLevel: { textContent: '' },
		xpBarFill: { style: { width: '' } },
		skillPoints: { style: { display: '' } },
		skillPointsNum: { textContent: '' },
		symbols: {}
	};
}

function createState() {
	return {
		score: 7,
		coins: 123,
		level: 4,
		hearts: 3,
		elapsed: 1530,
		boss: { active: false },
		armorShieldCharges: 0,
		mode: 'game',
		symbolInventory: {},
		player: {
			shieldUnlocked: true,
			shieldActive: false,
			shieldCooldown: 4500,
			shieldCooldownMax: 9000
		},
		coralAbility: {
			unlocked: true,
			active: false,
			cooldown: 6000,
			cooldownMax: 15000
		},
		dashCurrentAbility: {
			unlocked: true,
			cooldown: 2000,
			cooldownMax: 8000
		},
		depthMineAbility: {
			unlocked: false,
			cooldown: 0,
			cooldownMax: 12000
		},
		leechAura: {
			unlocked: false,
			percent: 0.08
		},
		timeBubbleAbility: {
			unlocked: true,
			active: false,
			cooldown: 5000,
			cooldownMax: 25000
		},
		tsunamiAbility: {
			unlocked: true,
			active: false,
			cooldown: 30000,
			cooldownMax: 60000
		},
		progression: {
			level: 2,
			skillPoints: 1
		}
	};
}

describe('hud cooldown rings', () => {
	it('sets cooldown classes and ring angles for abilities', () => {
		const state = createState();
		const hud = createHUD();
		const system = createHUDSystem({
			getState: () => state,
			getHUD: () => hud,
			getBannerEl: () => null,
			getInventory: () => ({ equipment: {} }),
			armorItemName: 'armor',
			SYMBOL_DATA: {},
			progressionSystem: {
				getLevelProgress: () => 0.45
			}
		});

		system.updateHUD();

		expect(hud.shield.classList.contains('cooldown')).toBe(true);
		expect(hud.coral.classList.contains('cooldown')).toBe(true);
		expect(hud.tsunami.classList.contains('cooldown')).toBe(true);
		expect(hud.dash.classList.contains('cooldown')).toBe(true);
		expect(hud.timeBubble.classList.contains('cooldown')).toBe(true);
		expect(hud.mine.classList.contains('locked')).toBe(true);
		expect(hud.leech.classList.contains('locked')).toBe(true);
		expect(hud.shield.style.getPropertyValue('--cooldown-angle')).toBe('180deg');
		expect(hud.coral.style.getPropertyValue('--cooldown-angle')).toBe('144deg');
		expect(hud.tsunami.style.getPropertyValue('--cooldown-angle')).toBe('180deg');
		expect(hud.dash.style.getPropertyValue('--cooldown-angle')).toBe('90deg');
		expect(hud.timeBubble.style.getPropertyValue('--cooldown-angle')).toBe('72deg');
		expect(hud.coral.dataset.cooldown).toBe('6');
		expect(hud.tsunami.dataset.cooldown).toBe('30');
		expect(hud.timeBubble.dataset.cooldown).toBe('5');
		expect(hud.dash.title.includes('Cooldown')).toBe(true);
		expect(hud.mine.title.includes('Gesperrt')).toBe(true);
	});

	it('marks abilities as ready and clears countdown badge', () => {
		const state = createState();
		state.player.shieldCooldown = 0;
		state.coralAbility.cooldown = 0;
		state.tsunamiAbility.cooldown = 0;
		state.dashCurrentAbility.cooldown = 0;
		state.timeBubbleAbility.cooldown = 0;
		state.timeBubbleAbility.active = false;
		state.depthMineAbility.unlocked = true;
		state.leechAura.unlocked = true;

		const hud = createHUD();
		const system = createHUDSystem({
			getState: () => state,
			getHUD: () => hud,
			getBannerEl: () => null,
			getInventory: () => ({ equipment: {} }),
			armorItemName: 'armor',
			SYMBOL_DATA: {},
			progressionSystem: {
				getLevelProgress: () => 0
			}
		});

		system.updateHUD();

		expect(hud.shield.classList.contains('ready')).toBe(true);
		expect(hud.coral.classList.contains('ready')).toBe(true);
		expect(hud.tsunami.classList.contains('ready')).toBe(true);
		expect(hud.dash.classList.contains('ready')).toBe(true);
		expect(hud.mine.classList.contains('ready')).toBe(true);
		expect(hud.leech.classList.contains('ready')).toBe(true);
		expect(hud.timeBubble.classList.contains('ready')).toBe(true);
		expect(hud.shield.dataset.cooldown).toBe('');
		expect(hud.coral.dataset.cooldown).toBe('');
		expect(hud.tsunami.dataset.cooldown).toBe('');
		expect(hud.dash.dataset.cooldown).toBe('');
		expect(hud.timeBubble.dataset.cooldown).toBe('');
	});
});
