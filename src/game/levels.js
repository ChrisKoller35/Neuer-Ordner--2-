/**
 * Level-Management System
 * Handles level configurations, transitions, and progression
 */

// Default boss stats for fallback
const DEFAULT_BOSS_STATS = {
	maxHp: 22,
	speed: 0.18,
	firstAttackDelay: 2800
};

const TAU = Math.PI * 2;

/**
 * Creates the level management system
 * @param {Object} ctx - Context with dependencies
 */
export function createLevelSystem(ctx) {
	const {
		getState,
		getCanvas,
		getBannerEl,
		triggerEventFlash,
		updateHUD,
		hidePickupMessage,
		seedBubbles,
		abilities,
		scheduleNextFoeSpawn,
		primeFoes
	} = ctx;

	// Build level configs (needs canvas for dimensions)
	function buildLevelConfigs() {
		const canvas = getCanvas();
		return [
			{
				id: 1,
				banner: "Level 1: Freischwimmen",
				unlockBossScore: 50,
				spawnInterval: { min: 1400, max: 2100 },
				initialSpawnDelay: 520,
				spawnTable: [{ type: "jelly", weight: 1 }],
				introFlash: { text: "Level 1 – Freischwimmen", duration: 1400, opacity: 0.78 },
				heal: { initialTimer: 6200 },
				boss: {
					maxHp: DEFAULT_BOSS_STATS.maxHp,
					speed: DEFAULT_BOSS_STATS.speed,
					firstAttackDelay: DEFAULT_BOSS_STATS.firstAttackDelay,
					horizontalTracking: 0.0017,
					horizontalMin: canvas.width * 0.38,
					horizontalMax: canvas.width * 0.92,
					horizontalOscAmp: canvas.width * 0.11,
					horizontalOscSpeed: 0.0019,
					horizontalForwardBoost: 2,
					horizontalBackBoost: 2.4,
					horizontalForwardBias: canvas.width * 0.02,
					horizontalEdgePad: 0
				}
			},
			{
				id: 2,
				banner: "Level 2: Pfeilhagelriff",
				unlockBossScore: 120,
				spawnInterval: { min: 1100, max: 1800 },
				initialSpawnDelay: 460,
				spawnTable: [
					{
						type: "bogenschreck",
						weight: 0.42,
						options: () => ({
							scale: 0.8 + Math.random() * 0.18,
							anchorX: canvas.width * (0.62 + Math.random() * 0.08),
							shootCooldown: 2200 + Math.random() * 600,
							shootTimer: 1200 + Math.random() * 600,
							hoverAmplitude: 15 + Math.random() * 6
						})
					},
					{
						type: "jelly",
						weight: 0.58,
						options: () => ({
							scale: 0.7 + Math.random() * 0.24
						})
					}
				],
				introFlash: { text: "Level 2 – Aquischer Bogenschreck", duration: 1600, opacity: 0.82 },
				heal: { initialTimer: 5400 },
				boss: {
					maxHp: 26,
					speed: 0.22,
					firstAttackDelay: 2000,
					pattern: "arrowVolley",
					spriteKey: "parfumKraken",
					spriteScale: 0.36,
					spriteOffsetX: -18,
					spriteOffsetY: -10,
					shadowRadius: 54,
					shadowOffsetX: 10,
					shadowOffsetY: 58,
					volleyCooldown: 2200,
					cloudCooldown: 3000,
					perfumeSpeed: 0.3,
					perfumeSpread: 44,
					cloudDuration: 4200,
					cloudRadius: 68
				}
			},
			{
				id: 3,
				banner: "Level 3: Regatta der Tiefe",
				unlockBossScore: 210,
				spawnInterval: { min: 900, max: 1600 },
				initialSpawnDelay: 420,
				spawnTable: [
					{
						type: "ritterfisch",
						weight: 0.45,
						options: () => ({
							scale: 0.9 + Math.random() * 0.22,
							anchorX: canvas.width * (0.64 + Math.random() * 0.06),
							patrolRange: 22 + Math.random() * 10,
							chargeCooldown: 2800 + Math.random() * 400,
							chargeTimer: 1300 + Math.random() * 400,
							chargeSpeed: 0.48 + Math.random() * 0.05,
							cruiseSpeed: 0.19 + Math.random() * 0.05
						})
					},
					{
						type: "bogenschreck",
						weight: 0.24,
						options: () => ({
							scale: 0.82 + Math.random() * 0.18,
							anchorX: canvas.width * (0.6 + Math.random() * 0.08),
							shootCooldown: 2100 + Math.random() * 560,
							shootTimer: 1000 + Math.random() * 480,
							hoverAmplitude: 16 + Math.random() * 6
						})
					},
					{
						type: "jelly",
						weight: 0.31,
						options: () => ({
							scale: 0.78 + Math.random() * 0.2,
							speed: 0.14 + Math.random() * 0.06
						})
					}
				],
				introFlash: { text: "Level 3 – Regatta der Tiefe", duration: 1700, opacity: 0.82 },
				heal: { initialTimer: 5200 },
				boss: {
					maxHp: 30,
					speed: 0.26,
					firstAttackDelay: 2200,
					pattern: "regatta",
					spriteKey: "yachtwal",
					spriteScale: 0.24,
					spriteOffsetX: -16,
					spriteOffsetY: -16,
					spriteFlip: false,
					shadowRadius: 52,
					shadowOffsetX: 14,
					shadowOffsetY: 56,
					entryTargetX: canvas.width * 0.8,
					horizontalMin: canvas.width * 0.8,
					horizontalMax: canvas.width * 0.8,
					horizontalTracking: 0,
					horizontalOscAmp: 0,
					horizontalForwardBias: 0,
					horizontalEdgePad: 0,
					verticalMin: canvas.height * 0.0,
					verticalMax: canvas.height * 0.9,
					verticalTracking: 0.0036,
					verticalOffset: -canvas.height * 0.1,
					verticalOscAmp: canvas.height * 0.4,
					verticalOscSpeed: 0.0024,
					wakeCooldown: 3200,
					broadsideCooldown: 2500,
					wakeCount: 4,
					broadsideBursts: 2,
					harborCooldown: 4800,
					katapultCooldown: 3600,
					anchorCooldown: 5400,
					regattaRushCooldown: 4400
				}
			},
			{
				id: 4,
				banner: "Level 4: Schatzkammer-Showdown",
				unlockBossScore: 320,
				spawnInterval: { min: 760, max: 1380 },
				initialSpawnDelay: 360,
				spawnTable: [
					{
						type: "oktopus",
						weight: 0.48,
						options: () => ({
							scale: 0.92 + Math.random() * 0.16,
							anchorX: canvas.width * (0.62 + Math.random() * 0.1),
							shootCooldown: 3200 + Math.random() * 620,
							shootTimer: 1500 + Math.random() * 420,
							burstCount: Math.random() < 0.6 ? 2 : 1,
							volleySpacing: 240 + Math.random() * 140,
							projectileSpeed: 0.38 + Math.random() * 0.05,
							orbitRadius: 26 + Math.random() * 12,
							orbitVertical: 32 + Math.random() * 12,
							orbitSpeed: 0.0013 + Math.random() * 0.0005,
							laneShiftCooldown: 2200 + Math.random() * 520,
							laneShiftTimer: 1600 + Math.random() * 360,
							dashDuration: 420 + Math.random() * 120,
							dashDistance: 46 + Math.random() * 18
						})
					},
					{
						type: "ritterfisch",
						weight: 0.3,
						options: () => ({
							scale: 0.94 + Math.random() * 0.18,
							anchorX: canvas.width * (0.64 + Math.random() * 0.05),
							patrolRange: 22 + Math.random() * 12,
							chargeCooldown: 2800 + Math.random() * 360,
							chargeTimer: 1100 + Math.random() * 360,
							chargeSpeed: 0.5 + Math.random() * 0.05,
							cruiseSpeed: 0.2 + Math.random() * 0.05
						})
					},
					{
						type: "bogenschreck",
						weight: 0.22,
						options: () => ({
							scale: 0.88 + Math.random() * 0.16,
							anchorX: canvas.width * (0.62 + Math.random() * 0.08),
							shootCooldown: 2200 + Math.random() * 520,
							shootTimer: 1000 + Math.random() * 420,
							hoverAmplitude: 16 + Math.random() * 6
						})
					}
				],
				introFlash: { text: "Level 4 – Schatzkammer des Cashfish", duration: 1700, opacity: 0.86 },
				heal: { initialTimer: 5000 },
				boss: {
					maxHp: 40,
					speed: 0.24,
					firstAttackDelay: 2200,
					pattern: "cashfish",
					spriteKey: "cashfish",
					spriteScale: 0.425,
					spriteOffsetX: -16,
					spriteOffsetY: -14,
					spriteFlip: false,
					shadowRadius: 72,
					shadowOffsetX: 14,
					shadowOffsetY: 62,
					salvoCooldown: 2700,
					salvoCoinCount: 6,
					salvoKnockback: 0.18,
					latticeCooldown: 3600,
					latticeTelegraph: 1080,
					latticeLaserWidth: 52,
					cardCooldown: 3200,
					cardRingCount: 2,
					cardSpiralDelay: 560,
					cardBoomerangSpeed: 0.36,
					tsunamiCooldown: 5600,
					tsunamiLock: 6400,
					tsunamiWaveCount: 3,
					tsunamiTelegraph: 1200,
					tsunamiActive: 2100,
					tsunamiFade: 520,
					tsunamiSpeed: 0.44,
					tsunamiRadiusX: 124,
					tsunamiRadiusY: 52,
					tsunamiAmplitude: 36,
					tsunamiKnockback: 0.24,
					crownCooldown: 6500,
					crownLock: 7200,
					crownColumnCount: 4,
					crownColumnWidth: 92,
					crownTelegraph: 1300,
					crownActive: 1500,
					crownFade: 520,
					crownKnockback: 0.23
				}
			}
		];
	}

	// Cache for configs
	let LEVEL_CONFIGS = null;

	function getLevelConfigs() {
		if (!LEVEL_CONFIGS) {
			LEVEL_CONFIGS = buildLevelConfigs();
		}
		return LEVEL_CONFIGS;
	}

	function getLevelConfigsLength() {
		return getLevelConfigs().length;
	}

	function getLevelConfig(index) {
		const configs = getLevelConfigs();
		if (index < 0) return configs[0];
		return configs[index] || configs[configs.length - 1];
	}

	function applyLevelConfig(index, opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const bannerEl = getBannerEl();
		const config = getLevelConfig(index);

		state.levelIndex = index;
		state.level = config.id == null ? index + 1 : config.id;
		state.levelConfig = config;

		if (state.level >= 3) abilities.unlockCoralAllies();
		if (state.level >= 4) abilities.unlockTsunamiAbility();
		else {
			state.tsunamiWave = null;
			if (state.tsunamiAbility) {
				state.tsunamiAbility.unlocked = false;
				state.tsunamiAbility.used = false;
				state.tsunamiAbility.active = false;
			}
		}

		state.unlockBossScore = config.unlockBossScore == null ? state.unlockBossScore : config.unlockBossScore;
		state.foeSpawnInterval = {
			min: config.spawnInterval && config.spawnInterval.min != null ? config.spawnInterval.min : 1400,
			max: config.spawnInterval && config.spawnInterval.max != null ? config.spawnInterval.max : 2100
		};

		const healTimer = config.heal && config.heal.initialTimer != null ? config.heal.initialTimer : 6200;
		state.healSpawnTimer = healTimer;

		const bossCfg = config.boss || {};
		state.boss.maxHp = bossCfg.maxHp == null ? DEFAULT_BOSS_STATS.maxHp : bossCfg.maxHp;
		state.boss.hp = state.boss.maxHp;
		state.boss.speed = bossCfg.speed == null ? DEFAULT_BOSS_STATS.speed : bossCfg.speed;
		state.boss.attackTimer = bossCfg.firstAttackDelay == null ? DEFAULT_BOSS_STATS.firstAttackDelay : bossCfg.firstAttackDelay;
		state.boss.spriteKey = bossCfg.spriteKey || null;
		state.boss.spriteScale = bossCfg.spriteScale == null ? null : bossCfg.spriteScale;
		state.boss.spriteOffsetX = bossCfg.spriteOffsetX == null ? null : bossCfg.spriteOffsetX;
		state.boss.spriteOffsetY = bossCfg.spriteOffsetY == null ? null : bossCfg.spriteOffsetY;
		state.boss.spriteFlip = bossCfg.spriteFlip === false ? false : true;
		state.boss.shadowRadius = bossCfg.shadowRadius == null ? 48 : bossCfg.shadowRadius;
		state.boss.shadowOffsetX = bossCfg.shadowOffsetX == null ? 16 : bossCfg.shadowOffsetX;
		state.boss.shadowOffsetY = bossCfg.shadowOffsetY == null ? 52 : bossCfg.shadowOffsetY;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.active = false;
		state.boss.entrySpeed = bossCfg.entrySpeed == null ? Math.max(0.22, state.boss.speed * 1.25) : bossCfg.entrySpeed;
		state.boss.entryTargetX = bossCfg.entryTargetX == null ? canvas.width * 0.72 : bossCfg.entryTargetX;
		state.boss.entryTargetY = bossCfg.entryTargetY == null ? canvas.height * 0.48 : bossCfg.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.oscPhase = 0;
		state.boss.verticalTracking = bossCfg.verticalTracking == null ? 0.0024 : bossCfg.verticalTracking;
		state.boss.verticalMin = bossCfg.verticalMin == null ? canvas.height * 0.24 : bossCfg.verticalMin;
		state.boss.verticalMax = bossCfg.verticalMax == null ? canvas.height * 0.68 : bossCfg.verticalMax;
		state.boss.verticalOffset = bossCfg.verticalOffset == null ? -canvas.height * 0.12 : bossCfg.verticalOffset;
		state.boss.verticalOscAmp = bossCfg.verticalOscAmp == null ? 0 : bossCfg.verticalOscAmp;
		state.boss.verticalOscSpeed = bossCfg.verticalOscSpeed == null ? 0 : bossCfg.verticalOscSpeed;
		state.boss.verticalOscPhase = bossCfg.verticalOscPhase == null ? Math.random() * TAU : bossCfg.verticalOscPhase;
		state.boss.horizontalTracking = bossCfg.horizontalTracking == null ? 0.0024 : bossCfg.horizontalTracking;
		state.boss.horizontalMin = bossCfg.horizontalMin == null ? canvas.width * 0.52 : bossCfg.horizontalMin;
		state.boss.horizontalMax = bossCfg.horizontalMax == null ? canvas.width * 0.9 : bossCfg.horizontalMax;
		state.boss.horizontalOffset = bossCfg.horizontalOffset == null ? canvas.width * 0.12 : bossCfg.horizontalOffset;
		state.boss.horizontalOscAmp = bossCfg.horizontalOscAmp == null ? canvas.width * 0.08 : bossCfg.horizontalOscAmp;
		state.boss.horizontalOscSpeed = bossCfg.horizontalOscSpeed == null ? 0.0026 : bossCfg.horizontalOscSpeed;
		state.boss.horizontalForwardBoost = bossCfg.horizontalForwardBoost == null ? 2.2 : bossCfg.horizontalForwardBoost;
		state.boss.horizontalBackBoost = bossCfg.horizontalBackBoost == null ? 1.25 : bossCfg.horizontalBackBoost;
		state.boss.horizontalForwardBias = bossCfg.horizontalForwardBias == null ? canvas.width * 0.1 : bossCfg.horizontalForwardBias;
		state.boss.horizontalEdgePad = bossCfg.horizontalEdgePad == null ? null : bossCfg.horizontalEdgePad;
		state.boss.oscPhase = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;

		if (bannerEl && config.banner) bannerEl.textContent = config.banner;
		if (!opts.skipFlash && config.introFlash && config.introFlash.text) {
			triggerEventFlash("level", {
				text: config.introFlash.text,
				duration: config.introFlash.duration,
				opacity: config.introFlash.opacity == null ? 0.82 : config.introFlash.opacity
			});
		}

		if (typeof config.initialSpawnDelay === "number") state.foeSpawnTimer = config.initialSpawnDelay;
		else scheduleNextFoeSpawn(true);
	}

	function advanceLevel(nextIndex, opts = {}) {
		const state = getState();
		const canvas = getCanvas();

		state.win = false;
		state.over = false;
		state.paused = false;
		state.started = true;

		// Clear all arrays
		state.foes.length = 0;
		state.foeArrows.length = 0;
		state.shots.length = 0;
		state.healPickups.length = 0;
		state.healBursts.length = 0;
		state.symbolDrops.length = 0;
		state.coinDrops.length = 0;
		state.coralAllies.length = 0;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.tsunamiAbility.used = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.bossTorpedoes.length = 0;
		state.bossSweeps.length = 0;
		state.bossWakeWaves.length = 0;
		state.bossPerfumeOrbs.length = 0;
		state.bossFragranceClouds.length = 0;
		state.bossCoinBursts.length = 0;
		state.bossCoinExplosions.length = 0;
		state.bossDiamondBeams.length = 0;
		state.bossCardBoomerangs.length = 0;
		state.bossTreasureWaves.length = 0;
		state.bossCrownColumns.length = 0;
		state.coverRocks.length = 0;
		state.coverRockSpawned = false;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.bossWhirlpools.length = 0;
		state.bossKatapultShots.length = 0;
		state.bossShockwaves.length = 0;
		state.bossSpeedboats.length = 0;

		// Reset player position
		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		if (state.player.shieldUnlocked) state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = opts.invulnDuration == null ? 1600 : opts.invulnDuration;
		state.player.shotCooldown = 0;
		state.player.energyMax = state.player.energyMax == null ? 100 : state.player.energyMax;
		state.player.energy = state.player.energyMax;
		state.player.energyRegenTimer = 0;
		if (opts.healHeart !== false) state.hearts = Math.min(state.hearts + 1, state.maxHearts);

		applyLevelConfig(nextIndex, opts);
		state.levelScore = 0;
		primeFoes();

		const nextEntryX = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		const nextEntryY = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.x = nextEntryX;
		state.boss.y = nextEntryY;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.lastTick = performance.now();
		seedBubbles();
		updateHUD();
		hidePickupMessage();
	}

	return {
		getLevelConfigs,
		getLevelConfigsLength,
		getLevelConfig,
		applyLevelConfig,
		advanceLevel,
		DEFAULT_BOSS_STATS
	};
}
