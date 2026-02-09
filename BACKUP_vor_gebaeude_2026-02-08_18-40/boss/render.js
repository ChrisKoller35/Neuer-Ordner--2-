/**
 * Boss Render System
 * 
 * Handles rendering of all boss attacks and effects:
 * - Torpedoes, Fin Sweeps, Wake Waves
 * - Whirlpools, Diamond Beams, Shockwaves
 * - Perfume Orbs, Fragrance Clouds
 * - Coin Bursts/Explosions, Card Boomerangs
 * - Katapult Shots, Speedboats
 */

import { TAU } from '../core/constants.js';
import { clamp01 } from '../core/utils.js';

/**
 * Create the boss render module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {CanvasRenderingContext2D} deps.ctx
 * @param {HTMLCanvasElement} deps.canvas
 * @param {Object} deps.state - Game state
 * @returns {Object} Render controller
 */
export function createBossRenderSystem(deps) {
    const { ctx, canvas, state } = deps;

    function renderBossTorpedoes() {
        if (state.bossTorpedoes.length === 0) return;
        ctx.save();
        for (const torpedo of state.bossTorpedoes) {
            if (torpedo.life <= 0) continue;
            const radius = torpedo.radius || 18;
            const length = radius * 1.7;
            const angle = Math.atan2(torpedo.vy, torpedo.vx);
            ctx.save();
            ctx.translate(torpedo.x, torpedo.y);
            ctx.rotate(angle);
            const grad = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
            grad.addColorStop(0, "rgba(255,180,120,0.15)");
            grad.addColorStop(0.35, "rgba(255,220,160,0.4)");
            grad.addColorStop(1, "rgba(255,140,80,0.75)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, length, radius * 0.72, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,210,130,0.55)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-length * 0.6, -radius * 0.55);
            ctx.lineTo(length * 0.7, 0);
            ctx.lineTo(-length * 0.6, radius * 0.55);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossPerfumeOrbs() {
        if (state.bossPerfumeOrbs.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const orb of state.bossPerfumeOrbs) {
            ctx.save();
            ctx.translate(orb.x, orb.y);
            const radius = (orb.radius || 18) * 1.2;
            const baseLife = orb.initialLife || 5200;
            const lifeRatio = clamp01(orb.life / Math.max(1, baseLife));
            const spin = orb.spin || 0;
            const flash = 0.6 + Math.sin((now * 0.004) + (orb.spawnedAt || now) * 0.0006 + spin * 2.4) * 0.2;
            const glow = 0.8 + Math.sin((now * 0.007) + (orb.sway || 0)) * 0.18;
            const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
            grad.addColorStop(0, `rgba(255,255,255,${0.95 * flash})`);
            grad.addColorStop(0.25, `rgba(255,210,255,${0.75 * flash})`);
            grad.addColorStop(0.6, `rgba(230,120,230,${0.55 * glow})`);
            grad.addColorStop(1, "rgba(130,20,180,0)");
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = 3.4;
            ctx.strokeStyle = `rgba(255,160,245,${0.45 + 0.35 * (1 - lifeRatio)})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.84, 0, TAU);
            ctx.stroke();
            ctx.save();
            ctx.rotate(spin);
            ctx.lineWidth = 2.1;
            ctx.strokeStyle = `rgba(255,235,255,${0.75})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.54, -0.7, 0.7);
            ctx.stroke();
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = `rgba(200,60,200,0.6)`;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 1.05, 0.2, TAU * 0.42);
            ctx.stroke();
            ctx.restore();
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossFragranceClouds() {
        if (state.bossFragranceClouds.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const cloud of state.bossFragranceClouds) {
            const alpha = clamp01(cloud.life / Math.max(1, cloud.duration));
            const radius = cloud.radius || 60;
            const pulse = 0.8 + Math.sin((cloud.pulse || 0) + now * 0.0027) * 0.25;
            const glow = 0.65 + Math.sin((cloud.swirl || 0) * 1.6 + now * 0.0018) * 0.18;
            const grad = ctx.createRadialGradient(cloud.x, cloud.y, radius * 0.12, cloud.x, cloud.y, radius * 1.05);
            grad.addColorStop(0, `rgba(255,250,255,${0.6 * pulse})`);
            grad.addColorStop(0.35, `rgba(255,175,240,${0.48 * pulse})`);
            grad.addColorStop(0.65, `rgba(210,90,220,${0.4 * glow})`);
            grad.addColorStop(1, "rgba(80,20,110,0)");
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, radius, 0, TAU);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = `rgba(255,150,240,${0.35 + 0.4 * (1 - alpha)})`;
            ctx.lineWidth = 4.4;
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, radius * 0.92, 0, TAU);
            ctx.stroke();
            const swirl = cloud.swirl || 0;
            const ellipseCount = 3;
            for (let i = 0; i < ellipseCount; i += 1) {
                const angle = swirl + i * (TAU / ellipseCount);
                const ellRadius = radius * (0.48 + i * 0.18);
                ctx.lineWidth = 1.8;
                ctx.strokeStyle = `rgba(255,215,250,${0.28 * alpha})`;
                ctx.beginPath();
                ctx.ellipse(
                    cloud.x + Math.cos(angle) * radius * 0.12,
                    cloud.y + Math.sin(angle) * radius * 0.12,
                    ellRadius,
                    ellRadius * 0.45,
                    angle,
                    0,
                    TAU
                );
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function renderBossWakeWaves() {
        if (state.bossWakeWaves.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const wave of state.bossWakeWaves) {
            const radiusX = wave.radiusX == null ? 82 : wave.radiusX;
            const radiusY = wave.radiusY == null ? 28 : wave.radiusY;
            const lifeRatio = wave.initialLife ? clamp01(wave.life / Math.max(1, wave.initialLife)) : 1;
            ctx.save();
            ctx.translate(wave.x, wave.y);
            const tilt = Math.sin((wave.phase || 0) * 1.3 + now * 0.0012) * 0.18;
            ctx.rotate(tilt);
            const grad = ctx.createRadialGradient(0, 0, radiusX * 0.2, 0, 0, radiusX * 1.05);
            grad.addColorStop(0, `rgba(190,235,255,${0.46 + 0.3 * lifeRatio})`);
            grad.addColorStop(0.55, `rgba(120,195,245,${0.36 + 0.2 * lifeRatio})`);
            grad.addColorStop(1, "rgba(40,115,180,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(210,245,255,${0.35 + 0.28 * lifeRatio})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX * 0.86, radiusY * 0.7, 0, 0, TAU);
            ctx.stroke();
            ctx.strokeStyle = `rgba(150,210,255,${0.24 + 0.18 * lifeRatio})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-radiusX * 0.6, -radiusY * 0.4);
            ctx.quadraticCurveTo(0, -radiusY * 0.8, radiusX * 0.72, -radiusY * 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-radiusX * 0.5, radiusY * 0.2);
            ctx.quadraticCurveTo(0, radiusY * 0.7, radiusX * 0.68, radiusY * 0.12);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossWhirlpools() {
        if (state.bossWhirlpools.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const whirl of state.bossWhirlpools) {
            if (whirl.dead) continue;
            ctx.save();
            ctx.translate(whirl.x, whirl.y);
            const telegraph = whirl.telegraph > 0;
            const baseRadius = telegraph
                ? (whirl.minRadius || 52) * (0.9 + 0.3 * (1 - whirl.telegraph / 720))
                : whirl.releaseTriggered
                ? (whirl.explosionRadius || (whirl.radius || 110) * 1.3)
                : whirl.radius || 96;
            const rimPulse = Math.sin((whirl.spin || 0) * 1.3 + now * 0.0022) * 0.08;
            const rimRadius = baseRadius * (1.02 + rimPulse * 0.3);
            ctx.globalAlpha = telegraph ? 0.5 : 0.68;
            ctx.strokeStyle = telegraph ? "rgba(220,240,255,0.65)" : "rgba(190,225,255,0.75)";
            ctx.lineWidth = telegraph ? 3.4 : 4.6;
            ctx.beginPath();
            ctx.arc(0, 0, rimRadius, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
            if (telegraph) {
                ctx.globalAlpha = 0.65;
                ctx.strokeStyle = "rgba(240,245,255,0.6)";
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.arc(0, 0, baseRadius, 0, TAU);
                ctx.stroke();
                const markers = 5;
                ctx.lineWidth = 3.2;
                for (let i = 0; i < markers; i += 1) {
                    const angle = (i / markers) * TAU + now * 0.002;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * (baseRadius - 10), Math.sin(angle) * (baseRadius - 10));
                    ctx.lineTo(Math.cos(angle) * (baseRadius + 14), Math.sin(angle) * (baseRadius + 14));
                    ctx.stroke();
                }
            } else {
                const ratio = whirl.initialLife ? clamp01(whirl.life / Math.max(1, whirl.initialLife)) : 0.5;
                const swirl = whirl.spin || 0;
                const innerRadius = baseRadius * 0.25;
                const grad = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, baseRadius);
                grad.addColorStop(0, `rgba(220,240,255,${0.6 + 0.3 * (1 - ratio)})`);
                grad.addColorStop(0.45, `rgba(120,170,255,${0.45 + 0.2 * (1 - ratio)})`);
                grad.addColorStop(1, "rgba(30,70,140,0)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, baseRadius, 0, TAU);
                ctx.fill();
                ctx.save();
                ctx.rotate(swirl);
                const plankCount = whirl.releaseTriggered ? 10 : 6;
                for (let i = 0; i < plankCount; i += 1) {
                    const angle = (i / plankCount) * TAU;
                    const dist = innerRadius + (i % 2 === 0 ? baseRadius * 0.45 : baseRadius * 0.58);
                    ctx.save();
                    ctx.rotate(angle);
                    ctx.translate(dist, 0);
                    ctx.rotate(0.6 * Math.sin(now * 0.004 + i));
                    ctx.fillStyle = "rgba(255,235,200,0.65)";
                    ctx.fillRect(-12, -3, 24, 6);
                    ctx.strokeStyle = "rgba(120,70,40,0.55)";
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(-12, -3, 24, 6);
                    ctx.restore();
                }
                ctx.restore();
                ctx.globalAlpha = 0.38;
                ctx.strokeStyle = "rgba(180,220,255,0.45)";
                ctx.lineWidth = 1.8;
                for (let i = 0; i < 3; i += 1) {
                    const angle = now * 0.0023 + i * (TAU / 3);
                    ctx.beginPath();
                    ctx.ellipse(
                        Math.cos(angle) * baseRadius * 0.18,
                        Math.sin(angle) * baseRadius * 0.12,
                        baseRadius * (0.5 + i * 0.12),
                        baseRadius * 0.32,
                        angle,
                        0,
                        TAU
                    );
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                if (whirl.releaseTriggered && whirl.explosionTimer > 0) {
                    const burstRatio = clamp01(whirl.explosionTimer / 520);
                    ctx.globalAlpha = 0.55 * burstRatio;
                    ctx.strokeStyle = "rgba(255,245,220,0.8)";
                    ctx.lineWidth = 6 * (1 - burstRatio * 0.6);
                    ctx.beginPath();
                    ctx.arc(0, 0, baseRadius * (1 + 0.25 * (1 - burstRatio)), 0, TAU);
                    ctx.stroke();
                    ctx.globalAlpha = 0.32 * burstRatio;
                    ctx.fillStyle = "rgba(255,255,230,0.55)";
                    ctx.beginPath();
                    ctx.arc(0, 0, baseRadius * 0.58, 0, TAU);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossKatapultShots() {
        if (state.bossKatapultShots.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const shot of state.bossKatapultShots) {
            if (shot.dead || shot.delay > 0) continue;
            ctx.save();
            ctx.translate(shot.x, shot.y);
            if (!shot.exploding) {
                const dir = Math.atan2(shot.vy || 0.1, shot.vx || -0.1);
                const trailLen = (shot.radius || 24) * 2.1;
                ctx.save();
                ctx.rotate(dir);
                ctx.globalAlpha = 0.4;
                ctx.strokeStyle = "rgba(180,220,255,0.45)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-trailLen * 0.9, -4);
                ctx.quadraticCurveTo(-trailLen * 0.4, -10, -trailLen * 0.1, -2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-trailLen * 0.9, 4);
                ctx.quadraticCurveTo(-trailLen * 0.4, 10, -trailLen * 0.1, 2);
                ctx.stroke();
                ctx.globalAlpha = 0.28;
                ctx.fillStyle = "rgba(150,200,255,0.5)";
                ctx.beginPath();
                ctx.ellipse(-trailLen * 0.6, 0, trailLen * 0.35, 10, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
                ctx.rotate(Math.atan2(shot.vy || 0.1, shot.vx || -0.1));
                const length = (shot.radius || 24) * 1.6;
                const width = (shot.radius || 24) * 0.8;
                const grad = ctx.createLinearGradient(-length * 0.6, 0, length * 0.6, 0);
                grad.addColorStop(0, "rgba(200,230,255,0.05)");
                grad.addColorStop(0.5, "rgba(200,245,255,0.45)");
                grad.addColorStop(1, "rgba(110,200,255,0.65)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-length * 0.6, -width * 0.5);
                ctx.quadraticCurveTo(length * 0.2, -width * 0.8, length * 0.6, 0);
                ctx.quadraticCurveTo(length * 0.2, width * 0.8, -length * 0.6, width * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(140,200,255,0.6)";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(-length * 0.5, 0);
                ctx.lineTo(length * 0.6, 0);
                ctx.stroke();
            } else {
                const ratio = clamp01(shot.explosionLife / 620);
                const radius = (shot.explosionRadius || 110) * (1 - ratio * 0.35);
                ctx.globalCompositeOperation = "lighter";
                const grad = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
                grad.addColorStop(0, `rgba(255,255,255,${0.8 * ratio})`);
                grad.addColorStop(0.4, `rgba(160,225,255,${0.56 * ratio})`);
                grad.addColorStop(0.85, `rgba(80,160,255,${0.25 * ratio})`);
                grad.addColorStop(1, "rgba(40,120,200,0)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, TAU);
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 0.5 * ratio;
                ctx.strokeStyle = "rgba(190,240,255,0.8)";
                ctx.lineWidth = 5 * ratio;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.82, 0, TAU);
                ctx.stroke();
                ctx.globalAlpha = 0.28 * ratio;
                ctx.fillStyle = "rgba(255,255,255,0.45)";
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.32, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossCoinBursts() {
        if (state.bossCoinBursts.length === 0) return;
        ctx.save();
        for (const coin of state.bossCoinBursts) {
            if (coin.exploded) continue;
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.rotate(coin.spin || 0);
            const radius = 16 * (coin.scale || 1);
            const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
            grad.addColorStop(0, "rgba(255,250,210,0.85)");
            grad.addColorStop(0.5, "rgba(255,220,100,0.85)");
            grad.addColorStop(1, "rgba(200,140,40,0.4)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.68, 0, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,240,180,0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.9, radius * 0.6, 0, 0, TAU);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossCoinExplosions() {
        if (state.bossCoinExplosions.length === 0) return;
        ctx.save();
        for (const blast of state.bossCoinExplosions) {
            const duration = blast.duration == null ? 520 : blast.duration;
            const lifeRatio = clamp01((blast.life || 0) / Math.max(1, duration));
            const radius = (blast.radius || 54) * (1 + (1 - lifeRatio) * 0.35);
            const grad = ctx.createRadialGradient(blast.x, blast.y, radius * 0.18, blast.x, blast.y, radius);
            grad.addColorStop(0, `rgba(255,255,215,${0.75 * lifeRatio})`);
            grad.addColorStop(0.45, `rgba(255,205,100,${0.5 * lifeRatio})`);
            grad.addColorStop(1, "rgba(255,120,40,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(blast.x, blast.y, radius, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 0.4 * lifeRatio;
            ctx.strokeStyle = "rgba(255,225,180,0.7)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(blast.x, blast.y, radius * 0.82, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function renderBossDiamondBeams() {
        if (state.bossDiamondBeams.length === 0) return;
        ctx.save();
        const beamLength = Math.max(canvas.width, canvas.height) * 1.5;
        for (const beam of state.bossDiamondBeams) {
            ctx.save();
            ctx.translate(beam.originX, beam.originY);
            const angle = beam.angle || 0;
            ctx.rotate(angle);
            if (beam.stage === "telegraph") {
                const ratio = beam.telegraphTotal ? clamp01((beam.telegraphTimer || 0) / Math.max(1, beam.telegraphTotal)) : 0.4;
                ctx.globalAlpha = 0.2 + 0.45 * ratio;
                ctx.strokeStyle = "rgba(180,225,255,0.8)";
                ctx.setLineDash([10, 12]);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-beamLength, 0);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                const width = beam.width == null ? 48 : beam.width;
                const intensity = beam.stage === "active" ? 1 : 0.55 * clamp01((beam.fadeTimer || 0) / Math.max(1, beam.fadeDuration || 320));
                ctx.globalAlpha = intensity;
                const grad = ctx.createLinearGradient(0, -width * 0.5, 0, width * 0.5);
                grad.addColorStop(0, "rgba(150,220,255,0.2)");
                grad.addColorStop(0.5, "rgba(255,255,255,0.95)");
                grad.addColorStop(1, "rgba(150,220,255,0.2)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(0, -width * 0.5);
                ctx.lineTo(-beamLength, -width * 0.5);
                ctx.lineTo(-beamLength, width * 0.5);
                ctx.lineTo(0, width * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "rgba(235,255,255,0.7)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, -width * 0.5);
                ctx.lineTo(-beamLength, -width * 0.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, width * 0.5);
                ctx.lineTo(-beamLength, width * 0.5);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossCardBoomerangs() {
        if (state.bossCardBoomerangs.length === 0) return;
        ctx.save();
        for (const card of state.bossCardBoomerangs) {
            if (card.dead) continue;
            ctx.save();
            ctx.translate(card.x, card.y);
            ctx.rotate(card.rotation || 0);
            const width = card.phase === "burst" ? 30 : 26;
            const height = card.phase === "burst" ? 20 : 18;
            ctx.fillStyle = card.phase === "burst" ? "rgba(20,20,20,0.9)" : "rgba(32,32,32,0.85)";
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.strokeStyle = "rgba(210,210,210,0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(-width / 2, -height / 2, width, height);
            ctx.fillStyle = "rgba(255,215,120,0.7)";
            ctx.fillRect(-width * 0.28, -height / 2, width * 0.56, height);
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossShockwaves() {
        if (state.bossShockwaves.length === 0) return;
        ctx.save();
        const now = performance.now();
        for (const wave of state.bossShockwaves) {
            if (wave.dead) continue;
            ctx.save();
            ctx.translate(wave.x, wave.y);
            const pulse = Math.sin((wave.anchorPulse || 0) + now * 0.0024);
            const telegraphProgress = wave.stage === "telegraph" && wave.telegraphTimer > 0
                ? 1 - clamp01(wave.telegraphTimer / 1040)
                : 1;
            const anchorGlow = ctx.createRadialGradient(0, 12, 6, 0, 12, 46);
            anchorGlow.addColorStop(0, `rgba(30,45,80,${0.4 + telegraphProgress * 0.2})`);
            anchorGlow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = anchorGlow;
            ctx.beginPath();
            ctx.arc(0, 12, 44, 0, TAU);
            ctx.fill();
            ctx.fillStyle = "rgba(40,60,110,0.85)";
            ctx.beginPath();
            ctx.moveTo(-9, -22);
            ctx.lineTo(-17, 18);
            ctx.quadraticCurveTo(0, 30 + pulse * 4, 17, 18);
            ctx.lineTo(9, -22);
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(140,190,240,0.7)";
            ctx.stroke();
            ctx.save();
            ctx.translate(0, -20);
            ctx.fillStyle = "rgba(120,170,230,0.9)";
            ctx.beginPath();
            ctx.rect(-12, -6, 24, 12);
            ctx.fill();
            ctx.fillStyle = "rgba(200,230,255,0.6)";
            ctx.beginPath();
            ctx.rect(-6, -10, 12, 20);
            ctx.fill();
            ctx.restore();
            const impactRing = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
            impactRing.addColorStop(0, "rgba(255,255,255,0.5)");
            impactRing.addColorStop(0.35, "rgba(90,150,220,0.35)");
            impactRing.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = impactRing;
            ctx.beginPath();
            ctx.arc(0, 0, 82 + pulse * 6, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (wave.stage === "telegraph") {
                const sweepRadius = (wave.maxRadius || canvas.width * 0.9) * 0.18;
                ctx.strokeStyle = "rgba(200,230,255,0.6)";
                ctx.lineWidth = 4.2;
                ctx.beginPath();
                ctx.arc(0, 0, sweepRadius, 0, TAU);
                ctx.stroke();
                ctx.save();
                ctx.rotate(now * 0.0015);
                ctx.strokeStyle = "rgba(160,200,250,0.45)";
                ctx.lineWidth = 3;
                for (let i = 0; i < 4; i += 1) {
                    const angle = (i / 4) * TAU;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * sweepRadius * 0.62, Math.sin(angle) * sweepRadius * 0.62);
                    ctx.lineTo(Math.cos(angle) * sweepRadius, Math.sin(angle) * sweepRadius);
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                ctx.globalCompositeOperation = "lighter";
                if (wave.stage === "wave1" || wave.stage === "pause") {
                    const radius = wave.waveOneRadius || 0;
                    const thickness = (wave.waveThicknessOne || 90) * 0.5;
                    const inner = Math.max(0, radius - thickness);
                    const outer = radius + thickness * 0.6;
                    const grad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
                    grad.addColorStop(0, "rgba(120,200,255,0.05)");
                    grad.addColorStop(0.55, "rgba(120,210,255,0.35)");
                    grad.addColorStop(1, "rgba(120,210,255,0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, outer, 0, TAU);
                    ctx.fill();
                }
                if (wave.stage === "wave2" || wave.stage === "cleanup") {
                    const radius = wave.waveTwoRadius || 0;
                    const thickness = (wave.waveThicknessTwo || 150) * 0.5;
                    const inner = Math.max(0, radius - thickness * 0.9);
                    const outer = radius + thickness * 0.7;
                    const grad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
                    grad.addColorStop(0, "rgba(255,225,180,0.04)");
                    grad.addColorStop(0.6, "rgba(255,215,160,0.3)");
                    grad.addColorStop(1, "rgba(255,215,160,0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, outer, 0, TAU);
                    ctx.fill();
                    ctx.strokeStyle = "rgba(255,240,210,0.65)";
                    ctx.lineWidth = 6;
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, TAU);
                    ctx.stroke();
                }
                ctx.globalCompositeOperation = "source-over";
            }
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossSpeedboats() {
        if (state.bossSpeedboats.length === 0) return;
        ctx.save();
        for (const boat of state.bossSpeedboats) {
            if (boat.dead) continue;
            ctx.save();
            ctx.translate(boat.x, boat.y);
            ctx.rotate(Math.sin((boat.sway || 0) * 1.2) * 0.08);
            const scale = 0.72;
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = "rgba(180,220,255,0.4)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-34 * scale, -8 * scale);
            ctx.quadraticCurveTo(-18 * scale, -18 * scale, -2 * scale, -4 * scale);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-34 * scale, 8 * scale);
            ctx.quadraticCurveTo(-18 * scale, 18 * scale, -2 * scale, 4 * scale);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(220,245,255,0.82)";
            ctx.beginPath();
            ctx.moveTo(-18 * scale, 6 * scale);
            ctx.quadraticCurveTo(0, -16 * scale, 22 * scale, 0);
            ctx.quadraticCurveTo(6 * scale, 12 * scale, -18 * scale, 6 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(120,180,230,0.82)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
            const canopyGrad = ctx.createLinearGradient(-12 * scale, -8 * scale, 10 * scale, 6 * scale);
            canopyGrad.addColorStop(0, "rgba(150,210,255,0.9)");
            canopyGrad.addColorStop(1, "rgba(60,140,210,0.8)");
            ctx.fillStyle = canopyGrad;
            ctx.beginPath();
            ctx.moveTo(-10 * scale, -2 * scale);
            ctx.lineTo(6 * scale, -8 * scale);
            ctx.lineTo(4 * scale, 4 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(40,90,140,0.75)";
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = "rgba(200,235,255,0.5)";
            ctx.beginPath();
            ctx.ellipse(-6 * scale, 8 * scale, 10 * scale, 3 * scale, 0.2, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }
        ctx.restore();
    }

    function renderBossFinSweeps() {
        if (state.bossSweeps.length === 0) return;
        ctx.save();
        for (const sweep of state.bossSweeps) {
            if (sweep.life <= 0 || sweep.delay > 0) continue;
            const radius = sweep.radius || 38;
            const intensity = clamp01(sweep.life / 3600);
            const grad = ctx.createRadialGradient(sweep.x, sweep.y, radius * 0.1, sweep.x, sweep.y, radius * 1.2);
            grad.addColorStop(0, `rgba(120,200,255,${0.4 * intensity})`);
            grad.addColorStop(1, "rgba(30,80,140,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(sweep.x, sweep.y, radius * 1.2, radius * 0.66, sweep.phase * 0.6, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(190,240,255,${0.55 * intensity})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(sweep.x, sweep.y, radius, radius * 0.5, sweep.phase * 0.6, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    return {
        renderBossTorpedoes,
        renderBossPerfumeOrbs,
        renderBossFragranceClouds,
        renderBossWakeWaves,
        renderBossWhirlpools,
        renderBossKatapultShots,
        renderBossCoinBursts,
        renderBossCoinExplosions,
        renderBossDiamondBeams,
        renderBossCardBoomerangs,
        renderBossShockwaves,
        renderBossSpeedboats,
        renderBossFinSweeps
    };
}
