/**
 * Input-Hilfsfunktionen
 * Reine Funktionen für Tastatur-/Maus-Erkennung
 */
import {
	KEY_SHIELD, CODE_SHIELD,
	KEY_CORAL, CODE_CORAL,
	KEY_TSUNAMI, CODE_TSUNAMI,
	KEY_DASH_CURRENT, CODE_DASH_CURRENT,
	KEY_DEPTH_MINE, CODE_DEPTH_MINE,
	KEY_TIME_BUBBLE, CODE_TIME_BUBBLE
} from '../core/constants.js';

/**
 * Erstellt Input-System mit Zugriff auf das Key-Set
 * @param {Set} keys - Aktuell gedrückte Tasten
 */
export function createInputHelpers(keys) {
	/** Prüft ob eine der Tasten aus keySet gedrückt ist */
	function hasKey(keySet) {
		for (const key of keySet) {
			if (keys.has(key)) return true;
		}
		return false;
	}

	return { hasKey };
}

/** Prüft ob das Event eine Schild-Taste ist */
export function isShieldActivationKey(event) {
	if (!event) return false;
	if (KEY_SHIELD.has(event.key)) return true;
	return CODE_SHIELD.has(event.code || "");
}

/** Prüft ob das Event eine Korallen-Taste ist */
export function isCoralActivationKey(event) {
	if (!event) return false;
	if (KEY_CORAL.has(event.key)) return true;
	return CODE_CORAL.has(event.code || "");
}

/** Prüft ob das Event eine Tsunami-Taste ist */
export function isTsunamiActivationKey(event) {
	if (!event) return false;
	if (KEY_TSUNAMI.has(event.key)) return true;
	return CODE_TSUNAMI.has(event.code || "");
}

/** Prüft ob das Event eine Strömungs-Dash-Taste ist */
export function isDashCurrentActivationKey(event) {
	if (!event) return false;
	if (KEY_DASH_CURRENT.has(event.key)) return true;
	return CODE_DASH_CURRENT.has(event.code || "");
}

/** Prüft ob das Event eine Tiefsee-Mine-Taste ist */
export function isDepthMineActivationKey(event) {
	if (!event) return false;
	if (KEY_DEPTH_MINE.has(event.key)) return true;
	return CODE_DEPTH_MINE.has(event.code || "");
}

/** Prüft ob das Event eine Zeit-Blase-Taste ist */
export function isTimeBubbleActivationKey(event) {
	if (!event) return false;
	if (KEY_TIME_BUBBLE.has(event.key)) return true;
	return CODE_TIME_BUBBLE.has(event.code || "");
}

/** Prüft ob das Event ein Stadt-Shortcut-Kandidat ist (Taste 5) */
export function isCityShortcutCandidate(event) {
	if (!event) return false;
	return event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
}

/** Prüft ob das Event den Stadt-Shortcut auslöst */
export function isCityShortcut(event, currentMode) {
	if (!event) return false;
	// Nie aus dem Dungeon heraus zur Stadt teleportieren
	if (currentMode === "dungeon" || currentMode === "dungeon_menu") return false;
	const isFive = event.code === "Digit5" || event.code === "Numpad5" || event.key === "5" || event.key === "%";
	if (!isFive) return false;
	if (event.altKey && event.shiftKey) return true;
	if (event.ctrlKey || event.metaKey) return false;
	return currentMode !== "city";
}
