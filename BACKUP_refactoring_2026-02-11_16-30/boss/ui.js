// Boss-UI-Funktionen - ausgelagert aus game.js
// Rendering für Boss HP-Bar und Boss-Sprite
//
// Enthält: renderBossHpBar, renderBoss

import { clamp01 } from '../core/utils.js';

/**
 * Erstellt das Boss-UI-System
 * @param {Object} deps - Abhängigkeiten
 */
export function createBossUISystem(deps) {
	const {
		getCtx,
		getCanvas,
		getState,
		getMODELS
	} = deps;

	function renderBossHpBar() {
		const ctx = getCtx();
		const canvas = getCanvas();
		const state = getState();
		const boss = state.boss;
		if (!boss.active) return;
		const padX = 160;
		const padY = 26;
		const barWidth = canvas.width - padX * 2;
		const barHeight = 18;
		const ratio = boss.maxHp > 0 ? clamp01(boss.hp / boss.maxHp) : 0;
		ctx.save();
		ctx.translate(padX, padY);
		ctx.fillStyle = "rgba(4,12,24,0.6)";
		ctx.fillRect(-6, -6, barWidth + 12, barHeight + 12);
		ctx.fillStyle = "rgba(18,32,52,0.9)";
		ctx.fillRect(0, 0, barWidth, barHeight);
		const gradient = ctx.createLinearGradient(0, 0, barWidth, 0);
		gradient.addColorStop(0, "#ff7aa2");
		gradient.addColorStop(1, "#ffd18d");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, barWidth * ratio, barHeight);
		ctx.strokeStyle = "rgba(240,248,255,0.45)";
		ctx.lineWidth = 2;
		ctx.strokeRect(0, 0, barWidth, barHeight);
		ctx.fillStyle = "#f2f7ff";
		ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`Boss HP ${Math.ceil(boss.hp)}/${boss.maxHp}`, barWidth / 2, barHeight / 2);
		ctx.restore();
	}

	function renderBoss() {
		const ctx = getCtx();
		const state = getState();
		const MODELS = getMODELS();
		const boss = state.boss;
		if (!boss.active) return;
		const shadowRadius = boss.shadowRadius == null ? 48 : boss.shadowRadius;
		const shadowOffsetX = boss.shadowOffsetX == null ? 16 : boss.shadowOffsetX;
		const shadowOffsetY = boss.shadowOffsetY == null ? 52 : boss.shadowOffsetY;
		MODELS.simpleShadow(ctx, boss.x + shadowOffsetX, boss.y + shadowOffsetY, shadowRadius);
		MODELS.boss(ctx, boss.x, boss.y, {
			pulse: boss.pulse,
			spriteKey: boss.spriteKey,
			spriteScale: boss.spriteScale == null ? undefined : boss.spriteScale,
			spriteOffsetX: boss.spriteOffsetX == null ? undefined : boss.spriteOffsetX,
			spriteOffsetY: boss.spriteOffsetY == null ? undefined : boss.spriteOffsetY,
			flip: boss.spriteFlip !== false
		});
	}

	return {
		renderBossHpBar,
		renderBoss
	};
}
