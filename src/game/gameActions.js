/**
 * Game Actions – Spiellogik-Aktionen (Modus-Wechsel, Schaden, Belohnungen)
 * Extrahiert aus bootGame() in game.js
 */
import { FOE_BASE_SCORE } from '../core/constants.js';
import { clamp } from '../core/utils.js';
import { clearAllStateArrays, clearBossArrays } from '../core/initialState.js';
import { ManifestAssets } from '../core/assets.js';
import { buildCityState as buildCityStateModule } from '../city/state.js';

/**
 * Erstellt das Game-Actions-System
 * @param {Object} ctx - Context mit Dependencies
 */
export function createGameActions(ctx) {
	const {
		getState,
		getCanvas,
		getCityInventory,
		ARMOR_ITEM_NAME,
		getCityUI,
		getEndOverlay,
		getEndTitle,
		getBannerEl,
		getPickupMsg,
		getPointer,
		getLevels,
		getProgressionSystem,
		cityData,
		cityMissions,
		SYMBOL_DATA,
		LEVEL_SYMBOL_SEQUENCE,
		DEBUG_SHORTCUTS,
		// Spawning-Funktionen
		spawnCoinDrop,
		getCoinValueForFoe,
		spawnSymbolDrop,
		spawnCoverRock,
		triggerEventFlash,
		seedBubbles,
		primeFoes,
		// HUD
		getUpdateHUD,
		// Mutable flags via getter/setter
		setControlsArmed
	} = ctx;

	// Lokaler Timer für Pickup-Nachrichten
	let pickupHideTimer = null;

	function showPickupMessage(text, duration = 2000) {
		const pickupMsg = getPickupMsg();
		if (!pickupMsg) return;
		pickupMsg.textContent = text;
		pickupMsg.style.display = "block";
		if (pickupHideTimer != null) clearTimeout(pickupHideTimer);
		pickupHideTimer = window.setTimeout(() => {
			if (pickupMsg) pickupMsg.style.display = "none";
			pickupHideTimer = null;
		}, duration);
	}

	function hidePickupMessage() {
		if (pickupHideTimer != null) {
			clearTimeout(pickupHideTimer);
			pickupHideTimer = null;
		}
		const pickupMsg = getPickupMsg();
		if (pickupMsg) pickupMsg.style.display = "none";
	}

	function unlockShieldIfNeeded() {
		const state = getState();
		if (state.player.shieldUnlocked || state.levelIndex !== 0) return;
		state.player.shieldUnlocked = true;
		state.player.shieldCooldown = 0;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		triggerEventFlash("unlock", { text: "Neue Fähigkeit: Schutzschild", duration: 1500, opacity: 0.86 });
		getUpdateHUD()();
	}

	function concludeBossVictory(nextLevelIndex) {
		if (nextLevelIndex < getLevels().getLevelConfigsLength()) {
			advanceLevel(nextLevelIndex, { skipFlash: false, invulnDuration: 1800 });
			return;
		}
		enterCity();
	}

	function finishPendingSymbolAdvance() {
		const state = getState();
		const pending = state.pendingSymbolAdvance;
		if (!pending) return;
		const nextLevelIndex = pending.nextLevelIndex;
		state.pendingSymbolAdvance = null;
		concludeBossVictory(nextLevelIndex);
	}

	function collectSymbolDrop(drop, opts = {}) {
		if (!drop || drop.collected) return;
		const state = getState();
		drop.collected = true;
		drop.autoCollected = !!opts.auto;
		drop.cleanupTimer = 420;
		drop.life = 0;
		const { kind } = drop;
		const config = SYMBOL_DATA[kind];
		if (!state.symbolInventory[kind]) {
			state.symbolInventory[kind] = true;
		}
		const label = config ? config.label : "Symbol";
		if (!opts.silent) {
			const autoSuffix = drop.autoCollected ? " (automatisch)" : "";
			showPickupMessage(`${label} gesichert${autoSuffix}!`, drop.autoCollected ? 1600 : 2200);
		}
		getUpdateHUD()();
		if (state.pendingSymbolAdvance && state.pendingSymbolAdvance.symbol === kind) {
			finishPendingSymbolAdvance();
		}
	}

	function collectCoinDrop(drop) {
		if (!drop || drop.collected) return;
		const state = getState();
		drop.collected = true;
		drop.collectTimer = drop.collectDuration;
		drop.vx = 0;
		drop.vy = -0.05;
		const value = drop.value == null ? 1 : drop.value;
		state.coins += value;
		state.score += value;
		getUpdateHUD()();
	}

	function maybeSpawnLevelThreeCoverRock() {
		const state = getState();
		const canvas = getCanvas();
		if (state.coverRockSpawned) return;
		if ((state.level || 1) !== 3) return;
		if (state.pendingSymbolAdvance) return;
		const threshold = (state.unlockBossScore || 0) * 0.5;
		if (state.levelScore < threshold) return;
		state.coverRockSpawned = true;
		const rock = spawnCoverRock({ x: canvas.width * 0.5 });
		if (rock) {
			triggerEventFlash("cover", { text: "Felsbrocken fällt!", duration: 1100, opacity: 0.75 });
		}
	}

	function applyLevelConfig(index, opts = {}) {
		return getLevels().applyLevelConfig(index, opts);
	}

	function advanceLevel(nextIndex, opts = {}) {
		ManifestAssets.preloadForLevel(nextIndex).catch(err => {
			console.warn("[Cashfisch] Level-Preload Warnung:", err);
		});
		const result = getLevels().advanceLevel(nextIndex, opts);
		getProgressionSystem().applyTalentEffects();
		return result;
	}

	function debugJumpToLevel(targetIndex, options = {}) {
		if (!DEBUG_SHORTCUTS) return;
		const state = getState();
		const bannerEl = getBannerEl();
		const skipToBoss = options.skipToBoss === true;
		const levelIndex = Math.max(0, Math.min(getLevels().getLevelConfigsLength() - 1, targetIndex | 0));
		resetGame();
		state.eventFlash = null;
		advanceLevel(levelIndex, { skipFlash: true, healHeart: false, invulnDuration: 800 });
		state.levelScore = 0;
		state.elapsed = 0;
		if (levelIndex >= 1) {
			state.player.shieldUnlocked = true;
			state.player.shieldActive = false;
			state.player.shieldTimer = 0;
			state.player.shieldCooldown = 0;
			state.player.shieldLastActivation = 0;
			state.player.shieldLastBlock = 0;
		}
		if (skipToBoss) {
			state.levelScore = state.unlockBossScore;
			activateBoss();
		}
		getUpdateHUD()();
		if (bannerEl && state.levelConfig && state.levelConfig.banner) bannerEl.textContent = state.levelConfig.banner;
		const label = skipToBoss ? `Debug: Level ${state.level} (BOSS)` : `Debug: Level ${state.level}`;
		triggerEventFlash("debug", { text: label, duration: 1000, opacity: 0.52 });
	}

	function enterCity() {
		ManifestAssets.preloadForScene("city").catch(err => {
			console.warn("[Cashfisch] City-Preload Warnung:", err);
		});
		const state = getState();
		const canvas = getCanvas();
		const bannerEl = getBannerEl();
		const endOverlay = getEndOverlay();
		const cityInventory = getCityInventory();
		const pointer = getPointer();

		state.mode = "city";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.level = 5;
		state.levelIndex = getLevels().getLevelConfigsLength();
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.eventFlash = null;
		state.pendingSymbolAdvance = null;
		state.city = buildCityStateModule({ get canvas() { return canvas; }, cityData });
		clearAllStateArrays(state);
		state.boss.active = false;
		state.tsunamiWave = null;
		state.eventFlash = null;
		pointer.shoot = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		getCityUI().reset();
		if (bannerEl) bannerEl.textContent = "Unterwasserstadt";
		if (endOverlay) endOverlay.style.display = "none";
		const gameWrap = document.getElementById("gameWrap");
		const startScreen = document.getElementById("startScreen");
		const cutWrap = document.getElementById("cutWrap");
		if (gameWrap) gameWrap.style.display = "block";
		if (startScreen) startScreen.style.display = "none";
		if (cutWrap) cutWrap.style.display = "none";
		setControlsArmed(true);
		getUpdateHUD()();
	}

	function startMission(missionId) {
		const mission = cityMissions.find(m => m.id === missionId);
		const startLevel = mission ? mission.startLevel : 0;
		const state = getState();
		const canvas = getCanvas();
		const cityInventory = getCityInventory();
		const endOverlay = getEndOverlay();

		state.mode = "game";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.score = 0;
		state.coins = 0;
		state.hearts = 3;
		state.levelIndex = startLevel;
		state.levelScore = 0;
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;

		if (missionId === "mission-1" || !missionId) {
			state.player.shieldUnlocked = false;
			state.coralAbility.unlocked = false;
			state.tsunamiAbility.unlocked = false;
		} else {
			state.player.shieldUnlocked = true;
			state.coralAbility.unlocked = true;
			state.tsunamiAbility.unlocked = true;
		}

		state.player.shieldActive = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		getCityUI().reset();
		state.player.shieldTimer = 0;
		state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = 0;
		state.player.shotCooldown = 0;

		state.boss.entryTargetX = canvas.width * 0.72;
		state.boss.entryTargetY = canvas.height * 0.48;
		state.boss.x = state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY;
		state.boss.dir = -1;
		state.boss.active = false;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.entering = false;
		state.boss.entryProgress = 0;

		clearAllStateArrays(state);

		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.coralAbility.cooldown = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.used = false;
		state.tsunamiAbility.active = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.coverRockSpawned = false;
		state.city = null;

		applyLevelConfig(startLevel, { skipFlash: false });
		state.boss.x = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.dir = -1;
		primeFoes();
		seedBubbles();
		getUpdateHUD()();
		hidePickupMessage();
		if (endOverlay) endOverlay.style.display = "none";
		setControlsArmed(true);

		console.log(`Mission ${missionId} gestartet bei Level ${startLevel + 1}`);
	}

	function resetGame() {
		const state = getState();
		const canvas = getCanvas();
		const cityInventory = getCityInventory();
		const endOverlay = getEndOverlay();

		state.mode = "game";
		state.started = true;
		state.paused = false;
		state.over = false;
		state.win = false;
		state.score = 0;
		state.coins = 0;
		state.hearts = 3;
		state.levelIndex = 0;
		state.levelScore = 0;
		state.elapsed = 0;
		state.lastTick = performance.now();
		state.player.x = canvas.width * 0.28;
		state.player.y = canvas.height * 0.6;
		state.player.dir = 1;
		state.player.baseSpeed = state.player.baseSpeed == null ? 0.32 : state.player.baseSpeed;
		state.player.speed = state.player.baseSpeed;
		state.player.perfumeSlowTimer = 0;
		state.player.shieldUnlocked = false;
		state.player.shieldActive = false;
		state.armorShieldCharges = cityInventory.equipment.armor === ARMOR_ITEM_NAME ? 1 : 0;
		getCityUI().reset();
		state.player.shieldTimer = 0;
		state.player.shieldCooldown = 0;
		state.player.shieldLastActivation = 0;
		state.player.shieldLastBlock = 0;
		state.player.invulnFor = 0;
		state.player.shotCooldown = 0;
		state.boss.entryTargetX = canvas.width * 0.72;
		state.boss.entryTargetY = canvas.height * 0.48;
		state.boss.x = state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY;
		state.boss.dir = -1;
		state.boss.active = false;
		state.boss.pulse = 0;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		clearAllStateArrays(state);
		state.coralAbility.unlocked = false;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.coralAbility.cooldown = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.unlocked = false;
		state.tsunamiAbility.used = false;
		state.tsunamiAbility.active = false;
		state.pendingSymbolAdvance = null;
		state.eventFlash = null;
		state.coverRockSpawned = false;
		state.city = null;
		applyLevelConfig(0, { skipFlash: false });
		state.boss.x = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		state.boss.y = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		state.boss.entering = false;
		state.boss.entryProgress = 0;
		state.boss.dir = -1;
		primeFoes();
		seedBubbles();
		getUpdateHUD()();
		hidePickupMessage();
		if (endOverlay) endOverlay.style.display = "none";
		setControlsArmed(true);
	}

	function showGameOver(titleText) {
		const state = getState();
		const endOverlay = getEndOverlay();
		const endTitle = getEndTitle();

		state.over = true;
		clearAllStateArrays(state);
		state.eventFlash = null;
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRockSpawned = false;
		state.player.shieldActive = false;
		state.player.shieldTimer = 0;
		state.player.shieldLastBlock = 0;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		state.pendingSymbolAdvance = null;
		if (endOverlay) endOverlay.style.display = "flex";
		if (endTitle) endTitle.textContent = titleText || "Danke fürs Spielen!";
		hidePickupMessage();
	}

	function winGame() {
		const state = getState();
		const canvas = getCanvas();
		const bannerEl = getBannerEl();
		if (state.over) return;
		const currentLevelIndex = state.levelIndex || 0;
		const nextLevelIndex = currentLevelIndex + 1;
		const symbolKind = LEVEL_SYMBOL_SEQUENCE[currentLevelIndex];
		state.boss.active = false;
		state.boss.hp = 0;
		clearAllStateArrays(state);
		state.coralAbility.active = false;
		state.coralAbility.timer = 0;
		state.tsunamiWave = null;
		state.tsunamiAbility.active = false;
		state.coverRockSpawned = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		hidePickupMessage();
		unlockShieldIfNeeded();
		if (symbolKind && !state.symbolInventory[symbolKind]) {
			const dropX = clamp(state.boss.x, canvas.width * 0.32, canvas.width * 0.78);
			const dropY = Math.min(canvas.height * 0.74, state.boss.y + 120);
			const drop = spawnSymbolDrop(symbolKind, { x: dropX, y: dropY });
			state.pendingSymbolAdvance = { symbol: symbolKind, nextLevelIndex };
			const config = SYMBOL_DATA[symbolKind];
			const label = config ? config.label : "Symbol";
			if (drop) {
				triggerEventFlash("symbol", { text: `${label} gefallen!`, duration: 1400, opacity: 0.8 });
				showPickupMessage(`${label} aufnehmen!`, 2600);
				if (bannerEl) bannerEl.textContent = "Symbol einsammeln!";
			} else {
				state.symbolInventory[symbolKind] = true;
				getUpdateHUD()();
				finishPendingSymbolAdvance();
			}
			return;
		}
		concludeBossVictory(nextLevelIndex);
	}

	function activateBoss() {
		const state = getState();
		const canvas = getCanvas();
		const bannerEl = getBannerEl();

		state.boss.active = true;
		const targetX = state.boss.entryTargetX == null ? canvas.width * 0.72 : state.boss.entryTargetX;
		const targetY = state.boss.entryTargetY == null ? canvas.height * 0.48 : state.boss.entryTargetY;
		const caveEntry = (state.level || 1) === 1;
		if (caveEntry) {
			const startX = canvas.width + Math.max(140, canvas.width * 0.12);
			const startY = Math.min(canvas.height * 0.68, targetY + canvas.height * 0.26);
			state.boss.x = startX;
			state.boss.y = startY;
			state.boss.entering = true;
			state.boss.entryProgress = 0;
			state.boss.entrySpeed = state.boss.entrySpeed == null ? Math.max(0.24, state.boss.speed * 1.25) : state.boss.entrySpeed;
		} else {
			state.boss.x = targetX;
			state.boss.y = targetY;
			state.boss.entering = false;
			state.boss.entryProgress = 1;
		}
		state.boss.oscPhase = 0;
		state.boss.dir = -1;
		state.boss.pulse = 0;
		state.boss.hp = state.boss.maxHp;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		state.boss.attackTimer = bossCfg && bossCfg.firstAttackDelay != null ? bossCfg.firstAttackDelay : 1600;
		state.boss.lastAttack = null;
		state.boss.finFlip = false;
		state.foeSpawnTimer = Number.POSITIVE_INFINITY;
		clearBossArrays(state);
		state.cashfishUltLock = 0;
		state.cashfishUltHistory = { tsunamiUsed: false, crownUsed: false };
		if (bannerEl) bannerEl.textContent = "Bosskampf! Besiege die Bedrohung";
	}

	function damagePlayer(amount = 1) {
		const state = getState();
		const cityInventory = getCityInventory();
		const player = state.player;
		if (player.shieldActive) {
			const now = performance.now();
			player.shieldTimer = Math.max(0, player.shieldTimer - 600);
			player.shieldLastBlock = now;
			return;
		}
		if (state.mode === "game" && cityInventory.equipment.armor === ARMOR_ITEM_NAME && state.armorShieldCharges > 0) {
			state.armorShieldCharges = 0;
			triggerEventFlash("armorBlock", { text: "Rüstung schützt!", duration: 1200, opacity: 0.9 });
			getUpdateHUD()();
			return;
		}
		if (player.invulnFor > 0) return;
		state.hearts = Math.max(0, state.hearts - amount);
		player.invulnFor = 1400;
		triggerEventFlash("playerDamage", { text: "-1 Herz", duration: 1500, opacity: 0.8 });
		if (state.hearts <= 0) showGameOver("Du wurdest besiegt!");
	}

	function awardFoeDefeat(foe) {
		if (!foe) return;
		const state = getState();
		const bannerEl = getBannerEl();
		const bonus = foe.type === "bogenschreck" ? 3 : foe.type === "oktopus" ? 2 : 0;
		const reward = FOE_BASE_SCORE + bonus;
		state.score += reward;
		state.levelScore += reward;
		spawnCoinDrop({ x: foe.x, y: foe.y, value: getCoinValueForFoe(foe) });

		const xpGained = getProgressionSystem().awardXP(foe.type || 'default');

		if (!state.boss.active && state.levelScore >= state.unlockBossScore && bannerEl) {
			bannerEl.textContent = "Boss wittert deine Präsenz...";
		}
	}

	return {
		showPickupMessage,
		hidePickupMessage,
		unlockShieldIfNeeded,
		concludeBossVictory,
		finishPendingSymbolAdvance,
		collectSymbolDrop,
		collectCoinDrop,
		maybeSpawnLevelThreeCoverRock,
		applyLevelConfig,
		advanceLevel,
		debugJumpToLevel,
		enterCity,
		startMission,
		resetGame,
		showGameOver,
		winGame,
		activateBoss,
		damagePlayer,
		awardFoeDefeat
	};
}
