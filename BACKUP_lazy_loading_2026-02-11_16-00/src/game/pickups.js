/**
 * Pickups Update System
 * Handles updating heals, symbols, coins, and coral effects
 */

/**
 * Creates the pickups update system
 * @param {Object} ctx - Context with dependencies
 */
export function createPickupsSystem(ctx) {
	const {
		getState,
		getCanvas,
		clamp,
		spawnHealPickup,
		collectSymbolDrop
	} = ctx;

	/**
	 * Update heal pickups and heal bursts
	 */
	function updateHealPickups(dt) {
		const state = getState();
		const canvas = getCanvas();

		state.healSpawnTimer -= dt;
		const canSpawn = !state.over && state.healPickups.length < 2;
		if (canSpawn && state.healSpawnTimer <= 0) {
			spawnHealPickup();
			state.healSpawnTimer = 10800 + Math.random() * 5200;
		}

		for (const heal of state.healPickups) {
			heal.x -= heal.vx * dt;
			heal.sway += dt * 0.0026;
			heal.y += Math.sin(heal.sway) * 0.08 * dt;
			heal.life -= dt;
		}
		state.healPickups = state.healPickups.filter(heal => heal.life > 0 && heal.x > -160 && heal.y > -120 && heal.y < canvas.height + 120);

		for (const burst of state.healBursts) {
			burst.x += burst.vx * dt;
			burst.y += burst.vy * dt;
			burst.vx *= 0.994;
			burst.vy *= 0.992;
			burst.life -= dt;
		}
		state.healBursts = state.healBursts.filter(burst => burst.life > 0);
	}

	/**
	 * Update coral visual effects
	 */
	function updateCoralEffects(dt) {
		const state = getState();
		if (state.coralEffects.length === 0) return;

		for (const fx of state.coralEffects) {
			fx.life = Math.max(0, fx.life - dt);
			if (fx.kind === "spark") {
				fx.rotation = (fx.rotation || 0) + (fx.rotationSpeed || 0) * dt;
			}
		}
		state.coralEffects = state.coralEffects.filter(fx => fx.life > 0);
	}

	/**
	 * Update symbol drops (abilities)
	 */
	function updateSymbolDrops(dt) {
		const state = getState();
		const canvas = getCanvas();
		if (state.symbolDrops.length === 0) return;

		for (const drop of state.symbolDrops) {
			drop.sway = (drop.sway || 0) + (drop.swaySpeed || 0.0024) * dt;
			const bob = Math.sin(drop.sway) * (drop.amplitude == null ? 8 : drop.amplitude) * 0.0022 * dt;
			drop.y += (drop.vy == null ? 0.014 : drop.vy) * dt + bob;
			drop.x += Math.cos(drop.sway * 0.65) * 0.0018 * dt * (drop.amplitude == null ? 8 : drop.amplitude);
			drop.x = clamp(drop.x, 80, canvas.width - 80);
			drop.y = clamp(drop.y, canvas.height * 0.18, canvas.height * 0.88);
			if (!drop.collected) {
				drop.life = Math.max(0, drop.life - dt);
				if (drop.life <= 0) collectSymbolDrop(drop, { auto: true });
			} else if (drop.cleanupTimer != null) {
				drop.cleanupTimer = Math.max(0, drop.cleanupTimer - dt);
			}
		}
		state.symbolDrops = state.symbolDrops.filter(drop => !drop.collected || drop.cleanupTimer == null || drop.cleanupTimer > 0);
	}

	/**
	 * Update coin drops
	 */
	function updateCoinDrops(dt) {
		const state = getState();
		const canvas = getCanvas();
		if (state.coinDrops.length === 0) return;

		const hoverBandTop = canvas.height * 0.34;
		const hoverBandBottom = canvas.height * 0.7;

		for (const coin of state.coinDrops) {
			if (coin.dead) continue;
			coin.spin = (coin.spin || 0) + (coin.spinSpeed || 0.006) * dt;

			if (coin.collected) {
				coin.collectTimer = Math.max(0, (coin.collectTimer || 0) - dt);
				coin.y -= 0.06 * dt;
				if (coin.collectTimer <= 0) coin.dead = true;
				continue;
			}

			coin.life = Math.max(0, (coin.life == null ? 12000 : coin.life) - dt);
			if (coin.life <= 0) {
				coin.dead = true;
				continue;
			}

			const hoverTarget = clamp(coin.hoverY == null ? canvas.height * 0.5 : coin.hoverY, hoverBandTop, hoverBandBottom);
			coin.hoverPhase = (coin.hoverPhase || 0) + (coin.hoverSpeed || 0.0026) * dt;
			const hoverOffset = Math.sin(coin.hoverPhase) * (coin.hoverAmplitude == null ? 24 : coin.hoverAmplitude);
			const targetY = hoverTarget + hoverOffset;
			const follow = coin.hoverFollow == null ? 0.0042 : coin.hoverFollow;
			coin.y += (targetY - coin.y) * follow * dt;

			const baseScroll = coin.scrollSpeed == null ? Math.abs(coin.vx == null ? 0.22 : coin.vx) : coin.scrollSpeed;
			const flow = -Math.max(0.14, baseScroll);
			coin.vx = flow;
			coin.x += coin.vx * dt;
			coin.x += Math.sin((coin.hoverPhase || 0) * 0.7 + (state.elapsed || 0) * 0.0018) * 0.02 * dt;
			coin.y = clamp(coin.y, hoverBandTop - 30, hoverBandBottom + 30);

			if (coin.x <= -40) {
				coin.dead = true;
				continue;
			}
		}
		state.coinDrops = state.coinDrops.filter(coin => !coin.dead);
	}

	/**
	 * Update bubbles
	 */
	function updateBubbles(dt) {
		const state = getState();
		const canvas = getCanvas();

		for (const bubble of state.bubbles) {
			bubble.y -= bubble.spd * dt;
			if (bubble.y < -10) {
				bubble.y = canvas.height + 10;
				bubble.x = Math.random() * canvas.width;
			}
		}
	}

	return {
		updateHealPickups,
		updateCoralEffects,
		updateSymbolDrops,
		updateCoinDrops,
		updateBubbles
	};
}
