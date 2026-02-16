// ============================================================
// OVERWORLD - Top-Down Open-World Unterwasserstadt
// ============================================================
// Chunk-basierte 2D-Welt mit Gebäuden als Landmarken.
// Spieler bewegt sich frei in alle Richtungen.
// Verwendet den vorhandenen Spieler-Sprite (Seitenansicht).
// ============================================================
"use strict";

import { clamp } from '../core/utils.js';
import { renderCharacter, updateCharacterBubbles, renderCharacterBubbles } from './character.js';

// ============================================================
// KONSTANTEN
// ============================================================

/** Chunk-Größe in Pixeln (entspricht Canvas-Dimensionen) */
const CHUNK_W = 800;
const CHUNK_H = 600;

/** Welt-Gitter: Anzahl Chunks in jeder Richtung */
const GRID_COLS = 6;
const GRID_ROWS = 5;

/** Gesamte Welt-Größe */
const WORLD_W = CHUNK_W * GRID_COLS;   // 4800
const WORLD_H = CHUNK_H * GRID_ROWS;   // 3000

/** Spieler-Einstellungen */
const PLAYER_SPEED = 0.28;
const PLAYER_RADIUS = 20;

/** Kamera smooth-follow */
const CAM_LERP = 0.08;

/** Wie viele Chunks um den Spieler herum gerendert werden */
const RENDER_RADIUS = 1;

// ============================================================
// BIOME-SYSTEM
// ============================================================

const BIOMES = {
	sand: {
		name: 'Sand',
		bg: '#1a3a4a',
		detail: '#1e4050',
		accent: '#2a5060',
		groundDots: '#162e3c'
	},
	coral: {
		name: 'Korallen',
		bg: '#1c2e4a',
		detail: '#22385a',
		accent: '#2e4268',
		groundDots: '#182a42'
	},
	seagrass: {
		name: 'Seegras',
		bg: '#122e28',
		detail: '#1a3e34',
		accent: '#1e4a3c',
		groundDots: '#0e2620'
	},
	rock: {
		name: 'Felsen',
		bg: '#1a2230',
		detail: '#222c3a',
		accent: '#2a3444',
		groundDots: '#161e28'
	},
	deep: {
		name: 'Tiefsee',
		bg: '#0a1420',
		detail: '#0e1a2a',
		accent: '#142034',
		groundDots: '#081018'
	}
};

/** Feste Biome-Zuweisungen pro Chunk (Zeile × Spalte) */
const BIOME_MAP = [
	['seagrass', 'seagrass', 'sand',     'sand',   'coral',   'coral'],
	['seagrass', 'sand',     'sand',     'coral',  'coral',   'rock'],
	['rock',     'sand',     'sand',     'sand',   'rock',    'rock'],
	['rock',     'rock',     'deep',     'deep',   'rock',    'deep'],
	['deep',     'deep',     'deep',     'deep',   'deep',    'deep']
];

function getBiome(col, row) {
	if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
		return BIOMES[BIOME_MAP[row][col]] || BIOMES.sand;
	}
	return BIOMES.deep;
}

// ============================================================
// GEBÄUDE-DEFINITIONEN
// ============================================================

