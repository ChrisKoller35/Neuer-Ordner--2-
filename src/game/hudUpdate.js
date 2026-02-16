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

	function updateHUD() {
		const state = getState();
		const hud = getHUD();
		const bannerEl = getBannerEl();
		const cityInventory = getInventory();

		const {
			score: hudScore, coins: hudCoins, level: hudLevel,
			time: hudTime, hearts: hudHearts, shield: hudShield,
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
			hudShield.classList.toggle("locked", !unlocked);
			hudShield.classList.toggle("active", unlocked && player.shieldActive);
			hudShield.classList.toggle("ready", unlocked && !player.shieldActive && player.shieldCooldown <= 0);
			hudShield.classList.toggle("cooldown", unlocked && !player.shieldActive && player.shieldCooldown > 0);
			if (unlocked && !player.shieldActive && player.shieldCooldown > 0) {
				const seconds = Math.ceil(player.shieldCooldown / 1000);
				hudShield.textContent = seconds.toString();
			} else {
				hudShield.textContent = "🛡";
			}
			if (!unlocked) hudShield.title = "Schild (Shift/E) – besiege Boss 1";
			else if (player.shieldActive) hudShield.title = "Schild aktiv";
			else if (player.shieldCooldown > 0) hudShield.title = `Schild lädt (${Math.ceil(player.shieldCooldown / 1000)}s)`;
			else hudShield.title = "Schild bereit (Shift/E)";
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
