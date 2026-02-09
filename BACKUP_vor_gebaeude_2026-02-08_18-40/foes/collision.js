/**
 * Foe Collision System
 * 
 * Handles collision detection between:
 * - Player shots and foes
 * - Player shots and foe arrows
 * - Player and foes
 * - Player and foe arrows
 */

import { TAU } from '../core/constants.js';

/**
 * Create the foe collision module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.state - Game state
 * @param {Function} deps.getFoeHitbox - Hitbox calculator
 * @param {Function} deps.awardFoeDefeat - Reward function
 * @param {Function} deps.damagePlayer - Damage function
 * @param {Function} deps.triggerEventFlash - Flash effect
 * @param {Function} deps.updateHUD - HUD update
 * @param {Function} deps.collectCoinDrop - Coin collector
 * @param {Function} deps.collectSymbolDrop - Symbol collector
 * @returns {Object} Collision controller
 */
export function createFoeCollisionSystem(deps) {
    const {
        state,
        getFoeHitbox,
        awardFoeDefeat,
        damagePlayer,
        triggerEventFlash,
        updateHUD,
        collectCoinDrop,
        collectSymbolDrop
    } = deps;

    /**
     * Handle player shots hitting foes.
     */
    function handleShotFoeHits() {
        if (state.shots.length === 0) return;
        for (const shot of state.shots) {
            if (shot.life <= 0) continue;
            for (const foe of state.foes) {
                if (foe.dead) continue;
                const dx = foe.x - shot.x;
                const dy = foe.y - shot.y;
                const { width: hitWidth, height: hitHeight } = getFoeHitbox(foe);
                const nx = dx / hitWidth;
                const ny = dy / hitHeight;
                if (nx * nx + ny * ny < 1) {
                    foe.dead = true;
                    shot.life = 0;
                    awardFoeDefeat(foe);
                    break;
                }
            }
        }
    }

    /**
     * Handle player shots hitting foe arrows (parry).
     */
    function handleShotFoeArrowHits() {
        if (state.shots.length === 0 || state.foeArrows.length === 0) return;
        for (const shot of state.shots) {
            if (shot.life <= 0) continue;
            for (const arrow of state.foeArrows) {
                if (arrow.life <= 0) continue;
                const dx = arrow.x - shot.x;
                const dy = arrow.y - shot.y;
                const radius = arrow.parryRadius == null ? 16 : arrow.parryRadius;
                if (Math.hypot(dx, dy) < radius) {
                    arrow.life = 0;
                    shot.life = 0;
                    break;
                }
            }
        }
        state.foeArrows = state.foeArrows.filter(arrow => arrow.life > 0);
    }

    /**
     * Handle player shots hitting boss torpedoes.
     */
    function handleShotTorpedoHits() {
        if (state.shots.length === 0 || state.bossTorpedoes.length === 0) return;
        const reward = 3;
        for (const shot of state.shots) {
            if (shot.life <= 0) continue;
            for (const torpedo of state.bossTorpedoes) {
                if (torpedo.life <= 0) continue;
                const dx = torpedo.x - shot.x;
                const dy = torpedo.y - shot.y;
                const hitRadius = torpedo.radius || 18;
                if (Math.hypot(dx, dy) < hitRadius) {
                    torpedo.life = 0;
                    shot.life = 0;
                    state.score += reward;
                    state.levelScore += reward;
                    triggerEventFlash("torpedo", { text: "+Rammung" });
                    break;
                }
            }
        }
        state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0);
    }

    /**
     * Handle player colliding with foes.
     */
    function handlePlayerFoeCollisions() {
        if (state.over) return;
        const player = state.player;
        for (const foe of state.foes) {
            if (foe.dead) continue;
            const dx = player.x - foe.x;
            const dy = player.y - foe.y;
            const { width: hitWidth, height: hitHeight } = getFoeHitbox(foe, { forPlayer: true });
            const nx = dx / hitWidth;
            const ny = dy / hitHeight;
            if (nx * nx + ny * ny < 1) {
                foe.dead = true;
                damagePlayer(foe.damage == null ? 1 : foe.damage);
            }
        }
    }

    /**
     * Handle player getting hit by foe arrows.
     */
    function handlePlayerFoeArrowCollisions() {
        if (state.over || state.foeArrows.length === 0) return;
        const player = state.player;
        for (const arrow of state.foeArrows) {
            if (arrow.life <= 0) continue;
            const dx = player.x - arrow.x;
            const dy = player.y - arrow.y;
            const hitRadius = arrow.hitRadius == null ? 28 : arrow.hitRadius;
            if (Math.hypot(dx, dy) < hitRadius) {
                arrow.life = 0;
                damagePlayer(arrow.damage || 1);
            }
        }
        state.foeArrows = state.foeArrows.filter(arrow => arrow.life > 0);
    }

    /**
     * Handle player collecting heal pickups.
     */
    function handlePlayerHealPickups() {
        if (state.over || state.healPickups.length === 0) return;
        const player = state.player;
        let collected = false;
        for (const heal of state.healPickups) {
            if (heal.life <= 0) continue;
            const dx = player.x - heal.x;
            const dy = player.y - heal.y;
            const radius = 26 * (heal.scale || 1);
            if (Math.hypot(dx, dy) < radius) {
                heal.life = 0;
                if (state.hearts < state.maxHearts) {
                    state.hearts = Math.min(state.maxHearts, state.hearts + 1);
                    collected = true;
                    triggerEventFlash("heal", { text: "Erfrischt!" });
                    const burstCount = 10;
                    for (let i = 0; i < burstCount; i += 1) {
                        const angle = (i / burstCount) * TAU + Math.random() * 0.6;
                        state.healBursts.push({
                            x: player.x,
                            y: player.y,
                            vx: Math.cos(angle) * 0.14,
                            vy: Math.sin(angle) * 0.18,
                            rad: 12 + Math.random() * 8,
                            life: 900,
                            fade: 900
                        });
                    }
                }
            }
        }
        if (collected) updateHUD();
        state.healPickups = state.healPickups.filter(heal => heal.life > 0);
    }

    /**
     * Handle player collecting coin drops.
     */
    function handlePlayerCoinDrops() {
        if (state.over || state.coinDrops.length === 0) return;
        const player = state.player;
        for (const coin of state.coinDrops) {
            if (coin.collected || coin.dead) continue;
            const dx = player.x - coin.x;
            const dy = player.y - coin.y;
            if (Math.hypot(dx, dy) < 34) {
                collectCoinDrop(coin);
            }
        }
    }

    /**
     * Handle player collecting symbol drops.
     */
    function handlePlayerSymbolDrops() {
        if (state.over || state.symbolDrops.length === 0) return;
        const player = state.player;
        for (const drop of state.symbolDrops) {
            if (drop.collected) continue;
            const dx = player.x - drop.x;
            const dy = player.y - drop.y;
            const radius = 40;
            if (Math.hypot(dx, dy) < radius) {
                collectSymbolDrop(drop, { auto: false });
            }
        }
    }

    return {
        handleShotFoeHits,
        handleShotFoeArrowHits,
        handleShotTorpedoHits,
        handlePlayerFoeCollisions,
        handlePlayerFoeArrowCollisions,
        handlePlayerHealPickups,
        handlePlayerCoinDrops,
        handlePlayerSymbolDrops
    };
}
