// ============================================================
// GARDEN SYSTEM - Gärtnerei mit Pflanz-Slots, Wachstum & Buffs
// ============================================================
// Spieler kaufen Samen, pflanzen sie in Slots, warten auf
// Echtzeit-Wachstum, ernten Buff-Items fürs Inventar.
// Bis zu 3 Buffs gleichzeitig vor einem Run aktivierbar.
// Tod = alle aktiven Buffs weg.
"use strict";

import gardenData from '../data/garden.json';

/**
 * Erstellt das Garden-System
 * @param {Object} ctx
 * @param {Object} ctx.state - Spielzustand
 * @param {Function} ctx.getInventory - Liefert das Spieler-Inventar
 * @returns {Object} Garden-System API
 */
export function createGardenSystem(ctx) {
	const { state, getInventory } = ctx;

	// Garden-State initialisieren
	if (!state.garden) {
		state.garden = {
			level: 1,
			slots: [],         // Array von { plantId, plantedAt, harvestedAt } oder null
			activeBuffs: [],   // Array von { plantId, buff } — max 3
			buffHistory: {}    // plantId -> Anzahl geerntet (Statistik)
		};
		// Slots initialisieren
		const slotCount = gardenData.buildingLevels['1'].slots;
		state.garden.slots = new Array(slotCount).fill(null);
	}

	/**
	 * Gibt die aktuelle Slot-Anzahl zurück
	 */
	function getSlotCount() {
		const levelData = gardenData.buildingLevels[String(state.garden.level)];
		return levelData ? levelData.slots : 4;
	}

	/**
	 * Stellt sicher dass die Slot-Anzahl zum Level passt
	 */
	function syncSlots() {
		const targetCount = getSlotCount();
		while (state.garden.slots.length < targetCount) {
			state.garden.slots.push(null);
		}
	}

	/**
	 * Gibt die Pflanzendaten zurück
	 */
	function getPlantData(plantId) {
		return gardenData.plants[plantId] || null;
	}

	/**
	 * Gibt alle kaufbaren Samen zurück (je nach Gebäude-Level)
	 */
	function getAvailableSeeds() {
		const level = state.garden.level;
		return Object.values(gardenData.plants).filter(p =>
			p.purchasable && p.shopLevel <= level
		);
	}

	/**
	 * Kauft einen Samen
	 * @param {string} plantId
	 * @returns {{ success: boolean, message: string }}
	 */
	function buySeed(plantId) {
		const plant = getPlantData(plantId);
		if (!plant) return { success: false, message: 'Pflanze nicht gefunden.' };
		if (!plant.purchasable) return { success: false, message: 'Dieser Samen ist nicht kaufbar.' };
		if (plant.shopLevel > state.garden.level) {
			return { success: false, message: `Benötigt Gärtnerei Stufe ${plant.shopLevel}.` };
		}

		const coins = state.coins || 0;
		if (coins < plant.seedPrice) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${plant.seedPrice})` };
		}

		// Inventar-Platz prüfen
		const inventory = getInventory();
		const freeSlot = inventory.items.findIndex(s => s === null);
		if (freeSlot === -1) {
			return { success: false, message: 'Inventar voll!' };
		}

		// Gold abziehen + Samen ins Inventar
		state.coins -= plant.seedPrice;
		inventory.items[freeSlot] = `Samen: ${plant.label}`;

		console.log(`[Garden] Samen gekauft: ${plant.label} für ${plant.seedPrice} Gold`);
		return { success: true, message: `${plant.label}-Samen gekauft!` };
	}

	/**
	 * Pflanzt einen Samen aus dem Inventar in einen Slot
	 * @param {number} slotIndex - Garten-Slot Index
	 * @param {number} inventoryIndex - Inventar-Slot Index
	 * @returns {{ success: boolean, message: string }}
	 */
	function plantSeed(slotIndex, inventoryIndex) {
		syncSlots();

		if (slotIndex < 0 || slotIndex >= state.garden.slots.length) {
			return { success: false, message: 'Ungültiger Slot.' };
		}

		if (state.garden.slots[slotIndex] !== null) {
			return { success: false, message: 'Dieser Slot ist bereits bepflanzt.' };
		}

		const inventory = getInventory();
		const itemName = inventory.items[inventoryIndex];
		if (!itemName || !itemName.startsWith('Samen: ')) {
			return { success: false, message: 'Kein Samen in diesem Inventar-Slot.' };
		}

		// Pflanze per Label finden
		const seedLabel = itemName.replace('Samen: ', '');
		const plant = Object.values(gardenData.plants).find(p => p.label === seedLabel);
		if (!plant) {
			return { success: false, message: 'Unbekannter Samen.' };
		}

		// Samen aus Inventar entfernen + in Slot pflanzen
		inventory.items[inventoryIndex] = null;
		state.garden.slots[slotIndex] = {
			plantId: plant.id,
			plantedAt: Date.now(),
			harvestedAt: null
		};

		console.log(`[Garden] Gepflanzt: ${plant.label} in Slot ${slotIndex}`);
		return { success: true, message: `${plant.label} gepflanzt!` };
	}

	/**
	 * Gibt den Wachstums-Fortschritt eines Slots zurück (0-1)
	 * @param {number} slotIndex
	 * @returns {{ progress: number, remaining: number, ready: boolean, plant: Object|null }}
	 */
	function getSlotProgress(slotIndex) {
		syncSlots();
		const slot = state.garden.slots[slotIndex];
		if (!slot) return { progress: 0, remaining: 0, ready: false, plant: null };

		const plant = getPlantData(slot.plantId);
		if (!plant) return { progress: 0, remaining: 0, ready: false, plant: null };

		const elapsed = Date.now() - slot.plantedAt;
		const progress = Math.min(1, elapsed / plant.growthTime);
		const remaining = Math.max(0, plant.growthTime - elapsed);
		const ready = progress >= 1;

		return { progress, remaining, ready, plant };
	}

	/**
	 * Erntet eine fertige Pflanze
	 * @param {number} slotIndex
	 * @returns {{ success: boolean, message: string, buff: Object|null }}
	 */
	function harvest(slotIndex) {
		syncSlots();
		const slot = state.garden.slots[slotIndex];
		if (!slot) return { success: false, message: 'Dieser Slot ist leer.', buff: null };

		const { ready, plant } = getSlotProgress(slotIndex);
		if (!ready) return { success: false, message: 'Pflanze noch nicht reif!', buff: null };

		// Inventar-Platz prüfen
		const inventory = getInventory();
		const freeSlot = inventory.items.findIndex(s => s === null);
		if (freeSlot === -1) {
			return { success: false, message: 'Inventar voll!', buff: null };
		}

		// Buff-Item ins Inventar
		inventory.items[freeSlot] = `Buff: ${plant.label}`;

		// Slot leeren
		state.garden.slots[slotIndex] = null;

		// Statistik
		if (!state.garden.buffHistory[plant.id]) {
			state.garden.buffHistory[plant.id] = 0;
		}
		state.garden.buffHistory[plant.id]++;

		console.log(`[Garden] Geerntet: ${plant.label}`);
		return { success: true, message: `${plant.label} geerntet! Buff im Inventar.`, buff: plant.buff };
	}

	/**
	 * Aktiviert einen Buff aus dem Inventar
	 * @param {number} inventoryIndex
	 * @returns {{ success: boolean, message: string }}
	 */
	function activateBuff(inventoryIndex) {
		if (state.garden.activeBuffs.length >= gardenData.maxActiveBuffs) {
			return { success: false, message: `Max. ${gardenData.maxActiveBuffs} Buffs gleichzeitig!` };
		}

		const inventory = getInventory();
		const itemName = inventory.items[inventoryIndex];
		if (!itemName || !itemName.startsWith('Buff: ')) {
			return { success: false, message: 'Kein Buff-Item in diesem Slot.' };
		}

		const buffLabel = itemName.replace('Buff: ', '');
		const plant = Object.values(gardenData.plants).find(p => p.label === buffLabel);
		if (!plant) {
			return { success: false, message: 'Unbekannter Buff.' };
		}

		// Buff aktivieren + Item aus Inventar entfernen
		inventory.items[inventoryIndex] = null;
		state.garden.activeBuffs.push({
			plantId: plant.id,
			buff: { ...plant.buff },
			activatedAt: Date.now()
		});

		console.log(`[Garden] Buff aktiviert: ${plant.label} — ${plant.buff.label}`);
		return { success: true, message: `${plant.buff.label} aktiviert!` };
	}

	/**
	 * Löscht alle aktiven Buffs (bei Tod)
	 */
	function clearBuffs() {
		if (state.garden.activeBuffs.length > 0) {
			console.log(`[Garden] Alle ${state.garden.activeBuffs.length} Buffs gelöscht (Tod)`);
			state.garden.activeBuffs = [];
		}
	}

	/**
	 * Gibt alle aktiven Buffs zurück
	 */
	function getActiveBuffs() {
		return state.garden.activeBuffs;
	}

	/**
	 * Gibt den aggregierten Buff-Effekt für einen bestimmten Stat zurück
	 * @param {string} stat - z.B. 'maxHp', 'speed', 'armor'
	 * @returns {number} Gesamt-Bonus (z.B. 0.08 für +8%)
	 */
	function getBuffBonusForStat(stat) {
		let total = 0;
		for (const active of state.garden.activeBuffs) {
			if (active.buff.stat === stat) {
				total += active.buff.value;
			}
		}
		return total;
	}

	/**
	 * Prüft ob ein spezieller Buff aktiv ist
	 * @param {string} stat - z.B. 'deathSave', 'revive', 'slowOnHit'
	 * @returns {Object|null} Buff-Daten oder null
	 */
	function getSpecialBuff(stat) {
		const found = state.garden.activeBuffs.find(a => a.buff.stat === stat);
		return found ? found.buff : null;
	}

	/**
	 * Verbraucht einen einmaligen Buff (z.B. deathSave)
	 * @param {string} stat
	 */
	function consumeSpecialBuff(stat) {
		const index = state.garden.activeBuffs.findIndex(a => a.buff.stat === stat);
		if (index !== -1) {
			const removed = state.garden.activeBuffs.splice(index, 1)[0];
			console.log(`[Garden] Spezialbuff verbraucht: ${removed.buff.label}`);
		}
	}

	/**
	 * Gibt die Upgrade-Kosten für die nächste Stufe zurück
	 * @returns {{ cost: number, nextLevel: number, label: string }|null}
	 */
	function getUpgradeInfo() {
		const current = state.garden.level;
		const next = current + 1;
		const nextData = gardenData.buildingLevels[String(next)];
		if (!nextData) return null; // Max-Level erreicht
		return {
			cost: nextData.upgradeCost,
			nextLevel: next,
			label: nextData.label,
			newSlots: nextData.slots
		};
	}

	/**
	 * Gärtnerei upgraden
	 * @returns {{ success: boolean, message: string }}
	 */
	function upgradeGarden() {
		const info = getUpgradeInfo();
		if (!info) return { success: false, message: 'Gärtnerei ist auf Max-Stufe!' };

		const coins = state.coins || 0;
		if (coins < info.cost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${info.cost})` };
		}

		state.coins -= info.cost;
		state.garden.level = info.nextLevel;
		syncSlots();

		console.log(`[Garden] Upgrade auf Stufe ${info.nextLevel}: ${info.label} (${info.newSlots} Slots)`);
		return { success: true, message: `Gärtnerei auf ${info.label} aufgewertet! (${info.newSlots} Slots)` };
	}

	/**
	 * Gibt alle Slots mit aktuellem Status zurück
	 */
	function getAllSlots() {
		syncSlots();
		return state.garden.slots.map((slot, i) => {
			if (!slot) return { index: i, empty: true };
			const { progress, remaining, ready, plant } = getSlotProgress(i);
			return {
				index: i,
				empty: false,
				plantId: slot.plantId,
				plant,
				progress,
				remaining,
				ready
			};
		});
	}

	/**
	 * Gibt Samen im Inventar zurück (für Pflanzen-Auswahl)
	 */
	function getSeedsInInventory() {
		const inventory = getInventory();
		const seeds = [];
		inventory.items.forEach((item, i) => {
			if (item && item.startsWith('Samen: ')) {
				const label = item.replace('Samen: ', '');
				const plant = Object.values(gardenData.plants).find(p => p.label === label);
				if (plant) {
					seeds.push({ inventoryIndex: i, plant });
				}
			}
		});
		return seeds;
	}

	/**
	 * Gibt Buffs im Inventar zurück (für Aktivierung)
	 */
	function getBuffsInInventory() {
		const inventory = getInventory();
		const buffs = [];
		inventory.items.forEach((item, i) => {
			if (item && item.startsWith('Buff: ')) {
				const label = item.replace('Buff: ', '');
				const plant = Object.values(gardenData.plants).find(p => p.label === label);
				if (plant) {
					buffs.push({ inventoryIndex: i, plant });
				}
			}
		});
		return buffs;
	}

	/**
	 * Formatiert verbleibende Zeit
	 */
	function formatTime(ms) {
		if (ms <= 0) return 'Fertig!';
		const totalSec = Math.ceil(ms / 1000);
		const min = Math.floor(totalSec / 60);
		const sec = totalSec % 60;
		if (min > 0) return `${min}m ${sec}s`;
		return `${sec}s`;
	}

	return {
		getSlotCount,
		getPlantData,
		getAvailableSeeds,
		buySeed,
		plantSeed,
		getSlotProgress,
		harvest,
		activateBuff,
		clearBuffs,
		getActiveBuffs,
		getBuffBonusForStat,
		getSpecialBuff,
		consumeSpecialBuff,
		getUpgradeInfo,
		upgradeGarden,
		getAllSlots,
		getSeedsInInventory,
		getBuffsInInventory,
		formatTime,
		getGardenData: () => gardenData
	};
}
