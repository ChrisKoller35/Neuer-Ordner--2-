import { describe, it, expect, vi } from 'vitest';
import { setupEventBindings } from '../src/game/eventBindings.js';

function createEventTarget() {
	const handlers = new Map();
	return {
		handlers,
		addEventListener(type, handler) {
			handlers.set(type, handler);
		}
	};
}

function createCtx({ mapOpen }) {
	const canvasTarget = createEventTarget();
	const documentTarget = createEventTarget();
	const cityUI = {
		setInventoryOpen: vi.fn(),
		setMissionOpen: vi.fn(),
		setShopOpen: vi.fn(),
		isInventoryOpen: vi.fn(() => false)
	};

	const state = {
		mode: 'city',
		started: true,
		over: false,
		paused: false,
		city: {
			camera: { x: 0, y: 0 },
			npcs: [
				{ id: 'quest', x: 100, y: 100 }
			]
		}
	};

	const ctx = {
		getState: () => state,
		getCanvas: () => ({
			...canvasTarget,
			width: 1280,
			height: 720,
			getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
			hasPointerCapture: () => false,
			releasePointerCapture: () => {},
			setPointerCapture: () => {}
		}),
		getKeys: () => new Set(),
		getPointer: () => ({ down: false, shoot: false }),
		isControlsArmed: () => true,
		getBannerEl: () => ({ textContent: '' }),
		getBtnRestart: () => null,
		getBtnQuit: () => null,
		getHudShield: () => null,
		getDungeonSystem: () => ({ editor: { isActive: () => false, handleKey: () => false }, getDungeonState: () => null }),
		getBuildingsManager: () => ({
			handleKeyDown: () => false,
			handleMouseDown: () => false,
			handleMouseMove: () => false,
			handleMouseUp: () => false,
			handleClick: () => false,
			openHubScreen: () => true,
			isMapOpen: () => mapOpen
		}),
		getHubMenu: () => ({ isOpen: () => false, toggle: () => {}, open: () => {}, close: () => {} }),
		getCityUI: () => cityUI,
		getAbilities: () => ({
			tryActivateShield: () => false,
			tryActivateCoralAllies: () => false,
			tryActivateTsunamiAbility: () => false,
			tryActivateDashCurrent: () => false,
			tryActivateDepthMine: () => false,
			tryActivateTimeBubble: () => false
		}),
		getPlayerUpdater: () => ({ playerShoot: () => {} }),
		getUpgradeUI: () => ({ show: () => {} }),
		resetGame: () => {},
		enterCity: () => {},
		enterOverworld: () => {},
		exitOverworld: () => {},
		showGameOver: () => {},
		debugJumpToLevel: () => {},
		syncCityInventoryVisibility: () => {},
		syncCityShopVisibility: () => {},
		syncCityMissionVisibility: () => {},
		updateCityShopUI: () => {},
		updateCityMissionUI: () => {},
		DEBUG_SHORTCUTS: false
	};

	return { ctx, cityUI, canvasTarget, documentTarget };
}

describe('event bindings - teleporter map click guard', () => {
	it('does not open mission UI while map is open', () => {
		const { ctx, cityUI, canvasTarget, documentTarget } = createCtx({ mapOpen: true });
		const originalDocument = globalThis.document;
		globalThis.document = documentTarget;

		setupEventBindings(ctx);

		const pointerDown = canvasTarget.handlers.get('pointerdown');
		expect(pointerDown).toBeTypeOf('function');

		pointerDown({
			pointerType: 'mouse',
			button: 0,
			clientX: 100,
			clientY: 100,
			preventDefault: () => {},
			stopPropagation: () => {},
			stopImmediatePropagation: () => {}
		});

		expect(cityUI.setMissionOpen).not.toHaveBeenCalled();
		globalThis.document = originalDocument;
	});

	it('opens mission UI when map is closed and quest NPC is clicked', () => {
		const { ctx, cityUI, canvasTarget, documentTarget } = createCtx({ mapOpen: false });
		const originalDocument = globalThis.document;
		globalThis.document = documentTarget;

		setupEventBindings(ctx);

		const pointerDown = canvasTarget.handlers.get('pointerdown');
		expect(pointerDown).toBeTypeOf('function');

		pointerDown({
			pointerType: 'mouse',
			button: 0,
			clientX: 100,
			clientY: 100,
			preventDefault: () => {},
			stopPropagation: () => {},
			stopImmediatePropagation: () => {}
		});

		expect(cityUI.setMissionOpen).toHaveBeenCalledWith(true);
		globalThis.document = originalDocument;
	});
});
