// ============================================================
// DUNGEON COMBAT — Projectiles, collisions, attacks
// ============================================================
"use strict";

import {
	PLAYER_HALF_W, PLAYER_HALF_H, ENEMY_HALF,
	INVULN_DURATION, PROJECTILE_SPEED, PROJECTILE_LIFETIME,
	PROJECTILE_RADIUS, ATTACK_COOLDOWN_MS
} from './dungeonConstants.js';
import { applyStatusEffect } from './statusEffects.js';

/**
 * Creates combat functions bound to tile helpers.
 * @param {{ tileSize: Function, walkable: Function }} tiles
 */
export function createCombatSystem(tiles) {
	const { tileSize, walkable } = tiles;

	/** Fire a projectile in the player's facing direction. */
	function handleAttack(ds) {
		if (ds.attackCooldown > 0) return;
		if (!ds.projectiles) ds.projectiles = [];

		const rawAngle = ds.playerAngle || 0;
		const vx = Math.cos(rawAngle) * ds.playerDir;
		const vy = Math.sin(rawAngle);
		const len = Math.hypot(vx, vy) || 1;

		ds.projectiles.push({
			px: ds.playerPx + vx / len * 24,
			py: ds.playerPy + vy / len * 24,
			vx: (vx / len) * PROJECTILE_SPEED,
			vy: (vy / len) * PROJECTILE_SPEED,
			life: PROJECTILE_LIFETIME,
			damage: ds.attackDamage
		});

		ds.attackCooldown = ATTACK_COOLDOWN_MS;
	}

	/** Move and collide player projectiles with enemies and walls. */
	function updateProjectiles(ds, dt) {
		if (!ds.projectiles) return;
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;
		const coinMult = ds?.runModifierEffects?.coinMult || 1;

		for (let i = ds.projectiles.length - 1; i >= 0; i--) {
			const p = ds.projectiles[i];
			p.px += p.vx * dt;
			p.py += p.vy * dt;
			p.life -= dt;

			const { tw: tilew, th: tileh } = tileSize();
			const tileX = Math.floor(p.px / tilew);
			const tileY = Math.floor(p.py / tileh);
			const hitWall = !walkable(chunk.grid, tileX, tileY);

			let hitEnemy = false;
			if (ds.roomEnemies) {
				for (const e of ds.roomEnemies) {
					if (!e.alive) continue;
					if (e.hidden) continue;
					if (Math.hypot(e.px - p.px, e.py - p.py) < PROJECTILE_RADIUS + ENEMY_HALF) {
						let dmg = p.damage;
						if (e.frontalArmor > 0 && e._facingX !== undefined) {
							const projAngle = Math.atan2(p.vy, p.vx);
							const facingAngle = Math.atan2(0, e._facingX);
							const angleDiff = Math.abs(projAngle - facingAngle);
							if (angleDiff < Math.PI * 0.5 || angleDiff > Math.PI * 1.5) {
								dmg = Math.max(1, Math.ceil(dmg * (1 - e.frontalArmor)));
								ds.attackEffect = { x: e.px, y: e.py, timer: 150, type: "armor" };
							}
						}

						e.hp -= dmg;
						e.hitFlash = 200;
						const ka = Math.atan2(p.vy, p.vx);
						e.targetPx = e.px + Math.cos(ka) * 18;
						e.targetPy = e.py + Math.sin(ka) * 18;
						if (e.hp <= 0) {
							e.alive = false;
							ds.score += 5;
							ds.coins += Math.max(1, Math.floor((5 + Math.floor(Math.random() * 10)) * coinMult));
							if (e.ai === "kamikaze") {
								ds.attackEffect = { x: e.px, y: e.py, timer: 400, type: "explosion" };
								if (ds.playerInvulnerable <= 0) {
									const explDist = Math.hypot(ds.playerPx - e.px, ds.playerPy - e.py);
									if (explDist < 60) {
										ds.hearts = Math.max(0, ds.hearts - (e.damage || 2));
										ds.playerInvulnerable = INVULN_DURATION;
									}
								}
							}
							// Aschegeist: delayed death explosion
							if (e.deathExplosionDelay > 0) {
								const dePx = e.px, dePy = e.py;
								const deRadius = e.deathExplosionRadius || 50;
								const deDelay = e.deathExplosionDelay;
								if (!ds._deathExplosions) ds._deathExplosions = [];
								ds._deathExplosions.push({ px: dePx, py: dePy, radius: deRadius, timer: deDelay, damage: e.damage || 1 });
							}
							// Web trap: place slow zone on death position
							if (e.webTrap) {
								if (!ds._webTraps) ds._webTraps = [];
								ds._webTraps.push({ px: e.px, py: e.py, radius: 30, timer: 4000, slowAmount: 0.5 });
							}
						}
						if (!ds.attackEffect) ds.attackEffect = { x: e.px, y: e.py, timer: 200 };
						hitEnemy = true;
						break;
					}
				}
			}

			if (hitWall || hitEnemy || p.life <= 0) {
				ds.projectiles.splice(i, 1);
			}
		}
	}

	/** Player ↔ enemy contact collision. */
	function playerEnemyCollision(ds) {
		if (!ds.roomEnemies || ds.playerInvulnerable > 0) return;
		const coinMult = ds?.runModifierEffects?.coinMult || 1;
		for (const e of ds.roomEnemies) {
			if (!e.alive) continue;
			if (e.hidden) continue;
			if (e.exploding) continue;

			const dist = Math.hypot(e.px - ds.playerPx, e.py - ds.playerPy);
			if (dist < PLAYER_HALF_W + ENEMY_HALF) {
				const dmg = e.damage || 1;
				ds.hearts = Math.max(0, ds.hearts - dmg);
				ds.playerInvulnerable = INVULN_DURATION;

				// Apply status effect from enemy abilities
				if (e.onHitEffect) {
					applyStatusEffect(ds, e.onHitEffect);
				}

				if (e.ai === "kamikaze" && !e.exploding) {
					e.exploding = true;
					e.explodeTimer = 400;
					break;
				}

				e.hp -= 1;
				if (e.hp <= 0) {
					e.alive = false; ds.score += 5;
					ds.coins += Math.max(1, Math.floor((5 + Math.floor(Math.random() * 10)) * coinMult));
				}
				break;
			}
		}
	}

	/** Update enemy projectiles (sea urchin spikes, etc.). */
	function updateEnemyProjectiles(ds, dt) {
		if (!ds.enemyProjectiles) return;
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;

		for (let i = ds.enemyProjectiles.length - 1; i >= 0; i--) {
			const p = ds.enemyProjectiles[i];
			p.px += p.vx * dt;
			p.py += p.vy * dt;
			p.life -= dt;

			const { tw: tilew, th: tileh } = tileSize();
			const tileX = Math.floor(p.px / tilew);
			const tileY = Math.floor(p.py / tileh);
			const hitWall = !walkable(chunk.grid, tileX, tileY);

			let hitPlayer = false;
			if (ds.playerInvulnerable <= 0 && Math.hypot(p.px - ds.playerPx, p.py - ds.playerPy) < PROJECTILE_RADIUS + PLAYER_HALF_W) {
				ds.hearts = Math.max(0, ds.hearts - (p.damage || 1));
				ds.playerInvulnerable = INVULN_DURATION;
				// Apply status effect from projectile
				if (p.onHitEffect) {
					applyStatusEffect(ds, p.onHitEffect);
				}
				hitPlayer = true;
			}

			if (hitWall || hitPlayer || p.life <= 0) {
				ds.enemyProjectiles.splice(i, 1);
			}
		}
	}

	/** Update ink cloud timers. */
	function updateInkClouds(ds, dt) {
		if (!ds.inkClouds) return;
		for (let i = ds.inkClouds.length - 1; i >= 0; i--) {
			ds.inkClouds[i].timer -= dt;
			if (ds.inkClouds[i].timer <= 0) {
				ds.inkClouds.splice(i, 1);
			}
		}
	}

	/** Update shockwave rings. */
	function updateShockwaves(ds, dt) {
		if (!ds.shockwaves) return;
		for (let i = ds.shockwaves.length - 1; i >= 0; i--) {
			const sw = ds.shockwaves[i];
			sw.timer -= dt;
			sw.radius += sw.speed * dt;
			if (!sw.hit && ds.playerInvulnerable <= 0) {
				const playerDist = Math.hypot(sw.px - ds.playerPx, sw.py - ds.playerPy);
				if (Math.abs(playerDist - sw.radius) < PLAYER_HALF_W + 8) {
					ds.hearts = Math.max(0, ds.hearts - (sw.damage || 1));
					ds.playerInvulnerable = INVULN_DURATION;
					sw.hit = true;
				}
			}
			if (sw.timer <= 0 || sw.radius > sw.maxRadius) {
				ds.shockwaves.splice(i, 1);
			}
		}
	}

	return {
		handleAttack,
		updateProjectiles,
		playerEnemyCollision,
		updateEnemyProjectiles,
		updateInkClouds,
		updateShockwaves
	};
}
