// ============================================================
// WORKSHOP SYSTEM - Ausrüstung verstärken (+0 bis +10)
// ============================================================
// Kein Zerstörungsrisiko — kein Frust-Mechanismus.
// Items werden mit Gold verstärkt, Stats skalieren pro Stufe.
"use strict";

import workshopData from '../data/workshop.json';

/**
 * Erstellt das Workshop-System (Werkstatt)
 * @param {Object} ctx - Context
 * @param {Object} ctx.state - Spielzustand (enthält coins)
 * @param {Object} ctx.getInventory - Funktion die das Inventar zurückgibt
 * @param {Function} ctx.getItemData - Funktion die Item-Daten zu einem Namen liefert
 * @returns {Object} Workshop-System API
 */
export function createWorkshopSystem(ctx) {
	const { state, getInventory, getItemData } = ctx;

	// Enhancement-State: Speichert Enhancement-Level pro Item-Slot
	// Format: { "weapon": 3, "armor": 1, "armor2": 0, "inv-0": 2, ... }
	if (!state.workshop) {
		state.workshop = {
			enhancements: {}
		};
	}

	/**
	 * Gibt das Enhancement-Level eines bestimmten Slots zurück
	 * @param {string} slotKey - z.B. "weapon", "armor", "inv-0"
	 * @returns {number} Enhancement-Level (0-10)
	 */
	function getEnhancementLevel(slotKey) {
		return state.workshop.enhancements[slotKey] || 0;
	}

	/**
	 * Gibt die Daten für das nächste Enhancement-Level zurück
	 * @param {string} slotKey
	 * @returns {Object|null} Enhancement-Level-Daten oder null wenn max
	 */
	function getNextEnhancement(slotKey) {
		const current = getEnhancementLevel(slotKey);
		if (current >= workshopData.maxEnhancement) return null;
		return workshopData.enhancementLevels.find(e => e.level === current + 1);
	}

	/**
	 * Gibt alle Items zurück die verstärkt werden können
	 * @returns {Array} Liste von { slotKey, itemName, itemData, currentLevel, nextLevel }
	 */
	function getEnhanceableItems() {
		const inventory = getInventory();
		const result = [];

		// Equipment-Slots
		const equipSlots = [
			{ key: 'weapon', label: 'Waffe', value: inventory.equipment.weapon },
			{ key: 'armor', label: 'Rüstung', value: inventory.equipment.armor },
			{ key: 'armor2', label: 'Rüstung II', value: inventory.equipment.armor2 }
		];

		for (const slot of equipSlots) {
			if (!slot.value) continue;
			const data = getItemData(slot.value);
			result.push({
				slotKey: slot.key,
				slotLabel: slot.label,
				itemName: slot.value,
				itemData: data,
				currentLevel: getEnhancementLevel(slot.key),
				nextEnhancement: getNextEnhancement(slot.key),
				isMaxed: getEnhancementLevel(slot.key) >= workshopData.maxEnhancement
			});
		}

		// Inventar-Slots (nur Waffen und Rüstungen können verstärkt werden)
		for (let i = 0; i < inventory.items.length; i++) {
			const itemName = inventory.items[i];
			if (!itemName) continue;
			const data = getItemData(itemName);
			if (!data) continue;
			// Nur weapon und armor Typen können verstärkt werden
			if (data.type !== 'weapon' && data.type !== 'armor') continue;

			const slotKey = `inv-${i}`;
			result.push({
				slotKey,
				slotLabel: `Slot ${i + 1}`,
				itemName,
				itemData: data,
				currentLevel: getEnhancementLevel(slotKey),
				nextEnhancement: getNextEnhancement(slotKey),
				isMaxed: getEnhancementLevel(slotKey) >= workshopData.maxEnhancement
			});
		}

		return result;
	}

	/**
	 * Prüft ob ein Item verstärkt werden kann
	 * @param {string} slotKey
	 * @returns {{ canEnhance: boolean, reason: string }}
	 */
	function canEnhance(slotKey) {
		const currentLevel = getEnhancementLevel(slotKey);

		if (currentLevel >= workshopData.maxEnhancement) {
			return { canEnhance: false, reason: 'Maximale Stufe erreicht!' };
		}

		const next = getNextEnhancement(slotKey);
		if (!next) {
			return { canEnhance: false, reason: 'Kein weiteres Upgrade verfügbar.' };
		}

		const coins = state.coins || 0;
		if (coins < next.goldCost) {
			return { canEnhance: false, reason: `Nicht genug Gold! (${coins.toLocaleString('de-DE')}/${next.goldCost.toLocaleString('de-DE')})` };
		}

		return { canEnhance: true, reason: '' };
	}

	/**
	 * Verstärkt ein Item um eine Stufe
	 * @param {string} slotKey
	 * @returns {{ success: boolean, newLevel: number, message: string }}
	 */
	function enhance(slotKey) {
		const check = canEnhance(slotKey);
		if (!check.canEnhance) {
			return { success: false, newLevel: getEnhancementLevel(slotKey), message: check.reason };
		}

		const next = getNextEnhancement(slotKey);
		
		// Gold abziehen
		state.coins -= next.goldCost;

		// Enhancement-Level erhöhen
		state.workshop.enhancements[slotKey] = next.level;

		const enhanceName = workshopData.enhancementNames[String(next.level)] || '';
		
		console.log(`[Workshop] ${slotKey} auf +${next.level} verstärkt (${enhanceName})`);

		return {
			success: true,
			newLevel: next.level,
			message: `Verstärkt auf +${next.level}! ${enhanceName}`
		};
	}

	/**
	 * Berechnet die effektiven Stats eines Items mit Enhancement
	 * @param {string} slotKey
	 * @param {Object} baseStats - Basis-Stats des Items
	 * @returns {Object} Modifizierte Stats
	 */
	function getEnhancedStats(slotKey, baseStats) {
		const level = getEnhancementLevel(slotKey);
		if (level === 0 || !baseStats) return { ...baseStats };

		const enhData = workshopData.enhancementLevels.find(e => e.level === level);
		if (!enhData) return { ...baseStats };

		const multiplier = enhData.statMultiplier;
		const enhanced = {};

		for (const [key, value] of Object.entries(baseStats)) {
			if (typeof value === 'number') {
				enhanced[key] = Math.round(value * multiplier * 100) / 100;
			} else {
				enhanced[key] = value;
			}
		}

		return enhanced;
	}

	/**
	 * Gibt den visuellen Effekt für ein Enhancement-Level zurück
	 * @param {number} level
	 * @returns {string|null}
	 */
	function getVisualEffect(level) {
		return workshopData.visualEffects[String(level)] || null;
	}

	/**
	 * Gibt den Enhancement-Namen zurück
	 * @param {number} level
	 * @returns {string}
	 */
	function getEnhancementName(level) {
		return workshopData.enhancementNames[String(level)] || '';
	}

	/**
	 * Gibt die gesamten Workshop-Daten zurück
	 */
	function getWorkshopData() {
		return workshopData;
	}

	/**
	 * Formatiert Gold-Kosten
	 */
	function formatGold(amount) {
		return amount.toLocaleString('de-DE');
	}

	return {
		getEnhancementLevel,
		getNextEnhancement,
		getEnhanceableItems,
		canEnhance,
		enhance,
		getEnhancedStats,
		getVisualEffect,
		getEnhancementName,
		getWorkshopData,
		formatGold
	};
}
