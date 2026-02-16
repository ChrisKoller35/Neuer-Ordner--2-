/**
 * Player Update System
 * Handles player movement, energy, shield, and shooting
 */

import { shotPool } from '../core/pool.js';

/**
 * Creates the player update system
 * @param {Object} ctx - Context with dependencies
 */
export function createPlayerUpdateSystem(ctx) {
	const {
		getState,
		getCanvas,
		getPointer,
		hasKey,
		clamp,
		SHIELD_COOLDOWN,
		SHIELD_DURATION,
		KEY_LEFT,
		KEY_RIGHT,
		KEY_UP,
		KEY_DOWN,
		resolvePlayerCoverCollision
	} = ctx;

	/**
	 * Fire a shot from the player
	 */
	function playerShoot() {
		const state = getState();
		if (state.over || state.paused || !state.started) return;

		const player = state.player;
		if (player.shotCooldown > 0) return;

		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		const energyCost = player.energyCost == null ? 35 : player.energyCost;
		if ((player.energy == null ? energyMax : player.energy) < energyCost) return;

		// Object Pool: Wiederverwendung statt Neuerstellung
		const shot = shotPool.acquire();
		shot.x = player.x + 26;
		shot.y = player.y - 6;
		shot.vx = 0.64;
		shot.vy = -0.02;
		shot.life = 900;
		shot.spriteScale = 0.1;
		shot.spriteOffsetX = 6;
		shot.spriteOffsetY = 0;
		state.shots.push(shot);

		player.energy = Math.max(0, (player.energy == null ? energyMax : player.energy) - energyCost);
		if (player.energy <= 0) {
			player.energyRegenTimer = player.energyRegenDelay == null ? 1200 : player.energyRegenDelay;
		}
		player.shotCooldown = 220;
	}

	/**
	 * Update player state (movement, energy, shield, etc.)
	 */
	function updatePlayer(dt) {
		const state = getState();
		const canvas = getCanvas();
		const pointer = getPointer();
		const player = state.player;

		const prevX = player.x;
		const prevY = player.y;

		// Update timers
		if (player.invulnFor > 0) player.invulnFor = Math.max(0, player.invulnFor - dt);
		if (player.shotCooldown > 0) player.shotCooldown = Math.max(0, player.shotCooldown - dt);

		// Energy regeneration
		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		if (player.energy == null) player.energy = energyMax;
		if (player.energyRegenTimer == null) player.energyRegenTimer = 0;

		if (player.energyRegenTimer > 0) {
			player.energyRegenTimer = Math.max(0, player.energyRegenTimer - dt);
		} else if (player.energy < energyMax) {
			const regenRate = player.energyRegenRate == null ? 0.04 : player.energyRegenRate;
			player.energy = Math.min(energyMax, player.energy + regenRate * dt);
		}

		// Perfume slow effect
		if (player.perfumeSlowTimer > 0) {
			player.perfumeSlowTimer = Math.max(0, player.perfumeSlowTimer - dt);
		}

		// Shooting
		if (pointer.shoot) playerShoot();

		// Shield management
		if (player.shieldActive) {
			player.shieldTimer = Math.max(0, player.shieldTimer - dt);
			if (player.shieldTimer <= 0) {
				player.shieldActive = false;
				player.shieldTimer = 0;
				player.shieldCooldown = player.shieldCooldownMax == null ? SHIELD_COOLDOWN : player.shieldCooldownMax;
			}
		} else if (player.shieldCooldown > 0) {
			player.shieldCooldown = Math.max(0, player.shieldCooldown - dt);
		}

		// Movement
		const baseSpeed = player.baseSpeed == null ? player.speed : player.baseSpeed;
		const effectiveSpeed = player.perfumeSlowTimer > 0 ? baseSpeed * 0.72 : baseSpeed;

		let moveX = 0;
		let moveY = 0;

		if (hasKey(KEY_LEFT)) moveX -= 1;
		if (hasKey(KEY_RIGHT)) moveX += 1;
		if (hasKey(KEY_UP)) moveY -= 1;
		if (hasKey(KEY_DOWN)) moveY += 1;
		if (pointer.down) moveY -= 0.4;

		if (moveX || moveY) {
			const len = Math.hypot(moveX, moveY) || 1;
			const dx = (moveX / len) * effectiveSpeed * dt;
			const dy = (moveY / len) * effectiveSpeed * dt;
			
			// World Mode: Extended boundaries based on world width
			const worldMode = state.worldMode === true;
			const worldWidth = state.worldWidth || canvas.width;
			const maxX = worldMode ? worldWidth - 60 : canvas.width - 60;
			
			player.x = clamp(player.x + dx, 60, maxX);
			player.y = clamp(player.y + dy, 60, canvas.height - 60);
			if (Math.abs(moveX) > 0.1) player.dir = moveX > 0 ? 1 : -1;
		}

		// Cover rock collision
		resolvePlayerCoverCollision(player, prevX, prevY);
	}

	/**
	 * Update all player shots
	 */
	function updateShots(dt) {
		const state = getState();
		const canvas = getCanvas();

		for (const shot of state.shots) {
			shot.x += shot.vx * dt;
			shot.y += shot.vy * dt;
			shot.life -= dt;
			shot.vy -= 0.00012 * dt;
		}

		// Object Pool: NUR Shots die aus dem Pool kommen zurückgeben
		const deadShots = state.shots.filter(shot => 
			(shot.life <= 0 || 
			shot.x >= canvas.width + 120 || 
			shot.y <= -80 || 
			shot.y >= canvas.height + 80) && shot._pooled
		);
		shotPool.releaseAll(deadShots);
		
		state.shots = state.shots.filter(shot => 
			shot.life > 0 && 
			shot.x < canvas.width + 120 && 
			shot.y > -80 && 
			shot.y < canvas.height + 80
		);
	}

	return {
		playerShoot,
		updatePlayer,
		updateShots
	};
}