const BUILDINGS = [
	{
		id: 'rathaus',
		label: 'Rathaus',
		x: CHUNK_W * 1.5 - 100,    // Chunk (1,0) Mitte
		y: CHUNK_H * 0.5 - 60,
		w: 200,
		h: 120,
		color: '#3a7ca5',
		roofColor: '#2a6080',
		doorColor: '#1a4060',
		floors: 2
	},
	{
		id: 'marktplatz',
		label: 'Marktplatz',
		x: CHUNK_W * 2.2,
		y: CHUNK_H * 1.1,
		w: 260,
		h: 160,
		color: '#4a8a65',
		roofColor: '#3a7050',
		doorColor: '#2a5038',
		floors: 1
	},
	{
		id: 'hafen',
		label: 'Hafen',
		x: CHUNK_W * 4.2,
		y: CHUNK_H * 0.4,
		w: 300,
		h: 130,
		color: '#5a80a0',
		roofColor: '#4a6a88',
		doorColor: '#3a5570',
		floors: 1
	},
	{
		id: 'werkstatt',
		label: 'Werkstatt',
		x: CHUNK_W * 0.3,
		y: CHUNK_H * 2.2,
		w: 180,
		h: 140,
		color: '#8a6a40',
		roofColor: '#6a5030',
		doorColor: '#4a3820',
		floors: 2
	},
	{
		id: 'akademie',
		label: 'Akademie',
		x: CHUNK_W * 3.4,
		y: CHUNK_H * 2.5,
		w: 220,
		h: 180,
		color: '#6060a0',
		roofColor: '#4a4a80',
		doorColor: '#3a3a60',
		floors: 3
	},
	{
		id: 'kaserne',
		label: 'Kaserne',
		x: CHUNK_W * 5.0,
		y: CHUNK_H * 1.8,
		w: 240,
		h: 150,
		color: '#804040',
		roofColor: '#603030',
		doorColor: '#402020',
		floors: 2
	},
	{
		id: 'gaertnerei',
		label: 'Gärtnerei',
		x: CHUNK_W * 1.0,
		y: CHUNK_H * 3.5,
		w: 200,
		h: 120,
		color: '#308040',
		roofColor: '#206030',
		doorColor: '#104020',
		floors: 1
	},
	{
		id: 'taverne',
		label: 'Taverne',
		x: CHUNK_W * 3.8,
		y: CHUNK_H * 0.8,
		w: 160,
		h: 110,
		color: '#8a6a30',
		roofColor: '#6a5020',
		doorColor: '#4a3810',
		floors: 2
	},
	{
		id: 'labor',
		label: 'Labor',
		x: CHUNK_W * 1.6,
		y: CHUNK_H * 2.8,
		w: 190,
		h: 130,
		color: '#5a7090',
		roofColor: '#3a5070',
		doorColor: '#2a4060',
		floors: 2
	},
	{
		id: 'leuchtturm',
		label: 'Leuchtturm',
		x: CHUNK_W * 5.3,
		y: CHUNK_H * 3.8,
		w: 80,
		h: 80,
		color: '#c0c0d0',
		roofColor: '#a0a0b0',
		doorColor: '#808090',
		floors: 4,
		isRound: true
	}
];

// ============================================================
// DEKORATIONS-ELEMENTE (pro Chunk generiert)
// ============================================================

/** Generiert zufällige Deko für einen Chunk (deterministisch per Seed) */
function generateChunkDecorations(col, row) {
	const seed = col * 7919 + row * 6271;
	const rng = seededRandom(seed);
	const biomeKey = BIOME_MAP[row]?.[col] || 'sand';
	const decos = [];

	const count = 6 + Math.floor(rng() * 8);
	for (let i = 0; i < count; i++) {
		const lx = rng() * CHUNK_W;
		const ly = rng() * CHUNK_H;
		const worldX = col * CHUNK_W + lx;
		const worldY = row * CHUNK_H + ly;

		// Nicht auf Gebäuden platzieren
		if (isOnBuilding(worldX, worldY, 30)) continue;

		const type = pickDecoType(biomeKey, rng);
		decos.push({ x: lx, y: ly, type, size: 0.6 + rng() * 0.8, angle: rng() * Math.PI * 2 });
	}
	return decos;
}

function pickDecoType(biomeKey, rng) {
	const roll = rng();
	switch (biomeKey) {
		case 'coral':   return roll < 0.5 ? 'coral' : roll < 0.8 ? 'rock' : 'plant';
		case 'seagrass': return roll < 0.6 ? 'plant' : roll < 0.85 ? 'rock' : 'coral';
		case 'rock':    return roll < 0.7 ? 'rock' : 'plant';
		case 'deep':    return roll < 0.5 ? 'rock' : roll < 0.8 ? 'vent' : 'plant';
		default:        return roll < 0.4 ? 'rock' : roll < 0.7 ? 'plant' : 'shell';
	}
}

