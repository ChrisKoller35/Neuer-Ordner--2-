import { describe, it, expect } from 'vitest';
import {
	T, PLAYER_SPEED, PLAYER_HALF_W, PLAYER_HALF_H,
	TRANSITION_DURATION, INVULN_DURATION, SPIKE_DAMAGE_COOLDOWN,
	ATTACK_RANGE_PX, ATTACK_COOLDOWN_MS, PROJECTILE_SPEED,
	DOOR_TRIGGER_DIST, PICKUP_RADIUS, BOSS_HALF,
	BOSS_ATTACK_INTERVAL, ENEMY_HALF, ENEMY_UPDATE_INTERVAL,
	ANGLE_LERP_SPEED
} from '../src/dungeon/dungeonConstants.js';

describe('dungeonConstants', () => {
	it('TILE_TYPES has required tile ids', () => {
		expect(T.WALL).toBeDefined();
		expect(T.FLOOR).toBeDefined();
		expect(T.SPIKES).toBeDefined();
		expect(T.DOOR).toBeDefined();
	});

	it('player dimensions are positive', () => {
		expect(PLAYER_HALF_W).toBeGreaterThan(0);
		expect(PLAYER_HALF_H).toBeGreaterThan(0);
	});

	it('speed constants are positive', () => {
		expect(PLAYER_SPEED).toBeGreaterThan(0);
		expect(PROJECTILE_SPEED).toBeGreaterThan(0);
	});

	it('cooldowns / durations are positive', () => {
		expect(TRANSITION_DURATION).toBeGreaterThan(0);
		expect(INVULN_DURATION).toBeGreaterThan(0);
		expect(SPIKE_DAMAGE_COOLDOWN).toBeGreaterThan(0);
		expect(ATTACK_COOLDOWN_MS).toBeGreaterThan(0);
		expect(BOSS_ATTACK_INTERVAL).toBeGreaterThan(0);
		expect(ENEMY_UPDATE_INTERVAL).toBeGreaterThan(0);
	});

	it('range/radius constants are positive', () => {
		expect(ATTACK_RANGE_PX).toBeGreaterThan(0);
		expect(DOOR_TRIGGER_DIST).toBeGreaterThan(0);
		expect(PICKUP_RADIUS).toBeGreaterThan(0);
		expect(BOSS_HALF).toBeGreaterThan(0);
		expect(ENEMY_HALF).toBeGreaterThan(0);
	});

	it('ANGLE_LERP_SPEED is reasonable (0 < x <= 100)', () => {
		expect(ANGLE_LERP_SPEED).toBeGreaterThan(0);
		expect(ANGLE_LERP_SPEED).toBeLessThanOrEqual(100);
	});
});
