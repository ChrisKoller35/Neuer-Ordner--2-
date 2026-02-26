// ============================================================
// STATE MACHINE - State machines for game modes
// ============================================================
// Ersetzt String-basierte Mode-Checks durch typisierte Zustände
// with defined transitions and lifecycle hooks

/**
 * @typedef {Object} StateDefinition
 * @property {string} name - Name des Zustands
 * @property {string[]} [allowedTransitions] - Erlaubte Ziel-Zustände
 * @property {Function} [onEnter] - Callback bei Eintritt
 * @property {Function} [onExit] - Callback bei Verlassen
 * @property {Function} [onUpdate] - Callback bei Update (mit dt)
 */

/**
 * Generische State Machine
 * @template T
 */
export class StateMachine {
	/**
	 * @param {Object<string, StateDefinition>} states - Zustandsdefinitionen
	 * @param {string} initialState - Anfangszustand
	 * @param {T} [context] - Kontext-Objekt das an alle Callbacks übergeben wird
	 */
	constructor(states, initialState, context = null) {
		/** @type {Object<string, StateDefinition>} */
		this._states = states;
		/** @type {string} */
		this._currentState = initialState;
		/** @type {string|null} */
		this._previousState = null;
		/** @type {T} */
		this._context = context;
		/** @type {number} */
		this._stateTime = 0;
		/** @type {number} */
		this._transitionCount = 0;
		/** @type {Function[]} */
		this._listeners = [];
		
		// Initiales onEnter aufrufen
		const state = this._states[initialState];
		if (state && state.onEnter) {
			state.onEnter(this._context, null);
		}
	}
	
	/**
	 * Current state name
	 */
	get current() {
		return this._currentState;
	}
	
	/**
	 * Vorheriger Zustandsname
	 */
	get previous() {
		return this._previousState;
	}
	
	/**
	 * Time in current state (ms)
	 */
	get stateTime() {
		return this._stateTime;
	}
	
	/**
	 * Checks if a state is active
	 * @param {string} stateName
	 * @returns {boolean}
	 */
	is(stateName) {
		return this._currentState === stateName;
	}
	
	/**
	 * Checks if any of multiple states is active
	 * @param {...string} stateNames
	 * @returns {boolean}
	 */
	isAny(...stateNames) {
		return stateNames.includes(this._currentState);
	}
	
	/**
	 * Wechselt in einen neuen Zustand
	 * @param {string} newState - Name des neuen Zustands
	 * @param {Object} [data] - Optional data for the transition
	 * @returns {boolean} - Ob der Übergang erfolgreich war
	 */
	transition(newState, data = null) {
		if (newState === this._currentState) return true;
		
		const currentDef = this._states[this._currentState];
		const newDef = this._states[newState];
		
		if (!newDef) {
			console.warn(`StateMachine: Unknown state "${newState}"`);
			return false;
		}
		
		// Check if transition is allowed
		if (currentDef && currentDef.allowedTransitions) {
			if (!currentDef.allowedTransitions.includes(newState)) {
				console.warn(`StateMachine: Transition from "${this._currentState}" to "${newState}" not allowed`);
				return false;
			}
		}
		
		// onExit des alten Zustands
		if (currentDef && currentDef.onExit) {
			currentDef.onExit(this._context, newState, data);
		}
		
		// Zustand wechseln
		this._previousState = this._currentState;
		this._currentState = newState;
		this._stateTime = 0;
		this._transitionCount++;
		
		// onEnter des neuen Zustands
		if (newDef.onEnter) {
			newDef.onEnter(this._context, this._previousState, data);
		}
		
		// Listener benachrichtigen
		for (const listener of this._listeners) {
			listener(newState, this._previousState, data);
		}
		
		return true;
	}
	
	/**
	 * Aktualisiert die State Machine
	 * @param {number} dt - Delta-Zeit in ms
	 */
	update(dt) {
		this._stateTime += dt;
		
		const currentDef = this._states[this._currentState];
		if (currentDef && currentDef.onUpdate) {
			currentDef.onUpdate(this._context, dt, this._stateTime);
		}
	}
	
	/**
	 * Fügt einen Listener für Zustandswechsel hinzu
	 * @param {Function} callback - (newState, oldState, data) => void
	 * @returns {Function} - Unsubscribe-Funktion
	 */
	onTransition(callback) {
		this._listeners.push(callback);
		return () => {
			const idx = this._listeners.indexOf(callback);
			if (idx >= 0) this._listeners.splice(idx, 1);
		};
	}
	
