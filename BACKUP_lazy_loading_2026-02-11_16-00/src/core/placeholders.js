// ============================================================
// PLACEHOLDER GENERATOR - Erzeugt Platzhalter-Grafiken
// ============================================================
// Generiert farbige Rechtecke mit Labels als temporäre Sprites
// Wird durch echte PNGs ersetzt wenn verfügbar

/**
 * Farb-Palette für verschiedene Gebäude-Typen
 */
export const PLACEHOLDER_COLORS = {
	// Gebäude
	harbor: '#1a5276',      // Dunkelblau (Wasser/Hafen)
	workshop: '#7d3c00',    // Braun (Holz/Metall)
	academy: '#4a235a',     // Lila (Wissen/Magie)
	barracks: '#7b241c',    // Dunkelrot (Militär)
	market: '#d4ac0d',      // Gold (Handel)
	laboratory: '#1d8348',  // Grün (Alchemie)
	garden: '#27ae60',      // Hellgrün (Pflanzen)
	main_city: '#2c3e50',   // Grau (Stadt)
	
	// NPCs
	harbormaster: '#2980b9',
	blacksmith: '#a04000',
	teacher: '#6c3483',
	captain: '#a93226',
	merchant: '#f1c40f',
	alchemist: '#239b56',
	gardener: '#52be80',
	
	// UI
	teleporter: '#00bcd4',  // Cyan (Portal)
	map_bg: '#1a1a2e',      // Dunkel (Karten-Hintergrund)
	icon: '#ecf0f1'         // Hell (Icons)
};

/**
 * Cache für generierte Platzhalter-Canvas
 */
const placeholderCache = new Map();

/**
 * Erstellt einen Canvas-Platzhalter
 * @param {string} id - Eindeutige ID (z.B. "harbor", "blacksmith")
 * @param {number} width - Breite in Pixeln
 * @param {number} height - Höhe in Pixeln
 * @param {string} [label] - Optionales Label (wird angezeigt)
 * @param {string} [type] - Typ: "building", "npc", "icon", "background"
 * @returns {HTMLCanvasElement} Canvas-Element als Bild-Ersatz
 */
export function createPlaceholder(id, width, height, label = null, type = 'building') {
	const cacheKey = `${id}_${width}_${height}_${type}`;
	
	if (placeholderCache.has(cacheKey)) {
		return placeholderCache.get(cacheKey);
	}
	
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	
	// Hintergrundfarbe
	const color = PLACEHOLDER_COLORS[id] || '#555555';
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, width, height);
	
	// Rahmen
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2;
	ctx.strokeRect(2, 2, width - 4, height - 4);
	
	// Innerer Rahmen (dunkel)
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
	ctx.lineWidth = 1;
	ctx.strokeRect(4, 4, width - 8, height - 8);
	
	// Label-Text
	const displayLabel = label || id.toUpperCase();
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	// Schriftgröße basierend auf Canvas-Größe
	const fontSize = Math.min(width / 6, height / 4, 24);
	ctx.font = `bold ${fontSize}px Arial, sans-serif`;
	
	// Text-Schatten für Lesbarkeit
	ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
	ctx.shadowBlur = 3;
	ctx.shadowOffsetX = 1;
	ctx.shadowOffsetY = 1;
	
	// Mehrzeiliger Text bei langen Labels
	const words = displayLabel.split(' ');
	if (words.length > 1 && height > 60) {
		const lineHeight = fontSize * 1.2;
		const startY = height / 2 - (lineHeight * (words.length - 1)) / 2;
		words.forEach((word, i) => {
			ctx.fillText(word, width / 2, startY + i * lineHeight);
		});
	} else {
		ctx.fillText(displayLabel, width / 2, height / 2);
	}
	
	// Typ-Indikator (klein unten rechts)
	ctx.shadowBlur = 0;
	ctx.font = `10px Arial`;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'bottom';
	ctx.fillText(type.toUpperCase(), width - 6, height - 4);
	
	// Im Cache speichern
	placeholderCache.set(cacheKey, canvas);
	
	return canvas;
}

/**
 * Erstellt einen Gebäude-Platzhalter (größer)
 */
export function createBuildingPlaceholder(id, label = null) {
	return createPlaceholder(id, 200, 150, label, 'building');
}

/**
 * Erstellt einen Gebäude-Hintergrund-Platzhalter (Canvas-Größe)
 */
export function createBuildingBackground(id, width = 800, height = 600) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	
	// Gradient-Hintergrund
	const color = PLACEHOLDER_COLORS[id] || '#333333';
	const gradient = ctx.createLinearGradient(0, 0, 0, height);
	gradient.addColorStop(0, adjustColor(color, 30));
	gradient.addColorStop(1, adjustColor(color, -30));
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
	
	// Großer Label-Text
	ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = 'bold 72px Arial, sans-serif';
	ctx.fillText(id.toUpperCase(), width / 2, height / 2);
	
	// Hinweis-Text
	ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
	ctx.font = '16px Arial';
	ctx.fillText('[ PLATZHALTER - WIRD DURCH PNG ERSETZT ]', width / 2, height - 30);
	
	return canvas;
}

/**
 * Erstellt einen NPC-Platzhalter (kleiner, humanoid Form)
 */
