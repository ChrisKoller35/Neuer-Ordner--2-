import { describe, it, expect } from 'vitest';
import { ObjectPool } from '../src/core/pool.js';

// ---- Basic operations ----
describe('ObjectPool basics', () => {
	it('creates objects via factory', () => {
		const pool = new ObjectPool(() => ({ x: 0, y: 0 }));
		const obj = pool.acquire();
		expect(obj).toEqual({ x: 0, y: 0 });
	});

	it('starts with 0 available', () => {
		const pool = new ObjectPool(() => ({}));
		expect(pool.available).toBe(0);
	});

	it('pre-allocates when initialSize given', () => {
		const pool = new ObjectPool(() => ({}), null, 5);
		expect(pool.available).toBe(5);
	});

	it('acquire reduces available count', () => {
		const pool = new ObjectPool(() => ({}), null, 3);
		pool.acquire();
		expect(pool.available).toBe(2);
	});
});

// ---- Release & reuse ----
describe('release & reuse', () => {
	it('released object goes back into pool', () => {
		const pool = new ObjectPool(() => ({ v: 0 }));
		const obj = pool.acquire();
		pool.release(obj);
		expect(pool.available).toBe(1);
	});

	it('released object is returned on next acquire', () => {
		const pool = new ObjectPool(() => ({ id: Math.random() }));
		const obj = pool.acquire();
		pool.release(obj);
		const obj2 = pool.acquire();
		expect(obj2).toBe(obj); // same reference
	});

	it('calls reset on release', () => {
		const pool = new ObjectPool(
			() => ({ x: 0, y: 0 }),
			(o) => { o.x = 0; o.y = 0; }
		);
		const obj = pool.acquire();
		obj.x = 100;
		obj.y = 200;
		pool.release(obj);
		const reused = pool.acquire();
		expect(reused.x).toBe(0);
		expect(reused.y).toBe(0);
	});

	it('release(null) is a no-op', () => {
		const pool = new ObjectPool(() => ({}));
		pool.release(null);
		pool.release(undefined);
		expect(pool.available).toBe(0);
	});
});

// ---- releaseAll ----
describe('releaseAll', () => {
	it('returns multiple objects in one call', () => {
		const pool = new ObjectPool(() => ({ v: 0 }));
		const objs = [pool.acquire(), pool.acquire(), pool.acquire()];
		pool.releaseAll(objs);
		expect(pool.available).toBe(3);
	});

	it('applies reset to each object', () => {
		const pool = new ObjectPool(
			() => ({ val: 0 }),
			(o) => { o.val = 0; }
		);
		const a = pool.acquire(); a.val = 10;
		const b = pool.acquire(); b.val = 20;
		pool.releaseAll([a, b]);
		expect(pool.acquire().val).toBe(0);
		expect(pool.acquire().val).toBe(0);
	});
});

// ---- Stats ----
describe('stats', () => {
	it('tracks created and acquired counts', () => {
		const pool = new ObjectPool(() => ({}));
		pool.acquire();
		pool.acquire();
		expect(pool.stats.totalCreated).toBe(2);
		expect(pool.stats.totalAcquired).toBe(2);
	});

	it('reuseRate is 0% with no reuse', () => {
		const pool = new ObjectPool(() => ({}));
		pool.acquire();
		expect(pool.stats.reuseRate).toBe('0.0%');
	});

	it('reuseRate is 0% when nothing acquired', () => {
		const pool = new ObjectPool(() => ({}));
		expect(pool.stats.reuseRate).toBe('0%');
	});

	it('reuseRate increases with reuse', () => {
		const pool = new ObjectPool(() => ({}));
		const obj = pool.acquire(); // created=1, acquired=1
		pool.release(obj);
		pool.acquire();              // acquired=2, created still 1
		// reuseRate = (2 - 1) / 2 * 100 = 50.0%
		expect(pool.stats.reuseRate).toBe('50.0%');
	});

	it('available reflects pool size', () => {
		const pool = new ObjectPool(() => ({}), null, 4);
		pool.acquire();
		expect(pool.stats.available).toBe(3);
	});
});

// ---- Clear ----
describe('clear', () => {
	it('empties the pool', () => {
		const pool = new ObjectPool(() => ({}), null, 10);
		pool.clear();
		expect(pool.available).toBe(0);
	});

	it('after clear, acquire creates new objects', () => {
		let counter = 0;
		const pool = new ObjectPool(() => ({ id: counter++ }), null, 3);
		pool.clear();
		const obj = pool.acquire();
		expect(obj.id).toBe(3); // 0,1,2 already created, next is 3
	});
});

// ---- Edge cases ----
describe('edge cases', () => {
	it('works without reset function', () => {
		const pool = new ObjectPool(() => ({ x: 0 }));
		const obj = pool.acquire();
		obj.x = 99;
		pool.release(obj);
		const reused = pool.acquire();
		expect(reused.x).toBe(99); // not reset
	});

	it('handles high throughput', () => {
		const pool = new ObjectPool(() => ({ v: 0 }), (o) => { o.v = 0; });
		for (let i = 0; i < 1000; i++) {
			const obj = pool.acquire();
			obj.v = i;
			pool.release(obj);
		}
		expect(pool.stats.totalAcquired).toBe(1000);
		expect(pool.stats.totalCreated).toBe(1); // only 1 ever created
		expect(pool.available).toBe(1);
	});
});
