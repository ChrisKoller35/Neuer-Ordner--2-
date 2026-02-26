// ============================================================
// HELPERS SYSTEM - NPC-Helfer Karten (Tank/Heiler/DPS)
// ============================================================
// Spieler sammeln Helfer-Karten, max 15 im Besitz, 3 aktive Slots.
// Karten haben Stufe 1-3, Upgrade durch Duplikate.
// Im Dungeon: KI-gesteuerte Begleiter mit Rollen-Verhalten.
// Tank = Taunt-Aura | Heiler = Heal lowest HP | DPS = Attack target
"use strict";

import helpersData from '../data/helpers.json';

/**
 * Erstellt das Helpers-System
 * @param {Object} ctx
 * @param {Object} ctx.state - Spielzustand
 * @returns {Object} Helpers-System API
 */
export function createHelpersSystem(ctx) {
	const { state } = ctx;

	// Helpers-State initialisieren
	if (!state.helpers) {
		state.helpers = {
			collection: [],    // Array von { cardId, level, duplicates }
			activeSlots: [null, null, null], // 3 Slots: cardId oder null
			totalCardsFound: 0
		};
	}

	/**
	 * Gibt eine Karten-Definition zurück
	 */
	function getCardData(cardId) {
		return helpersData.cards[cardId] || null;
	}

	/**
	 * Gibt alle Karten in der Sammlung zurück (mit Daten)
	 */
	function getCollection() {
		return state.helpers.collection.map(entry => {
			const data = getCardData(entry.cardId);
			if (!data) return null;
			const stats = data.stats[String(entry.level)] || data.stats['1'];
			const dupsNeeded = entry.level < 3
				? helpersData.duplicatesNeeded[`${entry.level}to${entry.level + 1}`] || 99
				: 0;
			const isActive = state.helpers.activeSlots.includes(entry.cardId);

			return {
				...entry,
				data,
				stats,
				dupsNeeded,
				canUpgrade: entry.level < 3 && entry.duplicates >= dupsNeeded,
				isActive,
				roleData: helpersData.roles[data.role]
			};
		}).filter(Boolean);
	}

	/**
	 * Gibt die 3 aktiven Helfer zurück (mit vollen Daten)
	 */
	function getActiveHelpers() {
		return state.helpers.activeSlots.map((cardId, slotIndex) => {
			if (!cardId) return { slot: slotIndex, empty: true };

			const entry = state.helpers.collection.find(c => c.cardId === cardId);
			if (!entry) return { slot: slotIndex, empty: true };

			const data = getCardData(cardId);
			const stats = data?.stats[String(entry.level)] || data?.stats['1'];

			return {
				slot: slotIndex,
				empty: false,
				cardId,
				level: entry.level,
				data,
				stats,
				roleData: helpersData.roles[data?.role]
			};
		});
	}

	/**
	 * Fügt eine Karte zur Sammlung hinzu (z.B. aus Dungeon-Drop oder Markt)
	 * @param {string} cardId
	 * @returns {{ success: boolean, message: string, isNew: boolean, isDuplicate: boolean }}
	 */
	function addCard(cardId) {
		const data = getCardData(cardId);
		if (!data) return { success: false, message: 'Unbekannte Karte.', isNew: false, isDuplicate: false };

		const existing = state.helpers.collection.find(c => c.cardId === cardId);

		if (existing) {
			// Duplikat → Upgrade-Fortschritt
			existing.duplicates++;
			state.helpers.totalCardsFound++;
			console.log(`[Helpers] Duplikat: ${data.name} (${existing.duplicates} Duplikate)`);
			return {
				success: true,
				message: `${data.name} Duplikat! (${existing.duplicates}/${getDupsNeeded(existing.level)})`,
				isNew: false,
				isDuplicate: true
			};
		}

		// Neue Karte
		if (state.helpers.collection.length >= helpersData.maxCards) {
			return { success: false, message: `Sammlung voll! (Max ${helpersData.maxCards} Karten)`, isNew: false, isDuplicate: false };
		}

		state.helpers.collection.push({
			cardId,
			level: 1,
			duplicates: 0
		});
		state.helpers.totalCardsFound++;

		console.log(`[Helpers] Neue Karte: ${data.name} (${data.role})`);
		return {
			success: true,
			message: `Neue Karte: ${data.icon} ${data.name}!`,
			isNew: true,
			isDuplicate: false
		};
	}

	/**
	 * Hilfsfunktion: Duplikate nötig für nächstes Level
	 */
	function getDupsNeeded(currentLevel) {
		if (currentLevel >= 3) return 0;
		return helpersData.duplicatesNeeded[`${currentLevel}to${currentLevel + 1}`] || 99;
	}

	/**
	 * Karte upgraden (braucht genug Duplikate)
	 * @param {string} cardId
	 * @returns {{ success: boolean, message: string }}
	 */
	function upgradeCard(cardId) {
		const entry = state.helpers.collection.find(c => c.cardId === cardId);
		if (!entry) return { success: false, message: 'Karte nicht in Sammlung.' };

		if (entry.level >= 3) return { success: false, message: 'Karte bereits auf Max-Stufe!' };

		const dupsNeeded = getDupsNeeded(entry.level);
		if (entry.duplicates < dupsNeeded) {
			return { success: false, message: `Nicht genug Duplikate! (${entry.duplicates}/${dupsNeeded})` };
		}

		entry.duplicates -= dupsNeeded;
		entry.level++;

		const data = getCardData(cardId);
		console.log(`[Helpers] Upgrade: ${data.name} → Stufe ${entry.level}`);
		return { success: true, message: `${data.name} auf Stufe ${entry.level} aufgewertet!` };
	}

	/**
	 * Karte in aktiven Slot setzen
	 * @param {string} cardId
	 * @param {number} slotIndex - 0-2
	 * @returns {{ success: boolean, message: string }}
	 */
	function equipHelper(cardId, slotIndex) {
		if (slotIndex < 0 || slotIndex >= 3) {
			return { success: false, message: 'Ungültiger Slot.' };
		}

		const entry = state.helpers.collection.find(c => c.cardId === cardId);
		if (!entry) return { success: false, message: 'Karte nicht in Sammlung.' };

		// Wenn Karte schon in einem anderen Slot ist, dort entfernen
		const existingSlot = state.helpers.activeSlots.indexOf(cardId);
		if (existingSlot !== -1) {
			state.helpers.activeSlots[existingSlot] = null;
		}

		state.helpers.activeSlots[slotIndex] = cardId;
		const data = getCardData(cardId);
		console.log(`[Helpers] Ausgerüstet: ${data.name} in Slot ${slotIndex + 1}`);
		return { success: true, message: `${data.name} in Slot ${slotIndex + 1} gesetzt!` };
	}

	/**
	 * Karte aus aktivem Slot entfernen
	 * @param {number} slotIndex
	 * @returns {{ success: boolean, message: string }}
	 */
	function unequipHelper(slotIndex) {
		if (slotIndex < 0 || slotIndex >= 3) {
			return { success: false, message: 'Ungültiger Slot.' };
		}

		const cardId = state.helpers.activeSlots[slotIndex];
		if (!cardId) return { success: false, message: 'Slot ist leer.' };

		state.helpers.activeSlots[slotIndex] = null;
		const data = getCardData(cardId);
		console.log(`[Helpers] Entfernt: ${data.name} aus Slot ${slotIndex + 1}`);
		return { success: true, message: `${data.name} aus Slot ${slotIndex + 1} entfernt.` };
	}

	/**
	 * Karte aus Sammlung entfernen (verkaufen/recyclen)
	 * @param {string} cardId
	 * @returns {{ success: boolean, message: string }}
	 */
	function removeCard(cardId) {
		const idx = state.helpers.collection.findIndex(c => c.cardId === cardId);
		if (idx === -1) return { success: false, message: 'Karte nicht in Sammlung.' };

		// Aus aktiven Slots entfernen
		for (let i = 0; i < 3; i++) {
			if (state.helpers.activeSlots[i] === cardId) {
				state.helpers.activeSlots[i] = null;
			}
		}

		state.helpers.collection.splice(idx, 1);
		const data = getCardData(cardId);
		console.log(`[Helpers] Entfernt: ${data.name}`);
		return { success: true, message: `${data.name} entfernt.` };
	}

	/**
	 * Gibt Karten nach Rolle gruppiert zurück
	 */
	function getCollectionByRole() {
		const collection = getCollection();
		return {
			tank: collection.filter(c => c.data.role === 'tank'),
			healer: collection.filter(c => c.data.role === 'healer'),
			dps: collection.filter(c => c.data.role === 'dps')
		};
	}

	/**
	 * Erstellt Dungeon-Helfer-Instanzen (für den Kampf)
	 * Gibt ein Array von aktiven Helfern mit allen nötigen Kampf-Daten zurück
	 */
	function createDungeonHelpers() {
		return getActiveHelpers()
			.filter(h => !h.empty)
			.map(h => ({
				cardId: h.cardId,
				name: h.data.name,
				icon: h.data.icon,
				role: h.data.role,
				ai: h.data.ai,
				special: h.data.special,
				level: h.level,
				maxHp: h.stats.hp,
				hp: h.stats.hp,
				damage: h.stats.damage,
				speed: h.stats.speed,
				specialValue: h.stats.specialValue,
				x: 0,
				y: 0,
				targetX: 0,
				targetY: 0,
				attackTimer: 0,
				specialTimer: 0,
				alive: true,
				color: h.roleData.color,
				hitFlash: 0,
				invuln: 0,
				bobOffset: 0,
				_healFlash: 0
			}));
	}

	/**
	 * Gibt Statistiken zurück
	 */
	function getStats() {
		return {
			totalCards: state.helpers.collection.length,
			maxCards: helpersData.maxCards,
			activeCount: state.helpers.activeSlots.filter(Boolean).length,
			totalFound: state.helpers.totalCardsFound
		};
	}

	return {
		getCardData,
		getCollection,
		getActiveHelpers,
		addCard,
		upgradeCard,
		equipHelper,
		unequipHelper,
		removeCard,
		getCollectionByRole,
		createDungeonHelpers,
		getStats,
		getHelpersData: () => helpersData
	};
}
