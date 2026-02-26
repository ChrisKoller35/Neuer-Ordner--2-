// ============================================================
// Initial State - Factory for the initial game state
// ============================================================
"use strict";

import { DEFAULT_BOSS_STATS, SHIELD_COOLDOWN, SHIELD_DURATION } from '../core/constants.js';
import { createProgressionState } from '../player/progression.js';

/**
 * Erzeugt den initialen Player-State
 * @param {Object} canvas - Canvas-Element
 * @returns {Object} Player-State
 */
export function createPlayerState(canvas) {
	return {
		x: canvas.width * 0.28,
		y: canvas.height * 0.6,
		speed: 0.32,
		baseSpeed: 0.32,
		dir: 1,
		lastMoveX: 1,
		lastMoveY: 0,
		invulnFor: 0,
		shotCooldown: 0,
		energyMax: 100,
		energy: 100,
		energyCost: 35,
		energyRegenRate: 0.04,
		energyRegenDelay: 1200,
		energyRegenTimer: 0,
		perfumeSlowTimer: 0,
		shieldUnlocked: false,
		shieldActive: false,
		shieldTimer: 0,
		shieldCooldown: 0,
		shieldCooldownMax: SHIELD_COOLDOWN,
		shieldDuration: SHIELD_DURATION,
		shieldLastActivation: 0,
		shieldLastBlock: 0
	};
}

/**
 * Erzeugt den initialen Boss-State
 * @param {Object} canvas - Canvas-Element
 * @returns {Object} Boss-State
 */
export function createBossState(canvas) {
	return {
		x: canvas.width * 0.72,
		y: canvas.height * 0.32,
		speed: DEFAULT_BOSS_STATS.speed,
		dir: -1,
		active: false,
		pulse: 0,
		maxHp: DEFAULT_BOSS_STATS.maxHp,
		hp: DEFAULT_BOSS_STATS.maxHp,
		attackTimer: DEFAULT_BOSS_STATS.firstAttackDelay,
		lastAttack: null,
		finFlip: false,
		spriteKey: null,
		spriteScale: null,
		spriteOffsetX: null,
		spriteOffsetY: null,
		spriteFlip: true,
		shadowRadius: 48,
		shadowOffsetX: 16,
		shadowOffsetY: 52,
		entryTargetX: canvas.width * 0.72,
		entryTargetY: canvas.height * 0.48,
		entering: false,
		entryProgress: 0,
		entrySpeed: DEFAULT_BOSS_STATS.speed * 1.4,
		verticalTracking: 0.0024,
		verticalMin: canvas.height * 0.24,
		verticalMax: canvas.height * 0.68,
		verticalOffset: -canvas.height * 0.12,
		horizontalTracking: 0.0024,
		horizontalMin: canvas.width * 0.52,
		horizontalMax: canvas.width * 0.9,
		horizontalOffset: canvas.width * 0.12,
		horizontalOscAmp: canvas.width * 0.08,
		horizontalOscSpeed: 0.0026,
		horizontalForwardBoost: 2.2,
		horizontalBackBoost: 1.25,
		horizontalForwardBias: canvas.width * 0.1,
		horizontalEdgePad: null,
		oscPhase: 0
	};
}

/**
 * Erzeugt alle leeren Boss-Projektil-Arrays
 * @returns {Object} Boss-Projektil-Arrays
 */
export function createBossProjectileArrays() {
	return {
		bossTorpedoes: [],
		bossSweeps: [],
		bossWakeWaves: [],
		bossPerfumeOrbs: [],
		bossFragranceClouds: [],
		bossWhirlpools: [],
		bossKatapultShots: [],
		bossShockwaves: [],
		bossSpeedboats: [],
		bossCoinBursts: [],
		bossCoinExplosions: [],
		bossDiamondBeams: [],
		bossCardBoomerangs: [],
		bossTreasureWaves: [],
		bossCrownColumns: []
	};
}

