// ============================================================
// HELPERS UI - NPC-Helfer Karten-Interface
// ============================================================
// Tabs: Helfer (3 Slots), Sammlung, Kaufen (Shop)
// Karten-Sammlung mit Rollen-Filter und Upgrade-Anzeige
"use strict";

/**
 * Erstellt das Helpers-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.helpersSystem
 * @returns {Object} UI-Controller
 */
export function createHelpersUI(ctx) {
	const { canvas, state, helpersSystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;
	let activeTab = 'active'; // 'active' | 'collection' | 'buy'
	const selectedCard = null;
	let roleFilter = 'all';
	let pendingSlot = null;
	let buyRoleFilter = 'all';

	const ACCENT = '#f59e0b';
	const ACCENT_GLOW = 'rgba(245, 158, 11, 0.4)';

	const ROLE_COLORS = {
		tank: '#3b82f6',
		healer: '#22c55e',
		dps: '#ef4444'
	};
	const ROLE_ICONS = {
		tank: '🛡️',
		healer: '💚',
		dps: '⚔️'
	};
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
	const RARITY_PRICES = {
		common: 300,
		rare: 750,
		epic: 1500
	};

	// ───────────────────────── DOM ─────────────────────────

	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'helpers-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, #2e1a0f 0%, #3e2510 100%);
			border: 3px solid ${ACCENT};
			border-radius: 16px;
			padding: 24px;
			min-width: 580px;
			max-width: 660px;
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
			{ key: 'active', label: '⚔️ Helfer' },
			{ key: 'collection', label: '📦 Sammlung' },
			{ key: 'buy', label: '🛒 Kaufen' }
		];
		return tabs.map(t => {
			const isActive = activeTab === t.key;
			return `<button class="helpers-tab" data-tab="${t.key}" style="
				background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
				border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
				color: ${isActive ? '#1a1a2e' : '#aaa'};
				padding: 8px 16px;
				border-radius: 8px;
				cursor: pointer;
				font-size: 13px;
				font-weight: ${isActive ? 'bold' : 'normal'};
				transition: all 0.2s;
			">${t.label}</button>`;
		}).join('');
	}

	// ───────────────────────── HELFER-TAB (Aktive Slots) ─────────────────────────

	function renderActiveTab() {
		const activeHelpers = helpersSystem.getActiveHelpers();
		const stats = helpersSystem.getStats();

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				⚔️ Aktive Helfer (${stats.activeCount}/3)
			</div>

			<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
		`;

		for (const helper of activeHelpers) {
			if (helper.empty) {
				html += `
					<div class="helpers-slot-empty" data-slot="${helper.slot}" style="
						background: rgba(245,158,11,0.08);
						border: 2px dashed rgba(245,158,11,0.3);
						border-radius: 12px;
						padding: 20px 12px;
						text-align: center;
						min-height: 140px;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						cursor: pointer;
						transition: border-color 0.2s, background 0.2s;
					" onmouseenter="this.style.borderColor='${ACCENT}';this.style.background='rgba(245,158,11,0.15)'"
					   onmouseleave="this.style.borderColor='rgba(245,158,11,0.3)';this.style.background='rgba(245,158,11,0.08)'">
						<div style="font-size:28px;margin-bottom:8px;opacity:0.3;">➕</div>
						<div style="font-size:12px;color:#888;">Slot ${helper.slot + 1}</div>
						<div style="font-size:10px;color:#666;">Klick = Helfer wählen</div>
					</div>
				`;
			} else {
				const roleColor = ROLE_COLORS[helper.data.role] || '#888';
				const rarColor = RARITY_COLORS[helper.data.rarity] || '#888';

				html += `
					<div style="
						background: ${roleColor}15;
						border: 2px solid ${roleColor};
						border-radius: 12px;
						padding: 14px 10px;
						text-align: center;
						min-height: 140px;
						box-shadow: 0 0 10px ${roleColor}30;
					">
						<div style="font-size:32px;margin-bottom:4px;">${helper.data.icon}</div>
						<div style="font-weight:bold;font-size:12px;color:${rarColor};">${helper.data.name}</div>
						<div style="font-size:10px;color:#aaa;">Stufe ${helper.level}</div>
						<div style="
							background: ${roleColor}30;
							color: ${roleColor};
							padding: 2px 8px;
							border-radius: 4px;
							font-size: 10px;
							display: inline-block;
							margin-top: 4px;
						">${ROLE_ICONS[helper.data.role]} ${helper.roleData.label}</div>
						<div style="font-size:10px;color:#888;margin-top:4px;">${helper.stats.specialLabel}</div>
						<button class="helpers-unequip" data-slot="${helper.slot}" style="
							background: rgba(233,69,96,0.2);
							border: 1px solid #e94560;
							color: #e94560;
							padding: 3px 10px;
							border-radius: 4px;
							cursor: pointer;
							font-size: 10px;
							margin-top: 6px;
						">Entfernen</button>
					</div>
				`;
			}
		}

		html += `</div>`;

		// Equip-Popup
		if (pendingSlot !== null) {
			html += renderEquipSelector();
		}

		// Info-Box
		html += `
			<div style="
				background: rgba(245,158,11,0.1);
				border: 1px solid ${ACCENT}40;
				border-radius: 8px;
				padding: 10px;
				font-size: 11px;
				color: #888;
				line-height: 1.5;
			">
				💡 Helfer begleiten dich im Dungeon mit KI-gesteuertem Verhalten:<br>
				🛡️ <b>Tank</b> = Taunt-Aura (Gegner fokussieren Tank)<br>
				💚 <b>Heiler</b> = Heilt Ziel mit niedrigster %HP<br>
				⚔️ <b>DPS</b> = Greift dein Ziel an
			</div>
		`;

		return html;
	}

	// ───────────────────────── EQUIP-POPUP ─────────────────────────

	function renderEquipSelector() {
		const collection = helpersSystem.getCollection();
		const available = collection.filter(c => !c.isActive);

		let html = `
			<div style="
				background: rgba(0,0,0,0.7);
				border: 2px solid ${ACCENT};
				border-radius: 12px;
				padding: 16px;
				margin-bottom: 14px;
			">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
					<span style="font-size:14px;font-weight:bold;color:${ACCENT};">Helfer für Slot ${pendingSlot + 1} wählen</span>
					<button class="helpers-cancel-equip" style="
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

		if (available.length === 0) {
			html += `<div style="text-align:center;padding:12px;color:#888;">Keine verfügbaren Helfer. Kaufe oder finde Karten im Dungeon!</div>`;
		} else {
			for (const card of available) {
				const roleColor = ROLE_COLORS[card.data.role] || '#888';
				const rarColor = RARITY_COLORS[card.data.rarity] || '#888';

				html += `
					<div class="helpers-equip-card" data-card="${card.cardId}" style="
						background: rgba(0,0,0,0.3);
						border: 1px solid ${roleColor}40;
						border-radius: 8px;
						padding: 10px 12px;
						margin-bottom: 6px;
						display: flex;
						align-items: center;
						gap: 10px;
						cursor: pointer;
						transition: border-color 0.2s, background 0.2s;
					" onmouseenter="this.style.borderColor='${roleColor}';this.style.background='rgba(245,158,11,0.1)'"
					   onmouseleave="this.style.borderColor='${roleColor}40';this.style.background='rgba(0,0,0,0.3)'">
						<span style="font-size:24px;">${card.data.icon}</span>
						<div style="flex:1;">
							<div style="display:flex;align-items:center;gap:6px;">
								<span style="font-weight:bold;font-size:12px;color:${rarColor};">${card.data.name}</span>
								<span style="font-size:10px;color:${roleColor};">${ROLE_ICONS[card.data.role]} ${card.roleData.label}</span>
							</div>
							<div style="font-size:10px;color:#aaa;">Stufe ${card.level} · ${card.stats.specialLabel}</div>
						</div>
						<span style="font-size:10px;color:#888;">❤️ ${card.stats.hp} · ⚔️ ${card.stats.damage}</span>
					</div>
				`;
			}
		}

		html += `</div>`;
		return html;
	}

	// ───────────────────────── SAMMLUNG-TAB ─────────────────────────

	function renderCollectionTab() {
		const collection = helpersSystem.getCollection();
		const stats = helpersSystem.getStats();

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
				<div style="font-size:16px;font-weight:bold;color:${ACCENT};">
					📦 Kartensammlung (${stats.totalCards}/${stats.maxCards})
				</div>
			</div>

			<div style="display:flex;gap:6px;margin-bottom:14px;">
				${['all', 'tank', 'healer', 'dps'].map(f => {
					const isActive = roleFilter === f;
					const label = f === 'all' ? '🃏 Alle' : `${ROLE_ICONS[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`;
					return `<button class="helpers-filter" data-filter="${f}" style="
						background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
						border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
						color: ${isActive ? '#1a1a2e' : '#aaa'};
						padding: 5px 12px;
						border-radius: 6px;
						cursor: pointer;
						font-size: 12px;
						font-weight: ${isActive ? 'bold' : 'normal'};
					">${label}</button>`;
				}).join('')}
			</div>
		`;

		const filtered = roleFilter === 'all'
			? collection
			: collection.filter(c => c.data.role === roleFilter);

		if (filtered.length === 0) {
			html += `<div style="text-align:center;padding:30px;color:#666;">
				${collection.length === 0 ? 'Noch keine Karten. Kaufe sie im Shop oder finde sie im Dungeon!' : 'Keine Karten in dieser Kategorie.'}
			</div>`;
		} else {
			for (const card of filtered) {
				const roleColor = ROLE_COLORS[card.data.role] || '#888';
				const rarColor = RARITY_COLORS[card.data.rarity] || '#888';
				const rarLabel = RARITY_LABELS[card.data.rarity] || '';

				html += `
					<div style="
						background: ${card.isActive ? `${roleColor}10` : 'rgba(0,0,0,0.3)'};
						border: 2px solid ${card.isActive ? roleColor : `${rarColor}40`};
						border-radius: 10px;
						padding: 14px;
						margin-bottom: 8px;
						${card.isActive ? `box-shadow: 0 0 8px ${roleColor}30;` : ''}
					">
						<div style="display:flex;align-items:center;gap:10px;">
							<span style="font-size:28px;">${card.data.icon}</span>
							<div style="flex:1;">
								<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
									<span style="font-weight:bold;color:${rarColor};">${card.data.name}</span>
									<span style="
										background: ${rarColor}30;
										color: ${rarColor};
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 10px;
									">${rarLabel}</span>
									<span style="
										background: ${roleColor}30;
										color: ${roleColor};
										padding: 1px 6px;
										border-radius: 4px;
										font-size: 10px;
									">${ROLE_ICONS[card.data.role]} ${card.roleData.label}</span>
									${card.isActive ? '<span style="color:#fbbf24;font-size:10px;">⭐ Aktiv</span>' : ''}
								</div>
								<div style="font-size:11px;color:#aaa;">${card.data.description}</div>
								<div style="display:flex;gap:12px;margin-top:4px;">
									<span style="font-size:10px;color:#888;">⬆️ Stufe ${card.level}/3</span>
									<span style="font-size:10px;color:#888;">❤️ ${card.stats.hp} HP</span>
									<span style="font-size:10px;color:#888;">⚔️ ${card.stats.damage} DMG</span>
									<span style="font-size:10px;color:#888;">💨 ${card.stats.speed} SPD</span>
								</div>
								<div style="font-size:10px;color:${roleColor};margin-top:2px;">✨ ${card.stats.specialLabel}</div>
							</div>

							<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
								${card.canUpgrade ? `
									<button class="helpers-upgrade" data-card="${card.cardId}" style="
										background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
										border: none;
										color: #1a1a2e;
										padding: 4px 10px;
										border-radius: 6px;
										cursor: pointer;
										font-weight: bold;
										font-size: 11px;
									">⬆️ Upgraden</button>
								` : (card.level < 3 ? `
									<span style="font-size:10px;color:#666;">
										Duplikate: ${card.duplicates}/${card.dupsNeeded}
									</span>
								` : `
									<span style="font-size:10px;color:#fbbf24;">MAX ⭐</span>
								`)}
							</div>
						</div>
					</div>
				`;
			}
		}

		return html;
	}

	// ───────────────────────── KAUFEN-TAB (Shop) ─────────────────────────

	function renderBuyTab() {
		const helpersDataRef = helpersSystem.getHelpersData();
		const allCardIds = Object.keys(helpersDataRef.cards);
		const collection = helpersSystem.getCollection();
		const stats = helpersSystem.getStats();
		const gold = state.coins || 0;

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
				<div style="font-size:16px;font-weight:bold;color:${ACCENT};">
					🛒 Helferkarten kaufen
				</div>
				<div style="font-size:14px;color:#ffd700;font-weight:bold;">
					💰 ${gold} Gold
				</div>
			</div>

			<div style="
				background: rgba(245,158,11,0.1);
				border: 1px solid ${ACCENT}40;
				border-radius: 8px;
				padding: 8px 12px;
				margin-bottom: 14px;
				font-size: 11px;
				color: #aaa;
			">
				💡 Kaufe Helferkarten für Gold. Duplikate werden für Upgrades benötigt!
				<span style="color:#888;"> · Sammlung: ${stats.totalCards}/${stats.maxCards}</span>
			</div>

			<!-- Rollen-Filter -->
			<div style="display:flex;gap:6px;margin-bottom:14px;">
				${['all', 'tank', 'healer', 'dps'].map(f => {
					const isActive = buyRoleFilter === f;
					const label = f === 'all' ? '🃏 Alle' : `${ROLE_ICONS[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`;
					return `<button class="helpers-buy-filter" data-filter="${f}" style="
						background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
						border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
						color: ${isActive ? '#1a1a2e' : '#aaa'};
						padding: 5px 12px;
						border-radius: 6px;
						cursor: pointer;
						font-size: 12px;
						font-weight: ${isActive ? 'bold' : 'normal'};
					">${label}</button>`;
				}).join('')}
			</div>
		`;

		// Alle Karten zum Kaufen anzeigen
		const filteredIds = buyRoleFilter === 'all'
			? allCardIds
			: allCardIds.filter(id => helpersDataRef.cards[id].role === buyRoleFilter);

		for (const cardId of filteredIds) {
			const card = helpersDataRef.cards[cardId];
			const roleColor = ROLE_COLORS[card.role] || '#888';
			const rarColor = RARITY_COLORS[card.rarity] || '#888';
			const rarLabel = RARITY_LABELS[card.rarity] || '';
			const price = RARITY_PRICES[card.rarity] || 500;
			const owned = collection.find(c => c.cardId === cardId);
			const canAfford = gold >= price;
			const collectionFull = stats.totalCards >= stats.maxCards && !owned;
			const stats1 = card.stats['1'];

			html += `
				<div style="
					background: rgba(0,0,0,0.3);
					border: 2px solid ${rarColor}40;
					border-radius: 10px;
					padding: 14px;
					margin-bottom: 8px;
					transition: border-color 0.2s;
				">
					<div style="display:flex;align-items:center;gap:10px;">
						<span style="font-size:32px;">${card.icon}</span>
						<div style="flex:1;">
							<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
								<span style="font-weight:bold;color:${rarColor};">${card.name}</span>
								<span style="
									background: ${rarColor}30;
									color: ${rarColor};
									padding: 1px 6px;
									border-radius: 4px;
									font-size: 10px;
								">${rarLabel}</span>
								<span style="
									background: ${roleColor}30;
									color: ${roleColor};
									padding: 1px 6px;
									border-radius: 4px;
									font-size: 10px;
								">${ROLE_ICONS[card.role]} ${helpersDataRef.roles[card.role]?.label || card.role}</span>
								${owned ? `<span style="color:#4ade80;font-size:10px;">✅ Besitzt (Stufe ${owned.level})</span>` : ''}
							</div>
							<div style="font-size:11px;color:#aaa;">${card.description}</div>
							<div style="display:flex;gap:12px;margin-top:4px;">
								<span style="font-size:10px;color:#888;">❤️ ${stats1.hp} HP</span>
								<span style="font-size:10px;color:#888;">⚔️ ${stats1.damage} DMG</span>
								<span style="font-size:10px;color:#888;">💨 ${stats1.speed} SPD</span>
							</div>
							<div style="font-size:10px;color:${roleColor};margin-top:2px;">✨ ${stats1.specialLabel}</div>
						</div>

						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
							<div style="font-size:14px;font-weight:bold;color:${canAfford ? '#ffd700' : '#666'};">
								💰 ${price}
							</div>
							<button class="helpers-buy-card" data-card="${cardId}" data-price="${price}" ${(!canAfford || collectionFull) ? 'disabled' : ''} style="
								background: ${canAfford && !collectionFull ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'rgba(255,255,255,0.05)'};
								border: 1px solid ${canAfford && !collectionFull ? '#fbbf24' : '#555'};
								color: ${canAfford && !collectionFull ? '#1a1a2e' : '#555'};
								padding: 6px 14px;
								border-radius: 6px;
								cursor: ${canAfford && !collectionFull ? 'pointer' : 'not-allowed'};
								font-weight: bold;
								font-size: 12px;
								transition: transform 0.1s;
							">${collectionFull && !owned ? '📦 Voll' : (owned ? '🔄 Duplikat' : '🛒 Kaufen')}</button>
						</div>
					</div>
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── RENDER ─────────────────────────

	function render() {
		if (!container) createDOM();

		const stats = helpersSystem.getStats();

		const html = `
			<!-- Header -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:${ACCENT};font-size:24px;">🃏 NPC-Helfer</h2>
				<button id="helpers-close" style="
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

			<!-- Karten-Statistik -->
			<div style="
				background: rgba(255,255,255,0.08);
				padding: 10px 16px;
				border-radius: 8px;
				margin-bottom: 14px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			">
				<span style="color:#aaa;font-size:13px;">Sammle Helfer-Karten und rüste sie für den Dungeon aus!</span>
				<span style="font-size:13px;">🃏 ${stats.totalCards}/${stats.maxCards} · 💰 ${state.coins || 0}</span>
			</div>

			<!-- Feedback -->
			<div id="helpers-feedback" style="
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
			<div style="display:flex;gap:6px;margin-bottom:18px;">
				${renderTabs()}
			</div>

			<!-- Content -->
			<div id="helpers-content">
				${activeTab === 'active' ? renderActiveTab() : ''}
				${activeTab === 'collection' ? renderCollectionTab() : ''}
				${activeTab === 'buy' ? renderBuyTab() : ''}
			</div>
		`;

		container.innerHTML = html;
		bindEvents();
	}

	// ───────────────────────── EVENTS ─────────────────────────

	function bindEvents() {
		// Close
		const closeBtn = container.querySelector('#helpers-close');
		if (closeBtn) closeBtn.addEventListener('click', hide);

		// Tabs
		container.querySelectorAll('.helpers-tab').forEach(btn => {
			btn.addEventListener('click', e => {
				activeTab = e.currentTarget.dataset.tab;
				pendingSlot = null;
				render();
			});
		});

		// Leerer Slot → equip popup
		container.querySelectorAll('.helpers-slot-empty').forEach(el => {
			el.addEventListener('click', e => {
				pendingSlot = parseInt(e.currentTarget.dataset.slot);
				render();
			});
		});

		// Equip-Popup: Karte wählen
		container.querySelectorAll('.helpers-equip-card').forEach(el => {
			el.addEventListener('click', e => {
				const cardId = e.currentTarget.dataset.card;
				if (pendingSlot !== null) {
					const result = helpersSystem.equipHelper(cardId, pendingSlot);
					showFeedback(result.success, result.message);
					pendingSlot = null;
					render();
				}
			});
		});

		// Equip abbrechen
		const cancelBtn = container.querySelector('.helpers-cancel-equip');
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				pendingSlot = null;
				render();
			});
		}

		// Unequip
		container.querySelectorAll('.helpers-unequip').forEach(btn => {
			btn.addEventListener('click', e => {
				const slot = parseInt(e.currentTarget.dataset.slot);
				const result = helpersSystem.unequipHelper(slot);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Upgrade
		container.querySelectorAll('.helpers-upgrade').forEach(btn => {
			btn.addEventListener('click', e => {
				const cardId = e.currentTarget.dataset.card;
				const result = helpersSystem.upgradeCard(cardId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Sammlung-Filter
		container.querySelectorAll('.helpers-filter').forEach(btn => {
			btn.addEventListener('click', e => {
				roleFilter = e.currentTarget.dataset.filter;
				render();
			});
		});

		// Kaufen-Filter
		container.querySelectorAll('.helpers-buy-filter').forEach(btn => {
			btn.addEventListener('click', e => {
				buyRoleFilter = e.currentTarget.dataset.filter;
				render();
			});
		});

		// Karte kaufen
		container.querySelectorAll('.helpers-buy-card').forEach(btn => {
			btn.addEventListener('click', e => {
				const cardId = e.currentTarget.dataset.card;
				const price = parseInt(e.currentTarget.dataset.price);
				if (!cardId || isNaN(price)) return;

				const gold = state.coins || 0;
				if (gold < price) {
					showFeedback(false, `Nicht genug Gold! (${price} benötigt)`);
					return;
				}

				const result = helpersSystem.addCard(cardId);
				if (result.success) {
					state.coins -= price;
					const cardData = helpersSystem.getCardData(cardId);
					const label = result.isNew ? '✨ Neuer Helfer!' : '🌟 Duplikat!';
					showFeedback(true, `${label} ${cardData?.name || cardId} (-${price} Gold)`);
				} else {
					showFeedback(false, result.message);
				}
				render();
			});
		});
	}

	// ───────────────────────── FEEDBACK ─────────────────────────

	function showFeedback(success, message) {
		if (!container) return;
		const fb = container.querySelector('#helpers-feedback');
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
	}

	function hide() {
		if (container) container.style.display = 'none';
		visible = false;
		pendingSlot = null;
	}

	function toggle() {
		if (visible) hide();
		else show();
	}

	function isVisible() {
		return visible;
	}

	function update() {
		if (visible) render();
	}

	function destroy() {
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
