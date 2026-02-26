// ============================================================
// DUNGEON UPDATE — Main orchestrator (side-view dungeon mode)
// ============================================================
// Delegates to focused subsystems: combat, enemy AI, boss,
// rooms, and helper companions. Only player movement and the
// main update loop remain here.
'use strict';

import {
	PLAYER_SPEED, PLAYER_HALF_W, PLAYER_HALF_H,
	ANGLE_LERP_SPEED, T, SPIKE_DAMAGE_COOLDOWN, INVULN_DURATION
} from './dungeonConstants.js';
import { createTileHelpers } from './dungeonTileUtils.js';
import { createEnemyAI } from './dungeonEnemyAI.js';
import { createCombatSystem } from './dungeonCombat.js';
import { createBossSystem } from './dungeonBoss.js';
import { createRoomSystem } from './dungeonRooms.js';
import { createHelperSystem } from './dungeonHelpers.js';
import { tickStatusEffects, hasEffect, getEffectMagnitude, clearAllEffects, applyStatusEffect } from './statusEffects.js';

// ---- Shortcut persistence ----
const SHORTCUT_STORAGE_KEY = 'cashfish_dungeon_shortcuts';

export function saveDungeonShortcut(floor) {
	const shortcuts = getDungeonShortcuts();
	if (!shortcuts.includes(floor)) {
		shortcuts.push(floor);
		shortcuts.sort((a, b) => a - b);
		try { localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcuts)); } catch (e) { /* ignore */ }
	}
}

export function getDungeonShortcuts() {
	try {
		return JSON.parse(localStorage.getItem(SHORTCUT_STORAGE_KEY) || '[]');
	} catch (e) { return []; }
}

/**
 * Creates the dungeon update system (side-view, pixel-based).
 * Wires together all subsystems: combat, enemy AI, boss, rooms, helpers.
 */
