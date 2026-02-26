// ============================================================
// HARBOR UI - Hafen-Interface mit Tabs
// ============================================================
// Tabs: Schiffe (Status/Routen), Ergebnisse, Hafen-Upgrade
// Zeigt Echtzeit-Expeditions-Fortschritt mit Auto-Refresh
"use strict";

/**
 * Erstellt das Harbor-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.harborSystem
 * @returns {Object} UI-Controller
 */
export function createHarborUI(ctx) {
	const { canvas, state, harborSystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;
	let refreshInterval = null;
	let activeTab = 'ships'; // 'ships' | 'routes' | 'stats'
	let selectedShipIndex = null; // Schiff-Index für Routen-Auswahl

	const ACCENT = '#3b82f6';
	const ACCENT_GLOW = 'rgba(59, 130, 246, 0.4)';

	const DANGER_COLORS = ['#4ade80', '#fbbf24', '#ef4444'];
	const DANGER_LABELS = ['Sicher', 'Moderat', 'Gefährlich'];

	// ───────────────────────── DOM ─────────────────────────

	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'harbor-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, #0f1a2e 0%, #0d1b3e 100%);
			border: 3px solid ${ACCENT};
			border-radius: 16px;
			padding: 24px;
			min-width: 560px;
			max-width: 640px;
			max-height: 85vh;
			overflow-y: auto;
			z-index: 10002;
			font-family: 'Segoe UI', Arial, sans-serif;
			color: #fff;
			box-shadow: 0 0 40px ${ACCENT_GLOW};
			display: none;
		`;
		document.body.appendChild(container);
	}

	// ───────────────────────── TABS ─────────────────────────

	function renderTabs() {
		const tabs = [
			{ key: 'ships', label: '⛵ Schiffe' },
			{ key: 'routes', label: '🗺️ Routen' },
			{ key: 'stats', label: '📊 Statistik' }
		];
		return tabs.map(t => {
			const isActive = activeTab === t.key;
			return `<button class="harbor-tab" data-tab="${t.key}" style="
				background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
				border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
				color: ${isActive ? '#fff' : '#aaa'};
				padding: 8px 16px;
				border-radius: 8px;
				cursor: pointer;
				font-size: 13px;
				font-weight: ${isActive ? 'bold' : 'normal'};
				transition: all 0.2s;
			">${t.label}</button>`;
		}).join('');
	}

	// ───────────────────────── SCHIFFE-TAB ─────────────────────────

	function renderShipsTab() {
		const ships = harborSystem.getAllShips();
		const level = state.harbor.level;
		const upgradeInfo = harborSystem.getHarborUpgradeInfo();

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
				<div style="font-size:16px;font-weight:bold;color:${ACCENT};">
					⚓ Flotte (Hafen Stufe ${level})
				</div>
				<div style="font-size:13px;color:#aaa;">
					${ships.filter(s => s.onExpedition).length}/${ships.length} unterwegs
				</div>
			</div>
		`;

		// Schiffe
		for (const ship of ships) {
			const shipData = ship.data;
			const upgLabel = ship.upgradeData.label;

			html += `<div style="
				background: rgba(0,0,0,0.3);
				border: 2px solid ${ship.onExpedition ? '#fbbf24' : ACCENT}40;
				border-radius: 12px;
				padding: 14px;
				margin-bottom: 10px;
				transition: border-color 0.2s;
			">`;

			// Schiff-Header
			html += `
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
					<div style="display:flex;align-items:center;gap:8px;">
						<span style="font-size:28px;">${shipData.icon}</span>
						<div>
							<div style="font-weight:bold;font-size:14px;">${shipData.name}</div>
							<div style="font-size:11px;color:#888;">${upgLabel} · Speed ×${ship.upgradeData.speedMult} · Loot ×${ship.upgradeData.lootMult}</div>
						</div>
					</div>
			`;

			// Upgrade-Button für Schiff
			if (ship.canUpgrade && !ship.onExpedition) {
				const shipUpg = harborSystem.getShipUpgradeInfo(ship.index);
				if (shipUpg) {
					const canAfford = (state.coins || 0) >= shipUpg.cost;
					html += canAfford
						? `<button class="harbor-upgrade-ship" data-ship="${ship.index}" style="
							background: linear-gradient(135deg, ${ACCENT} 0%, #2563eb 100%);
							border: none; color: white; padding: 5px 12px;
							border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;
						">⬆️ ${shipUpg.cost} G</button>`
						: `<span style="font-size:10px;color:#666;">${shipUpg.cost} G nötig</span>`;
				}
			}
			html += `</div>`;

			// Expedition Status
			if (ship.onExpedition && ship.expedition) {
				const exp = ship.expedition;
				const pct = Math.round(exp.progress * 100);
				const routeColor = exp.ready ? '#4ade80' : '#fbbf24';

				html += `
					<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:10px;margin-top:6px;">
						<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
							<span style="font-size:12px;color:#ccc;">${exp.route.icon} ${exp.route.name}</span>
							<span style="font-size:11px;color:${routeColor};">
								${exp.ready ? '✅ Fertig!' : harborSystem.formatTime(exp.remaining)}
							</span>
						</div>
						<div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
							<div style="width:${pct}%;height:100%;background:${routeColor};border-radius:3px;transition:width 1s linear;"></div>
						</div>
						${exp.crew ? `<div style="font-size:10px;color:#888;margin-top:4px;">👤 Crew: ${exp.crew}</div>` : ''}
						${exp.ready ? `
							<button class="harbor-collect" data-ship="${ship.index}" style="
								background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
								border: none; color: #1a1a2e; padding: 8px 16px;
								border-radius: 6px; cursor: pointer; font-weight: bold;
								font-size: 13px; width: 100%; margin-top: 8px;
							">📦 Loot einsammeln!</button>
						` : ''}
					</div>
				`;
			} else {
				// Send-Button
				html += `
					<button class="harbor-send" data-ship="${ship.index}" style="
						background: linear-gradient(135deg, ${ACCENT} 0%, #2563eb 100%);
						border: none; color: white; padding: 8px 16px;
						border-radius: 6px; cursor: pointer; font-weight: bold;
						font-size: 13px; width: 100%; margin-top: 6px;
					">🗺️ Auf Expedition schicken</button>
				`;
			}

			html += `</div>`;
		}

		// Routen-Auswahl Popup
		if (selectedShipIndex !== null) {
			html += renderRouteSelector(selectedShipIndex);
		}

		// Hafen-Upgrade
		if (upgradeInfo) {
			const canAfford = (state.coins || 0) >= upgradeInfo.cost;
			html += `
				<div style="
					background: rgba(255,255,255,0.05);
					border: 1px solid ${ACCENT}40;
					border-radius: 8px;
					padding: 12px;
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-top: 12px;
				">
					<div>
						<div style="font-size:13px;font-weight:bold;">⬆️ ${upgradeInfo.label}</div>
						<div style="font-size:11px;color:#aaa;">${upgradeInfo.newShips} Schiffe freischalten</div>
					</div>
					${canAfford ? `
						<button class="harbor-upgrade-building" style="
							background: linear-gradient(135deg, ${ACCENT} 0%, #2563eb 100%);
							border: none; color: white; padding: 8px 18px;
							border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;
						">${upgradeInfo.cost} Gold</button>
					` : `
						<span style="color:#e94560;font-size:12px;">${upgradeInfo.cost} Gold nötig</span>
					`}
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── ROUTEN-AUSWAHL ─────────────────────────

	function renderRouteSelector(shipIndex) {
		const routes = harborSystem.getRoutes();

		let html = `
			<div style="
				background: rgba(0,0,0,0.7);
				border: 2px solid ${ACCENT};
				border-radius: 12px;
				padding: 16px;
				margin-top: 12px;
				margin-bottom: 12px;
			">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
					<span style="font-size:14px;font-weight:bold;color:${ACCENT};">🗺️ Route wählen</span>
					<button class="harbor-cancel-route" style="
						background: rgba(233,69,96,0.2);
						border: 1px solid #e94560;
						color: #e94560;
						padding: 3px 10px;
						border-radius: 6px;
						cursor: pointer;
						font-size: 12px;
					">Abbrechen</button>
				</div>
		`;

		for (const route of routes) {
			const dangerColor = DANGER_COLORS[route.dangerLevel] || '#888';
			const dangerLabel = DANGER_LABELS[route.dangerLevel] || '?';
			const durationMin = Math.round(route.duration / 60000);

			html += `
				<div class="harbor-route-pick" data-route="${route.id}" style="
					background: rgba(0,0,0,0.3);
					border: 1px solid ${ACCENT}30;
					border-radius: 10px;
					padding: 12px;
					margin-bottom: 8px;
					cursor: pointer;
					transition: border-color 0.2s, background 0.2s;
				" onmouseenter="this.style.borderColor='${ACCENT}';this.style.background='rgba(59,130,246,0.1)'"
				   onmouseleave="this.style.borderColor='${ACCENT}30';this.style.background='rgba(0,0,0,0.3)'">
					<div style="display:flex;align-items:center;gap:10px;">
						<span style="font-size:24px;">${route.icon}</span>
						<div style="flex:1;">
							<div style="font-weight:bold;font-size:13px;">${route.name}</div>
							<div style="font-size:11px;color:#aaa;">${route.description}</div>
							<div style="display:flex;gap:10px;margin-top:4px;">
								<span style="font-size:10px;color:#888;">⏱ ${durationMin} Min.</span>
								<span style="font-size:10px;color:${dangerColor};">⚠️ ${dangerLabel}</span>
							</div>
						</div>
					</div>
					<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
						${route.lootTable.map(l => `
							<span style="
								background: rgba(255,255,255,0.08);
								padding: 2px 8px;
								border-radius: 4px;
								font-size: 10px;
								color: #ccc;
							">${l.icon} ${l.item} (${Math.round(l.chance * 100)}%)</span>
						`).join('')}
					</div>
				</div>
			`;
		}

		html += `</div>`;
		return html;
	}

	// ───────────────────────── ROUTEN-TAB ─────────────────────────

	function renderRoutesTab() {
		const routes = harborSystem.getRoutes();

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				🗺️ Verfügbare Routen
			</div>
		`;

		for (const route of routes) {
			const dangerColor = DANGER_COLORS[route.dangerLevel] || '#888';
			const dangerLabel = DANGER_LABELS[route.dangerLevel] || '?';
			const durationMin = Math.round(route.duration / 60000);

			html += `
				<div style="
					background: rgba(0,0,0,0.3);
					border: 1px solid ${ACCENT}30;
					border-radius: 10px;
					padding: 14px;
					margin-bottom: 10px;
				">
					<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
						<span style="font-size:28px;">${route.icon}</span>
						<div style="flex:1;">
							<div style="font-weight:bold;font-size:14px;">${route.name}</div>
							<div style="font-size:12px;color:#aaa;">${route.description}</div>
						</div>
						<div style="text-align:right;">
							<div style="font-size:11px;color:#888;">⏱ ${durationMin} Min.</div>
							<div style="font-size:11px;color:${dangerColor};">⚠️ ${dangerLabel}</div>
						</div>
					</div>

					<div style="font-size:12px;color:#ccc;margin-bottom:6px;font-weight:bold;">Mögliche Beute:</div>
					<div style="display:flex;flex-direction:column;gap:4px;">
						${route.lootTable.map(l => `
							<div style="
								display:flex;
								justify-content:space-between;
								align-items:center;
								background:rgba(255,255,255,0.05);
								padding:6px 10px;
								border-radius:6px;
							">
								<span style="font-size:12px;">${l.icon} ${l.item}</span>
								<span style="font-size:11px;color:#888;">${l.min}–${l.max}x · ${Math.round(l.chance * 100)}%</span>
							</div>
						`).join('')}
					</div>
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── STATS-TAB ─────────────────────────

	function renderStatsTab() {
		const stats = harborSystem.getStats();

		const html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				📊 Hafen-Statistik
			</div>

			<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
				<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;text-align:center;">
					<div style="font-size:28px;margin-bottom:4px;">⚓</div>
					<div style="font-size:20px;font-weight:bold;color:${ACCENT};">${stats.totalExpeditions}</div>
					<div style="font-size:11px;color:#888;">Expeditionen gesamt</div>
				</div>
				<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;text-align:center;">
					<div style="font-size:28px;margin-bottom:4px;">💰</div>
					<div style="font-size:20px;font-weight:bold;color:#ffd700;">${stats.totalGoldEarned.toLocaleString('de-DE')}</div>
					<div style="font-size:11px;color:#888;">Gold verdient</div>
				</div>
				<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;text-align:center;">
					<div style="font-size:28px;margin-bottom:4px;">🚢</div>
					<div style="font-size:20px;font-weight:bold;color:#4ade80;">${stats.activeExpeditions}</div>
					<div style="font-size:11px;color:#888;">Aktive Expeditionen</div>
				</div>
				<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;text-align:center;">
					<div style="font-size:28px;margin-bottom:4px;">⬆️</div>
					<div style="font-size:20px;font-weight:bold;color:${ACCENT};">Stufe ${stats.level}</div>
					<div style="font-size:11px;color:#888;">Hafen-Level</div>
				</div>
			</div>

			<div style="
				background: rgba(59,130,246,0.1);
				border: 1px solid ${ACCENT}40;
				border-radius: 8px;
				padding: 10px;
				margin-top: 14px;
				font-size: 11px;
				color: #888;
				line-height: 1.5;
			">
				💡 Expeditionen laufen in <b>Echtzeit</b> — auch während du im Dungeon bist!<br>
				Schiffe upgraden für schnellere Reisen und mehr Loot.
			</div>
		`;

		return html;
	}

	// ───────────────────────── RENDER ─────────────────────────

	function render() {
		if (!container) createDOM();

		const coins = state.coins || 0;

		const html = `
			<style>
				@keyframes harborWave {
					0%, 100% { transform: translateY(0px); }
					50% { transform: translateY(-3px); }
				}
			</style>

			<!-- Header -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:${ACCENT};font-size:24px;">⚓ Hafen</h2>
				<button id="harbor-close" style="
					background: #e94560;
					border: none;
					color: white;
					width: 32px;
					height: 32px;
					border-radius: 50%;
					cursor: pointer;
					font-size: 18px;
					font-weight: bold;
				">✕</button>
			</div>

			<!-- Gold-Anzeige -->
			<div style="
				background: rgba(255,255,255,0.08);
				padding: 10px 16px;
				border-radius: 8px;
				margin-bottom: 14px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			">
				<span style="color:#aaa;font-size:13px;">Schicke Schiffe auf Handelsmissionen!</span>
				<span style="font-weight:bold;font-size:15px;">💰 ${coins.toLocaleString('de-DE')} Gold</span>
			</div>

			<!-- Feedback -->
			<div id="harbor-feedback" style="
				display: none;
				padding: 12px;
				border-radius: 8px;
				margin-bottom: 12px;
				text-align: center;
				font-weight: bold;
				font-size: 14px;
				transition: opacity 0.3s;
			"></div>

			<!-- Tabs -->
			<div style="display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap;">
				${renderTabs()}
			</div>

			<!-- Content -->
			<div id="harbor-content">
				${activeTab === 'ships' ? renderShipsTab() : ''}
				${activeTab === 'routes' ? renderRoutesTab() : ''}
				${activeTab === 'stats' ? renderStatsTab() : ''}
			</div>
		`;

		container.innerHTML = html;
		bindEvents();
	}

	// ───────────────────────── EVENTS ─────────────────────────

	function bindEvents() {
		// Close
		const closeBtn = container.querySelector('#harbor-close');
		if (closeBtn) closeBtn.addEventListener('click', hide);

		// Tabs
		container.querySelectorAll('.harbor-tab').forEach(btn => {
			btn.addEventListener('click', e => {
				activeTab = e.currentTarget.dataset.tab;
				selectedShipIndex = null;
				render();
			});
		});

		// Schiff auf Expedition schicken (öffnet Routen-Auswahl)
		container.querySelectorAll('.harbor-send').forEach(btn => {
			btn.addEventListener('click', e => {
				selectedShipIndex = parseInt(e.currentTarget.dataset.ship);
				render();
			});
		});

		// Route auswählen
		container.querySelectorAll('.harbor-route-pick').forEach(el => {
			el.addEventListener('click', e => {
				const routeId = e.currentTarget.dataset.route;
				if (selectedShipIndex !== null) {
					handleStartExpedition(selectedShipIndex, routeId);
				}
			});
		});

		// Route-Auswahl abbrechen
		const cancelBtn = container.querySelector('.harbor-cancel-route');
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				selectedShipIndex = null;
				render();
			});
		}

		// Loot einsammeln
		container.querySelectorAll('.harbor-collect').forEach(btn => {
			btn.addEventListener('click', e => {
				const shipIdx = parseInt(e.currentTarget.dataset.ship);
				handleCollect(shipIdx);
			});
		});

		// Schiff upgraden
		container.querySelectorAll('.harbor-upgrade-ship').forEach(btn => {
			btn.addEventListener('click', e => {
				const shipIdx = parseInt(e.currentTarget.dataset.ship);
				handleUpgradeShip(shipIdx);
			});
		});

		// Hafen upgraden
		const harbUpgBtn = container.querySelector('.harbor-upgrade-building');
		if (harbUpgBtn) {
			harbUpgBtn.addEventListener('click', handleUpgradeHarbor);
		}
	}

	// ───────────────────────── HANDLER ─────────────────────────

	function handleStartExpedition(shipIndex, routeId) {
		const result = harborSystem.startExpedition(shipIndex, routeId);
		showFeedback(result.success, result.message);
		selectedShipIndex = null;
		render();
	}

	function handleCollect(shipIndex) {
		const result = harborSystem.collectExpedition(shipIndex);
		showFeedback(result.success, result.message);
		render();
	}

	function handleUpgradeShip(shipIndex) {
		const result = harborSystem.upgradeShip(shipIndex);
		showFeedback(result.success, result.message);
		render();
	}

	function handleUpgradeHarbor() {
		const result = harborSystem.upgradeHarbor();
		showFeedback(result.success, result.message);
		render();
	}

	// ───────────────────────── FEEDBACK ─────────────────────────

	function showFeedback(success, message) {
		if (!container) return;
		const fb = container.querySelector('#harbor-feedback');
		if (!fb) return;

		if (feedbackTimeout) clearTimeout(feedbackTimeout);

		fb.style.display = 'block';
		fb.style.opacity = '1';

		if (success) {
			fb.style.background = 'rgba(74, 222, 128, 0.15)';
			fb.style.border = '1px solid #4ade80';
			fb.style.color = '#4ade80';
			fb.innerHTML = `✅ ${message}`;
		} else {
			fb.style.background = 'rgba(233, 69, 96, 0.15)';
			fb.style.border = '1px solid #e94560';
			fb.style.color = '#e94560';
			fb.innerHTML = `❌ ${message}`;
		}

		feedbackTimeout = setTimeout(() => {
			fb.style.opacity = '0';
			setTimeout(() => { fb.style.display = 'none'; }, 300);
		}, 2500);
	}

	// ───────────────────────── LIFECYCLE ─────────────────────────

	function show(tab) {
		if (!container) createDOM();
		if (tab) activeTab = tab;
		render();
		container.style.display = 'block';
		visible = true;
		startRefresh();
	}

	function hide() {
		if (container) container.style.display = 'none';
		visible = false;
		selectedShipIndex = null;
		stopRefresh();
	}

	function toggle() {
		if (visible) hide();
		else show();
	}

	function isVisible() {
		return visible;
	}

	function startRefresh() {
		stopRefresh();
		refreshInterval = setInterval(() => {
			if (visible && activeTab === 'ships') {
				render();
			}
		}, 1000);
	}

	function stopRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	function update() {
		if (visible) render();
	}

	function destroy() {
		stopRefresh();
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
		container = null;
		visible = false;
	}

	return {
		show,
		hide,
		toggle,
		isVisible,
		update,
		render,
		destroy
	};
}
