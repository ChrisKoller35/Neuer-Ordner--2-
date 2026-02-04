// Boss-Spawn-Funktionen - ausgelagert aus game.js
// Alle Funktionen zum Spawnen von Boss-Attacken
// 
// HINWEIS: Dieses Modul verwendet ein Factory-Pattern mit Dependency Injection.
// Die Integration erfordert dass das bossSpawner-Objekt vor den Aufrufen
// initialisiert wird. Siehe game.js für die Integration.

import { TAU } from '../core/constants.js';

/**
 * Clamp-Hilfsfunktion
 */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/**
 * Erstellt das Boss-Spawn-System
 * @param {Object} deps - Abhängigkeiten
 * @param {Function} deps.getCanvas - Funktion die das Canvas zurückgibt
 * @param {Function} deps.getState - Funktion die den State zurückgibt
 * @param {Function} deps.triggerEventFlash - Funktion für Event-Flash
 */
export function createBossSpawnSystem(deps) {
	const { getCanvas, getState, triggerEventFlash } = deps;

	function spawnBossTorpedoBurst() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const enraged = boss.hp <= boss.maxHp * 0.35;
		const count = enraged ? 4 : 3;
		const spread = enraged ? 22 : 18;
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			state.bossTorpedoes.push({
				x: boss.x - 90,
				y: boss.y + offsetIndex * spread,
				vx: -0.46 - Math.random() * 0.06,
				vy: offsetIndex * 0.05,
				life: 5200,
				sway: Math.random() * TAU,
				radius: 18
			});
		}
	}

	function spawnYachtwalBroadside() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const bursts = config && config.broadsideBursts != null ? config.broadsideBursts : 2;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		const lanes = enraged ? 5 : 4;
		for (let b = 0; b < bursts; b += 1) {
			for (let lane = 0; lane < lanes; lane += 1) {
				const offsetIndex = lane - (lanes - 1) / 2;
				const angle = (offsetIndex * 0.14) + (Math.random() - 0.5) * 0.04;
				const speed = 0.52 + b * 0.05 + Math.random() * 0.05 + (enraged ? 0.06 : 0);
				const vx = -Math.cos(angle) * speed;
				const vy = Math.sin(angle) * speed;
				state.bossTorpedoes.push({
					x: boss.x - 80 - b * 18,
					y: boss.y + offsetIndex * 32 + (enraged ? offsetIndex * 6 : 0),
					vx,
					vy,
					life: 5600,
					sway: Math.random() * TAU,
					radius: 20,
					kind: "broadside"
				});
			}
		}
		triggerEventFlash("boss", { text: "Breitseite!", duration: 900, opacity: 0.7 });
	}

	function spawnYachtwalWakeWall() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const count = config && config.wakeCount != null ? config.wakeCount : 4;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			const baseY = clamp(
				boss.y + offsetIndex * (enraged ? 46 : 36),
				canvas.height * 0.22,
				canvas.height * 0.78
			);
			const amplitude = (18 + Math.abs(offsetIndex) * 4) * (enraged ? 1.4 : 1);
			const radiusX = 78 + Math.abs(offsetIndex) * 18;
			const radiusY = 26 + Math.abs(offsetIndex) * 6;
			const life = 3600 + Math.random() * 600 + (enraged ? 500 : 0);
			state.bossWakeWaves.push({
				x: boss.x - 96 - i * 18,
				y: baseY,
				baseY,
				amplitude,
				radiusX,
				radiusY,
				vx: -0.32 - Math.abs(offsetIndex) * 0.03 - (enraged ? 0.05 : 0),
				life,
				initialLife: life,
				phase: Math.random() * TAU,
				freq: 0.0032 + Math.random() * 0.0016,
				hurtCooldown: 0
			});
		}
		triggerEventFlash("boss", { text: "Bugwelle!", duration: 900, opacity: 0.68 });
	}

	function spawnYachtwalHarborSog() {
		const canvas = getCanvas();
		const state = getState();
		const player = state.player;
		const boss = state.boss;
		const minX = canvas.width * 0.18;
		const maxX = canvas.width * 0.6;
		const minY = canvas.height * 0.3;
		const maxY = canvas.height * 0.76;
		const leftBias = canvas.width * 0.06;
		const centerX = clamp(player.x * 0.75 + boss.x * 0.25 - leftBias, minX, maxX);
		const centerY = clamp(player.y, minY, maxY);
		const initialLife = 3200 + Math.random() * 400;
		state.bossWhirlpools.push({
			x: centerX,
			y: centerY,
			minRadius: 52,
			maxRadius: 128,
			radius: 52,
			life: initialLife,
			initialLife,
			spin: Math.random() * TAU,
			pull: 0.0011,
			damageTimer: 0,
			telegraph: 720,
			releaseTriggered: false,
			explosionTimer: 0,
			explosionRadius: 0,
			explosionApplied: false,
			dead: false
		});
		triggerEventFlash("boss", { text: "Hafen-Sog!", duration: 1000, opacity: 0.72 });
	}

	function spawnYachtwalKielwasserKatapult() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const enraged = boss.hp <= boss.maxHp * 0.45;
		const count = enraged ? 4 : 3;
		const coverRock = state.coverRocks.find(rock => rock.landed);
		const clearanceY = coverRock
			? coverRock.y - (coverRock.radiusY == null ? 60 : coverRock.radiusY) - 40
			: null;
		for (let i = 0; i < count; i += 1) {
			const delay = i * 160;
			const speedBoost = Math.random() * 0.08;
			const launchY = clearanceY == null ? boss.y + 8 : Math.min(boss.y + 8, clearanceY);
			state.bossKatapultShots.push({
				x: boss.x - 70,
				y: launchY,
				vx: -0.46 - speedBoost,
				vy: -0.5 - Math.random() * 0.06,
				gravity: 0.0009 + Math.random() * 0.0002,
				life: 4600 + Math.random() * 400,
				delay,
				radius: 26,
				spin: Math.random() * TAU,
				exploding: false,
				explosionLife: 0,
				explosionRadius: 110,
				damageDone: false,
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Kielwasser-Katapult!", duration: 1000, opacity: 0.7 });
	}

	function spawnYachtwalAnchorDonner() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const player = state.player;
		const centerX = clamp((boss.x + player.x) / 2, canvas.width * 0.4, canvas.width * 0.8);
		const centerY = clamp(player.y, canvas.height * 0.32, canvas.height * 0.68);
		state.bossShockwaves.push({
			x: centerX,
			y: centerY,
			stage: "telegraph",
			telegraphTimer: 1040,
			waveOneRadius: 0,
			waveTwoRadius: 0,
			waveSpeedOne: 0.28,
			waveSpeedTwo: 0.22,
			waveThicknessOne: 110,
			waveThicknessTwo: 150,
			waitTimer: 560,
			maxRadius: Math.max(canvas.width, canvas.height) * 1.2,
			damageWaveOne: false,
			damageWaveTwo: false,
			anchorPulse: Math.random() * TAU,
			cleanupTimer: 820,
			dead: false
		});
		triggerEventFlash("boss", { text: "Anker-Donner!", duration: 1020, opacity: 0.74 });
	}

	function spawnYachtwalRegattaRaserei() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const lanes = 10;
		const baseY = canvas.height * 0.24;
		const span = canvas.height * 0.5;
		for (let i = 0; i < lanes; i += 1) {
			const t = lanes <= 1 ? 0.5 : i / (lanes - 1);
			const jitter = (Math.random() - 0.5) * 28;
			const posY = clamp(baseY + span * t + jitter, canvas.height * 0.22, canvas.height * 0.78);
			state.bossSpeedboats.push({
				x: canvas.width + 60 + i * 26,
				y: posY,
				baseY: posY,
				vx: -0.7 - Math.random() * 0.08 - (boss.hp <= boss.maxHp * 0.45 ? 0.06 : 0),
				sway: Math.random() * TAU,
				swaySpeed: 0.0026 + Math.random() * 0.0014,
				swayAmplitude: 14 + Math.random() * 12,
				life: 4200 + Math.random() * 400,
				damageCooldown: 0,
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Regatta-Raserei!", duration: 1050, opacity: 0.7 });
	}

	function spawnCashfishCoinSalvo() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const count = config.salvoCoinCount == null ? 6 : Math.max(3, config.salvoCoinCount);
		const knockback = config.salvoKnockback == null ? 0.16 : config.salvoKnockback;
		for (let i = 0; i < count; i += 1) {
			const t = count <= 1 ? 0.5 : i / (count - 1);
			const angle = (-0.22 + t * 0.52) + (Math.random() - 0.5) * 0.12;
			const speed = 0.34 + Math.random() * 0.08;
			const vx = -Math.cos(angle) * speed;
			const vy = -Math.sin(angle) * speed - 0.06;
			state.bossCoinBursts.push({
				x: boss.x - 42,
				y: boss.y + 18,
				vx,
				vy,
				gravity: 0.00032 + Math.random() * 0.00008,
				life: 2600 + Math.random() * 420,
				scale: 0.88 + Math.random() * 0.22,
				knockback,
				damage: 1,
				exploded: false,
				spin: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Goldgier-Salve!", duration: 1000, opacity: 0.78 });
	}

	function spawnCashfishDiamondLattice() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const telegraph = config.latticeTelegraph == null ? 1100 : config.latticeTelegraph;
		const active = config.latticeActive == null ? 1200 : config.latticeActive;
		const fade = config.latticeFade == null ? 320 : config.latticeFade;
		const width = config.latticeLaserWidth == null ? 48 : config.latticeLaserWidth;
		const knockback = config.latticeKnockback == null ? 0.16 : config.latticeKnockback;
		const baseOriginX = boss.x - 36;
		const baseOriginY = boss.y + 18;
		const angles = [-0.55, 0, 0.55];
		const splitOffset = 0.24;
		for (const baseAngle of angles) {
			state.bossDiamondBeams.push({
				originX: baseOriginX,
				originY: baseOriginY,
				angle: baseAngle,
				width,
				knockback,
				stage: "telegraph",
				telegraphTimer: telegraph,
				telegraphTotal: telegraph,
				activeTimer: active,
				activeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				damageCooldown: 0
			});
			if (baseAngle !== 0) {
				state.bossDiamondBeams.push({
					originX: baseOriginX,
					originY: baseOriginY + (baseAngle > 0 ? 42 : -42),
					angle: baseAngle + splitOffset * (baseAngle > 0 ? 1 : -1),
					width: width * 0.82,
					knockback,
					stage: "telegraph",
					telegraphTimer: telegraph + 220,
					telegraphTotal: telegraph + 220,
					activeTimer: active * 0.92,
					activeDuration: active * 0.92,
					fadeTimer: fade,
					fadeDuration: fade,
					damageCooldown: 0
				});
			}
		}
		triggerEventFlash("boss", { text: "Diamant-Gitter!", duration: 1100, opacity: 0.82 });
	}

	function spawnCashfishCardShock() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const ringCount = config.cardRingCount == null ? 2 : Math.max(1, config.cardRingCount);
		const baseCount = Math.max(4, ringCount * 4);
		const speed = config.cardBoomerangSpeed == null ? 0.34 : config.cardBoomerangSpeed;
		const bounceX = canvas.width * 0.26;
		const orbitDelay = config.cardSpiralDelay == null ? 560 : config.cardSpiralDelay;
		for (let i = 0; i < baseCount; i += 1) {
			const t = i / baseCount;
			const angle = t * TAU;
			const verticalOffset = Math.sin(angle) * 42;
			const vx = -(speed + 0.12 + Math.random() * 0.04);
			const vy = Math.sin(angle) * speed * 0.65;
			state.bossCardBoomerangs.push({
				phase: "outbound",
				x: boss.x - 36,
				y: boss.y + verticalOffset * 0.4,
				vx,
				vy,
				speed,
				bounceX,
				orbitAngle: angle,
				orbitRadius: 70 + (i % ringCount) * 14,
				orbitTimer: orbitDelay,
				life: 6400,
				damage: 1,
				knockback: 0.14,
				elapsed: 0,
				stageTimer: 0,
				ringIndex: i,
				ringTotal: baseCount
			});
		}
		triggerEventFlash("boss", { text: "Kreditkarten-Schock!", duration: 1040, opacity: 0.8 });
	}

	function spawnCashfishTreasureTsunami() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const waveCount = config.tsunamiWaveCount == null ? 3 : Math.max(2, config.tsunamiWaveCount);
		const telegraph = config.tsunamiTelegraph == null ? 1100 : config.tsunamiTelegraph;
		const active = config.tsunamiActive == null ? 2000 : config.tsunamiActive;
		const fade = config.tsunamiFade == null ? 420 : config.tsunamiFade;
		const radiusX = config.tsunamiRadiusX == null ? 120 : config.tsunamiRadiusX;
		const radiusY = config.tsunamiRadiusY == null ? 48 : config.tsunamiRadiusY;
		const baseSpeed = config.tsunamiSpeed == null ? 0.42 : config.tsunamiSpeed;
		const amplitude = config.tsunamiAmplitude == null ? 34 : config.tsunamiAmplitude;
		const knockback = config.tsunamiKnockback == null ? 0.22 : config.tsunamiKnockback;
		const damage = config.tsunamiDamage == null ? 1 : config.tsunamiDamage;
		const minY = canvas.height * 0.24;
		const maxY = canvas.height * 0.78;
		for (let i = 0; i < waveCount; i += 1) {
			const t = waveCount <= 1 ? 0.5 : i / (waveCount - 1);
			const jitter = (Math.random() - 0.5) * canvas.height * 0.06;
			const posY = clamp(minY + (maxY - minY) * t + jitter, minY + 28, maxY - 28);
			const speed = baseSpeed + Math.random() * 0.08 + i * 0.02;
			state.bossTreasureWaves.push({
				stage: "telegraph",
				telegraphTimer: telegraph + i * 120,
				telegraphTotal: telegraph + i * 120,
				surgeTimer: active,
				surgeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				x: boss.x + 80 + i * 42,
				y: posY,
				baseY: posY,
				radiusX,
				radiusY,
				vx: -(speed),
				amplitude: amplitude * (0.9 + Math.random() * 0.2),
				wobblePhase: Math.random() * TAU,
				wobbleSpeed: 0.003 + Math.random() * 0.0014,
				damageCooldown: 0,
				knockback,
				damage,
				foamPhase: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Schatzkammer-Tsunami!", duration: 1200, opacity: 0.84 });
	}

	function spawnCashfishCrownFinale() {
		const canvas = getCanvas();
		const state = getState();
		const config = (state.levelConfig && state.levelConfig.boss) || {};
		const columnCount = config.crownColumnCount == null ? 4 : Math.max(2, config.crownColumnCount);
		const telegraph = config.crownTelegraph == null ? 1300 : config.crownTelegraph;
		const active = config.crownActive == null ? 1500 : config.crownActive;
		const fade = config.crownFade == null ? 520 : config.crownFade;
		const halfWidth = (config.crownColumnWidth == null ? 92 : config.crownColumnWidth) * 0.5;
		const knockback = config.crownKnockback == null ? 0.24 : config.crownKnockback;
		const damage = config.crownDamage == null ? 1 : config.crownDamage;
		const top = canvas.height * 0.22;
		const bottom = canvas.height * 0.82;
		const left = canvas.width * 0.4;
		const right = canvas.width * 0.84;
		for (let i = 0; i < columnCount; i += 1) {
			const t = columnCount <= 1 ? 0.5 : (i + 0.5) / columnCount;
			let x = left + (right - left) * t + (Math.random() - 0.5) * 40;
			x = clamp(x, canvas.width * 0.36 + halfWidth, canvas.width * 0.88 - halfWidth);
			const delay = (i % 2) * 220 + Math.random() * 140;
			state.bossCrownColumns.push({
				stage: "telegraph",
				telegraphTimer: telegraph + delay,
				telegraphTotal: telegraph + delay,
				activeTimer: active,
				activeDuration: active,
				fadeTimer: fade,
				fadeDuration: fade,
				x,
				top,
				bottom,
				halfWidth,
				damageCooldown: 0,
				knockback,
				damage,
				sparklePhase: Math.random() * TAU,
				pillarPulse: Math.random() * TAU
			});
		}
		triggerEventFlash("boss", { text: "Kronen-Schlusskonto!", duration: 1280, opacity: 0.84 });
	}

	function spawnBossFinSweep() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		boss.finFlip = !boss.finFlip;
		const downward = boss.finFlip;
		const baseY = downward ? canvas.height * 0.28 : canvas.height * 0.72;
		const dirY = downward ? 1 : -1;
		const enraged = boss.hp <= boss.maxHp * 0.35;
		const segments = enraged ? 6 : 5;
		for (let i = 0; i < segments; i += 1) {
			state.bossSweeps.push({
				x: canvas.width + 160 + i * 40,
				y: baseY + dirY * i * 34,
				vx: -0.56,
				vy: dirY * 0.14,
				radius: 38,
				life: 3600,
				delay: i * 160,
				phase: Math.random() * TAU
			});
		}
	}

	function spawnFragranceCloud(x, y, opts = {}) {
		const state = getState();
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		const duration = opts.duration == null ? (bossCfg && bossCfg.cloudDuration != null ? bossCfg.cloudDuration : 3800) : opts.duration;
		const radius = opts.radius == null ? (bossCfg && bossCfg.cloudRadius != null ? bossCfg.cloudRadius : 60) : opts.radius;
		state.bossFragranceClouds.push({
			x,
			y,
			radius,
			baseRadius: radius,
			life: duration,
			duration,
			growth: opts.growth == null ? 0.015 : opts.growth,
			driftX: opts.driftX == null ? -0.02 : opts.driftX,
			driftY: opts.driftY == null ? -0.01 : opts.driftY,
			swirl: Math.random() * TAU,
			pulse: Math.random() * TAU
		});
	}

	function spawnBossPerfumeVolley() {
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		const config = state.levelConfig && state.levelConfig.boss;
		const spread = config && config.perfumeSpread != null ? config.perfumeSpread : 38;
		const baseSpeed = config && config.perfumeSpeed != null ? config.perfumeSpeed : 0.32;
		const count = 3;
		const player = state.player;
		const targetX = player.x;
		const targetY = player.y;
		const originBaseX = boss.x - 62;
		const originBaseY = boss.y;
		const baseAngle = Math.atan2(targetY - originBaseY, targetX - originBaseX);
		const angleStep = (spread * Math.PI) / 360;
		for (let i = 0; i < count; i += 1) {
			const offsetIndex = i - (count - 1) / 2;
			const angle = baseAngle + offsetIndex * angleStep + (Math.random() - 0.5) * 0.05;
			const speed = baseSpeed + Math.random() * 0.06;
			const dirX = Math.cos(angle);
			const dirY = Math.sin(angle);
			const perpendicularX = -dirY;
			const perpendicularY = dirX;
			const lateralOffset = offsetIndex * (spread * 0.32);
			const forwardOffset = 28;
			const spawnX = originBaseX + dirX * forwardOffset + perpendicularX * lateralOffset * 0.1;
			const spawnY = originBaseY + dirY * forwardOffset + perpendicularY * lateralOffset * 0.1;
			const life = 5200 + Math.random() * 800;
			state.bossPerfumeOrbs.push({
				x: spawnX,
				y: spawnY,
				vx: dirX * speed,
				vy: dirY * speed,
				life,
				initialLife: life,
				sway: Math.random() * TAU,
				spin: Math.random() * TAU,
				trailTimer: 360 + Math.random() * 160,
				trailInterval: 420 + Math.random() * 160,
				radius: 18,
				spawnedAt: performance.now(),
				dead: false
			});
		}
		triggerEventFlash("boss", { text: "Duftsalve!", duration: 1000, opacity: 0.7 });
	}

	function spawnBossFragranceWave() {
		const canvas = getCanvas();
		const state = getState();
		const config = state.levelConfig && state.levelConfig.boss;
		const cloudCount = 4;
		const positions = [];
		const xMin = canvas.width * 0.32;
		const xMax = canvas.width * 0.9;
		const yMin = canvas.height * 0.22;
		const yMax = canvas.height * 0.78;
		const baseRadius = config && config.cloudRadius ? config.cloudRadius * 0.7 : 48;
		const minDistance = baseRadius * 1.4;
		for (let i = 0; i < cloudCount; i += 1) {
			let posX = 0;
			let posY = 0;
			let attempts = 0;
			do {
				posX = xMin + Math.random() * (xMax - xMin);
				posY = yMin + Math.random() * (yMax - yMin);
				attempts += 1;
			} while (
				attempts < 12 &&
				positions.some(p => Math.hypot(p.x - posX, p.y - posY) < minDistance)
			);
			positions.push({ x: posX, y: posY });
			spawnFragranceCloud(posX, posY, {
				growth: 0.018,
				driftX: -0.035 + (Math.random() - 0.5) * 0.015,
				driftY: (Math.random() - 0.5) * 0.03,
				radius: baseRadius,
				duration: config && config.cloudDuration ? config.cloudDuration * 0.85 : 3200
			});
		}
		triggerEventFlash("boss", { text: "Duftwolken!", duration: 1100, opacity: 0.75 });
	}

	// Rückgabe aller Spawn-Funktionen
	return {
		spawnBossTorpedoBurst,
		spawnYachtwalBroadside,
		spawnYachtwalWakeWall,
		spawnYachtwalHarborSog,
		spawnYachtwalKielwasserKatapult,
		spawnYachtwalAnchorDonner,
		spawnYachtwalRegattaRaserei,
		spawnCashfishCoinSalvo,
		spawnCashfishDiamondLattice,
		spawnCashfishCardShock,
		spawnCashfishTreasureTsunami,
		spawnCashfishCrownFinale,
		spawnBossFinSweep,
		spawnFragranceCloud,
		spawnBossPerfumeVolley,
		spawnBossFragranceWave
	};
}