export function createDungeonUpdateSystem(ctx) {
	const { getDungeonState, getState, getKeys, onDungeonComplete, onDungeonDeath, canvas, helpersSystem } = ctx;

	// Shared tile helpers used by all subsystems
	const tiles = createTileHelpers(canvas, getDungeonState);
	const { tileSize } = tiles;

	// Initialise subsystems
	const helperSys = createHelperSystem(tiles, canvas);
	const bossSys   = createBossSystem(tiles, canvas, helpersSystem);
	const roomSys   = createRoomSystem(tiles, canvas, onDungeonComplete, bossSys.spawnBoss, helperSys.repositionHelpers);
	const combatSys = createCombatSystem(tiles);
	const enemyAI   = createEnemyAI(tiles);

	// Local mutable state
	let spikeCd = 0;

	// ---- Main update loop ----
	function update(dt) {
		const ds = getDungeonState();
		if (!ds || !ds.currentFloor) return;

		if (ds.transition) {
			ds.transition.elapsed += dt;
			if (ds.transition.elapsed >= ds.transition.duration) roomSys.finishTransition(ds);
			return;
		}

		spikeCd = Math.max(0, spikeCd - dt);
		roomSys.tickDoorCooldown(dt);
		if (ds.playerInvulnerable > 0) ds.playerInvulnerable -= dt;
		if (ds.clearBanner > 0) ds.clearBanner -= dt;
		if (ds.attackCooldown > 0) ds.attackCooldown -= dt;
		if (ds.attackEffect) {
			ds.attackEffect.timer -= dt;
			if (ds.attackEffect.timer <= 0) ds.attackEffect = null;
		}

		tickStatusEffects(ds, dt);
		movePlayer(ds, dt);
		spikeCheck(ds);
		combatSys.updateProjectiles(ds, dt);
		enemyAI.updateEnemies(ds, dt);
		combatSys.playerEnemyCollision(ds);
		combatSys.updateEnemyProjectiles(ds, dt);
		combatSys.updateInkClouds(ds, dt);
		combatSys.updateShockwaves(ds, dt);
		updateLavaTrails(ds, dt);
		updateDeathExplosions(ds, dt);
		updateWebTraps(ds, dt);
		helperSys.updateHelpers(ds, dt);
		roomSys.pickupCheck(ds);
		roomSys.roomClearCheck(ds);
		bossSys.updateBoss(ds, dt);
		roomSys.doorCheck(ds);
		roomSys.exitCheck(ds);
		checkpointCheck(ds);

		if (ds.hearts <= 0 && onDungeonDeath) onDungeonDeath(ds);
	}

	// ---- Lava trail damage zones ----
	function updateLavaTrails(ds, dt) {
		if (!ds._lavaTrails) return;
		const PLAYER_HALF = 14;
		for (let i = ds._lavaTrails.length - 1; i >= 0; i--) {
			const lt = ds._lavaTrails[i];
			lt.timer -= dt;
			if (lt.timer <= 0) { ds._lavaTrails.splice(i, 1); continue; }
			// Damage player if standing on lava
			if (ds.playerInvulnerable <= 0 && Math.hypot(lt.px - ds.playerPx, lt.py - ds.playerPy) < PLAYER_HALF + 12) {
				ds.hearts = Math.max(0, ds.hearts - (lt.damage || 1));
				ds.playerInvulnerable = 500; // shorter invuln for lava
			}
		}
	}

	// ---- Aschegeist death explosions (delayed AoE) ----
	function updateDeathExplosions(ds, dt) {
		if (!ds._deathExplosions) return;
		for (let i = ds._deathExplosions.length - 1; i >= 0; i--) {
			const de = ds._deathExplosions[i];
			de.timer -= dt;
			if (de.timer <= 0) {
				// Explode
				if (ds.playerInvulnerable <= 0) {
					const dist = Math.hypot(de.px - ds.playerPx, de.py - ds.playerPy);
					if (dist < de.radius) {
						ds.hearts = Math.max(0, ds.hearts - (de.damage || 1));
						ds.playerInvulnerable = INVULN_DURATION;
					}
				}
				ds.attackEffect = { x: de.px, y: de.py, timer: 400, type: "explosion" };
				ds._deathExplosions.splice(i, 1);
			}
		}
	}

	// ---- Web traps (Kristallspinne — slow zone) ----
	function updateWebTraps(ds, dt) {
		if (!ds._webTraps) return;
		for (let i = ds._webTraps.length - 1; i >= 0; i--) {
			const wt = ds._webTraps[i];
			wt.timer -= dt;
			if (wt.timer <= 0) { ds._webTraps.splice(i, 1); continue; }
			// Apply slow if player is in the web
			if (Math.hypot(wt.px - ds.playerPx, wt.py - ds.playerPy) < wt.radius + 14) {
				applyStatusEffect(ds, { type: 'slow', duration: 500, magnitude: wt.slowAmount || 0.5 });
			}
		}
	}

	// ---- Player movement (underwater swimming) ----
	function canCrossRoom(ds, dir) {
		const current = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!current) return null;
		if (!current.doors?.[dir]) return null;
		if (!current.cleared) return null;
		const dv = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[dir];
		const toX = ds.currentRoomX + dv[0];
		const toY = ds.currentRoomY + dv[1];
		const target = ds.currentFloor.grid[toY]?.[toX];
		if (!target) return null;
		const opposite = { N: 'S', S: 'N', W: 'E', E: 'W' }[dir];
		if (!target.doors?.[opposite]) return null;
		return { toX, toY, target };
	}

	function tryContinuousRoomCross(ds, dir) {
		if (!ds?.continuousWorld) return false;
		const next = canCrossRoom(ds, dir);
		if (!next) return false;

		const { tw, th } = tileSize();
		const prevX = ds.currentRoomX;
		const prevY = ds.currentRoomY;
		const prevPx = ds.playerPx;
		const prevPy = ds.playerPy;

		ds.currentRoomX = next.toX;
		ds.currentRoomY = next.toY;

		if (dir === 'W') ds.playerPx = canvas.width - tw * 2.8;
		if (dir === 'E') ds.playerPx = tw * 2.8;
		if (dir === 'N') ds.playerPy = canvas.height - th * 2.8;
		if (dir === 'S') ds.playerPy = th * 2.8;

		ds.playerPx = Math.max(PLAYER_HALF_W + 2, Math.min(canvas.width - PLAYER_HALF_W - 2, ds.playerPx));
		ds.playerPy = Math.max(PLAYER_HALF_H + 2, Math.min(canvas.height - PLAYER_HALF_H - 2, ds.playerPy));

		const newChunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!newChunk || boxHitsWall(newChunk.grid, ds.playerPx, ds.playerPy, PLAYER_HALF_W, PLAYER_HALF_H)) {
			ds.currentRoomX = prevX;
			ds.currentRoomY = prevY;
			ds.playerPx = prevPx;
			ds.playerPy = prevPy;
			return false;
		}

		roomSys.enterRoom(ds);
		helperSys.repositionHelpers(ds);
		return true;
	}

	function movePlayer(ds, dt) {
		const keys = getKeys();
		let mx = 0, my = 0;
		// Freeze/Stun: player cannot move
		if (hasEffect(ds, 'freeze') || hasEffect(ds, 'stun')) return;

		if (keys.ArrowLeft  || keys.KeyA) mx -= 1;
		if (keys.ArrowRight || keys.KeyD) mx += 1;
		if (keys.ArrowUp    || keys.KeyW) my -= 1;
		if (keys.ArrowDown  || keys.KeyS) my += 1;

		let targetAngle = 0;
		if (my < 0) targetAngle = -Math.PI / 5;
		if (my > 0) targetAngle =  Math.PI / 5;

		if (ds.playerAngle == null) ds.playerAngle = 0;
		const angleDiff = targetAngle - ds.playerAngle;
		ds.playerAngle += angleDiff * Math.min(1, ANGLE_LERP_SPEED * dt);
		if (Math.abs(ds.playerAngle) < 0.01) ds.playerAngle = 0;

		if (!mx && !my) return;

		const len = Math.hypot(mx, my) || 1;
		// Slow: reduce speed by magnitude (0-1), default 0.5
		const slowFactor = hasEffect(ds, 'slow') ? (1 - (getEffectMagnitude(ds, 'slow') || 0.5)) : 1;
		const dx = (mx / len) * PLAYER_SPEED * slowFactor * dt;
		const dy = (my / len) * PLAYER_SPEED * slowFactor * dt;
		if (Math.abs(mx) > 0.1) ds.playerDir = mx > 0 ? 1 : -1;

		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;

		if (ds.continuousWorld) {
			const nextX = ds.playerPx + dx;
			const nextY = ds.playerPy + dy;
			if (mx < 0 && nextX - PLAYER_HALF_W < 0 && tryContinuousRoomCross(ds, 'W')) return;
			if (mx > 0 && nextX + PLAYER_HALF_W > canvas.width && tryContinuousRoomCross(ds, 'E')) return;
			if (my < 0 && nextY - PLAYER_HALF_H < 0 && tryContinuousRoomCross(ds, 'N')) return;
			if (my > 0 && nextY + PLAYER_HALF_H > canvas.height && tryContinuousRoomCross(ds, 'S')) return;
		}

		if (!tiles.boxHitsWall(chunk.grid, ds.playerPx + dx, ds.playerPy, PLAYER_HALF_W, PLAYER_HALF_H))
			ds.playerPx += dx;

		if (!tiles.boxHitsWall(chunk.grid, ds.playerPx, ds.playerPy + dy, PLAYER_HALF_W, PLAYER_HALF_H))
			ds.playerPy += dy;
	}

	function spikeCheck(ds) {
		if (spikeCd > 0 || ds.playerInvulnerable > 0) return;
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;
		const { tw, th } = tileSize();
		const tx = Math.floor(ds.playerPx / tw);
		const ty = Math.floor(ds.playerPy / th);
		if (chunk.grid[ty]?.[tx] === T.SPIKES) {
			ds.hearts = Math.max(0, ds.hearts - 1);
			ds.playerInvulnerable = INVULN_DURATION;
			spikeCd = SPIKE_DAMAGE_COOLDOWN;
		}
	}

	function checkpointCheck(ds) {
		const c = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!c || c.type !== 'checkpoint') return;
		const { tw, th } = tileSize();
		const cp = c.spawns.find(s => s.type === 'checkpoint');
		if (!cp) return;
		if (Math.hypot(ds.playerPx - (cp.x + 0.5) * tw, ds.playerPy - (cp.y + 0.5) * th) < 40 && !ds.checkpointActivated) {
			ds.checkpointActivated = true;
			ds.checkpointFloor = ds.currentFloor.floor;
			ds.hearts = ds.maxHearts;
			if (ds.currentFloor.floor <= 30) {
				saveDungeonShortcut(ds.currentFloor.floor);
			}
		}
	}

	return {
		update,
		enterRoom: roomSys.enterRoom,
		handleAttack(ds) {
			// Block attacks during freeze/stun
			if (hasEffect(ds, 'freeze') || hasEffect(ds, 'stun')) return;
			combatSys.handleAttack(ds);
		},
		repositionHelpers: helperSys.repositionHelpers,
		resetCooldowns() {
			spikeCd = 0;
			roomSys.resetDoorCooldown();
			bossSys.resetBossTimer();
		}
	};
}
