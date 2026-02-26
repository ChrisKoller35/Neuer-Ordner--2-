// ============================================================
// HUD Elements - DOM elements for the game HUD
// ============================================================
"use strict";

function ensureAbilityElement(id, icon, title) {
	const existing = document.getElementById(id);
	if (existing) return existing;
	const container = document.querySelector(".abilities");
	if (!container) return null;
	const el = document.createElement("span");
	el.id = id;
	el.className = "ab locked";
	el.textContent = icon;
	el.title = title;
	container.appendChild(el);
	return el;
}

/**
 * Holt alle HUD DOM-Elemente
 * @returns {Object} HUD-Element-Referenzen
 */
export function getHUDElements() {
	const coralAbility = ensureAbilityElement("ab-coral", "🪸", "Korallenverbündete (R)");
	const tsunamiAbility = ensureAbilityElement("ab-tsunami", "🌊", "Tsunami (T)");
	const dashAbility = ensureAbilityElement("ab-dash", "⚡", "Strömungs-Dash (Q)");
	const mineAbility = ensureAbilityElement("ab-mine", "💣", "Tiefsee-Mine (X)");
	const leechAbility = ensureAbilityElement("ab-leech", "💚", "Lebensraub-Aura (passiv)");
	const bubbleAbility = ensureAbilityElement("ab-timebubble", "🫧", "Zeit-Blase (C)");

	return {
		score: document.getElementById("score"),
		coins: document.getElementById("coins"),
		level: document.getElementById("lvl"),
		time: document.getElementById("time"),
		hearts: document.getElementById("hearts"),
		shield: document.getElementById("ab-shield"),
		coral: coralAbility,
		tsunami: tsunamiAbility,
		dash: dashAbility,
		mine: mineAbility,
		leech: leechAbility,
		timeBubble: bubbleAbility,
		armor: document.getElementById("hudArmor"),
		playerLevel: document.getElementById("playerLevel"),
		xpBarFill: document.getElementById("xpBarFill"),
		skillPoints: document.getElementById("skillPoints"),
		skillPointsNum: document.getElementById("skillPointsNum"),
		symbols: {
			pferd: document.getElementById("sym-pferd"),
			sprinter: document.getElementById("sym-sprinter"),
			yacht: document.getElementById("sym-yacht")
		},
		banner: document.getElementById("banner"),
		endOverlay: document.getElementById("endOverlay"),
		endTitle: document.getElementById("endTitle"),
		btnRestart: document.getElementById("btnRestart"),
		btnQuit: document.getElementById("btnQuit"),
		pickupMsg: document.getElementById("pickupMsg")
	};
}

/**
 * Holt Debug-Elemente für City-Sprite-Editor
 * @returns {Object} Debug-Element-Referenzen
 */
export function getCitySpriteDebugElements() {
	const debugCanvas = document.getElementById("citySpriteDebugCanvas");
	return {
		panel: document.getElementById("citySpriteDebugPanel"),
		canvas: debugCanvas,
		ctx: debugCanvas ? debugCanvas.getContext("2d") : null,
		reset: document.getElementById("citySpriteDebugReset"),
		export: document.getElementById("citySpriteDebugExport"),
		output: document.getElementById("citySpriteDebugOutput"),
		current: document.getElementById("citySpriteDebugCurrent"),
		copy: document.getElementById("citySpriteDebugCopy")
	};
}
