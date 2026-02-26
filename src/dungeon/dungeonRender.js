// ============================================================
// DUNGEON RENDERER — Seitenansicht-Rendering für Dungeon-Räume
// ============================================================
// Rendert Räume in Seitenansicht mit Biom-Palette,
// nutzt den echten Spieler-Sprite (MODELS.player),
// Minimap, HUD, Raumübergänge, Dekor-Elemente.
"use strict";

import { CHUNK_COLS, CHUNK_ROWS, TILE_TYPES } from './chunkLibrary.js';
import { getBiomePalette } from './dungeonGenerator.js';
import dungeonData from '../data/dungeon.json';

const T = TILE_TYPES;

/**
 * Erstellt das Dungeon-Render-System (Seitenansicht)
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {CanvasRenderingContext2D} ctx.ctx
 * @param {Function} ctx.getDungeonState
 * @param {Object} ctx.MODELS - Render-Modelle (player, simpleShadow etc.)
 * @param {Object} ctx.SPRITES - Sprite-Proxy
 * @param {Function} ctx.spriteReady - Prüft ob Sprite geladen
 */
export function createDungeonRenderSystem(ctx) {
	const { canvas, ctx: c, getDungeonState, MODELS, SPRITES, spriteReady } = ctx;

	// Dekor-Cache pro Chunk (wird einmal generiert)
	const dekorCache = new WeakMap();
	const enemySpriteKeyCache = new Map();
	const bossSpriteKeyCache = new Map();

	const ENEMY_SPRITE_CANDIDATES = {
		qualle: ['foe', 'shadowfish'],
		steinkrabbe: ['bogenschreck', 'stingray'],
		leuchtfisch: ['ritterfisch', 'shadowfish'],
		seeigel: ['shadowfish', 'abyssal'],
		muraene: ['seadrake', 'stingray'],
		panzerfisch: ['abyssal', 'titan'],
		tintenfisch: ['oktopus', 'deepseaKraken'],
		steinwaechter: ['leviathan', 'titan']
	};

	function roomWidth(ds) { return ds?.roomPixelWidth || canvas.width; }
	function roomHeight(ds) { return ds?.roomPixelHeight || canvas.height; }
	function tw(ds) { return roomWidth(ds) / CHUNK_COLS; }
	function th(ds) { return roomHeight(ds) / CHUNK_ROWS; }

	function resolveSpriteKey(candidates, cacheKey, cacheMap) {
		if (!Array.isArray(candidates) || candidates.length === 0 || !SPRITES) return null;
		if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey);
		for (const key of candidates) {
			if (!(key in SPRITES)) continue;
			cacheMap.set(cacheKey, key);
			return key;
		}
		cacheMap.set(cacheKey, null);
		return null;
	}

	function getEnemySprite(enemyType) {
		const candidates = ENEMY_SPRITE_CANDIDATES[enemyType];
		const key = resolveSpriteKey(candidates, String(enemyType || ''), enemySpriteKeyCache);
		if (!key) return null;
		const sprite = SPRITES[key];
		return spriteReady(sprite) ? sprite : null;
	}

	function getBossSpriteForFloor(floor) {
		const floorNum = Math.max(1, Math.floor(floor || 1));
		const bucket = Math.min(8, Math.max(1, floorNum));
		const candidates = {
			1: ['boss', 'leviathan'],
			2: ['boss', 'hydra'],
			3: ['leviathan', 'deepseaKraken'],
			4: ['hydra', 'deepseaKraken'],
			5: ['deepseaKraken', 'titan'],
			6: ['deepseaKraken', 'titan'],
			7: ['titan', 'cashfish'],
			8: ['titan', 'cashfish']
		}[bucket] || ['boss'];

		const key = resolveSpriteKey(candidates, `boss_${bucket}`, bossSpriteKeyCache);
		if (!key) return null;
		const sprite = SPRITES[key];
		return spriteReady(sprite) ? sprite : null;
	}

	function renderSpriteEntity(sprite, px, py, targetHeight, options = {}) {
		if (!sprite) return false;
		const sourceW = Math.max(1, sprite.naturalWidth || sprite.width || 1);
		const sourceH = Math.max(1, sprite.naturalHeight || sprite.height || 1);
		const drawH = Math.max(8, targetHeight);
		const drawW = Math.max(8, drawH * (sourceW / sourceH));
		const rotation = options.rotation || 0;
		const flipX = !!options.flipX;
		const alpha = Number.isFinite(options.alpha) ? options.alpha : 1;

		c.save();
		c.globalAlpha = alpha;
		c.translate(px, py);
		c.rotate(rotation);
		c.scale(flipX ? -1 : 1, 1);
		c.imageSmoothingEnabled = false;
		c.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
		c.restore();
		return true;
	}

	// ---- Haupt-Render ----
	function render() {
		const ds = getDungeonState();
		if (!ds || !ds.currentFloor) return;
		const palette = getBiomePalette(ds.currentFloor.biome);
		c.clearRect(0, 0, canvas.width, canvas.height);
		renderBackground(palette);

		if (ds.transition) {
			renderTransition(ds, palette);
		} else {
			const chunk = getChunk(ds);
			const roomWorldX = ds.currentRoomX * roomWidth(ds);
			const roomWorldY = ds.currentRoomY * roomHeight(ds);
			const camX = ds.camera?.x ?? roomWorldX;
			const camY = ds.camera?.y ?? roomWorldY;
			const roomOx = roomWorldX - camX;
			const roomOy = roomWorldY - camY;
			if (chunk) {
				renderWorldRoomsBase(ds, palette, camX, camY);
				renderSpawnMarkers(chunk, ds, roomOx, roomOy);
				renderPickups(ds, roomOx, roomOy);
				renderEnemies(ds, roomOx, roomOy);
				renderEnemyProjectiles(ds, roomOx, roomOy);
				renderInkClouds(ds, roomOx, roomOy);
				renderShockwaves(ds, roomOx, roomOy);
				renderBoss(ds, roomOx, roomOy);
				renderProjectiles(ds, roomOx, roomOy);
				renderBossProjectiles(ds, roomOx, roomOy);
				renderHelpers(ds, roomOx, roomOy);
				renderPlayer(ds, roomOx, roomOy);
				renderAttackEffect(ds, roomOx, roomOy);
				renderDoorArrows(chunk, palette, roomOx, roomOy);
				renderDarkness(ds, roomOx, roomOy);
				if (chunk.type === "exit") renderExitPortal(chunk, ds, roomOx, roomOy);
				if (chunk.type === "checkpoint") renderCheckpoint(chunk, ds, roomOx, roomOy);
			}
		}

		renderMinimap(ds, palette);
		renderHUD(ds);
	}

	function renderWorldRoomsBase(ds, palette, camX, camY) {
		const floor = ds.currentFloor;
		if (!floor) return;
		for (let gy = 0; gy < floor.gridRows; gy++) {
			for (let gx = 0; gx < floor.gridCols; gx++) {
				const chunk = floor.grid[gy]?.[gx];
				if (!chunk) continue;
				const ox = gx * roomWidth(ds) - camX;
				const oy = gy * roomHeight(ds) - camY;
				renderChunk(chunk, palette, ox, oy);
				renderDekor(chunk, palette, ox, oy, floor.biome);
			}
		}
	}

	// ---- Hintergrund (Gradient wie Unterwasser) ----
	function renderBackground(palette) {
		const grad = c.createLinearGradient(0, 0, 0, canvas.height);
		grad.addColorStop(0, palette.bgTop || palette.wall);
		grad.addColorStop(1, palette.bgBottom || palette.floor);
		c.fillStyle = grad;
		c.fillRect(0, 0, canvas.width, canvas.height);
	}

	// ---- Chunk-Tiles rendern (Seitenansicht) ----
	function renderChunk(chunk, palette, ox, oy) {
		const ds = getDungeonState();
		const w = tw(ds), h = th(ds);
		const grid = chunk.grid;

		for (let y = 0; y < CHUNK_ROWS; y++) {
			for (let x = 0; x < CHUNK_COLS; x++) {
				const tile = grid[y][x];
				const px = ox + x * w;
				const py = oy + y * h;

				switch (tile) {
					case T.FLOOR:
						// Offener Raum — transparent (Hintergrund scheint durch)
						break;

					case T.WALL: {
						// Solide Wände/Boden/Decke
						c.fillStyle = palette.wall;
						c.fillRect(px, py, w + 0.5, h + 0.5);

						// Oberkante (Licht von oben → hellere Leiste)
						const above = grid[y - 1]?.[x];
						if (above !== undefined && above !== T.WALL) {
							c.fillStyle = palette.wallTop || palette.wall;
							c.fillRect(px, py, w + 0.5, 3);
						}
						// Unterkante (Schatten)
						const below = grid[y + 1]?.[x];
						if (below !== undefined && below !== T.WALL) {
							c.fillStyle = "rgba(0,0,0,0.25)";
							c.fillRect(px, py + h - 2, w + 0.5, 2);
						}
						// Seitenkanten
						const left = grid[y]?.[x - 1];
						if (left !== undefined && left !== T.WALL) {
							c.fillStyle = "rgba(0,0,0,0.15)";
							c.fillRect(px, py, 2, h + 0.5);
						}
						const right = grid[y]?.[x + 1];
						if (right !== undefined && right !== T.WALL) {
							c.fillStyle = "rgba(255,255,255,0.08)";
							c.fillRect(px + w - 2, py, 2, h + 0.5);
						}
						break;
					}

					case T.PIT:
						// Gruben — dunkler Abgrund
						c.fillStyle = palette.pit || "#0a0a1a";
						c.fillRect(px, py, w + 0.5, h + 0.5);
						c.strokeStyle = "rgba(0,0,0,0.5)";
						c.lineWidth = 1;
						c.strokeRect(px + 1, py + 1, w - 2, h - 2);
						break;

					case T.SPIKES: {
						// Stacheln — Boden bleibt transparent, Dornen von unten
						const spikeH = h * 0.6;
						c.fillStyle = palette.spikes || "#bb3333";
						// 3 Dreiecke pro Tile
						for (let i = 0; i < 3; i++) {
							const sx = px + w * (0.15 + i * 0.3);
							c.beginPath();
							c.moveTo(sx - w * 0.09, py + h);
							c.lineTo(sx, py + h - spikeH);
							c.lineTo(sx + w * 0.09, py + h);
							c.fill();
						}
						break;
					}

					case T.DOOR:
						// Türbereiche — subtiler Glow
						c.fillStyle = palette.door || "rgba(100,200,255,0.12)";
						c.fillRect(px, py, w + 0.5, h + 0.5);
						break;
				}
			}
		}
	}

	// ---- Dekor-Elemente (biom-spezifisch) ----
	function renderDekor(chunk, palette, ox, oy, biome) {
		let items = dekorCache.get(chunk);
		if (!items) {
			items = generateDekor(chunk, palette, biome);
			dekorCache.set(chunk, items);
		}

		const ds = getDungeonState();
		const w = tw(ds), h = th(ds);
		c.save();
		c.globalAlpha = 0.5;

		for (const d of items) {
			const px = ox + d.x * w;
			const py = oy + d.y * h;

			switch (d.kind) {
				case "bubble": {
					const bob = Math.sin(performance.now() / 1500 + d.phase) * 4;
					c.fillStyle = "rgba(180,220,255,0.3)";
					c.beginPath();
					c.arc(px + w / 2, py + h / 2 + bob, d.size, 0, Math.PI * 2);
					c.fill();
					break;
				}
				case "seaweed": {
					const sway = Math.sin(performance.now() / 2000 + d.phase) * 3;
					c.strokeStyle = palette.dekor || "#2d6b4f";
					c.lineWidth = 2;
					c.beginPath();
					c.moveTo(px + w / 2, py + h);
					c.quadraticCurveTo(px + w / 2 + sway, py + h * 0.4, px + w / 2 + sway * 0.5, py + h * 0.1);
					c.stroke();
					break;
				}
				case "stone":
					c.fillStyle = palette.dekorStone || "rgba(100,100,120,0.3)";
					c.beginPath();
					c.ellipse(px + w / 2, py + h * 0.7, d.size * 1.4, d.size, 0, 0, Math.PI * 2);
					c.fill();
					break;
				case "crack":
					c.strokeStyle = "rgba(0,0,0,0.2)";
					c.lineWidth = 1;
					c.beginPath();
					c.moveTo(px + 2, py + h * 0.3);
					c.lineTo(px + w * 0.5, py + h * 0.6);
					c.lineTo(px + w - 3, py + h * 0.4);
					c.stroke();
					break;
				// === EIS-BIOM ===
				case "icicle": {
					c.fillStyle = "rgba(150,220,255,0.6)";
					c.beginPath();
					c.moveTo(px + w * 0.3, py);
					c.lineTo(px + w * 0.5, py + h * 0.8);
					c.lineTo(px + w * 0.7, py);
					c.fill();
					c.fillStyle = "rgba(200,240,255,0.3)";
					c.fillRect(px + w * 0.45, py + h * 0.1, 2, h * 0.4);
					break;
				}
				case "crystal": {
					const shimmer = Math.sin(performance.now() / 1200 + d.phase) * 0.3 + 0.5;
					c.fillStyle = `rgba(100,200,255,${shimmer})`;
					c.beginPath();
					c.moveTo(px + w * 0.5, py + h * 0.1);
					c.lineTo(px + w * 0.8, py + h * 0.5);
					c.lineTo(px + w * 0.5, py + h * 0.9);
					c.lineTo(px + w * 0.2, py + h * 0.5);
					c.fill();
					c.strokeStyle = "rgba(200,240,255,0.5)";
					c.lineWidth = 1;
					c.stroke();
					break;
				}
				case "snowflake": {
					const drift = Math.sin(performance.now() / 2500 + d.phase) * 4;
					c.fillStyle = "rgba(220,240,255,0.4)";
					c.beginPath();
					c.arc(px + w / 2 + drift, py + h / 2, d.size * 0.6, 0, Math.PI * 2);
					c.fill();
					break;
				}
				// === LAVA-BIOM ===
				case "ember": {
					const rise = (performance.now() / 2000 + d.phase) % 1;
					const ey = py + h * (1 - rise);
					c.fillStyle = `rgba(255,${120 + Math.floor(rise * 100)},0,${0.7 - rise * 0.6})`;
					c.beginPath();
					c.arc(px + w / 2, ey, d.size * 0.5, 0, Math.PI * 2);
					c.fill();
					break;
				}
				case "lavarock": {
					c.fillStyle = "rgba(80,30,10,0.5)";
					c.beginPath();
					c.ellipse(px + w / 2, py + h * 0.7, d.size * 1.6, d.size * 0.8, 0, 0, Math.PI * 2);
					c.fill();
					c.strokeStyle = "rgba(255,100,0,0.3)";
					c.lineWidth = 1;
					c.beginPath();
					c.arc(px + w * 0.4, py + h * 0.65, 1.5, 0, Math.PI * 2);
					c.stroke();
					break;
				}
				case "ashcloud": {
					const drift2 = Math.sin(performance.now() / 3000 + d.phase) * 5;
					c.fillStyle = "rgba(100,60,40,0.2)";
					c.beginPath();
					c.ellipse(px + w / 2 + drift2, py + h * 0.4, d.size * 2, d.size, 0, 0, Math.PI * 2);
					c.fill();
					break;
				}
			}
		}
		c.restore();
	}

	function generateDekor(chunk, palette, biome) {
		const items = [];
		const grid = chunk.grid;
		// Biom-spezifische Dekor-Typen
		const biomeDekor = {
			stein: ["bubble", "seaweed", "stone", "crack"],
			eis: ["icicle", "crystal", "snowflake", "crack"],
			lava: ["ember", "lavarock", "ashcloud", "crack"]
		};
		const dekorTypes = biomeDekor[biome] || biomeDekor.stein;

		for (let y = 2; y < CHUNK_ROWS - 2; y++) {
			for (let x = 2; x < CHUNK_COLS - 2; x++) {
				if (grid[y][x] !== T.FLOOR) continue;
				const rng = ((x * 73 + y * 137 + chunk.type.charCodeAt(0)) % 100) / 100;
				if (rng > 0.12) continue;

				const idx = Math.floor(rng * 100) % dekorTypes.length;
				const kind = dekorTypes[idx];

				const nearWall = grid[y - 1]?.[x] === T.WALL || grid[y + 1]?.[x] === T.WALL ||
					grid[y]?.[x - 1] === T.WALL || grid[y]?.[x + 1] === T.WALL;
				const aboveIsWall = grid[y - 1]?.[x] === T.WALL;
				const belowIsWall = grid[y + 1]?.[x] === T.WALL;

				if (kind === "seaweed" && !belowIsWall) continue;
				if (kind === "icicle" && !aboveIsWall) continue;
				if (kind === "crack" && !nearWall) continue;

				items.push({
					x, y, kind,
					size: 2 + (rng * 30) % 4,
					phase: rng * Math.PI * 6
				});
			}
		}
		return items;
	}

	// ---- Spieler rendern (echtes Sprite via MODELS.player) ----
	function renderPlayer(ds, ox, oy) {
		const px = ox + ds.playerPx;
		const py = oy + ds.playerPy;
		const angle = (ds.playerAngle || 0) * (ds.playerDir || 1);

		// Invulnerability-Blinken
		if (ds.playerInvulnerable > 0 && Math.floor(ds.playerInvulnerable / 100) % 2 === 0) {
			c.save();
			c.globalAlpha = 0.45;
		}

		// Schatten (leicht verschoben basierend auf Winkel)
		if (MODELS && MODELS.simpleShadow) {
			MODELS.simpleShadow(c, px + 8, py + 22, 22);
		}

		// Spieler-Sprite mit Rotation rendern
		c.save();
		c.translate(px, py);
		c.rotate(angle);

		if (MODELS && MODELS.player) {
			MODELS.player(c, 0, 0, {
				dir: ds.playerDir || 1,
				scale: 0.55
			});
		} else {
			// Fallback: Einfacher Kreis
			c.fillStyle = "#4ade80";
			c.beginPath();
			c.arc(0, 0, 16, 0, Math.PI * 2);
			c.fill();
		}
		c.restore();

		if (ds.playerInvulnerable > 0 && Math.floor(ds.playerInvulnerable / 100) % 2 === 0) {
			c.restore();
		}
	}

	// ---- Projektile rendern ----
	function renderProjectiles(ds, ox, oy) {
		if (!ds.projectiles || ds.projectiles.length === 0) return;

		c.save();
		for (const p of ds.projectiles) {
			const px = ox + p.px;
			const py = oy + p.py;
			const angle = Math.atan2(p.vy, p.vx);
			const alpha = Math.min(1, p.life / 200);

			// Glühender Schuss-Trail
			c.save();
			c.translate(px, py);
			c.rotate(angle);

			// Leucht-Kern
			c.shadowColor = "#88eeff";
			c.shadowBlur = 12;
			c.fillStyle = `rgba(136,238,255,${alpha})`;
			c.beginPath();
			c.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
			c.fill();

			// Heller Kern
			c.shadowBlur = 0;
			c.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
			c.beginPath();
			c.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
			c.fill();

			// Trail-Schweif
			const grad = c.createLinearGradient(-18, 0, 0, 0);
			grad.addColorStop(0, "rgba(100,200,255,0)");
			grad.addColorStop(1, `rgba(136,238,255,${alpha * 0.5})`);
			c.fillStyle = grad;
			c.beginPath();
			c.moveTo(-18, -2.5);
			c.lineTo(0, -3);
			c.lineTo(0, 3);
			c.lineTo(-18, 2.5);
			c.closePath();
			c.fill();

			c.restore();
		}
		c.restore();
	}

	// ---- Feinde rendern (Unterwasser-Stil) ----
	function renderEnemies(ds, ox, oy) {
		if (!ds.roomEnemies) return;
		const spriteAddonEnabled = ds?.dungeonSpriteAddonEnabled === true;
		for (const e of ds.roomEnemies) {
			if (!e.alive) continue;
			if (e.hidden) {
				if (e._ambushTelegraphActive) {
					const pxWarn = ox + e.px;
					const pyWarn = oy + e.py;
					const t = Math.max(0, (e._ambushTelegraphTimer || 0) / 450);
					const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;
					const radius = (22 + (1 - t) * 34) * pulse;

					c.save();
					c.globalAlpha = 0.45 + (1 - t) * 0.35;
					c.strokeStyle = "#ff8844";
					c.lineWidth = 3;
					c.beginPath();
					c.arc(pxWarn, pyWarn, radius, 0, Math.PI * 2);
					c.stroke();

					c.globalAlpha = 0.9;
					c.fillStyle = "#ffcc66";
					for (let i = 0; i < 6; i++) {
						const a = (i / 6) * Math.PI * 2 + performance.now() * 0.005;
						const sx = pxWarn + Math.cos(a) * (radius - 8);
						const sy = pyWarn + Math.sin(a) * (radius - 8);
						c.beginPath();
						c.arc(sx, sy, 2.2, 0, Math.PI * 2);
						c.fill();
					}
					c.restore();
				}
				continue; // Versteckte Muräne/Lavaborwurm nicht rendern
			}
			const px = ox + e.px;
			const py = oy + e.py + (e.bobOffset || 0);
			const s = (e.scale || 1) * 18;
			const swayX = Math.sin(e.sway || 0) * 2;

			// Hit-Flash
			if (e.hitFlash > 0) {
				c.save();
				c.globalAlpha = 0.6;
				c.fillStyle = "#ffffff";
				c.beginPath();
				c.arc(px, py, s + 4, 0, Math.PI * 2);
				c.fill();
				c.restore();
			}

			// Schatten
			c.fillStyle = "rgba(0,0,0,0.15)";
			c.beginPath();
			c.ellipse(px, py + s + 4, s * 0.8, 3, 0, 0, Math.PI * 2);
			c.fill();

			const moveDx = (e._facingX != null)
				? e._facingX
				: ((Number.isFinite(e.targetPx) ? e.targetPx : e.px) - e.px);
			let renderedBySprite = false;
			if (spriteAddonEnabled) {
				const sprite = getEnemySprite(e.type);
				renderedBySprite = renderSpriteEntity(sprite, px, py, s * 2.6, {
					flipX: moveDx < 0,
					alpha: 0.95
				});
			}

			if (!renderedBySprite) {
				const ai = e.ai || "drift";
				switch (ai) {
					case "drift": renderQualle(px, py, s, swayX, e); break;
					case "ground": renderSteinkrabbe(px, py, s, swayX, e); break;
					case "kamikaze": renderLeuchtfisch(px, py, s, swayX, e); break;
					case "turret": renderSeeigel(px, py, s, swayX, e); break;
					case "ambush": renderMuraene(px, py, s, swayX, e); break;
					case "tank": renderPanzerfisch(px, py, s, swayX, e); break;
					case "flee": renderTintenfisch(px, py, s, swayX, e); break;
					case "elite": renderSteinwaechter(px, py, s, swayX, e); break;
					default: renderQualle(px, py, s, swayX, e);
				}
			}

			// HP-Balken
			if (e.hp < e.maxHp) {
				const barW = s * 2.2, barH = 3;
				const barX = px - barW / 2, barY = py - s - 6;
				c.fillStyle = "rgba(0,0,0,0.6)";
				c.fillRect(barX, barY, barW, barH);
				c.fillStyle = "#ff4444";
				c.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
			}
		}
	}

	// --- Qualle: Transparent, pulsierender Blob mit Tentakeln ---
	function renderQualle(px, py, s, swayX, e) {
		const pulse = Math.sin(performance.now() / 600) * 0.1;
		c.save();
		c.globalAlpha = 0.65;
		// Glocke
		c.fillStyle = e.color || "#88ddff";
		c.beginPath();
		c.ellipse(px + swayX, py - s * 0.15, s * (1.0 + pulse), s * 0.75, 0, Math.PI, Math.PI * 2);
		c.fill();
		c.globalAlpha = 0.45;
		// Tentakel
		c.strokeStyle = e.color || "#88ddff";
		c.lineWidth = 2;
		for (let i = 0; i < 5; i++) {
			const tx = px + swayX + (i - 2) * s * 0.35;
			c.beginPath();
			c.moveTo(tx, py + s * 0.1);
			const tentLen = s * 0.9 + Math.sin(performance.now() / 400 + i) * s * 0.2;
			c.quadraticCurveTo(tx + Math.sin(performance.now() / 500 + i * 2) * 6, py + s * 0.5, tx + Math.sin(performance.now() / 300 + i) * 8, py + tentLen);
			c.stroke();
		}
		c.restore();
		// Augen
		c.fillStyle = "rgba(255,255,255,0.8)";
		c.beginPath();
		c.arc(px + swayX - s * 0.2, py - s * 0.25, s * 0.15, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.2, py - s * 0.25, s * 0.15, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#226";
		c.beginPath();
		c.arc(px + swayX - s * 0.17, py - s * 0.25, s * 0.07, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.23, py - s * 0.25, s * 0.07, 0, Math.PI * 2);
		c.fill();
	}

	// --- Steinkrabbe: Krabbe mit Scheren ---
	function renderSteinkrabbe(px, py, s, swayX, e) {
		const snapAnim = e._snapping ? Math.sin(performance.now() / 80) * 0.3 : 0;
		// Körper (flach, breit)
		c.fillStyle = e.color || "#aa7744";
		c.beginPath();
		c.ellipse(px + swayX, py, s * 1.3, s * 0.7, 0, 0, Math.PI * 2);
		c.fill();
		// Panzer-Muster
		c.strokeStyle = "rgba(0,0,0,0.2)";
		c.lineWidth = 1;
		c.beginPath();
		c.ellipse(px + swayX, py - s * 0.1, s * 0.8, s * 0.4, 0, 0, Math.PI * 2);
		c.stroke();
		// Scheren (links + rechts)
		c.fillStyle = e.color || "#aa7744";
		const clawOpen = 0.3 + snapAnim;
		// Linke Schere
		c.beginPath();
		c.arc(px + swayX - s * 1.3, py - s * 0.1, s * 0.4, -clawOpen, clawOpen);
		c.lineTo(px + swayX - s * 1.3, py - s * 0.1);
		c.fill();
		// Rechte Schere
		c.beginPath();
		c.arc(px + swayX + s * 1.3, py - s * 0.1, s * 0.4, Math.PI - clawOpen, Math.PI + clawOpen);
		c.lineTo(px + swayX + s * 1.3, py - s * 0.1);
		c.fill();
		// Beine
		c.strokeStyle = e.color || "#aa7744";
		c.lineWidth = 2;
		for (let i = 0; i < 3; i++) {
			const legX = (i - 1) * s * 0.7;
			const legWiggle = Math.sin(performance.now() / 200 + i * 1.5) * 3;
			c.beginPath();
			c.moveTo(px + swayX + legX - s * 0.5, py + s * 0.5);
			c.lineTo(px + swayX + legX - s * 0.9, py + s * 1.0 + legWiggle);
			c.stroke();
			c.beginPath();
			c.moveTo(px + swayX + legX + s * 0.5, py + s * 0.5);
			c.lineTo(px + swayX + legX + s * 0.9, py + s * 1.0 + legWiggle);
			c.stroke();
		}
		// Augen auf Stiel
		c.fillStyle = "#ffffff";
		c.beginPath();
		c.arc(px + swayX - s * 0.4, py - s * 0.7, s * 0.18, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.4, py - s * 0.7, s * 0.18, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#111";
		c.beginPath();
		c.arc(px + swayX - s * 0.37, py - s * 0.7, s * 0.09, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.43, py - s * 0.7, s * 0.09, 0, Math.PI * 2);
		c.fill();
	}

	// --- Leuchtfisch: Glühender Fisch, pulsiert wenn explodiert ---
	function renderLeuchtfisch(px, py, s, swayX, e) {
		const glow = Math.sin(performance.now() / 300) * 0.3;
		// Glüh-Aura
		c.save();
		c.globalAlpha = 0.25 + glow * 0.15;
		c.fillStyle = e.exploding ? "#ff4400" : (e.color || "#ffee44");
		c.beginPath();
		c.arc(px + swayX, py, s * (e.exploding ? 2.5 : 1.6), 0, Math.PI * 2);
		c.fill();
		c.restore();
		// Explosion-Animation
		if (e.exploding) {
			c.save();
			c.globalAlpha = 0.5 + Math.sin(performance.now() / 50) * 0.3;
			c.fillStyle = "#ff6600";
			const explScale = (e.scale || 1) * (1 + (1 - (e.explodeTimer || 0) / 400) * 1.0);
			c.beginPath();
			c.arc(px + swayX, py, s * explScale, 0, Math.PI * 2);
			c.fill();
			c.restore();
		}
		// Fisch-Körper
		c.fillStyle = e.color || "#ffee44";
		c.beginPath();
		c.ellipse(px + swayX, py, s * 0.9, s * 0.6, 0, 0, Math.PI * 2);
		c.fill();
		// Schwanzflosse
		c.beginPath();
		c.moveTo(px + swayX - s * 0.9, py);
		c.lineTo(px + swayX - s * 1.4, py - s * 0.4);
		c.lineTo(px + swayX - s * 1.4, py + s * 0.4);
		c.closePath();
		c.fill();
		// Auge
		c.fillStyle = "#fff";
		c.beginPath();
		c.arc(px + swayX + s * 0.4, py - s * 0.1, s * 0.18, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#000";
		c.beginPath();
		c.arc(px + swayX + s * 0.45, py - s * 0.1, s * 0.1, 0, Math.PI * 2);
		c.fill();
	}

	// --- Seeigel: Stacheliger Ball ---
	function renderSeeigel(px, py, s, swayX, e) {
		// Stacheln
		c.strokeStyle = e.color || "#aa44aa";
		c.lineWidth = 2;
		const spikeCount = 12;
		for (let i = 0; i < spikeCount; i++) {
			const angle = (i / spikeCount) * Math.PI * 2 + performance.now() / 3000;
			const len = s * (1.2 + Math.sin(performance.now() / 500 + i) * 0.15);
			c.beginPath();
			c.moveTo(px + swayX + Math.cos(angle) * s * 0.6, py + Math.sin(angle) * s * 0.6);
			c.lineTo(px + swayX + Math.cos(angle) * len, py + Math.sin(angle) * len);
			c.stroke();
		}
		// Körper
		c.fillStyle = e.color || "#aa44aa";
		c.beginPath();
		c.arc(px + swayX, py, s * 0.6, 0, Math.PI * 2);
		c.fill();
		// Muster
		c.fillStyle = "rgba(255,255,255,0.2)";
		c.beginPath();
		c.arc(px + swayX - s * 0.1, py - s * 0.1, s * 0.25, 0, Math.PI * 2);
		c.fill();
		// Auge
		c.fillStyle = "#fff";
		c.beginPath();
		c.arc(px + swayX, py, s * 0.15, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#311";
		c.beginPath();
		c.arc(px + swayX + s * 0.03, py, s * 0.08, 0, Math.PI * 2);
		c.fill();
	}

	// --- Muräne: Langer, dünner Schlangenkörper ---
	function renderMuraene(px, py, s, swayX, e) {
		// Wenn retreating: halbtransparent
		if (e._retreating) { c.save(); c.globalAlpha = 0.5; }
		// Schlangenförmiger Körper
		c.strokeStyle = e.color || "#447744";
		c.lineWidth = s * 0.6;
		c.lineCap = "round";
		c.beginPath();
		c.moveTo(px + swayX + s * 1.2, py);
		for (let i = 0; i < 6; i++) {
			const segX = px + swayX + s * 1.2 - (i * s * 0.5);
			const segY = py + Math.sin(performance.now() / 300 + i * 1.2) * s * 0.3;
			c.lineTo(segX, segY);
		}
		c.stroke();
		// Kopf
		c.fillStyle = e.color || "#447744";
		c.beginPath();
		c.ellipse(px + swayX + s * 1.2, py, s * 0.45, s * 0.35, 0, 0, Math.PI * 2);
		c.fill();
		// Maul (offenes Maul wenn dashing)
		if (e._dashing) {
			c.fillStyle = "#cc2222";
			c.beginPath();
			c.ellipse(px + swayX + s * 1.5, py, s * 0.2, s * 0.25, 0, 0, Math.PI * 2);
			c.fill();
		}
		// Augen
		c.fillStyle = "#ffff44";
		c.beginPath();
		c.arc(px + swayX + s * 1.1, py - s * 0.15, s * 0.12, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#111";
		c.beginPath();
		c.arc(px + swayX + s * 1.12, py - s * 0.15, s * 0.06, 0, Math.PI * 2);
		c.fill();
		if (e._retreating) c.restore();
	}

	// --- Panzerfisch: Gepanzerter Fisch mit Schild vorne ---
	function renderPanzerfisch(px, py, s, swayX, e) {
		const facingRight = (e._facingX || 0) >= 0;
		// Körper
		c.fillStyle = e.color || "#667788";
		c.beginPath();
		c.ellipse(px + swayX, py, s * 1.1, s * 0.8, 0, 0, Math.PI * 2);
		c.fill();
		// Panzerplatten (vorne)
		c.fillStyle = "#556677";
		c.strokeStyle = "#445566";
		c.lineWidth = 2;
		const shieldX = facingRight ? px + swayX + s * 0.7 : px + swayX - s * 0.7;
		c.beginPath();
		c.ellipse(shieldX, py, s * 0.3, s * 0.8, 0, 0, Math.PI * 2);
		c.fill();
		c.stroke();
		// Kreuzschraffur auf Panzer
		c.strokeStyle = "rgba(200,200,200,0.3)";
		c.lineWidth = 1;
		for (let i = 0; i < 3; i++) {
			c.beginPath();
			c.moveTo(shieldX, py - s * 0.6 + i * s * 0.4);
			c.lineTo(shieldX + s * 0.2, py - s * 0.4 + i * s * 0.4);
			c.stroke();
		}
		// Schwanzflosse
		const tailDir = facingRight ? -1 : 1;
		c.fillStyle = e.color || "#667788";
		c.beginPath();
		c.moveTo(px + swayX + tailDir * s, py);
		c.lineTo(px + swayX + tailDir * s * 1.5, py - s * 0.4);
		c.lineTo(px + swayX + tailDir * s * 1.5, py + s * 0.4);
		c.closePath();
		c.fill();
		// Auge
		c.fillStyle = "#fff";
		c.beginPath();
		const eyeX = facingRight ? px + swayX + s * 0.3 : px + swayX - s * 0.3;
		c.arc(eyeX, py - s * 0.15, s * 0.18, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#333";
		c.beginPath();
		c.arc(eyeX + (facingRight ? 2 : -2), py - s * 0.15, s * 0.09, 0, Math.PI * 2);
		c.fill();
	}

	// --- Tintenfisch: Oktopus mit vielen Armen ---
	function renderTintenfisch(px, py, s, swayX, e) {
		// Arme
		c.strokeStyle = e.color || "#9944aa";
		c.lineWidth = 3;
		c.lineCap = "round";
		for (let i = 0; i < 6; i++) {
			const baseAngle = (i / 6) * Math.PI + Math.PI * 0.5;
			c.beginPath();
			const ax = px + swayX + Math.cos(baseAngle) * s * 0.6;
			const ay = py + Math.sin(baseAngle) * s * 0.6;
			c.moveTo(ax, ay);
			const armLen = s * 1.1;
			const endX = ax + Math.cos(baseAngle + Math.sin(performance.now() / 400 + i * 1.5) * 0.4) * armLen;
			const endY = ay + Math.sin(baseAngle + Math.sin(performance.now() / 400 + i * 1.5) * 0.4) * armLen;
			c.quadraticCurveTo(
				(ax + endX) / 2 + Math.sin(performance.now() / 300 + i * 2) * 8,
				(ay + endY) / 2,
				endX, endY
			);
			c.stroke();
		}
		// Kopf (groß, rund)
		c.fillStyle = e.color || "#9944aa";
		c.beginPath();
		c.ellipse(px + swayX, py - s * 0.1, s * 0.8, s * 0.9, 0, 0, Math.PI * 2);
		c.fill();
		// Große Augen
		c.fillStyle = "#ffffff";
		c.beginPath();
		c.ellipse(px + swayX - s * 0.3, py - s * 0.2, s * 0.25, s * 0.3, 0, 0, Math.PI * 2);
		c.ellipse(px + swayX + s * 0.3, py - s * 0.2, s * 0.25, s * 0.3, 0, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#221133";
		c.beginPath();
		c.arc(px + swayX - s * 0.28, py - s * 0.2, s * 0.12, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.32, py - s * 0.2, s * 0.12, 0, Math.PI * 2);
		c.fill();
	}

	// --- Steinwächter: Großer Stein-Golem ---
	function renderSteinwaechter(px, py, s, swayX, e) {
		const pulse = Math.sin(performance.now() / 800) * 0.05;
		// Massiver Körper
		c.fillStyle = e.color || "#665544";
		c.beginPath();
		// Eckiger, felsiger Körper
		c.moveTo(px + swayX - s * 1.1, py + s * 0.4);
		c.lineTo(px + swayX - s * 0.8, py - s * (0.9 + pulse));
		c.lineTo(px + swayX - s * 0.2, py - s * (1.1 + pulse));
		c.lineTo(px + swayX + s * 0.3, py - s * (1.0 + pulse));
		c.lineTo(px + swayX + s * 1.0, py - s * 0.6);
		c.lineTo(px + swayX + s * 1.2, py + s * 0.3);
		c.lineTo(px + swayX + s * 0.8, py + s * 0.8);
		c.lineTo(px + swayX - s * 0.6, py + s * 0.9);
		c.closePath();
		c.fill();
		// Risse/Muster
		c.strokeStyle = "rgba(0,0,0,0.25)";
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(px + swayX - s * 0.5, py - s * 0.6);
		c.lineTo(px + swayX + s * 0.2, py + s * 0.2);
		c.moveTo(px + swayX + s * 0.1, py - s * 0.3);
		c.lineTo(px + swayX + s * 0.7, py + s * 0.4);
		c.stroke();
		// Glühende Augen
		c.fillStyle = "#ff4400";
		c.shadowColor = "#ff4400";
		c.shadowBlur = 8;
		c.beginPath();
		c.arc(px + swayX - s * 0.3, py - s * 0.35, s * 0.15, 0, Math.PI * 2);
		c.arc(px + swayX + s * 0.3, py - s * 0.35, s * 0.15, 0, Math.PI * 2);
		c.fill();
		c.shadowBlur = 0;
		// Runen (leuchten bei Schockwelle-Cooldown)
		if (e.shockwaveTimer < 1000) {
			c.save();
			c.globalAlpha = 0.6 + Math.sin(performance.now() / 100) * 0.3;
			c.strokeStyle = "#ff8800";
			c.lineWidth = 2;
			c.beginPath();
			c.arc(px + swayX, py, s * 0.5, 0, Math.PI * 2);
			c.stroke();
			c.restore();
		}
	}

	// ---- Boss rendern (einzigartig pro Etage) ----
	function renderBoss(ds, ox, oy) {
		if (!ds.boss || !ds.boss.alive) return;
		const spriteAddonEnabled = ds?.dungeonSpriteAddonEnabled === true;
		const boss = ds.boss;
		const px = ox + boss.px;
		const py = oy + boss.py + (boss.bobOffset || 0);
		const s = 18 * boss.scale;
		const swayX = Math.sin(boss.sway || 0) * 4;

		// Vergraben → nur Partikel zeigen
		if (boss.burrowed) {
			c.save();
			c.globalAlpha = 0.3 + Math.sin(performance.now() / 200) * 0.15;
			c.fillStyle = "#886644";
			for (let i = 0; i < 5; i++) {
				const rx = px + (Math.random() - 0.5) * s * 2;
				const ry = py + (Math.random() - 0.5) * s;
				c.beginPath();
				c.arc(rx, ry, 4 + Math.random() * 4, 0, Math.PI * 2);
				c.fill();
			}
			c.restore();
			renderBossHPBar(ds, boss);
			return;
		}

		// Hit-Flash
		if (boss.hitFlash > 0) {
			c.save();
			c.globalAlpha = 0.7;
			c.fillStyle = "#ffffff";
			c.beginPath();
			c.arc(px, py, s + 10, 0, Math.PI * 2);
			c.fill();
			c.restore();
		}

		// Schatten
		c.fillStyle = "rgba(0,0,0,0.25)";
		c.beginPath();
		c.ellipse(px, py + s + 8, s * 1, 5, 0, 0, Math.PI * 2);
		c.fill();

		// Charge-Warnung
		if (boss.charging) {
			c.save();
			c.globalAlpha = 0.3 + Math.sin(performance.now() / 60) * 0.2;
			c.strokeStyle = "#ff0000";
			c.lineWidth = 3;
			c.beginPath();
			c.arc(px, py, s + 20, 0, Math.PI * 2);
			c.stroke();
			c.restore();
		}

		// Schild-Orbs rendern
		if (boss.shieldOrbs > 0) {
			c.save();
			c.strokeStyle = "#44ddff";
			c.lineWidth = 2;
			c.globalAlpha = 0.6;
			for (let i = 0; i < boss.shieldOrbs; i++) {
				const angle = (i / boss.shieldOrbs) * Math.PI * 2 + performance.now() / 1000;
				const orbX = px + Math.cos(angle) * (s + 15);
				const orbY = py + Math.sin(angle) * (s + 15);
				c.beginPath();
				c.arc(orbX, orbY, 6, 0, Math.PI * 2);
				c.stroke();
				c.fillStyle = "#88eeff";
				c.fill();
			}
			c.restore();
		}

		// Reflect-Aura
		if (boss.reflecting) {
			c.save();
			c.globalAlpha = 0.25 + Math.sin(performance.now() / 150) * 0.15;
			c.strokeStyle = "#aaffee";
			c.lineWidth = 4;
			c.beginPath();
			c.arc(px, py, s + 18, 0, Math.PI * 2);
			c.stroke();
			c.restore();
		}

		// Laser rendern
		if (boss.laserActive) {
			c.save();
			const laserLen = 800;
			c.strokeStyle = "#ff2200";
			c.lineWidth = 6;
			c.globalAlpha = 0.6 + Math.sin(performance.now() / 80) * 0.2;
			c.shadowColor = "#ff0000";
			c.shadowBlur = 15;
			c.beginPath();
			c.moveTo(px, py);
			c.lineTo(px + Math.cos(boss.laserAngle) * laserLen, py + Math.sin(boss.laserAngle) * laserLen);
			c.stroke();
			c.shadowBlur = 0;
			c.restore();
		}

		// Vortex-Effekt
		if (boss.vortexActive) {
			c.save();
			c.globalAlpha = 0.2;
			c.strokeStyle = "#6688ff";
			c.lineWidth = 2;
			for (let r = 30; r < 200; r += 25) {
				c.beginPath();
				c.arc(px, py, r, performance.now() / 500 + r * 0.02, performance.now() / 500 + r * 0.02 + Math.PI * 1.5);
				c.stroke();
			}
			c.restore();
		}

		// Körper (Sprite bevorzugt, sonst bisherige Boss-Formen)
		const floor = boss.floor || 1;
		let renderedBossSprite = false;
		if (spriteAddonEnabled) {
			const bossSprite = getBossSpriteForFloor(floor);
			const bossFacingLeft = (Number.isFinite(boss.vx) ? boss.vx : ds.playerPx - boss.px) < 0;
			renderedBossSprite = renderSpriteEntity(bossSprite, px + swayX, py, s * 3.1, {
				flipX: bossFacingLeft,
				alpha: 0.96
			});
		}

		if (!renderedBossSprite) {
			c.fillStyle = boss.color;
			c.beginPath();
			if (floor <= 3) {
				// Runde Bosse (Krabben-artig, Quallen-artig)
				c.ellipse(px + swayX, py, s * 1.3, s * 1.1, 0, 0, Math.PI * 2);
			} else if (floor <= 8) {
				// Eckigere Bosse (Fisch-artig, gepanzert)
				c.moveTo(px + swayX - s * 1.3, py);
				c.lineTo(px + swayX - s * 0.5, py - s * 1.1);
				c.lineTo(px + swayX + s * 0.8, py - s * 0.8);
				c.lineTo(px + swayX + s * 1.4, py);
				c.lineTo(px + swayX + s * 0.8, py + s * 0.8);
				c.lineTo(px + swayX - s * 0.5, py + s * 1.1);
				c.closePath();
			} else {
				// Massive Bosse (Golem-artig)
				c.moveTo(px + swayX - s * 1.2, py + s * 0.5);
				c.lineTo(px + swayX - s * 1.0, py - s * 0.9);
				c.lineTo(px + swayX, py - s * 1.2);
				c.lineTo(px + swayX + s * 1.0, py - s * 0.9);
				c.lineTo(px + swayX + s * 1.3, py + s * 0.5);
				c.lineTo(px + swayX + s * 0.7, py + s * 1.0);
				c.lineTo(px + swayX - s * 0.7, py + s * 1.0);
				c.closePath();
			}
			c.fill();
		}

		// Phase-Glow
		if (boss.phase >= 2) {
			c.save();
			c.globalAlpha = 0.2 + Math.sin(performance.now() / 200) * 0.1;
			c.fillStyle = boss.phase >= 3 ? "#ff2200" : "#ffff00";
			c.beginPath();
			c.arc(px + swayX, py, s * 1.5, 0, Math.PI * 2);
			c.fill();
			c.restore();
		}

		// Enrage-Effekt
		if (boss.enraged) {
			c.save();
			c.globalAlpha = 0.3 + Math.sin(performance.now() / 100) * 0.2;
			c.strokeStyle = "#ff0000";
			c.lineWidth = 3;
			// Flammen-artige Partikel
			for (let i = 0; i < 8; i++) {
				const fa = (i / 8) * Math.PI * 2 + performance.now() / 400;
				const fr = s + 10 + Math.sin(performance.now() / 200 + i * 3) * 8;
				c.beginPath();
				c.arc(px + Math.cos(fa) * fr, py + Math.sin(fa) * fr, 4, 0, Math.PI * 2);
				c.stroke();
			}
			c.restore();
		}

		if (!renderedBossSprite) {
			// Krone (mit Phase-Upgrade)
			c.fillStyle = boss.phase >= 3 ? "#ff4400" : boss.phase >= 2 ? "#ffaa00" : "#ffd700";
			const crownY = py - s * 1.0;
			const crownPoints = 3 + boss.phase;
			for (let i = 0; i < crownPoints; i++) {
				const cx = px + swayX + (i - (crownPoints-1)/2) * s * 0.3;
				c.beginPath();
				c.moveTo(cx - s * 0.1, crownY + s * 0.1);
				c.lineTo(cx, crownY - s * 0.3);
				c.lineTo(cx + s * 0.1, crownY + s * 0.1);
				c.fill();
			}
			c.fillRect(px + swayX - s * 0.7, crownY + s * 0.05, s * 1.4, s * 0.1);

			// Augen
			const eyeSpacing = s * 0.4;
			c.fillStyle = "#ffffff";
			c.beginPath();
			c.arc(px - eyeSpacing + swayX, py - s * 0.15, s * 0.25, 0, Math.PI * 2);
			c.arc(px + eyeSpacing + swayX, py - s * 0.15, s * 0.25, 0, Math.PI * 2);
			c.fill();
			const edx = ds.playerPx - boss.px;
			const edy = ds.playerPy - boss.py;
			const ed = Math.hypot(edx, edy) || 1;
			const pupilOff = s * 0.08;
			c.fillStyle = boss.enraged ? "#ff0000" : "#cc0000";
			c.beginPath();
			c.arc(px - eyeSpacing + swayX + (edx / ed) * pupilOff, py - s * 0.15 + (edy / ed) * pupilOff, s * 0.14, 0, Math.PI * 2);
			c.arc(px + eyeSpacing + swayX + (edx / ed) * pupilOff, py - s * 0.15 + (edy / ed) * pupilOff, s * 0.14, 0, Math.PI * 2);
			c.fill();
		}

		// Tentakel rendern
		if (boss.tentacles && boss.tentacles.length > 0) {
			c.strokeStyle = boss.color;
			c.lineWidth = 4;
			c.lineCap = "round";
			for (const t of boss.tentacles) {
				c.save();
				c.globalAlpha = 0.7;
				const endX = px + Math.cos(t.angle) * t.length * t.progress;
				const endY = py + Math.sin(t.angle) * t.length * t.progress;
				c.beginPath();
				c.moveTo(px, py);
				c.quadraticCurveTo(
					(px + endX) / 2 + Math.sin(performance.now() / 200) * 10,
					(py + endY) / 2,
					endX, endY
				);
				c.stroke();
				// Spitze
				c.fillStyle = "#ff4444";
				c.beginPath();
				c.arc(endX, endY, 5, 0, Math.PI * 2);
				c.fill();
				c.restore();
			}
		}

		// Boomerangs rendern
		if (boss.boomerangs && boss.boomerangs.length > 0) {
			c.fillStyle = "#ffaa00";
			for (const b of boss.boomerangs) {
				c.save();
				c.translate(b.px, b.py);
				c.rotate(performance.now() / 100);
				c.beginPath();
				c.moveTo(-8, 0);
				c.lineTo(0, -3);
				c.lineTo(8, 0);
				c.lineTo(0, 3);
				c.closePath();
				c.fill();
				c.restore();
			}
		}

		// Split-Bosse rendern
		if (boss.splitBosses && boss.splitBosses.length > 0) {
			for (const sb of boss.splitBosses) {
				if (!sb.alive) continue;
				const sbx = ox + sb.px;
				const sby = oy + sb.py;
				c.fillStyle = sb.color || boss.color;
				c.beginPath();
				c.ellipse(sbx, sby, 12, 10, 0, 0, Math.PI * 2);
				c.fill();
				c.fillStyle = "#fff";
				c.beginPath();
				c.arc(sbx + 3, sby - 2, 3, 0, Math.PI * 2);
				c.fill();
				c.fillStyle = "#c00";
				c.beginPath();
				c.arc(sbx + 4, sby - 2, 1.5, 0, Math.PI * 2);
				c.fill();
			}
		}

		// Giftspur rendern
		if (boss.poisonTrail && boss.poisonTrail.length > 0) {
			c.save();
			for (const pt of boss.poisonTrail) {
				c.globalAlpha = 0.3 * (pt.timer / 4000);
				c.fillStyle = "#44cc44";
				c.beginPath();
				c.arc(ox + pt.px, oy + pt.py, 12, 0, Math.PI * 2);
				c.fill();
			}
			c.restore();
		}

		// Gespawnte Wände rendern
		if (boss.spawnedWalls && boss.spawnedWalls.length > 0) {
			c.fillStyle = "rgba(100,80,60,0.7)";
			for (const w of boss.spawnedWalls) {
				w.timer -= 16; // ~60fps approx
				if (w.timer > 0) {
					c.fillRect(ox + w.px - w.width/2, oy + w.py - w.height/2, w.width, w.height);
				}
			}
		}

		// Boss-Name anzeigen
		c.save();
		c.font = "bold 11px monospace";
		c.textAlign = "center";
		c.fillStyle = "rgba(255,255,255,0.8)";
		c.fillText(boss.name, px, py + s + 22);
		c.restore();

		// Boss HP-Balken
		renderBossHPBar(ds, boss);
	}

	function renderBossHPBar(ds, boss) {
		const barW = canvas.width * 0.5;
		const barH = 14;
		const barX = (canvas.width - barW) / 2;
		const barY = 18;
		const hpRatio = Math.max(0, boss.hp / boss.maxHp);

		// Hintergrund
		c.fillStyle = "rgba(0,0,0,0.7)";
		c.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

		// HP-Farbe: grün → gelb → rot
		let hpColor;
		if (hpRatio > 0.5) hpColor = `rgb(${Math.floor(255 * (1 - hpRatio) * 2)}, 220, 60)`;
		else hpColor = `rgb(240, ${Math.floor(220 * hpRatio * 2)}, 40)`;

		c.fillStyle = hpColor;
		c.fillRect(barX, barY, barW * hpRatio, barH);

		// Rahmen
		c.strokeStyle = "#ffffff";
		c.lineWidth = 1;
		c.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

		// Boss-Name
		c.fillStyle = "#ffffff";
		c.font = "bold 11px monospace";
		c.textAlign = "center";
		c.fillText(boss.name, canvas.width / 2, barY + barH + 14);
		c.textAlign = "left";
	}

	function renderBossProjectiles(ds, ox, oy) {
		if (!ds.boss || !ds.boss.projectiles || ds.boss.projectiles.length === 0) return;
		for (const p of ds.boss.projectiles) {
			const px = ox + p.px;
			const py = oy + p.py;
			const pulse = Math.sin(performance.now() / 80) * 2;

			// Glüh-Kern
			c.save();
			c.globalAlpha = 0.5;
			c.fillStyle = ds.boss.color || "#ff4444";
			c.beginPath();
			c.arc(px, py, 10 + pulse, 0, Math.PI * 2);
			c.fill();
			c.restore();

			// Solider Kern
			c.fillStyle = "#ffcc00";
			c.beginPath();
			c.arc(px, py, 5 + pulse * 0.5, 0, Math.PI * 2);
			c.fill();
		}
	}

	// ---- Attacke-Effekt ----
	function renderAttackEffect(ds, ox = 0, oy = 0) {
		if (!ds.attackEffect) return;
		const ae = ds.attackEffect;
		const alpha = ae.timer / 200;
		const fx = ox + ae.x;
		const fy = oy + ae.y;
		c.save();
		c.globalAlpha = alpha;

		if (ae.type === "armor") {
			// Funken-Effekt für Panzerung
			c.strokeStyle = "#aaaacc";
			c.lineWidth = 2;
			for (let i = 0; i < 4; i++) {
				const a = Math.random() * Math.PI * 2;
				const r = 10 + Math.random() * 15;
				c.beginPath();
				c.moveTo(fx, fy);
				c.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
				c.stroke();
			}
		} else if (ae.type === "explosion") {
			// Große Explosion
			c.fillStyle = "#ff6600";
			c.beginPath();
			const r = 30 + (1 - alpha) * 40;
			c.arc(fx, fy, r, 0, Math.PI * 2);
			c.fill();
			c.fillStyle = "#ffcc00";
			c.beginPath();
			c.arc(fx, fy, r * 0.5, 0, Math.PI * 2);
			c.fill();
		} else {
			// Standard Stern-Burst
			c.strokeStyle = "#ffee55";
			c.lineWidth = 3;
			const r = 20 + (1 - alpha) * 30;
			c.beginPath();
			c.arc(fx, fy, r, 0, Math.PI * 2);
			c.stroke();
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2 + performance.now() * 0.01;
				c.beginPath();
				c.moveTo(fx + Math.cos(a) * r * 0.5, fy + Math.sin(a) * r * 0.5);
				c.lineTo(fx + Math.cos(a) * r * 1.3, fy + Math.sin(a) * r * 1.3);
				c.stroke();
			}
		}
		c.restore();
	}

	// ---- Gegner-Projektile (Seeigel, etc.) ----
	function renderEnemyProjectiles(ds, ox, oy) {
		if (!ds.enemyProjectiles || ds.enemyProjectiles.length === 0) return;
		for (const p of ds.enemyProjectiles) {
			const px = ox + p.px;
			const py = oy + p.py;
			// Stachel-Projektil
			c.save();
			c.fillStyle = p.color || "#aa44aa";
			c.translate(px, py);
			c.rotate(Math.atan2(p.vy, p.vx));
			c.beginPath();
			c.moveTo(8, 0);
			c.lineTo(-4, -4);
			c.lineTo(-2, 0);
			c.lineTo(-4, 4);
			c.closePath();
			c.fill();
			c.restore();
		}
	}

	// ---- Tintenwolken ----
	function renderInkClouds(ds, ox, oy) {
		if (!ds.inkClouds || ds.inkClouds.length === 0) return;
		c.save();
		for (const cloud of ds.inkClouds) {
			const alpha = 0.5 * (cloud.timer / cloud.maxTimer);
			c.globalAlpha = alpha;
			// Mehrere überlappende Kreise für wolkigen Effekt
			c.fillStyle = "#1a0a2e";
			for (let i = 0; i < 5; i++) {
				const cx = ox + cloud.px + Math.sin(i * 2.1) * cloud.radius * 0.3;
				const cy = oy + cloud.py + Math.cos(i * 1.7) * cloud.radius * 0.3;
				const r = cloud.radius * (0.6 + Math.sin(performance.now() / 500 + i) * 0.15);
				c.beginPath();
				c.arc(cx, cy, r, 0, Math.PI * 2);
				c.fill();
			}
		}
		c.restore();
	}

	// ---- Schockwellen ----
	function renderShockwaves(ds, ox, oy) {
		if (!ds.shockwaves || ds.shockwaves.length === 0) return;
		c.save();
		for (const sw of ds.shockwaves) {
			const alpha = 0.6 * (sw.timer / 900);
			c.globalAlpha = alpha;
			c.strokeStyle = sw.damage > 0 ? "#ff8844" : "#ffff88";
			c.lineWidth = 4;
			c.beginPath();
			c.arc(ox + sw.px, oy + sw.py, sw.radius, 0, Math.PI * 2);
			c.stroke();
			// Innerer Ring
			c.globalAlpha = alpha * 0.5;
			c.lineWidth = 2;
			c.beginPath();
			c.arc(ox + sw.px, oy + sw.py, sw.radius * 0.7, 0, Math.PI * 2);
			c.stroke();
		}
		c.restore();
	}

	// ---- Dunkelheit (Boss-Fähigkeit) ----
	function renderDarkness(ds, ox = 0, oy = 0) {
		if (!ds.boss || !ds.boss.darknessTimer || ds.boss.darknessTimer <= 0) return;
		c.save();
		const alpha = Math.min(0.85, 0.85 * (ds.boss.darknessTimer / 3000));
		const playerScreenX = ox + ds.playerPx;
		const playerScreenY = oy + ds.playerPy;
		// Dunkle Schicht mit Loch um Spieler
		const grad = c.createRadialGradient(
			playerScreenX, playerScreenY, 40,
			playerScreenX, playerScreenY, 180
		);
		grad.addColorStop(0, "rgba(0,0,0,0)");
		grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
		c.fillStyle = grad;
		c.fillRect(0, 0, canvas.width, canvas.height);
		c.restore();
	}

	// ---- Pickups ----
	function renderPickups(ds, ox, oy) {
		if (!ds.roomPickups) return;
		for (const p of ds.roomPickups) {
			if (p.collected) continue;
			const px = ox + p.px;
			const py = oy + p.py;
			const wobble = Math.sin(performance.now() / 400 + p.px * 0.1) * 3;

			c.save();
			c.shadowColor = p.type === "coin" ? "#ffd700" : "#66ccff";
			c.shadowBlur = 10;
			c.fillStyle = p.type === "coin" ? "#ffd700" : "#66ccff";
			c.beginPath();
			c.arc(px, py + wobble, 8, 0, Math.PI * 2);
			c.fill();
			c.restore();

			// Glitzern
			if (p.type === "coin") {
				c.fillStyle = "#fff8";
				c.beginPath();
				c.arc(px - 2, py + wobble - 3, 2, 0, Math.PI * 2);
				c.fill();
			}
		}
	}

	// ---- Spawn-Marker (Händler, Checkpoint, Portal) ----
	function renderSpawnMarkers(chunk, ds, ox, oy) {
		const w = tw(), h = th();
		for (const sp of chunk.spawns) {
			if (sp.type === "exitPortal" && !chunk.cleared) continue;
			const px = ox + (sp.x + 0.5) * w;
			const py = oy + (sp.y + 0.5) * h;

			if (sp.type === "merchant") {
				c.font = `${Math.floor(h * 1.2)}px 'Segoe UI'`;
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillText("🛒", px, py);
			}
			if (sp.type === "checkpoint") {
				c.font = `${Math.floor(h * 1.2)}px 'Segoe UI'`;
				c.textAlign = "center";
				c.textBaseline = "middle";
				c.fillText("⛳", px, py);
			}
		}
	}

	// ---- Tür-Pfeile ----
	function renderDoorArrows(chunk, palette, ox, oy) {
		if (!chunk.doors) return;
		const ds = getDungeonState();
		c.save();
		c.font = "bold 18px 'Segoe UI', Arial";
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.fillStyle = palette.door || "#88ccff";
		c.shadowColor = palette.door || "#88ccff";
		c.shadowBlur = 8;

		const midX = roomWidth(ds) / 2, midY = roomHeight(ds) / 2;
		const pulse = Math.sin(performance.now() / 600) * 4;

		if (chunk.doors.N && chunk.cleared)
			c.fillText("▲", ox + midX, oy + th(ds) * 0.5 + pulse);
		if (chunk.doors.S && chunk.cleared)
			c.fillText("▼", ox + midX, oy + roomHeight(ds) - th(ds) * 0.5 - pulse);
		if (chunk.doors.W && chunk.cleared)
			c.fillText("◀", ox + tw(ds) * 0.5 + pulse, oy + midY);
		if (chunk.doors.E && chunk.cleared)
			c.fillText("▶", ox + roomWidth(ds) - tw(ds) * 0.5 - pulse, oy + midY);

		c.restore();
	}

	// ---- Exit-Portal ----
	function renderExitPortal(chunk, ds, ox = 0, oy = 0) {
		const portal = chunk.spawns.find(s => s.type === "exitPortal");
		if (!portal || !chunk.cleared) return;
		const w = tw(ds), h = th(ds);
		const px = ox + (portal.x + 0.5) * w, py = oy + (portal.y + 0.5) * h;
		const breathe = Math.sin(performance.now() / 600) * 5;
		const r = Math.min(w, h) * 1.4 + breathe;

		c.save();
		c.shadowColor = "#00ffcc";
		c.shadowBlur = 25;
		c.strokeStyle = "#00ffcc";
		c.lineWidth = 3;
		c.beginPath();
		c.arc(px, py, r, 0, Math.PI * 2);
		c.stroke();
		c.fillStyle = "rgba(0,255,204,0.12)";
		c.fill();
		c.restore();

		c.font = "bold 12px 'Segoe UI'";
		c.fillStyle = "#00ffcc";
		c.textAlign = "center";
		c.fillText("Nächstes Stockwerk ↓", px, py + r + 18);
	}

	// ---- Checkpoint ----
	function renderCheckpoint(chunk, ds, ox = 0, oy = 0) {
		const cp = chunk.spawns.find(s => s.type === "checkpoint");
		if (!cp) return;
		const w = tw(ds), h = th(ds);
		const px = ox + (cp.x + 0.5) * w, py = oy + (cp.y + 0.5) * h;
		const glow = Math.sin(performance.now() / 800) * 0.3 + 0.7;

		c.save();
		c.globalAlpha = glow;
		c.shadowColor = ds.checkpointActivated ? "#4ade80" : "#ffd700";
		c.shadowBlur = 18;
		c.fillStyle = ds.checkpointActivated ? "#4ade80" : "#ffd700";
		c.beginPath();
		c.arc(px, py, Math.min(w, h) * 0.7, 0, Math.PI * 2);
		c.fill();
		c.restore();

		c.font = "bold 11px 'Segoe UI'";
		c.fillStyle = "#fff";
		c.textAlign = "center";
		c.fillText(ds.checkpointActivated ? "✓ Gespeichert" : "Checkpoint", px, py + Math.min(w, h) * 0.7 + 16);
	}

	// ---- Transition (Slide mit Hintergrund) ----
	function renderTransition(ds, palette) {
		const t = ds.transition;
		const progress = Math.min(1, t.elapsed / t.duration);
		const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

		const fromChunk = ds.currentFloor.grid[t.fromY]?.[t.fromX];
		const toChunk = ds.currentFloor.grid[t.toY]?.[t.toX];
		const fromWorldX = t.fromX * roomWidth(ds);
		const fromWorldY = t.fromY * roomHeight(ds);
		const toWorldX = t.toX * roomWidth(ds);
		const toWorldY = t.toY * roomHeight(ds);
		const camX = ds.camera?.x ?? (fromWorldX + (toWorldX - fromWorldX) * ease);
		const camY = ds.camera?.y ?? (fromWorldY + (toWorldY - fromWorldY) * ease);
		const fromOx = fromWorldX - camX;
		const fromOy = fromWorldY - camY;
		const toOx = toWorldX - camX;
		const toOy = toWorldY - camY;

		if (fromChunk) {
			renderBackground(palette);
			renderChunk(fromChunk, palette, fromOx, fromOy);
			renderDekor(fromChunk, palette, fromOx, fromOy, ds.currentFloor.biome);
			renderPlayer(ds, fromOx, fromOy);
		}
		if (toChunk) {
			renderChunk(toChunk, palette, toOx, toOy);
			renderDekor(toChunk, palette, toOx, toOy, ds.currentFloor.biome);
		}
	}

	// ---- Minimap ----
	function renderMinimap(ds, palette) {
		const floor = ds.currentFloor;
		if (!floor) return;

		const cellSz = 18, gap = 2;
		const mapW = floor.gridCols * (cellSz + gap) + gap;
		const mapH = floor.gridRows * (cellSz + gap) + gap;
		const mx = canvas.width - mapW - 12, my = 12;

		c.fillStyle = "rgba(0,0,0,0.7)";
		c.strokeStyle = "rgba(255,255,255,0.3)";
		c.lineWidth = 1;
		c.beginPath();
		c.roundRect(mx - 6, my - 6, mapW + 12, mapH + 22, 8);
		c.fill();
		c.stroke();

		c.font = "bold 10px 'Segoe UI'";
		c.fillStyle = "#9aa3c7";
		c.textAlign = "center";
		c.fillText(`Etage ${floor.floor}`, mx + mapW / 2, my + mapH + 10);

		for (let gy = 0; gy < floor.gridRows; gy++) {
			for (let gx = 0; gx < floor.gridCols; gx++) {
				const ch = floor.grid[gy][gx];
				const cx = mx + gap + gx * (cellSz + gap);
				const cy = my + gap + gy * (cellSz + gap);

				if (!ch) {
					c.fillStyle = "rgba(255,255,255,0.05)";
					c.fillRect(cx, cy, cellSz, cellSz);
					continue;
				}

				if (gx === ds.currentRoomX && gy === ds.currentRoomY)
					c.fillStyle = "#4ade80";
				else if (ch.visited)
					c.fillStyle = ch.cleared ? "rgba(74,222,128,0.3)" : "rgba(255,170,0,0.4)";
				else
					c.fillStyle = "rgba(255,255,255,0.15)";

				c.fillRect(cx, cy, cellSz, cellSz);

				if (ch.visited || (gx === ds.currentRoomX && gy === ds.currentRoomY)) {
					const icon = dungeonData.chunkTypes[ch.type]?.icon;
					if (icon) {
						c.font = `${cellSz - 4}px 'Segoe UI'`;
						c.textAlign = "center";
						c.textBaseline = "middle";
						c.fillText(icon, cx + cellSz / 2, cy + cellSz / 2);
					}
				}

				c.strokeStyle = "rgba(255,255,255,0.2)";
				c.lineWidth = 1;
				if (ch.doors?.E && floor.grid[gy]?.[gx + 1]) {
					c.beginPath();
					c.moveTo(cx + cellSz, cy + cellSz / 2);
					c.lineTo(cx + cellSz + gap, cy + cellSz / 2);
					c.stroke();
				}
				if (ch.doors?.S && floor.grid[gy + 1]?.[gx]) {
					c.beginPath();
					c.moveTo(cx + cellSz / 2, cy + cellSz);
					c.lineTo(cx + cellSz / 2, cy + cellSz + gap);
					c.stroke();
				}
			}
		}
	}

	// ---- HUD ----
	function renderHUD(ds) {
		const pad = 12;

		// Herzen
		c.font = "18px 'Segoe UI'";
		c.textAlign = "left";
		c.textBaseline = "top";
		let hearts = "";
		for (let i = 0; i < ds.maxHearts; i++) hearts += i < ds.hearts ? "❤️" : "🖤";
		c.fillText(hearts, pad, pad);

		// Gold
		c.font = "bold 14px 'Segoe UI'";
		c.fillStyle = "#ffd700";
		c.fillText(`💰 ${ds.coins.toLocaleString("de-DE")}`, pad, pad + 26);

		// Etage + Biom
		c.font = "bold 13px 'Segoe UI'";
		c.fillStyle = "#cfe4ff";
		const biome = dungeonData.biomes[ds.currentFloor.biome]?.label || ds.currentFloor.biome;
		c.fillText(`${biome} · Etage ${ds.currentFloor.floor}`, pad, pad + 46);
		const depthLabel = Number.isFinite(ds.endlessDepth) ? ds.endlessDepth : ds.currentFloor.floor;
		const tierLabel = ds.endlessScaling?.tier ? ` · ${String(ds.endlessScaling.tier).toUpperCase()}` : '';
		c.fillStyle = "#9ed0ff";
		c.fillText(`Tiefe ${depthLabel}${tierLabel}`, pad, pad + 64);

		if (Array.isArray(ds.runModifiers) && ds.runModifiers.length > 0) {
			c.font = "12px 'Segoe UI'";
			c.fillStyle = "#8fe7ff";
			const modLabels = ds.runModifiers.map(modifier => modifier.label).join(' · ');
			c.fillText(`Run-Mods: ${modLabels}`, pad, pad + 82);
		}

		if (ds.sessionGoal) {
			c.font = "12px 'Segoe UI'";
			c.fillStyle = ds.sessionGoal.completed ? "#8df58f" : "#ffe08a";
			const progress = `${Math.floor(ds.sessionGoal.progress || 0)}/${Math.floor(ds.sessionGoal.target || 0)}`;
			const done = ds.sessionGoal.completed ? " ✓" : "";
			c.fillText(`🎯 ${ds.sessionGoal.label} (${progress})${done}`, pad, pad + 100);
		}

		renderEnemyRadar(ds, pad);

		// Seed-Anzeige (fürs Teilen)
		c.font = "10px 'Segoe UI Mono', monospace";
		c.fillStyle = "rgba(255,255,255,0.3)";
		c.textAlign = "right";
		c.fillText(`Seed: ${ds.seed}  (Ctrl+C = Kopieren)`, canvas.width - pad, canvas.height - pad);
		c.textAlign = "left";

		// Feind-Count
		const chunk = getChunk(ds);
		if (chunk && !chunk.cleared && ds.roomEnemies?.length > 0) {
			const alive = ds.roomEnemies.filter(e => e.alive).length;
			if (alive > 0) {
				c.font = "bold 14px 'Segoe UI'";
				c.fillStyle = "#ff6b6b";
				c.textAlign = "center";
				c.fillText(`⚔ ${alive} Gegner übrig`, canvas.width / 2, canvas.height - 22);
			}
		}

		// Clear-Banner
		if (ds.clearBanner > 0) {
			c.save();
			c.globalAlpha = Math.min(1, ds.clearBanner / 500);
			c.font = "bold 24px 'Segoe UI'";
			c.textAlign = "center";
			c.textBaseline = "middle";

			// Helfer-Karten-Drop: eigener Text + Farbe
			if (ds.clearBannerText) {
				c.fillStyle = "#f59e0b";
				c.shadowColor = "#f59e0b";
				c.shadowBlur = 18;
				c.fillText(ds.clearBannerText, canvas.width / 2, canvas.height / 2 - 70);
				// Neutraler Banner darunter
				c.fillStyle = "#4ade80";
				c.shadowColor = "#4ade80";
				c.fillText("✓ Fortschritt", canvas.width / 2, canvas.height / 2 - 40);
			} else {
				c.fillStyle = "#4ade80";
				c.shadowColor = "#4ade80";
				c.shadowBlur = 18;
				c.fillText("✓ Raum gesäubert!", canvas.width / 2, canvas.height / 2 - 50);
			}
			c.restore();
		}
		if (ds.clearBanner <= 0 && ds.clearBannerText) ds.clearBannerText = null;

		// Steuerung-Hinweis (erste Etage)
		if (ds.currentFloor.floor === 1 && ds.totalFloorsCleared === 0) {
			c.font = "11px 'Segoe UI'";
			c.fillStyle = "rgba(255,255,255,0.35)";
			c.textAlign = "center";
			c.fillText("WASD = Schwimmen · Leertaste = Schuss · ESC = Rückzug", canvas.width / 2, canvas.height - 6);
		}
	}

	function renderEnemyRadar(ds, pad = 12) {
		const roomEnemies = Array.isArray(ds.roomEnemies) ? ds.roomEnemies.filter(enemy => enemy && enemy.alive) : [];
		if (roomEnemies.length <= 0) return;

		const panelW = 146;
		const panelH = 146;
		const panelX = canvas.width - panelW - pad;
		const panelY = pad + 12;

		const roomW = Math.max(1, roomWidth(ds));
		const roomH = Math.max(1, roomHeight(ds));

		c.save();
		c.fillStyle = 'rgba(8,20,38,0.86)';
		c.strokeStyle = 'rgba(102,187,255,0.65)';
		c.lineWidth = 1;
		c.fillRect(panelX, panelY, panelW, panelH);
		c.strokeRect(panelX, panelY, panelW, panelH);

		c.fillStyle = '#d7ecff';
		c.font = "bold 11px 'Segoe UI'";
		c.textAlign = 'center';
		c.textBaseline = 'top';
		c.fillText('RADAR', panelX + panelW / 2, panelY + 6);

		const mapPad = 18;
		const mapX = panelX + mapPad;
		const mapY = panelY + 24;
		const mapW = panelW - mapPad * 2;
		const mapH = panelH - 34;

		c.strokeStyle = 'rgba(120,170,220,0.5)';
		c.strokeRect(mapX, mapY, mapW, mapH);

		const playerDotX = mapX + (Math.max(0, Math.min(roomW, ds.playerPx || 0)) / roomW) * mapW;
		const playerDotY = mapY + (Math.max(0, Math.min(roomH, ds.playerPy || 0)) / roomH) * mapH;
		c.fillStyle = '#4ade80';
		c.beginPath();
		c.arc(playerDotX, playerDotY, 3.2, 0, Math.PI * 2);
		c.fill();

		for (const enemy of roomEnemies) {
			const ex = mapX + (Math.max(0, Math.min(roomW, enemy.px || 0)) / roomW) * mapW;
			const ey = mapY + (Math.max(0, Math.min(roomH, enemy.py || 0)) / roomH) * mapH;
			c.fillStyle = enemy.ai === 'elite' ? '#ff7a7a' : '#ffd166';
			c.beginPath();
			c.arc(ex, ey, enemy.ai === 'elite' ? 3.4 : 2.6, 0, Math.PI * 2);
			c.fill();
		}

		c.textAlign = 'left';
		c.font = "10px 'Segoe UI'";
		c.fillStyle = 'rgba(220,235,255,0.8)';
		c.fillText(`${roomEnemies.length} Ziele`, panelX + 8, panelY + panelH - 12);
		c.restore();
	}

	function getChunk(ds) {
		return ds.currentFloor?.grid[ds.currentRoomY]?.[ds.currentRoomX] || null;
	}

	// ================================================================
	// HELFER-BEGLEITER RENDERING
	// ================================================================
	const HELPER_ROLE_COLORS = {
		tank: '#3b82f6',
		healer: '#22c55e',
		dps: '#ef4444'
	};

	function renderHelpers(ds, ox, oy) {
		if (!ds.helpers || ds.helpers.length === 0) return;

		for (const h of ds.helpers) {
			if (!h.alive) continue;

			const px = ox + h.x;
			const py = oy + h.y + (h.bobOffset || 0);
			const roleColor = h.color || HELPER_ROLE_COLORS[h.role] || '#f59e0b';
			const radius = 16;

			// Invulnerability-Blinken
			if (h.invuln > 0 && Math.floor(h.invuln / 80) % 2 === 0) continue;

			// Hit-Flash
			if (h.hitFlash > 0) {
				c.save();
				c.globalAlpha = 0.5;
				c.fillStyle = '#ffffff';
				c.beginPath();
				c.arc(px, py, radius + 4, 0, Math.PI * 2);
				c.fill();
				c.restore();
			}

			// Heal-Flash (Heiler heilt)
			if (h._healFlash > 0) {
				c.save();
				c.globalAlpha = h._healFlash / 500 * 0.5;
				c.fillStyle = '#22c55e';
				c.beginPath();
				c.arc(px, py, radius + 8, 0, Math.PI * 2);
				c.fill();
				c.restore();
			}

			// Schatten
			c.fillStyle = 'rgba(0,0,0,0.15)';
			c.beginPath();
			c.ellipse(px, py + radius + 4, radius * 0.7, 3, 0, 0, Math.PI * 2);
			c.fill();

			// Glow-Aura
			c.save();
			c.globalAlpha = 0.2;
			c.fillStyle = roleColor;
			c.beginPath();
			c.arc(px, py, radius + 5, 0, Math.PI * 2);
			c.fill();
			c.restore();

			// Körper (Kreis in Rollenfarbe)
			c.fillStyle = roleColor;
			c.beginPath();
			c.arc(px, py, radius, 0, Math.PI * 2);
			c.fill();

			// Rand
			c.strokeStyle = 'rgba(255,255,255,0.5)';
			c.lineWidth = 2;
			c.beginPath();
			c.arc(px, py, radius, 0, Math.PI * 2);
			c.stroke();

			// Icon (Emoji)
			c.save();
			c.font = '18px "Segoe UI Emoji", sans-serif';
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillText(h.icon || '🐟', px, py + 1);
			c.restore();

			// Name über dem Kopf
			c.font = 'bold 9px "Segoe UI"';
			c.fillStyle = roleColor;
			c.textAlign = 'center';
			c.fillText(h.name || 'Helfer', px, py - radius - 10);

			// HP-Balken
			const barW = radius * 2.5;
			const barH = 3;
			const barX = px - barW / 2;
			const barY = py - radius - 5;
			c.fillStyle = 'rgba(0,0,0,0.6)';
			c.fillRect(barX, barY, barW, barH);
			const hpRatio = Math.max(0, h.hp / h.maxHp);
			const hpColor = hpRatio > 0.5 ? '#4ade80' : (hpRatio > 0.25 ? '#fbbf24' : '#ef4444');
			c.fillStyle = hpColor;
			c.fillRect(barX, barY, barW * hpRatio, barH);
		}
	}

	return { render };
}