export function createNPCPlaceholder(id, label = null) {
	const width = 64;
	const height = 96;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	
	const color = PLACEHOLDER_COLORS[id] || '#888888';
	
	// Körper (Oval)
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.ellipse(width / 2, height * 0.65, 20, 28, 0, 0, Math.PI * 2);
	ctx.fill();
	
	// Kopf (Kreis)
	ctx.beginPath();
	ctx.arc(width / 2, height * 0.25, 16, 0, Math.PI * 2);
	ctx.fill();
	
	// Augen
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.arc(width / 2 - 6, height * 0.23, 4, 0, Math.PI * 2);
	ctx.arc(width / 2 + 6, height * 0.23, 4, 0, Math.PI * 2);
	ctx.fill();
	
	// Pupillen
	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.arc(width / 2 - 5, height * 0.23, 2, 0, Math.PI * 2);
	ctx.arc(width / 2 + 7, height * 0.23, 2, 0, Math.PI * 2);
	ctx.fill();
	
	// Name unten
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.font = 'bold 9px Arial';
	ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
	ctx.shadowBlur = 2;
	ctx.fillText(label || id, width / 2, height - 4);
	
	return canvas;
}

/**
 * Erstellt einen Teleporter-Platzhalter (animierbar)
 */
export function createTeleporterPlaceholder(frame = 0) {
	const width = 80;
	const height = 120;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	
	// Basis-Plattform
	ctx.fillStyle = '#37474f';
	ctx.beginPath();
	ctx.ellipse(width / 2, height - 10, 35, 12, 0, 0, Math.PI * 2);
	ctx.fill();
	
	// Portal-Glow (animiert)
	const pulseOffset = Math.sin(frame * 0.1) * 0.2;
	const alpha = 0.4 + pulseOffset;
	
	ctx.fillStyle = `rgba(0, 188, 212, ${alpha})`;
	ctx.beginPath();
	ctx.ellipse(width / 2, height / 2, 25 + pulseOffset * 10, 45, 0, 0, Math.PI * 2);
	ctx.fill();
	
	// Innerer Ring
	ctx.strokeStyle = '#00e5ff';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.ellipse(width / 2, height / 2, 20, 38, 0, 0, Math.PI * 2);
	ctx.stroke();
	
	// Lichtstrahlen
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
	ctx.lineWidth = 1;
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2 + frame * 0.02;
		ctx.beginPath();
		ctx.moveTo(width / 2, height / 2);
		ctx.lineTo(
			width / 2 + Math.cos(angle) * 30,
			height / 2 + Math.sin(angle) * 50
		);
		ctx.stroke();
	}
	
	// Label
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.font = 'bold 10px Arial';
	ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
	ctx.shadowBlur = 3;
	ctx.fillText('TELEPORTER', width / 2, 15);
	
	return canvas;
}

/**
 * Erstellt einen Map-Icon-Platzhalter
 */
export function createMapIcon(id, label = null) {
	const size = 48;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	
	const color = PLACEHOLDER_COLORS[id] || '#666666';
	
	// Kreis-Hintergrund
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
	ctx.fill();
	
	// Weißer Rand
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2;
	ctx.stroke();
	
	// Icon-Buchstabe
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = 'bold 20px Arial';
	ctx.fillText((label || id).charAt(0).toUpperCase(), size / 2, size / 2);
	
	return canvas;
}

/**
 * Hilfsfunktion: Farbe aufhellen/abdunkeln
 */
function adjustColor(hex, amount) {
	const color = hex.replace('#', '');
	const r = Math.max(0, Math.min(255, parseInt(color.substr(0, 2), 16) + amount));
	const g = Math.max(0, Math.min(255, parseInt(color.substr(2, 2), 16) + amount));
	const b = Math.max(0, Math.min(255, parseInt(color.substr(4, 2), 16) + amount));
	return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Lädt ein Bild oder erstellt einen Platzhalter wenn nicht vorhanden
 * @param {string} path - Pfad zum Bild
 * @param {string} id - ID für Platzhalter-Farbe
 * @param {string} type - Typ: "building", "npc", "icon", "teleporter", "background"
 * @param {number} [width] - Breite (für background)
 * @param {number} [height] - Höhe (für background)
 * @returns {Promise<HTMLImageElement|HTMLCanvasElement>}
 */
export async function loadSpriteOrPlaceholder(path, id, type = 'building', width = 200, height = 150) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => {
			// Bild nicht gefunden - Platzhalter erstellen
			console.log(`[Placeholder] Erstelle Platzhalter für: ${id} (${type})`);
			let placeholder;
			switch (type) {
				case 'npc':
					placeholder = createNPCPlaceholder(id);
					break;
				case 'icon':
					placeholder = createMapIcon(id);
					break;
				case 'teleporter':
					placeholder = createTeleporterPlaceholder();
					break;
				case 'background':
					placeholder = createBuildingBackground(id, width, height);
					break;
				default:
					placeholder = createBuildingPlaceholder(id);
			}
			resolve(placeholder);
		};
		img.src = path;
	});
}

export default {
	createPlaceholder,
	createBuildingPlaceholder,
	createBuildingBackground,
	createNPCPlaceholder,
	createTeleporterPlaceholder,
	createMapIcon,
	loadSpriteOrPlaceholder,
	PLACEHOLDER_COLORS
};
