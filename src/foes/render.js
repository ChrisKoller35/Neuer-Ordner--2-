/**
 * Foe Render System
 * 
 * Handles rendering of all foe types with shadows and foe arrows.
 */

const TAU = Math.PI * 2;

/**
 * Create the foe render module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {CanvasRenderingContext2D} deps.ctx - Canvas context
 * @param {Object} deps.state - Game state
 * @param {Object} deps.MODELS - Model renderers
 * @param {Object} deps.SPRITES - Sprite images
 * @param {Function} deps.spriteReady - Check if sprite is loaded
 * @returns {Object} Render controller
 */
export function createFoeRenderSystem(deps) {
    const { ctx, state, MODELS, SPRITES, spriteReady } = deps;

    /**
     * Render all foes with shadows.
     */
    function renderFoes() {
        for (const foe of state.foes) {
            const isBogenschreck = foe.type === "bogenschreck";
            const isRitterfisch = foe.type === "ritterfisch";
            const isOktopus = foe.type === "oktopus";
            
            // Mission 2 Gegner
            const isShadowfish = foe.type === "shadowfish";
            const isStingray = foe.type === "stingray";
            const isSeadrake = foe.type === "seadrake";
            const isAbyssal = foe.type === "abyssal";
            const isMission2Foe = isShadowfish || isStingray || isSeadrake || isAbyssal;

            // Shadow
            const shadowRadius = (isBogenschreck ? 22 : isRitterfisch ? 24 : isOktopus ? 20 
                : isShadowfish ? 16 : isStingray ? 20 : isSeadrake ? 22 : isAbyssal ? 18 : 18) * foe.scale;
            MODELS.simpleShadow(ctx, foe.x + 8, foe.y + 24, shadowRadius);

            // Mission 2 Gegner - eigene Sprites
            if (isMission2Foe) {
                const spriteKey = isShadowfish ? 'shadowfish' 
                    : isStingray ? 'stingray' 
                    : isSeadrake ? 'seadrake' 
                    : 'abyssal';
                const sprite = SPRITES[spriteKey];
                
                if (sprite && spriteReady(sprite)) {
                    const baseScale = 0.18;
                    const overallScale = baseScale * foe.scale;
                    const drawW = sprite.naturalWidth * overallScale;
                    const drawH = sprite.naturalHeight * overallScale;
                    ctx.save();
                    ctx.translate(foe.x, foe.y);
                    // Gegner schwimmen nach links, Sprite schaut bereits nach links
                    ctx.rotate(Math.sin(foe.sway) * 0.08);
                    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
                    ctx.restore();
                } else {
                    // Fallback: Standard foe Model
                    MODELS.foe(ctx, foe.x, foe.y, {
                        scale: foe.scale,
                        sway: foe.sway
                    });
                }
                continue;
            }

            // Mission 1 Gegner - Original Renderer
            const renderer = isBogenschreck ? MODELS.bogenschreck
                : isRitterfisch ? MODELS.ritterfisch
                : isOktopus ? MODELS.oktopus
                : MODELS.foe;

            renderer(ctx, foe.x, foe.y, {
                scale: foe.scale,
                sway: foe.sway,
                charging: foe.charging
            });
        }
    }

    /**
     * Render foe arrows (bolts from octopus, arrows from bogenschreck, etc.)
     */
    function renderFoeArrows() {
        if (state.foeArrows.length === 0) return;
        ctx.save();
        for (const arrow of state.foeArrows) {
            const sprite = arrow.spriteKey ? SPRITES[arrow.spriteKey] : null;
            if (sprite && spriteReady(sprite)) {
                const scale = arrow.spriteScale == null ? 0.18 : arrow.spriteScale;
                const drawW = sprite.naturalWidth * scale;
                const drawH = sprite.naturalHeight * scale;
                const offsetX = arrow.spriteOffsetX == null ? 0 : arrow.spriteOffsetX;
                const offsetY = arrow.spriteOffsetY == null ? 0 : arrow.spriteOffsetY;
                ctx.save();
                ctx.translate(arrow.x, arrow.y);
                ctx.rotate(arrow.rotation || 0);
                if (arrow.flip) ctx.scale(-1, 1);
                ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
                ctx.restore();
                continue;
            }
            ctx.save();
            ctx.translate(arrow.x, arrow.y);
            ctx.rotate(arrow.rotation || 0);
            const variant = arrow.type || "arrow";
            if (variant === "octo-bolt") {
                const shaftLength = 26;
                const shaftWidth = 6;
                const grad = ctx.createLinearGradient(-shaftLength * 0.5, 0, shaftLength * 0.5, 0);
                grad.addColorStop(0, "rgba(90,140,255,0.25)");
                grad.addColorStop(0.5, "rgba(180,230,255,0.8)");
                grad.addColorStop(1, "rgba(90,140,255,0.25)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(0, 0, shaftLength * 0.55, shaftWidth, 0, 0, TAU);
                ctx.fill();
            }
            else if (variant === "octo-blowdart") {
                const bodyLength = 34;
                const bodyRadius = 3.4;
                const tipLength = 9;
                const tailLength = 6;
                const glow = ctx.createRadialGradient(bodyLength * 0.32, 0, 0, bodyLength * 0.32, 0, 12);
                glow.addColorStop(0, "rgba(140,255,240,0.45)");
                glow.addColorStop(1, "rgba(40,120,140,0)");
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.ellipse(bodyLength * 0.34, 0, 14, 6, 0, 0, TAU);
                ctx.fill();
                ctx.restore();

                const bodyGrad = ctx.createLinearGradient(-bodyLength * 0.5, 0, bodyLength * 0.5, 0);
                bodyGrad.addColorStop(0, "rgba(20,40,80,0.65)");
                bodyGrad.addColorStop(0.45, "rgba(24,140,180,0.95)");
                bodyGrad.addColorStop(1, "rgba(180,255,255,0.9)");
                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.moveTo(-bodyLength * 0.5, -bodyRadius * 0.9);
                ctx.lineTo(bodyLength * 0.5 - tipLength, -bodyRadius * 0.9);
                ctx.quadraticCurveTo(bodyLength * 0.5 - bodyRadius * 0.2, -bodyRadius * 0.4, bodyLength * 0.5, 0);
                ctx.quadraticCurveTo(bodyLength * 0.5 - bodyRadius * 0.2, bodyRadius * 0.4, bodyLength * 0.5 - tipLength, bodyRadius * 0.9);
                ctx.lineTo(-bodyLength * 0.5, bodyRadius * 0.9);
                ctx.quadraticCurveTo(-bodyLength * 0.5 - tailLength * 0.5, bodyRadius * 0.6, -bodyLength * 0.5 - tailLength, 0);
                ctx.quadraticCurveTo(-bodyLength * 0.5 - tailLength * 0.5, -bodyRadius * 0.6, -bodyLength * 0.5, -bodyRadius * 0.9);
                ctx.closePath();
                ctx.fill();

                const spineGrad = ctx.createLinearGradient(-bodyLength * 0.4, 0, bodyLength * 0.38, 0);
                spineGrad.addColorStop(0, "rgba(220,255,255,0)");
                spineGrad.addColorStop(0.6, "rgba(240,255,255,0.68)");
                spineGrad.addColorStop(1, "rgba(255,255,255,0.95)");
                ctx.fillStyle = spineGrad;
                ctx.beginPath();
                ctx.moveTo(-bodyLength * 0.32, -bodyRadius * 0.45);
                ctx.quadraticCurveTo(bodyLength * 0.12, -bodyRadius * 0.15, bodyLength * 0.42, 0);
                ctx.quadraticCurveTo(bodyLength * 0.12, bodyRadius * 0.15, -bodyLength * 0.32, bodyRadius * 0.45);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "rgba(24,70,110,0.85)";
                ctx.beginPath();
                ctx.moveTo(-bodyLength * 0.5 - tailLength * 0.2, 0);
                ctx.lineTo(-bodyLength * 0.5 - tailLength, bodyRadius * 1.3);
                ctx.lineTo(-bodyLength * 0.5 - tailLength, -bodyRadius * 1.3);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "rgba(180,255,255,0.9)";
                ctx.beginPath();
                ctx.moveTo(bodyLength * 0.5, 0);
                ctx.lineTo(bodyLength * 0.5 - tipLength * 0.6, bodyRadius * 0.95);
                ctx.lineTo(bodyLength * 0.5 - tipLength * 0.6, -bodyRadius * 0.95);
                ctx.closePath();
                ctx.fill();

                ctx.globalAlpha = 0.75;
                ctx.strokeStyle = "rgba(15,50,90,0.55)";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-bodyLength * 0.48, -bodyRadius * 0.8);
                ctx.lineTo(bodyLength * 0.45, -bodyRadius * 0.2);
                ctx.moveTo(-bodyLength * 0.48, bodyRadius * 0.8);
                ctx.lineTo(bodyLength * 0.45, bodyRadius * 0.2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else {
                const shaftLength = 32;
                const shaftWidth = 3;
                ctx.fillStyle = "#e6d6b8";
                ctx.fillRect(-shaftLength * 0.5, -shaftWidth * 0.5, shaftLength, shaftWidth);
                ctx.fillStyle = "#c9a86f";
                ctx.fillRect(-shaftLength * 0.5, -shaftWidth * 0.5, shaftLength * 0.7, shaftWidth);
                ctx.fillStyle = "#f0f6ff";
                ctx.beginPath();
                ctx.moveTo(shaftLength * 0.5, 0);
                ctx.lineTo(shaftLength * 0.5 - 6, 4);
                ctx.lineTo(shaftLength * 0.5 - 6, -4);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#b0c6ff";
                ctx.beginPath();
                ctx.moveTo(-shaftLength * 0.5, 0);
                ctx.lineTo(-shaftLength * 0.5 - 6, 4);
                ctx.lineTo(-shaftLength * 0.5 - 6, -4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    return {
        renderFoes,
        renderFoeArrows
    };
}
