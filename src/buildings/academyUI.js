// ============================================================
// ACADEMY UI - Skill-Builder Interface mit Tabs
// ============================================================
// Tabs: Zauber (Basis-Spells), Modifikatoren, Build-Preview, Community
// Drag & Drop Modifikatoren auf Skill-Slots
"use strict";

/**
 * Erstellt das Academy-UI
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {Object} ctx.state
 * @param {Object} ctx.academySystem
 * @returns {Object} UI-Controller
 */
export function createAcademyUI(ctx) {
	const { canvas, state, academySystem } = ctx;

	let container = null;
	let visible = false;
	let feedbackTimeout = null;
	let activeTab = 'spells'; // 'spells' | 'mods' | 'build' | 'community'

	const ACCENT = '#a855f7';
	const ACCENT_GLOW = 'rgba(168, 85, 247, 0.4)';

	const ELEMENT_COLORS = {
		fire: '#ef4444',
		ice: '#60a5fa',
		lightning: '#fbbf24',
		shadow: '#8b5cf6',
		poison: '#22c55e',
		holy: '#f9fafb'
	};

	// ───────────────────────── DOM ─────────────────────────

	function createDOM() {
		if (container) return;

		container = document.createElement('div');
		container.id = 'academy-ui';
		container.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: linear-gradient(135deg, #1a102e 0%, #1e1040 100%);
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
			{ key: 'spells', label: '🔮 Zauber' },
			{ key: 'mods', label: '⚙️ Modifikatoren' },
			{ key: 'build', label: '🎯 Build' },
			{ key: 'community', label: '💡 Community' }
		];
		return tabs.map(t => {
			const isActive = activeTab === t.key;
			return `<button class="academy-tab" data-tab="${t.key}" style="
				background: ${isActive ? ACCENT : 'rgba(255,255,255,0.08)'};
				border: 1px solid ${isActive ? ACCENT : 'rgba(255,255,255,0.15)'};
				color: ${isActive ? '#fff' : '#aaa'};
				padding: 8px 14px;
				border-radius: 8px;
				cursor: pointer;
				font-size: 13px;
				font-weight: ${isActive ? 'bold' : 'normal'};
				transition: all 0.2s;
			">${t.label}</button>`;
		}).join('');
	}

	// ───────────────────────── ZAUBER-TAB ─────────────────────────

	function renderSpellsTab() {
		const spells = academySystem.getAllSpells();
		const upgradeInfo = academySystem.getUpgradeInfo();
		const coins = state.coins || 0;

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				🔮 Basis-Zauber (Stufe ${state.academy.level})
			</div>
		`;

		for (const spell of spells) {
			const eColor = ELEMENT_COLORS[spell.element] || '#888';
			const isEquipped = spell.equipped;
			const isUnlocked = spell.unlocked;

			html += `
				<div style="
					background: ${isEquipped ? `${ACCENT}15` : 'rgba(0,0,0,0.3)'};
					border: 2px solid ${isEquipped ? ACCENT : isUnlocked ? `${eColor}60` : 'rgba(255,255,255,0.1)'};
					border-radius: 10px;
					padding: 14px;
					margin-bottom: 8px;
					${isEquipped ? `box-shadow: 0 0 12px ${ACCENT}40;` : ''}
					transition: border-color 0.2s;
				">
					<div style="display:flex;align-items:center;gap:10px;">
						<span style="font-size:28px;${!isUnlocked ? 'filter:grayscale(1);opacity:0.5;' : ''}">${spell.icon}</span>
						<div style="flex:1;">
							<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
								<span style="font-weight:bold;${!isUnlocked ? 'color:#666;' : ''}">${spell.name}</span>
								<span style="
									background: ${eColor}30;
									color: ${eColor};
									padding: 1px 8px;
									border-radius: 4px;
									font-size: 10px;
								">${spell.element}</span>
								${isEquipped ? `<span style="background:${ACCENT};color:white;padding:1px 8px;border-radius:4px;font-size:10px;">Ausgerüstet</span>` : ''}
							</div>
							<div style="font-size:12px;color:#aaa;">${spell.description}</div>
							<div style="font-size:10px;color:#888;margin-top:2px;">
								💥 ${spell.baseDamage} DMG · ⏱ ${(spell.cooldown / 1000).toFixed(1)}s CD · 🎯 Speed ${spell.projectileSpeed}
							</div>
						</div>

						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
							${isUnlocked ? (isEquipped
								? `<span style="font-size:11px;color:${ACCENT};">✔ Aktiv</span>`
								: `<button class="academy-equip-spell" data-spell="${spell.id}" style="
									background: linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%);
									border: none; color: white; padding: 5px 12px;
									border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;
								">Ausrüsten</button>`
							) : (spell.canUnlock
								? (coins >= spell.cost
									? `<button class="academy-unlock-spell" data-spell="${spell.id}" style="
										background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
										border: none; color: #1a1a2e; padding: 5px 12px;
										border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;
									">🔓 ${spell.cost} G</button>`
									: `<span style="font-size:11px;color:#e94560;">${spell.cost} G nötig</span>`
								)
								: `<span style="font-size:11px;color:#666;">Stufe ${spell.unlockLevel}</span>`
							)}
						</div>
					</div>
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── MODS-TAB ─────────────────────────

	function renderModsTab() {
		const mods = academySystem.getAllModifiers();
		const maxSlots = academySystem.getMaxModSlots();
		const activeCount = state.academy.activeMods.length;
		const coins = state.coins || 0;

		let html = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
				<div style="font-size:16px;font-weight:bold;color:${ACCENT};">
					⚙️ Modifikatoren
				</div>
				<div style="font-size:13px;color:#aaa;">Slots: ${activeCount}/${maxSlots}</div>
			</div>
		`;

		for (const mod of mods) {
			const isEquipped = mod.equipped;
			const isUnlocked = mod.unlocked;

			html += `
				<div style="
					background: ${isEquipped ? `${ACCENT}15` : 'rgba(0,0,0,0.3)'};
					border: 2px solid ${isEquipped ? ACCENT : isUnlocked ? `${ACCENT}40` : 'rgba(255,255,255,0.1)'};
					border-radius: 10px;
					padding: 12px;
					margin-bottom: 8px;
					transition: border-color 0.2s;
				">
					<div style="display:flex;align-items:center;gap:10px;">
						<span style="font-size:22px;${!isUnlocked ? 'filter:grayscale(1);opacity:0.5;' : ''}">${mod.icon}</span>
						<div style="flex:1;">
							<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
								<span style="font-weight:bold;font-size:13px;${!isUnlocked ? 'color:#666;' : ''}">${mod.name}</span>
								${isEquipped ? `<span style="background:${ACCENT};color:white;padding:1px 6px;border-radius:4px;font-size:10px;">Aktiv</span>` : ''}
							</div>
							<div style="font-size:11px;color:#aaa;">${mod.description}</div>
						</div>

						<div>
							${isUnlocked ? (isEquipped
								? `<button class="academy-toggle-mod" data-mod="${mod.id}" style="
									background: rgba(233,69,96,0.2);
									border: 1px solid #e94560;
									color: #e94560;
									padding: 5px 10px;
									border-radius: 6px;
									cursor: pointer;
									font-size: 11px;
								">Ablegen</button>`
								: `<button class="academy-toggle-mod" data-mod="${mod.id}" style="
									background: linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%);
									border: none; color: white; padding: 5px 10px;
									border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;
								">Anlegen</button>`
							) : (mod.canUnlock
								? (coins >= mod.cost
									? `<button class="academy-unlock-mod" data-mod="${mod.id}" style="
										background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
										border: none; color: #1a1a2e; padding: 5px 10px;
										border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 11px;
									">🔓 ${mod.cost} G</button>`
									: `<span style="font-size:10px;color:#e94560;">${mod.cost} G</span>`
								)
								: `<span style="font-size:10px;color:#666;">Stufe ${mod.unlockLevel}</span>`
							)}
						</div>
					</div>
				</div>
			`;
		}

		return html;
	}

	// ───────────────────────── BUILD-TAB ─────────────────────────

	function renderBuildTab() {
		const build = academySystem.getActiveBuild();
		const maxSlots = academySystem.getMaxModSlots();
		const upgradeInfo = academySystem.getUpgradeInfo();
		const skillUnlocks = academySystem.getSkillUnlocks ? academySystem.getSkillUnlocks() : [];

		if (!build) {
			return `<div style="text-align:center;padding:30px;color:#666;">Kein Zauber ausgerüstet.</div>`;
		}

		const eColor = ELEMENT_COLORS[build.spell.element] || '#888';

		let html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				🎯 Aktiver Build
			</div>

			<!-- Basis-Zauber -->
			<div style="
				background: ${eColor}15;
				border: 2px solid ${eColor};
				border-radius: 12px;
				padding: 16px;
				margin-bottom: 16px;
				text-align: center;
			">
				<div style="font-size:40px;margin-bottom:6px;">${build.spell.icon}</div>
				<div style="font-size:18px;font-weight:bold;">${build.spell.name}</div>
				<div style="font-size:12px;color:#aaa;margin-top:4px;">${build.spell.description}</div>
			</div>

			<!-- Mod-Slots Visualisierung -->
			<div style="display:flex;gap:8px;margin-bottom:16px;justify-content:center;">
		`;

		for (let i = 0; i < maxSlots; i++) {
			const mod = build.mods[i];
			if (mod) {
				html += `
					<div style="
						background: ${ACCENT}20;
						border: 2px solid ${ACCENT};
						border-radius: 10px;
						padding: 12px;
						text-align: center;
						min-width: 100px;
						box-shadow: 0 0 8px ${ACCENT}40;
					">
						<div style="font-size:22px;margin-bottom:4px;">${mod.icon}</div>
						<div style="font-size:11px;font-weight:bold;">${mod.name}</div>
					</div>
				`;
			} else {
				html += `
					<div style="
						background: rgba(255,255,255,0.04);
						border: 2px dashed rgba(255,255,255,0.15);
						border-radius: 10px;
						padding: 12px;
						text-align: center;
						min-width: 100px;
					">
						<div style="font-size:22px;margin-bottom:4px;opacity:0.3;">⬜</div>
						<div style="font-size:11px;color:#555;">Leer</div>
					</div>
				`;
			}
		}

		html += `</div>`;

		// Berechnete Stats
		const c = build.computed;
		html += `
			<div style="
				background: rgba(0,0,0,0.3);
				border-radius: 10px;
				padding: 14px;
				margin-bottom: 14px;
			">
				<div style="font-size:13px;font-weight:bold;color:#ccc;margin-bottom:10px;">📊 Berechnete Werte</div>
				<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
					<div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:4px;">
						<span style="color:#aaa;font-size:12px;">💥 Schaden</span>
						<span style="font-weight:bold;color:#ef4444;font-size:12px;">${c.damage}</span>
					</div>
					<div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:4px;">
						<span style="color:#aaa;font-size:12px;">⏱ Cooldown</span>
						<span style="font-weight:bold;color:#60a5fa;font-size:12px;">${(c.cooldown / 1000).toFixed(1)}s</span>
					</div>
					<div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:4px;">
						<span style="color:#aaa;font-size:12px;">🎯 Speed</span>
						<span style="font-weight:bold;color:#fbbf24;font-size:12px;">${c.speed}</span>
					</div>
					<div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:4px;">
						<span style="color:#aaa;font-size:12px;">🫧 Größe</span>
						<span style="font-weight:bold;color:#a855f7;font-size:12px;">${c.size}px</span>
					</div>
				</div>

				${c.effects.length > 0 ? `
					<div style="margin-top:10px;">
						<div style="font-size:12px;color:#ccc;margin-bottom:6px;">✨ Spezial-Effekte:</div>
						${c.effects.map(e => `
							<div style="font-size:11px;color:#aaa;padding:2px 0;">
								• ${formatEffect(e)}
							</div>
						`).join('')}
					</div>
				` : ''}
			</div>
		`;

		// Akademie-Upgrade
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
				">
					<div>
						<div style="font-size:13px;font-weight:bold;">⬆️ ${upgradeInfo.label}</div>
						<div style="font-size:11px;color:#aaa;">${upgradeInfo.modSlots} Mod-Slots freischalten</div>
					</div>
					${canAfford ? `
						<button class="academy-upgrade-building" style="
							background: linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%);
							border: none; color: white; padding: 8px 18px;
							border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;
						">${upgradeInfo.cost} Gold</button>
					` : `
						<span style="color:#e94560;font-size:12px;">${upgradeInfo.cost} Gold nötig</span>
					`}
				</div>
			`;
		}

		if (skillUnlocks.length > 0) {
			html += `
				<div style="font-size:13px;font-weight:bold;color:#ccc;margin-top:14px;margin-bottom:8px;">🔓 Fähigkeits-Freischaltungen</div>
			`;
			for (const skill of skillUnlocks) {
				const canAfford = (state.coins || 0) >= skill.cost;
				html += `
					<div style="
						background: rgba(255,255,255,0.05);
						border: 1px solid ${ACCENT}40;
						border-radius: 8px;
						padding: 10px 12px;
						margin-bottom: 8px;
						display:flex;
						justify-content:space-between;
						align-items:center;
						gap:10px;
					">
						<div>
							<div style="font-size:13px;font-weight:bold;">${skill.label}</div>
							<div style="font-size:11px;color:#aaa;">${skill.description}</div>
						</div>
						${skill.unlocked
							? `<span style="color:#4ade80;font-size:12px;font-weight:bold;">Freigeschaltet</span>`
							: (canAfford
								? `<button class="academy-unlock-skill" data-skill="${skill.id}" style="
									background: linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%);
									border: none; color: white; padding: 7px 12px;
									border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;
								">${skill.cost} Gold</button>`
								: `<span style="color:#e94560;font-size:11px;">${skill.cost} Gold nötig</span>`)}
					</div>
				`;
			}

			html += `
				<div style="font-size:11px;color:#888;line-height:1.45;background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;">
					Strömungs-Dash wird automatisch ab Talent-Level 3 freigeschaltet.<br>
					Lebensraub-Aura wird automatisch bei Dungeon-Tiefe 20 freigeschaltet.
				</div>
			`;
		}

		return html;
	}

	function formatEffect(effect) {
		switch (effect.type) {
			case 'multishot': return `Mehrfachschuss: ${effect.count} Projektile (±${effect.spreadAngle}°)`;
			case 'slow': return `Verlangsamung: ${(effect.duration / 1000).toFixed(1)}s (${Math.round(effect.factor * 100)}%)`;
			case 'pierce': return `Durchschlag: bis zu ${effect.maxTargets} Gegner`;
			case 'chain': return `Kettenschlag: ${effect.bounces} Sprünge`;
			case 'homing': return `Zielsuchend: Projektile verfolgen Gegner`;
			case 'explodeOnKill': return `Explosionstod: ${Math.round(effect.damagePct * 100)}% AoE (${effect.radius}px)`;
			default: return JSON.stringify(effect);
		}
	}

	// ───────────────────────── COMMUNITY-TAB ─────────────────────────

	function renderCommunityTab() {
		const submissions = state.academy.submissions || [];

		const html = `
			<div style="font-size:16px;font-weight:bold;color:${ACCENT};margin-bottom:14px;">
				💡 Skill-Idee einreichen
			</div>

			<div style="
				background: rgba(0,0,0,0.3);
				border: 1px solid ${ACCENT}40;
				border-radius: 10px;
				padding: 16px;
				margin-bottom: 16px;
			">
				<div style="margin-bottom:10px;">
					<label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Skill-Name</label>
					<input id="academy-submit-name" type="text" maxlength="40" placeholder="z.B. Magma-Eruption"
						style="
							width: 100%;
							background: rgba(255,255,255,0.08);
							border: 1px solid rgba(255,255,255,0.2);
							border-radius: 6px;
							padding: 8px 12px;
							color: white;
							font-size: 13px;
							box-sizing: border-box;
						">
				</div>
				<div style="margin-bottom:10px;">
					<label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">
						Beschreibung <span id="academy-char-count" style="color:#666;">(0/280)</span>
					</label>
					<textarea id="academy-submit-desc" maxlength="280" rows="3"
						placeholder="Beschreibe deinen Skill-Vorschlag..."
						style="
							width: 100%;
							background: rgba(255,255,255,0.08);
							border: 1px solid rgba(255,255,255,0.2);
							border-radius: 6px;
							padding: 8px 12px;
							color: white;
							font-size: 13px;
							resize: vertical;
							box-sizing: border-box;
						"></textarea>
				</div>
				<button id="academy-submit-btn" style="
					background: linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%);
					border: none;
					color: white;
					padding: 8px 20px;
					border-radius: 6px;
					cursor: pointer;
					font-weight: bold;
					font-size: 13px;
					width: 100%;
				">📨 Einreichen</button>
			</div>

			<!-- Bisherige Einreichungen -->
			${submissions.length > 0 ? `
				<div style="font-size:13px;font-weight:bold;color:#ccc;margin-bottom:8px;">
					📋 Deine Einreichungen (${submissions.length})
				</div>
				${submissions.slice(-5).reverse().map(s => `
					<div style="
						background: rgba(255,255,255,0.04);
						border-radius: 6px;
						padding: 8px 12px;
						margin-bottom: 4px;
					">
						<div style="font-weight:bold;font-size:12px;">${s.name}</div>
						<div style="font-size:11px;color:#888;">${s.description}</div>
						<div style="font-size:10px;color:#555;margin-top:2px;">${new Date(s.submittedAt).toLocaleString('de-DE')}</div>
					</div>
				`).join('')}
			` : ''}

			<div style="
				background: rgba(168,85,247,0.1);
				border: 1px solid ${ACCENT}40;
				border-radius: 8px;
				padding: 10px;
				margin-top: 12px;
				font-size: 11px;
				color: #888;
				line-height: 1.5;
			">
				💡 Eingereichte Skills werden vom Entwickler geprüft.<br>
				Genehmigte Ideas kommen per Update ins Spiel!
			</div>
		`;

		return html;
	}

	// ───────────────────────── RENDER ─────────────────────────

	function render() {
		if (!container) createDOM();

		const coins = state.coins || 0;

		const html = `
			<!-- Header -->
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:${ACCENT};font-size:24px;">🏛️ Akademie</h2>
				<button id="academy-close" style="
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
				<span style="color:#aaa;font-size:13px;">Kombiniere Zauber und Modifikatoren!</span>
				<span style="font-weight:bold;font-size:15px;">💰 ${coins.toLocaleString('de-DE')} Gold</span>
			</div>

			<!-- Feedback -->
			<div id="academy-feedback" style="
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
			<div id="academy-content">
				${activeTab === 'spells' ? renderSpellsTab() : ''}
				${activeTab === 'mods' ? renderModsTab() : ''}
				${activeTab === 'build' ? renderBuildTab() : ''}
				${activeTab === 'community' ? renderCommunityTab() : ''}
			</div>
		`;

		container.innerHTML = html;
		bindEvents();
	}

	// ───────────────────────── EVENTS ─────────────────────────

	function bindEvents() {
		// Close
		const closeBtn = container.querySelector('#academy-close');
		if (closeBtn) closeBtn.addEventListener('click', hide);

		// Tabs
		container.querySelectorAll('.academy-tab').forEach(btn => {
			btn.addEventListener('click', e => {
				activeTab = e.currentTarget.dataset.tab;
				render();
			});
		});

		// Spell ausrüsten
		container.querySelectorAll('.academy-equip-spell').forEach(btn => {
			btn.addEventListener('click', e => {
				const spellId = e.currentTarget.dataset.spell;
				const result = academySystem.equipSpell(spellId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Spell freischalten
		container.querySelectorAll('.academy-unlock-spell').forEach(btn => {
			btn.addEventListener('click', e => {
				const spellId = e.currentTarget.dataset.spell;
				const result = academySystem.unlockSpell(spellId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Mod an/ablegen
		container.querySelectorAll('.academy-toggle-mod').forEach(btn => {
			btn.addEventListener('click', e => {
				const modId = e.currentTarget.dataset.mod;
				const result = academySystem.toggleModifier(modId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Mod freischalten
		container.querySelectorAll('.academy-unlock-mod').forEach(btn => {
			btn.addEventListener('click', e => {
				const modId = e.currentTarget.dataset.mod;
				const result = academySystem.unlockModifier(modId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Akademie upgraden
		const upgBtn = container.querySelector('.academy-upgrade-building');
		if (upgBtn) {
			upgBtn.addEventListener('click', () => {
				const result = academySystem.upgradeAcademy();
				showFeedback(result.success, result.message);
				render();
			});
		}

		// Skills freischalten
		container.querySelectorAll('.academy-unlock-skill').forEach(btn => {
			btn.addEventListener('click', e => {
				const skillId = e.currentTarget.dataset.skill;
				const result = academySystem.unlockSkill(skillId);
				showFeedback(result.success, result.message);
				render();
			});
		});

		// Community-Submit
		const submitBtn = container.querySelector('#academy-submit-btn');
		if (submitBtn) {
			submitBtn.addEventListener('click', () => {
				const nameInput = container.querySelector('#academy-submit-name');
				const descInput = container.querySelector('#academy-submit-desc');
				if (nameInput && descInput) {
					const result = academySystem.submitSkillIdea(nameInput.value, descInput.value);
					showFeedback(result.success, result.message);
					if (result.success) {
						nameInput.value = '';
						descInput.value = '';
					}
					render();
				}
			});
		}

		// Char counter
		const descInput = container.querySelector('#academy-submit-desc');
		const charCount = container.querySelector('#academy-char-count');
		if (descInput && charCount) {
			descInput.addEventListener('input', () => {
				charCount.textContent = `(${descInput.value.length}/280)`;
			});
		}
	}

	// ───────────────────────── FEEDBACK ─────────────────────────

	function showFeedback(success, message) {
		if (!container) return;
		const fb = container.querySelector('#academy-feedback');
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
