// ============================================================
// ASSET LOADER - Sprite und Asset Management
// ============================================================

// Konfiguration - kann von außen überschrieben werden
let USE_WEBP_ASSETS = true;
let BASE_URL = null; // Wird beim ersten Aufruf gesetzt

/**
 * Konfiguriert den Asset Loader
 * @param {Object} config - Konfiguration
 * @param {boolean} [config.useWebP=true] - Ob WebP bevorzugt werden soll
 * @param {string} [config.baseUrl] - Basis-URL für Assets
 */
export function configureAssetLoader(config = {}) {
	if (typeof config.useWebP === 'boolean') {
		USE_WEBP_ASSETS = config.useWebP;
	}
	if (config.baseUrl) {
		BASE_URL = config.baseUrl;
	}
}

/**
 * Lädt ein Sprite mit automatischem WebP/PNG Fallback
 * Kompatibel mit der originalen game.js Implementierung
 * @param {string} relativePath - Relativer Pfad zum Bild
 * @param {string} [callerUrl] - import.meta.url des aufrufenden Moduls
 * @returns {HTMLImageElement}
 */
export function loadSprite(relativePath, callerUrl = null) {
	const img = new Image();
	let fallbackApplied = false;
	
	// Primärer Pfad: .webp wenn aktiviert, sonst original
	const primaryPath = USE_WEBP_ASSETS 
		? relativePath.replace(/\.png$/i, ".webp") 
		: relativePath;
	
	// URL basierend auf Kontext erstellen
	let primarySrc;
	if (callerUrl) {
		primarySrc = new URL(primaryPath, callerUrl).href;
	} else if (BASE_URL) {
		primarySrc = new URL(primaryPath, BASE_URL).href;
	} else {
		primarySrc = primaryPath;
	}
	
	// Fallback bei Fehler
	img.addEventListener("error", () => {
		if (fallbackApplied) return;
		fallbackApplied = true;
		
		const normalized = relativePath.startsWith("./") 
			? relativePath.slice(2) 
			: relativePath;
		const fallbackPath = USE_WEBP_ASSETS 
			? normalized.replace(/\.webp$/i, ".png") 
			: normalized;
		
		// Fallback über document.baseURI
		img.src = new URL(`./src/${fallbackPath}`, document.baseURI).href;
	});
	
	img.src = primarySrc;
	return img;
}

/**
 * Lädt ein WebP-Bild mit PNG-Fallback (Legacy-Kompatibilität)
 * @param {string} basePath - Basis-Pfad ohne Erweiterung
 * @param {boolean} useWebP - Ob WebP bevorzugt werden soll
 * @returns {HTMLImageElement}
 */
export function loadSpriteWithFallback(basePath, useWebP = true) {
	const extension = useWebP ? '.webp' : '.png';
	return loadSprite(basePath + extension);
}

/**
 * Prüft ob ein Sprite geladen und bereit ist
 * @param {HTMLImageElement} sprite - Das Sprite
 * @returns {boolean}
 */
export function spriteReady(sprite) {
	return !!(sprite && sprite.complete && sprite.naturalWidth > 0 && sprite.naturalHeight > 0);
}

/**
 * Lädt mehrere Sprites parallel
 * @param {Object<string, string>} spriteMap - Map von Name zu Pfad
 * @returns {Promise<Object<string, HTMLImageElement>>}
 */
export async function loadSprites(spriteMap) {
	const entries = Object.entries(spriteMap);
	const promises = entries.map(([name, src]) => {
		return new Promise((resolve, reject) => {
			const img = loadSprite(src);
			img.onload = () => resolve([name, img]);
			img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
		});
	});
	
	const results = await Promise.all(promises);
	return Object.fromEntries(results);
}

/**
 * Preloads eine Liste von Sprite-Pfaden
 * @param {string[]} paths - Array von Pfaden
 * @returns {Promise<HTMLImageElement[]>}
 */
export function preloadSprites(paths) {
	return Promise.all(paths.map(path => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(`Failed to preload: ${path}`));
			img.src = path;
		});
	}));
}

/**
 * Erstellt ein Sprite-Sheet-Frame-Extraktor
 * @param {HTMLImageElement} sheet - Das Sprite-Sheet
 * @param {number} frameWidth - Breite eines Frames
 * @param {number} frameHeight - Höhe eines Frames
 * @returns {Function} Funktion zum Zeichnen eines Frames
 */
export function createSpriteSheetDrawer(sheet, frameWidth, frameHeight) {
	const cols = Math.floor(sheet.naturalWidth / frameWidth);
	
	return function drawFrame(ctx, frameIndex, x, y, scale = 1) {
		const col = frameIndex % cols;
		const row = Math.floor(frameIndex / cols);
		
		ctx.drawImage(
			sheet,
			col * frameWidth, row * frameHeight, frameWidth, frameHeight,
			x, y, frameWidth * scale, frameHeight * scale
		);
	};
}
