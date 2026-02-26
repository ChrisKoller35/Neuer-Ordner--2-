// ============================================================
// GAME LOOP - tick/update/render/updateCamera
// ============================================================
// Extrahiert aus bootGame() für bessere Wartbarkeit.
// Wird via createGameLoop(ctx) erstellt.

import { clamp } from '../core/utils.js';
import { updateAllGrids } from '../core/spatial.js';
import { updateCity as updateCityModule } from '../city/update.js';
import { renderCity as renderCityModule } from '../city/render.js';
import {
	MAX_DELTA_TIME, MIN_DELTA_TIME, LONG_FRAME_THRESHOLD
} from '../core/constants.js';

/**
 * Erstellt den Game-Loop mit tick, update, render und updateCamera
 * @param {Object} ctx - Shared game context
 * @returns {{ tick: Function, update: Function, render: Function, updateCamera: Function, updateCity: Function }}
 */
export function createGameLoop(ctx) {
	const {
		getState,
		getCanvas,
		getCtx,
		getKeys,
		// Subsystem-Getter
		getPlayerUpdater,
		getAbilities,
		getPickups,
		getCoverRocks,
		getFoeUpdater,
		getFoeArrows,
		getFoeCollision,
		getFoeRenderer,
		getBossUpdater,
		getBossCollision,
		getBossRenderer,
		getBossUI,
		getGameRenderer,
		getBackgroundRenderer,
		getDungeonSystem,
		getBuildingsManager,
		getUpdateHUD,
		maybeSpawnLevelThreeCoverRock,
		// Overworld
		updateOverworldMode,
		renderOverworldMode,
		// City Render Context
		getCityRenderCtx,
		getCityUpdateCtx,
		// City UI DOM refs
		getCityInventoryEl,
		getCityMerchantEl,
		getCityMissionEl,
		getCitySpriteDebugPanel
	} = ctx;

	/**
	 * Camera-Update mit Deadzone-Following
	 */
	function updateCamera(dt) {
		const state = getState();
		const canvas = getCanvas();
		if (!state.worldMode || !state.camera || !state.camera.enabled) return;

		const camera = state.camera;
		const player = state.player;

		const playerScreenX = player.x - camera.x;
		const playerScreenY = player.y - camera.y;

		const centerX = canvas.width / 2;
		const leftBound = centerX - camera.deadZoneX / 2;
		const rightBound = centerX + camera.deadZoneX / 2;

		if (playerScreenX < leftBound) {
			camera.targetX = player.x - leftBound;
		} else if (playerScreenX > rightBound) {
			camera.targetX = player.x - rightBound;
		}

		const centerY = canvas.height / 2;
		const topBound = centerY - camera.deadZoneY / 2;
		const bottomBound = centerY + camera.deadZoneY / 2;

		if (playerScreenY < topBound) {
			camera.targetY = player.y - topBound;
		} else if (playerScreenY > bottomBound) {
			camera.targetY = player.y - bottomBound;
		}

		camera.targetX = Math.max(0, Math.min(camera.targetX, camera.worldWidth - camera.viewWidth));
		camera.targetY = Math.max(0, Math.min(camera.targetY, camera.worldHeight - camera.viewHeight));

		const lerpFactor = 1 - Math.pow(1 - camera.followSpeed, dt / 16);
		camera.x += (camera.targetX - camera.x) * lerpFactor;
		camera.y += (camera.targetY - camera.y) * lerpFactor;

		if (Math.abs(camera.x - camera.targetX) < 0.5) camera.x = camera.targetX;
		if (Math.abs(camera.y - camera.targetY) < 0.5) camera.y = camera.targetY;

		if (state.chunkLoader && state.useChunkLoading) {
			state.chunkLoader.updateLoadedChunks();
		}
	}

	/**
	 * Haupt-Update (Game-Mode): Alle Subsysteme pro Frame updaten
	 */
	function update(dt) {
		const state = getState();
		const playerUpdater = getPlayerUpdater();
		const abilities = getAbilities();
		const pickups = getPickups();
		const coverRocks = getCoverRocks();
		const foeUpdater = getFoeUpdater();
		const foeArrows = getFoeArrows();
		const foeCollision = getFoeCollision();
		const bossUpdater = getBossUpdater();
		const bossCollision = getBossCollision();

		state.frameDt = dt;
		updateAllGrids(state);

		playerUpdater.updatePlayer(dt);
		updateCamera(dt);
		abilities.updateCoralAllies(dt);
		abilities.updatePhaseSixSkills(dt);
		pickups.updateCoralEffects(dt);
		pickups.updateBubbles(dt);
		coverRocks.updateCoverRocks(dt);
		foeUpdater.updateFoes(dt);
		playerUpdater.updateShots(dt);
		foeArrows.updateFoeArrows(dt);
		pickups.updateHealPickups(dt);
		pickups.updateSymbolDrops(dt);
		pickups.updateCoinDrops(dt);
		abilities.updateTsunamiWave(dt);
		bossUpdater.updateBoss(dt);
		bossUpdater.updateBossAttacks(dt);

		// Kollisionen
		foeCollision.handleShotFoeHits();
		foeCollision.handleShotFoeArrowHits();
		foeCollision.handleShotTorpedoHits();
		bossCollision.handleShotBossHits();
		foeCollision.handlePlayerFoeCollisions();
		foeCollision.handlePlayerFoeArrowCollisions();
		bossCollision.handlePlayerTorpedoCollisions();
		bossCollision.handlePlayerFinSweepCollisions();
		bossCollision.handlePlayerWakeWaveCollisions();
		bossCollision.handlePlayerWhirlpoolEffects();
		bossCollision.handlePlayerCoinExplosions();
		bossCollision.handlePlayerDiamondBeams();
		bossCollision.handlePlayerTreasureWaves();
		bossCollision.handlePlayerCardBoomerangs();
		bossCollision.handlePlayerCrownColumns();
		bossCollision.handlePlayerKatapultCollisions();
		bossCollision.handlePlayerShockwaveCollisions();
		bossCollision.handlePlayerSpeedboatCollisions();
		bossCollision.handlePlayerPerfumeOrbCollisions();
		bossCollision.handlePlayerFragranceCloudCollisions();
		foeCollision.handlePlayerHealPickups();
		foeCollision.handlePlayerCoinDrops();
		foeCollision.handlePlayerSymbolDrops();
		bossCollision.handlePlayerBossCollision();
		maybeSpawnLevelThreeCoverRock();
		state.elapsed += dt;
	}

	/**
	 * City-Update Wrapper
	 */
	function updateCity(dt) {
		updateCityModule(getCityUpdateCtx(), dt);
	}

	/**
	 * City-Render Wrapper
	 */
	function renderCity() {
		renderCityModule(getCityRenderCtx());
	}

	/**
	 * Haupt-Render: Mode-basiertes Dispatching
	 */
	function render() {
		const state = getState();
		const canvas = getCanvas();
		const ctxCanvas = getCtx();
		const dungeonSystem = getDungeonSystem();
		const buildingsManager = getBuildingsManager();
		const backgroundRenderer = getBackgroundRenderer();
		const foeRenderer = getFoeRenderer();
		const bossRenderer = getBossRenderer();
		const bossUI = getBossUI();
		const gameRenderer = getGameRenderer();
		const cityInventoryEl = getCityInventoryEl();
		const cityMerchantEl = getCityMerchantEl();
		const cityMissionEl = getCityMissionEl();
		const citySpriteDebugPanel = getCitySpriteDebugPanel();

		// Dungeon
		if (state.mode === "dungeon" || state.mode === "dungeon_menu") {
			try {
				dungeonSystem.render();
			} catch (err) {
				console.error('[Cashfisch] Dungeon-Render-Fehler:', err);
			}
			return;
		}

		// Overworld
		if (state.mode === "overworld") {
			renderOverworldMode();
			return;
		}

		// Building
		if (state.mode === "building") {
			buildingsManager.render(ctxCanvas);
			gameRenderer.renderDebugLabel();
			return;
		}

		// City
		if (state.mode === "city") {
			renderCity();
			buildingsManager.render(ctxCanvas);
			gameRenderer.renderDebugLabel();
			return;
		}

		// Game mode
		if (canvas && canvas.classList.contains("city-perspective")) {
			canvas.classList.remove("city-perspective");
		}
		if (cityInventoryEl) cityInventoryEl.style.display = "none";
		if (cityMerchantEl) cityMerchantEl.style.display = "none";
		if (cityMissionEl) cityMissionEl.style.display = "none";
		if (citySpriteDebugPanel) citySpriteDebugPanel.style.display = "none";

		// Background
		backgroundRenderer.renderBackground();
		backgroundRenderer.renderBubbles();

		// Camera transform
		const useCamera = state.worldMode && state.camera && state.camera.enabled;
		if (useCamera) {
			ctxCanvas.save();
			ctxCanvas.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));
		}

		// World objects
		foeRenderer.renderFoes();
		backgroundRenderer.renderTsunamiWave();
		gameRenderer.renderHeals();
		gameRenderer.renderCoralEffects();
		gameRenderer.renderCoralAllies();
		gameRenderer.renderCoinDrops();
		gameRenderer.renderSymbolDrops();
		bossRenderer.renderBossDiamondBeams();
		bossRenderer.renderBossFinSweeps();
		bossRenderer.renderBossWakeWaves();
		bossRenderer.renderBossWhirlpools();
		bossRenderer.renderBossCoinBursts();
		bossRenderer.renderBossCoinExplosions();
		bossRenderer.renderBossShockwaves();
		bossRenderer.renderBossSpeedboats();
		bossRenderer.renderBossCardBoomerangs();
		bossRenderer.renderBossKatapultShots();
		bossRenderer.renderBossPerfumeOrbs();
		bossRenderer.renderBossTorpedoes();
		bossRenderer.renderBossFragranceClouds();
		foeRenderer.renderFoeArrows();
		gameRenderer.renderShots();
		bossUI.renderBoss();
		gameRenderer.renderHealBursts();
		gameRenderer.renderPlayer();
		backgroundRenderer.renderFloorOverlay();
		backgroundRenderer.renderCoverRocks();

		if (useCamera) {
			ctxCanvas.restore();
		}

		// UI overlay
		bossUI.renderBossHpBar();
		gameRenderer.renderEventFlash();
		gameRenderer.renderDebugLabel();
	}

	/**
	 * Game-Loop Tick: Delta-Time, Mode-Dispatch, HUD, Render
	 */
	function tick(now) {
		const state = getState();
		const keys = getKeys();
		const dungeonSystem = getDungeonSystem();
		const buildingsManager = getBuildingsManager();
		const updateHUD = getUpdateHUD();

		const rawDt = now - state.lastTick;
		const dt = clamp(rawDt, MIN_DELTA_TIME, MAX_DELTA_TIME);

		if (rawDt > LONG_FRAME_THRESHOLD) {
			// Long frame detected (tab switch)
		}

		state.lastTick = now;
		if (state.started && !state.over && !state.paused) {
			const buildingKeys = {
				left: keys.has('a') || keys.has('A') || keys.has('ArrowLeft'),
				right: keys.has('d') || keys.has('D') || keys.has('ArrowRight'),
				up: keys.has('w') || keys.has('W') || keys.has('ArrowUp'),
				down: keys.has('s') || keys.has('S') || keys.has('ArrowDown')
			};
			if (state.mode === "dungeon" || state.mode === "dungeon_menu") {
				try {
					dungeonSystem.update(dt);
				} catch (err) {
					console.error('[Cashfisch] Dungeon-Update-Fehler:', err);
				}
			} else if (state.mode === "overworld") {
				updateOverworldMode(dt);
			} else if (state.mode === "building") {
				buildingsManager.update(dt, buildingKeys);
			} else if (state.mode === "city") {
				updateCity(dt);
				buildingsManager.update(dt, buildingKeys);
			} else {
				update(dt);
			}
			updateHUD();
		}
		render();
		requestAnimationFrame(tick);
	}

	return { tick, update, render, updateCamera, updateCity, renderCity };
}
