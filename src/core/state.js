// ============================================================
// STATE - Spielzustand Factory
// ============================================================

import { DEFAULT_BOSS_STATS, SHIELD_COOLDOWN, SHIELD_DURATION } from './constants.js';

/**
 * Erstellt den initialen Spieler-Zustand
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
 * @returns {Object} Spieler-State
 */
export function createPlayerState(canvas) {
	return {
		x: canvas.width * 0.28,
		y: canvas.height * 0.6,
		speed: 0.32,
		baseSpeed: 0.32,
		dir: 1,
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
 * Erstellt den initialen Boss-Zustand
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
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
 * Erstellt den initialen Fähigkeiten-Zustand
 * @returns {Object} Abilities-State
 */
export function createAbilitiesState() {
	return {
		coralAbility: {
			unlocked: false,
			active: false,
			timer: 0,
			cooldown: 0,
			cooldownMax: 14000,
			duration: 6000
		},
		tsunamiAbility: {
			unlocked: false,
			used: false,
			active: false
		}
	};
}

/**
 * Erstellt den kompletten initialen Spielzustand
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
 * @returns {Object} Kompletter Spiel-State
 */
export function createInitialState(canvas) {
	const abilities = createAbilitiesState();
	
	return {
		mode: "game",
		started: false,
		paused: false,
		over: false,
		win: false,
		score: 0,
		coins: 0,
		hearts: 3,
		maxHearts: 5,
		level: 1,
		levelScore: 0,
		elapsed: 0,
		lastTick: performance.now(),
		frameDt: 16,
		
		player: createPlayerState(canvas),
		boss: createBossState(canvas),
		
		// Gegner und Projektile
		foes: [],
		foeSpawnTimer: 0,
		shots: [],
		
		// Boss-Projektile und Effekte
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
		bossCrownColumns: [],
		cashfishUltLock: 0,
		cashfishUltHistory: { tsunamiUsed: false, crownUsed: false },
		
		// Pickups und Drops
		healPickups: [],
		healSpawnTimer: 9600,
		healBursts: [],
		symbolDrops: [],
		coinDrops: [],
		
		// Fähigkeiten
		coralEffects: [],
		coralAllies: [],
		coralAbility: abilities.coralAbility,
		tsunamiWave: null,
		tsunamiAbility: abilities.tsunamiAbility,
		
		// Inventar und Symbole
		symbolInventory: { pferd: false, sprinter: false, yacht: false },
		pendingSymbolAdvance: null,
		
		// UI und Events
		eventFlash: null,
		foeArrows: [],
		bubbles: [],
		coverRocks: [],
		coverRockSpawned: false,
		
		// Level-System
		unlockBossScore: 50,
		levelIndex: 0,
		levelConfig: null,
		foeSpawnInterval: { min: 1400, max: 2100 },
		
		// Stadt
		city: null,
		armorShieldCharges: 0
	};
}

/**
 * Setzt den Spieler-State auf Anfangswerte zurück
 * @param {Object} player - Der Spieler-State
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
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
