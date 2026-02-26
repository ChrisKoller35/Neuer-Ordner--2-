/**
 * Spawning System – Erstellt und verwaltet Spielobjekte
 * Extrahiert aus bootGame() in game.js
 */
import { TAU } from '../core/constants.js';
import { clamp } from '../core/utils.js';

/**
 * Erstellt das Spawning-System
 * @param {Object} ctx - Context mit Dependencies
 */
export function createSpawningSystem(ctx) {
	const {
		getState,
		getCanvas,
		SYMBOL_DATA,
		SYMBOL_AUTOCOLLECT_MS,
		getSPRITES,
		spriteReady,
		getCoverRockCollisionMask,
		getLevel3GroundLine
	} = ctx;

	function seedBubbles() {
		const state = getState();
		const canvas = getCanvas();
		const count = 24;
		state.bubbles = Array.from({ length: count }, () => ({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			r: Math.random() * 3 + 1.4,
			spd: Math.random() * 0.08 + 0.04
		}));
	}

	function spawnFoe(opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const type = opts.type || "jelly";
		const baseY = opts.baseY == null ? canvas.height * 0.28 + Math.random() * canvas.height * 0.36 : opts.baseY;
		const entry = opts.entryX == null ? canvas.width + 320 : opts.entryX;
		const scale = opts.scale == null ? 0.7 + Math.random() * 0.3 : opts.scale;
		const foe = {
			type,
			x: entry,
			y: baseY,
			baseY,
			speed: opts.speed == null ? (type === "bogenschreck" ? 0.16 + Math.random() * 0.04 : 0.12 + Math.random() * 0.08) : opts.speed,
			sway: Math.random() * TAU,
			scale,
			dead: false
		};
		if (type === "bogenschreck") {
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.64 + Math.random() * 0.06) : opts.anchorX;
			foe.shootTimer = opts.shootTimer == null ? 1200 + Math.random() * 600 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 2400 + Math.random() * 900 : opts.shootCooldown;
			foe.hoverAmplitude = opts.hoverAmplitude == null ? 12 + Math.random() * 6 : opts.hoverAmplitude;
			foe.hoverPhase = Math.random() * TAU;
		} else if (type === "oktopus") {
			const minAnchorX = canvas.width * 0.5;
			const maxAnchorX = canvas.width * 0.8;
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			const initialAnchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const initialAnchorY = opts.anchorY == null ? foe.baseY : opts.anchorY;
			foe.anchorX = clamp(initialAnchorX, minAnchorX, maxAnchorX);
			foe.anchorY = clamp(initialAnchorY, minAnchorY, maxAnchorY);
			foe.shootTimer = opts.shootTimer == null ? 1600 + Math.random() * 380 : opts.shootTimer;
			foe.shootCooldown = opts.shootCooldown == null ? 3200 + Math.random() * 620 : opts.shootCooldown;
			foe.volleySpacing = opts.volleySpacing == null ? 260 : opts.volleySpacing;
			foe.burstCount = opts.burstCount == null ? (Math.random() < 0.6 ? 2 : 1) : opts.burstCount;
			foe.burstQueue = 0;
			foe.projectileSpeed = opts.projectileSpeed == null ? 0.38 + Math.random() * 0.04 : opts.projectileSpeed;
			foe.orbitAngle = opts.orbitAngle == null ? Math.random() * TAU : opts.orbitAngle;
			foe.orbitRadius = opts.orbitRadius == null ? 28 + Math.random() * 12 : opts.orbitRadius;
			foe.orbitVertical = opts.orbitVertical == null ? 32 + Math.random() * 14 : opts.orbitVertical;
			foe.orbitSpeed = opts.orbitSpeed == null ? 0.0014 + Math.random() * 0.0006 : opts.orbitSpeed;
			foe.dashDuration = opts.dashDuration == null ? 420 : opts.dashDuration;
			foe.dashDistance = opts.dashDistance == null ? 48 + Math.random() * 12 : opts.dashDistance;
			foe.dashDir = Math.random() < 0.5 ? -1 : 1;
			foe.dashTimer = 0;
			foe.laneShiftTimer = opts.laneShiftTimer == null ? 2400 + Math.random() * 600 : opts.laneShiftTimer;
			foe.laneShiftCooldown = opts.laneShiftCooldown == null ? 2400 + Math.random() * 600 : opts.laneShiftCooldown;
		} else if (type === "ritterfisch") {
			const minAnchorY = canvas.height * 0.26;
			const maxAnchorY = canvas.height * 0.76;
			foe.anchorX = opts.anchorX == null ? canvas.width * (0.66 + Math.random() * 0.05) : opts.anchorX;
			const rawAnchorY = opts.anchorY == null ? baseY + (Math.random() - 0.5) * canvas.height * 0.12 : opts.anchorY;
			foe.anchorY = clamp(rawAnchorY, minAnchorY, maxAnchorY);
			foe.patrolRange = opts.patrolRange == null ? 18 + Math.random() * 10 : opts.patrolRange;
			foe.chargeCooldown = opts.chargeCooldown == null ? 3200 + Math.random() * 600 : opts.chargeCooldown;
			foe.chargeTimer = opts.chargeTimer == null ? 1400 + Math.random() * 600 : opts.chargeTimer;
			foe.charging = false;
			foe.chargeDuration = 0;
			foe.recoverTimer = 0;
			foe.cruiseSpeed = opts.cruiseSpeed == null ? 0.18 + Math.random() * 0.04 : opts.cruiseSpeed;
			foe.chargeSpeed = opts.chargeSpeed == null ? 0.46 + Math.random() * 0.04 : opts.chargeSpeed;
			foe.speed = foe.cruiseSpeed;
		}
		state.foes.push(foe);
		return foe;
	}

	function scheduleNextFoeSpawn(initial = false) {
		const state = getState();
		const interval = state.foeSpawnInterval || { min: 1400, max: 2100 };
		const minDelay = interval.min == null ? 1400 : interval.min;
		const maxDelay = interval.max == null ? minDelay + 600 : interval.max;
		const span = Math.max(0, maxDelay - minDelay);
		const delay = minDelay + Math.random() * span;
		state.foeSpawnTimer = initial ? Math.min(delay, 520) : delay;
	}

	function primeFoes() {
		const state = getState();
		if (state.levelConfig && typeof state.levelConfig.initialSpawnDelay === "number") {
			state.foeSpawnTimer = state.levelConfig.initialSpawnDelay;
		} else {
			scheduleNextFoeSpawn(true);
		}
	}

	function spawnLevelFoe() {
		const state = getState();
		const config = state.levelConfig;
		if (!config || !Array.isArray(config.spawnTable) || config.spawnTable.length === 0) {
			return spawnFoe();
		}
		const totalWeight = config.spawnTable.reduce((sum, entry) => sum + (entry.weight == null ? 1 : entry.weight), 0);
		let roll = Math.random() * (totalWeight || 1);
		for (const entry of config.spawnTable) {
			const weight = entry.weight == null ? 1 : entry.weight;
			roll -= weight;
			if (roll <= 0) {
				if (typeof entry.spawn === "function") return entry.spawn();
				const opts = typeof entry.options === "function" ? entry.options() : entry.options || {};
				return spawnFoe({ type: entry.type, ...(opts || {}) });
			}
		}
		const fallback = config.spawnTable[config.spawnTable.length - 1];
		if (fallback) {
			const opts = typeof fallback.options === "function" ? fallback.options() : fallback.options || {};
			return spawnFoe({ type: fallback.type, ...(opts || {}) });
		}
		return spawnFoe();
	}

	function getFoeHitbox(foe, opts = {}) {
		const forPlayer = !!opts.forPlayer;
		if (foe.type === "bogenschreck") {
			const width = forPlayer ? 52 : 44;
			const height = forPlayer ? 36 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "oktopus") {
			const width = forPlayer ? 54 : 46;
			const height = forPlayer ? 40 : 32;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		if (foe.type === "ritterfisch") {
			const width = forPlayer ? 48 : 40;
			const height = forPlayer ? 34 : 26;
			return { width: width * foe.scale, height: height * foe.scale };
		}
		const width = forPlayer ? 42 : 36;
		const height = forPlayer ? 36 : 28;
		return { width: width * foe.scale, height: height * foe.scale };
	}

	function spawnHealPickup() {
		const state = getState();
		const canvas = getCanvas();
		const baseY = canvas.height * 0.28 + Math.random() * canvas.height * 0.42;
		state.healPickups.push({
			x: canvas.width + 120,
			y: baseY,
			vx: 0.08 + Math.random() * 0.05,
			sway: Math.random() * TAU,
			scale: 0.9 + Math.random() * 0.2,
			life: 16000
		});
	}

	function spawnSymbolDrop(kind, opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const config = SYMBOL_DATA[kind];
		if (!config) return null;
		const now = performance.now();
		const drop = {
			kind,
			x: opts.x == null ? canvas.width * 0.6 : opts.x,
			y: opts.y == null ? canvas.height * 0.5 : opts.y,
			vy: opts.vy == null ? 0.015 : opts.vy,
			sway: Math.random() * TAU,
			swaySpeed: opts.swaySpeed == null ? 0.0024 : opts.swaySpeed,
			amplitude: opts.amplitude == null ? 10 : opts.amplitude,
			scale: opts.scale == null ? 0.26 : opts.scale,
			life: SYMBOL_AUTOCOLLECT_MS,
			spawnTime: now,
			collected: false,
			autoCollected: false,
			cleanupTimer: null
		};
		state.symbolDrops.push(drop);
		return drop;
	}

	function spawnCoinDrop(opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const initialY = opts.y == null ? canvas.height * 0.5 : opts.y;
		const hoverBandTop = canvas.height * 0.34;
		const hoverBandBottom = canvas.height * 0.68;
		const targetHoverY = clamp(opts.hoverY == null ? initialY : opts.hoverY, hoverBandTop, hoverBandBottom);
		const baseScroll = opts.scrollSpeed == null ? 0.24 + Math.random() * 0.14 : Math.abs(opts.scrollSpeed);
		const drop = {
			x: opts.x == null ? canvas.width * 0.6 : opts.x,
			y: initialY,
			vx: opts.vx == null ? -baseScroll : -Math.abs(opts.vx),
			vy: opts.vy == null ? 0 : opts.vy,
			gravity: opts.gravity == null ? 0.0007 : opts.gravity,
			spin: Math.random() * TAU,
			spinSpeed: opts.spinSpeed == null ? 0.005 + Math.random() * 0.003 : opts.spinSpeed,
			value: Math.max(1, opts.value == null ? 1 : opts.value),
			life: opts.life == null ? 12000 : opts.life,
			collectDuration: opts.collectDuration == null ? 420 : opts.collectDuration,
			collectTimer: 0,
			collected: false,
			dead: false,
			scale: opts.scale == null ? 0.95 + Math.random() * 0.15 : opts.scale,
			hoverY: targetHoverY,
			hoverAmplitude: opts.hoverAmplitude == null ? 24 + Math.random() * 10 : opts.hoverAmplitude,
			hoverPhase: Math.random() * TAU,
			hoverSpeed: opts.hoverSpeed == null ? 0.002 + Math.random() * 0.0012 : opts.hoverSpeed,
			hoverFollow: opts.hoverFollow == null ? 0.0042 : opts.hoverFollow,
			scrollSpeed: baseScroll
		};
		state.coinDrops.push(drop);
		return drop;
	}

	function getCoinValueForFoe(foe) {
		if (!foe) return 1;
		if (foe.type === "oktopus") return 3;
		if (foe.type === "bogenschreck" || foe.type === "ritterfisch") return 2;
		return 1;
	}

	function spawnCoverRock(opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const SPRITES = getSPRITES();
		const sprite = SPRITES.coverRock;
		const scale = opts.scale == null ? 0.52 : opts.scale;
		const spriteWidth = spriteReady(sprite) ? sprite.naturalWidth : 540;
		const spriteHeight = spriteReady(sprite) ? sprite.naturalHeight : 420;
		const width = (opts.width == null ? spriteWidth : opts.width) * scale;
		const height = (opts.height == null ? spriteHeight : opts.height) * scale;
		const radiusX = (opts.radiusX == null ? width * 0.45 : opts.radiusX);
		const radiusY = (opts.radiusY == null ? height * 0.4 : opts.radiusY);
		const landHalfHeight = opts.landHalfHeight == null ? height * 0.5 : opts.landHalfHeight;
		const padX = opts.padX == null ? 0 : opts.padX;
		const padY = opts.padY == null ? 0 : opts.padY;
		const padLeft = opts.padLeft == null ? null : opts.padLeft;
		const padRight = opts.padRight == null ? null : opts.padRight;
		const padTop = opts.padTop == null ? null : opts.padTop;
		const padBottom = opts.padBottom == null ? null : opts.padBottom;
		let groundLine = opts.groundLine == null ? canvas.height - 12 : opts.groundLine;
		if (opts.groundLine == null && state.levelIndex === 2) {
			const levelGround = getLevel3GroundLine();
			if (levelGround != null) groundLine = levelGround;
		}
		const minY = canvas.height * 0.22;
		const maxY = Math.max(minY, groundLine - landHalfHeight);
		const targetY = clamp(groundLine - landHalfHeight, minY, maxY);
		const rock = {
			x: clamp(opts.x == null ? canvas.width * 0.5 : opts.x, canvas.width * 0.24, canvas.width * 0.76),
			y: opts.startY == null ? -height : opts.startY,
			radiusX,
			radiusY,
			landHalfHeight,
			width,
			height,
			scale,
			padX,
			padY,
			padLeft,
			padRight,
			padTop,
			padBottom,
			collisionOffsetX: opts.collisionOffsetX == null ? 0 : opts.collisionOffsetX,
			collisionOffsetY: opts.collisionOffsetY == null ? 0 : opts.collisionOffsetY,
			vy: 0,
			gravity: opts.gravity == null ? 0.0011 : opts.gravity,
			maxFallSpeed: opts.maxFallSpeed == null ? 0.68 : opts.maxFallSpeed,
			delay: opts.delay == null ? 620 : Math.max(0, opts.delay),
			groundLine,
			targetY,
			landed: false,
			impactTimer: 0,
			damageCooldown: 0,
			hitPulse: 0
		};
		if (spriteReady(sprite)) {
			rock.collisionMask = getCoverRockCollisionMask(sprite, width, height);
		}
		state.coverRocks.push(rock);
		return rock;
	}

	function triggerEventFlash(kind, opts = {}) {
		const state = getState();
		const now = performance.now();
		const duration = opts.duration == null ? 1600 : opts.duration;
		state.eventFlash = {
			kind,
			started: now,
			duration,
			opacity: opts.opacity == null ? 0.9 : opts.opacity,
			text: opts.text || null
		};
	}

	return {
		seedBubbles,
		spawnFoe,
		scheduleNextFoeSpawn,
		primeFoes,
		spawnLevelFoe,
		getFoeHitbox,
		spawnHealPickup,
		spawnSymbolDrop,
		spawnCoinDrop,
		getCoinValueForFoe,
		spawnCoverRock,
		triggerEventFlash
	};
}
