/**
 * Background Rendering System
 * Handles rendering of backgrounds, bubbles, floor overlays, cover rocks, and tsunami wave
 */

const TAU = Math.PI * 2;

/**
 * Creates the background rendering system
 * @param {Object} ctx - Context with dependencies
 */
export function createBackgroundRenderSystem(ctx) {
	const {
		getCtx,
		getCanvas,
		getState,
		SPRITES,
		MODELS,
		spriteReady,
		clamp01,
		getLevel3FloorTop,
		getLevel4FloorTop,
		getLevelFloorSprite,
		LEVEL2_FLOOR_OFFSET
	} = ctx;

	function renderBackground() {
		const canvasEl = getCanvas();
		const state = getState();
		const context = getCtx();
		const width = canvasEl.width;
		const height = canvasEl.height;
		const level = state.level || 1;

		const palette = level === 2
			? {
				top: "#1d0f35",
				mid: "#0f1633",
				bottom: "#07091b",
				haze: "rgba(90,50,120,0.32)",
				hazeStrong: "rgba(180,110,220,0.22)",
				ridges: "#12031f",
				foreground: "#1a0633"
			}
			: {
				top: "#03294a",
				mid: "#02203b",
				bottom: "#02111f",
				haze: "rgba(40,80,120,0.28)",
				hazeStrong: "rgba(110,170,220,0.22)",
				ridges: "#031728",
				foreground: "#05233b"
			};

		const time = state.elapsed || 0;
		const baseGrad = context.createLinearGradient(0, 0, 0, height);
		baseGrad.addColorStop(0, palette.top);
		baseGrad.addColorStop(0.55, palette.mid);
		baseGrad.addColorStop(1, palette.bottom);
		context.fillStyle = baseGrad;
		context.fillRect(0, 0, width, height);

		context.save();
		context.fillStyle = palette.ridges;
		context.globalAlpha = 0.7;
		context.beginPath();
		context.moveTo(0, height * 0.76);
		context.bezierCurveTo(width * 0.18, height * 0.7, width * 0.34, height * 0.82, width * 0.52, height * 0.78);
		context.bezierCurveTo(width * 0.7, height * 0.74, width * 0.82, height * 0.86, width, height * 0.8);
		context.lineTo(width, height);
		context.lineTo(0, height);
		context.closePath();
		context.fill();
		context.restore();

		context.save();
		context.fillStyle = palette.foreground;
		context.globalAlpha = 0.85;
		context.beginPath();
		context.moveTo(0, height * 0.88);
		context.bezierCurveTo(width * 0.16, height * 0.82, width * 0.3, height * 0.92, width * 0.46, height * 0.9);
		context.bezierCurveTo(width * 0.68, height * 0.86, width * 0.82, height * 0.96, width, height * 0.94);
		context.lineTo(width, height);
		context.lineTo(0, height);
		context.closePath();
		context.fill();
		context.restore();

		if (level === 1) {
			const bgSprite = SPRITES.backgroundLevelOne;
			if (spriteReady(bgSprite)) {
				const scale = Math.max(width / bgSprite.naturalWidth, height / bgSprite.naturalHeight);
				const drawW = bgSprite.naturalWidth * scale;
				const drawH = bgSprite.naturalHeight * scale;
				const overflowX = drawW - width;
				const overflowY = drawH - height;
				const drawX = overflowX > 0 ? -overflowX * 0.15 : 0;
				const drawY = overflowY > 0 ? -overflowY * 0.45 : 0;
				context.drawImage(bgSprite, drawX, drawY, drawW, drawH);
			}
		}

		context.save();
		const glowGrad = context.createRadialGradient(width * 0.5, height * 0.08, 0, width * 0.5, height * 0.08, height * 0.9);
		glowGrad.addColorStop(0, palette.hazeStrong);
		glowGrad.addColorStop(1, "rgba(0,0,0,0)");
		context.globalCompositeOperation = "lighter";
		context.globalAlpha = 0.85;
		context.fillStyle = glowGrad;
		context.fillRect(0, 0, width, height);
		context.restore();

		context.save();
		context.globalCompositeOperation = "lighter";
		context.globalAlpha = 0.22;
		const beamCount = 4;
		for (let i = 0; i < beamCount; i += 1) {
			const phase = time * 0.00025 + i * 1.37;
			const beamCenter = (width / (beamCount + 1)) * (i + 1) + Math.sin(phase) * width * 0.08;
			const beamWidth = width * 0.18;
			context.beginPath();
			context.moveTo(beamCenter - beamWidth * 0.3, -height * 0.1);
			context.lineTo(beamCenter + beamWidth * 0.3, -height * 0.1);
			context.lineTo(beamCenter + beamWidth * 0.55, height * 0.72);
			context.lineTo(beamCenter - beamWidth * 0.55, height * 0.72);
			context.closePath();
			const beamGrad = context.createLinearGradient(beamCenter, 0, beamCenter, height * 0.75);
			beamGrad.addColorStop(0, "rgba(255,255,255,0.28)");
			beamGrad.addColorStop(0.6, palette.haze);
			beamGrad.addColorStop(1, "rgba(0,0,0,0)");
			context.fillStyle = beamGrad;
			context.fill();
		}
		context.restore();

		context.save();
		context.globalAlpha = 0.35;
		context.fillStyle = palette.haze;
		context.beginPath();
		context.moveTo(0, height * 0.35);
		context.bezierCurveTo(width * 0.2, height * 0.28, width * 0.4, height * 0.32, width * 0.7, height * 0.42);
		context.lineTo(width, height * 0.48);
		context.lineTo(width, height * 0.65);
		context.lineTo(0, height * 0.55);
		context.closePath();
		context.fill();
		context.restore();

		const pseudoRand = seed => {
			const s = Math.sin(seed) * 43758.5453;
			return s - Math.floor(s);
		};
		context.save();
		context.globalAlpha = 0.22;
		context.fillStyle = "rgba(255,255,255,0.35)";
		const moteCount = 42;
		for (let i = 0; i < moteCount; i += 1) {
			const noise = pseudoRand(i * 12.93);
			const noise2 = pseudoRand(i * 34.37);
			const scroll = (time * 0.00004 + noise2) % 1;
			const x = noise * width;
			const y = scroll * height;
			const size = 1 + pseudoRand(i * 91.77) * 3;
			context.beginPath();
			context.arc(x, y, size, 0, TAU);
			context.fill();
		}
		context.restore();

		if (level === 3 || state.levelIndex === 2) {
			const floorSprite = getLevelFloorSprite(3);
			const floorTop = getLevel3FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				const drawX = 0;
				const drawY = floorTop;
				context.drawImage(floorSprite, drawX, drawY, drawW, drawH);
			}
		}
	}

	function renderBubbles() {
		const context = getCtx();
		const state = getState();
		context.save();
		context.strokeStyle = "rgba(210,240,255,0.35)";
		for (const bubble of state.bubbles) {
			context.beginPath();
			context.arc(bubble.x, bubble.y, bubble.r, 0, TAU);
			context.stroke();
		}
		context.restore();
	}

	function renderFloorOverlay() {
		const context = getCtx();
		const canvasEl = getCanvas();
		const state = getState();
		const level = state.level || 1;

		if (level === 2 || state.levelIndex === 1) {
			const floorSprite = getLevelFloorSprite(2);
			if (spriteReady(floorSprite)) {
				const scale = canvasEl.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				const drawY = canvasEl.height - drawH + LEVEL2_FLOOR_OFFSET;
				context.drawImage(floorSprite, 0, drawY, drawW, drawH);
				const pseudoRand = seed => {
					const s = Math.sin(seed) * 43758.5453;
					return s - Math.floor(s);
				};
				const time = state.elapsed || 0;
				const riseSpan = 220;
				const baseY = drawY + drawH * 0.46;
				context.save();
				context.globalCompositeOperation = "lighter";
				for (let i = 0; i < 18; i += 1) {
					const noise = pseudoRand(i * 19.3);
					const drift = Math.sin(time * 0.0012 + i) * 6;
					const phase = (time * 0.035 + i * 120) % riseSpan;
					const x = 160 + noise * 140 + drift;
					const y = baseY - phase;
					const size = 2 + pseudoRand(i * 91.7) * 3;
					const alpha = 0.55 * (1 - phase / riseSpan);
					context.fillStyle = `rgba(190, 90, 255, ${alpha.toFixed(3)})`;
					context.beginPath();
					context.arc(x, y, size, 0, TAU);
					context.fill();
				}
				context.restore();
			}
			return;
		}
		if (level === 3 || state.levelIndex === 2) {
			const floorSprite = getLevelFloorSprite(3);
			const floorTop = getLevel3FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = canvasEl.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				context.drawImage(floorSprite, 0, floorTop, drawW, drawH);
			}
			return;
		}
		if (level === 4 || state.levelIndex === 3) {
			const floorSprite = getLevelFloorSprite(4);
			const floorTop = getLevel4FloorTop();
			if (spriteReady(floorSprite) && floorTop != null) {
				const scale = canvasEl.width / floorSprite.naturalWidth;
				const drawW = floorSprite.naturalWidth * scale;
				const drawH = floorSprite.naturalHeight * scale;
				context.drawImage(floorSprite, 0, floorTop, drawW, drawH);
			}
		}
	}

	function renderCoverRocks() {
		const context = getCtx();
		const canvasEl = getCanvas();
		const state = getState();
		if (state.coverRocks.length === 0) return;
		const sprite = SPRITES.coverRock;
		for (const rock of state.coverRocks) {
			const radiusX = rock.radiusX == null ? 80 : rock.radiusX;
			const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
			const dropRatio = clamp01((rock.y + radiusY) / Math.max(1, rock.groundLine || canvasEl.height));
			const shadowRadius = Math.max(36, radiusX * (0.55 + dropRatio * 0.35));
			const shadowY = (rock.groundLine == null ? canvasEl.height * 0.88 : rock.groundLine) + 8;
			MODELS.simpleShadow(context, rock.x + 10, shadowY, shadowRadius);
			context.save();
			context.translate(rock.x, rock.y);
			const impactRatio = rock.landed && rock.impactTimer > 0 ? rock.impactTimer / 520 : 0;
			if (impactRatio > 0) {
				const sway = Math.sin(impactRatio * TAU * 2.4) * 0.06;
				context.rotate(sway);
			}
			if (rock.delay > 0) context.globalAlpha = 0.75;
			const hitGlow = rock.hitPulse > 0 ? clamp01(rock.hitPulse / 520) : 0;
			if (spriteReady(sprite)) {
				const drawW = rock.width == null ? sprite.naturalWidth * (rock.scale == null ? 0.26 : rock.scale) : rock.width;
				const drawH = rock.height == null ? sprite.naturalHeight * (rock.scale == null ? 0.26 : rock.scale) : rock.height;
				context.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
			} else {
				context.fillStyle = "#2b2f45";
				context.beginPath();
				context.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
				context.fill();
				context.strokeStyle = "#151827";
				context.lineWidth = 4;
				context.stroke();
			}
			if (hitGlow > 0) {
				context.save();
				context.globalAlpha = hitGlow * 0.32;
				context.fillStyle = "#ffe9b6";
				context.beginPath();
				context.ellipse(0, 0, radiusX * 0.86, radiusY * 0.78, 0, 0, TAU);
				context.fill();
				context.restore();
			}
			context.restore();
		}
	}

	function renderTsunamiWave() {
		const context = getCtx();
		const canvasEl = getCanvas();
		const state = getState();
		const wave = state.tsunamiWave;
		if (!wave) return;
		const width = wave.width == null ? Math.max(260, canvasEl.width * 0.24) : wave.width;
		const left = wave.x;
		const right = left + width;
		const strength = clamp01(wave.energy == null ? 1 : wave.energy);
		const elapsed = wave.elapsed || 0;

		context.save();
		context.beginPath();
		context.rect(left, 0, width, canvasEl.height);
		context.clip();
		const grad = context.createLinearGradient(left, 0, right, 0);
		grad.addColorStop(0, `rgba(80,150,240,${0.22 + 0.28 * strength})`);
		grad.addColorStop(0.42, `rgba(110,195,255,${0.3 + 0.32 * strength})`);
		grad.addColorStop(1, `rgba(200,245,255,${0.35 + 0.28 * strength})`);
		context.globalCompositeOperation = "source-over";
		context.globalAlpha = 1;
		context.fillStyle = grad;
		context.fillRect(left, 0, width, canvasEl.height);
		context.globalCompositeOperation = "lighter";
		context.globalAlpha = 0.25 * strength;
		context.fillStyle = "rgba(255,255,255,0.9)";
		context.fillRect(Math.max(left, right - width * 0.3), 0, width * 0.08, canvasEl.height);
		context.globalAlpha = 0.18 * strength;
		context.fillRect(Math.max(left, right - width * 0.46), 0, width * 0.06, canvasEl.height);
		context.globalCompositeOperation = "source-over";

		const shimmerPhase = (wave.detailOffset || 0) + elapsed * 0.0021;
		const shimmerCount = 3;
		for (let i = 0; i < shimmerCount; i += 1) {
			const phase = shimmerPhase + i * 1.7;
			const center = (Math.sin(phase) * 0.5 + 0.5) * canvasEl.height;
			const bandHeight = 90 + Math.sin(phase * 1.4 + i * 2.1) * 38;
			const top = center - bandHeight * 0.5;
			const gradBand = context.createLinearGradient(left, top, left, top + bandHeight);
			gradBand.addColorStop(0, "rgba(160,215,255,0)");
			gradBand.addColorStop(0.45, `rgba(210,245,255,${0.14 * strength})`);
			gradBand.addColorStop(0.85, "rgba(200,240,255,0)");
			context.globalAlpha = 0.9;
			context.fillStyle = gradBand;
			context.fillRect(left, top, width, bandHeight);
		}

		if (wave.bubbles && wave.bubbles.length) {
			const span = canvasEl.height + 160;
			context.globalCompositeOperation = "lighter";
			for (const bubble of wave.bubbles) {
				const driftPhase = shimmerPhase * (0.9 + bubble.drift * 0.18) + bubble.x * 4.8;
				const drift = Math.sin(driftPhase) * width * 0.08;
				const x = left + width * bubble.x + drift;
				const travel = (bubble.y * span + elapsed * bubble.speed * span) % span;
				const y = canvasEl.height + 80 - travel;
				const radius = Math.max(3, bubble.radius * (0.45 + strength * 0.55));
				const alpha = Math.max(0, bubble.alpha * strength * 1.2);
				if (y < -radius || y > canvasEl.height + radius) continue;
				context.globalAlpha = alpha;
				const bubbleGrad = context.createRadialGradient(x, y, radius * 0.25, x, y, radius);
				bubbleGrad.addColorStop(0, "rgba(255,255,255,0.95)");
				bubbleGrad.addColorStop(0.5, "rgba(195,235,255,0.45)");
				bubbleGrad.addColorStop(1, "rgba(150,210,255,0)");
				context.fillStyle = bubbleGrad;
				context.beginPath();
				context.arc(x, y, radius, 0, TAU);
				context.fill();
			}
		}
		context.restore();
	}

	return {
		renderBackground,
		renderBubbles,
		renderFloorOverlay,
		renderCoverRocks,
		renderTsunamiWave
	};
}
