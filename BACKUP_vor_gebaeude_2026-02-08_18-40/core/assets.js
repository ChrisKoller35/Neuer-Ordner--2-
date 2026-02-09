// ============================================================
// ASSET LOADER - Sprite und Asset Management
// ============================================================

// Konfiguration - kann von außen überschrieben werden
let USE_WEBP_ASSETS = true;
let BASE_URL = null; // Wird beim ersten Aufruf gesetzt

// ============================================================
// ASSET MANAGER - Reference Counting und Caching
// ============================================================

/**
 * Asset-Eintrag mit Metadaten
 * @typedef {Object} AssetEntry
 * @property {HTMLImageElement} image - Das geladene Bild
 * @property {number} refCount - Anzahl aktiver Referenzen
 * @property {number} lastAccess - Zeitstempel des letzten Zugriffs
 * @property {string} path - Originaler Pfad
 * @property {boolean} loaded - Ob das Asset geladen ist
 * @property {string[]} groups - Gruppen zu denen das Asset gehört
 */

/** @type {Map<string, AssetEntry>} */
const assetCache = new Map();

/** @type {Map<string, Set<string>>} */
const assetGroups = new Map();

/** Maximale Inaktivitätszeit bevor Assets entladen werden können (5 Minuten) */
const ASSET_UNLOAD_THRESHOLD = 5 * 60 * 1000;

/**
 * Asset Manager für Reference Counting und Memory Management
 */
