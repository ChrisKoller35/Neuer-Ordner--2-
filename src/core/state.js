// ============================================================
// STATE - Game state factory (kanonische Quelle: initialState.js)
// ============================================================
// Die State-Factories (createPlayerState, createBossState, createInitialState)
// leben in initialState.js – hier re-exportiert, um bestehende Imports
// über core/index.js nicht zu brechen.

export {
	createPlayerState,
	createBossState,
	createInitialState,
	createBossProjectileArrays,
	clearAllStateArrays,
	clearBossArrays
} from './initialState.js';

import { DEFAULT_BOSS_STATS } from './constants.js';

/**
 * Creates the initial abilities state
 * @returns {Object} Abilities state
 */
export function createAbilitiesState() {
	return {
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 15000,
			duration: 10000
		},
		tsunamiAbility: {
			unlocked: false,
			used: false,
			active: false,
			cooldown: 0,
			cooldownMax: 60000
		}
	};
}

/**
 * Resets the player state to initial values
 * @param {Object} player - The player state
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
export function resetPlayerState(player, canvas) {
	player.x = canvas.width * 0.28;
	player.y = canvas.height * 0.6;
	player.speed = player.baseSpeed;
	player.dir = 1;
	player.invulnFor = 0;
	player.shotCooldown = 0;
	player.energy = player.energyMax;
	player.energyRegenTimer = 0;
	player.perfumeSlowTimer = 0;
	player.shieldActive = false;
	player.shieldTimer = 0;
	player.shieldCooldown = 0;
	player.shieldLastActivation = 0;
	player.shieldLastBlock = 0;
}

/**
 * Setzt den Boss-State auf Anfangswerte zurück
 * @param {Object} boss - Der Boss-State
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
 */
export function resetBossState(boss, canvas) {
	boss.x = canvas.width * 0.72;
	boss.y = canvas.height * 0.32;
	boss.speed = DEFAULT_BOSS_STATS.speed;
	boss.dir = -1;
	boss.active = false;
	boss.pulse = 0;
	boss.maxHp = DEFAULT_BOSS_STATS.maxHp;
	boss.hp = DEFAULT_BOSS_STATS.maxHp;
	boss.attackTimer = DEFAULT_BOSS_STATS.firstAttackDelay;
	boss.lastAttack = null;
	boss.entering = false;
	boss.entryProgress = 0;
	boss.oscPhase = 0;
	boss.spriteKey = null;
}
