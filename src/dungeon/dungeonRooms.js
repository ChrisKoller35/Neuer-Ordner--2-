// ============================================================
// DUNGEON ROOMS — Room transitions, doors, spawning, pickups
// ============================================================
"use strict";

import { CHUNK_COLS, CHUNK_ROWS } from './chunkLibrary.js';
import {
	T, TRANSITION_DURATION, PLAYER_HALF_W, PLAYER_HALF_H,
	ENEMY_HALF, DOOR_TRIGGER_DIST, PICKUP_RADIUS, ENEMY_COLORS
} from './dungeonConstants.js';
import { getFloorDifficulty } from './dungeonGenerator.js';
import dungeonData from '../data/dungeon.json';
import { clearAllEffects } from './statusEffects.js';

/**
 * Creates room management functions.
 * @param {{ tileSize: Function, walkable: Function, boxHitsWall: Function }} tiles
 * @param {HTMLCanvasElement} canvas
 * @param {Function} onDungeonComplete
 * @param {Function} spawnBossFn - Boss spawn function from boss subsystem
 * @param {Function} repositionHelpersFn - Helper repositioning function
 */
export function createRoomSystem(tiles, canvas, onDungeonComplete, spawnBossFn, repositionHelpersFn) {
	const { tileSize, walkable, boxHitsWall } = tiles;
	const roomWidth = (ds) => ds?.roomPixelWidth || canvas.width;
	const roomHeight = (ds) => ds?.roomPixelHeight || canvas.height;
	const DEPTH_BAND_POOLS = {
		early: [
			{ type: 'qualle', w: 35 },
			{ type: 'steinkrabbe', w: 25 },
			{ type: 'leuchtfisch', w: 20 },
			{ type: 'seeigel', w: 20 }
		],
		mid: [
			{ type: 'seeigel', w: 18 },
			{ type: 'muraene', w: 30 },
			{ type: 'panzerfisch', w: 27 },
			{ type: 'tintenfisch', w: 25 }
		],
		late: [
			{ type: 'muraene', w: 18 },
			{ type: 'panzerfisch', w: 22 },
			{ type: 'tintenfisch', w: 25 },
			{ type: 'steinwaechter', w: 35 }
		]
	};
	const SIGNATURE_BY_BAND = { early: 'seeigel', mid: 'muraene', late: 'steinwaechter' };

	function resolveDepthBand(depth) {
		const d = Math.max(1, Math.floor(depth || 1));
		if (d <= 10) return 'early';
		if (d <= 20) return 'mid';
		return 'late';
	}

	/**
	 * Get floor-specific enemy pool from dungeon.json, fallback to depth band pool.
	 */
	function getFloorPool(floor) {
		const floorPools = dungeonData.floorEnemyPools || {};
		if (floorPools[String(floor)]) {
			return floorPools[String(floor)];
		}
		// Fallback to depth band for floors without explicit pool
		const band = resolveDepthBand(floor);
		return DEPTH_BAND_POOLS[band] || DEPTH_BAND_POOLS.early;
	}

	/**
	 * Check if current floor has an elite spawn defined.
	 * Returns the elite definition or null.
	 */
	function getFloorElite(floor) {
		const eliteDefs = dungeonData.eliteDefinitions || {};
		return eliteDefs[String(floor)] || null;
	}

	/**
	 * Spawn an elite enemy for this floor if defined.
	 * Elite = base enemy with boosted stats + golden glow marker.
	 */
	function spawnElite(ds, floor, chunk, diff) {
		const eliteDef = getFloorElite(floor);
		if (!eliteDef) return;

		const { tw, th } = tileSize();
		const enemyStatDefs = dungeonData.enemyStats || {};
		const baseStats = enemyStatDefs[eliteDef.base] || {};
		const baseHP = baseStats.baseHP || 5;
		const hp = Math.ceil(baseHP * (eliteDef.hpMult || 2) * diff.enemyHPScale);

		// Find valid spawn position
		let px = roomWidth(ds) * 0.5;
		let py = roomHeight(ds) * 0.4;
		for (let attempts = 0; attempts < 20; attempts++) {
			const testPx = roomWidth(ds) * (0.2 + Math.random() * 0.6);
			const testPy = roomHeight(ds) * (0.2 + Math.random() * 0.6);
			if (!boxHitsWall(chunk.grid, testPx, testPy, ENEMY_HALF + 4, ENEMY_HALF + 4)) {
				px = testPx; py = testPy;
				break;
			}
		}

		ds.roomEnemies.push({
			px, py, targetPx: px, targetPy: py,
			type: eliteDef.base,
			hp, maxHp: hp,
			alive: true,
			color: baseStats.color || ENEMY_COLORS[eliteDef.base] || "#ffaa00",
			speed: (baseStats.speed || 0.04) * (eliteDef.speedMult || 1),
			damage: Math.max(1, Math.round((baseStats.damage || 1) * (eliteDef.damageMult || 1.5) * (diff.damageScale || 1))),
			ai: baseStats.ai || "elite",
			sway: Math.random() * 6.28, bobPhase: Math.random() * 5000,
			bobOffset: 0, hitFlash: 0, scale: 1.2,
			// Elite markers
			isElite: true,
			eliteLabel: eliteDef.label || "Elite",
			eliteModifier: eliteDef.modifier || "none",
			isMiniBoss: eliteDef.isMiniBoss || false,
			// Combat stats
			shootTimer: baseStats.shootInterval || 3000,
			shootInterval: Math.floor((baseStats.shootInterval || 3000) * (eliteDef.shootIntervalMult || 1)),
			projectileSpeed: (baseStats.projectileSpeed || 0.2) * (eliteDef.projectileSpeedMult || 1),
			inkTimer: baseStats.inkInterval || 5000,
			inkInterval: baseStats.inkInterval || 5000,
			shockwaveTimer: baseStats.shockwaveInterval || 4000,
			shockwaveInterval: baseStats.shockwaveInterval || 4000,
			frontalArmor: eliteDef.frontalArmor || baseStats.frontalArmor || 0,
			onHitEffect: buildOnHitEffect(baseStats),
			frostAura: baseStats.frostAura || false,
			frostRadius: baseStats.frostRadius || 0,
			slowAmount: baseStats.slowAmount || 0,
			lavaTrail: baseStats.lavaTrail || false,
			lavaTrailDuration: baseStats.lavaTrailDuration || 0,
			deathExplosionDelay: baseStats.deathExplosionDelay || 0,
			deathExplosionRadius: baseStats.deathExplosionRadius || 0,
			webTrap: baseStats.webTrap || false,
			hidden: (baseStats.ai || "drift") === "ambush" || (baseStats.ai || "drift") === "ambush_static",
			ambushCooldown: 0,
			exploding: false, explodeTimer: 0,
			inkCloud: null, shockwave: null,
			enemyProjectiles: [],
			// Additional elite properties
			splitOnDeath: eliteDef.splitOnDeath || false,
			buffRadius: eliteDef.buffRadius || 0,
			shockwaveRadius: eliteDef.shockwaveRadius || 0,
			spawnCount: eliteDef.spawnCount || 0
		});
	}

	function getEffectiveDifficulty(ds) {
		const modifier = ds?.runModifierEffects || {};
		const baseScaling = ds?.endlessScaling || {};
		const mergedScaling = {
			...baseScaling,
			enemyHPMult: (baseScaling.enemyHPMult || 1) * (modifier.enemyHPMult || 1),
			damageMult: (baseScaling.damageMult || 1) * (modifier.enemyDamageMult || 1),
			spawnBonus: (baseScaling.spawnBonus || 0) + (modifier.spawnBonus || 0)
		};
		return getFloorDifficulty(ds.currentFloor.floor, mergedScaling);
	}

	// Mutable cooldown shared across room transitions
	let doorCooldown = 0;

	function resetDoorCooldown() { doorCooldown = 0; }
	function tickDoorCooldown(dt) { if (doorCooldown > 0) doorCooldown -= dt; }

	/** Check if player is on a pickup and collect it. */
	function pickupCheck(ds) {
		if (!ds.roomPickups) return;
		for (const p of ds.roomPickups) {
			if (p.collected) continue;
			if (Math.hypot(p.px - ds.playerPx, p.py - ds.playerPy) < PICKUP_RADIUS) {
				p.collected = true;
				if (p.type === "coin") ds.coins += p.value || 10;
				else if (p.type === "heal") ds.hearts = Math.min(ds.maxHearts, ds.hearts + 1);
			}
		}
	}

	/** Check if all enemies are dead and reward the player. */
	function roomClearCheck(ds) {
		const c = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!c || c.cleared) return;
		if (c.type === "boss") return;
		if (!ds.roomEnemies || ds.roomEnemies.length === 0) { c.cleared = true; return; }
		if (ds.roomEnemies.every(e => !e.alive)) {
			c.cleared = true;
			ds.clearBanner = 1500;
			spawnClearReward(ds);
		}
	}

	/** Spawn coin/heal pickups as room-clear reward. */
	function spawnClearReward(ds) {
		const { tw, th } = tileSize();
		const diff = getEffectiveDifficulty(ds);
		const coinMult = ds?.runModifierEffects?.coinMult || 1;
		if (!ds.roomPickups) ds.roomPickups = [];
		const cx = roomWidth(ds) / 2, cy = roomHeight(ds) / 2;
		for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) {
			ds.roomPickups.push({
				px: cx + (Math.random() - 0.5) * tw * 8,
				py: cy + (Math.random() - 0.5) * th * 5,
				type: "coin", value: Math.max(1, Math.floor((diff.coinReward / 3) * coinMult)), collected: false
			});
		}
		if (Math.random() < 0.2 && ds.hearts < ds.maxHearts) {
			ds.roomPickups.push({ px: cx, py: cy - th * 3, type: "heal", collected: false });
		}
	}

	/** Check if the player is near a door and start a room transition. */
	function doorCheck(ds) {
		if (ds?.continuousWorld) return;
		if (doorCooldown > 0) return;
		const c = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!c || !c.cleared) return;
		if (c.type === "boss" && ds.boss && ds.boss.alive) return;
		const { tw, th } = tileSize();
		let dir = null;

		if (ds.playerPy < th * 2 + DOOR_TRIGGER_DIST && c.doors.N) dir = "N";
		else if (ds.playerPy > roomHeight(ds) - th * 2 - DOOR_TRIGGER_DIST && c.doors.S) dir = "S";
		else if (ds.playerPx < tw * 2 + DOOR_TRIGGER_DIST && c.doors.W) dir = "W";
		else if (ds.playerPx > roomWidth(ds) - tw * 2 - DOOR_TRIGGER_DIST && c.doors.E) dir = "E";

		if (!dir) return;

		const midX = roomWidth(ds) / 2, midY = roomHeight(ds) / 2;
		const doorRange = 2.5;
		if ((dir === "N" || dir === "S") && Math.abs(ds.playerPx - midX) > tw * doorRange) return;
		if ((dir === "W" || dir === "E") && Math.abs(ds.playerPy - midY) > th * doorRange) return;

		const dv = { N: [0,-1], S: [0,1], E: [1,0], W: [-1,0] }[dir];
		const toX = ds.currentRoomX + dv[0], toY = ds.currentRoomY + dv[1];
		const targetRoom = ds.currentFloor.grid[toY]?.[toX];
		if (!targetRoom) return;

		const opp = { N:"S", S:"N", E:"W", W:"E" }[dir];
		if (!targetRoom.doors[opp]) {
			console.warn(`[Dungeon] Target room (${toX},${toY}) has no ${opp} door — skipping transition`);
			return;
		}

		ds.transition = { fromX: ds.currentRoomX, fromY: ds.currentRoomY, toX, toY, dir, elapsed: 0, duration: TRANSITION_DURATION };
	}

	/** Complete a room transition: place player, enter new room. */
	function finishTransition(ds) {
		const t = ds.transition;
		ds.currentRoomX = t.toX;
		ds.currentRoomY = t.toY;
		ds.transition = null;
		doorCooldown = 500;
		ds.projectiles = [];

		const { tw, th } = tileSize();
		const opp = { N:"S", S:"N", E:"W", W:"E" }[t.dir];
		const currentRoomWidth = roomWidth(ds);
		const currentRoomHeight = roomHeight(ds);
		const midX = currentRoomWidth / 2, midY = currentRoomHeight / 2;
		if (opp === "N") { ds.playerPx = midX; ds.playerPy = th * 4; }
		else if (opp === "S") { ds.playerPx = midX; ds.playerPy = currentRoomHeight - th * 4; }
		else if (opp === "W") { ds.playerPx = tw * 4; ds.playerPy = midY; }
		else if (opp === "E") { ds.playerPx = currentRoomWidth - tw * 4; ds.playerPy = midY; }

		// Ensure player position is walkable
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (chunk && boxHitsWall(chunk.grid, ds.playerPx, ds.playerPy, PLAYER_HALF_W, PLAYER_HALF_H)) {
			let found = false;
			for (let r = 1; r <= 6 && !found; r++) {
				for (let dy = -r; dy <= r && !found; dy++) {
					for (let dx = -r; dx <= r && !found; dx++) {
						const testPx = ds.playerPx + dx * tw;
						const testPy = ds.playerPy + dy * th;
						if (!boxHitsWall(chunk.grid, testPx, testPy, PLAYER_HALF_W, PLAYER_HALF_H)) {
							ds.playerPx = testPx;
							ds.playerPy = testPy;
							found = true;
						}
					}
				}
			}
			if (!found) {
				ds.playerPx = midX;
				ds.playerPy = midY;
			}
		}

		enterRoom(ds);
		if (repositionHelpersFn) repositionHelpersFn(ds);
	}

	/** Populate a room with enemies and pickups. */
	function enterRoom(ds) {
		const chunk = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!chunk) return;
		chunk.visited = true;
		clearAllEffects(ds);
		// Clear environmental hazards from previous room
		ds._lavaTrails = [];
		ds._deathExplosions = [];
		ds._webTraps = [];

		if (chunk.cleared) {
			ds.roomEnemies = [];
			ds.roomPickups = chunk._savedPickups || [];
			ds.boss = null;
			return;
		}

		const { tw, th } = tileSize();
		const diff = getEffectiveDifficulty(ds);
		const coinMult = ds?.runModifierEffects?.coinMult || 1;
		const floor = ds.currentFloor.floor;
		const band = resolveDepthBand(ds.endlessDepth || floor);
		const pool = getFloorPool(floor);
		const signatureType = SIGNATURE_BY_BAND[band] || 'seeigel';
		ds.depthBand = band;
		ds.signatureEnemyType = signatureType;
		ds.roomEnemies = [];
		ds.roomPickups = [];
		ds.boss = null;
		const aliveEnemyLimit = 12 + (diff.spawnCountBonus || 0);
		ds.maxAliveEnemies = Math.max(12, Math.floor(aliveEnemyLimit));
		const aliveEnemyCount = () => ds.roomEnemies.reduce((sum, enemy) => sum + (enemy && enemy.alive !== false ? 1 : 0), 0);

		// Boss room
		if (chunk.type === "boss") {
			spawnBossFn(ds);
			return;
		}

		const enemyStatDefs = dungeonData.enemyStats || {};

		for (const sp of chunk.spawns) {
			const px = (sp.x + 0.5) * tw;
			const py = (sp.y + 0.5) * th;
			if (sp.type === "enemy") {
				if (aliveEnemyCount() >= ds.maxAliveEnemies) continue;
				const et = pickWeightedEnemy(pool, floor);
				const stats = enemyStatDefs[et] || {};
				const baseHP = stats.baseHP || 3;
				const hp = Math.ceil(baseHP * diff.enemyHPScale);
				const ai = stats.ai || "drift";
				ds.roomEnemies.push({
					px, py, targetPx: px, targetPy: py,
					type: et, hp, maxHp: hp,
					alive: true, color: stats.color || ENEMY_COLORS[et] || "#ff4444",
					speed: stats.speed || 0.04,
					damage: Math.max(1, Math.round((stats.damage || 1) * (diff.damageScale || 1))),
					ai,
					sway: Math.random() * 6.28, bobPhase: Math.random() * 5000,
					bobOffset: 0, hitFlash: 0, scale: 0.7 + Math.random() * 0.3,
					shootTimer: stats.shootInterval || 3000,
					shootInterval: stats.shootInterval || 3000,
					projectileSpeed: stats.projectileSpeed || 0.2,
					inkTimer: stats.inkInterval || 5000,
					inkInterval: stats.inkInterval || 5000,
					shockwaveTimer: stats.shockwaveInterval || 4000,
					shockwaveInterval: stats.shockwaveInterval || 4000,
					frontalArmor: stats.frontalArmor || 0,
					onHitEffect: buildOnHitEffect(stats),
					frostAura: stats.frostAura || false,
					frostRadius: stats.frostRadius || 0,
					slowAmount: stats.slowAmount || 0,
					lavaTrail: stats.lavaTrail || false,
					lavaTrailDuration: stats.lavaTrailDuration || 0,
					deathExplosionDelay: stats.deathExplosionDelay || 0,
					deathExplosionRadius: stats.deathExplosionRadius || 0,
					webTrap: stats.webTrap || false,
					hidden: ai === "ambush" || ai === "ambush_static",
					ambushCooldown: 0,
					exploding: false,
					explodeTimer: 0,
					inkCloud: null,
					shockwave: null,
					enemyProjectiles: []
				});
			} else if (sp.type === "loot") {
				ds.roomPickups.push({ px, py, type: "coin", value: Math.max(1, Math.floor((diff.coinReward / 2) * coinMult)), collected: false });
			}
		}

		if ((diff.spawnCountBonus || 0) > 0 && aliveEnemyCount() > 0) {
			const enemyStatDefsLocal = dungeonData.enemyStats || {};
			for (let i = 0; i < diff.spawnCountBonus && aliveEnemyCount() < ds.maxAliveEnemies; i++) {
				const et = pickWeightedEnemy(pool);
				const stats = enemyStatDefsLocal[et] || {};
				const baseHP = stats.baseHP || 3;
				const hp = Math.ceil(baseHP * diff.enemyHPScale);

				let px = roomWidth(ds) * (0.2 + Math.random() * 0.6);
				let py = roomHeight(ds) * (0.2 + Math.random() * 0.6);
				for (let attempts = 0; attempts < 18; attempts++) {
					const testPx = roomWidth(ds) * (0.15 + Math.random() * 0.7);
					const testPy = roomHeight(ds) * (0.2 + Math.random() * 0.65);
					if (!boxHitsWall(chunk.grid, testPx, testPy, ENEMY_HALF, ENEMY_HALF)) {
						px = testPx;
						py = testPy;
						break;
					}
				}

				ds.roomEnemies.push({
					px,
					py,
					targetPx: px,
					targetPy: py,
					type: et,
					hp,
					maxHp: hp,
					alive: true,
					color: stats.color || ENEMY_COLORS[et] || "#ff4444",
					speed: stats.speed || 0.04,
					damage: Math.max(1, Math.round((stats.damage || 1) * (diff.damageScale || 1))),
					ai: stats.ai || "drift",
					sway: Math.random() * 6.28,
					bobPhase: Math.random() * 5000,
					bobOffset: 0,
					hitFlash: 0,
					scale: 0.7 + Math.random() * 0.3,
					shootTimer: stats.shootInterval || 3000,
					shootInterval: stats.shootInterval || 3000,
					projectileSpeed: stats.projectileSpeed || 0.2,
					inkTimer: stats.inkInterval || 5000,
					inkInterval: stats.inkInterval || 5000,
					shockwaveTimer: stats.shockwaveInterval || 4000,
					shockwaveInterval: stats.shockwaveInterval || 4000,
					frontalArmor: stats.frontalArmor || 0,
					onHitEffect: buildOnHitEffect(stats),
					frostAura: stats.frostAura || false,
					frostRadius: stats.frostRadius || 0,
					slowAmount: stats.slowAmount || 0,
					lavaTrail: stats.lavaTrail || false,
					lavaTrailDuration: stats.lavaTrailDuration || 0,
					deathExplosionDelay: stats.deathExplosionDelay || 0,
					deathExplosionRadius: stats.deathExplosionRadius || 0,
					webTrap: stats.webTrap || false,
					hidden: (stats.ai || "drift") === "ambush" || (stats.ai || "drift") === "ambush_static",
					ambushCooldown: 0,
					exploding: false,
					explodeTimer: 0,
					inkCloud: null,
					shockwave: null,
					enemyProjectiles: []
				});
			}
		}

		if (ds.roomEnemies.length > 0 && signatureType) {
			const hasSignature = ds.roomEnemies.some(enemy => enemy?.type === signatureType);
			if (!hasSignature) {
				const idx = Math.floor(Math.random() * ds.roomEnemies.length);
				const targetEnemy = ds.roomEnemies[idx];
				const signatureStats = enemyStatDefs[signatureType] || enemyStatDefs.qualle || {};
				targetEnemy.type = signatureType;
				targetEnemy.ai = signatureStats.ai || targetEnemy.ai || 'drift';
				targetEnemy.color = signatureStats.color || targetEnemy.color;
				targetEnemy.speed = signatureStats.speed || targetEnemy.speed;
				targetEnemy.damage = Math.max(1, Math.round((signatureStats.damage || 1) * (diff.damageScale || 1)));
				targetEnemy.frontalArmor = signatureStats.frontalArmor || 0;
				targetEnemy.shootInterval = signatureStats.shootInterval || 3000;
				targetEnemy.shootTimer = targetEnemy.shootInterval;
				targetEnemy.projectileSpeed = signatureStats.projectileSpeed || 0.2;
				targetEnemy.inkInterval = signatureStats.inkInterval || 5000;
				targetEnemy.inkTimer = targetEnemy.inkInterval;
				targetEnemy.shockwaveInterval = signatureStats.shockwaveInterval || 4000;
				targetEnemy.shockwaveTimer = targetEnemy.shockwaveInterval;
				targetEnemy.hidden = targetEnemy.ai === 'ambush';
				targetEnemy.ambushCooldown = 0;
				targetEnemy.exploding = false;
				targetEnemy.explodeTimer = 0;
				const signatureHp = Math.ceil((signatureStats.baseHP || 3) * diff.enemyHPScale);
				targetEnemy.maxHp = signatureHp;
				targetEnemy.hp = signatureHp;
			}
		}

		if (ds.roomEnemies.length > aliveEnemyLimit) {
			ds.roomEnemies = ds.roomEnemies
				.sort(() => Math.random() - 0.5)
				.slice(0, aliveEnemyLimit);
		}
		if (signatureType && ds.roomEnemies.length > 0 && !ds.roomEnemies.some(enemy => enemy?.type === signatureType)) {
			const idx = Math.floor(Math.random() * ds.roomEnemies.length);
			const targetEnemy = ds.roomEnemies[idx];
			const signatureStats = enemyStatDefs[signatureType] || enemyStatDefs.qualle || {};
			targetEnemy.type = signatureType;
			targetEnemy.ai = signatureStats.ai || targetEnemy.ai || 'drift';
			targetEnemy.color = signatureStats.color || targetEnemy.color;
			targetEnemy.speed = signatureStats.speed || targetEnemy.speed;
			targetEnemy.damage = Math.max(1, Math.round((signatureStats.damage || 1) * (diff.damageScale || 1)));
			targetEnemy.frontalArmor = signatureStats.frontalArmor || 0;
			targetEnemy.shootInterval = signatureStats.shootInterval || 3000;
			targetEnemy.shootTimer = targetEnemy.shootInterval;
			targetEnemy.projectileSpeed = signatureStats.projectileSpeed || 0.2;
			targetEnemy.inkInterval = signatureStats.inkInterval || 5000;
			targetEnemy.inkTimer = targetEnemy.inkInterval;
			targetEnemy.shockwaveInterval = signatureStats.shockwaveInterval || 4000;
			targetEnemy.shockwaveTimer = targetEnemy.shockwaveInterval;
			targetEnemy.hidden = targetEnemy.ai === 'ambush';
			targetEnemy.ambushCooldown = 0;
			targetEnemy.exploding = false;
			targetEnemy.explodeTimer = 0;
			const signatureHp = Math.ceil((signatureStats.baseHP || 3) * diff.enemyHPScale);
			targetEnemy.maxHp = signatureHp;
			targetEnemy.hp = signatureHp;
		}
		if (ds.roomEnemies.length > 0) {
			for (const enemy of ds.roomEnemies) {
				if (!enemy || !enemy.alive) continue;
				enemy.behaviorPattern = null;
				if (band === 'mid') {
					if ((enemy.ai === 'drift' || enemy.ai === 'ground' || enemy.ai === 'tank') && Math.random() < 0.28) {
						enemy.behaviorPattern = 'flank';
					}
				} else if (band === 'late') {
					if ((enemy.ai === 'drift' || enemy.ai === 'ground' || enemy.ai === 'tank') && Math.random() < 0.35) {
						enemy.behaviorPattern = 'flank';
					} else if ((enemy.ai === 'turret' || enemy.ai === 'flee' || enemy.ai === 'elite') && Math.random() < 0.35) {
						enemy.behaviorPattern = 'kite';
					}
				}
			}
		}
		// Spawn floor elite in combat rooms (1 elite per floor, spawns in first combat room)
		if (chunk.type === "combat" && !ds._eliteSpawnedThisFloor) {
			const eliteDef = getFloorElite(floor);
			if (eliteDef) {
				spawnElite(ds, floor, chunk, diff);
				ds._eliteSpawnedThisFloor = true;
			}
		}
		if (ds.roomEnemies.length === 0) chunk.cleared = true;
	}

	/** Build onHitEffect from enemy stat definitions (freeze, stun, slow, burn, poison). */
	function buildOnHitEffect(stats) {
		if (stats.freezeOnHit) return { type: 'freeze', duration: stats.freezeDuration || 800 };
		if (stats.stunOnHit)   return { type: 'stun',   duration: stats.stunDuration   || 600 };
		if (stats.slowOnHit)   return { type: 'slow',   duration: stats.slowDuration   || 1500, magnitude: stats.slowAmount || 0.4 };
		if (stats.burnOnHit)   return { type: 'burn',   duration: stats.burnDuration   || 2000, magnitude: stats.burnDPS   || 0.5 };
		if (stats.poisonOnHit) return { type: 'poison', duration: stats.poisonDuration || 3000, magnitude: stats.poisonDPS || 0.3 };
		return null;
	}

	/** Weighted random pick from the enemy pool. */
	function pickWeightedEnemy(pool) {
		if (!pool || pool.length === 0) return "qualle";
		const totalW = pool.reduce((s, p) => s + (p.w || 1), 0);
		let roll = Math.random() * totalW;
		for (const entry of pool) {
			roll -= (entry.w || 1);
			if (roll <= 0) return entry.type;
		}
		return pool[pool.length - 1].type;
	}

	/** Check if the player reached the exit portal. */
	function exitCheck(ds) {
		const c = ds.currentFloor.grid[ds.currentRoomY]?.[ds.currentRoomX];
		if (!c || c.type !== "exit" || !c.cleared) return;
		const { tw, th } = tileSize();
		const p = c.spawns.find(s => s.type === "exitPortal");
		if (!p) return;
		if (Math.hypot(ds.playerPx - (p.x + 0.5) * tw, ds.playerPy - (p.y + 0.5) * th) < 40) {
			if (ds.currentFloor.floor >= 50) { if (onDungeonComplete) onDungeonComplete(ds); }
			else ds.nextFloorRequested = true;
		}
	}

	return {
		pickupCheck,
		roomClearCheck,
		doorCheck,
		finishTransition,
		enterRoom,
		exitCheck,
		tickDoorCooldown,
		resetDoorCooldown
	};
}
