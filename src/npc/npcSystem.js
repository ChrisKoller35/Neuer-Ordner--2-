// ============================================================
// NPC System — Centralised NPC registry, hit-testing & interaction
// ============================================================
// Provides a common data model for all NPCs (city, buildings,
// overworld) and shared utilities like distance-based click
// detection, sprite loading, and bobbing animation helpers.
'use strict';

// ---- Constants ----
export const NPC_CLICK_RADIUS = 100;      // City NPCs (screen-space click)
export const NPC_INTERACT_RADIUS = 60;    // Building NPCs (proximity, press E)
export const NPC_BOB_SPEED = 0.003;       // Sine-wave bobbing speed
export const NPC_BOB_AMOUNT = 3;          // Vertical bobbing amplitude (px)
export const NPC_SPRITE_SCALE = 0.22;     // Default render scale for city NPCs

// ---- NPC Registry ----
const registry = new Map();

/**
 * Register an NPC definition. Can be called from any system
 * (city loader, building loader, etc.).
 * @param {string} id       Unique identifier (e.g. "merchant", "blacksmith")
 * @param {object} def      NPC definition
 * @param {string} def.name Display name / label
 * @param {string} [def.sprite]    Sprite key or image path
 * @param {string} [def.location]  Where the NPC lives ("city" | building id)
 * @param {object} [def.position]  { x, y } world coordinates
 * @param {number} [def.floor]     Floor index (city NPCs)
 * @param {Array}  [def.dialogues] Dialogue / menu options
 * @param {Function} [def.onInteract] Callback when player interacts
 */
export function registerNPC(id, def) {
	registry.set(id, { id, ...def });
}

/**
 * Retrieve a registered NPC by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getNPC(id) {
	return registry.get(id);
}

/**
 * Get all registered NPCs, optionally filtered by location.
 * @param {string} [location] Filter by location string
 * @returns {object[]}
 */
export function getAllNPCs(location) {
	const all = Array.from(registry.values());
	return location ? all.filter(n => n.location === location) : all;
}

/**
 * Remove an NPC from the registry.
 * @param {string} id
 */
export function unregisterNPC(id) {
	registry.delete(id);
}

/** Clear all registered NPCs (e.g. on scene change). */
export function clearNPCs() {
	registry.clear();
}

// ---- Hit-testing ----

/**
 * Find the closest NPC within a given radius of a world-space point.
 * @param {number} wx       World X
 * @param {number} wy       World Y
 * @param {object[]} npcs   Array of objects with { x, y } (or { position: {x,y} })
 * @param {number} [radius] Max distance (default: NPC_CLICK_RADIUS)
 * @returns {{ npc: object, dist: number } | null}
 */
export function findNearestNPC(wx, wy, npcs, radius = NPC_CLICK_RADIUS) {
	let best = null;
	let bestDist = radius;
	for (const npc of npcs) {
		const nx = npc.x ?? npc.position?.x ?? 0;
		const ny = npc.y ?? npc.position?.y ?? 0;
		const dist = Math.hypot(wx - nx, wy - ny);
		if (dist <= bestDist) {
			bestDist = dist;
			best = { npc, dist };
		}
	}
	return best;
}

/**
 * Simple boolean distance check between player and an NPC.
 * @param {object} player { x, y } or { playerPx, playerPy }
 * @param {object} npc    { x, y }
 * @param {number} [radius]
 * @returns {boolean}
 */
export function isPlayerNearNPC(player, npc, radius = NPC_INTERACT_RADIUS) {
	const px = player.x ?? player.playerPx ?? 0;
	const py = player.y ?? player.playerPy ?? 0;
	const nx = npc.x ?? npc.position?.x ?? 0;
	const ny = npc.y ?? npc.position?.y ?? 0;
	return Math.hypot(px - nx, py - ny) <= radius;
}

// ---- Rendering helpers ----

/**
 * Compute a vertical bobbing offset for animations.
 * @param {number} time  Elapsed time (ms or arbitrary)
 * @param {number} [speed]  Oscillation speed (default NPC_BOB_SPEED)
 * @param {number} [amount] Pixel amplitude (default NPC_BOB_AMOUNT)
 * @returns {number} Vertical offset in pixels
 */
export function bobOffset(time, speed = NPC_BOB_SPEED, amount = NPC_BOB_AMOUNT) {
	return Math.sin(time * speed) * amount;
}

/**
 * Draw an NPC sprite on a canvas context with optional bobbing.
 * Falls back to a coloured circle if the sprite is not loaded.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} npc          { x, y, sprite?, label?, color? }
 * @param {HTMLImageElement|null} spriteImg  Pre-loaded image (or null)
 * @param {object} [opts]
 * @param {number} [opts.scale]     Render scale (default NPC_SPRITE_SCALE)
 * @param {number} [opts.time]      Time for bobbing (0 = no bob)
 * @param {boolean} [opts.showLabel] Draw label text above
 * @param {string} [opts.fallbackColor] Circle colour when sprite missing
 */
export function renderNPC(ctx, npc, spriteImg, opts = {}) {
	const {
		scale = NPC_SPRITE_SCALE,
		time = 0,
		showLabel = true,
		fallbackColor = '#6688cc'
	} = opts;

	const nx = npc.x ?? 0;
	const ny = npc.y ?? 0;
	const bob = time ? bobOffset(time) : 0;

	ctx.save();
	if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
		const w = spriteImg.naturalWidth * scale;
		const h = spriteImg.naturalHeight * scale;
		ctx.drawImage(spriteImg, nx - w / 2, ny - h + bob, w, h);
	} else {
		// Fallback circle
		const r = 24;
		ctx.fillStyle = npc.color || fallbackColor;
		ctx.beginPath();
		ctx.arc(nx, ny - r + bob, r, 0, Math.PI * 2);
		ctx.fill();
	}

	if (showLabel && npc.label) {
		ctx.fillStyle = '#fff';
		ctx.font = 'bold 14px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(npc.label, nx, ny - 60 + bob);
	}
	ctx.restore();
}

// ---- Interaction dispatch ----

/**
 * Trigger interaction for an NPC. Calls its registered `onInteract`
 * callback if one exists, otherwise returns false.
 * @param {string} id       NPC id
 * @param {string} [option] Menu option selected
 * @returns {boolean} true if handled
 */
export function interactWithNPC(id, option) {
	const npc = registry.get(id);
	if (npc && typeof npc.onInteract === 'function') {
		npc.onInteract(option);
		return true;
	}
	return false;
}