function isOnBuilding(wx, wy, pad) {
	for (const b of BUILDINGS) {
		if (wx > b.x - pad && wx < b.x + b.w + pad && wy > b.y - pad && wy < b.y + b.h + pad) {
			return true;
		}
	}
	return false;
}

function seededRandom(seed) {
	let s = seed | 0;
	return function () {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return (s >>> 0) / 0x7fffffff;
	};
}

// ============================================================
// DEKO CACHE
// ============================================================

const decoCache = new Map();

function getChunkDecorations(col, row) {
	const key = `${col},${row}`;
	if (!decoCache.has(key)) {
		decoCache.set(key, generateChunkDecorations(col, row));
	}
	return decoCache.get(key);
}

// ============================================================
// PFADE / STRAßEN zwischen Gebäuden
// ============================================================

const PATHS = [
	{ from: 'rathaus', to: 'marktplatz' },
	{ from: 'rathaus', to: 'hafen' },
	{ from: 'marktplatz', to: 'werkstatt' },
	{ from: 'marktplatz', to: 'akademie' },
	{ from: 'marktplatz', to: 'taverne' },
	{ from: 'hafen', to: 'kaserne' },
	{ from: 'hafen', to: 'taverne' },
	{ from: 'werkstatt', to: 'gaertnerei' },
	{ from: 'werkstatt', to: 'labor' },
	{ from: 'labor', to: 'gaertnerei' },
	{ from: 'labor', to: 'akademie' },
	{ from: 'akademie', to: 'kaserne' },
	{ from: 'akademie', to: 'leuchtturm' },
];

