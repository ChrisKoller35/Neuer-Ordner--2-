// ============================================================
// HARBOR SYSTEM - Expeditionen, Schiffe & Loot
// ============================================================
// Spieler schicken bis zu 3 Schiffe auf Routen (Nord=Erz,
// Süd=Samen, Tiefsee=Helfer-Karten, Handel=Gold).
// Expeditionen laufen in Echtzeit — auch während Dungeon-Runs.
// Crew-Slots: ein inaktiver Helfer kann mitgeschickt werden.
"use strict";

import harborData from '../data/harbor.json';

/**
 * Erstellt das Harbor-System
 * @param {Object} ctx
 * @param {Object} ctx.state - Spielzustand
 * @param {Function} ctx.getInventory - Liefert das Spieler-Inventar
 * @returns {Object} Harbor-System API
 */
export function createHarborSystem(ctx) {
	const { state, getInventory } = ctx;

	// Harbor-State initialisieren
	if (!state.harbor) {
		state.harbor = {
			level: 1,
			ships: [],          // Array von { shipId, upgradeLevel, expedition: null | { routeId, startedAt, crew } }
			completedResults: [], // Array von Expeditions-Ergebnissen zum Abholen
			totalExpeditions: 0,
			totalGoldEarned: 0
		};
		// Erstes Schiff freischalten
		state.harbor.ships.push({
			shipId: 'kutter',
			upgradeLevel: 1,
			expedition: null
		});
	}

	/**
	 * Gibt die max. Schiff-Anzahl für das aktuelle Level zurück
	 */
	function getMaxShips() {
		const levelData = harborData.buildingLevels[String(state.harbor.level)];
		return levelData ? levelData.ships : 1;
	}

	/**
	 * Stellt sicher, dass die Schiff-Anzahl zum Level passt
	 */
	function syncShips() {
		const maxShips = getMaxShips();
		const shipTypes = Object.values(harborData.ships);
		while (state.harbor.ships.length < maxShips && state.harbor.ships.length < shipTypes.length) {
			const nextShip = shipTypes.find(s =>
				s.unlockLevel <= state.harbor.level &&
				!state.harbor.ships.some(existing => existing.shipId === s.id)
			);
			if (nextShip) {
				state.harbor.ships.push({
					shipId: nextShip.id,
					upgradeLevel: 1,
					expedition: null
				});
			} else {
				break;
			}
		}
	}

	/**
	 * Gibt Schiff-Daten zurück
	 */
	function getShipData(shipId) {
		return harborData.ships[shipId] || null;
	}

	/**
	 * Gibt alle Schiffe mit Status zurück
	 */
	function getAllShips() {
		syncShips();
		return state.harbor.ships.map((ship, i) => {
			const data = getShipData(ship.shipId);
			const upgradeData = harborData.shipUpgrades[String(ship.upgradeLevel)] || harborData.shipUpgrades['1'];
			const expedition = ship.expedition;

			let expeditionStatus = null;
			if (expedition) {
				const route = harborData.routes[expedition.routeId];
				const elapsed = Date.now() - expedition.startedAt;
				const speedMult = upgradeData.speedMult * (expedition.crewSpeedMult || 1);
				const adjustedDuration = route.duration / speedMult;
				const progress = Math.min(1, elapsed / adjustedDuration);
				const remaining = Math.max(0, adjustedDuration - elapsed);
				const ready = progress >= 1;

				expeditionStatus = {
					routeId: expedition.routeId,
					route,
					progress,
					remaining,
					ready,
					crew: expedition.crew || null
				};
			}

			return {
				index: i,
				shipId: ship.shipId,
				data,
				upgradeLevel: ship.upgradeLevel,
				upgradeData,
				onExpedition: !!expedition,
				expedition: expeditionStatus,
				canUpgrade: ship.upgradeLevel < 3
			};
		});
	}

	/**
	 * Gibt alle verfügbaren Routen zurück
	 */
	function getRoutes() {
		return Object.values(harborData.routes);
	}

	/**
	 * Startet eine Expedition
	 * @param {number} shipIndex - Index des Schiffes
	 * @param {string} routeId - Route-ID
	 * @param {string|null} crewHelperId - Optional: Helfer-ID für den Crew-Slot
	 * @returns {{ success: boolean, message: string }}
	 */
	function startExpedition(shipIndex, routeId, crewHelperId = null) {
		syncShips();

		if (shipIndex < 0 || shipIndex >= state.harbor.ships.length) {
			return { success: false, message: 'Ungültiges Schiff.' };
		}

		const ship = state.harbor.ships[shipIndex];
		if (ship.expedition) {
			return { success: false, message: 'Dieses Schiff ist bereits unterwegs!' };
		}

		const route = harborData.routes[routeId];
		if (!route) {
			return { success: false, message: 'Unbekannte Route.' };
		}

		// Expedition starten
		let crewSpeedMult = 1;
		let crewLootMult = 1;
		if (crewHelperId && harborData.crewBonus[crewHelperId]) {
			const bonus = harborData.crewBonus[crewHelperId];
			crewSpeedMult = bonus.speedMult || 1;
			crewLootMult = bonus.lootMult || 1;
		}

		ship.expedition = {
			routeId,
			startedAt: Date.now(),
			crew: crewHelperId,
			crewSpeedMult,
			crewLootMult
		};

		const shipData = getShipData(ship.shipId);
		console.log(`[Harbor] Expedition gestartet: ${shipData.name} → ${route.name}`);
		return { success: true, message: `${shipData.name} auf ${route.name} geschickt!` };
	}

	/**
	 * Sammelt Expeditions-Ergebnis ein
	 * @param {number} shipIndex
	 * @returns {{ success: boolean, message: string, loot: Array|null }}
	 */
	function collectExpedition(shipIndex) {
		syncShips();

		if (shipIndex < 0 || shipIndex >= state.harbor.ships.length) {
			return { success: false, message: 'Ungültiges Schiff.', loot: null };
		}

		const ship = state.harbor.ships[shipIndex];
		if (!ship.expedition) {
			return { success: false, message: 'Kein Schiff unterwegs.', loot: null };
		}

		const route = harborData.routes[ship.expedition.routeId];
		const upgradeData = harborData.shipUpgrades[String(ship.upgradeLevel)] || harborData.shipUpgrades['1'];
		const speedMult = upgradeData.speedMult * (ship.expedition.crewSpeedMult || 1);
		const adjustedDuration = route.duration / speedMult;
		const elapsed = Date.now() - ship.expedition.startedAt;

		if (elapsed < adjustedDuration) {
			const remaining = adjustedDuration - elapsed;
			return { success: false, message: `Noch ${formatTime(remaining)} unterwegs!`, loot: null };
		}

		// Loot generieren
		const shipData = getShipData(ship.shipId);
		const lootMult = (shipData?.baseLoot || 1) * upgradeData.lootMult * (ship.expedition.crewLootMult || 1);
		const loot = generateLoot(route.lootTable, lootMult);

		// Loot ins Inventar packen
		const inventory = getInventory();
		let goldEarned = 0;

		for (const item of loot) {
			if (item.item === 'Gold') {
				state.coins = (state.coins || 0) + item.amount;
				goldEarned += item.amount;
			} else {
				// Ins Inventar legen
				for (let i = 0; i < item.amount; i++) {
					const freeSlot = inventory.items.findIndex(s => s === null);
					if (freeSlot !== -1) {
						inventory.items[freeSlot] = item.item;
					}
					// Kein Platz = Item verloren (wird in Nachricht erwähnt)
				}
			}
		}

		// Statistik
		state.harbor.totalExpeditions++;
		state.harbor.totalGoldEarned += goldEarned;

		// Expedition beenden
		ship.expedition = null;

		console.log(`[Harbor] Expedition abgeschlossen: ${shipData.name}, ${loot.length} Loot-Typen`);
		return {
			success: true,
			message: `${shipData.name} zurück! ${loot.map(l => `${l.amount}x ${l.icon} ${l.item}`).join(', ')}`,
			loot
		};
	}

	/**
	 * Generiert Loot basierend auf der Loot-Tabelle
	 */
	function generateLoot(lootTable, lootMult) {
		const results = [];
		for (const entry of lootTable) {
			if (Math.random() < entry.chance) {
				let amount = Math.floor(
					(entry.min + Math.random() * (entry.max - entry.min + 1)) * lootMult
				);
				amount = Math.max(1, amount);
				results.push({
					item: entry.item,
					icon: entry.icon,
					amount
				});
			}
		}
		return results;
	}

	/**
	 * Schiff upgraden
	 * @param {number} shipIndex
	 * @returns {{ success: boolean, message: string }}
	 */
	function upgradeShip(shipIndex) {
		syncShips();

		if (shipIndex < 0 || shipIndex >= state.harbor.ships.length) {
			return { success: false, message: 'Ungültiges Schiff.' };
		}

		const ship = state.harbor.ships[shipIndex];
		const nextLevel = ship.upgradeLevel + 1;
		const nextData = harborData.shipUpgrades[String(nextLevel)];

		if (!nextData) {
			return { success: false, message: 'Schiff ist auf Max-Stufe!' };
		}

		if (ship.expedition) {
			return { success: false, message: 'Schiff kann nicht während Expedition geupgradet werden!' };
		}

		const coins = state.coins || 0;
		if (coins < nextData.cost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${nextData.cost})` };
		}

		state.coins -= nextData.cost;
		ship.upgradeLevel = nextLevel;

		const shipData = getShipData(ship.shipId);
		console.log(`[Harbor] Schiff geupgradet: ${shipData.name} → ${nextData.label}`);
		return { success: true, message: `${shipData.name} auf ${nextData.label} geupgradet!` };
	}

	/**
	 * Hafen upgraden (mehr Schiffe)
	 * @returns {{ success: boolean, message: string }}
	 */
	function upgradeHarbor() {
		const current = state.harbor.level;
		const next = current + 1;
		const nextData = harborData.buildingLevels[String(next)];

		if (!nextData) {
			return { success: false, message: 'Hafen ist auf Max-Stufe!' };
		}

		const coins = state.coins || 0;
		if (coins < nextData.upgradeCost) {
			return { success: false, message: `Nicht genug Gold! (${coins}/${nextData.upgradeCost})` };
		}

		state.coins -= nextData.upgradeCost;
		state.harbor.level = next;
		syncShips();

		console.log(`[Harbor] Hafen-Upgrade auf Stufe ${next}: ${nextData.label} (${nextData.ships} Schiffe)`);
		return { success: true, message: `Hafen auf ${nextData.label} aufgewertet! (${nextData.ships} Schiffe)` };
	}

	/**
	 * Gibt Upgrade-Info für den Hafen zurück
	 */
	function getHarborUpgradeInfo() {
		const current = state.harbor.level;
		const next = current + 1;
		const nextData = harborData.buildingLevels[String(next)];
		if (!nextData) return null;
		return {
			cost: nextData.upgradeCost,
			nextLevel: next,
			label: nextData.label,
			newShips: nextData.ships
		};
	}

	/**
	 * Gibt Upgrade-Info für ein Schiff zurück
	 */
	function getShipUpgradeInfo(shipIndex) {
		syncShips();
		if (shipIndex < 0 || shipIndex >= state.harbor.ships.length) return null;

		const ship = state.harbor.ships[shipIndex];
		const nextLevel = ship.upgradeLevel + 1;
		const nextData = harborData.shipUpgrades[String(nextLevel)];
		if (!nextData) return null;

		return {
			cost: nextData.cost,
			nextLevel,
			label: nextData.label,
			speedMult: nextData.speedMult,
			lootMult: nextData.lootMult
		};
	}

	/**
	 * Prüft ob Expeditionen fertig sind (für HUD-Notification)
	 */
	function hasCompletedExpeditions() {
		return state.harbor.ships.some(ship => {
			if (!ship.expedition) return false;
			const route = harborData.routes[ship.expedition.routeId];
			if (!route) return false;
			const upgradeData = harborData.shipUpgrades[String(ship.upgradeLevel)] || harborData.shipUpgrades['1'];
			const speedMult = upgradeData.speedMult * (ship.expedition.crewSpeedMult || 1);
			const adjustedDuration = route.duration / speedMult;
			return (Date.now() - ship.expedition.startedAt) >= adjustedDuration;
		});
	}

	/**
	 * Gibt Statistiken zurück
	 */
	function getStats() {
		return {
			totalExpeditions: state.harbor.totalExpeditions,
			totalGoldEarned: state.harbor.totalGoldEarned,
			activeExpeditions: state.harbor.ships.filter(s => s.expedition).length,
			level: state.harbor.level
		};
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
		getMaxShips,
		getShipData,
		getAllShips,
		getRoutes,
		startExpedition,
		collectExpedition,
		upgradeShip,
		upgradeHarbor,
		getHarborUpgradeInfo,
		getShipUpgradeInfo,
		hasCompletedExpeditions,
		getStats,
		formatTime,
		getHarborData: () => harborData
	};
}
