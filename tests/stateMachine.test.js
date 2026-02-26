import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateMachine } from '../src/core/stateMachine.js';

// ---- Basic State Machine ----
function createTestMachine(context = null) {
	return new StateMachine(
		{
			idle: { allowedTransitions: ['running', 'paused'] },
			running: { allowedTransitions: ['idle', 'paused'] },
			paused: { allowedTransitions: ['running', 'idle'] },
			dead: { allowedTransitions: [] }
		},
		'idle',
		context
	);
}

describe('StateMachine - basics', () => {
	it('starts in initial state', () => {
		const sm = createTestMachine();
		expect(sm.current).toBe('idle');
		expect(sm.previous).toBeNull();
	});

	it('is() checks current state', () => {
		const sm = createTestMachine();
		expect(sm.is('idle')).toBe(true);
		expect(sm.is('running')).toBe(false);
	});

	it('isAny() checks against multiple states', () => {
		const sm = createTestMachine();
		expect(sm.isAny('idle', 'running')).toBe(true);
		expect(sm.isAny('running', 'paused')).toBe(false);
	});

	it('stateTime starts at 0', () => {
		const sm = createTestMachine();
		expect(sm.stateTime).toBe(0);
	});
});

describe('StateMachine - transitions', () => {
	it('transitions to allowed state', () => {
		const sm = createTestMachine();
		const success = sm.transition('running');
		expect(success).toBe(true);
		expect(sm.current).toBe('running');
		expect(sm.previous).toBe('idle');
	});

	it('rejects transition to disallowed state', () => {
		const sm = createTestMachine();
		const success = sm.transition('dead');
		expect(success).toBe(false);
		expect(sm.current).toBe('idle');
	});

	it('rejects transition to unknown state', () => {
		const sm = createTestMachine();
		const success = sm.transition('nonexistent');
		expect(success).toBe(false);
		expect(sm.current).toBe('idle');
	});

	it('transition to same state returns true, no change', () => {
		const sm = createTestMachine();
		const success = sm.transition('idle');
		expect(success).toBe(true);
		expect(sm.previous).toBeNull(); // No actual transition happened
	});

	it('multi-step transitions work', () => {
		const sm = createTestMachine();
		sm.transition('running');
		sm.transition('paused');
		sm.transition('idle');
		expect(sm.current).toBe('idle');
		expect(sm.previous).toBe('paused');
	});
});

describe('StateMachine - lifecycle hooks', () => {
	it('calls onEnter on initial state', () => {
		const onEnter = vi.fn();
		new StateMachine(
			{ start: { onEnter } },
			'start'
		);
		expect(onEnter).toHaveBeenCalledOnce();
		expect(onEnter).toHaveBeenCalledWith(null, null);
	});

	it('calls onExit and onEnter during transition', () => {
		const onExitIdle = vi.fn();
		const onEnterRunning = vi.fn();
		const sm = new StateMachine(
			{
				idle: { allowedTransitions: ['running'], onExit: onExitIdle },
				running: { onEnter: onEnterRunning }
			},
			'idle'
		);
		sm.transition('running');
		expect(onExitIdle).toHaveBeenCalledOnce();
		expect(onEnterRunning).toHaveBeenCalledOnce();
	});

	it('onExit receives new state and data', () => {
		const onExit = vi.fn();
		const sm = new StateMachine(
			{
				idle: { allowedTransitions: ['running'], onExit },
				running: {}
			},
			'idle'
		);
		sm.transition('running', { reason: 'player pressed start' });
		expect(onExit).toHaveBeenCalledWith(null, 'running', { reason: 'player pressed start' });
	});

	it('onEnter receives previous state and data', () => {
		const onEnter = vi.fn();
		const sm = new StateMachine(
			{
				idle: { allowedTransitions: ['running'] },
				running: { onEnter }
			},
			'idle'
		);
		sm.transition('running', { speed: 5 });
		expect(onEnter).toHaveBeenCalledWith(null, 'idle', { speed: 5 });
	});

	it('onUpdate is called with dt and stateTime', () => {
		const onUpdate = vi.fn();
		const sm = new StateMachine(
			{ idle: { onUpdate } },
			'idle'
		);
		sm.update(16);
		sm.update(16);
		expect(onUpdate).toHaveBeenCalledTimes(2);
		expect(onUpdate).toHaveBeenLastCalledWith(null, 16, 32);
	});
});

describe('StateMachine - stateTime', () => {
	it('accumulates over updates', () => {
		const sm = createTestMachine();
		sm.update(100);
		sm.update(50);
		expect(sm.stateTime).toBe(150);
	});

	it('resets on transition', () => {
		const sm = createTestMachine();
		sm.update(100);
		sm.transition('running');
		expect(sm.stateTime).toBe(0);
	});
});

describe('StateMachine - listeners', () => {
	it('notifies listeners on transition', () => {
		const sm = createTestMachine();
		const listener = vi.fn();
		sm.onTransition(listener);
		sm.transition('running');
		expect(listener).toHaveBeenCalledWith('running', 'idle', null);
	});

	it('unsubscribe stops notifications', () => {
		const sm = createTestMachine();
		const listener = vi.fn();
		const unsub = sm.onTransition(listener);
		unsub();
		sm.transition('running');
		expect(listener).not.toHaveBeenCalled();
	});

	it('does not notify on same-state transition', () => {
		const sm = createTestMachine();
		const listener = vi.fn();
		sm.onTransition(listener);
		sm.transition('idle');
		expect(listener).not.toHaveBeenCalled();
	});
});

describe('StateMachine - context', () => {
	it('passes context to lifecycle hooks', () => {
		const ctx = { score: 100 };
		const onEnter = vi.fn();
		const sm = new StateMachine(
			{
				idle: { allowedTransitions: ['running'] },
				running: { onEnter }
			},
			'idle',
			ctx
		);
		sm.transition('running');
		expect(onEnter).toHaveBeenCalledWith(ctx, 'idle', null);
	});
});

describe('StateMachine - getDebugInfo', () => {
	it('returns current state info', () => {
		const sm = createTestMachine();
		sm.transition('running');
		const info = sm.getDebugInfo();
		expect(info.current).toBe('running');
		expect(info.previous).toBe('idle');
		expect(info.transitionCount).toBe(1);
		expect(info.availableStates).toContain('idle');
		expect(info.availableStates).toContain('running');
	});
});

describe('StateMachine - no allowedTransitions = unrestricted', () => {
	it('allows any transition when allowedTransitions not specified', () => {
		const sm = new StateMachine(
			{
				a: {},  // No allowedTransitions → anything goes
				b: {},
				c: {}
			},
			'a'
		);
		expect(sm.transition('b')).toBe(true);
		expect(sm.transition('c')).toBe(true);
		expect(sm.transition('a')).toBe(true);
	});
});
