// ============================================================
// PLAYER ANIMATION - Zentrales Modul für die Spieler-Animation
// ============================================================
// Lädt die Animation einmal und stellt sie überall bereit.
// Wird von city/render.js und game/models.js verwendet.

import { createAnimationPlayer } from './animationLoader.js';

let _animPlayer = null;
let _loading = false;
let _lastTime = 0;

const ANIM_URL = new URL('./player_walk.anim.json', import.meta.url).href;

/**
 * Startet das Laden der Animation (wird nur einmal geladen)
 */
function ensureLoaded() {
	if (_animPlayer || _loading) return;
	_loading = true;
	createAnimationPlayer(ANIM_URL)
		.then(player => {
			player.play();
			player.loop = true;
			_animPlayer = player;
			_lastTime = performance.now();
			console.log('[PlayerAnim] Animation geladen!', player.data.totalFrames, 'Frames');
		})
		.catch(e => {
			console.error('[PlayerAnim] Fehler beim Laden:', e);
			_loading = false;
		});
}

/**
 * Gibt den AnimationPlayer zurück (oder null wenn noch nicht geladen)
 */
export function getPlayerAnimationPlayer() {
	ensureLoaded();
	return _animPlayer;
}

/**
 * Update mit aktueller Zeit aufrufen (1x pro Frame)
 */
export function updatePlayerAnimation() {
	if (!_animPlayer) return;
	const now = performance.now();
	const dt = now - _lastTime;
	_lastTime = now;
	_animPlayer.update(dt);
}

/**
 * Rendert den animierten Spieler
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Spieler X
 * @param {number} y - Spieler Y
 * @param {number} scale - Bild-Scale (z.B. 0.18 für City, 0.16 für Game)
 * @param {number} dir - Richtung (1 = rechts, -1 = links)
 * @param {object} opts - Optionen { bob, offsetX, offsetY, anchorBottom }
 * @returns {boolean} true wenn Animation gerendert wurde, false wenn Fallback nötig
 */
export function renderPlayerAnimation(ctx, x, y, scale, dir, opts = {}) {
	const player = getPlayerAnimationPlayer();
	if (!player || !player.data.image) return false;
	
	const imgW = player.data.image.width;
	const imgH = player.data.image.height;
	const drawW = imgW * scale;
	const drawH = imgH * scale;
	const renderScale = scale * (imgW / player.data.canvasWidth);
	
	const bob = opts.bob || 0;
	const offsetX = opts.offsetX || 0;
	const offsetY = opts.offsetY || 0;
	const anchorBottom = opts.anchorBottom !== false; // default: true
	
	ctx.save();
	ctx.translate(x + offsetX, y + offsetY);
	if (dir < 0) {
		ctx.scale(-1, 1);
	}
	
	if (anchorBottom) {
		// Anker unten (City-Modus): Bild hängt nach oben
		player.render(ctx, -drawW / 2, -drawH + bob, renderScale, false);
	} else {
		// Anker center (Game/Level-Modus): Bild ist zentriert
		player.render(ctx, -drawW / 2, -drawH / 2 + bob, renderScale, false);
	}
	
	ctx.restore();
	return true;
}

// Sofort laden starten
ensureLoaded();

export default { getPlayerAnimationPlayer, updatePlayerAnimation, renderPlayerAnimation };
