/**
 * Foe Render System
 * 
 * Handles rendering of all foe types with shadows.
 */

/**
 * Create the foe render module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {CanvasRenderingContext2D} deps.ctx - Canvas context
 * @param {Object} deps.state - Game state
 * @param {Object} deps.MODELS - Model renderers
 * @returns {Object} Render controller
 */
export function createFoeRenderSystem(deps) {
    const { ctx, state, MODELS } = deps;

    /**
     * Render all foes with shadows.
     */
    function renderFoes() {
        for (const foe of state.foes) {
            const isBogenschreck = foe.type === "bogenschreck";
            const isRitterfisch = foe.type === "ritterfisch";
            const isOktopus = foe.type === "oktopus";

            // Shadow
            const shadowRadius = (isBogenschreck ? 22 : isRitterfisch ? 24 : isOktopus ? 20 : 18) * foe.scale;
            MODELS.simpleShadow(ctx, foe.x + 8, foe.y + 24, shadowRadius);

            // Foe model
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

    return {
        renderFoes
    };
}
