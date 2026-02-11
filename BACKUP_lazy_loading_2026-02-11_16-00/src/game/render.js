// src/game/render.js
// Game Render-Funktionen: Heals, Coins, Symbols, Player, Shots, Event-Flash

const TAU = Math.PI * 2;

function clamp(v, min, max) {
	return v < min ? min : v > max ? max : v;
}

function clamp01(v) {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeOutCubic(t) {
	return 1 - Math.pow(1 - t, 3);
}

/**
 * Factory für das Game-Render-System
 * @param {Object} deps - Abhängigkeiten
 * @param {Function} deps.getCtx - Canvas 2D Context Getter
 * @param {Function} deps.getCanvas - Canvas Element Getter
 * @param {Function} deps.getState - Game State Getter
 * @param {Object} deps.SPRITES - Sprite-Objekte
 * @param {Object} deps.MODELS - Model-Zeichenfunktionen
 * @param {Object} deps.SYMBOL_DATA - Symbol-Konfiguration
 * @param {Function} deps.spriteReady - Prüft ob Sprite geladen
 * @param {Function} deps.getHealSprite - Holt Heal-Sprite
 * @param {number} deps.SHIELD_DURATION - Shield-Dauer
 * @param {number} deps.SYMBOL_AUTOCOLLECT_MS - Symbol Auto-Collect Zeit
 * @param {string} deps.DEBUG_BUILD_LABEL - Debug Label Text
 */
export function createGameRenderSystem(deps) {
	const {
		getCtx,
		getCanvas,
		getState,
		SPRITES,
		MODELS,
		SYMBOL_DATA,
		spriteReady,
		getHealSprite,
		SHIELD_DURATION,
		SYMBOL_AUTOCOLLECT_MS,
		DEBUG_BUILD_LABEL
	} = deps;

	function renderHeals() {
		const ctx = getCtx();
		const state = getState();
		if (state.healPickups.length === 0) return;
		const sprite = getHealSprite();
		if (sprite) {
			for (const heal of state.healPickups) {
				if (heal.life <= 0) continue;
				const scale = (heal.spriteScale || 0.1) * (heal.scale || 1);
				const baseW = sprite.naturalWidth || sprite.width;
				const baseH = sprite.naturalHeight || sprite.height;
				const drawW = baseW * scale;
				const drawH = baseH * scale;
				const alpha = clamp01(heal.life / 1000);
				ctx.save();
				ctx.translate(heal.x, heal.y);
				ctx.rotate(Math.sin(heal.sway * 0.4) * 0.04);
				ctx.globalAlpha = alpha < 0.9 ? Math.max(alpha, 0.1) : 0.95;
				ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
				ctx.restore();
			}
			return;
		}

		ctx.save();
		for (const heal of state.healPickups) {
			if (heal.life <= 0) continue;
			const radius = 14 * (heal.scale || 1);
			ctx.fillStyle = "rgba(120,220,200,0.55)";
			ctx.beginPath();
			ctx.arc(heal.x, heal.y, radius, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	function renderCoralEffects() {
		const ctx = getCtx();
		const state = getState();
		if (state.coralEffects.length === 0) return;
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		for (const fx of state.coralEffects) {
			const progress = fx.maxLife > 0 ? clamp01(1 - fx.life / fx.maxLife) : 1;
			const eased = easeOutCubic(progress);
			if (fx.kind === "ring") {
				const radius = fx.startRadius + (fx.endRadius - fx.startRadius) * eased;
				const thickness = fx.startLine + (fx.endLine - fx.startLine) * eased;
				const alpha = clamp01(fx.startAlpha + (fx.endAlpha - fx.startAlpha) * eased);
				ctx.save();
				ctx.globalAlpha = alpha;
				ctx.lineWidth = Math.max(0.6, thickness);
				ctx.strokeStyle = fx.mode === "spawn" ? "rgba(255,200,220,1)" : "rgba(255,170,200,1)";
				ctx.beginPath();
				ctx.arc(fx.x, fx.y, Math.max(2, radius), 0, TAU);
				ctx.stroke();
				ctx.restore();
			} else if (fx.kind === "spark") {
				const radius = fx.radiusStart + (fx.radiusEnd - fx.radiusStart) * eased;
				const fade = fx.mode === "spawn" ? 0.8 - progress * 0.45 : 0.7 - progress * 0.3;
				ctx.save();
				ctx.globalAlpha = clamp01(fade);
				MODELS.sparkle(ctx, fx.x, fx.y, { radius: Math.max(4, radius), rotation: fx.rotation || 0 });
				ctx.restore();
			}
		}
		ctx.restore();
	}

	function renderCoralAllies() {
		const ctx = getCtx();
		const state = getState();
		if (state.coralAllies.length === 0) return;
		const now = performance.now();
		ctx.save();
		for (const ally of state.coralAllies) {
			ctx.save();
			const x = ally.x == null ? state.player.x : ally.x;
			const y = ally.y == null ? state.player.y : ally.y;
			ctx.translate(x, y);
			const wobble = Math.sin((ally.bobPhase || 0) + now * 0.0022) * 0.1;
			const spriteKey = ally.spriteKey;
			const sprite = spriteKey && SPRITES[spriteKey] ? SPRITES[spriteKey] : null;
			const usingSprite = sprite && spriteReady(sprite);
			const baseRotation = usingSprite ? ally.spriteRotationOffset || 0 : 0;
			ctx.rotate(baseRotation + wobble * 0.2);
			if (usingSprite) {
				const scale = ally.spriteScale == null ? 0.22 : ally.spriteScale;
				const drawW = sprite.naturalWidth * scale;
				const drawH = sprite.naturalHeight * scale;
				const offsetX = ally.spriteOffsetX == null ? 0 : ally.spriteOffsetX;
				const offsetY = ally.spriteOffsetY == null ? 0 : ally.spriteOffsetY;
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
			} else {
				const bodyRadius = 18;
				const grad = ctx.createLinearGradient(0, -bodyRadius, 0, bodyRadius);
				grad.addColorStop(0, "rgba(255,188,210,0.95)");
				grad.addColorStop(1, "rgba(255,132,120,0.85)");
				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.ellipse(0, 0, bodyRadius * 0.9, bodyRadius * 0.6, 0, 0, TAU);
				ctx.fill();
				ctx.lineWidth = 3;
				ctx.strokeStyle = "rgba(255,245,235,0.65)";
				ctx.stroke();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderCoinDrops() {
		const ctx = getCtx();
		const state = getState();
		if (state.coinDrops.length === 0) return;
		ctx.save();
		for (const coin of state.coinDrops) {
			if (coin.dead) continue;
			const radius = 14 * (coin.scale || 1);
			const ratio = coin.collectDuration ? (coin.collectTimer || 0) / coin.collectDuration : 1;
			const alpha = coin.collected ? Math.max(0, ratio) : 1;
			ctx.save();
			ctx.translate(coin.x, coin.y);
			ctx.rotate(coin.spin || 0);
			ctx.globalAlpha = 0.85 * alpha;
			const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
			grad.addColorStop(0, "rgba(255,255,220,0.95)");
			grad.addColorStop(0.45, "rgba(255,215,110,0.9)");
			grad.addColorStop(1, "rgba(200,140,40,0.6)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius, radius * 0.7, 0, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,240,180,0.85)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(0, 0, radius * 0.85, radius * 0.58, 0, 0, TAU);
			ctx.stroke();
			ctx.restore();
			if (coin.collected && coin.collectTimer > 0) {
				const collectRatio = coin.collectDuration ? 1 - coin.collectTimer / coin.collectDuration : 0;
				ctx.save();
				ctx.globalAlpha = 0.7 * (1 - collectRatio * 0.8);
				ctx.fillStyle = "#ffe4a6";
				ctx.font = "bold 18px 'Trebuchet MS', 'Segoe UI', sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(`+${coin.value || 1}`, coin.x, coin.y - 24 - collectRatio * 28);
				ctx.restore();
			}
		}
		ctx.restore();
	}

	function renderHealBursts() {
		const ctx = getCtx();
		const state = getState();
		if (state.healBursts.length === 0) return;
		ctx.save();
		for (const burst of state.healBursts) {
			const lifeRatio = clamp01(burst.life / (burst.fade || 900));
			ctx.globalAlpha = lifeRatio * 0.8;
			MODELS.sparkle(ctx, burst.x, burst.y, { radius: burst.rad * lifeRatio * 0.9, rotation: burst.life * 0.002 });
		}
		ctx.restore();
	}

	function renderSymbolDrops() {
		const ctx = getCtx();
		const state = getState();
		if (state.symbolDrops.length === 0) return;
		ctx.save();
		for (const drop of state.symbolDrops) {
			const config = SYMBOL_DATA[drop.kind];
			const spriteKey = config && config.spriteKey;
			const sprite = spriteKey && SPRITES[spriteKey];
			const cleanup = drop.cleanupTimer == null ? SYMBOL_AUTOCOLLECT_MS : drop.cleanupTimer;
			const alpha = drop.collected ? clamp01(cleanup / 420) : 1;
			ctx.save();
			ctx.translate(drop.x, drop.y);
			ctx.globalAlpha = alpha;
			ctx.shadowColor = drop.collected ? "rgba(119,255,204,0.35)" : "rgba(119,255,204,0.5)";
			ctx.shadowBlur = drop.collected ? 6 : 16;
			const baseScale = drop.scale == null ? 0.26 : drop.scale;
			if (sprite && spriteReady(sprite)) {
				const drawW = sprite.naturalWidth * baseScale;
				const drawH = sprite.naturalHeight * baseScale;
				ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
			} else {
				ctx.fillStyle = "rgba(255,255,255,0.85)";
				ctx.beginPath();
				ctx.arc(0, 0, 18 * baseScale * 4, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function renderDebugLabel() {
		const ctx = getCtx();
		const canvas = getCanvas();
		ctx.save();
		ctx.fillStyle = "rgba(255,255,255,0.8)";
		ctx.font = "12px 'Segoe UI', sans-serif";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(DEBUG_BUILD_LABEL, 12, canvas.height - 8);
		ctx.restore();
	}

	function renderPlayer() {
		const ctx = getCtx();
		const state = getState();
		const player = state.player;
		const now = performance.now();
		if (player.shieldUnlocked) {
			const duration = player.shieldDuration || SHIELD_DURATION;
			if (player.shieldActive) {
				const ratio = clamp01(player.shieldTimer / Math.max(1, duration));
				const outerRadius = 88 + Math.sin(now * 0.006 + ratio * 5.4) * 8;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalCompositeOperation = "lighter";
				ctx.globalAlpha = 0.75;
				const shieldGrad = ctx.createRadialGradient(0, 0, outerRadius * 0.35, 0, 0, outerRadius);
				shieldGrad.addColorStop(0, "rgba(210,250,255,0.82)");
				shieldGrad.addColorStop(0.45, `rgba(140,220,255,${0.58 + ratio * 0.24})`);
				shieldGrad.addColorStop(1, "rgba(20,80,140,0)");
				ctx.fillStyle = shieldGrad;
				ctx.beginPath();
				ctx.arc(0, 0, outerRadius, 0, TAU);
				ctx.fill();
				ctx.globalCompositeOperation = "source-over";
				ctx.lineWidth = 3.6;
				ctx.strokeStyle = `rgba(170,230,255,${0.55 + 0.35 * ratio})`;
				ctx.beginPath();
				ctx.arc(0, 0, outerRadius * 0.84, 0, TAU);
				ctx.stroke();
				const swings = 4;
				for (let i = 0; i < swings; i += 1) {
					const angle = now * 0.002 + i * (TAU / swings);
					ctx.save();
					ctx.rotate(angle);
					ctx.globalAlpha = 0.4 + 0.25 * Math.sin(now * 0.004 + i);
					ctx.strokeStyle = "rgba(210,255,255,0.4)";
					ctx.lineWidth = 1.6;
					ctx.beginPath();
					ctx.ellipse(0, 0, outerRadius * 0.62, outerRadius * 0.2, 0, 0, TAU);
					ctx.stroke();
					ctx.restore();
				}
				ctx.restore();
			} else if (player.shieldCooldown <= 0) {
				const haloRadius = 58 + Math.sin(now * 0.008) * 4;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalAlpha = 0.35;
				ctx.strokeStyle = "rgba(170,230,255,0.7)";
				ctx.lineWidth = 2.2;
				ctx.beginPath();
				ctx.arc(0, 0, haloRadius, 0, TAU);
				ctx.stroke();
				ctx.restore();
			}
			if (player.shieldLastBlock && now - player.shieldLastBlock < 360) {
				const pulseRatio = 1 - (now - player.shieldLastBlock) / 360;
				const rippleRadius = 60 + pulseRatio * 30;
				ctx.save();
				ctx.translate(player.x, player.y);
				ctx.globalAlpha = 0.35 * pulseRatio;
				ctx.strokeStyle = "rgba(220,255,255,0.6)";
				ctx.lineWidth = 3 * pulseRatio;
				ctx.beginPath();
				ctx.arc(0, 0, rippleRadius, 0, TAU);
				ctx.stroke();
				ctx.restore();
			}
		}
		if (player.perfumeSlowTimer > 0) {
			const slowRatio = clamp01((player.perfumeSlowTimer || 0) / 2600);
			const auraRadius = 56 + Math.sin(now * 0.005 + (player.perfumeSlowTimer || 0) * 0.001) * 6;
			ctx.save();
			ctx.translate(player.x, player.y);
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = 0.55 * slowRatio;
			const auraGrad = ctx.createRadialGradient(0, 0, auraRadius * 0.25, 0, 0, auraRadius);
			auraGrad.addColorStop(0, "rgba(255,245,255,0.85)");
			auraGrad.addColorStop(0.45, "rgba(255,170,240,0.5)");
			auraGrad.addColorStop(1, "rgba(150,40,180,0)");
			ctx.fillStyle = auraGrad;
			ctx.beginPath();
			ctx.arc(0, 0, auraRadius, 0, TAU);
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.lineWidth = 2.8;
			ctx.strokeStyle = `rgba(255,160,245,${0.4 + 0.3 * slowRatio})`;
			ctx.beginPath();
			ctx.arc(0, 0, auraRadius * 0.82, 0, TAU);
			ctx.stroke();
			ctx.restore();
		}
		const energyMax = player.energyMax == null ? 100 : player.energyMax;
		const energyValue = clamp(player.energy == null ? energyMax : player.energy, 0, energyMax);
		const energyRatio = energyMax > 0 ? energyValue / energyMax : 0;
		const barWidth = 90;
		const barHeight = 8;
		const barCenterX = player.x - player.dir * 70;
		const barX = barCenterX - barWidth / 2;
		const barY = player.y - 44;
		ctx.save();
		ctx.globalAlpha = 0.82;
		ctx.fillStyle = "rgba(6,16,28,0.65)";
		ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
		ctx.fillStyle = "rgba(18,32,52,0.9)";
		ctx.fillRect(barX, barY, barWidth, barHeight);
		const energyGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
		energyGrad.addColorStop(0, "#62f5ff");
		energyGrad.addColorStop(1, "#2fb8ff");
		ctx.fillStyle = energyGrad;
		ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);
		ctx.strokeStyle = "rgba(220,245,255,0.5)";
		ctx.lineWidth = 1.6;
		ctx.strokeRect(barX, barY, barWidth, barHeight);
		ctx.restore();
		ctx.save();
		if (player.invulnFor > 0 && Math.floor(player.invulnFor / 120) % 2 === 0) ctx.globalAlpha = 0.45;
		MODELS.simpleShadow(ctx, player.x + 12, player.y + 36, 26);
		MODELS.player(ctx, player.x, player.y, { dir: player.dir, scale: 1 });
		ctx.restore();
	}

	function renderShots() {
		const ctx = getCtx();
		const state = getState();
		const sprite = SPRITES.shot;
		if (spriteReady(sprite)) {
			ctx.save();
			for (const shot of state.shots) {
				if (shot.life <= 0) continue;
				const scale = shot.spriteScale == null ? 0.1 : shot.spriteScale;
				const drawW = sprite.naturalWidth * scale;
				const drawH = sprite.naturalHeight * scale;
				const offsetX = shot.spriteOffsetX == null ? 0 : shot.spriteOffsetX;
				const offsetY = shot.spriteOffsetY == null ? 0 : shot.spriteOffsetY;
				ctx.save();
				ctx.translate(shot.x, shot.y);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
			}
			ctx.restore();
			return;
		}

		ctx.save();
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			const radius = shot.coralShot ? 5.2 : 4;
			const grad = ctx.createRadialGradient(shot.x, shot.y, radius * 0.2, shot.x, shot.y, radius);
			if (shot.coralShot) {
				grad.addColorStop(0, "rgba(255,225,210,0.95)");
				grad.addColorStop(1, "rgba(255,140,120,0.12)");
			} else {
				grad.addColorStop(0, "rgba(180,240,255,0.9)");
				grad.addColorStop(1, "rgba(120,200,255,0.05)");
			}
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(shot.x, shot.y, radius, 0, TAU);
			ctx.fill();
		}
		ctx.restore();
	}

	function renderEventFlash() {
		const ctx = getCtx();
		const canvas = getCanvas();
		const state = getState();
		const flash = state.eventFlash;
		if (!flash) return;
		const now = performance.now();
		const elapsed = now - flash.started;
		if (elapsed >= flash.duration) {
			state.eventFlash = null;
			return;
		}
		const fade = clamp01(1 - elapsed / flash.duration);
		const eased = fade * fade;
		const overlayOpacity = (flash.opacity || 0.9) * eased * 0.45;
		ctx.save();
		if (flash.kind !== "heal") {
			ctx.fillStyle = `rgba(255,250,230,${overlayOpacity})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		if (flash.text) {
			ctx.font = "28px 'Trebuchet MS', 'Segoe UI', sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			if (flash.kind === "heal") {
				ctx.fillStyle = `rgba(180,255,240,${Math.min(0.85, eased)})`;
				ctx.strokeStyle = "rgba(0,110,140,0.35)";
			} else {
				ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, overlayOpacity * 2)})`;
				ctx.strokeStyle = "rgba(15,40,60,0.45)";
			}
			ctx.lineWidth = 4;
			ctx.strokeText(flash.text, canvas.width / 2, canvas.height * 0.18);
			ctx.fillText(flash.text, canvas.width / 2, canvas.height * 0.18);
		}
		ctx.restore();
	}

	return {
		renderHeals,
		renderCoralEffects,
		renderCoralAllies,
		renderCoinDrops,
		renderHealBursts,
		renderSymbolDrops,
		renderDebugLabel,
		renderPlayer,
		renderShots,
		renderEventFlash
	};
}
