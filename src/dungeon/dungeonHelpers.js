// ============================================================
// DUNGEON HELPERS — AI-controlled NPC companions in the dungeon
// ============================================================
// Tank:   Moves toward enemies, taunts, absorbs damage
// Healer: Stays near player, heals periodically
// DPS:    Chases enemies, maximises damage output
"use strict";

import {
	ENEMY_HALF, BOSS_HALF, PROJECTILE_RADIUS,
	HELPER_HALF, HELPER_ATTACK_RANGE, HELPER_FOLLOW_DIST, HELPER_SPEED_FACTOR
} from './dungeonConstants.js';

/**
 * Creates the helper companion subsystem.
 * @param {{ boxHitsWall: Function }} tiles
 * @param {HTMLCanvasElement} canvas
 */
export function createHelperSystem(tiles, canvas) {
	const { boxHitsWall } = tiles;

	/** Find the nearest alive, visible enemy. */
	function findNearestEnemy(ds, h) {
		if (!ds.roomEnemies) return null;
		let best = null, bestDist = Infinity;
		for (const e of ds.roomEnemies) {
			if (!e.alive || e.hidden) continue;
			const dist = Math.hypot(e.px - h.x, e.py - h.y);
			if (dist < bestDist) { best = e; bestDist = dist; }
		}
		return best;
	}

	// ---- TANK: Interposes between player and enemies ----
	function updateHelperTank(h, ds, dt, target, chunk) {
		const spd = h.speed * HELPER_SPEED_FACTOR * 0.8;

		if (target) {
			const tx = target.px || target.x;
			const ty = target.py || target.y;
			h.targetX = (ds.playerPx + tx) / 2;
			h.targetY = (ds.playerPy + ty) / 2;

			// Taunt aura
			if (h.specialTimer <= 0) {
				const tauntRange = h.specialValue || 80;
				if (ds.roomEnemies) {
					for (const e of ds.roomEnemies) {
						if (!e.alive || e.hidden) continue;
						if (Math.hypot(e.px - h.x, e.py - h.y) < tauntRange) {
							e.targetPx = h.x + (Math.random() - 0.5) * 10;
							e.targetPy = h.y + (Math.random() - 0.5) * 10;
						}
					}
				}
				h.specialTimer = 3000;
			}

			const dist = Math.hypot(tx - h.x, ty - h.y);
			if (h.attackTimer <= 0 && dist < HELPER_ATTACK_RANGE) {
				helperDealDamage(h, target, ds, h.damage);
				h.attackTimer = 1200;
			}
		} else {
			h.targetX = ds.playerPx + 30;
			h.targetY = ds.playerPy;
		}

		moveHelper(h, ds, dt, spd, chunk);
	}

	// ---- HEALER: Stays near player, periodic heal ----
	function updateHelperHealer(h, ds, dt, target, chunk) {
		const spd = h.speed * HELPER_SPEED_FACTOR;

		const distToPlayer = Math.hypot(ds.playerPx - h.x, ds.playerPy - h.y);
		if (distToPlayer > HELPER_FOLLOW_DIST) {
			h.targetX = ds.playerPx + (Math.random() - 0.5) * 30;
			h.targetY = ds.playerPy + (Math.random() - 0.5) * 30;
		}

		if (h.specialTimer <= 0) {
			if (ds.hearts < ds.maxHearts) {
				const healAmount = h.specialValue || 1;
				ds.hearts = Math.min(ds.maxHearts, ds.hearts + healAmount);
				h.specialTimer = 8000;
				h._healFlash = 500;
			} else {
				h.specialTimer = 2000;
			}
		}
		if (h._healFlash > 0) h._healFlash -= dt;

		if (target && h.attackTimer <= 0) {
			const tx = target.px || target.x;
			const ty = target.py || target.y;
			const dist = Math.hypot(tx - h.x, ty - h.y);
			if (dist < 150) {
				helperDealDamage(h, target, ds, Math.ceil(h.damage * 0.5));
				h.attackTimer = 1500;
			}
		}

		moveHelper(h, ds, dt, spd, chunk);
	}

	// ---- DPS: Chases enemies, maximum damage ----
	function updateHelperDPS(h, ds, dt, target, chunk) {
		const spd = h.speed * HELPER_SPEED_FACTOR * 1.2;

		if (target) {
			const tx = target.px || target.x;
			const ty = target.py || target.y;
			h.targetX = tx;
			h.targetY = ty;

			const dist = Math.hypot(tx - h.x, ty - h.y);
			if (h.attackTimer <= 0 && dist < HELPER_ATTACK_RANGE) {
				helperDealDamage(h, target, ds, h.damage);
				h.attackTimer = 700;
			}
		} else {
			const distToPlayer = Math.hypot(ds.playerPx - h.x, ds.playerPy - h.y);
			if (distToPlayer > HELPER_FOLLOW_DIST) {
				h.targetX = ds.playerPx - 25;
				h.targetY = ds.playerPy + 15;
			}
		}

		moveHelper(h, ds, dt, spd, chunk);
	}

	/** Move helper toward its target with wall collision. */
	function moveHelper(h, ds, dt, spd, chunk) {
		const dx = h.targetX - h.x;
		const dy = h.targetY - h.y;
		const dist = Math.hypot(dx, dy);
		if (dist < 5) return;

		const mx = (dx / dist) * spd * dt;
		const my = (dy / dist) * spd * dt;

		if (!boxHitsWall(chunk.grid, h.x + mx, h.y, HELPER_HALF, HELPER_HALF)) {
			h.x += mx;
		}
		if (!boxHitsWall(chunk.grid, h.x, h.y + my, HELPER_HALF, HELPER_HALF)) {
			h.y += my;
		}

		h.x = Math.max(HELPER_HALF, Math.min(canvas.width - HELPER_HALF, h.x));
		h.y = Math.max(HELPER_HALF, Math.min(canvas.height - HELPER_HALF, h.y));
	}

	/** Helper deals damage to a target (enemy or boss). */
	function helperDealDamage(h, target, ds, dmg) {
		if (target.hp != null) {
			target.hp -= dmg;
			if (target.hitFlash != null) target.hitFlash = 200;

			const tx = target.px || target.x;
			const ty = target.py || target.y;
			const angle = Math.atan2(ty - h.y, tx - h.x);
			if (target.targetPx != null) {
				target.targetPx = tx + Math.cos(angle) * 8;
				target.targetPy = ty + Math.sin(angle) * 8;
			}

			if (target.hp <= 0 && target.alive !== undefined) {
				target.alive = false;
				ds.score += 5;
				ds.coins += 5 + Math.floor(Math.random() * 10);
			}

			ds.attackEffect = {
				x: target.px || target.x,
				y: target.py || target.y,
				timer: 150
			};
		}
	}

	/** Helper takes contact damage from enemies. */
	function helperEnemyCollision(h, ds) {
		if (!ds.roomEnemies || h.invuln > 0) return;
		for (const e of ds.roomEnemies) {
			if (!e.alive || e.hidden) continue;
			const dist = Math.hypot(e.px - h.x, e.py - h.y);
			if (dist < HELPER_HALF + ENEMY_HALF) {
				h.hp -= (e.damage || 1);
				h.invuln = 600;
				h.hitFlash = 200;
				break;
			}
		}
	}

	/** Helper takes damage from enemy projectiles. */
	function helperProjectileCollision(h, ds) {
		if (!ds.enemyProjectiles || h.invuln > 0) return;
		for (let i = ds.enemyProjectiles.length - 1; i >= 0; i--) {
			const p = ds.enemyProjectiles[i];
			if (Math.hypot(p.px - h.x, p.py - h.y) < HELPER_HALF + PROJECTILE_RADIUS) {
				h.hp -= (p.damage || 1);
				h.invuln = 400;
				h.hitFlash = 200;
				ds.enemyProjectiles.splice(i, 1);
				break;
			}
		}
	}

	/** Helper takes contact damage from boss. */
	function helperBossCollision(h, ds) {
		if (!ds.boss || !ds.boss.alive || h.invuln > 0) return;
		const dist = Math.hypot(ds.boss.px - h.x, ds.boss.py - h.y);
		if (dist < HELPER_HALF + BOSS_HALF) {
			h.hp -= (ds.boss.damage || 2);
			h.invuln = 800;
			h.hitFlash = 200;
		}
	}

	/** Reposition all helpers near the player after a room change. */
	function repositionHelpers(ds) {
		if (!ds.helpers) return;
		for (const h of ds.helpers) {
			if (!h.alive) continue;
			h.x = ds.playerPx + (Math.random() - 0.5) * 50;
			h.y = ds.playerPy + (Math.random() - 0.5) * 50;
			h.targetX = h.x;
			h.targetY = h.y;
		}
	}

	/** Main helper update tick. */
	function updateHelpers(ds, dt) {
		if (!ds.helpers || ds.helpers.length === 0) return;

		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;

		for (const h of ds.helpers) {
			if (!h.alive) continue;

			// Initialise position on first update
			if (h.x === 0 && h.y === 0) {
				h.x = ds.playerPx + (Math.random() - 0.5) * 40;
				h.y = ds.playerPy + (Math.random() - 0.5) * 40;
				h.targetX = h.x;
				h.targetY = h.y;
			}

			h.attackTimer = Math.max(0, h.attackTimer - dt);
			h.specialTimer = Math.max(0, h.specialTimer - dt);
			if (h.hitFlash > 0) h.hitFlash -= dt;
			if (h.invuln > 0) h.invuln -= dt;

			// Bob animation
			h.bobOffset = Math.sin(performance.now() / 700 + (h._bobPhase || 0)) * 3;
			if (h._bobPhase == null) h._bobPhase = Math.random() * 6.28;

			const nearestEnemy = findNearestEnemy(ds, h);
			const nearestBoss = ds.boss && ds.boss.alive ? ds.boss : null;
			const target = nearestBoss || nearestEnemy;

			switch (h.role) {
				case 'tank':   updateHelperTank(h, ds, dt, target, chunk); break;
				case 'healer': updateHelperHealer(h, ds, dt, target, chunk); break;
				case 'dps':    updateHelperDPS(h, ds, dt, target, chunk); break;
				default:       updateHelperDPS(h, ds, dt, target, chunk); break;
			}

			helperEnemyCollision(h, ds);
			helperProjectileCollision(h, ds);
			if (nearestBoss) helperBossCollision(h, ds);

			if (h.hp <= 0) {
				h.alive = false;
				h.hp = 0;
			}
		}
	}

	return {
		updateHelpers,
		repositionHelpers
	};
}
