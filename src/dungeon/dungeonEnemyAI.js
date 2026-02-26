// ============================================================
// DUNGEON ENEMY AI — Individual enemy behaviour per type
// ============================================================
"use strict";

import { ENEMY_HALF, INVULN_DURATION } from './dungeonConstants.js';
import { getFloorDifficulty } from './dungeonGenerator.js';
import dungeonData from '../data/dungeon.json';
import { applyStatusEffect } from './statusEffects.js';

/**
 * Creates enemy AI functions bound to tile helpers.
 * @param {{ boxHitsWall: Function }} tiles
 */
export function createEnemyAI(tiles) {
	const { boxHitsWall } = tiles;

	function applyFlankPattern(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;
		const sideX = -dy / dist;
		const sideY = dx / dist;
		const sideSign = e._flankSign || (Math.random() < 0.5 ? -1 : 1);
		e._flankSign = sideSign;
		const speed = (e.speed || 0.04) * dt * 0.7;
		const nx = e.px + sideX * sideSign * speed;
		const ny = e.py + sideY * sideSign * speed;
		if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
			e.px = nx;
			e.py = ny;
			e.targetPx = nx;
			e.targetPy = ny;
		}
	}

	function applyKitePattern(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;
		if (dist < 180) {
			const speed = (e.speed || 0.04) * dt * 0.8;
			const nx = e.px - (dx / dist) * speed;
			const ny = e.py - (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx;
				e.py = ny;
				e.targetPx = nx;
				e.targetPy = ny;
			}
		}
	}

	// === NEW AI PATTERN: predictive — aims at player position + velocity ===
	function updatePredictiveAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		// Keep distance (100-200px)
		if (dist < 100) {
			const speed = (e.speed || 0.04) * dt;
			const nx = e.px - (dx / dist) * speed;
			const ny = e.py - (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		} else if (dist > 200) {
			const speed = (e.speed || 0.04) * dt * 0.5;
			const nx = e.px + (dx / dist) * speed;
			const ny = e.py + (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		}

		// Predictive shooting — lead the target
		e.shootTimer -= dt;
		if (e.shootTimer <= 0) {
			e.shootTimer = e.shootInterval || 2500;
			// Estimate where player will be in 500ms
			const playerVx = (ds._prevPlayerPx !== undefined) ? (ds.playerPx - ds._prevPlayerPx) / Math.max(1, dt) : 0;
			const playerVy = (ds._prevPlayerPy !== undefined) ? (ds.playerPy - ds._prevPlayerPy) / Math.max(1, dt) : 0;
			const leadTime = 500; // ms
			const predX = ds.playerPx + playerVx * leadTime;
			const predY = ds.playerPy + playerVy * leadTime;
			const pdx = predX - e.px;
			const pdy = predY - e.py;
			const pdist = Math.hypot(pdx, pdy) || 1;
			if (!ds.enemyProjectiles) ds.enemyProjectiles = [];
			ds.enemyProjectiles.push({
				px: e.px, py: e.py,
				vx: (pdx / pdist) * (e.projectileSpeed || 0.25),
				vy: (pdy / pdist) * (e.projectileSpeed || 0.25),
				life: 2000, damage: e.damage || 1,
				color: e.color || "#886666",
				type: "predictive",
				onHitEffect: e.onHitEffect || null
			});
		}
	}

	// === NEW AI PATTERN: formation — coordinate positions with same-type allies ===
	function updateFormationAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		// Find allies of same type
		const allies = (ds.roomEnemies || []).filter(
			a => a.alive && a !== e && a.type === e.type
		);

		if (allies.length >= 2) {
			// Formation: surround player — assign angle based on stable index among all same-type
			const allOfType = (ds.roomEnemies || []).filter(
				a => a.alive && a.type === e.type
			);
			const idx = allOfType.indexOf(e);
			const angleStep = (Math.PI * 2) / allOfType.length;
			const targetAngle = angleStep * idx + (performance.now() * 0.0003); // slow rotation
			const formDist = 100 + Math.sin(performance.now() * 0.001) * 20;
			const targetX = ds.playerPx + Math.cos(targetAngle) * formDist;
			const targetY = ds.playerPy + Math.sin(targetAngle) * formDist;

			const speed = (e.speed || 0.04) * dt;
			const tdx = targetX - e.px;
			const tdy = targetY - e.py;
			const tdist = Math.hypot(tdx, tdy) || 1;
			const nx = e.px + (tdx / tdist) * Math.min(speed, tdist);
			const ny = e.py + (tdy / tdist) * Math.min(speed, tdist);
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		} else {
			// Fallback: drift toward player
			const speed = (e.speed || 0.04) * dt;
			const nx = e.px + (dx / dist) * speed;
			const ny = e.py + (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		}
	}

	// === NEW AI PATTERN: ambush_static — completely still, then dash when player is close ===
	function updateAmbushStaticAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		if (e._ambushStaticCooldown > 0) {
			e._ambushStaticCooldown -= dt;
			return;
		}

		// Wait completely still until player approaches
		if (!e._ambushTriggered) {
			if (dist < 60) {
				e._ambushTriggered = true;
				e._ambushTelegraph = 400; // telegraph: body twitches
				e._dashTarget = { x: ds.playerPx, y: ds.playerPy };
			}
			return;
		}

		// Telegraph phase
		if (e._ambushTelegraph > 0) {
			e._ambushTelegraph -= dt;
			e.scale = 1.0 + Math.sin(e._ambushTelegraph * 0.05) * 0.15; // twitch
			if (e._ambushTelegraph <= 0) {
				e._ambushDashing = true;
				e._ambushDashTimer = 400;
			}
			return;
		}

		// Dash phase
		if (e._ambushDashing) {
			e._ambushDashTimer -= dt;
			const dashSpeed = 0.35 * dt;
			const tdx = e._dashTarget.x - e.px;
			const tdy = e._dashTarget.y - e.py;
			const tdist = Math.hypot(tdx, tdy) || 1;
			const nx = e.px + (tdx / tdist) * dashSpeed;
			const ny = e.py + (tdy / tdist) * dashSpeed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
			}
			e.targetPx = e.px; e.targetPy = e.py;

			if (e._ambushDashTimer <= 0 || Math.hypot(e._dashTarget.x - e.px, e._dashTarget.y - e.py) < 10) {
				e._ambushDashing = false;
				e._ambushTriggered = false;
				e._ambushStaticCooldown = 2000;
				e.scale = 1.0;
			}
			return;
		}
	}

	// === NEW AI PATTERN: berserker — unstoppable rush, no avoidance ===
	function updateBerserkerAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		const speed = (e.speed || 0.05) * 2 * dt; // 2x speed
		const nx = e.px + (dx / dist) * speed;
		const ny = e.py + (dy / dist) * speed;
		if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
			e.px = nx; e.py = ny;
			e.targetPx = nx; e.targetPy = ny;
		} else {
			// Berserker pushes into wall slightly trying to get past
			const slideX = e.px + (dx / dist) * speed * 0.3;
			const slideY = e.py + (dy / dist) * speed * 0.3;
			if (!boxHitsWall(chunk.grid, slideX, e.py, ENEMY_HALF, ENEMY_HALF)) {
				e.px = slideX; e.targetPx = slideX;
			} else if (!boxHitsWall(chunk.grid, e.px, slideY, ENEMY_HALF, ENEMY_HALF)) {
				e.py = slideY; e.targetPy = slideY;
			}
		}
	}

	// === NEW AI PATTERN: patrol_hunt — patrols, then chases when player is near ===
	function updatePatrolHuntAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		// Initialize patrol route
		if (!e._patrolPoints) {
			e._patrolPoints = [
				{ x: e.px + (Math.random() - 0.5) * 150, y: e.py + (Math.random() - 0.5) * 100 },
				{ x: e.px + (Math.random() - 0.5) * 150, y: e.py + (Math.random() - 0.5) * 100 },
				{ x: e.px, y: e.py }
			];
			e._patrolIdx = 0;
			e._hunting = false;
		}

		// Switch to hunt mode when player is close
		if (dist < 200 && !e._hunting) {
			e._hunting = true;
		}
		if (dist > 280 && e._hunting) {
			e._hunting = false;
		}

		if (e._hunting) {
			// Chase player
			const speed = (e.speed || 0.04) * dt * 1.3;
			const nx = e.px + (dx / dist) * speed;
			const ny = e.py + (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		} else {
			// Patrol
			const pt = e._patrolPoints[e._patrolIdx];
			const pdx = pt.x - e.px;
			const pdy = pt.y - e.py;
			const pdist = Math.hypot(pdx, pdy) || 1;
			const speed = (e.speed || 0.04) * dt * 0.6;
			const nx = e.px + (pdx / pdist) * Math.min(speed, pdist);
			const ny = e.py + (pdy / pdist) * Math.min(speed, pdist);
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
			if (pdist < 10) {
				e._patrolIdx = (e._patrolIdx + 1) % e._patrolPoints.length;
			}
		}
	}

	// === NEW AI PATTERN: coordinated_ranged — turrets fire in alternating sequence ===
	function updateCoordinatedRangedAI(e, ds, dt) {
		// Find all coordinated_ranged allies in the room
		const allies = (ds.roomEnemies || []).filter(
			a => a.alive && (a.ai === 'coordinated_ranged' || a.ai === 'turret')
		);
		const idx = allies.indexOf(e);
		const count = Math.max(1, allies.length);
		const offset = (idx / count) * (e.shootInterval || 3000);

		if (!e._coordInitialized) {
			e._coordInitialized = true;
			e.shootTimer = offset; // stagger first shot
		}

		e.shootTimer -= dt;
		if (e.shootTimer <= 0) {
			e.shootTimer = e.shootInterval || 3000;
			const dx = ds.playerPx - e.px;
			const dy = ds.playerPy - e.py;
			const dist = Math.hypot(dx, dy) || 1;
			if (!ds.enemyProjectiles) ds.enemyProjectiles = [];
			ds.enemyProjectiles.push({
				px: e.px, py: e.py,
				vx: (dx / dist) * (e.projectileSpeed || 0.2),
				vy: (dy / dist) * (e.projectileSpeed || 0.2),
				life: 2000, damage: e.damage || 1,
				color: e.color || "#aa44aa",
				type: "coordinated",
				onHitEffect: e.onHitEffect || null
			});
		}
	}

	// === NEW AI PATTERN: leash — max distance from spawn, defends zone ===
	function updateLeashAI(e, ds, dt, chunk) {
		if (!e._spawnPx) { e._spawnPx = e.px; e._spawnPy = e.py; }

		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;
		const distFromSpawn = Math.hypot(e.px - e._spawnPx, e.py - e._spawnPy);

		const maxLeash = 200;

		if (distFromSpawn > maxLeash) {
			// Return to spawn
			const rdx = e._spawnPx - e.px;
			const rdy = e._spawnPy - e.py;
			const rdist = Math.hypot(rdx, rdy) || 1;
			const speed = (e.speed || 0.04) * dt * 1.5;
			const nx = e.px + (rdx / rdist) * speed;
			const ny = e.py + (rdy / rdist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		} else if (dist < maxLeash) {
			// Chase within leash
			const speed = (e.speed || 0.04) * dt;
			const nx = e.px + (dx / dist) * speed;
			const ny = e.py + (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
				e.targetPx = nx; e.targetPy = ny;
			}
		}

		// Shoot if turret-capable
		if (e.shootInterval) {
			e.shootTimer -= dt;
			if (e.shootTimer <= 0 && dist < maxLeash + 50) {
				e.shootTimer = e.shootInterval;
				if (!ds.enemyProjectiles) ds.enemyProjectiles = [];
				ds.enemyProjectiles.push({
					px: e.px, py: e.py,
					vx: (dx / dist) * (e.projectileSpeed || 0.2),
					vy: (dy / dist) * (e.projectileSpeed || 0.2),
					life: 2000, damage: e.damage || 1,
					color: e.color || "#993300",
					type: "leash",
					onHitEffect: e.onHitEffect || null
				});
			}
		}
	}

	// --- Qualle: Random drifting, contact damage ---
	function updateDriftAI(e, ds, dt, chunk) {
		const lerp = Math.min(1, dt * 0.004);
		e.px += (e.targetPx - e.px) * lerp;
		e.py += (e.targetPy - e.py) * lerp;

		if (Math.random() < dt * 0.001) {
			const angle = Math.random() * Math.PI * 2;
			const step = (e.speed || 0.03) * 400;
			const nx = e.px + Math.cos(angle) * step;
			const ny = e.py + Math.sin(angle) * step;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.targetPx = nx; e.targetPy = ny;
			}
		}
	}

	// --- Steinkrabbe: Ground-level, horizontal snapping ---
	function updateGroundAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy);

		const lerp = Math.min(1, dt * 0.005);
		e.px += (e.targetPx - e.px) * lerp;
		e.py += (e.targetPy - e.py) * lerp * 0.3;

		if (dist < 100 && !e._snapping) {
			e._snapping = true;
			e._snapTimer = 300;
			e.targetPx = ds.playerPx;
			e.targetPy = e.py;
		}
		if (e._snapping) {
			e._snapTimer -= dt;
			const snapLerp = Math.min(1, dt * 0.015);
			e.px += (e.targetPx - e.px) * snapLerp;
			if (e._snapTimer <= 0) {
				e._snapping = false;
			}
		} else if (Math.random() < dt * 0.0015) {
			const step = (e.speed || 0.04) * 300;
			const dir = Math.random() > 0.5 ? 1 : -1;
			const nx = e.px + dir * step;
			if (!boxHitsWall(chunk.grid, nx, e.py, ENEMY_HALF, ENEMY_HALF)) {
				e.targetPx = nx;
			}
		}
	}

	// --- Leuchtfisch: Charges player, self-destructs ---
	function updateKamikazeAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy);

		if (e.exploding) {
			e.explodeTimer -= dt;
			e.scale = 1.0 + (1 - e.explodeTimer / 400) * 0.8;
			if (e.explodeTimer <= 0) {
				e.alive = false;
				ds.score += 5;
				ds.coins += 3;
				if (ds.playerInvulnerable <= 0) {
					const explDist = Math.hypot(ds.playerPx - e.px, ds.playerPy - e.py);
					if (explDist < 60) {
						ds.hearts = Math.max(0, ds.hearts - (e.damage || 2));
						ds.playerInvulnerable = INVULN_DURATION;
					}
				}
				ds.attackEffect = { x: e.px, y: e.py, timer: 400 };
			}
			return;
		}

		if (dist < 35) {
			e.exploding = true;
			e.explodeTimer = 400;
			return;
		}

		if (dist <= 0.0001) return;

		const speed = (e.speed || 0.06) * dt;
		const nx = e.px + (dx / dist) * speed;
		const ny = e.py + (dy / dist) * speed;
		if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
			e.px = nx; e.py = ny;
			e.targetPx = nx; e.targetPy = ny;
		}
	}

	// --- Seeigel: Stationary turret, shoots projectiles ---
	function updateTurretAI(e, ds, dt) {
		e.shootTimer -= dt;
		if (e.shootTimer <= 0) {
			e.shootTimer = e.shootInterval || 3000;
			const dx = ds.playerPx - e.px;
			const dy = ds.playerPy - e.py;
			const dist = Math.hypot(dx, dy) || 1;
			if (!ds.enemyProjectiles) ds.enemyProjectiles = [];
			ds.enemyProjectiles.push({
				px: e.px, py: e.py,
				vx: (dx / dist) * (e.projectileSpeed || 0.2),
				vy: (dy / dist) * (e.projectileSpeed || 0.2),
				life: 2000, damage: e.damage || 1,
				color: e.color || "#aa44aa",
				type: "spike",
				onHitEffect: e.onHitEffect || null
			});
		}
	}

	// --- Muräne: Ambush, dash attack when player is close ---
	function updateAmbushAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		if (e.hidden) {
			if (dist < 120 && e.ambushCooldown <= 0) {
				if (!e._ambushTelegraphActive) {
					e._ambushTelegraphActive = true;
					e._ambushTelegraphTimer = 450;
					e._dashTarget = { x: ds.playerPx, y: ds.playerPy };
				} else {
					e._ambushTelegraphTimer -= dt;
					if (e._ambushTelegraphTimer <= 0) {
						e._ambushTelegraphActive = false;
						e.hidden = false;
						e._dashing = true;
						e._dashTimer = 500;
					}
				}
			} else {
				e._ambushTelegraphActive = false;
			}
			return;
		}

		if (e._dashing) {
			e._dashTimer -= dt;
			const dashSpeed = 0.4 * dt;
			const tdx = e._dashTarget.x - e.px;
			const tdy = e._dashTarget.y - e.py;
			const tdist = Math.hypot(tdx, tdy) || 1;
			const nx = e.px + (tdx / tdist) * dashSpeed;
			const ny = e.py + (tdy / tdist) * dashSpeed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
			}
			e.targetPx = e.px; e.targetPy = e.py;

			if (e._dashTimer <= 0 || Math.hypot(e._dashTarget.x - e.px, e._dashTarget.y - e.py) < 10) {
				e._dashing = false;
				e.ambushCooldown = 2000;
				e._retreating = true;
				e._retreatTimer = 800;
			}
			return;
		}

		if (e._retreating) {
			e._retreatTimer -= dt;
			if (e._retreatTimer <= 0) {
				e._retreating = false;
				e.hidden = true;
			} else {
				const awayX = e.px - (dx / dist) * 0.08 * dt;
				const awayY = e.py - (dy / dist) * 0.08 * dt;
				if (!boxHitsWall(chunk.grid, awayX, awayY, ENEMY_HALF, ENEMY_HALF)) {
					e.px = awayX; e.py = awayY;
				}
				e.targetPx = e.px; e.targetPy = e.py;
			}
			return;
		}

		if (e.ambushCooldown <= 0 && dist > 120) {
			e.hidden = true;
		}
	}

	// --- Panzerfisch: Slow, frontal armour ---
	function updateTankAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		e._facingX = dx / dist;

		const speed = (e.speed || 0.03) * dt;
		const nx = e.px + (dx / dist) * speed;
		const ny = e.py + (dy / dist) * speed;
		if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
			e.px = nx; e.py = ny;
			e.targetPx = nx; e.targetPy = ny;
		}
	}

	// --- Tintenfisch: Flees, squirts ink, spawns jellies ---
	function updateFleeAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		if (dist < 150) {
			const speed = (e.speed || 0.05) * dt;
			const nx = e.px - (dx / dist) * speed;
			const ny = e.py - (dy / dist) * speed;
			if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
				e.px = nx; e.py = ny;
			}
			e.targetPx = e.px; e.targetPy = e.py;
		} else {
			const lerp = Math.min(1, dt * 0.003);
			e.px += (e.targetPx - e.px) * lerp;
			e.py += (e.targetPy - e.py) * lerp;
			if (Math.random() < dt * 0.001) {
				const angle = Math.random() * Math.PI * 2;
				const step = 80;
				const nx = e.px + Math.cos(angle) * step;
				const ny = e.py + Math.sin(angle) * step;
				if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF, ENEMY_HALF)) {
					e.targetPx = nx; e.targetPy = ny;
				}
			}
		}

		// Ink cloud + spawn jelly
		e.inkTimer -= dt;
		if (e.inkTimer <= 0 && dist < 200) {
			e.inkTimer = e.inkInterval || 5000;
			if (!ds.inkClouds) ds.inkClouds = [];
			ds.inkClouds.push({
				px: e.px, py: e.py,
				radius: 50,
				timer: 3000,
				maxTimer: 3000
			});
			const maxAliveEnemies = Math.max(12, Number.isFinite(ds.maxAliveEnemies) ? ds.maxAliveEnemies : 12);
			const aliveEnemyCount = ds.roomEnemies.reduce((sum, enemy) => sum + (enemy && enemy.alive !== false ? 1 : 0), 0);
			if (aliveEnemyCount < maxAliveEnemies) {
				const stats = dungeonData.enemyStats?.qualle || {};
				const diff = getFloorDifficulty(ds.currentFloor.floor, ds.endlessScaling);
				ds.roomEnemies.push({
					px: e.px + (Math.random() - 0.5) * 40,
					py: e.py + (Math.random() - 0.5) * 40,
					targetPx: e.px, targetPy: e.py,
					type: "qualle", hp: Math.ceil((stats.baseHP || 2) * diff.enemyHPScale),
					maxHp: Math.ceil((stats.baseHP || 2) * diff.enemyHPScale),
					alive: true, color: stats.color || "#88ddff",
					speed: stats.speed || 0.03, damage: Math.max(1, Math.round(1 * (diff.damageScale || 1))), ai: "drift",
					sway: Math.random() * 6.28, bobPhase: Math.random() * 5000,
					bobOffset: 0, hitFlash: 0, scale: 0.6,
					hidden: false, exploding: false, explodeTimer: 0,
					enemyProjectiles: [], shootTimer: 3000, shootInterval: 3000,
					inkTimer: 5000, inkInterval: 5000, shockwaveTimer: 4000,
					shockwaveInterval: 4000, frontalArmor: 0, ambushCooldown: 0,
					inkCloud: null, shockwave: null, projectileSpeed: 0.2
				});
			}
		}
	}

	// --- Steinwächter: Tanky, shockwave attack ---
	function updateEliteAI(e, ds, dt, chunk) {
		const dx = ds.playerPx - e.px;
		const dy = ds.playerPy - e.py;
		const dist = Math.hypot(dx, dy) || 1;

		const speed = (e.speed || 0.02) * dt;
		const nx = e.px + (dx / dist) * speed;
		const ny = e.py + (dy / dist) * speed;
		if (!boxHitsWall(chunk.grid, nx, ny, ENEMY_HALF + 4, ENEMY_HALF + 4)) {
			e.px = nx; e.py = ny;
			e.targetPx = nx; e.targetPy = ny;
		}

		e.shockwaveTimer -= dt;
		if (e.shockwaveTimer <= 0) {
			e.shockwaveTimer = e.shockwaveInterval || 4000;
			if (!ds.shockwaves) ds.shockwaves = [];
			ds.shockwaves.push({
				px: e.px, py: e.py,
				radius: 0,
				maxRadius: 140,
				speed: 0.15,
				timer: 900,
				damage: e.damage || 2,
				hit: false
			});
		}
	}

	/**
	 * Dispatches AI updates for all room enemies.
	 */
	function updateEnemies(ds, dt) {
		if (!ds.roomEnemies) return;
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;

		if (!ds.enemyProjectiles) ds.enemyProjectiles = [];

		// Track previous player position for predictive AI
		if (ds._prevPlayerPx === undefined) {
			ds._prevPlayerPx = ds.playerPx;
			ds._prevPlayerPy = ds.playerPy;
		}

		for (const e of ds.roomEnemies) {
			if (!e.alive) continue;
			if (e.hitFlash > 0) e.hitFlash -= dt;
			if (e.ambushCooldown > 0) e.ambushCooldown -= dt;

			// Bob animation
			e.bobOffset = Math.sin((performance.now() + (e.bobPhase || 0)) / 800) * 3;
			e.sway = (e.sway || 0) + dt * 0.003;

			const ai = e.ai || "drift";

			switch (ai) {
				case "drift":    updateDriftAI(e, ds, dt, chunk); break;
				case "ground":   updateGroundAI(e, ds, dt, chunk); break;
				case "kamikaze": updateKamikazeAI(e, ds, dt, chunk); break;
				case "turret":   updateTurretAI(e, ds, dt); break;
				case "ambush":   updateAmbushAI(e, ds, dt, chunk); break;
				case "tank":     updateTankAI(e, ds, dt, chunk); break;
				case "flee":     updateFleeAI(e, ds, dt, chunk); break;
				case "elite":    updateEliteAI(e, ds, dt, chunk); break;
				case "predictive":        updatePredictiveAI(e, ds, dt, chunk); break;
				case "formation":         updateFormationAI(e, ds, dt, chunk); break;
				case "ambush_static":     updateAmbushStaticAI(e, ds, dt, chunk); break;
				case "berserker":         updateBerserkerAI(e, ds, dt, chunk); break;
				case "patrol_hunt":       updatePatrolHuntAI(e, ds, dt, chunk); break;
				case "coordinated_ranged": updateCoordinatedRangedAI(e, ds, dt); break;
				case "leash":             updateLeashAI(e, ds, dt, chunk); break;
				default:         updateDriftAI(e, ds, dt, chunk);
			}

			if (e.behaviorPattern === 'flank') {
				applyFlankPattern(e, ds, dt, chunk);
			} else if (e.behaviorPattern === 'kite') {
				applyKitePattern(e, ds, dt, chunk);
			}

			// Frost-Aura proximity slow (Frostqualle)
			if (e.frostAura && e.alive) {
				const auraDist = Math.hypot(e.px - ds.playerPx, e.py - ds.playerPy);
				if (auraDist < (e.frostRadius || 60)) {
					applyStatusEffect(ds, { type: 'slow', duration: 300, magnitude: e.slowAmount || 0.4 });
				}
			}

			// Lava-Trail (Magmakrabbe) — leave damaging pools
			if (e.lavaTrail && e.alive) {
				if (!e._lavaTrailTimer) e._lavaTrailTimer = 0;
				e._lavaTrailTimer -= dt;
				if (e._lavaTrailTimer <= 0) {
					e._lavaTrailTimer = 500; // one pool every 500ms
					if (!ds._lavaTrails) ds._lavaTrails = [];
					ds._lavaTrails.push({ px: e.px, py: e.py, timer: e.lavaTrailDuration || 2000, damage: 1 });
				}
			}
		}

		// Update prev-position for next frame predictive calculations
		ds._prevPlayerPx = ds.playerPx;
		ds._prevPlayerPy = ds.playerPy;
	}

	return { updateEnemies };
}
