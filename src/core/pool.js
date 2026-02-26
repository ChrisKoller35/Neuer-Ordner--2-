// ============================================================
// OBJECT POOL - Object reuse
// ============================================================
// Prevents garbage collection stutter through object recycling

/**
 * Generic Object Pool for frequently created/deleted objects
 * @template T
 */
export class ObjectPool {
	/**
	 * @param {() => T} factory - Function that creates new objects
	 * @param {(obj: T) => void} [reset] - Optional: function to reset an object
	 * @param {number} [initialSize=0] - Number of pre-allocated objects
	 */
	constructor(factory, reset = null, initialSize = 0) {
		/** @type {T[]} */
		this._pool = [];
		this._factory = factory;
		this._reset = reset;
		this._acquired = 0;
		this._created = 0;
		
		// Pre-allocate
		for (let i = 0; i < initialSize; i++) {
			this._pool.push(factory());
			this._created++;
		}
	}
	
	/**
	 * Acquires an object from the pool (or creates a new one)
	 * @returns {T}
	 */
	acquire() {
		this._acquired++;
		if (this._pool.length > 0) {
			return this._pool.pop();
		}
		this._created++;
		return this._factory();
	}
	
	/**
	 * Returns an object back to the pool
	 * @param {T} obj
	 */
	release(obj) {
		if (obj == null) return;
		if (this._reset) {
			this._reset(obj);
		}
		this._pool.push(obj);
	}
	
	/**
	 * Returns multiple objects
	 * @param {T[]} objects
	 */
	releaseAll(objects) {
		for (const obj of objects) {
			this.release(obj);
		}
	}
	
	/**
	 * Current pool size (available objects)
	 */
	get available() {
		return this._pool.length;
	}
	
	/**
	 * Debug statistics
	 */
	get stats() {
		return {
			available: this._pool.length,
			totalCreated: this._created,
			totalAcquired: this._acquired,
			reuseRate: this._acquired > 0 
				? `${((this._acquired - this._created) / this._acquired * 100).toFixed(1)  }%`
				: '0%'
		};
	}
	
	/**
	 * Clear pool (for level changes etc.)
	 */
	clear() {
		this._pool.length = 0;
	}
}

// ============================================================
// Pre-defined pools for common game objects
// ============================================================

/**
 * Shot (player projectile) Pool
 */
export const shotPool = new ObjectPool(
	// Factory
	() => ({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		damage: 1,
		life: 0,
		spriteScale: 0.1,
		spriteOffsetX: 6,
		spriteOffsetY: 0,
		coralShot: false,
		_pooled: true
	}),
	// Reset
	(shot) => {
		shot.x = 0;
		shot.y = 0;
		shot.vx = 0;
		shot.vy = 0;
		shot.damage = 1;
		shot.life = 0;
		shot.spriteScale = 0.1;
		shot.spriteOffsetX = 6;
		shot.spriteOffsetY = 0;
		shot.coralShot = false;
	},
	// Initial size
	20
);

/**
 * Foe (enemy) Pool
 */
export const foePool = new ObjectPool(
	// Factory
	() => ({
		type: '',
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		hp: 1,
		maxHp: 1,
		dead: false,
		scale: 1,
		dir: -1,
		anim: 0,
		hitFlash: 0,
		deathAnim: 0,
		coinValue: 0,
		// Typ-spezifische Properties
		attackTimer: 0,
		attacking: false,
		chargePhase: null,
		chargeTimer: 0,
		lungeVx: 0,
		lungeVy: 0,
		shieldActive: false,
		rageMode: false,
		ragePulse: 0,
		jellyState: 'idle',
		jellyTimer: 0,
		jellyDir: 0,
		hoverPhase: 0,
		hoverBaseY: 0,
		_pooled: true
	}),
	// Reset
	(foe) => {
		foe.type = '';
		foe.x = 0;
		foe.y = 0;
		foe.vx = 0;
		foe.vy = 0;
		foe.hp = 1;
		foe.maxHp = 1;
		foe.dead = false;
		foe.scale = 1;
		foe.dir = -1;
		foe.anim = 0;
		foe.hitFlash = 0;
		foe.deathAnim = 0;
		foe.coinValue = 0;
		foe.attackTimer = 0;
		foe.attacking = false;
		foe.chargePhase = null;
		foe.chargeTimer = 0;
		foe.lungeVx = 0;
		foe.lungeVy = 0;
		foe.shieldActive = false;
		foe.rageMode = false;
		foe.ragePulse = 0;
		foe.jellyState = 'idle';
		foe.jellyTimer = 0;
		foe.jellyDir = 0;
		foe.hoverPhase = 0;
		foe.hoverBaseY = 0;
	},
	// Initial size
	30
);