function getBuildingCenter(b) {
	return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

// ============================================================
// STATE FACTORY
// ============================================================

/**
 * Erstellt den Overworld-State
 * @param {HTMLCanvasElement} canvas
 * @returns {Object} overworldState
 */
export function createOverworldState(canvas) {
	// Spieler startet beim Rathaus
	const startBuilding = BUILDINGS.find(b => b.id === 'rathaus');
	const startX = startBuilding ? startBuilding.x + startBuilding.w / 2 : WORLD_W / 2;
	const startY = startBuilding ? startBuilding.y + startBuilding.h + 60 : WORLD_H / 2;

	return {
		player: {
			x: startX,
			y: startY,
			dir: 1,
			facing: 'down',
			speed: PLAYER_SPEED,
			radius: PLAYER_RADIUS,
			moving: false,
			animTime: 0
		},
		camera: {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0,
			w: canvas.width,
			h: canvas.height
		},
		worldW: WORLD_W,
		worldH: WORLD_H,
		chunkW: CHUNK_W,
		chunkH: CHUNK_H,
		gridCols: GRID_COLS,
		gridRows: GRID_ROWS,
		buildings: BUILDINGS,
		showDebug: true,
		elapsed: 0
	};
}

// ============================================================
// UPDATE
// ============================================================

/**
 * Aktualisiert die Overworld
 * @param {Object} ow - Overworld state
 * @param {Object} input - { left, right, up, down }
 * @param {number} dt - Delta-Time in ms
 * @param {HTMLCanvasElement} canvas
 */
export function updateOverworld(ow, input, dt, canvas) {
	const player = ow.player;

	// === Bewegung ===
	let mx = 0, my = 0;
	if (input.left)  mx -= 1;
	if (input.right) mx += 1;
	if (input.up)    my -= 1;
	if (input.down)  my += 1;

	// Diagonale normalisieren
	if (mx !== 0 && my !== 0) {
		const inv = 1 / Math.SQRT2;
		mx *= inv;
		my *= inv;
	}

	player.moving = !!(mx || my);
	if (player.moving) {
		player.animTime += dt;
		// Blickrichtung bestimmen (letzte Bewegungsrichtung)
		if (Math.abs(mx) > Math.abs(my)) {
			player.facing = mx > 0 ? 'right' : 'left';
		} else if (my !== 0) {
			player.facing = my > 0 ? 'down' : 'up';
		}
		if (mx !== 0) player.dir = mx > 0 ? 1 : -1;
	} else {
		// Idle: animTime weiterlaufen lassen für Idle-Animation
		player.animTime += dt;
	}

	player.x += mx * player.speed * dt;
	player.y += my * player.speed * dt;

	// Weltgrenzen
	player.x = clamp(player.x, player.radius, WORLD_W - player.radius);
	player.y = clamp(player.y, player.radius, WORLD_H - player.radius);

	// === Kamera ===
	const cam = ow.camera;
	cam.w = canvas.width;
	cam.h = canvas.height;
	cam.targetX = player.x - cam.w / 2;
	cam.targetY = player.y - cam.h / 2;

	// Clampen
	cam.targetX = clamp(cam.targetX, 0, Math.max(0, WORLD_W - cam.w));
	cam.targetY = clamp(cam.targetY, 0, Math.max(0, WORLD_H - cam.h));

	// Smooth-Follow
	cam.x += (cam.targetX - cam.x) * CAM_LERP * Math.min(dt / 16, 3);
	cam.y += (cam.targetY - cam.y) * CAM_LERP * Math.min(dt / 16, 3);

	// Charakter-Blasen aktualisieren
	updateCharacterBubbles(player.x, player.y, dt, player.moving);

	ow.elapsed += dt;
}

// ============================================================
// RENDER
// ============================================================

/**
 * Rendert die gesamte Overworld
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} ow - Overworld state
 */
export function renderOverworld(ctx, ow) {
	const cam = ow.camera;
	const cw = cam.w;
	const ch = cam.h;
	const cx = Math.round(cam.x);
	const cy = Math.round(cam.y);

	// Hintergrund löschen
	ctx.fillStyle = '#0a1420';
	ctx.fillRect(0, 0, cw, ch);

	// Sichtbare Chunks berechnen
	const startCol = Math.max(0, Math.floor(cx / CHUNK_W) - RENDER_RADIUS);
	const endCol = Math.min(GRID_COLS - 1, Math.floor((cx + cw) / CHUNK_W) + RENDER_RADIUS);
	const startRow = Math.max(0, Math.floor(cy / CHUNK_H) - RENDER_RADIUS);
	const endRow = Math.min(GRID_ROWS - 1, Math.floor((cy + ch) / CHUNK_H) + RENDER_RADIUS);

	ctx.save();
	ctx.translate(-cx, -cy);

	// === Chunks zeichnen ===
	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			renderChunk(ctx, col, row, ow);
		}
	}

	// === Pfade / Straßen zeichnen ===
	renderPaths(ctx, ow);

	// === Gebäude zeichnen ===
	for (const building of BUILDINGS) {
		// Nur sichtbare Gebäude
		if (building.x + building.w < cx - 100 || building.x > cx + cw + 100) continue;
		if (building.y + building.h < cy - 100 || building.y > cy + ch + 100) continue;
		renderBuilding(ctx, building, ow);
	}

	// === Spieler zeichnen ===
	renderPlayer(ctx, ow);

	// === Charakter-Blasen ===
	renderCharacterBubbles(ctx);

	ctx.restore();

	// === UI Overlay (nicht von Kamera beeinflusst) ===
	renderOverlay(ctx, ow);
}

// ============================================================
// CHUNK-RENDERING
// ============================================================

