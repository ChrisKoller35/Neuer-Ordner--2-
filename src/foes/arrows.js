/**
 * Foe Arrows/Projectiles System
 * 
 * Handles spawning and updating of foe projectiles:
 * - Bogenschreck arrows
 * - Oktopus bolts/blowdarts
 */

import { TAU } from '../core/constants.js';

/**
 * Create the foe arrows module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas
 * @param {Object} deps.state - Game state
 * @param {Function} deps.findCoverRockHit - Cover collision check
 * @param {Function} deps.registerCoverRockImpact - Impact effect
 * @param {boolean} deps.USE_CLASSIC_OKTOPUS_PROJECTILE - Feature flag
 * @returns {Object} Arrows controller
 */
export function createFoeArrowsSystem(deps) {
    const {
        canvas,
        state,
        findCoverRockHit,
        registerCoverRockImpact,
        USE_CLASSIC_OKTOPUS_PROJECTILE
    } = deps;

    /**
     * Spawn an oktopus bolt aimed at the player.
     * @param {Object} foe - The oktopus foe
     */
    function spawnOktopusBolt(foe) {
        const player = state.player;
        const originX = foe.x - 28;
        const originY = foe.y - 6;
        const targetX = player.x + (Math.random() - 0.5) * 26;
        const targetY = player.y + (Math.random() - 0.5) * 20;
        const dx = targetX - originX;
        const dy = targetY - originY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = foe.projectileSpeed == null ? 0.38 + Math.random() * 0.04 : foe.projectileSpeed;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        const wobbleSpeed = 0.0036 + Math.random() * 0.0014;
        const useClassic = !!USE_CLASSIC_OKTOPUS_PROJECTILE;

        state.foeArrows.push({
            type: useClassic ? "octo-bolt" : "octo-blowdart",
            x: originX,
            y: originY,
            vx,
            vy,
            life: 4200,
            rotation: Math.atan2(vy, vx) + Math.PI,
            damage: 1,
            spriteKey: useClassic ? "oktopusProjectile" : null,
            spriteScale: useClassic ? 0.15 : undefined,
            spriteOffsetX: useClassic ? 4 : undefined,
            spriteOffsetY: useClassic ? -1 : undefined,
            flip: useClassic ? true : undefined,
            wobblePhase: Math.random() * TAU,
            wobbleSpeed,
            wobbleAmplitude: 12 + Math.random() * 6,
            hitRadius: useClassic ? 18 : 26,
            parryRadius: useClassic ? 13 : 18
        });
    }

    /**
     * Spawn a bogenschreck arrow aimed at the player.
     * @param {Object} foe - The bogenschreck foe
     */
    function spawnBogenschreckArrow(foe) {
        const player = state.player;
        const originX = foe.x - 34;
        const originY = foe.y - 10;
        const dx = player.x - originX;
        const dy = player.y - originY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 0.46 + Math.random() * 0.06;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        state.foeArrows.push({
            type: "arrow",
            x: originX,
            y: originY,
            vx,
            vy,
            life: 4800,
            rotation: Math.atan2(vy, vx),
            damage: 1,
            hitRadius: 24,
            parryRadius: 16
        });
    }

    /**
     * Update all foe arrows (movement, collision, lifetime).
     * @param {number} dt - Delta time
     */
    function updateFoeArrows(dt) {
        for (const arrow of state.foeArrows) {
            const type = arrow.type || "arrow";

            // Movement
            arrow.x += arrow.vx * dt;
            arrow.y += arrow.vy * dt;

            // Wobble for octo projectiles
            if (type === "octo-bolt" || type === "octo-blowdart") {
                arrow.wobblePhase = (arrow.wobblePhase || 0) + (arrow.wobbleSpeed || 0) * dt;
                const wobble = Math.sin(arrow.wobblePhase) * (arrow.wobbleAmplitude || 0) * 0.003 * dt;
                arrow.y += wobble;
                arrow.rotation = Math.atan2(arrow.vy, arrow.vx) + Math.PI;
            } else if (arrow.rotation == null) {
                arrow.rotation = Math.atan2(arrow.vy, arrow.vx);
            }

            // Cover collision
            const padX = arrow.blockPadX == null ? 28 : arrow.blockPadX;
            const padY = arrow.blockPadY == null ? 38 : arrow.blockPadY;
            const cover = findCoverRockHit(arrow.x, arrow.y, padX, padY);
            if (cover) {
                arrow.life = 0;
                registerCoverRockImpact(cover, type === "octo-bolt" ? 0.9 : 0.7);
                continue;
            }

            arrow.life -= dt;
        }

        // Filter out dead/offscreen arrows
        state.foeArrows = state.foeArrows.filter(arrow =>
            arrow.life > 0 &&
            arrow.x > -160 &&
            arrow.x < canvas.width + 160 &&
            arrow.y > -120 &&
            arrow.y < canvas.height + 120
        );
    }

    return {
        spawnOktopusBolt,
        spawnBogenschreckArrow,
        updateFoeArrows
    };
}
