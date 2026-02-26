// ============================================================
// ACADEMY SYSTEM - Modularer Skill-Builder
// ============================================================
// 1 Basis-Zauber + bis zu 3 Modifikatoren kombinierbar.
// OP-Combos bewusst erlaubt (Bosse skalen mit).
// Community-Submit: Skill-Ideen per Discord-Webhook einreichen.
"use strict";

import academyData from '../data/academy.json';

const SKILL_UNLOCKS = {
	depth_mine: {
		id: 'depth_mine',
		label: 'Tiefsee-Mine',
		description: 'Platziere eine Mine (X), die bei Gegner-Nähe explodiert.',
		cost: 5000,
		abilityPath: 'depthMineAbility'
	},
	time_bubble: {
		id: 'time_bubble',
		label: 'Zeit-Blase',
		description: 'Verlangsamt Gegner im Radius (C) für 4 Sekunden.',
		cost: 12000,
		abilityPath: 'timeBubbleAbility'
	}
};

/**
 * Erstellt das Academy-System
 * @param {Object} ctx
 * @param {Object} ctx.state - Spielzustand
 * @returns {Object} Academy-System API
 */
export function createAcademySystem(ctx) {
	const { state } = ctx;

	// Academy-State initialisieren
	if (!state.academy) {
		state.academy = {
			level: 1,
			unlockedSpells: ['feuerball'],   // IDs der freigeschalteten Basis-Zauber
			unlockedMods: [],                 // IDs der freigeschalteten Modifikatoren
			unlockedSkillIds: [],            // IDs der freigeschalteten Utility-Skills (Phase 6.2)
			activeSpell: 'feuerball',         // Aktuell ausgerüsteter Basis-Zauber
			activeMods: [],                   // Aktuell ausgerüstete Modifikatoren (max 1-3)
			submissions: [],                  // Community-Einreich-Historie
			totalSpellsUnlocked: 1,
			totalModsUnlocked: 0
		};
	}

	if (!Array.isArray(state.academy.unlockedSkillIds)) {
		state.academy.unlockedSkillIds = [];
	}

	for (const def of Object.values(SKILL_UNLOCKS)) {
		if (!state.academy.unlockedSkillIds.includes(def.id)) continue;
		if (state[def.abilityPath]) state[def.abilityPath].unlocked = true;
	}

	/**
	 * Max. Modifier-Slots für aktuelles Level
	 */
	function getMaxModSlots() {
		const levelData = academyData.buildingLevels[String(state.academy.level)];
		return levelData ? levelData.modSlots : 1;
	}

	/**
	 * Gibt alle Basis-Zauber zurück (mit Unlock-Status)
	 */
	function getAllSpells() {
		return Object.values(academyData.baseSpells).map(spell => ({
			...spell,
			unlocked: state.academy.unlockedSpells.includes(spell.id),
			equipped: state.academy.activeSpell === spell.id,
			canUnlock: !state.academy.unlockedSpells.includes(spell.id) &&
				spell.unlockLevel <= state.academy.level
		}));
	}

	/**
	 * Gibt alle Modifikatoren zurück (mit Unlock-Status)
	 */
	function getAllModifiers() {
		return Object.values(academyData.modifiers).map(mod => ({
			...mod,
			unlocked: state.academy.unlockedMods.includes(mod.id),
			equipped: state.academy.activeMods.includes(mod.id),
			canUnlock: !state.academy.unlockedMods.includes(mod.id) &&
				mod.unlockLevel <= state.academy.level
		}));
	}

	/**
	 * Gibt den aktiven Spell + Mods als Build-Objekt zurück
	 */
	function getActiveBuild() {
		const spell = academyData.baseSpells[state.academy.activeSpell];
		if (!spell) return null;

		const mods = state.academy.activeMods
			.map(id => academyData.modifiers[id])
			.filter(Boolean);

		// Berechnete Stats
		let damage = spell.baseDamage;
		let cooldown = spell.cooldown;
		const speed = spell.projectileSpeed;
		let size = spell.projectileSize;
		const effects = [];

		for (const mod of mods) {
			const eff = mod.effect;
			switch (eff.type) {
				case 'rapidfire':
					cooldown *= eff.cooldownMult;
					damage *= eff.damageMult;
					break;
				case 'enlarge':
					size *= eff.sizeMult;
					damage *= eff.damageMult;
					break;
				default:
					effects.push(eff);
					break;
			}
		}

		return {
			spell: { ...spell },
			mods,
			computed: {
				damage: Math.round(damage),
				cooldown: Math.round(cooldown),
				speed,
				size: Math.round(size),
				effects
			}
		};
	}

	/**
	 * Zauber freischalten
	 * @param {string} spellId
	 * @returns {{ success: boolean, message: string }}
	 */
	function unlockSpell(spellId) {
		const spell = academyData.baseSpells[spellId];
		if (!spell) return { success: false, message: 'Zauber nicht gefunden.' };

		if (state.academy.unlockedSpells.includes(spellId)) {
			return { success: false, message: 'Bereits freigeschaltet!' };
		}

		if (spell.unlockLevel > state.academy.level) {
			return { success: false, message: `Benötigt Akademie Stufe ${spell.unlockLevel}.` };
		}

		const coins = state.coins || 0;
		if (coins < spell.cost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${spell.cost})` };
		}

		state.coins -= spell.cost;
		state.academy.unlockedSpells.push(spellId);
		state.academy.totalSpellsUnlocked++;

		console.log(`[Academy] Zauber freigeschaltet: ${spell.name}`);
		return { success: true, message: `${spell.name} freigeschaltet!` };
	}

	/**
	 * Modifikator freischalten
	 * @param {string} modId
	 * @returns {{ success: boolean, message: string }}
	 */
	function unlockModifier(modId) {
		const mod = academyData.modifiers[modId];
		if (!mod) return { success: false, message: 'Modifikator nicht gefunden.' };

		if (state.academy.unlockedMods.includes(modId)) {
			return { success: false, message: 'Bereits freigeschaltet!' };
		}

		if (mod.unlockLevel > state.academy.level) {
			return { success: false, message: `Benötigt Akademie Stufe ${mod.unlockLevel}.` };
		}

		const coins = state.coins || 0;
		if (coins < mod.cost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${mod.cost})` };
		}

		state.coins -= mod.cost;
		state.academy.unlockedMods.push(modId);
		state.academy.totalModsUnlocked++;

		console.log(`[Academy] Modifikator freigeschaltet: ${mod.name}`);
		return { success: true, message: `${mod.name} freigeschaltet!` };
	}

	/**
	 * Basis-Zauber ausrüsten
	 * @param {string} spellId
	 * @returns {{ success: boolean, message: string }}
	 */
	function equipSpell(spellId) {
		if (!state.academy.unlockedSpells.includes(spellId)) {
			return { success: false, message: 'Zauber nicht freigeschaltet!' };
		}

		state.academy.activeSpell = spellId;
		const spell = academyData.baseSpells[spellId];
		console.log(`[Academy] Zauber ausgerüstet: ${spell.name}`);
		return { success: true, message: `${spell.name} ausgerüstet!` };
	}

	/**
	 * Modifikator an-/ablegen
	 * @param {string} modId
	 * @returns {{ success: boolean, message: string }}
	 */
	function toggleModifier(modId) {
		if (!state.academy.unlockedMods.includes(modId)) {
			return { success: false, message: 'Modifikator nicht freigeschaltet!' };
		}

		const idx = state.academy.activeMods.indexOf(modId);
		if (idx !== -1) {
			// Ablegen
			state.academy.activeMods.splice(idx, 1);
			const mod = academyData.modifiers[modId];
			return { success: true, message: `${mod.name} abgelegt.` };
		}

		// Anlegen
		const maxSlots = getMaxModSlots();
		if (state.academy.activeMods.length >= maxSlots) {
			return { success: false, message: `Max. ${maxSlots} Modifikatoren! (Akademie upgraden für mehr)` };
		}

		state.academy.activeMods.push(modId);
		const mod = academyData.modifiers[modId];
		console.log(`[Academy] Modifikator angelegt: ${mod.name}`);
		return { success: true, message: `${mod.name} angelegt!` };
	}

	/**
	 * Akademie upgraden (mehr Mod-Slots)
	 * @returns {{ success: boolean, message: string }}
	 */
	function upgradeAcademy() {
		const current = state.academy.level;
		const next = current + 1;
		const nextData = academyData.buildingLevels[String(next)];

		if (!nextData) {
			return { success: false, message: 'Akademie ist auf Max-Stufe!' };
		}

		const coins = state.coins || 0;
		if (coins < nextData.upgradeCost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${nextData.upgradeCost})` };
		}

		state.coins -= nextData.upgradeCost;
		state.academy.level = next;

		console.log(`[Academy] Upgrade auf Stufe ${next}: ${nextData.label} (${nextData.modSlots} Mod-Slots)`);
		return { success: true, message: `Akademie auf ${nextData.label} aufgewertet! (${nextData.modSlots} Mod-Slots)` };
	}

	/**
	 * Gibt Upgrade-Info zurück
	 */
	function getUpgradeInfo() {
		const current = state.academy.level;
		const next = current + 1;
		const nextData = academyData.buildingLevels[String(next)];
		if (!nextData) return null;
		return {
			cost: nextData.upgradeCost,
			nextLevel: next,
			label: nextData.label,
			modSlots: nextData.modSlots
		};
	}

	/**
	 * Community-Skill-Idee einreichen (simuliert — kein echter Webhook im PoC)
	 * @param {string} name - Skill-Name
	 * @param {string} description - Beschreibung (max 280 Zeichen)
	 * @returns {{ success: boolean, message: string }}
	 */
	function submitSkillIdea(name, description) {
		if (!name || name.trim().length < 2) {
			return { success: false, message: 'Name zu kurz (min. 2 Zeichen).' };
		}
		if (!description || description.trim().length < 10) {
			return { success: false, message: 'Beschreibung zu kurz (min. 10 Zeichen).' };
		}
		if (description.length > 280) {
			return { success: false, message: 'Beschreibung zu lang (max. 280 Zeichen).' };
		}

		const submission = {
			name: name.trim(),
			description: description.trim(),
			submittedAt: Date.now()
		};

		state.academy.submissions.push(submission);

		// Im PoC: Nur in Console loggen (kein echter Webhook)
		console.log(`[Academy] Community-Skill eingereicht:`, submission);
		return { success: true, message: `"${name}" eingereicht! Danke für deinen Vorschlag.` };
	}

	function getSkillUnlocks() {
		return Object.values(SKILL_UNLOCKS).map(def => {
			const ability = state[def.abilityPath] || {};
			const persistentlyUnlocked = state.academy.unlockedSkillIds.includes(def.id);
			return {
				...def,
				unlocked: persistentlyUnlocked || !!ability.unlocked,
				canUnlock: !(persistentlyUnlocked || !!ability.unlocked),
			};
		});
	}

	function unlockSkill(skillId) {
		const def = SKILL_UNLOCKS[skillId];
		if (!def) return { success: false, message: 'Skill nicht gefunden.' };
		const ability = state[def.abilityPath];
		if (!ability) return { success: false, message: 'Skill-System nicht verfügbar.' };
		if (ability.unlocked) return { success: false, message: 'Bereits freigeschaltet!' };

		const coins = state.coins || 0;
		if (coins < def.cost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${def.cost})` };
		}

		state.coins -= def.cost;
		ability.unlocked = true;
		if (!state.academy.unlockedSkillIds.includes(def.id)) {
			state.academy.unlockedSkillIds.push(def.id);
		}
		if (ability.cooldown != null) ability.cooldown = 0;
		if (ability.active != null) ability.active = false;
		if (ability.timer != null) ability.timer = 0;

		console.log(`[Academy] Skill freigeschaltet: ${def.label}`);
		return { success: true, message: `${def.label} freigeschaltet!` };
	}

	return {
		getMaxModSlots,
		getAllSpells,
		getAllModifiers,
		getActiveBuild,
		unlockSpell,
		unlockModifier,
		equipSpell,
		toggleModifier,
		upgradeAcademy,
		getUpgradeInfo,
		submitSkillIdea,
		getSkillUnlocks,
		unlockSkill,
		getAcademyData: () => academyData
	};
}
