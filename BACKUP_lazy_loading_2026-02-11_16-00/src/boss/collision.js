// Boss-Collision-Funktionen - ausgelagert aus game.js
// Kollisionserkennung zwischen Spieler/Schüssen und Boss-Attacken
//
// HINWEIS: Dieses Modul hat Abhängigkeiten zu damagePlayer, clamp, spawnFragranceCloud

import { TAU } from '../core/constants.js';
import { clamp } from '../core/utils.js';

/**
 * Erstellt das Boss-Collision-System
 * @param {Object} deps - Abhängigkeiten
 */
export function createBossCollisionSystem(deps) {
	const {
		getCanvas,
		getState,
		damagePlayer,
		winGame,
		updateBannerEl,
		spawnFragranceCloud
	} = deps;

	function handleShotBossHits() {
		const state = getState();
		if (state.over) return;
		const boss = state.boss;
		if (!boss.active) return;
		const scorePerHit = 10;
		for (const shot of state.shots) {
			if (shot.life <= 0) continue;
			const dx = shot.x - boss.x;
			const dy = (shot.y - boss.y) * 0.7;
			const dist = Math.hypot(dx, dy);
			const hitRadius = 64;
			if (dist < hitRadius) {
				shot.life = 0;
				boss.hp = Math.max(0, boss.hp - 1);
				state.score += scorePerHit;
				state.levelScore += scorePerHit;
				if (boss.hp <= 0) {
					winGame();
					break;
				} else {
					updateBannerEl(`Bosskampf – HP ${boss.hp}/${boss.maxHp}`);
				}
			}
		}
	}

	function handlePlayerBossCollision() {
		const state = getState();
		const boss = state.boss;
		if (!boss.active || state.over) return;
		const player = state.player;
		const dx = player.x - boss.x;
		const dy = (player.y - boss.y) * 0.7;
		const dist = Math.hypot(dx, dy);
		const hitRadius = 72;
		if (dist < hitRadius) damagePlayer(1);
	}

	function handlePlayerTorpedoCollisions() {
		const state = getState();
		if (state.over || state.bossTorpedoes.length === 0) return;
		const player = state.player;
		for (const torpedo of state.bossTorpedoes) {
			if (torpedo.life <= 0) continue;
			const dx = player.x - torpedo.x;
			const dy = player.y - torpedo.y;
			const radius = (torpedo.radius || 18) + 4;
			if (Math.hypot(dx, dy) < radius) {
				torpedo.life = 0;
				damagePlayer(1);
			}
		}
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.life > 0);
	}

	function handlePlayerFinSweepCollisions() {
		const state = getState();
		if (state.over || state.bossSweeps.length === 0) return;
		const player = state.player;
		for (const sweep of state.bossSweeps) {
			if (sweep.delay > 0 || sweep.life <= 0) continue;
			const dx = player.x - sweep.x;
			const dy = player.y - sweep.y;
			const radius = (sweep.radius || 38) + 6;
			if (Math.hypot(dx, dy) < radius) {
				sweep.life = 0;
				damagePlayer(1);
			}
		}
		state.bossSweeps = state.bossSweeps.filter(sweep => sweep.life > 0);
	}

	function handlePlayerWakeWaveCollisions() {
		const state = getState();
		if (state.over || state.bossWakeWaves.length === 0) return;
		const player = state.player;
		for (const wave of state.bossWakeWaves) {
			if (wave.life <= 0) continue;
			if (wave.hurtCooldown > 0) continue;
			const radiusX = (wave.radiusX == null ? 82 : wave.radiusX) * 0.9;
			const radiusY = (wave.radiusY == null ? 28 : wave.radiusY) * 1.05;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const nx = dx / Math.max(1, radiusX);
			const ny = dy / Math.max(1, radiusY);
			if (nx * nx + ny * ny < 1) {
				wave.hurtCooldown = 700;
				damagePlayer(1);
			}
		}
	}

	function handlePlayerWhirlpoolEffects() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossWhirlpools.length === 0) return;
		const player = state.player;
		const dt = state.frameDt || 16;
		for (const whirl of state.bossWhirlpools) {
			if (whirl.dead || whirl.telegraph > 0) continue;
			const dx = player.x - whirl.x;
			const dy = player.y - whirl.y;
			const dist = Math.hypot(dx, dy) || 1;
			const activeRadius = whirl.radius == null ? 96 : whirl.radius;
			const pullRadius = whirl.releaseTriggered ? (whirl.explosionRadius || activeRadius * 1.4) : activeRadius * 1.25;
			if (dist < pullRadius) {
				const pullStrength = (whirl.pull == null ? 0.001 : whirl.pull) * dt * (1 - dist / Math.max(1, pullRadius));
				player.x = clamp(player.x - dx * pullStrength, 60, canvas.width - 60);
				player.y = clamp(player.y - dy * pullStrength, 60, canvas.height - 60);
			}
			if (!whirl.releaseTriggered) {
				if (dist < activeRadius * 0.92) {
					if (whirl.damageTimer <= 0) {
						damagePlayer(1);
						whirl.damageTimer = 800;
					}
				}
			} else if (!whirl.explosionApplied && dist < (whirl.explosionRadius || activeRadius * 1.4)) {
				whirl.explosionApplied = true;
				damagePlayer(1);
			}
		}
	}

	function handlePlayerCoinExplosions() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossCoinExplosions.length === 0) return;
		const player = state.player;
		for (const blast of state.bossCoinExplosions) {
			if (blast.life <= 0 || blast.hitApplied) continue;
			const radius = blast.radius == null ? 54 : blast.radius;
			const dx = player.x - blast.x;
			const dy = player.y - blast.y;
			if (Math.hypot(dx, dy) < radius) {
				blast.hitApplied = true;
				damagePlayer(blast.damage == null ? 1 : blast.damage);
				const knock = blast.knockback == null ? 0.16 : blast.knockback;
				const pushX = knock * 520 * (dx >= 0 ? 1 : -1);
				const pushY = knock * 280 * (dy >= 0 ? 1 : -1);
				player.x = clamp(player.x + pushX, 60, canvas.width - 60);
				player.y = clamp(player.y + pushY, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerDiamondBeams() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossDiamondBeams.length === 0) return;
		const player = state.player;
		for (const beam of state.bossDiamondBeams) {
			const stage = beam.stage || "telegraph";
			if (stage !== "active") continue;
			const angle = beam.angle || 0;
			const cosA = Math.cos(angle);
			const sinA = Math.sin(angle);
			const dx = player.x - beam.originX;
			const dy = player.y - beam.originY;
			const projection = dx * cosA + dy * sinA;
			if (projection < -80 || projection > canvas.width + 220) continue;
			const distance = Math.abs(dx * sinA - dy * cosA);
			const halfWidth = (beam.width == null ? 48 : beam.width) * 0.5;
			if (distance <= halfWidth) {
				if (beam.damageCooldown && beam.damageCooldown > 0) continue;
				damagePlayer(1);
				beam.damageCooldown = 260;
				const knock = beam.knockback == null ? 0.16 : beam.knockback;
				player.x = clamp(player.x - cosA * knock * 540, 60, canvas.width - 60);
				player.y = clamp(player.y - sinA * knock * 420, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerTreasureWaves() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossTreasureWaves.length === 0) return;
		const player = state.player;
		for (const wave of state.bossTreasureWaves) {
			if (wave.stage !== "surge") continue;
			if (wave.damageCooldown > 0) continue;
			const radiusX = (wave.radiusX == null ? 120 : wave.radiusX) * 0.82;
			const radiusY = (wave.radiusY == null ? 48 : wave.radiusY) * 1.08;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const nx = dx / Math.max(1, radiusX);
			const ny = dy / Math.max(1, radiusY);
			if (nx * nx + ny * ny < 1) {
				damagePlayer(wave.damage == null ? 1 : wave.damage);
				wave.damageCooldown = 520;
				const knock = wave.knockback == null ? 0.22 : wave.knockback;
				player.x = clamp(player.x + (dx >= 0 ? 1 : -1) * knock * 540, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy >= 0 ? 1 : -1) * knock * 320, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerCardBoomerangs() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossCardBoomerangs.length === 0) return;
		const player = state.player;
		for (const card of state.bossCardBoomerangs) {
			if (card.dead) continue;
			if (card.phase === "orbit") continue;
			if (card.hitCooldown && card.hitCooldown > 0) continue;
			const radius = card.phase === "burst" ? 34 : 28;
			const dx = player.x - card.x;
			const dy = player.y - card.y;
			if (Math.hypot(dx, dy) < radius) {
				card.hitCooldown = 420;
				damagePlayer(card.damage == null ? 1 : card.damage);
				const knock = card.knockback == null ? 0.14 : card.knockback;
				player.x = clamp(player.x + (dx >= 0 ? 1 : -1) * knock * 480, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy >= 0 ? 1 : -1) * knock * 220, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerCrownColumns() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossCrownColumns.length === 0) return;
		const player = state.player;
		for (const column of state.bossCrownColumns) {
			if (column.stage !== "active") continue;
			if (column.damageCooldown > 0) continue;
			const halfWidth = column.halfWidth == null ? 46 : column.halfWidth;
			const top = column.top == null ? canvas.height * 0.22 : column.top;
			const bottom = column.bottom == null ? canvas.height * 0.82 : column.bottom;
			if (player.x >= column.x - halfWidth && player.x <= column.x + halfWidth && player.y >= top && player.y <= bottom) {
				damagePlayer(column.damage == null ? 1 : column.damage);
				column.damageCooldown = 560;
				const knock = column.knockback == null ? 0.24 : column.knockback;
				const dirX = player.x >= column.x ? 1 : -1;
				const dirY = player.y >= (top + bottom) * 0.5 ? 1 : -1;
				player.x = clamp(player.x + dirX * knock * 620, 60, canvas.width - 60);
				player.y = clamp(player.y + dirY * knock * 260, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerKatapultCollisions() {
		const state = getState();
		if (state.over || state.bossKatapultShots.length === 0) return;
		const player = state.player;
		for (const shot of state.bossKatapultShots) {
			if (shot.dead || shot.delay > 0) continue;
			const dx = player.x - shot.x;
			const dy = player.y - shot.y;
			const dist = Math.hypot(dx, dy);
			if (!shot.exploding) {
				const radius = (shot.radius || 24) + 6;
				if (dist < radius) {
					shot.exploding = true;
					shot.explosionLife = Math.max(shot.explosionLife, 520);
					shot.damageDone = true;
					if (player.invulnFor <= 0) damagePlayer(1);
				}
			} else if (!shot.damageDone) {
				const explosionRadius = shot.explosionRadius || 110;
				if (dist < explosionRadius * 0.8) {
					if (player.invulnFor <= 0) damagePlayer(1);
					shot.damageDone = true;
				}
			}
		}
	}

	function handlePlayerShockwaveCollisions() {
		const canvas = getCanvas();
		const state = getState();
		if (state.over || state.bossShockwaves.length === 0) return;
		const player = state.player;
		const dt = state.frameDt || 16;
		for (const wave of state.bossShockwaves) {
			if (wave.dead) continue;
			const dx = player.x - wave.x;
			const dy = player.y - wave.y;
			const dist = Math.hypot(dx, dy) || 1;
			if (wave.stage === "wave1" && !wave.damageWaveOne) {
				const thickness = wave.waveThicknessOne || 90;
				const radius = wave.waveOneRadius || 0;
				if (dist < radius + thickness * 0.5 && dist > Math.max(0, radius - thickness * 0.5)) {
					damagePlayer(1);
					wave.damageWaveOne = true;
				}
			}
			if (wave.stage === "wave2" && !wave.damageWaveTwo) {
				const thickness = wave.waveThicknessTwo || 120;
				const radius = wave.waveTwoRadius || 0;
				if (dist < radius + thickness * 0.5 && dist > Math.max(0, radius - thickness * 0.5)) {
					if (player.shieldActive) {
						player.shieldLastBlock = performance.now();
					} else {
						damagePlayer(1);
					}
					wave.damageWaveTwo = true;
				}
			}
			if ((wave.stage === "wave1" || wave.stage === "wave2") && dist > 0) {
				const pushForce = (wave.stage === "wave2" ? 0.0009 : 0.0005) * dt;
				const nx = dx / dist;
				player.x = clamp(player.x + nx * pushForce, 60, canvas.width - 60);
				player.y = clamp(player.y + (dy / dist) * pushForce * 0.6, 60, canvas.height - 60);
			}
		}
	}

	function handlePlayerSpeedboatCollisions() {
		const state = getState();
		if (state.over || state.bossSpeedboats.length === 0) return;
		const player = state.player;
		for (const boat of state.bossSpeedboats) {
			if (boat.dead) continue;
			const dx = player.x - boat.x;
			const dy = player.y - boat.y;
			const radiusX = 36;
			const radiusY = 22;
			const nx = dx / radiusX;
			const ny = dy / radiusY;
			if (nx * nx + ny * ny < 1) {
				if ((boat.damageCooldown || 0) <= 0) {
					damagePlayer(1);
					boat.damageCooldown = 640;
				}
			}
		}
	}

	function handlePlayerPerfumeOrbCollisions() {
		const state = getState();
		if (state.over || state.bossPerfumeOrbs.length === 0) return;
		const player = state.player;
		const bossCfg = state.levelConfig && state.levelConfig.boss;
		for (const orb of state.bossPerfumeOrbs) {
			if (orb.dead || orb.life <= 0) continue;
			const dx = player.x - orb.x;
			const dy = player.y - orb.y;
			const radius = (orb.radius || 18) + 14;
			if (Math.hypot(dx, dy) < radius) {
				orb.dead = true;
				orb.life = 0;
				spawnFragranceCloud(orb.x, orb.y, {
					radius: bossCfg && bossCfg.cloudRadius ? bossCfg.cloudRadius * 0.75 : 52,
					duration: bossCfg && bossCfg.cloudDuration ? bossCfg.cloudDuration * 0.72 : 2800,
					growth: 0.02,
					driftX: -0.035,
					driftY: -0.012
				});
				if (player.invulnFor <= 0) damagePlayer(1);
				break;
			}
		}
	}

	function handlePlayerFragranceCloudCollisions() {
		const state = getState();
		if (state.over || state.bossFragranceClouds.length === 0) return;
		const player = state.player;
		for (const cloud of state.bossFragranceClouds) {
			const dx = player.x - cloud.x;
			const dy = player.y - cloud.y;
			const radius = cloud.radius || cloud.baseRadius || 60;
			if (Math.hypot(dx, dy) < radius * 0.86) {
				if (!player.shieldActive) player.perfumeSlowTimer = Math.max(player.perfumeSlowTimer || 0, 2200);
				if (player.invulnFor <= 0) damagePlayer(cloud.damage || 1);
				if (player.invulnFor > 0) break;
			}
		}
	}

	return {
		handleShotBossHits,
		handlePlayerBossCollision,
		handlePlayerTorpedoCollisions,
		handlePlayerFinSweepCollisions,
		handlePlayerWakeWaveCollisions,
		handlePlayerWhirlpoolEffects,
		handlePlayerCoinExplosions,
		handlePlayerDiamondBeams,
		handlePlayerTreasureWaves,
		handlePlayerCardBoomerangs,
		handlePlayerCrownColumns,
		handlePlayerKatapultCollisions,
		handlePlayerShockwaveCollisions,
		handlePlayerSpeedboatCollisions,
		handlePlayerPerfumeOrbCollisions,
		handlePlayerFragranceCloudCollisions
	};
}