/** Liste aller Array-Properties im State die geleert werden müssen */
const STATE_ARRAYS = [
	'foes', 'foeArrows', 'shots', 'healPickups', 'healBursts',
	'symbolDrops', 'coinDrops', 'coralAllies', 'coralEffects',
	'bubbles', 'coverRocks', 'depthMines',
	'bossTorpedoes', 'bossSweeps', 'bossWakeWaves', 'bossPerfumeOrbs',
	'bossFragranceClouds', 'bossWhirlpools', 'bossKatapultShots',
	'bossShockwaves', 'bossSpeedboats', 'bossCoinBursts', 'bossCoinExplosions',
	'bossDiamondBeams', 'bossCardBoomerangs', 'bossTreasureWaves', 'bossCrownColumns'
];

/** Boss-spezifische Arrays (für activateBoss) */
const BOSS_ARRAYS = [
	'bossTorpedoes', 'bossSweeps', 'bossPerfumeOrbs', 'bossFragranceClouds',
	'bossCoinBursts', 'bossCoinExplosions', 'bossDiamondBeams', 'bossCardBoomerangs',
	'bossTreasureWaves', 'bossCrownColumns'
];

/**
 * Leert alle Array-Properties im State
 * @param {Object} state - Der Spielzustand
 */
export function clearAllStateArrays(state) {
	for (const key of STATE_ARRAYS) {
		if (Array.isArray(state[key])) state[key].length = 0;
	}
}

/**
 * Leert nur Boss-Arrays im State
 * @param {Object} state - Der Spielzustand
 */
export function clearBossArrays(state) {
	for (const key of BOSS_ARRAYS) {
		if (Array.isArray(state[key])) state[key].length = 0;
	}
}

/**
 * Erzeugt den vollständigen initialen State
 * @param {Object} canvas - Canvas-Element
 * @returns {Object} Vollständiger Game-State
 */
export function createInitialState(canvas) {
	const bossProjectiles = createBossProjectileArrays();
	
	return {
		mode: "game",
		started: false,
		paused: false,
		over: false,
		win: false,
		score: 0,
		coins: 10000,
		hearts: 3,
		maxHearts: 5,
		level: 1,
		levelScore: 0,
		elapsed: 0,
		lastTick: performance.now(),
		frameDt: 16,
		player: createPlayerState(canvas),
		boss: createBossState(canvas),
		foes: [],
		foeSpawnTimer: 0,
		shots: [],
		...bossProjectiles,
		cashfishUltLock: 0,
		cashfishUltHistory: { tsunamiUsed: false, crownUsed: false },
		healPickups: [],
		healSpawnTimer: 9600,
		healBursts: [],
		symbolDrops: [],
		coinDrops: [],
		coralEffects: [],
		coralAllies: [],
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 15000,
			duration: 10000
		},
		leechAura: {
			unlocked: false,
			percent: 0.08
		},
		dashCurrentAbility: {
			unlocked: false,
			cooldown: 0,
			cooldownMax: 8000,
			invulnDuration: 400
		},
		depthMineAbility: {
			unlocked: false,
			cooldown: 0,
			cooldownMax: 12000,
			radius: 100,
			damage: 6
		},
		timeBubbleAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 25000,
			radius: 200,
			duration: 4000,
			slowFactor: 0.45
		},
		depthMines: [],
		tsunamiWave: null,
		tsunamiAbility: {
			unlocked: false,
			used: false,
			active: false,
			cooldown: 0,
			cooldownMax: 60000
		},
		symbolInventory: { pferd: false, sprinter: false, yacht: false },
		pendingSymbolAdvance: null,
		eventFlash: null,
		foeArrows: [],
		unlockBossScore: 50,
		bubbles: [],
		coverRocks: [],
		coverRockSpawned: false,
		levelIndex: 0,
		levelConfig: null,
		foeSpawnInterval: { min: 1400, max: 2100 },
		city: null,
		armorShieldCharges: 0,
		progression: createProgressionState()
	};
}
