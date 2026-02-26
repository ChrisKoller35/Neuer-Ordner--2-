/**
 * Cover Rock System
 * Handles cover rock collision detection, surface normals, and entity avoidance
 */

/**
 * Creates the cover rock system with context-based dependencies
 * @param {Object} ctx - Context with dependencies
 */
export function createCoverRockSystem(ctx) {
	const {
		getState,
		getCanvas,
		clamp,
		// Optionale Abhängigkeiten für updateCoverRocks
		getSPRITES,
		spriteReady,
		getCoverRockCollisionMask,
		getLevel3GroundLine,
		damagePlayer
	} = ctx;

	/**
	 * Check if a point is inside a cover rock's collision area
	 */
	function isPointInsideCover(rock, x, y, padX = 0, padY = 0) {
		if (rock.collisionMask) {
			const mask = rock.collisionMask;
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const width = mask.worldWidth;
			const height = mask.worldHeight;
			const localX = x - centerX + width * 0.5;
			const localY = y - centerY + height * 0.5;
			if (localX < 0 || localY < 0 || localX > width || localY > height) return false;
			const px = Math.floor(localX * mask.scaleX);
			const py = Math.floor(localY * mask.scaleY);
			if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) return false;
			const expandX = Math.max(0, Math.ceil(Math.max(0, padX) * mask.scaleX));
			const expandY = Math.max(0, Math.ceil(Math.max(0, padY) * mask.scaleY));
			const startX = Math.max(0, px - expandX);
			const endX = Math.min(mask.width - 1, px + expandX);
			const startY = Math.max(0, py - expandY);
			const endY = Math.min(mask.height - 1, py + expandY);
			for (let iy = startY; iy <= endY; iy++) {
				const rowOffset = iy * mask.width;
				for (let ix = startX; ix <= endX; ix++) {
					if (mask.data[rowOffset + ix]) return true;
				}
			}
			return false;
		}
		const baseRadiusX = rock.radiusX == null ? 80 : rock.radiusX;
		const baseRadiusY = rock.radiusY == null ? 60 : rock.radiusY;
		const padBaseX = rock.padX == null ? 0 : rock.padX;
		const padBaseY = rock.padY == null ? 0 : rock.padY;
		const radiusX = Math.max(1, baseRadiusX + padBaseX + padX);
		const radiusY = Math.max(1, baseRadiusY + padBaseY + padY);
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		const dx = x - centerX;
		const dy = y - centerY;
		const nx = dx / radiusX;
		const ny = dy / radiusY;
		return nx * nx + ny * ny < 1;
	}

	/**
	 * Compute surface normal for collision response
	 */
	function computeCoverSurfaceNormal(rock, x, y) {
		const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
		const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
		if (rock.collisionMask) {
			const mask = rock.collisionMask;
			const localX = x - centerX + mask.worldWidth * 0.5;
			const localY = y - centerY + mask.worldHeight * 0.5;
			const px = Math.floor(localX * mask.scaleX);
			const py = Math.floor(localY * mask.scaleY);
			const sample = (ix, iy) => {
				if (ix < 0 || ix >= mask.width || iy < 0 || iy >= mask.height) return 0;
				return mask.data[iy * mask.width + ix] ? 1 : 0;
			};
			const dx = sample(px + 1, py) - sample(px - 1, py);
			const dy = sample(px, py + 1) - sample(px, py - 1);
			let nx = -dx;
			let ny = -dy;
			let len = Math.hypot(nx, ny);
			if (len < 1e-3) {
				nx = x - centerX;
				ny = y - centerY;
				len = Math.hypot(nx, ny);
			}
			if (len < 1e-3) return { x: 1, y: 0 };
			return { x: nx / len, y: ny / len };
		}
		const nx = x - centerX;
		const ny = y - centerY;
		const len = Math.hypot(nx, ny);
		if (len < 1e-3) return { x: 1, y: 0 };
		return { x: nx / len, y: ny / len };
	}

	/**
	 * Resolve collision for a point with binary search
	 */
	function resolveCoverCollisionForPoint(rock, currX, currY, prevX, prevY) {
		if (!isPointInsideCover(rock, currX, currY)) return null;
		let insideX = currX;
		let insideY = currY;
		let outsideX = prevX;
		let outsideY = prevY;
		if (isPointInsideCover(rock, outsideX, outsideY)) {
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const dirX = insideX - centerX;
			const dirY = insideY - centerY;
			const len = Math.hypot(dirX, dirY) || 1;
			let step = 0;
			let found = false;
			while (step < 96) {
				outsideX = insideX + (dirX / len) * (step + 2);
				outsideY = insideY + (dirY / len) * (step + 2);
				if (!isPointInsideCover(rock, outsideX, outsideY)) {
					found = true;
					break;
				}
				step += 4;
			}
			if (!found) {
				const safeRadiusX = Math.max(rock.radiusX == null ? 80 : rock.radiusX, rock.width == null ? 0 : rock.width * 0.5);
				const safeRadiusY = Math.max(rock.radiusY == null ? 60 : rock.radiusY, rock.height == null ? 0 : rock.height * 0.5);
				outsideX = centerX + (dirX / len) * (safeRadiusX + 80);
				outsideY = centerY + (dirY / len) * (safeRadiusY + 80);
			}
		}
		for (let i = 0; i < 8; i++) {
			const midX = (insideX + outsideX) * 0.5;
			const midY = (insideY + outsideY) * 0.5;
			if (isPointInsideCover(rock, midX, midY)) {
				insideX = midX;
				insideY = midY;
			} else {
				outsideX = midX;
				outsideY = midY;
			}
		}
		let resolvedX = outsideX;
		let resolvedY = outsideY;
		if (isPointInsideCover(rock, resolvedX, resolvedY)) {
			const fallbackNormal = computeCoverSurfaceNormal(rock, insideX, insideY);
			resolvedX -= fallbackNormal.x * 2;
			resolvedY -= fallbackNormal.y * 2;
		}
		const normal = computeCoverSurfaceNormal(rock, insideX, insideY);
		return {
			collided: true,
			x: resolvedX,
			y: resolvedY,
			normal,
			hitPointX: insideX,
			hitPointY: insideY
		};
	}

	/**
	 * Encourage AI agents to step around the rock instead of sticking to its surface
	 */
	function applyCoverAvoidance(entity, opts = {}) {
		const state = getState();
		if (state.coverRocks.length === 0) return false;
		const padX = opts.padX == null ? 60 : opts.padX;
		const padY = opts.padY == null ? 52 : opts.padY;
		const detourDuration = opts.detourDuration == null ? 820 : opts.detourDuration;
		const detourSpeed = opts.detourSpeed;
		const pushSpeed = opts.pushSpeed;
		const cooldown = opts.cooldown == null ? 420 : opts.cooldown;
		const allowHorizontal = opts.allowHorizontal !== false;
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			const alreadyDetouring = entity.coverDetourTimer != null && entity.coverDetourTimer > 0;
			if (!alreadyDetouring && entity.coverDetourCooldown > 0) continue;
			if (!isPointInsideCover(rock, entity.x, entity.y, padX, padY)) continue;
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			if (alreadyDetouring && entity.coverDetourRockX != null) {
				const entrySide = entity.coverDetourEntrySide == null ? (entity.x >= entity.coverDetourRockX ? 1 : -1) : entity.coverDetourEntrySide;
				const relX = entity.x - entity.coverDetourRockX;
				const storedPad = entity.coverDetourPadX == null ? padX : Math.max(entity.coverDetourPadX, padX);
				const padMargin = Math.max(22, storedPad * 0.6);
				const radius = entity.coverDetourRockRadiusX == null
					? Math.max(storedPad, rock.radiusX == null ? (rock.width == null ? padX : rock.width * 0.5) : rock.radiusX)
					: entity.coverDetourRockRadiusX;
				const clear = radius + padMargin;
				if ((entrySide < 0 && relX > clear) || (entrySide > 0 && relX < -clear)) continue;
			}
			let dirY = entity.y >= centerY ? 1 : -1;
			if (Math.abs(entity.y - centerY) < 12) dirY = dirY === 0 ? (Math.random() < 0.5 ? -1 : 1) : dirY;
			const dirX = allowHorizontal ? (entity.x >= centerX ? 1 : -1) : 0;
			entity.coverDetourTimer = Math.max(entity.coverDetourTimer || 0, detourDuration);
			entity.coverDetourDirY = dirY === 0 ? (Math.random() < 0.5 ? -1 : 1) : dirY;
			entity.coverDetourDirX = dirX;
			entity.coverDetourRockX = centerX;
			const baseRadiusX = rock.radiusX == null ? (rock.width == null ? padX : rock.width * 0.5) : rock.radiusX;
			entity.coverDetourRockRadiusX = entity.coverDetourRockRadiusX == null ? Math.max(baseRadiusX, padX) : Math.max(entity.coverDetourRockRadiusX, Math.max(baseRadiusX, padX));
			entity.coverDetourEntrySide = dirX === 0 ? (entity.x >= centerX ? 1 : -1) : dirX;
			entity.coverDetourPadX = Math.max(entity.coverDetourPadX == null ? padX : entity.coverDetourPadX, padX);
			if (detourSpeed != null) entity.coverDetourSpeed = detourSpeed;
			else if (entity.coverDetourSpeed == null) entity.coverDetourSpeed = Math.max(entity.speed || 0.22, 0.18);
			if (allowHorizontal) {
				if (pushSpeed != null) entity.coverDetourPushSpeed = pushSpeed;
				else if (entity.coverDetourPushSpeed == null) entity.coverDetourPushSpeed = (entity.coverDetourSpeed || 0.22) * 0.6;
			} else {
				entity.coverDetourDirX = 0;
			}
			if (!alreadyDetouring) {
				const priorCooldown = entity.coverDetourCooldown == null ? 0 : entity.coverDetourCooldown;
				entity.coverDetourCooldown = Math.max(priorCooldown, cooldown);
			} else if (entity.coverDetourCooldown != null && entity.coverDetourCooldown < cooldown) {
				entity.coverDetourCooldown = cooldown;
			}
			return true;
		}
		return false;
	}

	/**
	 * Process detour movement for an entity
	 */
	function processCoverDetour(entity, dt, bounds = {}) {
		if (!entity.coverDetourTimer || entity.coverDetourTimer <= 0) return;
		entity.coverDetourTimer = Math.max(0, entity.coverDetourTimer - dt);
		const verticalSpeed = entity.coverDetourSpeed == null ? Math.max(entity.speed || 0.22, 0.18) : entity.coverDetourSpeed;
		const horizontalSpeed = entity.coverDetourPushSpeed == null ? verticalSpeed * 0.6 : entity.coverDetourPushSpeed;
		let dirX = entity.coverDetourDirX;
		if (dirX) {
			const storedPad = entity.coverDetourPadX == null ? 60 : entity.coverDetourPadX;
			const margin = Math.max(22, storedPad * 0.6);
			const rockX = entity.coverDetourRockX == null ? null : entity.coverDetourRockX;
			const rockRadius = entity.coverDetourRockRadiusX == null ? Math.max(72, storedPad) : entity.coverDetourRockRadiusX;
			if (rockX != null) {
				const distance = entity.x - rockX;
				const entrySide = entity.coverDetourEntrySide == null ? (distance >= 0 ? 1 : -1) : entity.coverDetourEntrySide;
				const clearDistance = rockRadius + margin;
				if ((entrySide < 0 && distance > clearDistance) || (entrySide > 0 && distance < -clearDistance)) {
					entity.coverDetourDirX = 0;
					dirX = 0;
				}
			}
		}
		if (dirX) entity.x += dirX * horizontalSpeed * dt;
		if (entity.coverDetourDirY) entity.y += entity.coverDetourDirY * verticalSpeed * dt;
		if (bounds.minX != null) entity.x = Math.max(bounds.minX, entity.x);
		if (bounds.maxX != null) entity.x = Math.min(bounds.maxX, entity.x);
		if (bounds.minY != null) {
			if (entity.y <= bounds.minY + 2 && entity.coverDetourDirY < 0) entity.coverDetourDirY = 1;
			entity.y = Math.max(bounds.minY, entity.y);
		}
		if (bounds.maxY != null) {
			if (entity.y >= bounds.maxY - 2 && entity.coverDetourDirY > 0) entity.coverDetourDirY = -1;
			entity.y = Math.min(bounds.maxY, entity.y);
		}
		if (entity.coverDetourTimer <= 0) {
			entity.coverDetourDirX = null;
			entity.coverDetourDirY = null;
			const minCooldown = entity.type === "ritterfisch" ? 520 : 640;
			if (entity.coverDetourCooldown == null || entity.coverDetourCooldown < minCooldown) entity.coverDetourCooldown = minCooldown;
		}
	}

	/**
	 * Get lane target for Ritterfisch AI to navigate around rocks
	 */
	function getRitterfischLaneTarget(foe, rock, minY, maxY) {
		const canvas = getCanvas();
		const baseLane = foe.anchorY == null ? foe.baseY : foe.anchorY;
		let target = baseLane + Math.sin(foe.sway * 0.45) * canvas.height * 0.035;
		if (rock && rock.landed) {
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const radiusX = rock.radiusX == null ? (rock.width == null ? 80 : rock.width * 0.5) : rock.radiusX;
			const radiusY = rock.radiusY == null ? (rock.height == null ? 60 : rock.height * 0.5) : rock.radiusY;
			const topEdge = centerY - radiusY;
			const laneA = clamp(topEdge - Math.max(26, radiusY * 0.35), minY, maxY);
			const laneB = clamp(topEdge - Math.max(50, radiusY * 0.6), minY, maxY);
			const useUpperLane = foe.lanePick == null ? Math.random() < 0.5 : foe.lanePick === 1;
			const preferredLane = useUpperLane ? laneB : laneA;
			const nearRock = foe.x < centerX + radiusX + 110 && foe.x > centerX - radiusX - 60;
			if (nearRock) target = preferredLane;
		}
		return clamp(target, minY, maxY);
	}

	/**
	 * Resolve player collision with cover rocks
	 */
	function resolvePlayerCoverCollision(player, prevX, prevY) {
		const state = getState();
		const canvas = getCanvas();
		if (state.coverRocks.length === 0) return;
		let lastSafeX = prevX;
		let lastSafeY = prevY;
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			const collision = resolveCoverCollisionForPoint(rock, player.x, player.y, lastSafeX, lastSafeY);
			if (!collision) continue;
			player.x = clamp(collision.x, 60, canvas.width - 60);
			player.y = clamp(collision.y, 60, canvas.height - 60);
			lastSafeX = player.x;
			lastSafeY = player.y;
		}
	}

	/**
	 * Resolve foe collision with cover rocks
	 */
	function resolveFoeCoverCollision(foe, prevX, prevY) {
		const state = getState();
		if (state.coverRocks.length === 0) {
			foe.coverCollisionDirection = null;
			return false;
		}
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			const collision = resolveCoverCollisionForPoint(rock, foe.x, foe.y, prevX, prevY);
			if (!collision) continue;
			foe.x = collision.x;
			foe.y = collision.y;
			const normal = collision.normal || { x: 0, y: 0 };
			const direction = Math.abs(normal.x) > Math.abs(normal.y)
				? (normal.x > 0 ? "right" : "left")
				: (normal.y > 0 ? "bottom" : "top");
			foe.coverCollisionDirection = direction;
			return true;
		}
		foe.coverCollisionDirection = null;
		return false;
	}

	/**
	 * Find if a point hits any cover rock
	 */
	function findCoverRockHit(x, y, padX = 0, padY = 0) {
		const state = getState();
		if (state.coverRocks.length === 0) return null;
		for (const rock of state.coverRocks) {
			if (!rock.landed) continue;
			if (isPointInsideCover(rock, x, y, padX, padY)) return rock;
		}
		return null;
	}

	/**
	 * Register an impact on a cover rock (pulse effect)
	 */
	function registerCoverRockImpact(rock, strength = 1) {
		if (!rock) return;
		const pulse = rock.hitPulse == null ? 0 : rock.hitPulse;
		const added = 140 * clamp(strength, 0.6, 2.4);
		rock.hitPulse = Math.min(520, pulse + added);
	}

	/**
	 * Update all cover rocks (physics, collision detection, player damage)
	 */
	function updateCoverRocks(dt) {
		const state = getState();
		const canvas = getCanvas();
		if (state.coverRocks.length === 0) return;

		const player = state.player;
		const SPRITES = getSPRITES ? getSPRITES() : null;

		for (const rock of state.coverRocks) {
			// Generate collision mask if needed
			if (!rock.collisionMask && SPRITES && spriteReady && spriteReady(SPRITES.coverRock)) {
				rock.collisionMask = getCoverRockCollisionMask(SPRITES.coverRock, rock.width, rock.height);
			}

			// Update ground line for level 3
			if (!rock.landed && state.levelIndex === 2) {
				const levelGround = getLevel3GroundLine ? getLevel3GroundLine() : null;
				if (levelGround != null) {
					const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
					const landHalfHeight = rock.landHalfHeight == null ? (rock.height == null ? radiusY : rock.height * 0.5) : rock.landHalfHeight;
					const minY = canvas.height * 0.22;
					rock.groundLine = levelGround;
					const maxY = Math.max(minY, rock.groundLine - landHalfHeight);
					rock.targetY = clamp(rock.groundLine - landHalfHeight, minY, maxY);
				}
			}

			// Update timers
			if (rock.damageCooldown > 0) rock.damageCooldown = Math.max(0, rock.damageCooldown - dt);
			if (rock.impactTimer > 0 && rock.landed) rock.impactTimer = Math.max(0, rock.impactTimer - dt);
			if (rock.hitPulse > 0) rock.hitPulse = Math.max(0, rock.hitPulse - dt);

			if (rock.landed) continue;

			// Delay before falling
			if (rock.delay > 0) {
				rock.delay = Math.max(0, rock.delay - dt);
				continue;
			}

			// Physics: gravity and falling
			const gravity = rock.gravity == null ? 0.0011 : rock.gravity;
			const maxSpeed = rock.maxFallSpeed == null ? 0.68 : rock.maxFallSpeed;
			rock.vy = (rock.vy || 0) + gravity * dt;
			if (rock.vy > maxSpeed) rock.vy = maxSpeed;
			rock.y += rock.vy * dt;

			const radiusY = rock.radiusY == null ? 60 : rock.radiusY;
			const landHalfHeight = rock.landHalfHeight == null ? (rock.height == null ? radiusY : rock.height * 0.5) : rock.landHalfHeight;

			// Check if landed
			if (rock.y + landHalfHeight >= rock.groundLine) {
				rock.y = rock.targetY == null ? rock.groundLine - landHalfHeight : rock.targetY;
				rock.vy = 0;
				rock.landed = true;
				rock.impactTimer = rock.impactTimer == null || rock.impactTimer <= 0 ? 520 : rock.impactTimer;
				continue;
			}

			// Player collision with falling rock
			const baseRadiusX = rock.radiusX == null ? 80 : rock.radiusX;
			const padX = rock.padX == null ? 42 : rock.padX;
			const padY = rock.padY == null ? 50 : rock.padY;
			const padLeft = rock.padLeft == null ? padX : rock.padLeft;
			const padRight = rock.padRight == null ? padX : rock.padRight;
			const padTop = rock.padTop == null ? padY : rock.padTop;
			const padBottom = rock.padBottom == null ? padY : rock.padBottom;
			const centerX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
			const centerY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
			const dx = player.x - centerX;
			const dy = player.y - centerY;
			const guardRadiusX = dx < 0 ? Math.max(20, baseRadiusX + padLeft) : Math.max(20, baseRadiusX + padRight);
			const guardRadiusY = dy < 0 ? Math.max(20, radiusY + padTop) : Math.max(20, radiusY + padBottom);
			const guardX = Math.max(46, guardRadiusX * 0.75);
			const guardY = Math.max(52, guardRadiusY * 0.8);
			const nx = dx / guardX;
			const ny = dy / guardY;

			if (nx * nx + ny * ny < 1) {
				if ((rock.damageCooldown || 0) <= 0 && damagePlayer) {
					damagePlayer(1);
					rock.damageCooldown = 900;
				}
				const pushDir = dx >= 0 ? 1 : -1;
				const pushRadius = pushDir < 0 ? Math.max(20, baseRadiusX + padLeft) : Math.max(20, baseRadiusX + padRight);
				player.x = clamp(centerX + pushDir * (pushRadius + 50), 60, canvas.width - 60);
				player.y = clamp(player.y, 60, canvas.height - 60);
			}
		}
	}

	return {
		isPointInsideCover,
		computeCoverSurfaceNormal,
		resolveCoverCollisionForPoint,
		applyCoverAvoidance,
		processCoverDetour,
		getRitterfischLaneTarget,
		resolvePlayerCoverCollision,
		resolveFoeCoverCollision,
		findCoverRockHit,
		registerCoverRockImpact,
		updateCoverRocks
	};
}