	/**
	 * Gibt Debug-Informationen zurück
	 */
	getDebugInfo() {
		return {
			current: this._currentState,
			previous: this._previousState,
			stateTime: this._stateTime,
			transitionCount: this._transitionCount,
			availableStates: Object.keys(this._states)
		};
	}
}

// ============================================================
// GAME MODE STATE MACHINE - Vordefinierte Spielzustände
// ============================================================

/**
 * Spiel-Modi
 */
export const GameMode = {
	LOADING: 'loading',
	TITLE: 'title',
	GAME: 'game',
	CITY: 'city',
	PAUSED: 'paused',
	BOSS: 'boss',
	CUTSCENE: 'cutscene',
	GAME_OVER: 'gameOver',
	WIN: 'win',
	LEVEL_TRANSITION: 'levelTransition',
	TALENT_TREE: 'talentTree',
	SHOP: 'shop'
};

/**
 * Creates the Game Mode State Machine
 * @param {Object} ctx - Spiel-Kontext mit Callbacks
 * @returns {StateMachine}
 */
export function createGameModeStateMachine(ctx = {}) {
	const {
		onLoadingEnter,
		onLoadingExit,
		onTitleEnter,
		onGameEnter,
		onGameExit,
		onGameUpdate,
		onCityEnter,
		onCityExit,
		onCityUpdate,
		onPausedEnter,
		onPausedExit,
		onBossEnter,
		onBossUpdate,
		onGameOverEnter,
		onWinEnter,
		onLevelTransitionEnter,
		onLevelTransitionUpdate
	} = ctx;

	const states = {
		[GameMode.LOADING]: {
			name: 'Loading',
			allowedTransitions: [GameMode.TITLE],
			onEnter: onLoadingEnter,
			onExit: onLoadingExit
		},
		
		[GameMode.TITLE]: {
			name: 'Title',
			allowedTransitions: [GameMode.GAME, GameMode.CITY, GameMode.LOADING],
			onEnter: onTitleEnter
		},
		
		[GameMode.GAME]: {
			name: 'Game',
			allowedTransitions: [
				GameMode.PAUSED, 
				GameMode.BOSS, 
				GameMode.GAME_OVER, 
				GameMode.WIN,
				GameMode.LEVEL_TRANSITION,
				GameMode.CITY,
				GameMode.TALENT_TREE,
				GameMode.CUTSCENE
			],
			onEnter: onGameEnter,
			onExit: onGameExit,
			onUpdate: onGameUpdate
		},
		
		[GameMode.CITY]: {
			name: 'City',
			allowedTransitions: [GameMode.GAME, GameMode.SHOP, GameMode.PAUSED, GameMode.TALENT_TREE],
			onEnter: onCityEnter,
			onExit: onCityExit,
			onUpdate: onCityUpdate
		},
		
		[GameMode.PAUSED]: {
			name: 'Paused',
			allowedTransitions: [GameMode.GAME, GameMode.CITY, GameMode.TITLE],
			onEnter: onPausedEnter,
			onExit: onPausedExit
		},
		
		[GameMode.BOSS]: {
			name: 'Boss',
			allowedTransitions: [GameMode.GAME, GameMode.GAME_OVER, GameMode.WIN, GameMode.PAUSED],
			onEnter: onBossEnter,
			onUpdate: onBossUpdate
		},
		
		[GameMode.CUTSCENE]: {
			name: 'Cutscene',
			allowedTransitions: [GameMode.GAME, GameMode.CITY, GameMode.LEVEL_TRANSITION]
		},
		
		[GameMode.GAME_OVER]: {
			name: 'GameOver',
			allowedTransitions: [GameMode.TITLE, GameMode.GAME],
			onEnter: onGameOverEnter
		},
		
		[GameMode.WIN]: {
			name: 'Win',
			allowedTransitions: [GameMode.TITLE, GameMode.LEVEL_TRANSITION, GameMode.CITY],
			onEnter: onWinEnter
		},
		
		[GameMode.LEVEL_TRANSITION]: {
			name: 'LevelTransition',
			allowedTransitions: [GameMode.GAME, GameMode.CITY, GameMode.CUTSCENE],
			onEnter: onLevelTransitionEnter,
			onUpdate: onLevelTransitionUpdate
		},
		
		[GameMode.TALENT_TREE]: {
			name: 'TalentTree',
			allowedTransitions: [GameMode.GAME, GameMode.CITY, GameMode.PAUSED]
		},
		
		[GameMode.SHOP]: {
			name: 'Shop',
			allowedTransitions: [GameMode.CITY]
		}
	};

	return new StateMachine(states, GameMode.LOADING, ctx);
}

