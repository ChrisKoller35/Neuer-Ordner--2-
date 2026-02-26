import { ManifestAssets, resolveBundledAssetUrl } from '../core/assets.js';

/**
 * HUD Update System
 * Aktualisiert alle HUD-Elemente (Score, Leben, Schild, Symbole, Progression)
 */

/**
 * Erstellt das HUD-Update-System
 * @param {Object} ctx - Context mit Dependencies
 * @param {Function} ctx.getState - Gibt den Game-State zurück
 * @param {Function} ctx.getHUD - Gibt die HUD-DOM-Elemente zurück
 * @param {Function} ctx.getBannerEl - Gibt das Banner-Element zurück
 * @param {Function} ctx.getInventory - Gibt das Stadt-Inventar zurück
 * @param {string} ctx.armorItemName - Name des Rüstungs-Items
 * @param {Object} ctx.SYMBOL_DATA - Symbol-Definitionen
 * @param {Object} ctx.progressionSystem - Progressions-System
 */
export function createHUDSystem(ctx) {
	const {
		getState,
		getHUD,
		getBannerEl,
		getInventory,
		armorItemName,
		SYMBOL_DATA,
		progressionSystem
	} = ctx;

	const clamp01 = value => Math.max(0, Math.min(1, value));
	let abilitySpriteIndex = null;

	function pickAbilitySpriteEntry(tokens) {
		const entries = ManifestAssets.getGeneratedSprites()
			.filter(entry => entry && entry.category === 'ability')
			.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

		for (const entry of entries) {
			const haystack = `${entry.key || ''} ${entry.id || ''} ${entry.prompt || ''}`.toLowerCase();
			if (tokens.every(token => haystack.includes(token))) {
				return entry;
			}
		}

		return null;
	}

	function getAbilitySpriteIndex() {
		if (abilitySpriteIndex) return abilitySpriteIndex;
		abilitySpriteIndex = {
			dash: pickAbilitySpriteEntry(['dash']),
			mine: pickAbilitySpriteEntry(['mine']),
			timeBubble: pickAbilitySpriteEntry(['time', 'bubble']),
			leech: pickAbilitySpriteEntry(['leech'])
		};
		return abilitySpriteIndex;
	}

	function toSpriteUrl(entry) {
		if (!entry?.path) return '';
		// Über Vite-Bundled-Lookup auflösen (funktioniert in Dev und Produktion)
		const bundled = resolveBundledAssetUrl(entry.path);
		if (bundled) return bundled;
		// Fallback für Dev-Server
		if (typeof document === 'undefined') return `./src/${entry.path}`;
		return new URL(`./src/${entry.path}`, document.baseURI).href;
	}

	function applyAbilityIcon(el, fallbackIcon, spriteEntry) {
		if (!el) return;
		const spriteUrl = toSpriteUrl(spriteEntry);
		if (spriteUrl) {
			el.dataset.useSprite = '1';
			el.textContent = '';
			el.style.backgroundImage = `url("${spriteUrl}")`;
			el.style.backgroundSize = 'contain';
			el.style.backgroundPosition = 'center';
			el.style.backgroundRepeat = 'no-repeat';
			el.style.fontSize = '0';
			return;
		}

		el.dataset.useSprite = '';
		el.textContent = fallbackIcon;
		el.style.backgroundImage = '';
		el.style.backgroundSize = '';
		el.style.backgroundPosition = '';
		el.style.backgroundRepeat = '';
		el.style.fontSize = '';
	}

	function buildAbilityTitle({ name, description, unlockHint, unlocked, active, cooldownMs, hotkey }) {
		const lines = [
			`${name}${hotkey ? ` (${hotkey})` : ''}`,
			description
		];

		if (!unlocked) {
			lines.push(`Status: Gesperrt – ${unlockHint || 'Noch nicht freigeschaltet'}`);
			return lines.join('\n');
		}

		if (active) {
			lines.push('Status: Aktiv');
			return lines.join('\n');
		}

		const remaining = Math.max(0, cooldownMs || 0);
		if (remaining > 0) {
			lines.push(`Status: Cooldown (${Math.ceil(remaining / 1000)}s)`);
		} else {
			lines.push('Status: Bereit');
		}

		return lines.join('\n');
	}

	function setAbilityCooldownVisual(el, { locked, active, ready, cooldownMs, cooldownMaxMs, icon, title }) {
		if (!el) return;
		const remaining = Math.max(0, cooldownMs || 0);
		const max = Math.max(1, cooldownMaxMs || 1);
		const ratio = clamp01(remaining / max);
		el.classList.toggle("locked", !!locked);
		el.classList.toggle("active", !!active);
		el.classList.toggle("ready", !!ready);
		el.classList.toggle("cooldown", !locked && !active && !ready && remaining > 0);
		el.style.setProperty("--cooldown-angle", `${Math.round(ratio * 360)}deg`);
		el.dataset.cooldown = remaining > 0 ? `${Math.ceil(remaining / 1000)}` : "";
		if (el.dataset.useSprite === '1') {
			el.textContent = '';
		} else {
			el.textContent = icon;
		}
		el.title = title;
	}

	function updateHUD() {
		const state = getState();
		const hud = getHUD();
		const bannerEl = getBannerEl();
		const cityInventory = getInventory();
		const spriteIndex = getAbilitySpriteIndex();

		const {
			score: hudScore, coins: hudCoins, level: hudLevel,
			time: hudTime, hearts: hudHearts, shield: hudShield,
			coral: hudCoral, tsunami: hudTsunami,
			dash: hudDash, mine: hudMine, leech: hudLeech, timeBubble: hudTimeBubble,
			armor: hudArmor, playerLevel: hudPlayerLevel,
			xpBarFill: hudXpBarFill, skillPoints: hudSkillPoints,
			skillPointsNum: hudSkillPointsNum, symbols: hudSymbols
		} = hud;

		if (hudScore) hudScore.textContent = state.score.toString();
		if (hudCoins) hudCoins.textContent = state.coins.toString();
		if (hudLevel) hudLevel.textContent = state.level.toString();
		if (hudHearts) hudHearts.textContent = "❤".repeat(state.hearts);
		if (hudTime) hudTime.textContent = (state.elapsed / 1000).toFixed(1);
		if (bannerEl && state.boss.active) bannerEl.textContent = `Bosskampf – HP ${state.boss.hp}/${state.boss.maxHp}`;
		
		if (hudShield) {
			const player = state.player;
			const unlocked = !!player.shieldUnlocked;
			setAbilityCooldownVisual(hudShield, {
				locked: !unlocked,
				active: unlocked && player.shieldActive,
				ready: unlocked && !player.shieldActive && player.shieldCooldown <= 0,
				cooldownMs: player.shieldCooldown || 0,
				cooldownMaxMs: player.shieldCooldownMax || 1,
				icon: "🛡",
				title: buildAbilityTitle({
					name: 'Schild',
					description: 'Blockt eingehenden Schaden für kurze Zeit.',
					unlockHint: 'besiege Boss 1',
					unlocked,
					active: unlocked && !!player.shieldActive,
					cooldownMs: player.shieldCooldown || 0,
					hotkey: 'Shift/E'
				})
			});
		}

		if (hudCoral) {
			const ability = state.coralAbility || {};
			const unlocked = !!ability.unlocked;
			setAbilityCooldownVisual(hudCoral, {
				locked: !unlocked,
				active: unlocked && !!ability.active,
				ready: unlocked && !ability.active && (ability.cooldown || 0) <= 0,
				cooldownMs: ability.cooldown || 0,
				cooldownMaxMs: ability.cooldownMax || 1,
				icon: "🪸",
				title: buildAbilityTitle({
					name: 'Korallenverbündete',
					description: 'Beschwört Begleiter zur Unterstützung.',
					unlockHint: 'ab Level 3',
					unlocked,
					active: unlocked && !!ability.active,
					cooldownMs: ability.cooldown || 0,
					hotkey: 'R'
				})
			});
		}

		if (hudTsunami) {
			const ability = state.tsunamiAbility || {};
			const unlocked = !!ability.unlocked;
			setAbilityCooldownVisual(hudTsunami, {
				locked: !unlocked,
				active: unlocked && !!ability.active,
				ready: unlocked && !ability.active && (ability.cooldown || 0) <= 0,
				cooldownMs: ability.cooldown || 0,
				cooldownMaxMs: ability.cooldownMax || 1,
				icon: "🌊",
				title: buildAbilityTitle({
					name: 'Tsunami',
					description: 'Entfesselt eine mächtige Welle durch das Feld.',
					unlockHint: 'ab Level 4',
					unlocked,
					active: unlocked && !!ability.active,
					cooldownMs: ability.cooldown || 0,
					hotkey: 'T'
				})
			});
		}

		if (hudDash) {
			const ability = state.dashCurrentAbility || {};
			const unlocked = !!ability.unlocked;
			applyAbilityIcon(hudDash, '⚡', spriteIndex.dash);
			setAbilityCooldownVisual(hudDash, {
				locked: !unlocked,
				active: false,
				ready: unlocked && (ability.cooldown || 0) <= 0,
				cooldownMs: ability.cooldown || 0,
				cooldownMaxMs: ability.cooldownMax || 8000,
				icon: '⚡',
				title: buildAbilityTitle({
					name: 'Strömungs-Dash',
					description: 'Blitz in Bewegungsrichtung mit kurzer Unverwundbarkeit.',
					unlockHint: 'Talentbaum Stufe 3',
					unlocked,
					active: false,
					cooldownMs: ability.cooldown || 0,
					hotkey: 'Q'
				})
			});
		}

		if (hudMine) {
			const ability = state.depthMineAbility || {};
			const unlocked = !!ability.unlocked;
			applyAbilityIcon(hudMine, '💣', spriteIndex.mine);
			setAbilityCooldownVisual(hudMine, {
				locked: !unlocked,
				active: false,
				ready: unlocked && (ability.cooldown || 0) <= 0,
				cooldownMs: ability.cooldown || 0,
				cooldownMaxMs: ability.cooldownMax || 12000,
				icon: '💣',
				title: buildAbilityTitle({
					name: 'Tiefsee-Mine',
					description: 'Platziert eine Mine, die bei Gegnernähe explodiert.',
					unlockHint: 'Akademie (5000 Münzen)',
					unlocked,
					active: false,
					cooldownMs: ability.cooldown || 0,
					hotkey: 'X'
				})
			});
		}

		if (hudLeech) {
			const ability = state.leechAura || {};
			const unlocked = !!ability.unlocked;
			applyAbilityIcon(hudLeech, '💚', spriteIndex.leech);
			setAbilityCooldownVisual(hudLeech, {
				locked: !unlocked,
				active: false,
				ready: unlocked,
				cooldownMs: 0,
				cooldownMaxMs: 1,
				icon: '💚',
				title: buildAbilityTitle({
					name: 'Lebensraub-Aura',
					description: 'Heilt 8% des verursachten Schusseschadens.',
					unlockHint: 'Endlos-Dungeon Tiefe 20',
					unlocked,
					active: false,
					cooldownMs: 0,
					hotkey: 'Passiv'
				})
			});
		}

		if (hudTimeBubble) {
			const ability = state.timeBubbleAbility || {};
			const unlocked = !!ability.unlocked;
			applyAbilityIcon(hudTimeBubble, '🫧', spriteIndex.timeBubble);
			setAbilityCooldownVisual(hudTimeBubble, {
				locked: !unlocked,
				active: unlocked && !!ability.active,
				ready: unlocked && !ability.active && (ability.cooldown || 0) <= 0,
				cooldownMs: ability.cooldown || 0,
				cooldownMaxMs: ability.cooldownMax || 25000,
				icon: '🫧',
				title: buildAbilityTitle({
					name: 'Zeit-Blase',
					description: 'Verlangsamt Gegner im Radius für kurze Zeit.',
					unlockHint: 'Akademie (12000 Münzen)',
					unlocked,
					active: unlocked && !!ability.active,
					cooldownMs: ability.cooldown || 0,
					hotkey: 'C'
				})
			});
		}
		
		if (hudArmor) {
			const armorEquipped = cityInventory.equipment.armor === armorItemName;
			const armorReady = armorEquipped && state.armorShieldCharges > 0 && state.mode === "game";
			hudArmor.classList.toggle("active", armorReady);
			hudArmor.classList.toggle("inactive", !armorReady);
			hudArmor.style.display = armorEquipped ? "inline-flex" : "none";
			hudArmor.title = armorEquipped
				? (armorReady ? "Rüstung aktiv – nächster Treffer wird neutralisiert" : "Rüstung verbraucht (lädt in der Stadt)")
				: "";
		}
		
		if (hudSymbols) {
			for (const [kind, el] of Object.entries(hudSymbols)) {
				if (!el) continue;
				const owned = !!(state.symbolInventory && state.symbolInventory[kind]);
				el.classList.toggle("owned", owned);
				const config = SYMBOL_DATA[kind];
				if (owned && config && config.asset) {
					el.style.backgroundImage = `url("${config.asset}")`;
				} else {
					el.style.backgroundImage = "none";
				}
			}
		}
		
		// Progression HUD aktualisieren
		if (hudPlayerLevel) {
			hudPlayerLevel.textContent = state.progression.level.toString();
		}
		if (hudXpBarFill) {
			const progress = progressionSystem.getLevelProgress() * 100;
			hudXpBarFill.style.width = `${progress}%`;
		}
		if (hudSkillPoints && hudSkillPointsNum) {
			const sp = state.progression.skillPoints;
			if (sp > 0) {
				hudSkillPoints.style.display = 'inline';
				hudSkillPointsNum.textContent = sp.toString();
			} else {
				hudSkillPoints.style.display = 'none';
			}
		}
	}

	return { updateHUD };
}
