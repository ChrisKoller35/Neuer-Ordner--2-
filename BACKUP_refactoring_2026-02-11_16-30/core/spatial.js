// ============================================================
// SPATIAL GRID - Räumliche Partitionierung für Kollisionen
// ============================================================
// Beschleunigt Kollisionserkennung bei vielen Objekten durch
// Aufteilung des Spielfelds in Zellen

/**
 * Spatial Hash Grid für effiziente Kollisionsabfragen
 * Objekte werden in Zellen eingeteilt basierend auf Position
 */
export class SpatialGrid {
	/**
	 * @param {number} cellSize - Größe einer Zelle in Pixeln (typisch: 64-128)
	 * @param {number} width - Breite des Spielfelds
	 * @param {number} height - Höhe des Spielfelds
	 */
	constructor(cellSize = 64, width = 1200, height = 800) {
		this.cellSize = cellSize;
		this.width = width;
		this.height = height;
		this.cols = Math.ceil(width / cellSize);
		this.rows = Math.ceil(height / cellSize);
		
		/** @type {Map<string, Set<Object>>} */
		this._cells = new Map();
		
		/** @type {Map<Object, string[]>} */
		this._objectCells = new Map();
		
		this._queryCount = 0;
		this._insertCount = 0;
	}
	
	/**
	 * Berechnet den Cell-Key für eine Position
	 * @param {number} x
	 * @param {number} y
	 * @returns {string}
	 */
	_getCellKey(x, y) {
		const col = Math.floor(x / this.cellSize);
		const row = Math.floor(y / this.cellSize);
		return `${col},${row}`;
	}
	
	/**
	 * Holt alle Cell-Keys die ein Objekt überdeckt
	 * @param {number} x - Zentrum X
	 * @param {number} y - Zentrum Y
	 * @param {number} halfWidth - Halbe Breite (Radius X)
	 * @param {number} halfHeight - Halbe Höhe (Radius Y)
	 * @returns {string[]}
	 */
	_getCellKeys(x, y, halfWidth, halfHeight) {
		const keys = [];
		const minCol = Math.floor((x - halfWidth) / this.cellSize);
		const maxCol = Math.floor((x + halfWidth) / this.cellSize);
		const minRow = Math.floor((y - halfHeight) / this.cellSize);
		const maxRow = Math.floor((y + halfHeight) / this.cellSize);
		
		for (let col = minCol; col <= maxCol; col++) {
			for (let row = minRow; row <= maxRow; row++) {
				keys.push(`${col},${row}`);
			}
		}
		return keys;
	}
	
	/**
	 * Fügt ein Objekt in das Grid ein
	 * @param {Object} obj - Objekt mit x, y Position
	 * @param {number} [halfWidth=20] - Halbe Breite für Bounding Box
	 * @param {number} [halfHeight=20] - Halbe Höhe für Bounding Box
	 */
	insert(obj, halfWidth = 20, halfHeight = 20) {
		if (obj == null || obj.x == null || obj.y == null) return;
		
		this._insertCount++;
		
		// Alte Zellen entfernen falls Objekt bereits im Grid
		this.remove(obj);
		
		const keys = this._getCellKeys(obj.x, obj.y, halfWidth, halfHeight);
		this._objectCells.set(obj, keys);
		
		for (const key of keys) {
			if (!this._cells.has(key)) {
				this._cells.set(key, new Set());
			}
			this._cells.get(key).add(obj);
		}
	}
	
	/**
	 * Entfernt ein Objekt aus dem Grid
	 * @param {Object} obj
	 */
	remove(obj) {
		const keys = this._objectCells.get(obj);
		if (!keys) return;
		
		for (const key of keys) {
			const cell = this._cells.get(key);
			if (cell) {
				cell.delete(obj);
				if (cell.size === 0) {
					this._cells.delete(key);
				}
			}
		}
		this._objectCells.delete(obj);
	}
	
	/**
	 * Aktualisiert die Position eines Objekts
	 * @param {Object} obj
	 * @param {number} [halfWidth=20]
	 * @param {number} [halfHeight=20]
	 */
	update(obj, halfWidth = 20, halfHeight = 20) {
		this.insert(obj, halfWidth, halfHeight);
	}
	
	/**
	 * Findet alle Objekte in der Nähe eines Punktes
	 * @param {number} x
	 * @param {number} y
	 * @param {number} [radius=50] - Suchradius
	 * @returns {Object[]}
	 */
	queryPoint(x, y, radius = 50) {
		this._queryCount++;
		const keys = this._getCellKeys(x, y, radius, radius);
		const result = new Set();
		
		for (const key of keys) {
			const cell = this._cells.get(key);
			if (cell) {
				for (const obj of cell) {
					result.add(obj);
				}
			}
		}
		
		return Array.from(result);
	}
	
	/**
	 * Findet alle Objekte die ein Rechteck überlappen
	 * @param {number} x - Zentrum X
	 * @param {number} y - Zentrum Y
	 * @param {number} halfWidth
	 * @param {number} halfHeight
	 * @returns {Object[]}
	 */
	queryRect(x, y, halfWidth, halfHeight) {
		this._queryCount++;
		const keys = this._getCellKeys(x, y, halfWidth, halfHeight);
		const result = new Set();
		
		for (const key of keys) {
			const cell = this._cells.get(key);
			if (cell) {
				for (const obj of cell) {
					result.add(obj);
				}
			}
		}
		
		return Array.from(result);
	}
	