// ============================================================
// BOSS STATE MACHINE - States for boss fights
// ============================================================

/**
 * Boss-Zustände
 */
export const BossState = {
	INACTIVE: 'inactive',
	ENTERING: 'entering',
	IDLE: 'idle',
	ATTACKING: 'attacking',
	STUNNED: 'stunned',
	ENRAGED: 'enraged',
	DYING: 'dying',
	DEAD: 'dead'
};

/**
 * Creates the Boss State Machine
 * @param {Object} ctx - Boss-Kontext
 * @returns {StateMachine}
 */
export function createBossStateMachine(ctx = {}) {
	const states = {
		[BossState.INACTIVE]: {
			name: 'Inactive',
			allowedTransitions: [BossState.ENTERING]
		},
		
		[BossState.ENTERING]: {
			name: 'Entering',
			allowedTransitions: [BossState.IDLE],
			onEnter: ctx.onEnteringEnter,
			onUpdate: ctx.onEnteringUpdate
		},
		
		[BossState.IDLE]: {
			name: 'Idle',
			allowedTransitions: [BossState.ATTACKING, BossState.ENRAGED, BossState.STUNNED, BossState.DYING],
			onEnter: ctx.onIdleEnter,
			onUpdate: ctx.onIdleUpdate
		},
		
		[BossState.ATTACKING]: {
			name: 'Attacking',
			allowedTransitions: [BossState.IDLE, BossState.ENRAGED, BossState.STUNNED, BossState.DYING],
			onEnter: ctx.onAttackingEnter,
			onUpdate: ctx.onAttackingUpdate
		},
		
		[BossState.STUNNED]: {
			name: 'Stunned',
			allowedTransitions: [BossState.IDLE, BossState.ATTACKING, BossState.ENRAGED],
			onEnter: ctx.onStunnedEnter,
			onUpdate: ctx.onStunnedUpdate
		},
		
		[BossState.ENRAGED]: {
			name: 'Enraged',
			allowedTransitions: [BossState.ATTACKING, BossState.DYING],
			onEnter: ctx.onEnragedEnter,
			onUpdate: ctx.onEnragedUpdate
		},
		
		[BossState.DYING]: {
			name: 'Dying',
			allowedTransitions: [BossState.DEAD],
			onEnter: ctx.onDyingEnter,
			onUpdate: ctx.onDyingUpdate
		},
		
		[BossState.DEAD]: {
			name: 'Dead',
			allowedTransitions: [BossState.INACTIVE],
			onEnter: ctx.onDeadEnter
		}
	};

	return new StateMachine(states, BossState.INACTIVE, ctx);
}

// ============================================================
// PLAYER STATE MACHINE - Player states
// ============================================================

/**
 * Player states
 */
export const PlayerState = {
	NORMAL: 'normal',
	SHIELDED: 'shielded',
	INVULNERABLE: 'invulnerable',
	STUNNED: 'stunned',
	DEAD: 'dead'
};

/**
 * Creates the Player State Machine
 * @param {Object} ctx - Player-Kontext
 * @returns {StateMachine}
 */
export function createPlayerStateMachine(ctx = {}) {
	const states = {
		[PlayerState.NORMAL]: {
			name: 'Normal',
			allowedTransitions: [PlayerState.SHIELDED, PlayerState.INVULNERABLE, PlayerState.STUNNED, PlayerState.DEAD]
		},
		
		[PlayerState.SHIELDED]: {
			name: 'Shielded',
			allowedTransitions: [PlayerState.NORMAL, PlayerState.INVULNERABLE]
		},
		
		[PlayerState.INVULNERABLE]: {
			name: 'Invulnerable',
			allowedTransitions: [PlayerState.NORMAL, PlayerState.SHIELDED]
		},
		
		[PlayerState.STUNNED]: {
			name: 'Stunned',
			allowedTransitions: [PlayerState.NORMAL, PlayerState.INVULNERABLE, PlayerState.DEAD]
		},
		
		[PlayerState.DEAD]: {
			name: 'Dead',
			allowedTransitions: [PlayerState.NORMAL]
		}
	};

	return new StateMachine(states, PlayerState.NORMAL, ctx);
}
