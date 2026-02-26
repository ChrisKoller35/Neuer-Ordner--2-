// ============================================================
// STATUS EFFECTS — Budget-based effect system for the player
// Max 2 simultaneous effects, priority-based eviction
// ============================================================
"use strict";

import dungeonData from '../data/dungeon.json';

const budget = dungeonData.statusEffectBudget || { maxSimultaneous: 2, priorityHierarchy: {} };
const PRIORITY = budget.priorityHierarchy;
const MAX_SIMULTANEOUS = budget.maxSimultaneous;
const IMMUNITY_WINDOW = 200; // 200ms immunity after effect expires

/**
 * Effect config:
 *  { type: 'freeze'|'stun'|'slow'|'poison'|'burn'|'sightReduction',
 *    duration: ms,
 *    magnitude?: number }        // e.g. slow factor, poison dps
 */

// ---- helpers ----

function getPriority(type) {
	return PRIORITY[type] ?? -1;
}

// ---- public API ----

/**
 * Initialise (or reset) the player status effect list on the dungeon state.
 * Call once when entering a new floor / dungeon run.
 */
export function initStatusEffects(ds) {
	ds.playerStatusEffects = [];
	ds._statusImmunity = {}; // { type: remaining ms }
}

/**
 * Try to apply a status effect to the player.
 * Returns true if the effect was applied, false if rejected by the budget.
 *
 * Rules (from design doc):
 * 1. If the same type is already active, refresh its duration (do not stack).
 * 2. If fewer than MAX_SIMULTANEOUS effects active, apply immediately.
 * 3. If at budget cap, evict the lowest-priority effect IF the new effect has
 *    higher priority.  Otherwise, reject.
 */
export function applyStatusEffect(ds, effect) {
	if (!ds.playerStatusEffects) ds.playerStatusEffects = [];
	if (!ds._statusImmunity) ds._statusImmunity = {};

	// Check per-type immunity window
	if ((ds._statusImmunity[effect.type] || 0) > 0) return false;

	const list = ds.playerStatusEffects;

	// 1. refresh if same type already active
	const existing = list.find(e => e.type === effect.type);
	if (existing) {
		existing.remaining = Math.max(existing.remaining, effect.duration);
		if (effect.magnitude !== undefined) existing.magnitude = effect.magnitude;
		return true;
	}

	// 2. under budget → apply
	if (list.length < MAX_SIMULTANEOUS) {
		list.push({ type: effect.type, remaining: effect.duration, magnitude: effect.magnitude ?? 1 });
		return true;
	}

	// 3. at budget cap → try eviction
	const newPrio = getPriority(effect.type);
	let lowestIdx = 0;
	let lowestPrio = getPriority(list[0].type);
	for (let i = 1; i < list.length; i++) {
		const p = getPriority(list[i].type);
		if (p < lowestPrio) { lowestPrio = p; lowestIdx = i; }
	}

	if (newPrio > lowestPrio) {
		list.splice(lowestIdx, 1);
		list.push({ type: effect.type, remaining: effect.duration, magnitude: effect.magnitude ?? 1 });
		return true;
	}

	return false; // rejected – budget full, new effect not high enough priority
}

/**
 * Tick all active status effects by dt (ms).
 * Also applies per-frame gameplay consequences (slow, poison damage, etc.)
 * Call once per frame in the main update loop.
 */
export function tickStatusEffects(ds, dt) {
	if (!ds.playerStatusEffects) return;

	// Tick immunity windows
	if (ds._statusImmunity) {
		for (const type of Object.keys(ds._statusImmunity)) {
			ds._statusImmunity[type] -= dt;
			if (ds._statusImmunity[type] <= 0) delete ds._statusImmunity[type];
		}
	}

	for (let i = ds.playerStatusEffects.length - 1; i >= 0; i--) {
		const fx = ds.playerStatusEffects[i];
		fx.remaining -= dt;

		// Per-frame effect logic
		switch (fx.type) {
			case 'poison':
				// Magnitude = damage per second
				ds.hearts = Math.max(0, ds.hearts - (fx.magnitude * dt / 1000));
				break;
			case 'burn':
				ds.hearts = Math.max(0, ds.hearts - (fx.magnitude * dt / 1000));
				break;
			// freeze, stun, slow, sightReduction are read by movement / render
		}

		if (fx.remaining <= 0) {
			// Add per-type immunity window
			if (!ds._statusImmunity) ds._statusImmunity = {};
			ds._statusImmunity[fx.type] = IMMUNITY_WINDOW;
			ds.playerStatusEffects.splice(i, 1);
		}
	}
}

/**
 * Check whether a specific effect type is currently active.
 */
export function hasEffect(ds, type) {
	return ds.playerStatusEffects?.some(e => e.type === type) ?? false;
}

/**
 * Get the magnitude of an active effect (0 if not active).
 */
export function getEffectMagnitude(ds, type) {
	const fx = ds.playerStatusEffects?.find(e => e.type === type);
	return fx ? fx.magnitude : 0;
}

/**
 * Remove a specific effect type immediately (e.g. cleanse).
 */
export function removeEffect(ds, type) {
	if (!ds.playerStatusEffects) return;
	ds.playerStatusEffects = ds.playerStatusEffects.filter(e => e.type !== type);
}

/**
 * Clear all effects (room change, death, etc.).
 */
export function clearAllEffects(ds) {
	if (ds) {
		ds.playerStatusEffects = [];
		ds._statusImmunity = {};
	}
}
