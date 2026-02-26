// ============================================================
// DEBUG SHORTCUTS - Debug-Cheats und Talent-Tree-Shortcuts
// ============================================================
// Extrahiert aus bootGame() für bessere Wartbarkeit.
// Wird via setupDebugShortcuts(ctx) aktiviert.

import { KEY_TALENT_TREE, CODE_TALENT_TREE } from '../core/constants.js';

/**
 * Registriert alle Debug-Keyboard-Shortcuts
 * @param {Object} ctx - Shared game context
 * @param {Function} ctx.getState - Getter für den Spielzustand
 * @param {Function} ctx.getTalentTreeUI - Getter für TalentTree-UI
 * @param {Function} ctx.getProgressionSystem - Getter für Progression
 * @param {Function} ctx.getCityUI - Getter für City-UI
 * @param {Function} ctx.getDungeonSystem - Getter für Dungeon-System
 * @param {Function} ctx.syncCityInventoryVisibility
 * @param {Function} ctx.syncCityShopVisibility
 * @param {Function} ctx.syncCityMissionVisibility
 * @param {Function} ctx.getUpdateHUD - Getter für updateHUD
 */
export function setupDebugShortcuts(ctx) {
	const {
		getState,
		getTalentTreeUI,
		getProgressionSystem,
		getCityUI,
		getDungeonSystem,
		syncCityInventoryVisibility,
		syncCityShopVisibility,
		syncCityMissionVisibility,
		getUpdateHUD
	} = ctx;

	// Talent-Tree-Toggle (T-Taste)
	function handleTalentTreeKeyDown(e) {
		const state = getState();
		const talentTreeUI = getTalentTreeUI();
		const key = e.key;
		const code = e.code;
		if (KEY_TALENT_TREE.has(key) || CODE_TALENT_TREE.has(code)) {
			if (state.mode === 'game' || state.mode === 'city' || state.progression.talentTreeOpen) {
				e.preventDefault();
				talentTreeUI.toggle();
				state.progression.talentTreeOpen = talentTreeUI.isVisible();
			}
		}
	}
	window.addEventListener('keydown', handleTalentTreeKeyDown);

	// DEBUG: Taste 9 = Level 4 + 3 Skillpunkte
	function handleDebugCheat(e) {
		const state = getState();
		const progressionSystem = getProgressionSystem();
		const talentTreeUI = getTalentTreeUI();
		if (e.key === '9' && (state.mode === 'game' || state.mode === 'city')) {
			state.progression.level = 4;
			state.progression.skillPoints = (state.progression.skillPoints || 0) + 3;
			state.progression.xp = progressionSystem.getXPForLevel(4);
			const levelEl = document.getElementById('player-level');
			const xpFillEl = document.getElementById('xp-fill');
			const skillpointsEl = document.getElementById('skillpoints-display');
			if (levelEl) levelEl.textContent = state.progression.level;
			if (xpFillEl) xpFillEl.style.width = '0%';
			if (skillpointsEl) skillpointsEl.textContent = state.progression.skillPoints;
			talentTreeUI.update();
			console.log('[DEBUG] Cheat aktiviert: Level 4, Skillpunkte:', state.progression.skillPoints);
		}
	}
	window.addEventListener('keydown', handleDebugCheat);

	// DEBUG: Ctrl+G = +100 Gold
	function handleGoldCheat(e) {
		const state = getState();
		if (e.key === 'g' && e.ctrlKey && (state.mode === 'game' || state.mode === 'city' || state.mode === 'building')) {
			e.preventDefault();
			state.coins = (state.coins || 0) + 100;
			console.log('[DEBUG] +100 Gold! Aktuell:', state.coins);
		}
	}
	window.addEventListener('keydown', handleGoldCheat);

	// DEBUG: Taste 5 = Teleport zur Stadt + 10.000 Gold
	function handleCityTeleportCheat(e) {
		const state = getState();
		if (e.key === '5') {
			e.preventDefault();
			state.mode = 'city';
			state.coins = (state.coins || 0) + 10000;
			state.eventFlash = { text: '+10.000 Gold! (Cheat)', timer: 2000, color: '#ffd700' };
			console.log('[DEBUG] Teleport zur Stadt + 10k Gold! Aktuell:', state.coins);
		}
	}
	window.addEventListener('keydown', handleCityTeleportCheat);

	// DEBUG: Ctrl+D = Dungeon-Startmenü
	function handleDungeonCheat(e) {
		const state = getState();
		const cityUI = getCityUI();
		const dungeonSystem = getDungeonSystem();
		if (e.key === 'd' && e.ctrlKey && (state.mode === 'city' || state.mode === 'building')) {
			e.preventDefault();
			cityUI.reset();
			syncCityInventoryVisibility();
			syncCityShopVisibility();
			syncCityMissionVisibility();
			dungeonSystem.showStartMenu();
			console.log('[DEBUG] Dungeon-Startmenü geöffnet!');
		}
	}
	window.addEventListener('keydown', handleDungeonCheat);

	// Click auf XP-Anzeige: Talent-Tree togglen
	const xpDisplayEl = document.querySelector('.xp-display');
	if (xpDisplayEl) {
		xpDisplayEl.addEventListener('click', () => {
			const state = getState();
			const talentTreeUI = getTalentTreeUI();
			if (state.mode === 'game') {
				talentTreeUI.toggle();
				state.progression.talentTreeOpen = talentTreeUI.isVisible();
			}
		});
	}
}
