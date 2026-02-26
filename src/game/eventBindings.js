// ============================================================
// EVENT BINDINGS - Input/Event-Listener für das Spiel
// ============================================================
// Extrahiert aus bootGame() für bessere Wartbarkeit.
// Wird via setupEventBindings(ctx) aktiviert.

import {
	KEY_SHOOT, CODE_SHOOT
} from '../core/constants.js';

import {
	isShieldActivationKey,
	isCoralActivationKey,
	isTsunamiActivationKey,
	isDashCurrentActivationKey,
	isDepthMineActivationKey,
	isTimeBubbleActivationKey,
	isCityShortcut,
	isCityShortcutCandidate
} from './inputHelpers.js';
import S from '../core/sharedState.js';

/**
 * Registriert alle Event-Listener (Keyboard, Pointer, Buttons)
 * @param {Object} ctx - Shared game context
 */
export function setupEventBindings(ctx) {
	const {
		getState,
		getCanvas,
		getKeys,
		getPointer,
		isControlsArmed,
		getBannerEl,
		getBtnRestart,
		getBtnQuit,
		getHudShield,
		getDungeonSystem,
		getBuildingsManager,
		getHubMenu,
		getCityUI,
		getAbilities,
		getPlayerUpdater,
		getUpgradeUI,
		// Game Actions (destructured)
		resetGame,
		enterCity,
		enterOverworld,
		exitOverworld,
		showGameOver,
		debugJumpToLevel,
		// UI sync
		syncCityInventoryVisibility,
		syncCityShopVisibility,
		syncCityMissionVisibility,
		updateCityShopUI,
		updateCityMissionUI,
		// Flags
		DEBUG_SHORTCUTS
	} = ctx;

	const canvas = getCanvas();
	let suppressCityCanvasClick = false;

	// ── KEYDOWN (main handler) ──
	document.addEventListener("keydown", event => {
		const state = getState();
		const keys = getKeys();
		const pointer = getPointer();
		const dungeonSystem = getDungeonSystem();
		const buildingsManager = getBuildingsManager();
		const hubMenu = typeof getHubMenu === 'function' ? getHubMenu() : null;
		const abilities = getAbilities();
		const playerUpdater = getPlayerUpdater();
		const bannerEl = getBannerEl();

		const isHubToggleKey = event.key === 'Tab' || event.code === 'Tab';
		const isEscapeKey = event.key === 'Escape' || event.code === 'Escape';
		const hubAllowedMode = state.mode === 'city' || state.mode === 'game' || state.mode === 'building';

		if (hubMenu?.isOpen()) {
			if (isHubToggleKey || isEscapeKey) {
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
				hubMenu.close();
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			return;
		}

		if (isHubToggleKey && hubAllowedMode) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			hubMenu?.toggle();
			return;
		}

		// Dungeon-Modus: Nur spezifische Keys
		if (state.mode === "dungeon" || state.mode === "dungeon_menu") {
			if (event.key === 'E' && event.ctrlKey && event.shiftKey && state.mode === "dungeon") {
				event.preventDefault();
				dungeonSystem.editor.toggle();
				return;
			}
			if (event.key === 'c' && event.ctrlKey && state.mode === "dungeon") {
				const ds = dungeonSystem.getDungeonState();
				if (ds) {
					try {
						navigator.clipboard.writeText(String(ds.seed));
						state.eventFlash = { text: `Seed ${ds.seed} kopiert!`, timer: 1500, color: "#4ade80" };
					} catch (e) { console.log('[Seed]', ds.seed); }
				}
				event.preventDefault();
				return;
			}
			if (dungeonSystem.editor.isActive()) {
				if (dungeonSystem.editor.handleKey(event.key)) {
					event.preventDefault();
					return;
				}
			}
			keys.add(event.key);
			return;
		}

		// Buildings-Manager Keyboard-Handler
		if (state.mode === "city" || state.mode === "building") {
			if (buildingsManager.handleKeyDown(event.key, event.code)) {
				event.preventDefault();
				return;
			}
		}

		// City-spezifische Shortcuts
		if (state.mode === "city") {
			const cityUI = getCityUI();
			if (event.key === "i" || event.key === "I") {
				cityUI.setInventoryOpen(!cityUI.isInventoryOpen());
				if (bannerEl) bannerEl.textContent = cityUI.isInventoryOpen() ? "Inventar geöffnet (I)" : "Inventar geschlossen";
				event.preventDefault();
				return;
			}
			if (event.key === "o" || event.key === "O") {
				event.preventDefault();
				enterOverworld();
				return;
			}
		}

		if (isCityShortcutCandidate(event)) {
			const modeLabel = state.started ? (state.mode === "city" ? "city" : "game") : "title";
			const keyInfo = `${event.key || "?"}/${event.code || "?"}`;
			if (bannerEl) bannerEl.textContent = `Shortcut erkannt (${keyInfo}) – Modus: ${modeLabel}`;
			const bootToast = document.getElementById("bootToast");
			if (bootToast) bootToast.textContent = `Taste erkannt: ${keyInfo} – Modus: ${modeLabel}`;
			console.log("City shortcut keydown", { key: event.key, code: event.code, alt: event.altKey, shift: event.shiftKey, mode: modeLabel });
		}
		if (isCityShortcut(event, state.mode)) {
			event.preventDefault();
			enterCity();
			return;
		}

		// Debug Level-Shortcuts
		if (DEBUG_SHORTCUTS && event.altKey && event.shiftKey) {
			if (event.code === "Digit1") { event.preventDefault(); debugJumpToLevel(0, { skipToBoss: false }); return; }
			if (event.code === "Digit2") { event.preventDefault(); debugJumpToLevel(1, { skipToBoss: false }); return; }
			if (event.code === "Digit3") { event.preventDefault(); debugJumpToLevel(2, { skipToBoss: false }); return; }
			if (event.code === "Digit4") { event.preventDefault(); debugJumpToLevel(3, { skipToBoss: false }); return; }
			if (event.code === "Digit5") { event.preventDefault(); enterCity(); return; }
			if (event.code === "Digit9") { event.preventDefault(); debugJumpToLevel(8, { skipToBoss: false }); return; }
			if (event.code === "Digit0") { event.preventDefault(); enterOverworld(); return; }
		}
		if (DEBUG_SHORTCUTS && event.ctrlKey && event.shiftKey) {
			if (event.code === "Digit6") { event.preventDefault(); debugJumpToLevel(4, { skipToBoss: true }); return; }
			if (event.code === "Digit7") { event.preventDefault(); debugJumpToLevel(5, { skipToBoss: true }); return; }
			if (event.code === "Digit8") { event.preventDefault(); debugJumpToLevel(6, { skipToBoss: true }); return; }
			if (event.code === "Digit9") { event.preventDefault(); debugJumpToLevel(7, { skipToBoss: true }); return; }
		}

		// ESC in Overworld → zurück zur Stadt
		if (state.mode === "overworld" && (event.key === "Escape" || event.code === "Escape")) {
			event.preventDefault();
			exitOverworld();
			return;
		}

		keys.add(event.key);

		// Abilities
		if (state.started && !state.over && !state.paused && state.mode === "game" && isShieldActivationKey(event)) {
			event.preventDefault();
			abilities.tryActivateShield();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isCoralActivationKey(event)) {
			if (abilities.tryActivateCoralAllies()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isTsunamiActivationKey(event)) {
			if (abilities.tryActivateTsunamiAbility()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isDashCurrentActivationKey(event)) {
			if (abilities.tryActivateDashCurrent()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isDepthMineActivationKey(event)) {
			if (abilities.tryActivateDepthMine()) event.preventDefault();
		}
		if (state.started && !state.over && !state.paused && state.mode === "game" && isTimeBubbleActivationKey(event)) {
			if (abilities.tryActivateTimeBubble()) event.preventDefault();
		}

		// Shoot
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			event.preventDefault();
			if (state.mode === "city" || state.mode === "overworld") return;
			pointer.shoot = true;
			if (!state.started) {
				if (!isControlsArmed()) return;
				resetGame();
			} else {
				playerUpdater.playerShoot();
			}
			return;
		}

		// Start game on any key
		if (!state.started) {
			if (!isControlsArmed()) return;
			resetGame();
		}
	});

	// ── KEYUP ──
	document.addEventListener("keyup", event => {
		const keys = getKeys();
		const pointer = getPointer();
		keys.delete(event.key);
		if (KEY_SHOOT.has(event.key) || CODE_SHOOT.has(event.code)) {
			pointer.shoot = false;
		}
	});

	// ── POINTERDOWN ──
	canvas.addEventListener("pointerdown", event => {
		const state = getState();
		const pointer = getPointer();
		const buildingsManager = getBuildingsManager();
		const abilities = getAbilities();
		const playerUpdater = getPlayerUpdater();
		const bannerEl = getBannerEl();

		if (state.mode === "dungeon" || state.mode === "dungeon_menu") return;

		if (state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleMouseDown(x, y, event.button)) {
				canvas.setPointerCapture(event.pointerId);
				event.preventDefault();
				event.stopPropagation();
				return;
			}
		}

		if (state.mode === "city") {
			if (event.pointerType === "mouse" && event.button !== 0) return;
			if (buildingsManager?.isMapOpen?.()) {
				return;
			}
			const rect = canvas.getBoundingClientRect();
			const localX = (event.clientX - rect.left) * (canvas.width / rect.width);
			const localY = (event.clientY - rect.top) * (canvas.height / rect.height);
			const cityUI = getCityUI();
			const hubMenu = typeof getHubMenu === 'function' ? getHubMenu() : null;
			const consumeCityPointer = () => {
				suppressCityCanvasClick = true;
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
			};

			const hintHitboxes = Array.isArray(S.CITY_HINT_HITBOXES) ? S.CITY_HINT_HITBOXES : [];
			const clickedHint = hintHitboxes.find(hitbox => (
				localX >= hitbox.x &&
				localX <= hitbox.x + hitbox.width &&
				localY >= hitbox.y &&
				localY <= hitbox.y + hitbox.height
			));
			if (clickedHint) {
				if (clickedHint.action === 'openInventory') {
					consumeCityPointer();
					cityUI.setInventoryOpen(true);
					cityUI.setShopOpen(false);
					cityUI.setMissionOpen(false);
					if (bannerEl) bannerEl.textContent = 'Inventar geöffnet';
					return;
				}
				if (clickedHint.action === 'openHub') {
					consumeCityPointer();
					hubMenu?.open();
					if (bannerEl) bannerEl.textContent = 'Hub-Menü geöffnet';
					return;
				}
				if (clickedHint.action === 'openTeleporter') {
					consumeCityPointer();
					cityUI.setInventoryOpen(false);
					cityUI.setShopOpen(false);
					cityUI.setMissionOpen(false);
					const opened = buildingsManager?.openHubScreen?.('teleporter');
					if (bannerEl) bannerEl.textContent = opened ? 'Teleporter geöffnet' : 'Teleporter nicht verfügbar';
					return;
				}
				if (clickedHint.action === 'openMerchant') {
					consumeCityPointer();
					cityUI.setInventoryOpen(false);
					cityUI.setMissionOpen(false);
					cityUI.setShopOpen(true);
					updateCityShopUI();
					if (bannerEl) bannerEl.textContent = 'Händler geöffnet';
					return;
				}
			}

			const city = state.city;
			if (!city) return;
			const cameraX = city.camera ? city.camera.x : 0;
			const cameraY = city.camera ? city.camera.y : 0;
			const worldX = localX + cameraX;
			const worldY = localY + cameraY;
			const npcClickRadius = 100;

			const cityNpcs = Array.isArray(city.npcs) ? city.npcs : [];
			const merchant = cityNpcs.find(npc => npc && npc.id === "merchant");
			if (merchant) {
				const dist = Math.hypot(worldX - merchant.x, worldY - merchant.y);
				if (dist <= npcClickRadius) {
					consumeCityPointer();
					cityUI.setInventoryOpen(false);
					cityUI.setMissionOpen(false);
					cityUI.setShopOpen(true);
					updateCityShopUI();
					if (bannerEl) bannerEl.textContent = "Händler geöffnet";
					return;
				}
			}
			const questGiver = cityNpcs.find(npc => npc && npc.id === "quest");
			if (questGiver) {
				const dist = Math.hypot(worldX - questGiver.x, worldY - questGiver.y);
				if (dist <= npcClickRadius) {
					consumeCityPointer();
					cityUI.setInventoryOpen(false);
					cityUI.setShopOpen(false);
					cityUI.setMissionOpen(true);
					updateCityMissionUI();
					if (bannerEl) bannerEl.textContent = "Missionen geöffnet";
					return;
				}
			}
			const upgradeNpc = cityNpcs.find(npc => npc && npc.id === "upgrade");
			if (upgradeNpc) {
				const dist = Math.hypot(worldX - upgradeNpc.x, worldY - upgradeNpc.y);
				if (dist <= npcClickRadius) {
					consumeCityPointer();
					cityUI.setInventoryOpen(false);
					cityUI.setShopOpen(false);
					cityUI.setMissionOpen(false);
					const upgradeUI = getUpgradeUI();
					upgradeUI.show();
					if (bannerEl) bannerEl.textContent = "Upgrade-Schmiede geöffnet";
					return;
				}
			}
			return;
		}

		// Game mode pointer handling
		if (event.pointerType === "mouse") {
			if (event.button === 2) {
				event.preventDefault();
				if (!state.started) {
					if (!isControlsArmed()) return;
					resetGame();
					return;
				}
				if (!state.over && !state.paused && state.player.shieldUnlocked) abilities.tryActivateShield();
				return;
			}
			if (event.button !== 0) return;
			pointer.shoot = true;
			if (!state.started) {
				if (!isControlsArmed()) return;
				resetGame();
			} else {
				playerUpdater.playerShoot();
			}
			return;
		}
		if (!state.started) {
			if (!isControlsArmed()) return;
			resetGame();
		}
		pointer.down = true;
	});

	canvas.addEventListener("contextmenu", event => event.preventDefault());

	// ── POINTERMOVE ──
	canvas.addEventListener("pointermove", event => {
		const buildingsManager = getBuildingsManager();
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;
		buildingsManager.handleMouseMove(x, y);
	});

	// ── CLICK ──
	canvas.addEventListener("click", event => {
		const state = getState();
		const buildingsManager = getBuildingsManager();
		if (state.mode === "city" && suppressCityCanvasClick) {
			suppressCityCanvasClick = false;
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			return;
		}
		if (state.mode === "city" || state.mode === "building") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleClick(x, y)) {
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
			}
		}
	});

	// ── MOUSEDOWN ──
	canvas.addEventListener("mousedown", event => {
		const state = getState();
		const buildingsManager = getBuildingsManager();
		if (state.mode === "building" || state.mode === "city") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			if (buildingsManager.handleMouseDown(x, y, event.button)) {
				event.preventDefault();
				event.stopPropagation();
			}
		}
	});

	// ── MOUSEUP ──
	canvas.addEventListener("mouseup", event => {
		const state = getState();
		const buildingsManager = getBuildingsManager();
		if (state.mode === "building" || state.mode === "city") {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (event.clientX - rect.left) * scaleX;
			const y = (event.clientY - rect.top) * scaleY;
			buildingsManager.handleMouseUp(x, y, event.button);
		}
	});

	// ── CONTEXTMENU (Building/City) ──
	canvas.addEventListener("contextmenu", event => {
		const state = getState();
		if (state.mode === "building" || state.mode === "city") {
			event.preventDefault();
		}
	});

	// ── POINTERUP ──
	document.addEventListener("pointerup", event => {
		const state = getState();
		const pointer = getPointer();
		const buildingsManager = getBuildingsManager();
		pointer.down = false;
		pointer.shoot = false;
		if (state.mode === "building" || state.mode === "city") {
			buildingsManager.handleMouseUp(0, 0, event.button);
			if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
				canvas.releasePointerCapture(event.pointerId);
			}
		}
	});

	// ── BUTTON LISTENERS ──
	const btnRestart = getBtnRestart();
	const btnQuit = getBtnQuit();
	const hudShield = getHudShield();

	if (btnRestart) btnRestart.addEventListener("click", () => {
		const state = getState();
		if (state.mode === "dungeon" || state.mode === "dungeon_menu") return;
		resetGame();
	});
	if (btnQuit) btnQuit.addEventListener("click", () => {
		showGameOver("Spiel beendet");
	});
	if (hudShield) hudShield.addEventListener("click", () => {
		const state = getState();
		const abilities = getAbilities();
		if (!state.started || state.over || state.paused) return;
		if (!state.player.shieldUnlocked) return;
		abilities.tryActivateShield();
	});
}
