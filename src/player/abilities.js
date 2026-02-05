// src/player/abilities.js
// Spieler-Fähigkeiten: Shield, Coral Allies, Tsunami

const TAU = Math.PI * 2;

/**
 * Factory für das Abilities-System
 * @param {Object} deps - Abhängigkeiten
 */
export function createAbilitiesSystem(deps) {
	const {
		getState,
		getCanvas,
		triggerEventFlash,
		updateHUD,
		awardFoeDefeat,
		SHIELD_DURATION,
		SHIELD_COOLDOWN
	} = deps;

	// =====================
	// SHIELD ABILITY
	// =====================
	function tryActivateShield() {
		const state = getState();
		const player = state.player;
		if (!player.shieldUnlocked || player.shieldActive || player.shieldCooldown > 0) return;
		if (state.over || state.paused || !state.started) return;
		player.shieldActive = true;
		player.shieldTimer = player.shieldDuration || SHIELD_DURATION;
		player.shieldCooldown = 0;
		player.shieldLastActivation = performance.now();
		player.perfumeSlowTimer = 0;
		triggerEventFlash("shield", { text: "Schild aktiv!", duration: 900, opacity: 0.7 });
		updateHUD();
	}

	// =====================
	// CORAL ALLIES ABILITY
	// =====================
	function unlockCoralAllies() {
		const state = getState();
		const ability = state.coralAbility;
		if (!ability || ability.unlocked) return;
		ability.unlocked = true;
		ability.active = false;
		ability.timer = 0;
		ability.cooldown = 0;
		triggerEventFlash("ally", { text: "Korallenverbündete bereit (R)", duration: 1400, opacity: 0.75 });
	}

	function spawnCoralAppearanceFx(x, y) {
		const state = getState();
		state.coralEffects.push({
			kind: "ring",
			mode: "spawn",
			x,
			y,
			life: 520,
			maxLife: 520,
			startRadius: 10,
			endRadius: 58,
			startAlpha: 0.65,
			endAlpha: 0,
			startLine: 6,
			endLine: 1.2
		});
		state.coralEffects.push({
			kind: "spark",
			mode: "spawn",
			x,
			y,
			life: 660,
			maxLife: 660,
			radiusStart: 12,
			radiusEnd: 30,
			rotation: Math.random() * TAU,
			rotationSpeed: (Math.random() - 0.5) * 0.004
		});
	}

	function spawnCoralFadeFx(x, y) {
		const state = getState();
		state.coralEffects.push({
			kind: "ring",
			mode: "fade",
			x,
			y,
			life: 520,
			maxLife: 520,
			startRadius: 46,
			endRadius: 10,
			startAlpha: 0.55,
			endAlpha: 0,
			startLine: 4,
			endLine: 0.8
		});
		state.coralEffects.push({
			kind: "spark",
			mode: "fade",
			x,
			y,
			life: 520,
			maxLife: 520,
			radiusStart: 26,
			radiusEnd: 6,
			rotation: Math.random() * TAU,
			rotationSpeed: (Math.random() - 0.5) * 0.0035
		});
	}

	function spawnCoralAlliesFormation() {
		const state = getState();
		const player = state.player;
		const allies = [];
		const count = 2;
		for (let i = 0; i < count; i += 1) {
			const orbitDir = i === 0 ? 1 : -1;
			const baseAngle = orbitDir === 1 ? Math.PI * 0.12 : Math.PI * 0.88;
			const radius = 128 + i * 8;
			const bobPhase = Math.random() * TAU;
			const ally = {
				angle: baseAngle,
				radius,
				turnSpeed: 0.0016 + i * 0.0003,
				orbitDir,
				shootTimer: 120 + i * 80,
				shootInterval: 420 + i * 60,
				bobPhase,
				contactRadius: 42,
				spriteKey: i === 0 ? "coralAllyOne" : "coralAllyTwo",
				spriteScale: 0.16,
				spriteOffsetX: -4,
				spriteOffsetY: -10,
				spriteRotationOffset: 0
			};
			const verticalOffset = Math.sin(bobPhase) * 6;
			ally.x = player.x + Math.cos(baseAngle) * radius;
			ally.y = player.y + Math.sin(baseAngle) * (radius * 0.42) + verticalOffset - 24;
			allies.push(ally);
			spawnCoralAppearanceFx(ally.x, ally.y);
		}
		state.coralAllies = allies;
	}

	function spawnCoralAllyShot(origin) {
		const state = getState();
		state.shots.push({
			x: (origin && origin.x) == null ? state.player.x + 24 : origin.x + 18,
			y: (origin && origin.y) == null ? state.player.y - 8 : origin.y - 6,
			vx: 0.7,
			vy: -0.02 + Math.sin(origin && origin.angle != null ? origin.angle : 0) * 0.015,
			life: 1300,
			spriteScale: 0.085,
			spriteOffsetX: 5,
			spriteOffsetY: 0,
			coralShot: true
		});
	}

	function tryActivateCoralAllies() {
		const state = getState();
		const ability = state.coralAbility;
		if (!ability || !ability.unlocked) return false;
		if (ability.active || ability.cooldown > 0) return false;
		if (state.level < 3) return false;
		if (state.over || state.paused || !state.started) return false;
		spawnCoralAlliesFormation();
		ability.active = true;
		ability.timer = ability.duration == null ? 6000 : ability.duration;
		triggerEventFlash("ally", { text: "Korallenverbündete aktiv!", duration: 900, opacity: 0.65 });
		return true;
	}

	function updateCoralAllies(dt) {
		const state = getState();
		const ability = state.coralAbility;
		if (!ability) return;
		if (!ability.active) {
			if (state.coralAllies.length) {
				for (const ally of state.coralAllies) {
					if (ally && ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
				}
			}
			state.coralAllies.length = 0;
			if (ability.cooldown > 0) ability.cooldown = Math.max(0, ability.cooldown - dt);
			return;
		}
		const player = state.player;
		ability.timer = Math.max(0, ability.timer - dt);
		for (const ally of state.coralAllies) {
			const orbitDir = ally.orbitDir == null ? 1 : ally.orbitDir;
			const turnSpeed = ally.turnSpeed == null ? 0.0018 : ally.turnSpeed;
			ally.angle = (ally.angle == null ? (orbitDir > 0 ? Math.PI * 0.2 : Math.PI * 0.8) : ally.angle) + turnSpeed * dt * orbitDir;
			ally.bobPhase = (ally.bobPhase || 0) + dt * 0.0042;
			const radius = ally.radius == null ? 120 : ally.radius;
			const offsetY = Math.sin(ally.bobPhase) * 6;
			ally.x = player.x + Math.cos(ally.angle) * radius;
			ally.y = player.y + Math.sin(ally.angle) * (radius * 0.42) + offsetY - 24;
			ally.shotTimer = (ally.shotTimer == null ? 0 : ally.shotTimer) - dt;
			if (ally.shotTimer <= 0) {
				spawnCoralAllyShot(ally);
				ally.shotTimer = ally.shootInterval == null ? 420 : ally.shootInterval;
			}
			const contactRadius = ally.contactRadius == null ? 40 : ally.contactRadius;
			for (const foe of state.foes) {
				if (foe.dead) continue;
				const dx = foe.x - ally.x;
				const dy = foe.y - ally.y;
				if (Math.hypot(dx, dy) < contactRadius) {
					foe.dead = true;
					awardFoeDefeat(foe);
					if (ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
					ally.destroyed = true;
					break;
				}
			}
		}
		if (state.coralAllies.length) state.coralAllies = state.coralAllies.filter(ally => !ally.destroyed);
		if (ability.timer <= 0) {
			if (state.coralAllies.length) {
				for (const ally of state.coralAllies) {
					if (ally && ally.x != null && ally.y != null) spawnCoralFadeFx(ally.x, ally.y);
				}
			}
			ability.active = false;
			ability.timer = 0;
			ability.cooldown = ability.cooldownMax == null ? 14000 : ability.cooldownMax;
			state.coralAllies.length = 0;
		}
	}

	// =====================
	// TSUNAMI ABILITY
	// =====================
	function unlockTsunamiAbility(opts = {}) {
		const state = getState();
		const ability = state.tsunamiAbility;
		if (!ability) return;
		const firstUnlock = !ability.unlocked;
		ability.unlocked = true;
		ability.used = false;
		ability.active = false;
		state.tsunamiWave = null;
		if (!opts.silent && firstUnlock) {
			triggerEventFlash("tsunami", { text: "Neue Kraft: Tsunami (T)", duration: 1400, opacity: 0.78 });
		}
	}

	function tryActivateTsunamiAbility() {
		const state = getState();
		const canvas = getCanvas();
		const ability = state.tsunamiAbility;
		if (!ability || !ability.unlocked) return false;
		if (ability.used || ability.active) return false;
		if (state.level < 4) return false;
		if (state.over || state.paused || !state.started) return false;
		ability.active = true;
		ability.used = true;
		const waveWidth = Math.max(canvas.width * 0.24, 240);
		const bubbleCount = 26;
		const bubbles = [];
		for (let i = 0; i < bubbleCount; i += 1) {
			bubbles.push({
				x: Math.random(),
				y: Math.random(),
				radius: 10 + Math.random() * 20,
				speed: 0.00016 + Math.random() * 0.00022,
				drift: 0.6 + Math.random() * 1.6,
				alpha: 0.16 + Math.random() * 0.22
			});
		}
		state.tsunamiWave = {
			x: -waveWidth - 140,
			width: waveWidth,
			speed: 0.46,
			energy: 1,
			elapsed: 0,
			crestY: canvas.height * 0.58,
			amplitude: canvas.height * 0.18,
			bubbles,
			detailOffset: Math.random() * TAU
		};
		triggerEventFlash("tsunami", { text: "Tsunami der Stille!", duration: 1100, opacity: 0.8 });
		return true;
	}

	function updateTsunamiWave(dt) {
		const state = getState();
		const canvas = getCanvas();
		const wave = state.tsunamiWave;
		if (!wave) return;
		wave.elapsed = (wave.elapsed || 0) + dt;
		wave.x += (wave.speed || 0.4) * dt;
		wave.energy = Math.max(0, (wave.energy == null ? 1 : wave.energy) - dt * 0.00004);
		const width = wave.width == null ? 220 : wave.width;
		const right = wave.x + width;
		for (const foe of state.foes) {
			if (foe.dead) continue;
			if (foe.x <= right + 8) {
				foe.dead = true;
				awardFoeDefeat(foe);
			}
		}
		state.foes = state.foes.filter(foe => !foe.dead);
		state.foeArrows = state.foeArrows.filter(arrow => arrow.x > right + 12);
		state.bossTorpedoes = state.bossTorpedoes.filter(torpedo => torpedo.x > right + 24);
		state.bossKatapultShots = state.bossKatapultShots.filter(shot => shot.x > right + 16);
		state.bossSpeedboats = state.bossSpeedboats.filter(boat => boat.x > right + 32);
		state.bossCoinBursts = state.bossCoinBursts.filter(coin => coin.x > right + 18);
		state.bossCardBoomerangs = state.bossCardBoomerangs.filter(card => card.x > right + 20);
		state.bossPerfumeOrbs = state.bossPerfumeOrbs.filter(orb => orb.x > right + 18);
		state.bossFragranceClouds = state.bossFragranceClouds.filter(cloud => cloud.x > right + 18);
		state.bossWhirlpools = state.bossWhirlpools.filter(whirl => whirl.x > right + 18 || whirl.dead);
		const boss = state.boss;
		if (boss.active && !state.over && right >= boss.x - 60) {
			boss.stunTimer = Math.max(boss.stunTimer || 0, 2600);
		}
		const left = wave.x;
		if (left > canvas.width + width + 20) {
			state.tsunamiWave = null;
			if (state.tsunamiAbility) state.tsunamiAbility.active = false;
		}
	}

	return {
		// Shield
		tryActivateShield,
		// Coral
		unlockCoralAllies,
		tryActivateCoralAllies,
		updateCoralAllies,
		// Tsunami
		unlockTsunamiAbility,
		tryActivateTsunamiAbility,
		updateTsunamiWave
	};
}