function renderChunk(ctx, col, row, ow) {
	const x = col * CHUNK_W;
	const y = row * CHUNK_H;
	const biome = getBiome(col, row);

	// Hintergrund-Füllung
	ctx.fillStyle = biome.bg;
	ctx.fillRect(x, y, CHUNK_W, CHUNK_H);

	// Subtile Muster / Bodentextur
	ctx.fillStyle = biome.groundDots;
	const seed = col * 3571 + row * 2411;
	const rng = seededRandom(seed);
	for (let i = 0; i < 30; i++) {
		const dx = x + rng() * CHUNK_W;
		const dy = y + rng() * CHUNK_H;
		const r = 1 + rng() * 3;
		ctx.beginPath();
		ctx.arc(dx, dy, r, 0, Math.PI * 2);
		ctx.fill();
	}

	// Biome-spezifische Details
	ctx.fillStyle = biome.detail;
	for (let i = 0; i < 8; i++) {
		const dx = x + rng() * CHUNK_W;
		const dy = y + rng() * CHUNK_H;
		const w = 10 + rng() * 40;
		const h = 10 + rng() * 40;
		ctx.globalAlpha = 0.3 + rng() * 0.3;
		ctx.beginPath();
		ctx.ellipse(dx, dy, w / 2, h / 2, rng() * Math.PI, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	// Dekorationen
	const decos = getChunkDecorations(col, row);
	for (const d of decos) {
		renderDecoration(ctx, x + d.x, y + d.y, d.type, d.size, d.angle, ow.elapsed);
	}

	// Chunk-Rand (subtil)
	ctx.strokeStyle = 'rgba(255,255,255,0.04)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, CHUNK_W, CHUNK_H);
}

// ============================================================
// DEKORATIONEN
// ============================================================

function renderDecoration(ctx, x, y, type, size, angle, elapsed) {
	ctx.save();
	ctx.translate(x, y);

	switch (type) {
		case 'coral': {
			// Koralle
			const sway = Math.sin(elapsed * 0.001 + angle) * 3;
			ctx.fillStyle = `hsl(${340 + angle * 20}, 60%, 40%)`;
			ctx.beginPath();
			ctx.moveTo(-8 * size + sway, 0);
			ctx.quadraticCurveTo(-12 * size + sway, -20 * size, -4 * size + sway, -28 * size);
			ctx.quadraticCurveTo(0 + sway, -32 * size, 4 * size + sway, -28 * size);
			ctx.quadraticCurveTo(12 * size + sway, -20 * size, 8 * size + sway, 0);
			ctx.closePath();
			ctx.fill();
			// Zweiter Zweig
			ctx.fillStyle = `hsl(${350 + angle * 15}, 55%, 35%)`;
			ctx.beginPath();
			ctx.moveTo(4 * size + sway, -5 * size);
			ctx.quadraticCurveTo(16 * size + sway, -18 * size, 10 * size + sway, -24 * size);
			ctx.quadraticCurveTo(6 * size + sway, -20 * size, 4 * size + sway, -5 * size);
			ctx.closePath();
			ctx.fill();
			break;
		}
		case 'plant': {
			// Seegras
			const sway = Math.sin(elapsed * 0.0015 + angle * 2) * 4 * size;
			const blades = 2 + Math.floor(size * 2);
			for (let i = 0; i < blades; i++) {
				const bx = (i - blades / 2) * 6;
				const h = (18 + i * 6) * size;
				ctx.fillStyle = `rgba(30, ${80 + i * 15}, 50, 0.8)`;
				ctx.beginPath();
				ctx.moveTo(bx - 2, 0);
				ctx.quadraticCurveTo(bx + sway * (0.5 + i * 0.3), -h * 0.6, bx + sway, -h);
				ctx.quadraticCurveTo(bx + sway + 2, -h + 2, bx + 2, 0);
				ctx.closePath();
				ctx.fill();
			}
			break;
		}
		case 'rock': {
			// Felsen
			ctx.fillStyle = `rgba(60, 70, 80, 0.7)`;
			ctx.beginPath();
			const r = 8 * size;
			ctx.ellipse(0, 0, r * 1.3, r * 0.8, angle, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(80, 90, 100, 0.5)`;
			ctx.beginPath();
			ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.5, r * 0.3, angle + 0.5, 0, Math.PI * 2);
			ctx.fill();
			break;
		}
		case 'shell': {
			// Muschel
			ctx.fillStyle = '#c0a080';
			ctx.beginPath();
			ctx.ellipse(0, 0, 6 * size, 4 * size, angle, 0, Math.PI);
			ctx.fill();
			ctx.strokeStyle = '#a08060';
			ctx.lineWidth = 0.8;
			for (let i = 0; i < 4; i++) {
				ctx.beginPath();
				ctx.arc(0, 0, (2 + i * 1.5) * size, angle + Math.PI, angle + Math.PI * 2);
				ctx.stroke();
			}
			break;
		}
		case 'vent': {
			// Hydrothermalquelle
			const bubbleT = (elapsed * 0.002 + angle * 10) % 1;
			ctx.fillStyle = 'rgba(80, 60, 40, 0.6)';
			ctx.beginPath();
			ctx.ellipse(0, 0, 10 * size, 6 * size, 0, 0, Math.PI * 2);
			ctx.fill();
			// Blasen
			ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
			for (let i = 0; i < 3; i++) {
				const by = -bubbleT * 30 * size - i * 12;
				const bx = Math.sin(elapsed * 0.003 + i) * 4;
				ctx.beginPath();
				ctx.arc(bx, by, 2 + size, 0, Math.PI * 2);
				ctx.fill();
			}
			break;
		}
	}

	ctx.restore();
}

// ============================================================
// PFADE ZWISCHEN GEBÄUDEN
// ============================================================

function renderPaths(ctx, ow) {
	const buildingMap = {};
	for (const b of BUILDINGS) buildingMap[b.id] = b;

	ctx.save();
	ctx.strokeStyle = 'rgba(120, 140, 160, 0.25)';
	ctx.lineWidth = 12;
	ctx.lineCap = 'round';
	ctx.setLineDash([8, 16]);

	for (const path of PATHS) {
		const from = buildingMap[path.from];
		const to = buildingMap[path.to];
		if (!from || !to) continue;

		const fc = getBuildingCenter(from);
		const tc = getBuildingCenter(to);

		ctx.beginPath();
		ctx.moveTo(fc.x, fc.y);
		// Leicht geschwungener Pfad
		const midX = (fc.x + tc.x) / 2 + (tc.y - fc.y) * 0.15;
		const midY = (fc.y + tc.y) / 2 - (tc.x - fc.x) * 0.15;
		ctx.quadraticCurveTo(midX, midY, tc.x, tc.y);
		ctx.stroke();
	}
	ctx.setLineDash([]);
	ctx.restore();
}

// ============================================================
// GEBÄUDE-RENDERING
// ============================================================

function renderBuilding(ctx, b, ow) {
	const { x, y, w, h, color, roofColor, doorColor, label, floors, isRound } = b;

	ctx.save();

	if (isRound) {
		// Runder Leuchtturm
		const cx = x + w / 2;
		const cy = y + h / 2;
		const r = Math.min(w, h) / 2;

		// Schatten
		ctx.fillStyle = 'rgba(0,0,0,0.3)';
		ctx.beginPath();
		ctx.ellipse(cx + 6, cy + 6, r + 4, r + 4, 0, 0, Math.PI * 2);
		ctx.fill();

		// Hauptkörper
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Ringe (Stockwerke)
		ctx.strokeStyle = roofColor;
		ctx.lineWidth = 2;
		for (let i = 1; i < floors; i++) {
			ctx.beginPath();
			ctx.arc(cx, cy, r * (1 - i / floors), 0, Math.PI * 2);
			ctx.stroke();
		}

		// Lichteffekt oben
		const pulse = 0.6 + 0.4 * Math.sin(ow.elapsed * 0.002);
		ctx.fillStyle = `rgba(255, 255, 200, ${0.3 * pulse})`;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
		ctx.fill();

		// Umriss
		ctx.strokeStyle = 'rgba(200, 220, 240, 0.4)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.stroke();
	} else {
		// Rechteckiges Gebäude

		// Schatten
		ctx.fillStyle = 'rgba(0,0,0,0.3)';
		ctx.fillRect(x + 6, y + 6, w, h);

		// Hauptkörper
		ctx.fillStyle = color;
		ctx.fillRect(x, y, w, h);

		// Dach (oberer Streifen)
		const roofH = h * 0.15;
		ctx.fillStyle = roofColor;
		ctx.fillRect(x - 4, y - 4, w + 8, roofH + 4);

		// Stockwerk-Linien
		if (floors > 1) {
			ctx.strokeStyle = 'rgba(0,0,0,0.2)';
			ctx.lineWidth = 1;
			const floorH = (h - roofH) / floors;
			for (let i = 1; i < floors; i++) {
				const fy = y + roofH + i * floorH;
				ctx.beginPath();
				ctx.moveTo(x, fy);
				ctx.lineTo(x + w, fy);
				ctx.stroke();
			}
		}

		// Tür
		const doorW = Math.min(30, w * 0.2);
		const doorH = Math.min(40, h * 0.25);
		ctx.fillStyle = doorColor;
		ctx.fillRect(x + w / 2 - doorW / 2, y + h - doorH, doorW, doorH);

		// Fenster
		ctx.fillStyle = 'rgba(180, 220, 255, 0.4)';
		const windowSize = 14;
		const windowPad = 20;
		const windowsPerRow = Math.floor((w - windowPad * 2) / (windowSize + 10));

		for (let f = 0; f < Math.min(floors, 3); f++) {
			const fy = y + roofH + (h - roofH) / floors * f + (h - roofH) / floors * 0.3;
			for (let wi = 0; wi < windowsPerRow; wi++) {
				const wx = x + windowPad + wi * ((w - windowPad * 2) / Math.max(1, windowsPerRow - 1)) - windowSize / 2;
				ctx.fillRect(wx, fy, windowSize, windowSize);
				// Fensterkreuz
				ctx.strokeStyle = doorColor;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(wx + windowSize / 2, fy);
				ctx.lineTo(wx + windowSize / 2, fy + windowSize);
				ctx.moveTo(wx, fy + windowSize / 2);
				ctx.lineTo(wx + windowSize, fy + windowSize / 2);
				ctx.stroke();
			}
		}

		// Umriss
		ctx.strokeStyle = 'rgba(200, 220, 240, 0.4)';
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, w, h);
	}

	// Label
	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.font = 'bold 13px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';

	// Label-Hintergrund
	const textW = ctx.measureText(label).width + 12;
	const textH = 18;
	const textX = x + w / 2;
	const textY = y + h + 8;
	ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
	roundRect(ctx, textX - textW / 2, textY - 2, textW, textH, 4);
	ctx.fill();

	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.fillText(label, textX, textY);

	ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

// ============================================================
// SPIELER-RENDERING (Neuer prozeduraler 2D-Charakter)
// ============================================================

function renderPlayer(ctx, ow) {
	const p = ow.player;

	// Charakter mit Animationen zeichnen
	renderCharacter(ctx, p.x, p.y, p.animTime, p.moving, p.facing);
}

// ============================================================
// UI OVERLAY
// ============================================================

function renderOverlay(ctx, ow) {
	const cam = ow.camera;
	const p = ow.player;

	// Titel / Ortsanzeige
	const nearBuilding = getNearestBuilding(p.x, p.y, 150);

	ctx.save();

	// Standort-Anzeige oben
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	roundRect(ctx, 10, 10, 220, 40, 6);
	ctx.fill();

	ctx.fillStyle = '#fff';
	ctx.font = 'bold 14px sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.fillText('🏙️ Unterwasser-Oberwelt', 20, 24);

	if (nearBuilding) {
		ctx.font = '11px sans-serif';
		ctx.fillStyle = '#aaddff';
		ctx.fillText(`In der Nähe: ${nearBuilding.label}`, 20, 40);
	}

	// Minimap
	renderMinimap(ctx, ow);

	// Debug-Info
	if (ow.showDebug) {
		const chunkCol = Math.floor(p.x / CHUNK_W);
		const chunkRow = Math.floor(p.y / CHUNK_H);
		const biomeKey = BIOME_MAP[chunkRow]?.[chunkCol] || '?';
		const biome = getBiome(chunkCol, chunkRow);

		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		roundRect(ctx, 10, cam.h - 80, 300, 70, 6);
		ctx.fill();

		ctx.fillStyle = '#ccc';
		ctx.font = '11px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText(`Pos: ${Math.round(p.x)}, ${Math.round(p.y)}  |  Chunk: ${chunkCol},${chunkRow}`, 20, cam.h - 72);
		ctx.fillText(`Biom: ${biome.name} (${biomeKey})  |  Welt: ${GRID_COLS}×${GRID_ROWS} = ${GRID_COLS * GRID_ROWS} Chunks`, 20, cam.h - 56);
		ctx.fillText(`Kamera: ${Math.round(cam.x)}, ${Math.round(cam.y)}  |  Welt: ${WORLD_W}×${WORLD_H}px`, 20, cam.h - 40);

		// Steuerung
		ctx.fillStyle = '#888';
		ctx.fillText('WASD = Bewegen  |  ESC = Zurück zur Stadt', 20, cam.h - 22);
	}

	ctx.restore();
}

// ============================================================
// MINIMAP
// ============================================================

function renderMinimap(ctx, ow) {
	const cam = ow.camera;
	const mmW = 140;
	const mmH = 90;
	const mmX = cam.w - mmW - 12;
	const mmY = 12;
	const scaleX = mmW / WORLD_W;
	const scaleY = mmH / WORLD_H;

	ctx.save();

	// Hintergrund
	ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
	roundRect(ctx, mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
	ctx.fill();

	// Chunks als farbige Felder
	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			const biome = getBiome(col, row);
			ctx.fillStyle = biome.accent;
			ctx.fillRect(
				mmX + col * CHUNK_W * scaleX,
				mmY + row * CHUNK_H * scaleY,
				CHUNK_W * scaleX - 0.5,
				CHUNK_H * scaleY - 0.5
			);
		}
	}

	// Gebäude als kleine Punkte
	for (const b of BUILDINGS) {
		const bx = mmX + (b.x + b.w / 2) * scaleX;
		const by = mmY + (b.y + b.h / 2) * scaleY;
		ctx.fillStyle = '#fff';
		ctx.fillRect(bx - 2, by - 2, 4, 4);
	}

	// Kamera-Sicht
	ctx.strokeStyle = 'rgba(255, 255, 100, 0.6)';
	ctx.lineWidth = 1;
	ctx.strokeRect(
		mmX + cam.x * scaleX,
		mmY + cam.y * scaleY,
		cam.w * scaleX,
		cam.h * scaleY
	);

	// Spieler-Position
	const px = mmX + ow.player.x * scaleX;
	const py = mmY + ow.player.y * scaleY;
	ctx.fillStyle = '#ff4444';
	ctx.beginPath();
	ctx.arc(px, py, 3, 0, Math.PI * 2);
	ctx.fill();

	// Rahmen
	ctx.strokeStyle = 'rgba(200, 220, 240, 0.3)';
	ctx.lineWidth = 1;
	roundRect(ctx, mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
	ctx.stroke();

	ctx.restore();
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function getNearestBuilding(px, py, maxDist) {
	let nearest = null;
	let nearestDist = maxDist;
	for (const b of BUILDINGS) {
		const cx = b.x + b.w / 2;
		const cy = b.y + b.h / 2;
		const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
		if (dist < nearestDist) {
			nearestDist = dist;
			nearest = b;
		}
	}
	return nearest;
}
