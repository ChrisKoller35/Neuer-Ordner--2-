// ============================================================
// MARKET UI - Marktplatz-Interface mit Daily Deals & Tabs
// ============================================================
// DOM-basiertes UI für den Marktplatz
// Tabs für Kategorien, Daily-Deal-Banner oben, Kauf-Flow
"use strict";

/**
 * Erstellt das Market-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.marketSystem
 * @returns {Object} UI-Controller
 */
export function createMarketUI(ctx) {
	const { canvas, state, marketSystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;
	let activeTab = 'daily'; // 'daily' | category key

	const ACCENT = '#3b82f6';
	const ACCENT_GLOW = 'rgba(59, 130, 246, 0.4)';
	const BG_DARK = '#1a1a2e';
	const BG_MID = '#16213e';

	/**
	 * Erstellt das UI-DOM-Element
	 */
	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'market-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, ${BG_DARK} 0%, ${BG_MID} 100%);
			border: 3px solid ${ACCENT};
			border-radius: 16px;
			padding: 24px;
			min-width: 520px;
			max-width: 600px;
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

	/**
	 * Generiert die Tab-Leiste
	 */
	function renderTabs() {
		const categories = marketSystem.getCategories();
		const tabs = [
			{ key: 'daily', label: '⭐ Tagesangebot' },
			...categories.map(c => ({ key: c.key, label: `${c.icon} ${c.label}` }))
		];

		return tabs.map(tab => {
			const isActive = activeTab === tab.key;
			return `<button class="market-tab" data-tab="${tab.key}" style="
				background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
				border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
				color: ${isActive ? '#fff' : '#aaa'};
				padding: 8px 14px;
				border-radius: 8px;
				cursor: pointer;
				font-size: 13px;
				font-weight: ${isActive ? 'bold' : 'normal'};
				transition: all 0.2s;
				white-space: nowrap;
			" onmouseenter="if(!this.classList.contains('active')){this.style.background='rgba(59,130,246,0.3)';this.style.color='#fff'}"
			   onmouseleave="if(!this.classList.contains('active')){this.style.background='${isActive ? ACCENT : 'rgba(255,255,255,0.08)'}';this.style.color='${isActive ? '#fff' : '#aaa'}'}"
			>${tab.label}</button>`;
		}).join('');
	}

	/**
	 * Rendert das Daily-Deal-Banner
	 */
	function renderDailyDeal() {
		const deal = marketSystem.getDailyDeal();
		if (!deal) {
			return `<div style="text-align:center;padding:30px;color:#666;">Heute kein Angebot verfügbar.</div>`;
		}

		const { item, originalPrice, dealPrice, discount } = deal;
		const check = marketSystem.canBuyItem(item.id, true);

		return `
			<div style="
				background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.1) 100%);
				border: 2px solid rgba(255,215,0,0.5);
				border-radius: 12px;
				padding: 20px;
				text-align: center;
				position: relative;
				overflow: hidden;
			">
				<!-- Discount Badge -->
				<div style="
					position: absolute;
					top: 12px;
					right: 12px;
					background: #e94560;
					color: white;
					padding: 4px 12px;
					border-radius: 20px;
					font-weight: bold;
					font-size: 14px;
				">-${discount}%</div>

				<div style="font-size: 14px; color: #ffd700; margin-bottom: 8px; font-weight: bold;">
					⭐ TAGESANGEBOT ⭐
				</div>
				<div style="font-size: 22px; font-weight: bold; margin-bottom: 8px;">
					${item.label}
				</div>
				<div style="font-size: 13px; color: #ccc; margin-bottom: 16px; max-width: 320px; margin-left: auto; margin-right: auto;">
					${item.description}
				</div>

				<!-- Preis -->
				<div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
					<span style="
						text-decoration: line-through;
						color: #888;
						font-size: 16px;
					">${marketSystem.formatGold(originalPrice)} Gold</span>
					<span style="
						color: #4ade80;
						font-size: 22px;
						font-weight: bold;
					">${marketSystem.formatGold(dealPrice)} Gold</span>
				</div>

				<!-- Kauf-Button -->
				${check.canBuy ? `
					<button class="market-buy-btn" data-item-id="${item.id}" data-daily="true" style="
						background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
						border: none;
						color: #1a1a2e;
						padding: 12px 32px;
						border-radius: 8px;
						cursor: pointer;
						font-weight: bold;
						font-size: 16px;
						transition: transform 0.1s, box-shadow 0.1s;
					" onmouseenter="this.style.transform='scale(1.05)';this.style.boxShadow='0 0 20px rgba(255,215,0,0.6)'"
					   onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='none'">
						🛒 Schnäppchen sichern!
					</button>
				` : `
					<div style="
						background: rgba(233,69,96,0.15);
						border: 1px solid #e94560;
						padding: 10px 24px;
						border-radius: 8px;
						color: #e94560;
						font-size: 14px;
					">${check.reason}</div>
				`}
			</div>

			<!-- Info -->
			<div style="
				text-align: center;
				margin-top: 12px;
				font-size: 12px;
				color: #666;
			">Das Angebot wechselt täglich um Mitternacht</div>
		`;
	}

	/**
	 * Rendert eine einzelne Item-Karte im Kategorie-Tab
	 */
	function renderItemCard(item) {
		const check = marketSystem.canBuyItem(item.id, false);

		// Effekt-Beschreibung formatieren
		let effectBadge = '';
		if (item.effect) {
			const t = item.effect.type;
			if (t === 'heal') effectBadge = '❤️ Heilung';
			else if (t === 'buff') effectBadge = '⬆️ Buff';
			else if (t === 'shield') effectBadge = '🛡️ Schutz';
			else if (t === 'trap') effectBadge = '💥 Falle';
			else if (t === 'vision') effectBadge = '👁️ Sicht';
			else if (t === 'skipFloor') effectBadge = '⏭️ Sprung';
			else if (t === 'revealExit') effectBadge = '🧭 Enthüllen';
			else if (t === 'expeditionBonus') effectBadge = '🎣 Expedition';
		}

		return `
			<div class="market-item-card" style="
				background: rgba(0,0,0,0.3);
				border: 1px solid rgba(255,255,255,0.1);
				border-radius: 10px;
				padding: 14px;
				margin-bottom: 10px;
				display: flex;
				align-items: center;
				gap: 14px;
				transition: border-color 0.2s, background 0.2s;
			" onmouseenter="this.style.borderColor='${ACCENT}';this.style.background='rgba(59,130,246,0.08)'"
			   onmouseleave="this.style.borderColor='rgba(255,255,255,0.1)';this.style.background='rgba(0,0,0,0.3)'">

				<!-- Info -->
				<div style="flex: 1; min-width: 0;">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
						<span style="font-size: 15px; font-weight: bold;">${item.label}</span>
						${effectBadge ? `<span style="
							background: rgba(255,255,255,0.1);
							padding: 2px 8px;
							border-radius: 4px;
							font-size: 11px;
							color: #aaa;
						">${effectBadge}</span>` : ''}
						${item.stackable ? `<span style="
							font-size: 10px;
							color: #666;
						">Max: ${item.maxStack}</span>` : ''}
					</div>
					<div style="font-size: 12px; color: #888; line-height: 1.4;">
						${item.description}
					</div>
				</div>

				<!-- Preis + Button -->
				<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;">
					<span style="font-weight: bold; color: #ffd700; font-size: 14px;">
						💰 ${marketSystem.formatGold(item.price)}
					</span>
					${check.canBuy ? `
						<button class="market-buy-btn" data-item-id="${item.id}" data-daily="false" style="
							background: linear-gradient(135deg, ${ACCENT} 0%, #2563eb 100%);
							border: none;
							color: white;
							padding: 6px 16px;
							border-radius: 6px;
							cursor: pointer;
							font-weight: bold;
							font-size: 13px;
							transition: transform 0.1s;
						" onmouseenter="this.style.transform='scale(1.05)'"
						   onmouseleave="this.style.transform='scale(1)'">
							Kaufen
						</button>
					` : `
						<span style="
							font-size: 11px;
							color: #e94560;
							text-align: right;
						">${check.reason}</span>
					`}
				</div>
			</div>
		`;
	}

	/**
	 * Rendert die Items einer Kategorie
	 */
	function renderCategory() {
		const categories = marketSystem.getCategories();
		const cat = categories.find(c => c.key === activeTab);
		if (!cat) return '<div style="text-align:center;padding:20px;color:#666;">Kategorie nicht gefunden.</div>';

		let html = `
			<div style="
				font-size: 18px;
				font-weight: bold;
				margin-bottom: 14px;
				color: ${ACCENT};
			">${cat.icon} ${cat.label}</div>
		`;

		if (cat.items.length === 0) {
			html += '<div style="text-align:center;padding:30px;color:#666;">Keine Waren verfügbar.</div>';
		} else {
			for (const item of cat.items) {
				html += renderItemCard(item);
			}
		}

		return html;
	}

	/**
	 * Rendert den gesamten Inhalt
	 */
	function render() {
		if (!container) createDOM();

		const coins = state.coins || 0;

		const html = `
			<!-- Header -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:${ACCENT};font-size:24px;">🏪 Marktplatz</h2>
				<button id="market-close" style="
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
				margin-bottom: 16px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			">
				<span style="color:#aaa;font-size:13px;">Durchstöbere das Sortiment des Marktplatzes!</span>
				<span style="font-weight:bold;font-size:15px;">💰 ${coins.toLocaleString('de-DE')} Gold</span>
			</div>

			<!-- Feedback-Bereich -->
			<div id="market-feedback" style="
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
			<div style="
				display: flex;
				gap: 6px;
				margin-bottom: 18px;
				flex-wrap: wrap;
			">
				${renderTabs()}
			</div>

			<!-- Content -->
			<div id="market-content">
				${activeTab === 'daily' ? renderDailyDeal() : renderCategory()}
			</div>
		`;

		container.innerHTML = html;

		// Event Listener anbinden
		bindEvents();
	}

	/**
	 * Bindet Events an die gerenderten Elemente
	 */
	function bindEvents() {
		// Close-Button
		const closeBtn = container.querySelector('#market-close');
		if (closeBtn) {
			closeBtn.addEventListener('click', hide);
		}

		// Tab-Buttons
		const tabBtns = container.querySelectorAll('.market-tab');
		tabBtns.forEach(btn => {
			btn.addEventListener('click', (e) => {
				activeTab = e.currentTarget.dataset.tab;
				render();
			});
		});

		// Kauf-Buttons
		const buyBtns = container.querySelectorAll('.market-buy-btn');
		buyBtns.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const itemId = e.currentTarget.dataset.itemId;
				const isDaily = e.currentTarget.dataset.daily === 'true';
				handleBuy(itemId, isDaily);
			});
		});
	}

	/**
	 * Verarbeitet einen Kauf
	 */
	function handleBuy(itemId, isDailyDeal) {
		const result = marketSystem.buyItem(itemId, isDailyDeal);
		showFeedback(result.success, result.message);
		render();
	}

	/**
	 * Zeigt Feedback nach einem Kauf
	 */
	function showFeedback(success, message) {
		if (!container) return;

		const fb = container.querySelector('#market-feedback');
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

	/**
	 * Zeigt das UI an
	 */
	function show(tab) {
		if (!container) createDOM();
		if (tab) activeTab = tab;
		render();
		container.style.display = 'block';
		visible = true;
	}

	/**
	 * Versteckt das UI
	 */
	function hide() {
		if (container) {
			container.style.display = 'none';
		}
		visible = false;
	}

	/**
	 * Toggle
	 */
	function toggle() {
		if (visible) hide();
		else show();
	}

	/**
	 * Sichtbarkeit prüfen
	 */
	function isVisible() {
		return visible;
	}

	/**
	 * Aktualisiert das UI falls offen
	 */
	function update() {
		if (visible) render();
	}

	/**
	 * Entfernt das UI aus dem DOM
	 */
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
