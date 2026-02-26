// ============================================================
// WORKSHOP UI - Schmied-Interface für Ausrüstungs-Verstärkung
// ============================================================
// DOM-basiertes UI für die Werkstatt
// Zeigt alle verstärkbaren Items mit Kosten und Effekten
"use strict";

/**
 * Erstellt das Workshop-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.workshopSystem
 * @returns {Object} UI-Controller
 */
export function createWorkshopUI(ctx) {
	const { canvas, state, workshopSystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;

	// Enhancement-Farben pro Level
	const LEVEL_COLORS = {
		0: '#666',
		1: '#8fbc8f',
		2: '#8fbc8f',
		3: '#cd7f32',
		4: '#cd7f32',
		5: '#c0c0c0',
		6: '#c0c0c0',
		7: '#ffd700',
		8: '#ffd700',
		9: '#b9f2ff',
		10: '#ff69b4'
	};

	const LEVEL_GLOW = {
		5: '0 0 8px rgba(192,192,192,0.5)',
		6: '0 0 8px rgba(192,192,192,0.5)',
		7: '0 0 12px rgba(255,215,0,0.5)',
		8: '0 0 12px rgba(255,215,0,0.5)',
		9: '0 0 16px rgba(185,242,255,0.6)',
		10: '0 0 20px rgba(255,105,180,0.7)'
	};

	/**
	 * Erstellt das UI-DOM
	 */
	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'workshop-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
			border: 3px solid #ff8c00;
			border-radius: 16px;
			padding: 24px;
			min-width: 480px;
			max-width: 560px;
			max-height: 85vh;
			overflow-y: auto;
			z-index: 10002;
			font-family: 'Segoe UI', Arial, sans-serif;
			color: #fff;
			box-shadow: 0 0 40px rgba(255, 140, 0, 0.4);
			display: none;
		`;

		document.body.appendChild(container);
	}

	/**
	 * Erstellt HTML für ein einzelnes Item
	 */
	function renderItemCard(item) {
		const level = item.currentLevel;
		const color = LEVEL_COLORS[level] || '#666';
		const glow = LEVEL_GLOW[level] || '';
		const enhName = workshopSystem.getEnhancementName(level);
		const isMaxed = item.isMaxed;
		const next = item.nextEnhancement;
		const check = workshopSystem.canEnhance(item.slotKey);

		// Basis-Stats
		const baseStats = item.itemData?.stats || {};
		const enhancedStats = workshopSystem.getEnhancedStats(item.slotKey, baseStats);

		// Stats-Darstellung
		let statsHtml = '';
		for (const [key, baseVal] of Object.entries(baseStats)) {
			if (typeof baseVal === 'boolean') {
				statsHtml += `<div style="font-size:12px;color:#aaa;">${formatStatName(key)}: Ja</div>`;
				continue;
			}
			const enhVal = enhancedStats[key];
			const isImproved = enhVal !== baseVal;
			if (typeof baseVal === 'number') {
				const displayBase = baseVal < 1 ? `${Math.round(baseVal * 100)}%` : baseVal;
				const displayEnh = enhVal < 1 ? `${Math.round(enhVal * 100)}%` : enhVal;
				statsHtml += `<div style="font-size:12px;color:#aaa;">
					${formatStatName(key)}: ${displayBase}${isImproved ? ` → <span style="color:#4ade80;">${displayEnh}</span>` : ''}
				</div>`;
			}
		}

		// Next-Level-Vorschau
		let nextPreviewHtml = '';
		if (next && !isMaxed) {
			const nextStats = workshopSystem.getEnhancedStats(item.slotKey, baseStats);
			// Berechne was die Stats bei +1 wären
			const nextLevelData = workshopSystem.getWorkshopData().enhancementLevels.find(e => e.level === next.level);
			if (nextLevelData) {
				const previewParts = [];
				for (const [key, baseVal] of Object.entries(baseStats)) {
					if (typeof baseVal !== 'number') continue;
					const futureVal = Math.round(baseVal * nextLevelData.statMultiplier * 100) / 100;
					const display = futureVal < 1 ? `${Math.round(futureVal * 100)}%` : futureVal;
					previewParts.push(`${formatStatName(key)}: ${display}`);
				}
				if (previewParts.length) {
					nextPreviewHtml = `<div style="font-size:11px;color:#888;margin-top:4px;">
						Nach Verstärkung: ${previewParts.join(', ')}
					</div>`;
				}
			}
		}

		// Button
		let buttonHtml = '';
		if (isMaxed) {
			buttonHtml = `<div style="
				background: linear-gradient(135deg, #ff69b4, #ff1493);
				padding: 8px 16px;
				border-radius: 6px;
				font-weight: bold;
				text-align: center;
				font-size: 14px;
			">✨ MAXIMAL ✨</div>`;
		} else if (check.canEnhance) {
			buttonHtml = `<button class="workshop-enhance-btn" data-slot="${item.slotKey}" style="
				background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
				border: none;
				color: #fff;
				padding: 10px 20px;
				border-radius: 8px;
				cursor: pointer;
				font-weight: bold;
				font-size: 14px;
				width: 100%;
				transition: transform 0.1s, box-shadow 0.1s;
			" onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 0 15px rgba(255,140,0,0.6)'"
			   onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='none'">
				🔨 Verstärken — ${workshopSystem.formatGold(next.goldCost)} Gold
			</button>`;
		} else {
			buttonHtml = `<div style="
				background: rgba(255,0,0,0.15);
				border: 1px solid #e94560;
				padding: 8px 16px;
				border-radius: 6px;
				text-align: center;
				font-size: 13px;
				color: #e94560;
			">${check.reason}</div>`;
		}

		return `
			<div class="workshop-item-card" style="
				background: rgba(0,0,0,0.3);
				border: 2px solid ${color};
				border-radius: 12px;
				padding: 16px;
				margin-bottom: 12px;
				${glow ? `box-shadow: ${glow};` : ''}
				transition: border-color 0.3s;
			">
				<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
					<div style="flex:1;">
						<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
							<span style="font-size:18px;font-weight:bold;">
								${item.itemData?.label || item.itemName}
							</span>
							${level > 0 ? `<span style="
								background: ${color};
								color: #1a1a2e;
								padding: 2px 8px;
								border-radius: 4px;
								font-weight: bold;
								font-size: 13px;
							">+${level}</span>` : ''}
							${enhName ? `<span style="color:${color};font-size:12px;font-style:italic;">${enhName}</span>` : ''}
						</div>
						<div style="font-size:12px;color:#888;">${item.slotLabel} · ${item.itemData?.type === 'weapon' ? '⚔️ Waffe' : '🛡️ Rüstung'}</div>
						<div style="font-size:12px;color:#aaa;margin-top:4px;">${item.itemData?.effect || ''}</div>
					</div>
					<div style="
						width: 48px;
						height: 48px;
						border-radius: 8px;
						background: rgba(255,140,0,0.15);
						border: 1px solid ${color};
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 24px;
						flex-shrink: 0;
					">${item.itemData?.type === 'weapon' ? '⚔️' : '🛡️'}</div>
				</div>

				<!-- Stats -->
				<div style="
					background: rgba(255,255,255,0.05);
					padding: 8px 12px;
					border-radius: 6px;
					margin-bottom: 10px;
				">
					${statsHtml || '<div style="font-size:12px;color:#666;">Keine Stats</div>'}
					${nextPreviewHtml}
				</div>

				<!-- Enhancement-Bar -->
				<div style="
					display: flex;
					gap: 3px;
					margin-bottom: 12px;
				">
					${Array.from({ length: 10 }, (_, i) => `
						<div style="
							flex: 1;
							height: 6px;
							border-radius: 3px;
							background: ${i < level ? color : 'rgba(255,255,255,0.1)'};
							transition: background 0.3s;
						"></div>
					`).join('')}
				</div>

				<!-- Button -->
				${buttonHtml}
			</div>
		`;
	}

	/**
	 * Rendert den gesamten UI-Inhalt
	 */
	function render() {
		if (!container) createDOM();

		const items = workshopSystem.getEnhanceableItems();
		const coins = state.coins || 0;

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
				<h2 style="margin:0;color:#ff8c00;font-size:24px;">🔨 Werkstatt</h2>
				<button id="workshop-close" style="
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

			<div style="
				background: rgba(255,255,255,0.1);
				padding: 12px 16px;
				border-radius: 8px;
				margin-bottom: 20px;
				display: flex;
				justify-content: space-between;
				align-items: center;
			">
				<span style="color:#aaa;">Verstärke deine Ausrüstung beim Schmied!</span>
				<span style="font-weight:bold;">💰 ${coins.toLocaleString('de-DE')} Gold</span>
			</div>

			<!-- Feedback-Bereich -->
			<div id="workshop-feedback" style="
				display: none;
				padding: 12px;
				border-radius: 8px;
				margin-bottom: 16px;
				text-align: center;
				font-weight: bold;
				font-size: 15px;
				transition: opacity 0.3s;
			"></div>
		`;

		if (items.length === 0) {
			html += `
				<div style="
					text-align: center;
					padding: 40px 20px;
					color: #666;
				">
					<div style="font-size: 48px; margin-bottom: 16px;">⚒️</div>
					<div style="font-size: 16px; margin-bottom: 8px;">Keine Ausrüstung zum Verstärken</div>
					<div style="font-size: 13px;">Kauf zuerst Waffen oder Rüstungen beim Händler in der Stadt!</div>
				</div>
			`;
		} else {
			for (const item of items) {
				html += renderItemCard(item);
			}
		}

		// Info-Box
		html += `
			<div style="
				background: rgba(255,140,0,0.1);
				border: 1px solid rgba(255,140,0,0.3);
				border-radius: 8px;
				padding: 12px;
				margin-top: 8px;
			">
				<div style="font-size:12px;color:#ff8c00;font-weight:bold;margin-bottom:6px;">ℹ️ Wie funktioniert's?</div>
				<div style="font-size:11px;color:#888;line-height:1.5;">
					• Jedes Ausrüstungsteil kann bis +10 verstärkt werden<br>
					• Höhere Stufen verbessern die Stats des Items<br>
					• Keine Zerstörung — Verstärkung gelingt immer!<br>
					• Ab +5 beginnt deine Ausrüstung zu leuchten ✨
				</div>
			</div>
		`;

		container.innerHTML = html;

		// Event Listener
		const closeBtn = container.querySelector('#workshop-close');
		if (closeBtn) {
			closeBtn.addEventListener('click', hide);
		}

		const enhanceBtns = container.querySelectorAll('.workshop-enhance-btn');
		enhanceBtns.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const slotKey = e.currentTarget.dataset.slot;
				handleEnhance(slotKey);
			});
		});
	}

	/**
	 * Behandelt einen Verstärkungs-Klick
	 */
	function handleEnhance(slotKey) {
		const result = workshopSystem.enhance(slotKey);

		showFeedback(result.success, result.message, result.newLevel);

		// UI neu rendern
		render();
	}

	/**
	 * Zeigt Feedback nach einer Verstärkung
	 */
	function showFeedback(success, message, level) {
		if (!container) return;

		const fb = container.querySelector('#workshop-feedback');
		if (!fb) return;

		if (feedbackTimeout) clearTimeout(feedbackTimeout);

		fb.style.display = 'block';
		fb.style.opacity = '1';

		if (success) {
			const color = LEVEL_COLORS[level] || '#4ade80';
			fb.style.background = `rgba(74, 222, 128, 0.15)`;
			fb.style.border = `1px solid ${color}`;
			fb.style.color = color;
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
	 * Formatiert einen Stat-Namen hübsch
	 */
	function formatStatName(key) {
		const names = {
			damage: 'Schaden',
			blockChance: 'Blockchance',
			explosionRadius: 'Explosionsradius',
			speedBonus: 'Geschwindigkeit',
			agilityBonus: 'Agilität',
			hitAbsorb: 'Treffer absorbiert',
			visionRadius: 'Sichtweite',
			coinBonus: 'Münzbonus',
			range: 'Reichweite',
			piercing: 'Durchschlag',
			damageReduction: 'Schadensreduktion',
			healthRegen: 'HP-Regeneration',
			energyBonus: 'Energiebonus'
		};
		return names[key] || key;
	}

	/**
	 * Zeigt das UI an
	 */
	function show() {
		if (!container) createDOM();
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
	 * Toggle Sichtbarkeit
	 */
	function toggle() {
		if (visible) hide();
		else show();
	}

	/**
	 * Gibt zurück ob UI sichtbar ist
	 */
	function isVisible() {
		return visible;
	}

	/**
	 * Aktualisiert das UI
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