/**
 * Boss Torpedo Pool
 */
export const bossTorpedoPool = new ObjectPool(
	() => ({
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		targetY: 0,
		homing: false,
		homingStrength: 0,
		homingDecay: 1,
		life: 0,
		trailTimer: 0,
		_pooled: true
	}),
	(t) => {
		t.x = 0;
		t.y = 0;
		t.vx = 0;
		t.vy = 0;
		t.targetY = 0;
		t.homing = false;
		t.homingStrength = 0;
		t.homingDecay = 1;
		t.life = 0;
		t.trailTimer = 0;
	},
	10
);

/**
 * Boss Wake Wave Pool
 */
export const bossWakeWavePool = new ObjectPool(
	() => ({
		x: 0,
		y: 0,
		radius: 0,
		maxRadius: 0,
		speed: 0,
		thickness: 0,
		alpha: 1,
		stage: 'expand',
		cleanupTimer: 0,
		dead: false,
		_pooled: true
	}),
	(w) => {
		w.x = 0;
		w.y = 0;
		w.radius = 0;
		w.maxRadius = 0;
		w.speed = 0;
		w.thickness = 0;
		w.alpha = 1;
		w.stage = 'expand';
		w.cleanupTimer = 0;
		w.dead = false;
	},
	5
);

/**
 * Coral Effect Pool
 */
export const coralEffectPool = new ObjectPool(
	() => ({
		kind: '',
		x: 0,
		y: 0,
		life: 0,
		maxLife: 0,
		startRadius: 0,
		endRadius: 0,
		startLine: 0,
		endLine: 0,
		startAlpha: 0,
		endAlpha: 0,
		mode: '',
		_pooled: true
	}),
	(e) => {
		e.kind = '';
		e.x = 0;
		e.y = 0;
		e.life = 0;
		e.maxLife = 0;
		e.startRadius = 0;
		e.endRadius = 0;
		e.startLine = 0;
		e.endLine = 0;
		e.startAlpha = 0;
		e.endAlpha = 0;
		e.mode = '';
	},
	20
);

/**
 * Heal Pickup Pool
 */
export const healPickupPool = new ObjectPool(
	() => ({
		x: 0,
		y: 0,
		vy: 0,
		sway: 0,
		life: 0,
		scale: 1,
		spriteScale: 0.1,
		_pooled: true
	}),
	(h) => {
		h.x = 0;
		h.y = 0;
		h.vy = 0;
		h.sway = 0;
		h.life = 0;
		h.scale = 1;
		h.spriteScale = 0.1;
	},
	10
);

/**
 * Symbol Drop Pool
 */
export const symbolDropPool = new ObjectPool(
	() => ({
		symbolKey: '',
		x: 0,
		y: 0,
		vy: 0,
		vx: 0,
		scale: 1,
		life: 0,
		collected: false,
		cleanupTimer: null,
		_pooled: true
	}),
	(s) => {
		s.symbolKey = '';
		s.x = 0;
		s.y = 0;
		s.vy = 0;
		s.vx = 0;
		s.scale = 1;
		s.life = 0;
		s.collected = false;
		s.cleanupTimer = null;
	},
	20
);

/**
 * Foe Arrow Pool (Oktopus-Bolts, Bogenschreck-Pfeile)
 */
export const foeArrowPool = new ObjectPool(
	() => ({
		type: '',
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		life: 0,
		rotation: 0,
		scale: 1,
		_pooled: true
	}),
	(a) => {
		a.type = '';
		a.x = 0;
		a.y = 0;
		a.vx = 0;
		a.vy = 0;
		a.life = 0;
		a.rotation = 0;
		a.scale = 1;
	},
	15
);

// ============================================================
// Helper: Pool statistics for debugging
// ============================================================

/**
 * Outputs debug statistics for all pools
 */
export function getPoolStats() {
	return {
		shots: shotPool.stats,
		foes: foePool.stats,
		bossTorpedoes: bossTorpedoPool.stats,
		bossWakeWaves: bossWakeWavePool.stats,
		coralEffects: coralEffectPool.stats,
		healPickups: healPickupPool.stats,
		symbolDrops: symbolDropPool.stats,
		foeArrows: foeArrowPool.stats
	};
}

/**
 * Resets all pool statistics (for level changes)
 */
export function clearAllPools() {
	shotPool.clear();
	foePool.clear();
	bossTorpedoPool.clear();
	bossWakeWavePool.clear();
	coralEffectPool.clear();
	healPickupPool.clear();
	symbolDropPool.clear();
	foeArrowPool.clear();
}