	/**
	 * Findet potenzielle Kollisionen für ein Objekt
	 * @param {Object} obj - Objekt mit x, y
	 * @param {number} [halfWidth=20]
	 * @param {number} [halfHeight=20]
	 * @returns {Object[]} - Andere Objekte die kollidieren könnten
	 */
	queryNearby(obj, halfWidth = 20, halfHeight = 20) {
		const candidates = this.queryRect(obj.x, obj.y, halfWidth, halfHeight);
		// Objekt selbst ausschließen
		return candidates.filter(c => c !== obj);
	}
	
	/**
	 * Leert das gesamte Grid
	 */
	clear() {
		this._cells.clear();
		this._objectCells.clear();
	}
	
	/**
	 * Baut das Grid mit einer Liste von Objekten neu auf
	 * @param {Object[]} objects - Array von Objekten mit x, y
	 * @param {Function} [getSizeFn] - Funktion (obj) => { halfWidth, halfHeight }
	 */
	rebuild(objects, getSizeFn = null) {
		this.clear();
		for (const obj of objects) {
			if (obj == null || obj.dead) continue;
			if (getSizeFn) {
				const size = getSizeFn(obj);
				this.insert(obj, size.halfWidth, size.halfHeight);
			} else {
				this.insert(obj);
			}
		}
	}
	
	/**
	 * Debug-Statistiken
	 */
	get stats() {
		let totalObjects = 0;
		for (const cell of this._cells.values()) {
			totalObjects += cell.size;
		}
		return {
			activeCells: this._cells.size,
			totalObjects: this._objectCells.size,
			objectSlots: totalObjects,
			queryCount: this._queryCount,
			insertCount: this._insertCount
		};
	}
	
	/**
	 * Setzt Statistik-Zähler zurück
	 */
	resetStats() {
		this._queryCount = 0;
		this._insertCount = 0;
	}
}

// ============================================================
// Vordefinierte Grids für verschiedene Spielobjekt-Typen
// ============================================================

/** Grid für Gegner (foes) */
export const foeGrid = new SpatialGrid(80, 1400, 900);

/** Grid für Projektile (shots, torpedoes, arrows) */
export const projectileGrid = new SpatialGrid(64, 1400, 900);

/** Grid für Boss-Angriffe */
export const bossAttackGrid = new SpatialGrid(96, 1400, 900);

/** Grid für Pickups (heals, coins, symbols) */
export const pickupGrid = new SpatialGrid(64, 1400, 900);

/**
 * Aktualisiert alle Grids basierend auf dem aktuellen Spielzustand
 * @param {Object} state - Spielzustand
 */
export function updateAllGrids(state) {
	// Foe Grid
	foeGrid.clear();
	for (const foe of state.foes) {
		if (foe.dead) continue;
		const hw = (foe.scale || 1) * 25;
		const hh = (foe.scale || 1) * 20;
		foeGrid.insert(foe, hw, hh);
	}
	
	// Projectile Grid
	projectileGrid.clear();
	for (const shot of state.shots) {
		projectileGrid.insert(shot, 12, 8);
	}
	for (const torpedo of state.bossTorpedoes) {
		projectileGrid.insert(torpedo, torpedo.radius || 18, torpedo.radius || 18);
	}
	for (const arrow of state.foeArrows || []) {
		projectileGrid.insert(arrow, 10, 6);
	}
	
	// Boss Attack Grid
	bossAttackGrid.clear();
	for (const sweep of state.bossSweeps || []) {
		bossAttackGrid.insert(sweep, 60, 40);
	}
	for (const wave of state.bossWakeWaves || []) {
		bossAttackGrid.insert(wave, 80, 60);
	}
	for (const whirl of state.bossWhirlpools || []) {
		if (!whirl.dead) {
			bossAttackGrid.insert(whirl, whirl.radius || 80, whirl.radius || 80);
		}
	}
	
	// Pickup Grid
	pickupGrid.clear();
	for (const heal of state.healPickups || []) {
		pickupGrid.insert(heal, 18, 18);
	}
	for (const coin of state.coinDrops || []) {
		pickupGrid.insert(coin, 14, 14);
	}
	for (const symbol of state.symbolDrops || []) {
		if (!symbol.collected) {
			pickupGrid.insert(symbol, 20, 20);
		}
	}
}

/**
 * Findet Gegner in der Nähe eines Punktes
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @returns {Object[]}
 */
export function queryFoesNear(x, y, radius) {
	return foeGrid.queryPoint(x, y, radius);
}

/**
 * Findet Projektile in der Nähe eines Punktes
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @returns {Object[]}
 */
export function queryProjectilesNear(x, y, radius) {
	return projectileGrid.queryPoint(x, y, radius);
}

/**
 * Findet Boss-Angriffe in der Nähe eines Punktes
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @returns {Object[]}
 */
export function queryBossAttacksNear(x, y, radius) {
	return bossAttackGrid.queryPoint(x, y, radius);
}

/**
 * Findet Pickups in der Nähe eines Punktes
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @returns {Object[]}
 */
export function queryPickupsNear(x, y, radius) {
	return pickupGrid.queryPoint(x, y, radius);
}

/**
 * Leert alle Grids (für Level-Wechsel)
 */
export function clearAllGrids() {
	foeGrid.clear();
	projectileGrid.clear();
	bossAttackGrid.clear();
	pickupGrid.clear();
}

/**
 * Debug: Gibt Statistiken aller Grids aus
 */
export function getGridStats() {
	return {
		foes: foeGrid.stats,
		projectiles: projectileGrid.stats,
		bossAttacks: bossAttackGrid.stats,
		pickups: pickupGrid.stats
	};
}
