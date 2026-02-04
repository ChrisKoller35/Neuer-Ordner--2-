/**
 * Foe Update System
 * 
 * Handles AI behavior for all foe types:
 * - Jelly: Simple movement
 * - Bogenschreck: Hover over cover, shoot arrows
 * - Oktopus: Orbit, dash, burst fire
 * - Ritterfisch: Lane patrol, charge attacks
 */

import { TAU } from '../core/constants.js';

/**
 * Create the foe update module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas
 * @param {Object} deps.state - Game state
 * @param {Function} deps.clamp - Clamp utility
 * @param {Function} deps.spawnBogenschreckArrow - Arrow spawner
 * @param {Function} deps.spawnOktopusBolt - Bolt spawner
 * @param {Function} deps.applyCoverAvoidance - Cover avoidance system
 * @param {Function} deps.processCoverDetour - Detour processing
 * @param {Function} deps.getRitterfischLaneTarget - Lane targeting
 * @param {Function} deps.resolveFoeCoverCollision - Collision resolver
 * @param {Function} deps.spawnLevelFoe - Foe spawner
 * @param {Function} deps.scheduleNextFoeSpawn - Spawn scheduler
 * @returns {Object} Update controller
 */
export function createFoeUpdateSystem(deps) {
    const {
        canvas,
        state,
        clamp,
        spawnBogenschreckArrow,
        spawnOktopusBolt,
        applyCoverAvoidance,
        processCoverDetour,
        getRitterfischLaneTarget,
        resolveFoeCoverCollision,
        spawnLevelFoe,
        scheduleNextFoeSpawn
    } = deps;

    /**
     * Update bogenschreck foe behavior (hover over cover, shoot arrows).
     */
    function updateBogenschreck(foe, dt, primaryCoverRock, drift) {
        const rock = primaryCoverRock;
        let rockCenterX = null;
        let rockCenterY = null;
        let rockRadiusX = null;
        let rockRadiusY = null;
        let desiredHoverX = null;
        let hoveringOverCover = false;

        if (rock && rock.landed) {
            rockCenterX = rock.x + (rock.collisionOffsetX == null ? 0 : rock.collisionOffsetX);
            rockCenterY = rock.y + (rock.collisionOffsetY == null ? 0 : rock.collisionOffsetY);
            rockRadiusX = rock.radiusX == null ? (rock.width == null ? 80 : rock.width * 0.5) : rock.radiusX;
            rockRadiusY = rock.radiusY == null ? (rock.height == null ? 60 : rock.height * 0.5) : rock.radiusY;
            const forwardThreshold = rockCenterX + rockRadiusX + 36;
            const hoverX = rockCenterX + Math.max(rockRadiusX * 0.12, 18);
            desiredHoverX = hoverX;
            const topEdge = rockCenterY - rockRadiusY;
            const baseHoverY = clamp(topEdge - Math.max(24, rockRadiusY * 0.28), canvas.height * 0.18, canvas.height * 0.58);
            const hoverAmplitude = Math.max(18, Math.min(34, rockRadiusY * 0.36));

            if (!foe.coverHoverMode && foe.x <= forwardThreshold) {
                foe.coverHoverMode = true;
                foe.coverHoverPhase = foe.coverHoverPhase == null ? Math.random() * TAU : foe.coverHoverPhase;
                foe.coverHoverBaseY = baseHoverY;
                foe.coverHoverAmplitude = hoverAmplitude;
                foe.coverHoverX = hoverX;
                foe.coverDetourTimer = 0;
            } else if (foe.coverHoverMode && foe.x > forwardThreshold + 84) {
                foe.coverHoverMode = false;
            }

            if (foe.coverHoverMode) {
                hoveringOverCover = true;
                foe.coverHoverPhase = (foe.coverHoverPhase == null ? Math.random() * TAU : foe.coverHoverPhase) + dt * 0.0028;
                const approachSpeed = Math.max(foe.speed || 0.18, 0.22);
                const targetX = foe.coverHoverX == null ? hoverX : foe.coverHoverX;
                foe.x += clamp(targetX - foe.x, -approachSpeed * dt, approachSpeed * dt);
                const amplitude = foe.coverHoverAmplitude == null ? hoverAmplitude : foe.coverHoverAmplitude;
                const baseY = foe.coverHoverBaseY == null ? baseHoverY : foe.coverHoverBaseY;
                const bob = Math.sin(foe.coverHoverPhase) * amplitude;
                const targetY = clamp(baseY + bob + drift * 6, canvas.height * 0.18, canvas.height * 0.66);
                foe.y += clamp(targetY - foe.y, -0.28 * dt, 0.28 * dt);
                foe.anchorX = targetX;
                foe.anchorY = baseY;
            }
        } else if (foe.coverHoverMode) {
            foe.coverHoverMode = false;
        }

        if (!hoveringOverCover) {
            if (desiredHoverX != null && rockRadiusX != null) {
                const entryAnchor = desiredHoverX + Math.max(12, rockRadiusX * 0.08);
                if (foe.anchorX == null || foe.anchorX > entryAnchor + 1) foe.anchorX = entryAnchor;
            }
            if (foe.x > foe.anchorX) foe.x = Math.max(foe.anchorX, foe.x - foe.speed * dt);
            else foe.x += Math.sin(foe.sway * 0.5) * 0.015 * dt;
            if (foe.hoverPhase == null) foe.hoverPhase = Math.random() * TAU;
            foe.hoverPhase += dt * 0.0026;
            const hover = Math.sin(foe.hoverPhase) * (foe.hoverAmplitude || 16) * 0.03 * dt;
            foe.y += drift * 0.4 + hover;
            foe.y = clamp(foe.y, canvas.height * 0.24, canvas.height * 0.76);
        } else {
            foe.y = clamp(foe.y, canvas.height * 0.18, canvas.height * 0.7);
        }

        // Shooting
        foe.shootTimer -= dt;
        if (foe.shootTimer <= 0) {
            spawnBogenschreckArrow(foe);
            foe.shootTimer = (foe.shootCooldown || 2400) + Math.random() * 400;
        }
    }

    /**
     * Update oktopus foe behavior (orbit, dash, burst fire).
     */
    function updateOktopus(foe, dt, drift) {
        const minY = canvas.height * 0.24;
        const maxY = canvas.height * 0.78;
        const minAnchorX = canvas.width * 0.48;
        const maxAnchorX = canvas.width * 0.8;

        // Lane shift timer
        if (foe.laneShiftTimer != null) {
            foe.laneShiftTimer -= dt;
            if (foe.laneShiftTimer <= 0) {
                const cooldown = foe.laneShiftCooldown == null ? 2400 : foe.laneShiftCooldown;
                foe.laneShiftTimer = cooldown + Math.random() * 420;
                const verticalShift = (Math.random() - 0.5) * canvas.height * 0.22;
                const horizontalShift = (Math.random() - 0.5) * 120;
                const baseAnchorY = foe.anchorY == null ? foe.y : foe.anchorY;
                const baseAnchorX = foe.anchorX == null ? canvas.width * 0.64 : foe.anchorX;
                foe.anchorY = clamp(baseAnchorY + verticalShift, minY + 36, maxY - 36);
                foe.anchorX = clamp(baseAnchorX + horizontalShift, minAnchorX, maxAnchorX);
                foe.dashDir = horizontalShift < 0 ? -1 : 1;
                foe.dashTimer = foe.dashDuration == null ? 420 : foe.dashDuration;
            }
        }

        // Orbit movement
        const orbitSpeed = foe.orbitSpeed == null ? 0.0016 : foe.orbitSpeed;
        const orbitRadius = foe.orbitRadius == null ? 30 : foe.orbitRadius;
        const orbitVertical = foe.orbitVertical == null ? 28 : foe.orbitVertical;
        foe.orbitAngle = (foe.orbitAngle == null ? Math.random() * TAU : foe.orbitAngle) + orbitSpeed * dt;
        const anchorX = clamp(foe.anchorX == null ? canvas.width * 0.64 : foe.anchorX, minAnchorX, maxAnchorX);
        const anchorY = clamp(foe.anchorY == null ? foe.baseY : foe.anchorY, minY + 24, maxY - 24);

        // Dash offset
        let dashOffset = 0;
        if (foe.dashTimer > 0) {
            const dashDuration = foe.dashDuration == null || foe.dashDuration <= 0 ? 420 : foe.dashDuration;
            foe.dashTimer = Math.max(0, foe.dashTimer - dt);
            const elapsed = dashDuration - foe.dashTimer;
            const progress = clamp(elapsed / dashDuration, 0, 1);
            const eased = Math.sin(progress * Math.PI);
            const dashDistance = foe.dashDistance == null ? 54 : foe.dashDistance;
            dashOffset = foe.dashDir * dashDistance * eased;
        }

        const swirl = Math.sin(foe.orbitAngle * 0.75) * 4;
        const desiredX = clamp(anchorX + Math.cos(foe.orbitAngle) * orbitRadius + dashOffset, minAnchorX, canvas.width * 0.82);
        const desiredY = clamp(anchorY + Math.sin(foe.orbitAngle * 1.35) * orbitVertical + swirl + drift * 6, minY, maxY);
        const lateralSpeed = Math.max(0.18, foe.speed || 0.18);
        const verticalSpeed = lateralSpeed * 0.92 + 0.06;
        const stepX = clamp(desiredX - foe.x, -lateralSpeed * dt, lateralSpeed * dt);
        const stepY = clamp(desiredY - foe.y, -verticalSpeed * dt, verticalSpeed * dt);
        foe.x += stepX;
        foe.y += stepY;
        foe.anchorX = anchorX;
        foe.anchorY = anchorY;

        // Burst fire
        foe.shootTimer -= dt;
        if (foe.shootTimer <= 0) {
            const burstCount = Math.max(1, foe.burstCount == null ? 2 : foe.burstCount);
            if (!foe.burstQueue || foe.burstQueue <= 0) foe.burstQueue = burstCount;
            foe.burstQueue -= 1;
            spawnOktopusBolt(foe);
            if (foe.burstQueue > 0) {
                foe.shootTimer = (foe.volleySpacing || 260) + Math.random() * 160;
            } else {
                foe.shootTimer = (foe.shootCooldown || 3200) + Math.random() * 520;
                foe.burstQueue = 0;
            }
        }
    }

    /**
     * Update ritterfisch foe behavior (lane patrol, charge).
     */
    function updateRitterfisch(foe, dt, primaryCoverRock, drift, prevX, prevY) {
        const player = state.player;
        const minY = canvas.height * 0.24;
        const maxY = canvas.height * 0.78;

        if (foe.anchorX == null) foe.anchorX = canvas.width * 0.68;
        const anchorDrift = primaryCoverRock ? 0.022 : 0.015;
        foe.anchorX -= anchorDrift * dt;
        foe.anchorX = Math.min(foe.anchorX, foe.x + 60);
        if (foe.passing) foe.anchorX = Math.min(foe.anchorX, foe.x + 10);
        const anchorX = foe.anchorX;

        if (foe.lanePick == null) foe.lanePick = Math.random() < 0.5 ? 0 : 1;
        foe.anchorY = getRitterfischLaneTarget(foe, primaryCoverRock, minY, maxY);
        const homeY = foe.anchorY == null ? foe.baseY : foe.anchorY;
        const patrolRange = foe.patrolRange == null ? 20 : foe.patrolRange;
        const cruiseSpeed = foe.cruiseSpeed == null ? 0.18 : foe.cruiseSpeed;
        const chargeSpeed = foe.chargeSpeed == null ? 0.46 : foe.chargeSpeed;

        // Check if passing player
        if (!foe.passing && (foe.x < player.x + 70 || foe.x < canvas.width * 0.22)) {
            foe.passing = true;
            foe.chargeTimer = Math.max(foe.chargeTimer || 0, 500);
        }

        if (foe.recoverTimer > 0) foe.recoverTimer = Math.max(0, foe.recoverTimer - dt);

        if (foe.charging) {
            foe.chargeDuration += dt;
            foe.x -= chargeSpeed * dt;
            const targetY = clamp(player.y, minY, maxY);
            const dy = targetY - foe.y;
            const adjust = clamp(dy * 0.0022 * dt, -0.32 * dt, 0.32 * dt);
            foe.y = clamp(foe.y + adjust + Math.sin(foe.chargeDuration * 0.008) * 0.08 * dt, minY, maxY);
            foe.damage = 2;

            // End charge conditions
            if (foe.x < player.x - 140 || foe.chargeDuration >= 900 || foe.x < -80) {
                foe.charging = false;
                foe.chargeDuration = 0;
                foe.damage = 1;
                foe.recoverTimer = 600;
                foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 400;
                foe.speed = cruiseSpeed;
            }
        } else {
            if (foe.passing) {
                foe.damage = 1;
                foe.speed = cruiseSpeed;
                foe.x -= cruiseSpeed * dt;
                const pursue = (player.y - foe.y) * 0.0012 * dt;
                const homePull = (homeY - foe.y) * 0.0016 * dt;
                foe.y = clamp(foe.y + pursue + homePull + drift * 0.25, minY, maxY);
            } else {
                foe.damage = 1;
                foe.speed = cruiseSpeed;
                const patrolOffset = Math.sin(foe.sway * 0.55) * patrolRange;
                const desiredX = anchorX + patrolOffset;
                const dx = desiredX - foe.x;
                const step = clamp(dx, -foe.speed * dt, foe.speed * dt);
                foe.x += step;
                foe.y += drift * 0.25;
                const pursue = (player.y - foe.y) * 0.0012 * dt;
                const homePull = (homeY - foe.y) * 0.0018 * dt;
                foe.y = clamp(foe.y + pursue + homePull, minY, maxY);
                foe.chargeTimer -= dt;

                // Check charge conditions
                if (foe.chargeTimer <= 0 && (foe.recoverTimer || 0) <= 0) {
                    const horizontalGap = foe.x - player.x;
                    const verticalGap = Math.abs(foe.y - player.y);
                    if (horizontalGap > canvas.width * 0.18 && verticalGap < canvas.height * 0.2) {
                        foe.charging = true;
                        foe.chargeDuration = 0;
                        foe.chargeTimer = foe.chargeCooldown || 3200;
                    } else {
                        foe.chargeTimer = 600 + Math.random() * 400;
                    }
                }
            }
        }

        // Cover collision
        const hitCover = resolveFoeCoverCollision(foe, prevX, prevY);
        if (hitCover && foe.charging) {
            foe.charging = false;
            foe.chargeDuration = 0;
            foe.damage = 1;
            foe.recoverTimer = Math.max(foe.recoverTimer || 0, 700);
            foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 160;
            foe.speed = cruiseSpeed;
        }
    }

    /**
     * Update simple jelly foe.
     */
    function updateJelly(foe, dt, drift) {
        foe.x -= foe.speed * dt;
        foe.y += drift;
        foe.y = clamp(foe.y, canvas.height * 0.2, canvas.height * 0.78);
    }

    /**
     * Apply cover avoidance and detour for foe.
     */
    function applyFoeCoverAvoidance(foe, dt, primaryCoverRock, prevX, prevY) {
        const isRitterfisch = foe.type === "ritterfisch";
        const isBogenschreck = foe.type === "bogenschreck";

        if (foe.type !== "ritterfisch") resolveFoeCoverCollision(foe, prevX, prevY);

        const ritterBaseSpeed = isRitterfisch
            ? (foe.charging ? Math.max(foe.chargeSpeed || 0.46, 0.46) * 0.75 : Math.max(foe.speed || 0.24, 0.26) + 0.09)
            : 0;
        const detourSpeed = isRitterfisch ? Math.max(0.34, ritterBaseSpeed) : Math.max(0.24, foe.speed || 0.24);
        const pushSpeed = isRitterfisch ? Math.max(0.36, detourSpeed * 0.95) : detourSpeed * 0.62;
        const wantsAvoidance = !(isBogenschreck && foe.coverHoverMode);

        const avoidanceTriggered = wantsAvoidance && applyCoverAvoidance(foe, {
            padX: isRitterfisch ? 132 : isBogenschreck ? 60 : 72,
            padY: isRitterfisch ? 108 : isBogenschreck ? 52 : 58,
            detourDuration: isRitterfisch ? 1400 : 760,
            detourSpeed,
            pushSpeed,
            cooldown: isRitterfisch ? 420 : 360
        });

        if (isRitterfisch && avoidanceTriggered) {
            if (foe.charging) {
                foe.charging = false;
                foe.chargeDuration = 0;
                foe.damage = 1;
                foe.recoverTimer = Math.max(foe.recoverTimer || 0, 520);
                foe.chargeTimer = (foe.chargeCooldown || 3200) + Math.random() * 200;
                foe.speed = foe.cruiseSpeed == null ? (foe.speed || 0.22) : foe.cruiseSpeed;
            }
            if (primaryCoverRock) {
                const centerY = primaryCoverRock.y + (primaryCoverRock.collisionOffsetY == null ? 0 : primaryCoverRock.collisionOffsetY);
                if (!foe.coverDetourDirY) {
                    const homeY = foe.anchorY == null ? foe.baseY : foe.anchorY;
                    const preferDown = foe.y > homeY + 6;
                    const preferUp = foe.y < homeY - 6;
                    if (preferDown) foe.coverDetourDirY = -1;
                    else if (preferUp) foe.coverDetourDirY = 1;
                    else foe.coverDetourDirY = foe.y >= centerY ? 1 : -1;
                }
                if (foe.coverDetourSpeed == null || foe.coverDetourSpeed < detourSpeed) foe.coverDetourSpeed = detourSpeed;
                if (foe.coverDetourPushSpeed == null || foe.coverDetourPushSpeed < pushSpeed) foe.coverDetourPushSpeed = pushSpeed;
            }
        }

        processCoverDetour(foe, dt, {
            minX: -140,
            maxX: canvas.width - 40,
            minY: canvas.height * 0.2,
            maxY: canvas.height * 0.82
        });
    }

    /**
     * Main update loop for all foes.
     * @param {number} dt - Delta time
     */
    function updateFoes(dt) {
        const primaryCoverRock = state.coverRocks.find(rock => rock.landed);

        for (const foe of state.foes) {
            if (foe.dead) continue;
            if (foe.coverDetourCooldown > 0) foe.coverDetourCooldown = Math.max(0, foe.coverDetourCooldown - dt);
            foe.sway += dt * 0.0036;
            const drift = Math.sin(foe.sway * 1.4) * 0.06 * dt;
            const prevX = foe.x;
            const prevY = foe.y;

            // Type-specific behavior
            if (foe.type === "bogenschreck") {
                updateBogenschreck(foe, dt, primaryCoverRock, drift);
            } else if (foe.type === "oktopus") {
                updateOktopus(foe, dt, drift);
            } else if (foe.type === "ritterfisch") {
                updateRitterfisch(foe, dt, primaryCoverRock, drift, prevX, prevY);
            } else {
                updateJelly(foe, dt, drift);
            }

            // Cover avoidance (for all types)
            applyFoeCoverAvoidance(foe, dt, primaryCoverRock, prevX, prevY);
        }

        // Filter out dead/offscreen foes
        state.foes = state.foes.filter(foe => !foe.dead && foe.x > (foe.type === "ritterfisch" ? -160 : -90));

        // Spawn new foes
        if (!state.over && !state.boss.active && !state.pendingSymbolAdvance) {
            state.foeSpawnTimer -= dt;
            if (state.foeSpawnTimer <= 0) {
                spawnLevelFoe();
                scheduleNextFoeSpawn();
            }
        }
    }

    return {
        updateFoes,
        updateBogenschreck,
        updateOktopus,
        updateRitterfisch,
        updateJelly
    };
}