export const AssetManager = {
	/**
	 * Lädt ein Asset mit Caching und Reference Counting
	 * @param {string} path - Pfad zum Asset
	 * @param {string} [group] - Optionale Gruppe (z.B. "level1", "boss2")
	 * @returns {HTMLImageElement}
	 */
	load(path, group = null) {
		const normalizedPath = this._normalizePath(path);
		
		// Aus Cache holen falls vorhanden
		if (assetCache.has(normalizedPath)) {
			const entry = assetCache.get(normalizedPath);
			entry.refCount++;
			entry.lastAccess = performance.now();
			if (group && !entry.groups.includes(group)) {
				entry.groups.push(group);
				this._addToGroup(group, normalizedPath);
			}
			return entry.image;
		}
		
		// Neues Asset laden
		const image = loadSprite(path);
		const entry = {
			image,
			refCount: 1,
			lastAccess: performance.now(),
			path: normalizedPath,
			loaded: false,
			groups: group ? [group] : []
		};
		
		image.addEventListener('load', () => {
			entry.loaded = true;
		});
		
		assetCache.set(normalizedPath, entry);
		
		if (group) {
			this._addToGroup(group, normalizedPath);
		}
		
		return image;
	},
	
	/**
	 * Erhöht den Reference Count für ein Asset
	 * @param {string} path
	 */
	retain(path) {
		const normalizedPath = this._normalizePath(path);
		const entry = assetCache.get(normalizedPath);
		if (entry) {
			entry.refCount++;
			entry.lastAccess = performance.now();
		}
	},
	
	/**
	 * Verringert den Reference Count für ein Asset
	 * @param {string} path
	 */
	release(path) {
		const normalizedPath = this._normalizePath(path);
		const entry = assetCache.get(normalizedPath);
		if (entry) {
			entry.refCount = Math.max(0, entry.refCount - 1);
		}
	},
	
	/**
	 * Lädt alle Assets einer Gruppe
	 * @param {string} group - Gruppenname
	 * @param {string[]} paths - Array von Pfaden
	 * @returns {Promise<void>}
	 */
	async loadGroup(group, paths) {
		const promises = paths.map(path => {
			return new Promise((resolve, reject) => {
				const img = this.load(path, group);
				if (img.complete && img.naturalWidth > 0) {
					resolve();
				} else {
					img.onload = resolve;
					img.onerror = () => reject(new Error(`Failed to load: ${path}`));
				}
			});
		});
		await Promise.all(promises);
	},
	
	/**
	 * Gibt alle Assets einer Gruppe frei
	 * @param {string} group
	 */
	releaseGroup(group) {
		const paths = assetGroups.get(group);
		if (!paths) return;
		
		for (const path of paths) {
			this.release(path);
		}
	},
	
	/**
	 * Entlädt Assets ohne aktive Referenzen
	 * @param {boolean} [force=false] - Auch kürzlich verwendete Assets entladen
	 */
	cleanup(force = false) {
		const now = performance.now();
		const toDelete = [];
		
		for (const [path, entry] of assetCache) {
			if (entry.refCount <= 0) {
				if (force || (now - entry.lastAccess > ASSET_UNLOAD_THRESHOLD)) {
					// Asset für GC freigeben
					entry.image.src = '';
					toDelete.push(path);
				}
			}
		}
		
		for (const path of toDelete) {
			assetCache.delete(path);
			// Aus allen Gruppen entfernen
			for (const [, groupPaths] of assetGroups) {
				groupPaths.delete(path);
			}
		}
		
		return toDelete.length;
	},
	
	/**
	 * Holt ein gecachtes Asset
	 * @param {string} path
	 * @returns {HTMLImageElement|null}
	 */
	get(path) {
		const normalizedPath = this._normalizePath(path);
		const entry = assetCache.get(normalizedPath);
		if (entry) {
			entry.lastAccess = performance.now();
			return entry.image;
		}
		return null;
	},
	
	/**
	 * Prüft ob ein Asset geladen ist
	 * @param {string} path
	 * @returns {boolean}
	 */
	isLoaded(path) {
		const normalizedPath = this._normalizePath(path);
		const entry = assetCache.get(normalizedPath);
		return entry ? entry.loaded : false;
	},
	
	/**
	 * Prüft ob ein Asset gecacht ist
	 * @param {string} path
	 * @returns {boolean}
	 */
	isCached(path) {
		return assetCache.has(this._normalizePath(path));
	},
	
	/**
	 * Gibt Statistiken zurück
	 */
	getStats() {
		let totalSize = 0;
		let loadedCount = 0;
		let activeRefs = 0;
		
		for (const entry of assetCache.values()) {
			if (entry.loaded && entry.image.naturalWidth > 0) {
				loadedCount++;
				// Geschätzte Größe: width * height * 4 bytes (RGBA)
				totalSize += entry.image.naturalWidth * entry.image.naturalHeight * 4;
			}
			activeRefs += entry.refCount;
		}
		
		return {
			cachedAssets: assetCache.size,
			loadedAssets: loadedCount,
			activeReferences: activeRefs,
			estimatedMemoryMB: (totalSize / (1024 * 1024)).toFixed(2),
			groups: assetGroups.size
		};
	},
	
	/**
	 * Leert den gesamten Cache
	 */
	clearAll() {
		for (const entry of assetCache.values()) {
			entry.image.src = '';
		}
		assetCache.clear();
		assetGroups.clear();
	},
	
	// Private Hilfsmethoden
	_normalizePath(path) {
		return path.replace(/\\/g, '/').replace(/^\.\//, '');
	},
	
	_addToGroup(group, path) {
		if (!assetGroups.has(group)) {
			assetGroups.set(group, new Set());
		}
		assetGroups.get(group).add(path);
	}
};

// ============================================================
// Level-spezifische Asset-Definitionen
// ============================================================

/**
 * Asset-Gruppen für jedes Level
 */
export const LEVEL_ASSETS = {
	level1: [
		'./Backgroundlvlone.webp',
		'./Player.webp',
		'./foe-jelly.webp',
		'./boss-shark.webp',
		'./player-shot.webp'
	],
	level2: [
		'./Aquischwer-Bogenschreck.webp',
		'./Bodengold.webp',
		'./Parfüm-Kraken.webp'
	],
	level3: [
		'./Oktopus.webp',
		'./Oktopuspfeil.webp',
		'./Ritterfisch.webp',
		'./Bodenlava.webp'
	],
	level4: [
		'./Yachtwal.webp',
		'./Cashfish.webp'
	],
	common: [
		'./heal-potion.webp',
		'./Geldscheinsymbol.webp',
		'./Korallenbegleitereins.webp',
		'./Korallenbegleiterzwei.webp'
	]
};

/**
 * Lädt Assets für ein bestimmtes Level vor
 * @param {number} levelIndex - Level-Index (0-basiert)
 */
export async function preloadLevelAssets(levelIndex) {
	const levelKey = `level${levelIndex + 1}`;
	const assets = LEVEL_ASSETS[levelKey] || [];
	
	// Common Assets beim ersten Level laden
	if (levelIndex === 0) {
		await AssetManager.loadGroup('common', LEVEL_ASSETS.common);
	}
	
	await AssetManager.loadGroup(levelKey, assets);
}

/**
 * Gibt Assets eines abgeschlossenen Levels frei
 * @param {number} levelIndex
 */
export function releaseLevelAssets(levelIndex) {
	const levelKey = `level${levelIndex + 1}`;
	AssetManager.releaseGroup(levelKey);
}

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
