// ============================================================
// DUNGEON CONSTANTS — Shared constants for dungeon subsystems
// ============================================================
"use strict";

import { TILE_TYPES } from './chunkLibrary.js';

export const T = TILE_TYPES;

// Transition & timing
export const TRANSITION_DURATION = 400; // ms
export const INVULN_DURATION = 1000;
export const SPIKE_DAMAGE_COOLDOWN = 800;

// Player
export const PLAYER_SPEED = 0.28; // px/ms
export const PLAYER_HALF_W = 20;
export const PLAYER_HALF_H = 16;
export const ANGLE_LERP_SPEED = 0.012;

// Enemies
export const ENEMY_HALF = 14;
export const ENEMY_UPDATE_INTERVAL = 500;

// Combat
export const ATTACK_RANGE_PX = 120;
export const ATTACK_COOLDOWN_MS = 350;
export const PROJECTILE_SPEED = 0.55; // px/ms
export const PROJECTILE_LIFETIME = 800; // ms
export const PROJECTILE_RADIUS = 6;

// Doors & pickups
export const DOOR_TRIGGER_DIST = 10;
export const PICKUP_RADIUS = 30;

// Boss
export const BOSS_HALF = 28;
export const BOSS_ATTACK_INTERVAL = 2500;
export const BOSS_PROJECTILE_SPEED = 0.35;
export const BOSS_CHARGE_SPEED = 0.18;
export const BOSS_PHASE2_THRESHOLD = 0.5;

// Helpers
export const HELPER_HALF = 12;
export const HELPER_ATTACK_RANGE = 80;
export const HELPER_FOLLOW_DIST = 50;
export const HELPER_SPEED_FACTOR = 0.18;

// Enemy colors
export const ENEMY_COLORS = {
	qualle: "#88ddff",
	steinkrabbe: "#aa7744",
	leuchtfisch: "#ffee44",
	seeigel: "#aa44aa",
	muraene: "#44aa55",
	panzerfisch: "#889999",
	tintenfisch: "#9966cc",
	steinwaechter: "#667788",
	// Biom 1 new enemies
	geisterkrabbe: "#5588aa",
	nadelrochen: "#886666",
	schattenfisch: "#334455",
	korallenruestling: "#cc6688",
	// Biom 2 enemies
	eiskrabbe: "#88ccee",
	frostqualle: "#aaddff",
	oktopus: "#9966ff",
	shadowfish: "#666699",
	frostmuraene: "#55aacc",
	gletscherschildkroete: "#aaccdd",
	kristallspinne: "#bbddff",
	// Biom 3 enemies
	magmakrabbe: "#cc4422",
	feuerfisch: "#ff6600",
	stingray: "#ffcc00",
	seadrake: "#ff3300",
	lavaborwurm: "#aa3311",
	aschegeist: "#777766",
	vulkanturm: "#993300",
	// Legacy
	jelly: "#ff6b9d",
	bogenschreck: "#ff9500",
	ritterfisch: "#cc4444",
	abyssal: "#330066"
};
