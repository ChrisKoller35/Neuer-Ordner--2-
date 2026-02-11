// ============================================================
// MODELS - Render-Funktionen für Spielobjekte
// Factory-Pattern: createModels(SPRITES, spriteReady) 
// ============================================================
"use strict";

import { TAU } from '../core/constants.js';

/**
 * Fallback-Zeichenfunktion für Spieler wenn kein Sprite geladen
 */
function drawPlayerFallback(ctx, x, y, opts = {}) {
	const scale = opts.scale == null ? 1 : opts.scale;
	const dir = opts.dir == null ? 1 : opts.dir;
	const accent = opts.accent || "#8df0ff";

	ctx.save();
	ctx.translate(x, y);
	ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	const tailGradient = ctx.createLinearGradient(-96, 0, -56, 0);
	tailGradient.addColorStop(0, "#052c3f");
	tailGradient.addColorStop(1, "#0e5a78");
	ctx.fillStyle = tailGradient;
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-102, -30, -68, -18);
	ctx.quadraticCurveTo(-74, -2, -78, -6);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(-78, -6);
	ctx.quadraticCurveTo(-98, 18, -68, 10);
	ctx.quadraticCurveTo(-72, -2, -78, -6);
	ctx.closePath();
	ctx.fill();

	const bodyGradient = ctx.createLinearGradient(-78, 0, 72, 0);
	bodyGradient.addColorStop(1, accent);
	ctx.fillStyle = bodyGradient;
	ctx.beginPath();
	ctx.moveTo(-74, -8);
	ctx.quadraticCurveTo(-64, -36, -16, -42);
	ctx.quadraticCurveTo(48, -46, 76, -6);
	ctx.quadraticCurveTo(82, 16, 56, 34);
	ctx.quadraticCurveTo(4, 56, -34, 30);
	ctx.quadraticCurveTo(-70, 12, -74, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0d5780";
	ctx.beginPath();
	ctx.moveTo(-28, -26);
	ctx.quadraticCurveTo(-8, -54, 16, -30);
	ctx.quadraticCurveTo(-4, -22, -28, -26);
	ctx.closePath();
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(-42, 10);
	ctx.quadraticCurveTo(-8, 0, 12, 18);
	ctx.quadraticCurveTo(-10, 26, -38, 20);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#d3f3ff";
	ctx.beginPath();
	ctx.moveTo(-32, 10);
	ctx.quadraticCurveTo(6, 32, 42, 12);
	ctx.quadraticCurveTo(8, -2, -32, 10);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a3e58";
	ctx.beginPath();
	ctx.moveTo(0, -10);
	ctx.lineTo(10, -36);
	ctx.lineTo(22, -12);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0c4c6d";
	ctx.beginPath();
	ctx.moveTo(4, 16);
	ctx.lineTo(20, 34);
	ctx.lineTo(26, 16);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#0a1e2d";
	ctx.beginPath();
	ctx.moveTo(34, -8);
	ctx.quadraticCurveTo(52, -2, 46, 8);
	ctx.quadraticCurveTo(30, 6, 34, -8);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(34, -4, 7.6, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#1a4a72";
	ctx.beginPath();
	ctx.arc(36.2, -4.6, 4.4, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "#081017";
	ctx.beginPath();
	ctx.arc(37.6, -5, 2.2, 0, TAU);
	ctx.fill();
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	ctx.beginPath();
	ctx.arc(35, -6.4, 1.2, 0, TAU);
	ctx.fill();

	ctx.strokeStyle = "rgba(214,244,255,0.75)";
	ctx.lineWidth = 1.6 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(18, 2);
	ctx.quadraticCurveTo(12, 12, 6, 18);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(14, -6);
	ctx.quadraticCurveTo(8, -4, 2, -2);
	ctx.quadraticCurveTo(10, 0, 18, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(8, -12);
	ctx.lineTo(4, -8);
	ctx.lineTo(2, -4);
	ctx.stroke();

	ctx.strokeStyle = "rgba(15,53,70,0.65)";
	ctx.lineWidth = 1 / Math.max(scale, 0.001);
	ctx.beginPath();
	ctx.moveTo(-6, -6);
	ctx.quadraticCurveTo(-4, -2, -2, 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-12, -8);
	ctx.quadraticCurveTo(-10, -4, -8, 0);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(-18, -10);
	ctx.quadraticCurveTo(-16, -6, -14, -2);
	ctx.stroke();

	ctx.restore();
}

/**
 * Erstellt MODELS-Objekt mit allen Render-Funktionen
 * @param {Object} SPRITES - Sprite-Proxy-Objekt
 * @param {Function} spriteReady - Funktion zum Prüfen ob Sprite geladen
 * @returns {Object} MODELS-Objekt
 */
export function createModels(SPRITES, spriteReady) {
	return {
		player(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const dir = opts.dir == null ? 1 : opts.dir;
			const image = SPRITES.player;
			if (spriteReady(image)) {
				const baseScale = opts.spriteScale == null ? 0.16 : opts.spriteScale;
				const drawW = image.naturalWidth * baseScale;
				const drawH = image.naturalHeight * baseScale;
				const offsetX = opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX;
				const offsetY = opts.spriteOffsetY == null ? 0 : opts.spriteOffsetY;
				ctx.save();
				ctx.translate(x, y);
				ctx.scale((dir >= 0 ? 1 : -1) * scale, scale);
				ctx.drawImage(image, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			drawPlayerFallback(ctx, x, y, { scale, dir, accent: opts.accent });
		},
		boss(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const pulse = opts.pulse == null ? 0 : opts.pulse;
			const spriteKey = opts.spriteKey;
			const sprite = spriteKey && SPRITES[spriteKey] ? SPRITES[spriteKey] : SPRITES.boss;
			const flip = opts.flip == null ? true : !!opts.flip;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.22 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? -20 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				if (flip) ctx.scale(-1, 1);
				ctx.rotate(Math.sin(pulse) * 0.04);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale((flip ? -1 : 1) * scale, scale);
			ctx.rotate(Math.sin(pulse) * 0.04);
			ctx.lineJoin = "round";
			ctx.lineCap = "round";

			const tailGradient = ctx.createLinearGradient(-170, 0, -120, 0);
			tailGradient.addColorStop(0, "#07141f");
			tailGradient.addColorStop(1, "#1b3242");
			ctx.fillStyle = tailGradient;
			ctx.beginPath();
			ctx.moveTo(-162, -6);
			ctx.quadraticCurveTo(-188, -42, -140, -28);
			ctx.quadraticCurveTo(-154, -6, -162, -6);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-160, -2);
			ctx.quadraticCurveTo(-184, 30, -138, 16);
			ctx.quadraticCurveTo(-150, -4, -160, -2);
			ctx.closePath();
			ctx.fill();

			const bodyGradient = ctx.createLinearGradient(-164, 0, 150, 0);
			bodyGradient.addColorStop(0, "#06111b");
			bodyGradient.addColorStop(0.45, "#1a2f41");
			bodyGradient.addColorStop(1, "#5a7e93");
			ctx.fillStyle = bodyGradient;
			ctx.beginPath();
			ctx.moveTo(-160, -20);
			ctx.quadraticCurveTo(-130, -70, -34, -76);
			ctx.quadraticCurveTo(60, -82, 140, -30);
			ctx.quadraticCurveTo(166, -6, 146, 26);
			ctx.quadraticCurveTo(118, 64, -38, 60);
			ctx.quadraticCurveTo(-122, 54, -160, -2);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#1d374a";
			ctx.beginPath();
			ctx.moveTo(-74, -64);
			ctx.quadraticCurveTo(-24, -104, 34, -64);
			ctx.quadraticCurveTo(-12, -50, -74, -64);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(-32, 18);
			ctx.quadraticCurveTo(-22, 10, -16, -6);
			ctx.quadraticCurveTo(-10, 4, -8, 18);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#ecf6ff";
			ctx.beginPath();
			ctx.moveTo(-40, -6);
			ctx.quadraticCurveTo(36, -36, 98, -12);
			ctx.quadraticCurveTo(44, 24, -26, 14);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#102231";
			ctx.beginPath();
			ctx.moveTo(94, -6);
			ctx.quadraticCurveTo(108, -4, 110, 8);
			ctx.quadraticCurveTo(94, 8, 94, -6);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#f5fbff";
			ctx.beginPath();
			ctx.arc(96, -6, 10, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "#1a3142";
			ctx.beginPath();
			ctx.arc(99, -6.6, 6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "#070d12";
			ctx.beginPath();
			ctx.arc(101, -7, 2.8, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.85)";
			ctx.beginPath();
			ctx.arc(97.2, -8.4, 1.6, 0, TAU);
			ctx.fill();

			ctx.fillStyle = "#f9fbff";
			ctx.beginPath();
			ctx.moveTo(54, 18);
			ctx.lineTo(86, 12);
			ctx.lineTo(94, 24);
			ctx.lineTo(60, 32);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(38, 22);
			ctx.lineTo(66, 20);
			ctx.lineTo(72, 36);
			ctx.lineTo(40, 36);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "rgba(33,56,74,0.85)";
			ctx.lineWidth = 3.2;
			ctx.beginPath();
			ctx.moveTo(28, -2);
			ctx.quadraticCurveTo(34, 0, 48, 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(16, -4);
			ctx.quadraticCurveTo(24, -2, 36, 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(6, -6);
			ctx.quadraticCurveTo(16, -4, 28, -2);
			ctx.stroke();

			ctx.strokeStyle = "rgba(243,249,255,0.7)";
			ctx.lineWidth = 3.2;
			ctx.beginPath();
			ctx.moveTo(-24, -6);
			ctx.quadraticCurveTo(44, -34, 110, -12);
			ctx.stroke();

			ctx.fillStyle = "#fefefe";
			ctx.beginPath();
			ctx.moveTo(32, 8);
			ctx.lineTo(70, 6);
			ctx.lineTo(66, 18);
			ctx.lineTo(50, 18);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "#132330";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(32, 8);
			ctx.lineTo(50, 18);
			ctx.lineTo(66, 18);
			ctx.lineTo(70, 6);
			ctx.stroke();

			ctx.fillStyle = "#fbffff";
			ctx.beginPath();
			ctx.moveTo(16, 6);
			for (let i = 0; i < 6; i += 1) {
				const x = 20 + i * 8;
				ctx.lineTo(x, 6 + (i % 2 === 0 ? 6 : 0));
				ctx.lineTo(x + 6, 6);
			}
			ctx.lineTo(16 + 6 * 8, 6);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "rgba(255,255,255,0.65)";
			ctx.lineWidth = 1.6;
			for (let i = 0; i < 4; i += 1) {
				ctx.beginPath();
				ctx.moveTo(-10 - i * 8, -10);
				ctx.lineTo(-8 - i * 8, 6);
				ctx.stroke();
			}

			ctx.restore();
		},
		foe(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const sprite = SPRITES.foe;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.15 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? -6 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -6 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.scale(-1, 1);
				ctx.rotate(Math.sin(sway) * 0.08);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.18);
			ctx.lineJoin = "round";
			ctx.lineCap = "round";

			const tailGradient = ctx.createLinearGradient(-46, 0, -20, 0);
			tailGradient.addColorStop(0, "#0b2640");
			tailGradient.addColorStop(1, "#1e5d84");
			ctx.fillStyle = tailGradient;
			ctx.beginPath();
			ctx.moveTo(-40, -6);
			ctx.quadraticCurveTo(-60, -24, -30, -18);
			ctx.quadraticCurveTo(-36, -4, -40, -6);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.moveTo(-40, -4);
			ctx.quadraticCurveTo(-58, 18, -28, 12);
			ctx.quadraticCurveTo(-34, -2, -40, -4);
			ctx.closePath();
			ctx.fill();

			const bodyGradient = ctx.createLinearGradient(-36, 0, 36, 0);
			bodyGradient.addColorStop(0, "#112f49");
			bodyGradient.addColorStop(0.6, "#2d86bc");
			bodyGradient.addColorStop(1, "#79d5ff");
			ctx.fillStyle = bodyGradient;
			ctx.beginPath();
			ctx.moveTo(-36, -10);
			ctx.quadraticCurveTo(-12, -32, 24, -22);
			ctx.quadraticCurveTo(40, -8, 34, 12);
			ctx.quadraticCurveTo(10, 30, -24, 20);
			ctx.quadraticCurveTo(-38, 12, -36, -10);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#115273";
			ctx.beginPath();
			ctx.moveTo(-18, -18);
			ctx.quadraticCurveTo(-6, -40, 8, -22);
			ctx.quadraticCurveTo(-8, -16, -18, -18);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#b8ecff";
			ctx.beginPath();
			ctx.moveTo(-18, 2);
			ctx.quadraticCurveTo(6, 16, 20, 6);
			ctx.quadraticCurveTo(2, -6, -18, 2);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#0a1b28";
			ctx.beginPath();
			ctx.arc(14, -4, 3.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.85)";
			ctx.beginPath();
			ctx.arc(12.6, -5.2, 1.2, 0, TAU);
			ctx.fill();

			ctx.fillStyle = "#184b6d";
			ctx.beginPath();
			ctx.moveTo(-18, 10);
			ctx.lineTo(-10, 26);
			ctx.lineTo(-2, 12);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "rgba(170,214,255,0.55)";
			ctx.lineWidth = 1.1;
			ctx.beginPath();
			ctx.moveTo(-4, -2);
			ctx.quadraticCurveTo(2, 2, 10, 4);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-10, -4);
			ctx.quadraticCurveTo(-4, 0, 2, 4);
			ctx.stroke();

			ctx.restore();
		},
		oktopus(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const sprite = SPRITES.oktopus;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.2 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? -14 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.scale(-1, 1);
				ctx.rotate(Math.sin(sway) * 0.06);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.12);
			ctx.lineJoin = "round";
			ctx.lineCap = "round";

			const mantleGrad = ctx.createLinearGradient(-28, 0, 36, 0);
			mantleGrad.addColorStop(0, "#1a2d4d");
			mantleGrad.addColorStop(0.4, "#274a7e");
			mantleGrad.addColorStop(1, "#7cc6ff");
			ctx.fillStyle = mantleGrad;
			ctx.beginPath();
			ctx.moveTo(-26, -18);
			ctx.quadraticCurveTo(6, -36, 32, -10);
			ctx.quadraticCurveTo(14, 24, -18, 24);
			ctx.quadraticCurveTo(-34, 8, -26, -18);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "rgba(110,190,255,0.75)";
			ctx.lineWidth = 3.2;
			for (let i = 0; i < 4; i += 1) {
				const t = -8 + i * 6;
				ctx.beginPath();
				ctx.moveTo(-12 + t, 12 + i * 4);
				ctx.quadraticCurveTo(-2 + t * 0.4, 28 + i * 6, 8 + t * 0.2, 18 + i * 5);
				ctx.stroke();
			}

			ctx.fillStyle = "#0b1929";
			ctx.beginPath();
			ctx.arc(16, -6, 4, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.85)";
			ctx.beginPath();
			ctx.arc(14.6, -7.4, 1.4, 0, TAU);
			ctx.fill();

			ctx.restore();
		},
		bogenschreck(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const sprite = SPRITES.bogenschreck;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.178 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? -12 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -12 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.scale(-1, 1);
				ctx.rotate(Math.sin(sway) * 0.06);
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.1);
			ctx.lineJoin = "round";
			ctx.lineCap = "round";

			const bodyGrad = ctx.createLinearGradient(-36, 0, 40, 0);
			bodyGrad.addColorStop(0, "#123051");
			bodyGrad.addColorStop(0.5, "#1f6c9f");
			bodyGrad.addColorStop(1, "#8be6ff");
			ctx.fillStyle = bodyGrad;
			ctx.beginPath();
			ctx.moveTo(-34, -14);
			ctx.quadraticCurveTo(-6, -34, 36, -10);
			ctx.quadraticCurveTo(22, 12, -18, 20);
			ctx.quadraticCurveTo(-38, 10, -34, -14);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#0d2134";
			ctx.beginPath();
			ctx.moveTo(18, -6);
			ctx.quadraticCurveTo(24, -10, 30, -4);
			ctx.quadraticCurveTo(26, 0, 18, -2);
			ctx.closePath();
			ctx.fill();

			ctx.strokeStyle = "#f8fbff";
			ctx.lineWidth = 2.4;
			ctx.beginPath();
			ctx.moveTo(-10, -20);
			ctx.quadraticCurveTo(12, -4, 30, 12);
			ctx.stroke();
			ctx.strokeStyle = "rgba(255,255,255,0.4)";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(24, 4, 12, -Math.PI / 3, Math.PI / 2);
			ctx.stroke();

			ctx.strokeStyle = "#dfc49a";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(8, -4);
			ctx.quadraticCurveTo(16, -2, 24, 4);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-12, 4);
			ctx.quadraticCurveTo(0, 0, 8, -4);
			ctx.stroke();

			ctx.fillStyle = "#092031";
			ctx.beginPath();
			ctx.arc(12, -6, 3.2, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.8)";
			ctx.beginPath();
			ctx.arc(10.8, -7.2, 1.2, 0, TAU);
			ctx.fill();

			ctx.restore();
		},
		ritterfisch(ctx, x, y, opts = {}) {
			const scale = opts.scale == null ? 1 : opts.scale;
			const sway = opts.sway == null ? 0 : opts.sway;
			const charging = !!opts.charging;
			const sprite = SPRITES.ritterfisch;
			if (spriteReady(sprite)) {
				const baseScale = opts.spriteScale == null ? 0.18 : opts.spriteScale;
				const overallScale = baseScale * scale;
				const drawW = sprite.naturalWidth * overallScale;
				const drawH = sprite.naturalHeight * overallScale;
				const offsetX = (opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX) * scale;
				const offsetY = (opts.spriteOffsetY == null ? -10 : opts.spriteOffsetY) * scale;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(Math.sin(sway) * 0.05 + (charging ? Math.sin(performance.now() * 0.01) * 0.04 : 0));
				ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
				ctx.restore();
				return;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(Math.sin(sway) * 0.12);
			const bodyGradient = ctx.createLinearGradient(-32, 0, 26, 0);
			bodyGradient.addColorStop(0, "#0d2034");
			bodyGradient.addColorStop(0.6, "#264b6f");
			bodyGradient.addColorStop(1, "#7da3d8");
			ctx.fillStyle = bodyGradient;
			ctx.beginPath();
			ctx.moveTo(-30, -12);
			ctx.quadraticCurveTo(-4, -34, 32, -10);
			ctx.quadraticCurveTo(12, 22, -20, 22);
			ctx.quadraticCurveTo(-34, 8, -30, -12);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = "#0a1522";
			ctx.beginPath();
			ctx.arc(18, -6, 3.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.82)";
			ctx.beginPath();
			ctx.arc(16.8, -7.4, 1.2, 0, TAU);
			ctx.fill();

			ctx.strokeStyle = "#d2ecff";
			ctx.lineWidth = 2.4;
			ctx.beginPath();
			ctx.moveTo(-6, -14);
			ctx.quadraticCurveTo(20, -8, 30, 12);
			ctx.stroke();

			ctx.restore();
		},
		simpleShadow(ctx, x, y, radius) {
			ctx.save();
			ctx.translate(x, y);
			const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
			grad.addColorStop(0, "rgba(0,0,0,0.35)");
			grad.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, TAU);
			ctx.fill();
			ctx.restore();
		},

		sparkle(ctx, x, y, opts = {}) {
			const radius = opts.radius == null ? 8 : opts.radius;
			const inner = radius * 0.2;
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(opts.rotation || 0);
			const gradient = ctx.createRadialGradient(0, 0, inner, 0, 0, radius);
			gradient.addColorStop(0, "rgba(210,255,255,0.9)");
			gradient.addColorStop(0.6, "rgba(140,220,240,0.6)");
			gradient.addColorStop(1, "rgba(100,200,230,0)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, TAU);
			ctx.fill();
			ctx.restore();
		}
	};
}
