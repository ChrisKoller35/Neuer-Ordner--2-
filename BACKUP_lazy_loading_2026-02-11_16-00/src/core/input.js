// ============================================================
// INPUT - Eingabe-Handler
// ============================================================

import {
	KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN,
	KEY_SHIELD, CODE_SHIELD,
	KEY_CORAL, CODE_CORAL,
	KEY_TSUNAMI, CODE_TSUNAMI,
	KEY_SHOOT, CODE_SHOOT
} from './constants.js';

/**
 * Eingabe-Zustand
 */
export const inputState = {
	left: false,
	right: false,
	up: false,
	down: false,
	shoot: false,
	shield: false,
	coral: false,
	tsunami: false
};

/**
 * Prüft ob eine Taste einer Key-Set entspricht
 * @param {string} key - Die Taste
 * @param {Set} keySet - Das Set mit gültigen Tasten
 * @returns {boolean}
 */
function matchesKey(key, keySet) {
	return keySet.has(key);
}

/**
 * Prüft ob ein Code einer Code-Set entspricht
 * @param {string} code - Der Tastatur-Code
 * @param {Set} codeSet - Das Set mit gültigen Codes
 * @returns {boolean}
 */
function matchesCode(code, codeSet) {
	return codeSet.has(code);
}

/**
 * Verarbeitet ein KeyDown-Event
 * @param {KeyboardEvent} e - Das Keyboard-Event
 */
export function handleKeyDown(e) {
	const key = e.key;
	const code = e.code;
	
	if (matchesKey(key, KEY_LEFT)) inputState.left = true;
	if (matchesKey(key, KEY_RIGHT)) inputState.right = true;
	if (matchesKey(key, KEY_UP)) inputState.up = true;
	if (matchesKey(key, KEY_DOWN)) inputState.down = true;
	if (matchesKey(key, KEY_SHOOT) || matchesCode(code, CODE_SHOOT)) inputState.shoot = true;
	if (matchesKey(key, KEY_SHIELD) || matchesCode(code, CODE_SHIELD)) inputState.shield = true;
	if (matchesKey(key, KEY_CORAL) || matchesCode(code, CODE_CORAL)) inputState.coral = true;
	if (matchesKey(key, KEY_TSUNAMI) || matchesCode(code, CODE_TSUNAMI)) inputState.tsunami = true;
}

/**
 * Verarbeitet ein KeyUp-Event
 * @param {KeyboardEvent} e - Das Keyboard-Event
 */
export function handleKeyUp(e) {
	const key = e.key;
	const code = e.code;
	
	if (matchesKey(key, KEY_LEFT)) inputState.left = false;
	if (matchesKey(key, KEY_RIGHT)) inputState.right = false;
	if (matchesKey(key, KEY_UP)) inputState.up = false;
	if (matchesKey(key, KEY_DOWN)) inputState.down = false;
	if (matchesKey(key, KEY_SHOOT) || matchesCode(code, CODE_SHOOT)) inputState.shoot = false;
	if (matchesKey(key, KEY_SHIELD) || matchesCode(code, CODE_SHIELD)) inputState.shield = false;
	if (matchesKey(key, KEY_CORAL) || matchesCode(code, CODE_CORAL)) inputState.coral = false;
	if (matchesKey(key, KEY_TSUNAMI) || matchesCode(code, CODE_TSUNAMI)) inputState.tsunami = false;
}

/**
 * Setzt alle Eingaben zurück
 */
export function resetInput() {
	inputState.left = false;
	inputState.right = false;
	inputState.up = false;
	inputState.down = false;
	inputState.shoot = false;
	inputState.shield = false;
	inputState.coral = false;
	inputState.tsunami = false;
}

/**
 * Gibt die Bewegungsrichtung zurück
 * @returns {{ x: number, y: number }} Normalisierte Bewegungsrichtung
 */
export function getMovementDirection() {
	let dx = 0;
	let dy = 0;
	
	if (inputState.left) dx -= 1;
	if (inputState.right) dx += 1;
	if (inputState.up) dy -= 1;
	if (inputState.down) dy += 1;
	
	// Normalisieren für diagonale Bewegung
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len > 0) {
		dx /= len;
		dy /= len;
	}
	
	return { x: dx, y: dy };
}

/**
 * Registriert die Event-Listener
 * @param {Window} win - Das Window-Objekt
 */
export function registerInputListeners(win = window) {
	win.addEventListener('keydown', handleKeyDown);
	win.addEventListener('keyup', handleKeyUp);
	win.addEventListener('blur', resetInput);
}

/**
 * Entfernt die Event-Listener
 * @param {Window} win - Das Window-Objekt
 */
export function unregisterInputListeners(win = window) {
	win.removeEventListener('keydown', handleKeyDown);
	win.removeEventListener('keyup', handleKeyUp);
	win.removeEventListener('blur', resetInput);
}
