/**
 * Foe Spawning System
 * 
 * Handles spawning of enemy foes (jelly, bogenschreck, oktopus, ritterfisch).
 * Each foe type has unique properties like shooting, charging, or orbiting.
 */

/**
 * Create the foe spawn module with context-based dependencies.
 * @param {Object} deps - Dependencies
 * @param {HTMLCanvasElement} deps.canvas
 * @param {Object} deps.state - Game state
 * @param {Function} deps.clamp - Clamp utility
 * @returns {Object} Spawn controller
 */
export function createFoeSpawnSystem(deps) {
    const { canvas, state, clamp } = deps;

    /**
     * Spawn a new foe with type-specific properties.
     * @param {Object} opts - Spawn options
     * @returns {Object} The spawned foe object
     */
    function spawnFoe(opts = {}) {
        const type = opts.type || "jelly";
        const scale = opts.scale || (type === "bogenschreck" ? 0.52 + Math.random() * 0.1
            : type === "ritterfisch" ? 0.58 + Math.random() * 0.08
            : type === "oktopus" ? 0.48 + Math.random() * 0.1
            : 0.38 + Math.random() * 0.24);
        const hp = opts.hp || (type === "bogenschreck" ? 3
            : type === "ritterfisch" ? 5
            : type === "oktopus" ? 6
            : 2);
        const baseSpeed = type === "bogenschreck" ? 0.035 + Math.random() * 0.012
            : type === "ritterfisch" ? 0.028 + Math.random() * 0.014
            : type === "oktopus" ? 0.032 + Math.random() * 0.012
            : 0.06 + Math.random() * 0.02;
        const foe = {
            type,
            x: opts.x != null ? opts.x : canvas.width + 45 + Math.random() * 50,
            y: opts.y != null ? opts.y : canvas.height * 0.24 + Math.random() * (canvas.height * 0.57),
            vx: opts.vx != null ? opts.vx : -baseSpeed,
            vy: opts.vy != null ? opts.vy : 0,
            hp,
            maxHp: hp,
            scale,
            sway: Math.random() * Math.PI * 2
        };

        // --- Bogenschreck specifics ---
        if (type === "bogenschreck") {
            foe.anchorX = foe.x;
            foe.shootTimer = 1100 + Math.random() * 700;
            foe.hoverTarget = null;
            foe.hoverProgress = 0;
            foe.reloadTimer = 0;
        }

        // --- Oktopus specifics ---
        if (type === "oktopus") {
            foe.anchorX = foe.x;
            foe.anchorY = foe.y;
            foe.orbitAngle = Math.random() * Math.PI * 2;
            foe.orbitRadius = 36 + Math.random() * 20;
            foe.orbitSpeed = 0.0012 + Math.random() * 0.0005;
            foe.dashTimer = 2200 + Math.random() * 1200;
            foe.burstTimer = 1300 + Math.random() * 800;
            foe.burstCount = 0;
            foe.phase = "orbit";
        }

        // --- Ritterfisch specifics ---
        if (type === "ritterfisch") {
            foe.laneY = foe.y;
            foe.patrolDir = 1;
            foe.chargeTimer = 2000 + Math.random() * 900;
            foe.chargeSpeed = 0.28 + Math.random() * 0.08;
            foe.charging = false;
        }

        state.foes.push(foe);
        return foe;
    }

    /**
     * Schedule the next foe spawn based on spawn delay.
     */
    function scheduleNextFoeSpawn() {
        const delay = state.foeSpawnDelay + Math.random() * state.foeSpawnDelay * 0.5;
        state.nextFoeSpawn = state.elapsed + delay;
    }

    /**
     * Spawn a foe based on current level's spawn table.
     */
    function spawnLevelFoe() {
        const table = state.foeSpawnTable;
        if (!table || table.length === 0) {
            spawnFoe({ type: "jelly" });
            return;
        }
        const roll = Math.random();
        let acc = 0;
        for (const entry of table) {
            acc += entry.weight;
            if (roll < acc) {
                spawnFoe({ type: entry.type });
                return;
            }
        }
        spawnFoe({ type: table[table.length - 1].type });
    }

    /**
     * Get the hitbox for a foe (type-dependent).
     * @param {Object} foe - The foe object
     * @param {Object} opts - Options like padX, padY
     * @returns {{ left: number, right: number, top: number, bottom: number }}
     */
    function getFoeHitbox(foe, opts = {}) {
        const baseWidth = foe.type === "bogenschreck" ? 38
            : foe.type === "ritterfisch" ? 44
            : foe.type === "oktopus" ? 36
            : 28;
        const baseHeight = foe.type === "bogenschreck" ? 36
            : foe.type === "ritterfisch" ? 48
            : foe.type === "oktopus" ? 34
            : 24;
        const padX = opts.padX != null ? opts.padX : 0;
        const padY = opts.padY != null ? opts.padY : 0;
        const hw = (baseWidth * foe.scale * 0.5) + padX;
        const hh = (baseHeight * foe.scale * 0.5) + padY;
        return {
            left: foe.x - hw,
            right: foe.x + hw,
            top: foe.y - hh,
            bottom: foe.y + hh
        };
    }

    /**
     * Calculate coin value based on foe type.
     * @param {Object} foe
     * @returns {number}
     */
    function getCoinValueForFoe(foe) {
        if (foe.type === "bogenschreck") return 4;
        if (foe.type === "ritterfisch") return 6;
        if (foe.type === "oktopus") return 7;
        return 2;
    }

    return {
        spawnFoe,
        scheduleNextFoeSpawn,
        spawnLevelFoe,
        getFoeHitbox,
        getCoinValueForFoe
    };
}
