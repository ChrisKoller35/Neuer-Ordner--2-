/**
 * Spawning System
 * Handles spawning of foes, pickups, and other game entities
 */

const TAU = Math.PI * 2;

/**
 * Creates the spawning system
 * @param {Object} ctx - Context with dependencies
 */
export function createSpawningSystem(ctx) {
	const {
		getState,
		getCanvas,
		clamp,
		SYMBOL_DATA
	} = ctx;

	function scheduleNextFoeSpawn(initial = false) {
		const state = getState();
		const interval = state.foeSpawnInterval || { min: 1400, max: 2100 };
		const minDelay = interval.min == null ? 1400 : interval.min;
		const maxDelay = interval.max == null ? minDelay + 600 : interval.max;
		const span = Math.max(0, maxDelay - minDelay);
		const delay = minDelay + Math.random() * span;
		state.foeSpawnTimer = initial ? Math.min(delay, 520) : delay;
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
			swayAmp: opts.swayAmp == null ? 18 : opts.swayAmp,
			life: opts.life == null ? 11000 : opts.life,
			born: now,
			scale: opts.scale == null ? 1 : opts.scale,
			spriteKey: config.spriteKey || null,
			spriteScale: config.spriteScale == null ? 0.18 : config.spriteScale,
			spriteOffsetX: config.spriteOffsetX == null ? 0 : config.spriteOffsetX,
			spriteOffsetY: config.spriteOffsetY == null ? 0 : config.spriteOffsetY
		};
		state.symbolDrops.push(drop);
		return drop;
	}

	function spawnCoinDrop(opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const now = performance.now();
		const drop = {
			kind: "coin",
			x: opts.x == null ? canvas.width * 0.5 : opts.x,
			y: opts.y == null ? canvas.height * 0.5 : opts.y,
			vx: opts.vx == null ? -0.06 + Math.random() * 0.04 : opts.vx,
			vy: opts.vy == null ? -0.12 + Math.random() * 0.08 : opts.vy,
			gravity: opts.gravity == null ? 0.00018 : opts.gravity,
			sway: Math.random() * TAU,
			swaySpeed: opts.swaySpeed == null ? 0.003 : opts.swaySpeed,
			swayAmp: opts.swayAmp == null ? 6 : opts.swayAmp,
			life: opts.life == null ? 5200 : opts.life,
			born: now,
			scale: opts.scale == null ? 0.85 + Math.random() * 0.2 : opts.scale,
			value: opts.value == null ? 1 : opts.value,
			spriteKey: "coin",
			spriteScale: opts.spriteScale == null ? 0.09 : opts.spriteScale,
			spriteOffsetX: opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX,
			spriteOffsetY: opts.spriteOffsetY == null ? 0 : opts.spriteOffsetY
		};
		state.coinDrops.push(drop);
		return drop;
	}

	function spawnCoverRock(opts = {}) {
		const state = getState();
		const canvas = getCanvas();
		const x = opts.x == null ? canvas.width + 180 : opts.x;
		const y = opts.y == null ? canvas.height * (0.38 + Math.random() * 0.26) : opts.y;
		const rock = {
			x,
			y,
			baseY: y,
			vx: opts.vx == null ? 0.07 + Math.random() * 0.03 : opts.vx,
			sway: Math.random() * TAU,
			swaySpeed: opts.swaySpeed == null ? 0.0018 : opts.swaySpeed,
			swayAmp: opts.swayAmp == null ? 8 : opts.swayAmp,
			scale: opts.scale == null ? 0.9 + Math.random() * 0.24 : opts.scale,
			spriteKey: opts.spriteKey == null ? "coverRock" : opts.spriteKey,
			spriteScale: opts.spriteScale == null ? 0.26 : opts.spriteScale,
			spriteOffsetX: opts.spriteOffsetX == null ? 0 : opts.spriteOffsetX,
			spriteOffsetY: opts.spriteOffsetY == null ? 0 : opts.spriteOffsetY,
			hitboxWidth: opts.hitboxWidth == null ? 86 : opts.hitboxWidth,
			hitboxHeight: opts.hitboxHeight == null ? 62 : opts.hitboxHeight
		};
		state.coverRocks.push(rock);
		return rock;
	}

	return {
		scheduleNextFoeSpawn,
		spawnFoe,
		primeFoes,
		spawnLevelFoe,
		getFoeHitbox,
		spawnHealPickup,
		spawnSymbolDrop,
		spawnCoinDrop,
		spawnCoverRock
	};
}
