// ============================================================
// GARDEN UI - Gärtnerei-Interface mit Tabs
// ============================================================
// Tabs: Garten (Slots), Samen kaufen, Buffs verwalten
// Zeigt Echtzeit-Wachstums-Fortschritt mit Auto-Refresh
"use strict";

/**
 * Erstellt das Garden-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.gardenSystem
 * @returns {Object} UI-Controller
 */
export function createGardenUI(ctx) {
	const { canvas, state, gardenSystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;
	let refreshInterval = null;
	let activeTab = 'garden'; // 'garden' | 'seeds' | 'buffs'
	let pendingSlot = null; // Slot-Index der auf einen Samen wartet (Auswahl-Popup)

	const ACCENT = '#22c55e';
	const ACCENT_GLOW = 'rgba(34, 197, 94, 0.4)';

	const RARITY_COLORS = {
		common: '#8fbc8f',
		rare: '#6495ed',
		epic: '#da70d6'
	};
	const RARITY_LABELS = {
		common: 'Gewöhnlich',
		rare: 'Selten',
		epic: 'Episch'
	};

	// ───────────────────────── DOM ─────────────────────────

	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'garden-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, #1a2e1a 0%, #162e16 100%);
			border: 3px solid ${ACCENT};
			border-radius: 16px;
			padding: 24px;
			min-width: 540px;
			max-width: 620px;
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
			{ key: 'garden', label: '🌱 Garten' },
			{ key: 'seeds', label: '🛒 Samen kaufen' },
			{ key: 'buffs', label: '✨ Buffs' }
		];
		return tabs.map(t => {
			const isActive = activeTab === t.key;
			return `<button class="garden-tab" data-tab="${t.key}" style="
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

	// ───────────────────────── GARTEN-TAB ─────────────────────────

	function renderGardenTab() {
		const slots = gardenSystem.getAllSlots();
		const seeds = gardenSystem.getSeedsInInventory();
		const level = state.garden.level;
		const upgradeInfo = gardenSystem.getUpgradeInfo();

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
				<div style="font-size:16px;font-weight:bold;color:${ACCENT};">
					🌱 Pflanz-Slots (Stufe ${level})
				</div>
				<div style="font-size:13px;color:#aaa;">${slots.filter(s => !s.empty).length}/${slots.length} belegt</div>
			</div>
		`;

		// Slot-Grid
		html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">`;
		for (const slot of slots) {
			if (slot.empty) {
				// Leerer Slot — klickbar wenn Samen vorhanden
				const hasSeeds = seeds.length > 0;
				html += `
					<div class="garden-slot garden-slot-empty" data-slot="${slot.index}" style="
						background: rgba(34,197,94,0.08);
						border: 2px dashed rgba(34,197,94,0.3);
						border-radius: 10px;
						padding: 12px 8px;
						text-align: center;
						min-height: 90px;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						cursor: ${hasSeeds ? 'pointer' : 'default'};
						transition: border-color 0.2s, background 0.2s;
						${hasSeeds ? '' : 'opacity: 0.5;'}
					" ${hasSeeds ? `onmouseenter="this.style.borderColor='${ACCENT}';this.style.background='rgba(34,197,94,0.15)'"
					   onmouseleave="this.style.borderColor='rgba(34,197,94,0.3)';this.style.background='rgba(34,197,94,0.08)'"` : ''}>
						<div style="font-size:24px;margin-bottom:4px;">🟫</div>
						<div style="font-size:11px;color:#666;">${hasSeeds ? 'Klick = Pflanzen' : 'Leer'}</div>
					</div>
				`;
			} else {
				// Bepflanzter Slot
				const rColor = RARITY_COLORS[slot.plant?.rarity] || '#888';
				const pct = Math.round(slot.progress * 100);
				const icon = slot.plant?.icon || '🌱';

				html += `
					<div class="garden-slot garden-slot-planted" data-slot="${slot.index}" style="
						background: rgba(0,0,0,0.3);
						border: 2px solid ${rColor};
						border-radius: 10px;
						padding: 10px 8px;
						text-align: center;
						min-height: 90px;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						cursor: ${slot.ready ? 'pointer' : 'default'};
						${slot.ready ? `box-shadow: 0 0 12px ${rColor}; animation: gardenPulse 1.5s infinite;` : ''}
					">
						<div style="font-size:22px;margin-bottom:4px;">${icon}</div>
						<div style="font-size:11px;font-weight:bold;color:${rColor};margin-bottom:4px;">
							${slot.plant?.label || '?'}
						</div>

						<!-- Fortschrittsbalken -->
						<div style="width:100%;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:4px;">
							<div style="width:${pct}%;height:100%;background:${slot.ready ? '#4ade80' : rColor};border-radius:3px;transition:width 1s linear;"></div>
						</div>

						<div style="font-size:10px;color:${slot.ready ? '#4ade80' : '#aaa'};">
							${slot.ready ? '🌟 Ernten!' : gardenSystem.formatTime(slot.remaining)}
						</div>
					</div>
				`;
			}
		}
		html += `</div>`;

		// Samen-Auswahl-Popup (wenn ein leerer Slot angeklickt wurde)
		if (pendingSlot !== null) {
			const seedsAvail = gardenSystem.getSeedsInInventory();
			html += `
				<div style="
					background: rgba(0,0,0,0.6);
					border: 2px solid ${ACCENT};
					border-radius: 10px;
					padding: 14px;
					margin-bottom: 14px;
				">
					<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
						<span style="font-size:14px;font-weight:bold;color:${ACCENT};">🌱 Samen wählen für Slot ${pendingSlot + 1}</span>
						<button class="garden-cancel-pick" style="
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
			if (seedsAvail.length === 0) {
				html += `<div style="text-align:center;padding:12px;color:#888;font-size:13px;">Keine Samen im Inventar. Kaufe welche im Samen-Tab!</div>`;
			} else {
				for (const s of seedsAvail) {
					const rColor = RARITY_COLORS[s.plant.rarity] || '#888';
					html += `
						<div class="garden-pick-seed" data-inv-idx="${s.inventoryIndex}" style="
							background: rgba(0,0,0,0.3);
							border: 1px solid ${rColor}40;
							border-radius: 8px;
							padding: 10px 12px;
							margin-bottom: 6px;
							display: flex;
							align-items: center;
							gap: 10px;
							cursor: pointer;
							transition: border-color 0.2s, background 0.2s;
						" onmouseenter="this.style.borderColor='${rColor}';this.style.background='rgba(34,197,94,0.12)'"
						   onmouseleave="this.style.borderColor='${rColor}40';this.style.background='rgba(0,0,0,0.3)'">
							<span style="font-size:22px;">${s.plant.icon}</span>
							<div style="flex:1;">
								<div style="font-weight:bold;font-size:13px;color:${rColor};">${s.plant.label}</div>
								<div style="font-size:11px;color:#aaa;">${s.plant.description}</div>
							</div>
							<span style="font-size:11px;color:#666;">⏱ ${Math.round(s.plant.growthTime / 60000)} Min.</span>
						</div>
					`;
				}
			}
			html += `</div>`;
		}

		// Upgrade-Box
		if (upgradeInfo) {
			const canAfford = (state.coins || 0) >= upgradeInfo.cost;
			html += `
				<div style="
					background: rgba(255,255,255,0.05);
					border: 1px solid rgba(34,197,94,0.3);
					border-radius: 8px;
					padding: 12px;
					display: flex;
					justify-content: space-between;
					align-items: center;
				">
					<div>
						<div style="font-size:13px;font-weight:bold;">⬆️ Upgrade: ${upgradeInfo.label}</div>
						<div style="font-size:11px;color:#aaa;">${upgradeInfo.newSlots} Slots freischalten</div>
					</div>
					${canAfford ? `
						<button class="garden-upgrade-btn" style="
							background: linear-gradient(135deg, ${ACCENT} 0%, #16a34a 100%);
							border: none;
							color: white;
							padding: 8px 18px;
							border-radius: 6px;
							cursor: pointer;
							font-weight: bold;
							font-size: 13px;
						">${upgradeInfo.cost} Gold</button>
					` : `
						<span style="color:#e94560;font-size:12px;">${upgradeInfo.cost} Gold nötig</span>
					`}
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── SAMEN-TAB ─────────────────────────

	function renderSeedsTab() {
		const seeds = gardenSystem.getAvailableSeeds();
		const coins = state.coins || 0;

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				🛒 Samen kaufen
			</div>
		`;

		if (seeds.length === 0) {
			html += `<div style="text-align:center;padding:30px;color:#666;">Keine Samen verfügbar.</div>`;
			return html;
		}

		for (const plant of seeds) {
			const rColor = RARITY_COLORS[plant.rarity] || '#888';
			const rLabel = RARITY_LABELS[plant.rarity] || '';
			const canAfford = coins >= plant.seedPrice;
			const growMin = Math.round(plant.growthTime / 60000);

			html += `
				<div style="
					background: rgba(0,0,0,0.3);
					border: 1px solid ${rColor}40;
					border-radius: 10px;
					padding: 14px;
					margin-bottom: 8px;
					display: flex;
					align-items: center;
					gap: 12px;
					transition: border-color 0.2s;
				" onmouseenter="this.style.borderColor='${rColor}'"
				   onmouseleave="this.style.borderColor='${rColor}40'">

					<div style="font-size:28px;flex-shrink:0;">${plant.icon}</div>

					<div style="flex:1;min-width:0;">
						<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
							<span style="font-weight:bold;">${plant.label}</span>
							<span style="
								background: ${rColor}30;
								color: ${rColor};
								padding: 1px 8px;
								border-radius: 4px;
								font-size: 10px;
							">${rLabel}</span>
							<span style="font-size:10px;color:#666;">⏱ ${growMin} Min.</span>
						</div>
						<div style="font-size:12px;color:#aaa;">${plant.description}</div>
					</div>

					<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
						<span style="font-weight:bold;color:#ffd700;font-size:13px;">💰 ${plant.seedPrice}</span>
						${canAfford ? `
							<button class="garden-buy-seed" data-plant-id="${plant.id}" style="
								background: linear-gradient(135deg, ${ACCENT} 0%, #16a34a 100%);
								border: none;
								color: white;
								padding: 5px 14px;
								border-radius: 6px;
								cursor: pointer;
								font-weight: bold;
								font-size: 12px;
							">Kaufen</button>
						` : `
							<span style="font-size:11px;color:#e94560;">Zu teuer</span>
						`}
					</div>
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── BUFFS-TAB ─────────────────────────

	function renderBuffsTab() {
		const activeBuffs = gardenSystem.getActiveBuffs();
		const invBuffs = gardenSystem.getBuffsInInventory();
		const maxBuffs = 3;

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				✨ Aktive Buffs (${activeBuffs.length}/${maxBuffs})
			</div>
		`;

		// Aktive Buffs anzeigen
		if (activeBuffs.length > 0) {
			html += `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">`;
			for (const ab of activeBuffs) {
				const plant = gardenSystem.getPlantData(ab.plantId);
				const rColor = RARITY_COLORS[plant?.rarity] || '#888';
				html += `
					<div style="
						background: ${rColor}20;
						border: 2px solid ${rColor};
						border-radius: 10px;
						padding: 12px;
						text-align: center;
						min-width: 120px;
						box-shadow: 0 0 8px ${rColor}60;
					">
						<div style="font-size:22px;margin-bottom:4px;">${plant?.icon || '✨'}</div>
						<div style="font-size:12px;font-weight:bold;color:${rColor};">${plant?.label || '?'}</div>
						<div style="font-size:11px;color:#aaa;margin-top:2px;">${ab.buff.label}</div>
					</div>
				`;
			}
			html += `</div>`;
		} else {
			html += `
				<div style="
					text-align:center;
					padding:16px;
					color:#666;
					border: 1px dashed rgba(255,255,255,0.1);
					border-radius: 8px;
					margin-bottom: 16px;
				">Keine Buffs aktiv. Ernte Pflanzen und aktiviere Buffs vor dem nächsten Run!</div>
			`;
		}

		// Buffs im Inventar
		html += `
			<div style="font-size:14px;font-weight:bold;color:#ccc;margin-bottom:10px;">
				📦 Buffs im Inventar
			</div>
		`;

		if (invBuffs.length === 0) {
			html += `<div style="text-align:center;padding:16px;color:#666;font-size:13px;">
				Keine Buff-Items im Inventar. Pflanze Samen und ernte sie!
			</div>`;
		} else {
			for (const ib of invBuffs) {
				const rColor = RARITY_COLORS[ib.plant.rarity] || '#888';
				const canActivate = activeBuffs.length < maxBuffs;
				html += `
					<div style="
						background: rgba(0,0,0,0.3);
						border: 1px solid ${rColor}40;
						border-radius: 8px;
						padding: 12px;
						margin-bottom: 6px;
						display: flex;
						align-items: center;
						gap: 10px;
					">
						<span style="font-size:20px;">${ib.plant.icon}</span>
						<div style="flex:1;">
							<div style="font-weight:bold;font-size:13px;">${ib.plant.label}</div>
							<div style="font-size:11px;color:#aaa;">${ib.plant.buff.label}</div>
						</div>
						${canActivate ? `
							<button class="garden-activate-buff" data-inv-idx="${ib.inventoryIndex}" style="
								background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
								border: none;
								color: #1a1a2e;
								padding: 5px 12px;
								border-radius: 6px;
								cursor: pointer;
								font-weight: bold;
								font-size: 12px;
							">Aktivieren</button>
						` : `
							<span style="font-size:11px;color:#e94560;">Max Buffs</span>
						`}
					</div>
				`;
			}
		}

		// Info-Hinweis
		html += `
			<div style="
				background: rgba(34,197,94,0.1);
				border: 1px solid rgba(34,197,94,0.3);
				border-radius: 8px;
				padding: 10px;
				margin-top: 12px;
				font-size: 11px;
				color: #888;
				line-height: 1.5;
			">
				💡 Buffs halten für <b>1 Run</b>. Bei Tod gehen alle Buffs verloren.<br>
				Max. ${maxBuffs} Buffs gleichzeitig aktiv.
			</div>
		`;

		return html;
	}

	// ───────────────────────── RENDER ─────────────────────────

	function render() {
		if (!container) createDOM();

		const coins = state.coins || 0;

		const html = `
			<!-- Pulse Animation -->
			<style>
				@keyframes gardenPulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.7; }
				}
			</style>

			<!-- Header -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:${ACCENT};font-size:24px;">🌿 Gärtnerei</h2>
				<button id="garden-close" style="
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
				<span style="color:#aaa;font-size:13px;">Pflanze, pflege und ernte Buffs für deine Runs!</span>
				<span style="font-weight:bold;font-size:15px;">💰 ${coins.toLocaleString('de-DE')} Gold</span>
			</div>

			<!-- Feedback -->
			<div id="garden-feedback" style="
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
			<div id="garden-content">
				${activeTab === 'garden' ? renderGardenTab() : ''}
				${activeTab === 'seeds' ? renderSeedsTab() : ''}
				${activeTab === 'buffs' ? renderBuffsTab() : ''}
			</div>
		`;

		container.innerHTML = html;
		bindEvents();
	}

	// ───────────────────────── EVENTS ─────────────────────────

	function bindEvents() {
		// Close
		const closeBtn = container.querySelector('#garden-close');
		if (closeBtn) closeBtn.addEventListener('click', hide);

		// Tabs
		container.querySelectorAll('.garden-tab').forEach(btn => {
			btn.addEventListener('click', e => {
				activeTab = e.currentTarget.dataset.tab;
				render();
			});
		});

		// Leere Slots klicken → Samen-Auswahl öffnen
		container.querySelectorAll('.garden-slot-empty').forEach(el => {
			el.addEventListener('click', e => {
				const slotIdx = parseInt(e.currentTarget.dataset.slot);
				pendingSlot = slotIdx;
				render();
			});
		});

		// Samen aus dem Picker wählen
		container.querySelectorAll('.garden-pick-seed').forEach(el => {
			el.addEventListener('click', e => {
				const invIdx = parseInt(e.currentTarget.dataset.invIdx);
				handlePlantInSlot(pendingSlot, invIdx);
			});
		});

		// Samen-Auswahl abbrechen
		const cancelPickBtn = container.querySelector('.garden-cancel-pick');
		if (cancelPickBtn) {
			cancelPickBtn.addEventListener('click', () => {
				pendingSlot = null;
				render();
			});
		}

		// Fertige Slots klicken → Ernten
		container.querySelectorAll('.garden-slot-planted').forEach(el => {
			el.addEventListener('click', e => {
				const slotIdx = parseInt(e.currentTarget.dataset.slot);
				const slotData = gardenSystem.getAllSlots()[slotIdx];
				if (slotData && slotData.ready) {
					handleHarvest(slotIdx);
				}
			});
		});

		// Samen kaufen
		container.querySelectorAll('.garden-buy-seed').forEach(btn => {
			btn.addEventListener('click', e => {
				const plantId = e.currentTarget.dataset.plantId;
				handleBuySeed(plantId);
			});
		});

		// Buff aktivieren
		container.querySelectorAll('.garden-activate-buff').forEach(btn => {
			btn.addEventListener('click', e => {
				const invIdx = parseInt(e.currentTarget.dataset.invIdx);
				handleActivateBuff(invIdx);
			});
		});

		// Upgrade
		const upgradeBtn = container.querySelector('.garden-upgrade-btn');
		if (upgradeBtn) {
			upgradeBtn.addEventListener('click', handleUpgrade);
		}
	}

	// ───────────────────────── HANDLER ─────────────────────────

	function handlePlantInSlot(slotIdx, inventoryIndex) {
		const result = gardenSystem.plantSeed(slotIdx, inventoryIndex);
		showFeedback(result.success, result.message);
		pendingSlot = null;
		render();
	}

	function handleHarvest(slotIdx) {
		const result = gardenSystem.harvest(slotIdx);
		showFeedback(result.success, result.message);
		render();
	}

	function handleBuySeed(plantId) {
		const result = gardenSystem.buySeed(plantId);
		showFeedback(result.success, result.message);
		render();
	}

	function handleActivateBuff(invIdx) {
		const result = gardenSystem.activateBuff(invIdx);
		showFeedback(result.success, result.message);
		render();
	}

	function handleUpgrade() {
		const result = gardenSystem.upgradeGarden();
		showFeedback(result.success, result.message);
		render();
	}

	// ───────────────────────── FEEDBACK ─────────────────────────

	function showFeedback(success, message) {
		if (!container) return;
		const fb = container.querySelector('#garden-feedback');
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

		// Auto-Refresh für Wachstums-Timer (jede Sekunde)
		startRefresh();
	}

	function hide() {
		if (container) container.style.display = 'none';
		visible = false;
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
			if (visible && activeTab === 'garden') {
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
