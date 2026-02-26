// ============================================================
// MARKET SYSTEM - Marktplatz mit Daily Deals & erweitertem Sortiment
// ============================================================
// Der Marktplatz bietet ein breiteres Sortiment als der Stadt-Händler:
// Verbrauchsgüter, Fallen, Dungeon-Tools, Spezialitäten
// Plus 1 tägliches reduziertes Sonderangebot
"use strict";

import marketData from '../data/market.json';
import itemsData from '../data/items.json';

const CITY_MARKET_SIZE = 5;
const CITY_MARKET_RARITY_WEIGHTS = {
	'Gewöhnlich': 0.6,
	'Selten': 0.3,
	'Episch': 0.1
};

const CITY_MARKET_ALLOWED_CATEGORIES = new Set(['weapon', 'armor', 'utility', 'economy', 'companion']);

/**
 * Erstellt das Market-System
 * @param {Object} ctx
 * @param {Object} ctx.state - Spielzustand
 * @param {Function} ctx.getInventory - Liefert das Spieler-Inventar
 * @returns {Object} Market-System API
 */
export function createMarketSystem(ctx) {
	const { state, getInventory } = ctx;

	// Market-State initialisieren
	if (!state.market) {
		state.market = {
			lastDailyDealDate: null,
			dailyDealItemId: null,
			shopRotationSeed: null,
			shopRotationIds: [],
			purchaseHistory: {} // itemId -> Anzahl gekauft (für Statistik)
		};
	}

	if (!Number.isFinite(state.market.shopRotationSeed)) {
		state.market.shopRotationSeed = Math.floor(Math.random() * 0x7fffffff);
	}

	/**
	 * Berechnet den heutigen Daily-Deal-Seed aus dem Datum
	 * Gleicher Tag = gleiches Angebot (deterministisch)
	 */
	function getDailySeed() {
		const now = new Date();
		return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
	}

	/**
	 * Einfacher Seed-basierter Pseudo-Zufall
	 */
	function seededRandom(seed) {
		let s = seed;
		s = (s ^ (s << 13)) & 0xFFFFFFFF;
		s = (s ^ (s >> 17)) & 0xFFFFFFFF;
		s = (s ^ (s << 5)) & 0xFFFFFFFF;
		return ((s & 0xFFFFFFFF) >>> 0) / 0xFFFFFFFF;
	}

	function getItemPool() {
		return Object.values(itemsData.items || {}).filter(item => (
			item &&
			CITY_MARKET_ALLOWED_CATEGORIES.has(item.category) &&
			item.category !== 'dungeon'
		));
	}

	function buildRarityPlan(total = CITY_MARKET_SIZE) {
		const common = Math.max(0, Math.round(total * CITY_MARKET_RARITY_WEIGHTS['Gewöhnlich']));
		const rare = Math.max(0, Math.floor(total * CITY_MARKET_RARITY_WEIGHTS['Selten']));
		const epic = Math.max(0, total - common - rare);
		return {
			'Gewöhnlich': common,
			'Selten': rare,
			'Episch': epic
		};
	}

	function shuffleWithSeed(list, seedObj) {
		const arr = [...list];
		for (let i = arr.length - 1; i > 0; i--) {
			const roll = seededRandom(seedObj.value++);
			const j = Math.floor(roll * (i + 1));
			const tmp = arr[i];
			arr[i] = arr[j];
			arr[j] = tmp;
		}
		return arr;
	}

	function ensureCityShopRotation() {
		const existing = Array.isArray(state.market.shopRotationIds) ? state.market.shopRotationIds : [];
		if (existing.length === CITY_MARKET_SIZE) return;

		const pool = getItemPool();
		if (pool.length === 0) {
			state.market.shopRotationIds = [];
			return;
		}

		const rarityPlan = buildRarityPlan(CITY_MARKET_SIZE);
		const seedObj = { value: (state.market.shopRotationSeed >>> 0) || 1 };
		const selected = [];
		const selectedIds = new Set();

		for (const [rarity, targetCount] of Object.entries(rarityPlan)) {
			const rarityPool = shuffleWithSeed(
				pool.filter(item => item.rarity === rarity && !selectedIds.has(item.id)),
				seedObj
			);
			for (let i = 0; i < targetCount && i < rarityPool.length; i++) {
				const chosen = rarityPool[i];
				selected.push(chosen);
				selectedIds.add(chosen.id);
			}
		}

		if (selected.length < CITY_MARKET_SIZE) {
			const remaining = shuffleWithSeed(pool.filter(item => !selectedIds.has(item.id)), seedObj);
			while (selected.length < CITY_MARKET_SIZE && remaining.length > 0) {
				const candidate = remaining.shift();
				if (candidate) {
					selected.push(candidate);
					selectedIds.add(candidate.id);
				}
			}
		}

		state.market.shopRotationIds = selected.slice(0, CITY_MARKET_SIZE).map(item => item.id);
	}

	function getRotatedItems() {
		ensureCityShopRotation();
		const byId = new Map(Object.values(itemsData.items || {}).map(item => [item.id, item]));
		return state.market.shopRotationIds
			.map(id => byId.get(id))
			.filter(Boolean);
	}

	/**
	 * Gibt den heutigen Daily Deal zurück
	 * @returns {{ item: Object, originalPrice: number, dealPrice: number, discount: number }}
	 */
	function getDailyDeal() {
		const seed = getDailySeed();
		const pool = getRotatedItems().map(item => item.id);
		if (pool.length === 0) return null;
		const discount = marketData.dailyDeal.discountPercent;

		// Deterministisch ein Item aus dem Pool wählen
		const index = Math.floor(seededRandom(seed) * pool.length);
		const itemId = pool[index];

		// Item-Daten finden
		const item = findItemById(itemId);
		if (!item) return null;

		const originalPrice = item.price;
		const dealPrice = Math.floor(originalPrice * (1 - discount / 100));

		return {
			item,
			originalPrice,
			dealPrice,
			discount,
			seed
		};
	}

	/**
	 * Findet ein Item anhand seiner ID über alle Kategorien
	 * @param {string} itemId
	 * @returns {Object|null}
	 */
	function findItemById(itemId) {
		const byId = new Map(Object.values(itemsData.items || {}).map(item => [item.id, item]));
		return byId.get(itemId) || null;
	}

	/**
	 * Gibt alle Kategorien mit Items zurück
	 * @returns {Array<{ key, label, icon, items }>}
	 */
	function getCategories() {
		return [{
			key: 'consumables',
			label: 'Rotation',
			icon: '🛒',
			items: getRotatedItems()
		}];
	}

	/**
	 * Prüft ob ein Item gekauft werden kann
	 * @param {string} itemId
	 * @param {boolean} isDailyDeal
	 * @returns {{ canBuy: boolean, reason: string, price: number }}
	 */
	function canBuyItem(itemId, isDailyDeal = false) {
		const item = findItemById(itemId);
		if (!item) return { canBuy: false, reason: 'Item nicht gefunden.', price: 0 };

		let price = item.price;
		if (isDailyDeal) {
			const deal = getDailyDeal();
			if (deal && deal.item.id === itemId) {
				price = deal.dealPrice;
			}
		}

		const coins = state.coins || 0;
		if (coins < price) {
			return { canBuy: false, reason: `Nicht genug Gold! (${coins.toLocaleString('de-DE')}/${price.toLocaleString('de-DE')})`, price };
		}

		// Inventar-Platz prüfen
		const inventory = getInventory();
		const freeSlot = inventory.items.findIndex(s => s === null);
		if (freeSlot === -1) {
			return { canBuy: false, reason: 'Inventar voll!', price };
		}

		return { canBuy: true, reason: '', price };
	}

	/**
	 * Kauft ein Item vom Markt
	 * @param {string} itemId
	 * @param {boolean} isDailyDeal
	 * @returns {{ success: boolean, message: string }}
	 */
	function buyItem(itemId, isDailyDeal = false) {
		const check = canBuyItem(itemId, isDailyDeal);
		if (!check.canBuy) {
			return { success: false, message: check.reason };
		}

		const item = findItemById(itemId);
		
		// Gold abziehen
		state.coins -= check.price;

		// Item ins Inventar legen
		const inventory = getInventory();
		const freeSlot = inventory.items.findIndex(s => s === null);
		inventory.items[freeSlot] = item.label;

		// Kaufhistorie
		if (!state.market.purchaseHistory[itemId]) {
			state.market.purchaseHistory[itemId] = 0;
		}
		state.market.purchaseHistory[itemId]++;

		console.log(`[Market] Gekauft: ${item.label} für ${check.price} Gold`);

		return {
			success: true,
			message: `${item.label} gekauft!`
		};
	}

	/**
	 * Formatiert Gold
	 */
	function formatGold(amount) {
		return amount.toLocaleString('de-DE');
	}

	return {
		getDailyDeal,
		findItemById,
		getCategories,
		canBuyItem,
		buyItem,
		formatGold,
		getMarketData: () => marketData
	};
}
