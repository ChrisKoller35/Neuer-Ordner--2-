// ============================================================
// SEEDED PRNG — Deterministic Random für Dungeon-Generierung
// ============================================================
// Mulberry32: Schneller 32-bit PRNG, gleicher Seed → gleiche Sequenz
"use strict";

/**
 * Erzeugt einen seedbaren Zufallsgenerator (Mulberry32)
 * @param {number|string} seed - Numerischer Seed oder String (wird gehasht)
 * @returns {Object} PRNG API
 */
export function createSeededRandom(seed) {
	let s = typeof seed === "string" ? hashString(seed) : Math.floor(seed) >>> 0;

	/** Nächste Zufallszahl [0, 1) */
	function next() {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Ganzzahl im Bereich [min, max] (inklusive) */
	function nextInt(min, max) {
		return min + Math.floor(next() * (max - min + 1));
	}

	/** Float im Bereich [min, max) */
	function nextFloat(min, max) {
		return min + next() * (max - min);
	}

	/** Zufälliges Element aus einem Array */
	function pick(arr) {
		if (!arr || arr.length === 0) return null;
		return arr[Math.floor(next() * arr.length)];
	}

	/** Gewichtete Auswahl: items = [{ weight, ...rest }] */
	function pickWeighted(items) {
		if (!items || items.length === 0) return null;
		const totalWeight = items.reduce((sum, it) => sum + (it.weight || 1), 0);
		let roll = next() * totalWeight;
		for (const item of items) {
			roll -= item.weight || 1;
			if (roll <= 0) return item;
		}
		return items[items.length - 1];
	}

	/** Fisher-Yates Shuffle (in-place, gibt Array zurück) */
	function shuffle(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(next() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	/** Boolean mit Wahrscheinlichkeit p (0–1) */
	function chance(p) {
		return next() < p;
	}

	return { next, nextInt, nextFloat, pick, pickWeighted, shuffle, chance, getSeed: () => seed };
}

/**
 * Einfacher String-Hash (DJB2)
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}
