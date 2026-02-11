// Boss-Update-Funktionen - ausgelagert aus game.js
// Update-Logik für Boss-Bewegung und Boss-Attacken
//
// HINWEIS: Dieses Modul hat viele Abhängigkeiten (spawn-Funktionen, 
// Cover-System, etc.) und erfordert sorgfältige Integration.

import { TAU } from '../core/constants.js';
import { clamp, clamp01 } from '../core/utils.js';
import { bossTorpedoPool, bossWakeWavePool } from '../core/pool.js';

/**
 * Erstellt das Boss-Update-System
 * @param {Object} deps - Abhängigkeiten
 */
export function createBossUpdateSystem(deps) {
	const {
		getCanvas,
		getState,
		getSPRITES,
		spriteReady,
		activateBoss,
		applyCoverAvoidance,
		processCoverDetour,
		findCoverRockHit,
		registerCoverRockImpact,
		// Boss-Spawn-Funktionen (von boss/spawn.js)
		spawnBossTorpedoBurst,
		spawnBossFinSweep,
		spawnBossPerfumeVolley,
		spawnBossFragranceWave,
		spawnYachtwalHarborSog,
		spawnYachtwalKielwasserKatapult,
		spawnYachtwalAnchorDonner,
		spawnYachtwalRegattaRaserei,
		spawnCashfishCoinSalvo,
		spawnCashfishDiamondLattice,
		spawnCashfishTreasureTsunami,
		spawnCashfishCrownFinale,
		spawnCashfishCardShock,
		spawnFragranceCloud
	} = deps;

	function updateBoss(dt) {
		const canvas = getCanvas();
		const state = getState();
		const SPRITES = getSPRITES();
		const boss = state.boss;
		
		if (state.pendingSymbolAdvance) return;
		if (!boss.active) {
			if (state.levelScore >= state.unlockBossScore) activateBoss();
			else return;
		}

		if (boss.coverDetourCooldown > 0) boss.coverDetourCooldown = Math.max(0, boss.coverDetourCooldown - dt);
		boss.pulse += dt * 0.0032;
		const targetX = boss.entryTargetX == null ? canvas.width * 0.72 : boss.entryTargetX;
		const targetY = boss.entryTargetY == null ? canvas.height * 0.48 : boss.entryTargetY;
		
		if (boss.entering) {
			const travelSpeed = boss.entrySpeed == null ? Math.max(boss.speed * 1.2, 0.24) : boss.entrySpeed;
			const dx = targetX - boss.x;
			const dy = targetY - boss.y;
			const dist = Math.hypot(dx, dy);
			const step = travelSpeed * dt;
			const sway = Math.sin(boss.pulse * 0.8) * 0.12;
			if (dist <= step || dist === 0) {
				boss.x = targetX;
				boss.y = targetY;
				boss.entering = false;
				boss.entryProgress = 1;
				boss.dir = -1;
				boss.attackTimer = Math.max(boss.attackTimer, 900);
			} else {
				const nx = dx / dist;
				const ny = dy / dist;
				boss.x += nx * step;
				boss.y += ny * step + sway * dt;
				boss.dir = nx < 0 ? -1 : 1;
				boss.entryProgress = Math.min(1, (boss.entryProgress || 0) + step / Math.max(dist, 1));
			}
			return;
		}

		let verticalMin = boss.verticalMin == null ? canvas.height * 0.24 : boss.verticalMin;
		if (state.levelIndex === 2) {
			const hpBarBottom = 26 + 18 + 6;
			const spriteKey = boss.spriteKey || "boss";
			const sprite = SPRITES[spriteKey] || SPRITES.boss;
			const scale = boss.spriteScale == null ? 0.22 : boss.spriteScale;
			const offsetY = boss.spriteOffsetY == null ? -12 : boss.spriteOffsetY;
			const drawH = spriteReady(sprite) ? sprite.naturalHeight * scale : 180 * scale;
			const topSafe = -120;
			const minYFromBar = hpBarBottom + topSafe + drawH * 0.5 - offsetY;
			verticalMin = Math.max(verticalMin, minYFromBar);
		}
		let verticalMax = boss.verticalMax == null ? canvas.height * 0.68 : boss.verticalMax;
		const coverRock = state.coverRocks.find(rock => rock.landed);
		if (coverRock) {
			const rockRadiusY = coverRock.radiusY == null ? (coverRock.height == null ? 60 : coverRock.height * 0.5) : coverRock.radiusY;
			const rockBottom = coverRock.y + rockRadiusY;
			verticalMax = Math.min(verticalMax, rockBottom - 6);
		}
		const verticalTracking = boss.verticalTracking == null ? 0.0024 : boss.verticalTracking;
		const verticalCenter = (verticalMin + verticalMax) * 0.5;
		let verticalOscSpeed = boss.verticalOscSpeed == null ? 0 : boss.verticalOscSpeed;
		let verticalOscAmp = boss.verticalOscAmp == null ? 0 : boss.verticalOscAmp;
		let verticalOffset = boss.verticalOffset == null ? 0 : boss.verticalOffset;
		if (state.levelIndex === 2) {
			const span = Math.max(40, verticalMax - verticalMin);
			verticalOffset = span * 0.06;
			verticalOscAmp = span * 0.5;
			if (!verticalOscSpeed) verticalOscSpeed = 0.0024;
		}
		boss.verticalOscPhase = (boss.verticalOscPhase == null ? Math.random() * TAU : boss.verticalOscPhase) + verticalOscSpeed * dt;
		const verticalOsc = verticalOscAmp > 0 ? Math.sin(boss.verticalOscPhase) * verticalOscAmp : 0;
		const verticalTargetY = clamp(verticalCenter + verticalOffset + verticalOsc, verticalMin, verticalMax);
		const bob = Math.sin(boss.pulse * 0.8) * 0.04;
		boss.y = clamp(boss.y + (verticalTargetY - boss.y) * verticalTracking * dt + bob * dt, verticalMin, verticalMax);

		const horizontalMin = boss.horizontalMin == null ? canvas.width * 0.52 : boss.horizontalMin;
		const horizontalMax = boss.horizontalMax == null ? canvas.width * 0.9 : boss.horizontalMax;
		const horizontalTracking = boss.horizontalTracking == null ? 0.0024 : boss.horizontalTracking;
		const oscSpeed = boss.horizontalOscSpeed == null ? 0.0026 : boss.horizontalOscSpeed;
		const rawOscAmp = boss.horizontalOscAmp == null ? canvas.width * 0.08 : boss.horizontalOscAmp;
		const span = Math.max(40, horizontalMax - horizontalMin);
		const baseMax = Math.max(16, span * 0.35);
		const baseAmp = Math.min(Math.max(Math.abs(rawOscAmp), 16), baseMax);
		const midCenter = (horizontalMin + horizontalMax) * 0.5;
		const defaultEdgePad = Math.max(8, span * 0.04);
		const rawEdgePad = boss.horizontalEdgePad;
		const edgePad = rawEdgePad == null ? defaultEdgePad : clamp(rawEdgePad, 0, Math.max(0, span * 0.48));
		const forwardLimit = Math.max(12, horizontalMax - midCenter - edgePad);
		const backwardLimit = Math.max(12, midCenter - horizontalMin - edgePad);
		const forwardBoost = boss.horizontalForwardBoost == null ? 2.2 : boss.horizontalForwardBoost;
		const backwardBoost = boss.horizontalBackBoost == null ? 1.25 : boss.horizontalBackBoost;
		const scaledForward = Math.min(baseAmp * forwardBoost, Math.max(24, span * 0.5));
		const scaledBackward = Math.min(baseAmp * backwardBoost, Math.max(24, span * 0.38));
		const forwardAmp = Math.max(16, Math.min(scaledForward, forwardLimit));
		const backwardAmp = Math.max(16, Math.min(scaledBackward, backwardLimit));
		const biasRaw = boss.horizontalForwardBias == null ? canvas.width * 0.1 : boss.horizontalForwardBias;
		const biasMax = Math.max(0, horizontalMax - (midCenter + forwardAmp) - edgePad);
		const forwardBias = clamp(biasRaw, 0, biasMax);
		boss.oscPhase = (boss.oscPhase == null ? 0 : boss.oscPhase) + oscSpeed * dt;
		const osc = Math.sin(boss.oscPhase);
		const amp = osc >= 0 ? forwardAmp : backwardAmp;
		const bias = Math.max(0, osc) * forwardBias;
		const desiredX = clamp(midCenter + osc * amp + bias, horizontalMin, horizontalMax);
		const deltaX = desiredX - boss.x;
		boss.x = clamp(boss.x + deltaX * horizontalTracking * dt, horizontalMin, horizontalMax);
		if (Math.abs(deltaX) > 0.6) boss.dir = deltaX > 0 ? 1 : -1;

		applyCoverAvoidance(boss, {
			padX: 96,
			padY: 88,
			detourDuration: 920,
			detourSpeed: boss.speed == null ? 0.28 : Math.max(boss.speed * 0.82, 0.24),
			pushSpeed: 0.3,
			cooldown: 640
		});
		processCoverDetour(boss, dt, {
			minX: horizontalMin,
			maxX: horizontalMax,
			minY: verticalMin,
			maxY: verticalMax
		});

		const enraged = boss.hp <= boss.maxHp * 0.35;
		const attackDelay = (enraged ? 1400 : 2200) + Math.random() * 600;
		boss.attackTimer -= dt;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		const pattern = bossCfg && bossCfg.pattern;
		
		if (pattern === "arrowVolley") {
			if (boss.attackTimer <= 0) {
				const nextAttack = boss.lastAttack === "perfume-volley" ? "fragrance-wave" : "perfume-volley";
				if (nextAttack === "perfume-volley") spawnBossPerfumeVolley();
				else spawnBossFragranceWave();
				boss.lastAttack = nextAttack;
				const cooldown = nextAttack === "perfume-volley"
					? (bossCfg && bossCfg.volleyCooldown != null ? bossCfg.volleyCooldown : 2200)
					: (bossCfg && bossCfg.cloudCooldown != null ? bossCfg.cloudCooldown : 2800);
				boss.attackTimer = cooldown + Math.random() * 380;
			}
			return;
		}
		if (pattern === "regatta") {
			if (boss.attackTimer <= 0) {
				const config = bossCfg || {};
				const enragedRegatta = boss.hp <= boss.maxHp * 0.45;
				const baseOptions = ["harbor-sog", "katapult", "anchor", "regatta-rush"];
				let pool = baseOptions.filter(option => option !== boss.lastAttack);
				if (pool.length === 0) pool = baseOptions.slice();
				if (enragedRegatta) {
					pool.push("katapult", "regatta-rush");
				}
				const nextAttack = pool[Math.floor(Math.random() * pool.length)];
				let cooldown;
				switch (nextAttack) {
					case "harbor-sog":
						spawnYachtwalHarborSog();
						cooldown = config.harborCooldown != null ? config.harborCooldown : 4800;
						break;
					case "katapult":
						spawnYachtwalKielwasserKatapult();
						cooldown = config.katapultCooldown != null ? config.katapultCooldown : 3600;
						break;
					case "anchor":
						spawnYachtwalAnchorDonner();
						cooldown = config.anchorCooldown != null ? config.anchorCooldown : 5400;
						break;
					default:
						spawnYachtwalRegattaRaserei();
						cooldown = config.regattaRushCooldown != null ? config.regattaRushCooldown : 4400;
						break;
				}
				if (enragedRegatta) cooldown *= 0.82;
				boss.lastAttack = nextAttack;
				boss.attackTimer = cooldown + Math.random() * 420;
			}
			return;
		}
		if (pattern === "cashfish") {
			state.cashfishUltLock = Math.max(0, (state.cashfishUltLock || 0) - dt);
			if (!state.cashfishUltHistory) state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
			if (boss.attackTimer <= 0) {
				const config = bossCfg || {};
				const enragedCashfish = boss.hp <= boss.maxHp * 0.45;
				const baseOptions = ["coin-salvo", "diamond-lattice", "card-shock"];
				let pool = baseOptions.filter(option => option !== boss.lastAttack);
				if (pool.length === 0) pool = baseOptions.slice();
				if (enragedCashfish) {
					pool.push("coin-salvo", "card-shock");
					const hist = state.cashfishUltHistory;
					if (state.cashfishUltLock <= 0) {
						if (!hist.tsunamiUsed || Math.random() < 0.35) pool.push("treasure-tsunami");
						if (!hist.crownUsed || Math.random() < 0.35) pool.push("crown-ledger");
					}
				}
				pool = pool.filter((option, index, arr) => option !== boss.lastAttack && arr.indexOf(option) === index);
				if (pool.length === 0) pool = baseOptions.slice();
				const nextAttack = pool[Math.floor(Math.random() * pool.length)];
				let cooldown;
				switch (nextAttack) {
					case "coin-salvo":
						spawnCashfishCoinSalvo();
						cooldown = config.salvoCooldown == null ? 2700 : config.salvoCooldown;
						break;
					case "diamond-lattice":
						spawnCashfishDiamondLattice();
						cooldown = config.latticeCooldown == null ? 3600 : config.latticeCooldown;
						break;
					case "treasure-tsunami":
						spawnCashfishTreasureTsunami();
						cooldown = config.tsunamiCooldown == null ? 5600 : config.tsunamiCooldown;
						state.cashfishUltLock = config.tsunamiLock == null ? 6400 : config.tsunamiLock;
						state.cashfishUltHistory.tsunamiUsed = true;
						break;
					case "crown-ledger":
						spawnCashfishCrownFinale();
						cooldown = config.crownCooldown == null ? 6200 : config.crownCooldown;
						state.cashfishUltLock = config.crownLock == null ? 7000 : config.crownLock;
						state.cashfishUltHistory.crownUsed = true;
						break;
					default:
						spawnCashfishCardShock();
						cooldown = config.cardCooldown == null ? 3200 : config.cardCooldown;
						break;
				}
				if (enragedCashfish && (nextAttack === "coin-salvo" || nextAttack === "diamond-lattice" || nextAttack === "card-shock")) {
					cooldown *= 0.82;
				}
				boss.lastAttack = nextAttack;
				boss.attackTimer = cooldown + Math.random() * 420;
			}
			return;
		}
		if (boss.attackTimer <= 0) {
			const nextAttack = boss.lastAttack === "fin-sweep" ? "torpedo" : boss.lastAttack === "torpedo" ? "fin-sweep" : Math.random() > 0.5 ? "torpedo" : "fin-sweep";
			if (nextAttack === "torpedo") spawnBossTorpedoBurst();
			else spawnBossFinSweep();
			boss.lastAttack = nextAttack;
			boss.attackTimer = attackDelay;
		}
	}

	function updateBossAttacks(dt) {
		const canvas = getCanvas();
		const state = getState();
		
		if (!state.boss.active) {
			state.bossTorpedoes.length = 0;
			state.bossSweeps.length = 0;
			state.bossWakeWaves.length = 0;
			state.bossWhirlpools.length = 0;
			state.bossKatapultShots.length = 0;
			state.bossShockwaves.length = 0;
			state.bossSpeedboats.length = 0;
			state.bossCoinBursts.length = 0;
			state.bossCoinExplosions.length = 0;
			state.bossDiamondBeams.length = 0;
			state.bossCardBoomerangs.length = 0;
			return;
		}
		
		// Torpedoes
		for (const torpedo of state.bossTorpedoes) {
			torpedo.x += torpedo.vx * dt;
			torpedo.y += torpedo.vy * dt;
			torpedo.sway += dt * 0.004;
			torpedo.y += Math.sin(torpedo.sway) * 0.04 * dt;
			const torpedoPad = Math.max(18, (torpedo.radius || 18) + 6);
			const torpedoCover = findCoverRockHit(torpedo.x, torpedo.y, torpedoPad, torpedoPad * 0.6);
			if (torpedoCover) {
				torpedo.life = 0;
				registerCoverRockImpact(torpedoCover, 1.1);
				continue;
			}
			torpedo.life -= dt;
		}
		// Object Pool: NUR Torpedos die aus dem Pool kommen zurückgeben
		const deadTorpedoes = state.bossTorpedoes.filter(torpedo => 
			(torpedo.life <= 0 || torpedo.x <= -160 || torpedo.y <= -120 || torpedo.y >= canvas.height + 120) && torpedo._pooled
		);
		bossTorpedoPool.releaseAll(deadTorpedoes);
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0 && torpedo.x > -160 && torpedo.y > -120 && torpedo.y < canvas.height + 120);

		// Fin Sweeps
		for (const sweep of state.bossSweeps) {
			if (sweep.delay > 0) {
				sweep.delay = Math.max(0, sweep.delay - dt);
				continue;
			}
			sweep.x += sweep.vx * dt;
			sweep.y += sweep.vy * dt;
			sweep.phase += dt * 0.003;
			sweep.life -= dt;
		}
		state.bossSweeps = state.bossSweeps.filter(sweep => sweep.life > 0 && sweep.x > -220 && sweep.y > -140 && sweep.y < canvas.height + 140);

		// Perfume Orbs
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		for (const orb of state.bossPerfumeOrbs) {
			orb.x += orb.vx * dt;
			orb.y += orb.vy * dt;
			orb.life -= dt;
			orb.sway += dt * 0.0024;
			orb.spin = (orb.spin == null ? Math.random() * TAU : orb.spin + dt * 0.0036);
			orb.y += Math.sin(orb.sway) * 0.04 * dt;
			orb.trailTimer -= dt;
			if (orb.trailTimer <= 0) {
				spawnFragranceCloud(orb.x - 12, orb.y + 6, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.55 : 42,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration * 0.6 : 2600,
					growth: 0.014,
					driftX: -0.03,
					driftY: -0.006
				});
				orb.trailTimer = orb.trailInterval || 360;
			}
			if (orb.life <= 0 && !orb.dead) {
				spawnFragranceCloud(orb.x, orb.y, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.9 : 58,
					growth: 0.02,
					driftX: -0.04,
					driftY: -0.012,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration : 3800
				});
				orb.dead = true;
			}
		}
		state.bossPerfumeOrbs = state.bossPerfumeOrbs.filter(orb => !orb.dead && orb.life > 0 && orb.x > -180 && orb.x < canvas.width + 80 && orb.y > -160 && orb.y < canvas.height + 160);
		
		// Fragrance Clouds
		for (const cloud of state.bossFragranceClouds) {
			cloud.life -= dt;
			const progress = 1 - cloud.life / Math.max(1, cloud.duration);
			const growth = cloud.growth == null ? 0.015 : cloud.growth;
			cloud.radius = cloud.baseRadius * (1 + growth * progress * 6);
			cloud.x += (cloud.driftX == null ? 0 : cloud.driftX) * dt;
			cloud.y += (cloud.driftY == null ? 0 : cloud.driftY) * dt;
			cloud.swirl = (cloud.swirl == null ? Math.random() * TAU : cloud.swirl + dt * 0.0018);
			cloud.pulse = (cloud.pulse == null ? Math.random() * TAU : cloud.pulse + dt * 0.0024);
		}
		state.bossFragranceClouds = state.bossFragranceClouds.filter(cloud => cloud.life > 0 && cloud.x > -200 && cloud.x < canvas.width + 120 && cloud.y > -200 && cloud.y < canvas.height + 200);

		// Wake Waves
		for (const wave of state.bossWakeWaves) {
			wave.x += (wave.vx == null ? -0.32 : wave.vx) * dt;
			wave.phase = (wave.phase == null ? Math.random() * TAU : wave.phase + (wave.freq == null ? 0.003 : wave.freq) * dt);
			const amplitude = wave.amplitude == null ? 18 : wave.amplitude;
			const baseY = wave.baseY == null ? wave.y : wave.baseY;
			wave.y = clamp(baseY + Math.sin(wave.phase) * amplitude, canvas.height * 0.2, canvas.height * 0.82);
			if (wave.hurtCooldown > 0) wave.hurtCooldown = Math.max(0, wave.hurtCooldown - dt);
			wave.life -= dt;
		}
		// Object Pool: NUR Wellen die aus dem Pool kommen zurückgeben
		const deadWaves = state.bossWakeWaves.filter(wave => (wave.life <= 0 || wave.x <= -260) && wave._pooled);
		bossWakeWavePool.releaseAll(deadWaves);
		state.bossWakeWaves = state.bossWakeWaves.filter(wave => wave.life > 0 && wave.x > -260);

		// Whirlpools
		for (const whirl of state.bossWhirlpools) {
			if (whirl.dead) continue;
			whirl.spin = (whirl.spin == null ? Math.random() * TAU : whirl.spin + dt * (whirl.releaseTriggered ? 0.006 : 0.0042));
			if (whirl.telegraph > 0) {
				whirl.telegraph = Math.max(0, whirl.telegraph - dt);
				continue;
			}
			if (whirl.damageTimer > 0) whirl.damageTimer = Math.max(0, whirl.damageTimer - dt);
			if (!whirl.releaseTriggered) {
				whirl.life -= dt;
				const ratio = 1 - whirl.life / Math.max(1, whirl.initialLife || whirl.life);
				const targetRadius = (whirl.minRadius || 48) + ((whirl.maxRadius || 120) - (whirl.minRadius || 48)) * clamp01(ratio * 1.1);
				whirl.radius = whirl.radius == null ? targetRadius : whirl.radius + (targetRadius - whirl.radius) * Math.min(1, dt * 0.0028);
				if (whirl.life <= 520) {
					whirl.releaseTriggered = true;
					whirl.explosionTimer = 520;
					whirl.explosionRadius = (whirl.radius || 96) * 1.35;
				}
			} else {
				whirl.explosionTimer = Math.max(0, whirl.explosionTimer - dt);
				if (whirl.explosionTimer <= 0) whirl.dead = true;
			}
		}
		state.bossWhirlpools = state.bossWhirlpools.filter(whirl => !whirl.dead);

		// Katapult Shots
		for (const shot of state.bossKatapultShots) {
			if (shot.dead) continue;
			if (shot.delay > 0) {
				shot.delay = Math.max(0, shot.delay - dt);
				continue;
			}
			if (shot.exploding) {
				shot.explosionLife = Math.max(0, shot.explosionLife - dt);
				if (shot.explosionLife <= 0) shot.dead = true;
				continue;
			}
			shot.x += shot.vx * dt;
			shot.y += shot.vy * dt;
			shot.vy += (shot.gravity == null ? 0.001 : shot.gravity) * dt;
			shot.spin = (shot.spin == null ? Math.random() * TAU : shot.spin + dt * 0.0032);
			const padX = Math.max(28, (shot.radius || 26) + 12);
			const padY = Math.max(26, (shot.radius || 26));
			const cover = findCoverRockHit(shot.x, shot.y, padX, padY);
			if (cover) {
				shot.dead = true;
				registerCoverRockImpact(cover, 1.35);
				continue;
			}
			shot.life -= dt;
			if (shot.life <= 0 || shot.y >= canvas.height * 0.84) {
				shot.exploding = true;
				shot.explosionLife = 620;
				shot.vx = 0;
				shot.vy = 0;
			}
		}
		state.bossKatapultShots = state.bossKatapultShots.filter(shot => !shot.dead && shot.x > -220 && shot.x < canvas.width + 220 && shot.y > -160 && shot.y < canvas.height + 200);

		// Shockwaves
		for (const wave of state.bossShockwaves) {
			if (wave.dead) continue;
			wave.anchorPulse = (wave.anchorPulse == null ? Math.random() * TAU : wave.anchorPulse + dt * 0.004);
			if (wave.stage === "telegraph") {
				wave.telegraphTimer = Math.max(0, wave.telegraphTimer - dt);
				if (wave.telegraphTimer <= 0) {
					wave.stage = "wave1";
					wave.waveOneRadius = 48;
				}
				continue;
			}
			if (wave.stage === "wave1") {
				wave.waveOneRadius += (wave.waveSpeedOne || 1.1) * dt;
				if (wave.waveOneRadius >= (wave.maxRadius || Math.max(canvas.width, canvas.height))) {
					wave.stage = "pause";
				}
				continue;
			}
			if (wave.stage === "pause") {
				wave.waitTimer = Math.max(0, wave.waitTimer - dt);
				if (wave.waitTimer <= 0) {
					wave.stage = "wave2";
					wave.waveTwoRadius = Math.max(wave.waveOneRadius * 0.55, 72);
				}
				continue;
			}
			if (wave.stage === "wave2") {
				wave.waveTwoRadius += (wave.waveSpeedTwo || 1.36) * dt;
				if (wave.waveTwoRadius >= (wave.maxRadius || Math.max(canvas.width, canvas.height))) {
					wave.stage = "cleanup";
				}
				continue;
			}
			if (wave.stage === "cleanup") {
				wave.cleanupTimer = Math.max(0, wave.cleanupTimer - dt);
				if (wave.cleanupTimer <= 0) wave.dead = true;
			}
		}
		state.bossShockwaves = state.bossShockwaves.filter(wave => !wave.dead);

		// Speedboats
		for (const boat of state.bossSpeedboats) {
			if (boat.dead) continue;
			boat.life -= dt;
			if (boat.life <= 0) {
				boat.dead = true;
				continue;
			}
			boat.x += boat.vx * dt;
			boat.sway = (boat.sway == null ? Math.random() * TAU : boat.sway + (boat.swaySpeed || 0.0028) * dt);
			const swayAmp = boat.swayAmplitude == null ? 16 : boat.swayAmplitude;
			const baseY = boat.baseY == null ? boat.y : boat.baseY;
			boat.y = clamp(baseY + Math.sin(boat.sway) * swayAmp, canvas.height * 0.2, canvas.height * 0.78);
			const coverBoat = findCoverRockHit(boat.x, boat.y, 50, 42);
			if (coverBoat) {
				boat.dead = true;
				registerCoverRockImpact(coverBoat, 1.5);
				continue;
			}
			if (boat.damageCooldown > 0) boat.damageCooldown = Math.max(0, boat.damageCooldown - dt);
			if (boat.x < -220) boat.dead = true;
		}
		state.bossSpeedboats = state.bossSpeedboats.filter(boat => !boat.dead && boat.x > -260 && boat.y > -200 && boat.y < canvas.height + 200);

		// Coin Bursts & Explosions
		const explodeCoin = coin => {
			if (coin.exploded) return;
			state.bossCoinExplosions.push({
				x: coin.x,
				y: coin.y,
				radius: 54 * (coin.scale || 1),
				life: 520,
				duration: 520,
				knockback: coin.knockback == null ? 0.16 : coin.knockback,
				damage: coin.damage == null ? 1 : coin.damage,
				hitApplied: false,
				elapsed: 0
			});
			coin.exploded = true;
		};

		const coinGround = canvas.height * 0.82;
		for (const coin of state.bossCoinBursts) {
			if (coin.exploded) continue;
			coin.x += coin.vx * dt;
			coin.y += coin.vy * dt;
			coin.vy += (coin.gravity == null ? 0.00034 : coin.gravity) * dt;
			coin.life -= dt;
			coin.spin = (coin.spin || 0) + dt * 0.01;
			if (coin.life <= 0 || coin.y >= coinGround) {
				coin.y = Math.min(coin.y, coinGround);
				explodeCoin(coin);
			}
		}
		state.bossCoinBursts = state.bossCoinBursts.filter(coin => !coin.exploded && coin.life > 0 && coin.x > -180 && coin.x < canvas.width + 160 && coin.y > -140 && coin.y < canvas.height + 160);

		for (const blast of state.bossCoinExplosions) {
			blast.life -= dt;
			blast.elapsed = (blast.elapsed || 0) + dt;
			if (blast.life <= 0) blast.dead = true;
		}
		state.bossCoinExplosions = state.bossCoinExplosions.filter(blast => !blast.dead);

		// Diamond Beams
		for (const beam of state.bossDiamondBeams) {
			if (beam.stage === "telegraph") {
				beam.telegraphTimer = Math.max(0, (beam.telegraphTimer || 0) - dt);
				if (beam.telegraphTimer <= 0) {
					beam.stage = "active";
					beam.activeTimer = beam.activeDuration == null ? 1000 : beam.activeDuration;
					beam.damageCooldown = 0;
				}
			} else if (beam.stage === "active") {
				beam.activeTimer = Math.max(0, (beam.activeTimer || 0) - dt);
				beam.damageCooldown = Math.max(0, (beam.damageCooldown || 0) - dt);
				if (beam.activeTimer <= 0) {
					beam.stage = "fade";
					beam.fadeTimer = beam.fadeDuration == null ? 280 : beam.fadeDuration;
				}
			} else if (beam.stage === "fade") {
				beam.fadeTimer = Math.max(0, (beam.fadeTimer || 0) - dt);
				if (beam.fadeTimer <= 0) beam.dead = true;
			}
		}
		state.bossDiamondBeams = state.bossDiamondBeams.filter(beam => !beam.dead);

		// Card Boomerangs
		const boss = state.boss;
		for (const card of state.bossCardBoomerangs) {
			card.life -= dt;
			card.elapsed = (card.elapsed || 0) + dt;
			card.hitCooldown = Math.max(0, (card.hitCooldown || 0) - dt);
			if (card.phase === "outbound") {
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
				if (card.x <= (card.bounceX == null ? canvas.width * 0.26 : card.bounceX)) {
					card.phase = "return";
					card.targetX = boss.x - 24 + Math.cos(card.orbitAngle || 0) * 20;
					card.targetY = boss.y + Math.sin(card.orbitAngle || 0) * 36;
				}
			} else if (card.phase === "return") {
				const targetX = card.targetX == null ? boss.x - 24 : card.targetX;
				const targetY = card.targetY == null ? boss.y : card.targetY;
				const dx = targetX - card.x;
				const dy = targetY - card.y;
				const dist = Math.hypot(dx, dy) || 1;
				const speed = card.speed == null ? 0.34 : card.speed * 1.08;
				card.vx = (dx / dist) * speed;
				card.vy = (dy / dist) * speed;
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
				if (dist < 8) {
					card.phase = "orbit";
					card.orbitAngle = card.orbitAngle == null ? 0 : card.orbitAngle;
					card.orbitTimer = card.orbitTimer == null ? (state.levelConfig && state.levelConfig.boss && state.levelConfig.boss.cardSpiralDelay != null ? state.levelConfig.boss.cardSpiralDelay : 560) : card.orbitTimer;
				}
			} else if (card.phase === "orbit") {
				const orbitRadius = card.orbitRadius == null ? 72 : card.orbitRadius;
				const orbitDir = (card.ringIndex || 0) % 2 === 0 ? 1 : -1;
				card.orbitTimer = Math.max(0, (card.orbitTimer || 0) - dt);
				card.orbitAngle = (card.orbitAngle || 0) + orbitDir * dt * 0.0038;
				card.x = boss.x + Math.cos(card.orbitAngle) * orbitRadius;
				card.y = boss.y + Math.sin(card.orbitAngle) * orbitRadius;
				card.rotation = card.orbitAngle + Math.PI / 2;
				if (card.orbitTimer <= 0) {
					card.phase = "burst";
					const launchSpeed = (card.speed == null ? 0.34 : card.speed) * 1.32;
					card.vx = Math.cos(card.orbitAngle) * launchSpeed;
					card.vy = Math.sin(card.orbitAngle) * launchSpeed;
					card.rotation = Math.atan2(card.vy, card.vx);
				}
			} else {
				card.x += card.vx * dt;
				card.y += card.vy * dt;
				card.rotation = Math.atan2(card.vy, card.vx);
			}
			if (card.life <= 0 || card.x < -240 || card.x > canvas.width + 240 || card.y < -240 || card.y > canvas.height + 240) {
				card.dead = true;
			}
		}
		state.bossCardBoomerangs = state.bossCardBoomerangs.filter(card => !card.dead);

		// Treasure Waves
		for (const wave of state.bossTreasureWaves) {
			if (wave.stage === "telegraph") {
				wave.telegraphTimer = Math.max(0, (wave.telegraphTimer || 0) - dt);
				wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0036;
				if (wave.telegraphTimer <= 0) {
					wave.stage = "surge";
					wave.surgeTimer = wave.surgeDuration == null ? 2000 : wave.surgeDuration;
				}
				continue;
			}
			if (wave.stage === "surge") {
				wave.x += (wave.vx == null ? -0.42 : wave.vx) * dt;
				wave.wobblePhase = (wave.wobblePhase || 0) + (wave.wobbleSpeed == null ? 0.0032 : wave.wobbleSpeed) * dt;
				const amplitude = wave.amplitude == null ? 34 : wave.amplitude;
				const baseY = wave.baseY == null ? wave.y : wave.baseY;
				wave.y = clamp(baseY + Math.sin(wave.wobblePhase) * amplitude, canvas.height * 0.24, canvas.height * 0.82);
				wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0042;
				if (wave.damageCooldown > 0) wave.damageCooldown = Math.max(0, wave.damageCooldown - dt);
				wave.surgeTimer = Math.max(0, (wave.surgeTimer || 0) - dt);
				if (wave.surgeTimer <= 0 || wave.x < -((wave.radiusX || 120) + 160)) {
					wave.stage = "foam";
					wave.fadeTimer = wave.fadeDuration == null ? 420 : wave.fadeDuration;
				}
				continue;
			}
			wave.fadeTimer = Math.max(0, (wave.fadeTimer || 0) - dt);
			wave.foamPhase = (wave.foamPhase || 0) + dt * 0.0024;
			if (wave.fadeTimer <= 0) wave.dead = true;
		}
		state.bossTreasureWaves = state.bossTreasureWaves.filter(wave => !wave.dead);

		// Crown Columns
		for (const column of state.bossCrownColumns) {
			column.sparklePhase = (column.sparklePhase || 0) + dt * 0.0045;
			if (column.stage === "telegraph") {
				column.telegraphTimer = Math.max(0, (column.telegraphTimer || 0) - dt);
				if (column.telegraphTimer <= 0) {
					column.stage = "active";
					column.activeTimer = column.activeDuration == null ? 1400 : column.activeDuration;
				}
				continue;
			}
			if (column.stage === "active") {
				column.pillarPulse = (column.pillarPulse || 0) + dt * 0.0038;
				if (column.damageCooldown > 0) column.damageCooldown = Math.max(0, column.damageCooldown - dt);
				column.activeTimer = Math.max(0, (column.activeTimer || 0) - dt);
				if (column.activeTimer <= 0) {
					column.stage = "fade";
					column.fadeTimer = column.fadeDuration == null ? 420 : column.fadeDuration;
				}
				continue;
			}
			column.pillarPulse = (column.pillarPulse || 0) + dt * 0.0026;
			column.fadeTimer = Math.max(0, (column.fadeTimer || 0) - dt);
			if (column.fadeTimer <= 0) column.dead = true;
		}
		state.bossCrownColumns = state.bossCrownColumns.filter(column => !column.dead);
	}

	return {
		updateBoss,
		updateBossAttacks
	};
}
