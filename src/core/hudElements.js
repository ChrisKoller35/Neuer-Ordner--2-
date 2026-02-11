// ============================================================
// HUD Elements - DOM-Elemente für das Game-HUD
// ============================================================
"use strict";

/**
 * Holt alle HUD DOM-Elemente
 * @returns {Object} HUD-Element-Referenzen
 */
export function getHUDElements() {
	return {
		score: document.getElementById("score"),
		coins: document.getElementById("coins"),
		level: document.getElementById("lvl"),
		time: document.getElementById("time"),
		hearts: document.getElementById("hearts"),
		shield: document.getElementById("ab-shield"),
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
