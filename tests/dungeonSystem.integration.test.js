import { beforeEach, describe, expect, it, vi } from 'vitest';
import S from '../src/core/sharedState.js';

vi.mock('../src/dungeon/dungeonGenerator.js', () => ({
	GRID_COLS: 6,
	GRID_ROWS: 3,
	getBiomeForFloor: (floor) => (floor >= 31 ? 'lava' : floor >= 16 ? 'eis' : 'stein'),
	generateDungeonFloor: (floor, seed) => ({
		floor,
		seed,
		startPos: { gridX: 0, gridY: 0 },
		grid: [[{ spawns: [{ type: 'playerSpawn', x: 2, y: 1 }] }]]
	})
}));

vi.mock('../src/dungeon/dungeonRender.js', () => ({
	createDungeonRenderSystem: () => ({ render: () => {} })
}));

vi.mock('../src/dungeon/dungeonUpdate.js', () => ({
	createDungeonUpdateSystem: () => ({
		enterRoom: () => {},
		repositionHelpers: () => {},
		resetCooldowns: () => {},
		handleAttack: () => {},
		update: () => {}
	}),
	getDungeonShortcuts: () => [1]
}));

vi.mock('../src/dungeon/dungeonEditor.js', () => ({
	createDungeonEditor: () => ({
		isActive: () => false,
		render: () => {}
	})
}));

function createStorage(initial = {}) {
	const store = new Map(Object.entries(initial));
	return {
		getItem: (key) => (store.has(key) ? store.get(key) : null),
		setItem: (key, value) => { store.set(key, String(value)); },
		removeItem: (key) => { store.delete(key); },
		clear: () => { store.clear(); }
	};
}

describe('dungeonSystem integration (persistenz + depth-flow)', () => {
	beforeEach(() => {
		S.dungeonDepth = 0;
	});

	it('loads persisted depth and initializes endless depth from it', async () => {
		globalThis.localStorage = createStorage({ cashfish_dungeon_depth: '17' });
		const { createDungeonSystem } = await import('../src/dungeon/dungeonSystem.js');

		const state = { mode: 'city', hearts: 3, maxHearts: 5, coins: 100 };
		const keys = {};
		const system = createDungeonSystem({
			canvas: { width: 1200, height: 700 },
			ctx: {},
			getState: () => state,
			getKeys: () => keys,
			onReturnToCity: () => {}
		});

		expect(S.dungeonDepth).toBe(17);

		system.enterDungeon({ seed: 123, startFloor: 1 });
		const ds = system.getDungeonState();
		expect(ds.totalDepthBase).toBe(17);
		expect(ds.endlessDepth).toBe(18);
		expect(ds.endlessRun.depth).toBe(18);
		expect(ds.endlessRewardPreview.coins).toBe(50 + 18 * 12);
	});

	it('persists new depth and advances active depth when floor increments', async () => {
		globalThis.localStorage = createStorage({ cashfish_dungeon_depth: '4' });
		const { createDungeonSystem } = await import('../src/dungeon/dungeonSystem.js');

		const state = { mode: 'city', hearts: 3, maxHearts: 5, coins: 100 };
		const keys = {};
		const system = createDungeonSystem({
			canvas: { width: 1200, height: 700 },
			ctx: {},
			getState: () => state,
			getKeys: () => keys,
			onReturnToCity: () => {}
		});

		system.enterDungeon({ seed: 9, startFloor: 1 });
		const before = system.getDungeonState();
		before.nextFloorRequested = true;

		system.update(16);

		const after = system.getDungeonState();
		expect(after.currentFloor.floor).toBe(2);
		expect(after.totalFloorsCleared).toBe(1);
		expect(after.endlessDepth).toBe(6);
		expect(S.dungeonDepth).toBe(5);
		expect(globalThis.localStorage.getItem('cashfish_dungeon_depth')).toBe('5');
	});

	it('stores current progress on escape return to city', async () => {
		globalThis.localStorage = createStorage({ cashfish_dungeon_depth: '2' });
		const { createDungeonSystem } = await import('../src/dungeon/dungeonSystem.js');

		const onReturnToCity = vi.fn();
		const state = { mode: 'city', hearts: 3, maxHearts: 5, coins: 250 };
		const keys = { Escape: false };
		const system = createDungeonSystem({
			canvas: { width: 1200, height: 700 },
			ctx: {},
			getState: () => state,
			getKeys: () => keys,
			onReturnToCity
		});

		system.enterDungeon({ seed: 77, startFloor: 1 });
		const ds = system.getDungeonState();
		ds.totalFloorsCleared = 3;

		keys.Escape = true;
		system.update(16);

		expect(system.getDungeonState()).toBeNull();
		expect(S.dungeonDepth).toBe(5);
		expect(globalThis.localStorage.getItem('cashfish_dungeon_depth')).toBe('5');
		expect(onReturnToCity).toHaveBeenCalledWith('retreat');
	});
});
