// ============================================================
// DUNGEON BOSS — Boss spawning, AI, attacks, and defeat logic
// ============================================================
"use strict";

import {
	BOSS_HALF, BOSS_ATTACK_INTERVAL, BOSS_PROJECTILE_SPEED,
	PLAYER_HALF_W, INVULN_DURATION, PROJECTILE_RADIUS
} from './dungeonConstants.js';
import { getFloorDifficulty } from './dungeonGenerator.js';
import dungeonData from '../data/dungeon.json';

/**
 * Creates the boss subsystem.
 * @param {{ tileSize: Function, walkable: Function, boxHitsWall: Function }} tiles
 * @param {HTMLCanvasElement} canvas
 * @param {Object|null} helpersSystem
 */
export function createBossSystem(tiles, canvas, helpersSystem) {
	const { tileSize, walkable, boxHitsWall } = tiles;

	// Mutable timer shared across boss updates
	let bossAttackTimer = 0;

	function resetBossTimer() { bossAttackTimer = 0; }
	function setBossTimer(v) { bossAttackTimer = v; }

	/** Spawn the boss for the current room. */
	function spawnBoss(ds) {
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk || chunk.type !== "boss") return;

		const { tw, th } = tileSize();
		const diff = getFloorDifficulty(ds.currentFloor.floor, ds.endlessScaling);
		const floor = ds.currentFloor.floor;
		const sp = chunk.spawns.find(s => s.type === "bossSpawn");
		if (!sp) return;

		let px = (sp.x + 0.5) * tw;
		let py = (sp.y + 0.5) * th;

		// Safety: ensure boss doesn't spawn inside a wall
		if (boxHitsWall(chunk.grid, px, py, BOSS_HALF, BOSS_HALF)) {
			console.warn('[Dungeon] Boss spawn inside wall, searching for free position...');
			let found = false;
			for (let r = 1; r <= 6 && !found; r++) {
				for (let dy = -r; dy <= r && !found; dy++) {
					for (let dx = -r; dx <= r && !found; dx++) {
						if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
						const testPx = (sp.x + dx + 0.5) * tw;
						const testPy = (sp.y + dy + 0.5) * th;
						if (!boxHitsWall(chunk.grid, testPx, testPy, BOSS_HALF, BOSS_HALF)) {
							px = testPx;
							py = testPy;
							found = true;
							console.log(`[Dungeon] Boss moved to free tile: (${sp.x+dx}, ${sp.y+dy})`);
						}
					}
				}
			}
		}

		const bossDef = dungeonData.bossDefinitions?.[String(floor)] || {
			name: "Unknown Boss", color: "#888888", attacks: ["charge"], hp: 50, speed: 0.04
		};

		const bossHP = bossDef.hp || diff.bossHP;
		const totalPhases = bossDef.phases || 2;

		ds.boss = {
			px, py,
			targetPx: px, targetPy: py,
			hp: bossHP, maxHp: bossHP,
			name: bossDef.name,
			color: bossDef.color,
			attacks: bossDef.attacks || ["charge"],
			attackIndex: 0,
			phase: 1,
			totalPhases,
			alive: true,
			hitFlash: 0,
			scale: 1.8,
			sway: 0,
			bobPhase: 0,
			bobOffset: 0,
			attackCooldown: BOSS_ATTACK_INTERVAL,
			charging: false,
			chargeDir: { x: 0, y: 0 },
			chargeTimer: 0,
			burrowed: false,
			burrowTimer: 0,
			shielded: false,
			shieldOrbs: 0,
			enraged: false,
			darknessTimer: 0,
			poisonTrail: [],
			spawnedWalls: [],
			reflecting: false,
			reflectTimer: 0,
			laserAngle: 0,
			laserActive: false,
			laserTimer: 0,
			splitBosses: [],
			tentacles: [],
			vortexActive: false,
			vortexTimer: 0,
			boomerangs: [],
			projectiles: [],
			damage: Math.max(1, Math.round((1 + Math.floor(floor / 5)) * (diff.damageScale || 1))),
			speed: bossDef.speed || 0.04,
			floor
		};

		bossAttackTimer = BOSS_ATTACK_INTERVAL;
	}

	/** Lighten a hex colour by a given amount. */
	function lightenColor(hex, amount) {
		const num = parseInt(hex.replace('#', ''), 16);
		const r = Math.min(255, (num >> 16) + amount);
		const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
		const b = Math.min(255, (num & 0xFF) + amount);
		return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
	}

	/** Main boss update tick. */
	function updateBoss(ds, dt) {
		if (!ds.boss || !ds.boss.alive) return;
		const boss = ds.boss;
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk || chunk.type !== "boss") return;

		if (boss.hitFlash > 0) boss.hitFlash -= dt;

		// Bob animation
		boss.bobOffset = Math.sin((performance.now() + boss.bobPhase) / 600) * 5;
		boss.sway += dt * 0.002;

		// Phase transition
		const phaseThreshold = boss.maxHp * (1 - boss.phase / boss.totalPhases);
		if (boss.hp <= phaseThreshold && boss.phase < boss.totalPhases) {
			boss.phase++;
			boss.color = lightenColor(boss.color, 30);
			if (!ds.shockwaves) ds.shockwaves = [];
			ds.shockwaves.push({
				px: boss.px, py: boss.py, radius: 0,
				maxRadius: 180, speed: 0.2, timer: 1000,
				damage: 0, hit: false
			});
		}

		// Burrowed
		if (boss.burrowed) {
			boss.burrowTimer -= dt;
			if (boss.burrowTimer <= 0) {
				boss.burrowed = false;
				boss._burrowTelegraphActive = false;
				// Use pre-determined target position (telegraph was shown)
				if (boss._burrowTargetPx !== undefined) {
					boss.px = boss._burrowTargetPx;
					boss.py = boss._burrowTargetPy;
				} else {
					boss.px = ds.playerPx + (Math.random() - 0.5) * 100;
					boss.py = ds.playerPy + (Math.random() - 0.5) * 80;
				}
				if (ds.playerInvulnerable <= 0) {
					const d = Math.hypot(boss.px - ds.playerPx, boss.py - ds.playerPy);
					if (d < 70) {
						ds.hearts = Math.max(0, ds.hearts - boss.damage);
						ds.playerInvulnerable = INVULN_DURATION;
					}
				}
				ds.attackEffect = { x: boss.px, y: boss.py, timer: 400, type: "burrow" };
			}
			return;
		}

		// Charge
		if (boss.charging) {
			boss.chargeTimer -= dt;
			const chargeSpeed = (boss.speed || 0.04) * 8 * dt;
			boss.px += boss.chargeDir.x * chargeSpeed;
			boss.py += boss.chargeDir.y * chargeSpeed;

			if (boxHitsWall(chunk.grid, boss.px, boss.py, BOSS_HALF, BOSS_HALF)) {
				boss.charging = false;
				boss.px = Math.max(BOSS_HALF * 2, Math.min(canvas.width - BOSS_HALF * 2, boss.px));
				boss.py = Math.max(BOSS_HALF * 2, Math.min(canvas.height - BOSS_HALF * 2, boss.py));
			}

			if (boss.chargeTimer <= 0) boss.charging = false;

			if (ds.playerInvulnerable <= 0 && Math.hypot(boss.px - ds.playerPx, boss.py - ds.playerPy) < BOSS_HALF + PLAYER_HALF_W) {
				ds.hearts = Math.max(0, ds.hearts - boss.damage);
				ds.playerInvulnerable = INVULN_DURATION;
			}
			return;
		}

		// Laser
		if (boss.laserActive) {
			boss.laserTimer -= dt;
			boss.laserAngle += dt * 0.002 * (boss.phase >= 2 ? 1.5 : 1);
			if (ds.playerInvulnerable <= 0) {
				const laserLen = 800;
				const lx = Math.cos(boss.laserAngle) * laserLen;
				const ly = Math.sin(boss.laserAngle) * laserLen;
				const t = Math.max(0, Math.min(1, ((ds.playerPx - boss.px) * lx + (ds.playerPy - boss.py) * ly) / (laserLen * laserLen)));
				const cx = boss.px + lx * t;
				const cy = boss.py + ly * t;
				if (Math.hypot(ds.playerPx - cx, ds.playerPy - cy) < 20) {
					ds.hearts = Math.max(0, ds.hearts - 1);
					ds.playerInvulnerable = INVULN_DURATION;
				}
			}
			if (boss.laserTimer <= 0) boss.laserActive = false;
		}

		// Vortex pull
		if (boss.vortexActive) {
			boss.vortexTimer -= dt;
			const vdx = boss.px - ds.playerPx;
			const vdy = boss.py - ds.playerPy;
			const vdist = Math.hypot(vdx, vdy) || 1;
			if (vdist < 200) {
				const pull = 0.04 * dt * (1 - vdist / 200);
				ds.playerPx += (vdx / vdist) * pull;
				ds.playerPy += (vdy / vdist) * pull;
			}
			if (boss.vortexTimer <= 0) boss.vortexActive = false;
		}

		// Reflect
		if (boss.reflecting) {
			boss.reflectTimer -= dt;
			if (boss.reflectTimer <= 0) boss.reflecting = false;
		}

		// Darkness
		if (boss.darknessTimer > 0) boss.darknessTimer -= dt;

		// Poison trail
		if (boss.poisonTrail && boss.poisonTrail.length > 0) {
			for (let i = boss.poisonTrail.length - 1; i >= 0; i--) {
				boss.poisonTrail[i].timer -= dt;
				if (boss.poisonTrail[i].timer <= 0) {
					boss.poisonTrail.splice(i, 1);
					continue;
				}
				if (ds.playerInvulnerable <= 0) {
					const pt = boss.poisonTrail[i];
					if (Math.hypot(pt.px - ds.playerPx, pt.py - ds.playerPy) < 20) {
						ds.hearts = Math.max(0, ds.hearts - 1);
						ds.playerInvulnerable = INVULN_DURATION;
					}
				}
			}
		}

		// Tentacles
		if (boss.tentacles && boss.tentacles.length > 0) {
			for (let i = boss.tentacles.length - 1; i >= 0; i--) {
				const t = boss.tentacles[i];
				t.timer -= dt;
				t.progress = Math.min(1, t.progress + dt * 0.003);
				if (t.timer <= 0) {
					boss.tentacles.splice(i, 1);
					continue;
				}
				if (ds.playerInvulnerable <= 0 && t.progress > 0.5) {
					const tx = boss.px + Math.cos(t.angle) * t.length * t.progress;
					const ty = boss.py + Math.sin(t.angle) * t.length * t.progress;
					if (Math.hypot(tx - ds.playerPx, ty - ds.playerPy) < 25) {
						ds.hearts = Math.max(0, ds.hearts - 1);
						ds.playerInvulnerable = INVULN_DURATION;
					}
				}
			}
		}

		// Boomerangs
		if (boss.boomerangs && boss.boomerangs.length > 0) {
			for (let i = boss.boomerangs.length - 1; i >= 0; i--) {
				const b = boss.boomerangs[i];
				b.timer -= dt;
				b.progress += dt * 0.001;
				const t = b.progress;
				b.px = b.startX + Math.cos(b.angle) * b.range * Math.sin(t * Math.PI);
				b.py = b.startY + Math.sin(b.angle) * b.range * Math.sin(t * Math.PI) + Math.cos(b.angle + Math.PI/2) * b.curve * Math.sin(t * Math.PI);
				if (ds.playerInvulnerable <= 0 && Math.hypot(b.px - ds.playerPx, b.py - ds.playerPy) < 20) {
					ds.hearts = Math.max(0, ds.hearts - boss.damage);
					ds.playerInvulnerable = INVULN_DURATION;
				}
				if (b.timer <= 0) {
					boss.boomerangs.splice(i, 1);
				}
			}
		}

		// Split bosses
		if (boss.splitBosses && boss.splitBosses.length > 0) {
			for (let i = boss.splitBosses.length - 1; i >= 0; i--) {
				const sb = boss.splitBosses[i];
				if (!sb.alive) { boss.splitBosses.splice(i, 1); continue; }
				const sdx = ds.playerPx - sb.px;
				const sdy = ds.playerPy - sb.py;
				const sdist = Math.hypot(sdx, sdy) || 1;
				sb.px += (sdx / sdist) * 0.04 * dt;
				sb.py += (sdy / sdist) * 0.04 * dt;
				if (ds.playerInvulnerable <= 0 && Math.hypot(sb.px - ds.playerPx, sb.py - ds.playerPy) < 15) {
					ds.hearts = Math.max(0, ds.hearts - 1);
					ds.playerInvulnerable = INVULN_DURATION;
				}
				if (ds.projectiles) {
					for (let j = ds.projectiles.length - 1; j >= 0; j--) {
						const p = ds.projectiles[j];
						if (Math.hypot(p.px - sb.px, p.py - sb.py) < 12) {
							sb.hp -= p.damage;
							ds.projectiles.splice(j, 1);
							if (sb.hp <= 0) { sb.alive = false; ds.score += 10; }
							break;
						}
					}
				}
			}
		}

		// Normal movement
		if (!boss.laserActive) {
			const dx = ds.playerPx - boss.px;
			const dy = ds.playerPy - boss.py;
			const dist = Math.hypot(dx, dy);
			if (dist > 60) {
				const moveSpeed = (boss.speed || 0.04) * (boss.phase >= 2 ? 1.4 : 1) * dt;
				boss.targetPx = boss.px + (dx / dist) * moveSpeed;
				boss.targetPy = boss.py + (dy / dist) * moveSpeed;
				if (!boxHitsWall(chunk.grid, boss.targetPx, boss.targetPy, BOSS_HALF, BOSS_HALF)) {
					boss.px = boss.targetPx;
					boss.py = boss.targetPy;
				}
			}

			if (boss.attacks.includes("poison_trail") && Math.random() < dt * 0.003) {
				if (!boss.poisonTrail) boss.poisonTrail = [];
				boss.poisonTrail.push({ px: boss.px, py: boss.py, timer: 4000 });
			}
		}

		// Boss ↔ player contact damage
		if (ds.playerInvulnerable <= 0 && Math.hypot(boss.px - ds.playerPx, boss.py - ds.playerPy) < BOSS_HALF + PLAYER_HALF_W) {
			ds.hearts = Math.max(0, ds.hearts - 1);
			ds.playerInvulnerable = INVULN_DURATION;
		}

		// Boss attack timer
		bossAttackTimer -= dt;
		if (bossAttackTimer <= 0) {
			const interval = BOSS_ATTACK_INTERVAL * (boss.phase >= 2 ? 0.65 : 1) * (boss.phase >= 3 ? 0.5 : 1);
			bossAttackTimer = interval;
			executeBossAttack(ds, boss);
		}

		// Boss projectiles
		updateBossProjectiles(ds, boss, dt, chunk);

		// Player projectiles hitting boss
		if (ds.projectiles) {
			for (let i = ds.projectiles.length - 1; i >= 0; i--) {
				const p = ds.projectiles[i];
				if (Math.hypot(p.px - boss.px, p.py - boss.py) < PROJECTILE_RADIUS + BOSS_HALF) {
					if (boss.reflecting) {
						p.vx = -p.vx * 1.2;
						p.vy = -p.vy * 1.2;
						p.life = 1500;
						continue;
					}
					if (boss.shieldOrbs > 0) {
						boss.shieldOrbs--;
						ds.projectiles.splice(i, 1);
						continue;
					}

					boss.hp -= p.damage;
					boss.hitFlash = 200;
					ds.attackEffect = { x: boss.px, y: boss.py, timer: 200 };
					ds.projectiles.splice(i, 1);

					if (boss.hp <= 0) {
						boss.alive = false;
						onBossDefeated(ds, boss);
					}
				}
			}
		}
	}

	/** Execute the next boss attack from its rotation list. */
	function executeBossAttack(ds, boss) {
		const dx = ds.playerPx - boss.px;
		const dy = ds.playerPy - boss.py;
		const dist = Math.hypot(dx, dy) || 1;
		const baseAngle = Math.atan2(dy, dx);

		const attackList = boss.attacks || ["charge"];
		const attack = attackList[boss.attackIndex % attackList.length];
		boss.attackIndex++;

		switch (attack) {
			case "charge":
				boss.charging = true;
				boss.chargeDir = { x: dx / dist, y: dy / dist };
				boss.chargeTimer = 800;
				break;

			case "spawn_adds": {
				const count = boss.phase >= 2 ? 4 : 2;
				if (!ds.roomEnemies) ds.roomEnemies = [];
				const maxAliveEnemies = Math.max(12, Number.isFinite(ds.maxAliveEnemies) ? Math.floor(ds.maxAliveEnemies) : 12);
				const aliveEnemyCount = () => ds.roomEnemies.reduce((sum, enemy) => sum + (enemy && enemy.alive !== false ? 1 : 0), 0);

				// Boss 2 FIX: Use active AI instead of drift
				// addAI from boss definition: [kamikaze, kamikaze, flee] — rotate
				const bossDef = dungeonData.bossDefinitions?.[String(boss.floor)] || {};
				const addAIs = bossDef.addAI || ["drift"];
				const formationDelay = bossDef.addFormationDelay || 5000;

				for (let i = 0; i < count; i++) {
					if (aliveEnemyCount() >= maxAliveEnemies) break;
					const angle = (i / count) * Math.PI * 2;
					const assignedAI = addAIs[i % addAIs.length] || "drift";
					const addEnemy = {
						px: boss.px + Math.cos(angle) * 60,
						py: boss.py + Math.sin(angle) * 60,
						targetPx: boss.px + Math.cos(angle) * 60,
						targetPy: boss.py + Math.sin(angle) * 60,
						type: "qualle", hp: 2, maxHp: 2,
						alive: true, color: "#88ddff",
						speed: 0.04, damage: 1, ai: assignedAI,
						sway: Math.random() * 6.28, bobPhase: Math.random() * 5000,
						bobOffset: 0, hitFlash: 0, scale: 0.5,
						hidden: false, exploding: false, explodeTimer: 0,
						ambushCooldown: 0, shootTimer: 3000, shootInterval: 3000,
						inkTimer: 5000, inkInterval: 5000, shockwaveTimer: 4000,
						shockwaveInterval: 4000, frontalArmor: 0, projectileSpeed: 0.2,
						enemyProjectiles: [], inkCloud: null, shockwave: null,
						_formationSwitch: formationDelay
					};
					ds.roomEnemies.push(addEnemy);

					// After formationDelay ms, switch surviving adds to formation AI
					if (formationDelay > 0) {
						setTimeout(() => {
							if (addEnemy.alive) {
								addEnemy.ai = "formation";
							}
						}, formationDelay);
					}
				}
				break;
			}

			case "burrow": {
				boss.burrowed = true;
				// Boss 3 FIX: Use longer telegraph (burrowTelegraphMs) for fair warning
				const bossDef = dungeonData.bossDefinitions?.[String(boss.floor)] || {};
				const burrowTime = bossDef.burrowTelegraphMs || 1500;
				boss.burrowTimer = burrowTime;
				// Store telegraph info for renderer
				boss._burrowTelegraphActive = true;
				boss._burrowTargetPx = ds.playerPx + (Math.random() - 0.5) * 80;
				boss._burrowTargetPy = ds.playerPy + (Math.random() - 0.5) * 60;
				break;
			}

			case "salve": {
				const count = boss.phase >= 2 ? 5 : 3;
				// Boss 3 FIX: Use boss-specific salve settings if available
				const bossDef = dungeonData.bossDefinitions?.[String(boss.floor)] || {};
				const salveInterval = bossDef.salveInterval || 200;
				const salveSpeed = bossDef.salveProjectileSpeed || BOSS_PROJECTILE_SPEED * 1.3;
				const telegraphMs = bossDef.telegraphMs || 0;

				// Telegraph delay before first projectile
				const startDelay = telegraphMs > 0 ? telegraphMs : 0;
				for (let i = 0; i < count; i++) {
					setTimeout(() => {
						if (!boss.alive) return;
						const ndx = ds.playerPx - boss.px;
						const ndy = ds.playerPy - boss.py;
						const ndist = Math.hypot(ndx, ndy) || 1;
						boss.projectiles.push({
							px: boss.px, py: boss.py,
							vx: (ndx / ndist) * salveSpeed,
							vy: (ndy / ndist) * salveSpeed,
							life: 1500, damage: boss.damage
						});
					}, startDelay + i * salveInterval);
				}
				break;
			}

			case "spread": {
				const count = boss.phase >= 2 ? 7 : 4;
				const arc = boss.phase >= 2 ? Math.PI * 0.8 : Math.PI * 0.5;
				for (let i = 0; i < count; i++) {
					const a = baseAngle - arc / 2 + (arc / (count - 1)) * i;
					boss.projectiles.push({
						px: boss.px, py: boss.py,
						vx: Math.cos(a) * BOSS_PROJECTILE_SPEED,
						vy: Math.sin(a) * BOSS_PROJECTILE_SPEED,
						life: 1200, damage: boss.damage
					});
				}
				break;
			}

			case "homing": {
				const count = boss.phase >= 2 ? 3 : 1;
				for (let i = 0; i < count; i++) {
					const a = baseAngle + (i - 1) * 0.5;
					boss.projectiles.push({
						px: boss.px, py: boss.py,
						vx: Math.cos(a) * BOSS_PROJECTILE_SPEED * 0.7,
						vy: Math.sin(a) * BOSS_PROJECTILE_SPEED * 0.7,
						life: 3000, damage: boss.damage,
						homing: true, turnSpeed: 0.003
					});
				}
				break;
			}

			case "wallbounce": {
				const count = boss.phase >= 2 ? 6 : 3;
				for (let i = 0; i < count; i++) {
					const a = baseAngle + (i / count) * Math.PI * 0.6 - Math.PI * 0.3;
					boss.projectiles.push({
						px: boss.px, py: boss.py,
						vx: Math.cos(a) * BOSS_PROJECTILE_SPEED,
						vy: Math.sin(a) * BOSS_PROJECTILE_SPEED,
						life: 3000, damage: boss.damage,
						bouncy: true, bounces: 3
					});
				}
				break;
			}

			case "fusion": {
				boss.charging = true;
				boss.chargeDir = { x: dx / dist, y: dy / dist };
				boss.chargeTimer = 500;
				setTimeout(() => {
					if (!boss.alive) return;
					const count = boss.phase >= 2 ? 14 : 8;
					for (let i = 0; i < count; i++) {
						const a = (i / count) * Math.PI * 2;
						boss.projectiles.push({
							px: boss.px, py: boss.py,
							vx: Math.cos(a) * BOSS_PROJECTILE_SPEED,
							vy: Math.sin(a) * BOSS_PROJECTILE_SPEED,
							life: 1500, damage: boss.damage
						});
					}
				}, 600);
				break;
			}

			case "darkness":
				boss.darknessTimer = boss.phase >= 2 ? 5000 : 3000;
				break;

			case "poison_trail": {
				// Store original speed to prevent drift from overlapping timeouts
				if (!boss._baseSpeed) boss._baseSpeed = boss.speed || 0.04;
				boss.speed = boss._baseSpeed * 1.5;
				setTimeout(() => { if (boss.alive) boss.speed = boss._baseSpeed; }, 3000);
				break;
			}

			case "ring": {
				const count = boss.phase >= 2 ? 16 : 10;
				for (let i = 0; i < count; i++) {
					const a = (i / count) * Math.PI * 2;
					boss.projectiles.push({
						px: boss.px, py: boss.py,
						vx: Math.cos(a) * BOSS_PROJECTILE_SPEED,
						vy: Math.sin(a) * BOSS_PROJECTILE_SPEED,
						life: 1500, damage: boss.damage
					});
				}
				break;
			}

			case "shield_orbs":
				boss.shieldOrbs = boss.phase >= 2 ? 5 : 3;
				break;

			case "spawn_walls": {
				if (!boss.spawnedWalls) boss.spawnedWalls = [];
				const count = boss.phase >= 2 ? 4 : 2;
				for (let i = 0; i < count; i++) {
					boss.spawnedWalls.push({
						px: 100 + Math.random() * (canvas.width - 200),
						py: 100 + Math.random() * (canvas.height - 200),
						timer: 5000, width: 40, height: 15
					});
				}
				break;
			}

			case "rain": {
				const count = boss.phase >= 2 ? 12 : 6;
				for (let i = 0; i < count; i++) {
					setTimeout(() => {
						if (!boss.alive) return;
						const rx = 40 + Math.random() * (canvas.width - 80);
						boss.projectiles.push({
							px: rx, py: 30,
							vx: 0, vy: BOSS_PROJECTILE_SPEED * 1.5,
							life: 2000, damage: boss.damage,
							type: "rain"
						});
					}, i * 150);
				}
				break;
			}

			case "reflect":
				boss.reflecting = true;
				boss.reflectTimer = boss.phase >= 2 ? 3000 : 2000;
				break;

			case "laser":
				boss.laserActive = true;
				boss.laserAngle = baseAngle;
				boss.laserTimer = boss.phase >= 2 ? 3000 : 2000;
				break;

			case "phaseshift":
				boss.px = 80 + Math.random() * (canvas.width - 160);
				boss.py = 80 + Math.random() * (canvas.height - 160);
				{
					const count = 8;
					for (let i = 0; i < count; i++) {
						const a = (i / count) * Math.PI * 2;
						boss.projectiles.push({
							px: boss.px, py: boss.py,
							vx: Math.cos(a) * BOSS_PROJECTILE_SPEED * 0.8,
							vy: Math.sin(a) * BOSS_PROJECTILE_SPEED * 0.8,
							life: 1200, damage: boss.damage
						});
					}
				}
				break;

			case "shockwave":
				if (!ds.shockwaves) ds.shockwaves = [];
				ds.shockwaves.push({
					px: boss.px, py: boss.py, radius: 0,
					maxRadius: boss.phase >= 2 ? 250 : 180,
					speed: 0.18, timer: 1200,
					damage: boss.damage, hit: false
				});
				break;

			case "split": {
				if (!boss.splitBosses) boss.splitBosses = [];
				const count = boss.phase >= 2 ? 4 : 2;
				for (let i = 0; i < count; i++) {
					const angle = (i / count) * Math.PI * 2;
					boss.splitBosses.push({
						px: boss.px + Math.cos(angle) * 50,
						py: boss.py + Math.sin(angle) * 50,
						hp: 5, alive: true, color: boss.color,
						scale: 0.6
					});
				}
				break;
			}

			case "tentacle": {
				if (!boss.tentacles) boss.tentacles = [];
				const count = boss.phase >= 2 ? 8 : 5;
				for (let i = 0; i < count; i++) {
					const a = (i / count) * Math.PI * 2;
					boss.tentacles.push({
						angle: a, length: 150 + Math.random() * 80,
						timer: 2000, progress: 0
					});
				}
				break;
			}

			case "ink": {
				if (!ds.inkClouds) ds.inkClouds = [];
				const count = boss.phase >= 2 ? 4 : 2;
				for (let i = 0; i < count; i++) {
					ds.inkClouds.push({
						px: ds.playerPx + (Math.random() - 0.5) * 200,
						py: ds.playerPy + (Math.random() - 0.5) * 150,
						radius: 60, timer: 4000, maxTimer: 4000
					});
				}
				break;
			}

			case "vortex":
				boss.vortexActive = true;
				boss.vortexTimer = boss.phase >= 2 ? 3000 : 2000;
				break;

			case "boomerang": {
				if (!boss.boomerangs) boss.boomerangs = [];
				const count = boss.phase >= 2 ? 4 : 2;
				for (let i = 0; i < count; i++) {
					const a = baseAngle + (i - (count-1)/2) * 0.5;
					boss.boomerangs.push({
						startX: boss.px, startY: boss.py,
						px: boss.px, py: boss.py,
						angle: a, range: 200 + Math.random() * 100,
						curve: (Math.random() - 0.5) * 150,
						timer: 2000, progress: 0
					});
				}
				break;
			}

			case "enrage":
				boss.enraged = true;
				boss.speed = (boss.speed || 0.04) * 2;
				boss.damage += 1;
				boss.color = "#ff2200";
				break;

			case "claw_slam": {
				// Boss 1: Telegraphed ground-pound AoE in front 
				const slamRange = 100;
				const slamAngle = baseAngle;
				if (!ds.shockwaves) ds.shockwaves = [];
				const slamPx = boss.px + Math.cos(slamAngle) * 50;
				const slamPy = boss.py + Math.sin(slamAngle) * 50;
				// Telegraph delay via boss definition
				const slamTelegraph = (dungeonData.bossDefinitions?.[String(boss.floor)] || {}).telegraphMs || 600;
				boss.clawSlamTelegraph = { px: slamPx, py: slamPy, radius: slamRange, timer: slamTelegraph };
				setTimeout(() => {
					if (!boss.alive) return;
					boss.clawSlamTelegraph = null;
					ds.shockwaves.push({
						px: slamPx, py: slamPy, radius: 0,
						maxRadius: slamRange,
						speed: 0.3, timer: 600,
						damage: boss.damage + 1, hit: false
					});
				}, slamTelegraph);
				break;
			}

			case "tentacle_sweep": {
				// Boss 2: Sweep tentacles in an arc around the boss
				if (!boss.tentacles) boss.tentacles = [];
				const sweepCount = boss.phase >= 2 ? 10 : 6;
				for (let i = 0; i < sweepCount; i++) {
					const a = baseAngle - Math.PI * 0.4 + (i / sweepCount) * Math.PI * 0.8;
					boss.tentacles.push({
						angle: a, length: 120 + Math.random() * 60,
						timer: 1500, progress: 0
					});
				}
				break;
			}

			case "ink_pulse": {
				// Boss 2: Ink cloud explosion on boss position + smaller clouds near player
				if (!ds.inkClouds) ds.inkClouds = [];
				ds.inkClouds.push({
					px: boss.px, py: boss.py,
					radius: boss.phase >= 2 ? 100 : 70,
					timer: 3500, maxTimer: 3500
				});
				const pulseCount = boss.phase >= 2 ? 3 : 1;
				for (let i = 0; i < pulseCount; i++) {
					ds.inkClouds.push({
						px: ds.playerPx + (Math.random() - 0.5) * 160,
						py: ds.playerPy + (Math.random() - 0.5) * 120,
						radius: 50, timer: 3000, maxTimer: 3000
					});
				}
				break;
			}

			case "coral_barrier": {
				// Boss 4: Spawns destructible coral walls 
				if (!boss.spawnedWalls) boss.spawnedWalls = [];
				const wallCount = boss.phase >= 2 ? 5 : 3;
				for (let i = 0; i < wallCount; i++) {
					boss.spawnedWalls.push({
						px: 80 + Math.random() * (canvas.width - 160),
						py: 80 + Math.random() * (canvas.height - 160),
						timer: 8000, width: 50, height: 20
					});
				}
				break;
			}

			case "lure_pull": {
				// Boss 7: Anglerfisch lure — creates pull zone toward boss
				boss.vortexActive = true;
				boss.vortexTimer = boss.phase >= 2 ? 2500 : 1800;
				// Also fire homing light orbs
				const lureCount = boss.phase >= 2 ? 3 : 2;
				for (let i = 0; i < lureCount; i++) {
					const a = baseAngle + (i - (lureCount - 1) / 2) * 0.6;
					boss.projectiles.push({
						px: boss.px, py: boss.py,
						vx: Math.cos(a) * BOSS_PROJECTILE_SPEED * 0.5,
						vy: Math.sin(a) * BOSS_PROJECTILE_SPEED * 0.5,
						life: 3500, damage: boss.damage,
						homing: true, turnSpeed: 0.002
					});
				}
				break;
			}

			case "segment_slam": {
				// Boss 8: Wurm segment body-slam — fast charge + ring shockwave at end
				boss.charging = true;
				boss.chargeDir = { x: dx / dist, y: dy / dist };
				boss.chargeTimer = 600;
				setTimeout(() => {
					if (!boss.alive) return;
					if (!ds.shockwaves) ds.shockwaves = [];
					ds.shockwaves.push({
						px: boss.px, py: boss.py, radius: 0,
						maxRadius: boss.phase >= 2 ? 180 : 120,
						speed: 0.22, timer: 800,
						damage: boss.damage, hit: false
					});
				}, 650);
				break;
			}
		}
	}

	/** Update boss projectiles (homing, bouncing, wall collision). */
	function updateBossProjectiles(ds, boss, dt, chunk) {
		for (let i = boss.projectiles.length - 1; i >= 0; i--) {
			const p = boss.projectiles[i];

			// Homing
			if (p.homing) {
				const hdx = ds.playerPx - p.px;
				const hdy = ds.playerPy - p.py;
				const targetAngle = Math.atan2(hdy, hdx);
				const curAngle = Math.atan2(p.vy, p.vx);
				let diff = targetAngle - curAngle;
				while (diff > Math.PI) diff -= Math.PI * 2;
				while (diff < -Math.PI) diff += Math.PI * 2;
				const turn = Math.min(Math.abs(diff), (p.turnSpeed || 0.003) * dt) * Math.sign(diff);
				const newAngle = curAngle + turn;
				const speed = Math.hypot(p.vx, p.vy);
				p.vx = Math.cos(newAngle) * speed;
				p.vy = Math.sin(newAngle) * speed;
			}

			p.px += p.vx * dt;
			p.py += p.vy * dt;
			p.life -= dt;

			const { tw: tilew, th: tileh } = tileSize();
			const tileX = Math.floor(p.px / tilew);
			const tileY = Math.floor(p.py / tileh);
			const hitWall = !walkable(chunk.grid, tileX, tileY);

			// Bouncy
			if (hitWall && p.bouncy && p.bounces > 0) {
				p.bounces--;
				const prevTileX = Math.floor((p.px - p.vx * dt) / tilew);
				const prevTileY = Math.floor((p.py - p.vy * dt) / tileh);
				if (prevTileX !== tileX) p.vx = -p.vx;
				if (prevTileY !== tileY) p.vy = -p.vy;
				p.px += p.vx * dt * 2;
				p.py += p.vy * dt * 2;
				continue;
			}

			// Player hit
			let hitPlayer = false;
			if (ds.playerInvulnerable <= 0 && Math.hypot(p.px - ds.playerPx, p.py - ds.playerPy) < PROJECTILE_RADIUS + PLAYER_HALF_W) {
				ds.hearts = Math.max(0, ds.hearts - p.damage);
				ds.playerInvulnerable = INVULN_DURATION;
				hitPlayer = true;
			}

			if ((hitWall && !p.bouncy) || hitPlayer || p.life <= 0) {
				boss.projectiles.splice(i, 1);
			}
		}
	}

	/** Handle boss death — rewards, loot, helper card drops. */
	function onBossDefeated(ds, boss) {
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (chunk) chunk.cleared = true;

		const diff = getFloorDifficulty(ds.currentFloor.floor, ds.endlessScaling);
		ds.score += 100;
		ds.coins += diff.coinReward * 3;
		ds.clearBanner = 2000;

		const { tw, th } = tileSize();
		if (!ds.roomPickups) ds.roomPickups = [];
		for (let i = 0; i < 5; i++) {
			ds.roomPickups.push({
				px: boss.px + (Math.random() - 0.5) * tw * 6,
				py: boss.py + (Math.random() - 0.5) * th * 4,
				type: "coin", value: Math.floor(diff.coinReward / 2),
				collected: false
			});
		}
		ds.roomPickups.push({
			px: boss.px, py: boss.py,
			type: "heal", collected: false
		});

		// Helper card drop
		if (helpersSystem) {
			const floor = ds.currentFloor.floor || 1;
			const dropChance = Math.min(0.6, 0.3 + (floor - 1) * 0.02);
			if (Math.random() < dropChance) {
				const allCardIds = Object.keys(helpersSystem.getHelpersData().cards);
				const helpersDataRef = helpersSystem.getHelpersData();
				const weights = allCardIds.map(id => {
					const card = helpersDataRef.cards[id];
					if (card.rarity === 'legendary') return floor >= 10 ? 1 : 0;
					if (card.rarity === 'rare') return floor >= 5 ? 3 : 1;
					return 5;
				});
				const totalWeight = weights.reduce((s, w) => s + w, 0);
				let roll = Math.random() * totalWeight;
				let chosenId = allCardIds[0];
				for (let i = 0; i < allCardIds.length; i++) {
					roll -= weights[i];
					if (roll <= 0) { chosenId = allCardIds[i]; break; }
				}
				const result = helpersSystem.addCard(chosenId);
				if (result.success) {
					const cardData = helpersSystem.getCardData(chosenId);
					const label = result.isNew ? '✨ New Helper!' : '🌟 Duplicate!';
					ds.clearBannerText = `${label} ${cardData?.name || chosenId}`;
					ds.clearBanner = 3000;
					console.log(`[Dungeon] Helper card dropped: ${chosenId} (${result.isNew ? 'NEW' : 'DUPLICATE'})`);
				}
			}
		}
	}

	return {
		spawnBoss,
		updateBoss,
		resetBossTimer,
		setBossTimer
	};
}
