// ============================================================
// OVERWORLD CHARACTER - Einfacher 2D-Charakter mit Animationen
// ============================================================
// Prozedural gezeichneter Charakter mit:
// - Kopf, Körper, Arme, Beine
// - Walk-Animationen (links, rechts, oben, unten)
// - Idle-Animation (leichtes Atmen/Wippen)
// - Unterwasser-Look (Taucher/Meeresbewohner)
// ============================================================
"use strict";

// ============================================================
// FARBEN
// ============================================================
const COLORS = {
	skin: '#7ec8e3',        // Helle Meeresfarbe (Haut)
	skinDark: '#5ba8c8',    // Schatten
	body: '#2a6090',        // Körper/Anzug
	bodyDark: '#1e4a70',    // Körper Schatten
	bodyLight: '#3a7ab0',   // Körper Highlight
	belt: '#d4aa40',        // Gürtel
	boots: '#1a3a50',       // Stiefel
	eyes: '#ffffff',        // Augen weiß
	pupils: '#0a1e30',      // Pupillen
	mouth: '#1a4060',       // Mund
	hair: '#1a5a30',        // Haare (Seegras-grün)
	outline: 'rgba(0,0,0,0.3)' // Umriss
};

// ============================================================
// CHARAKTER-PROPORTIONEN (relativ, Basis-Höhe = 1.0)
// ============================================================
const SCALE = 38;  // Pixel-Größe des Charakters

const BODY = {
	headRadius: 0.22,
	headY: -0.65,
	bodyTop: -0.45,
	bodyBottom: 0.05,
	bodyWidth: 0.22,
	// Arme
	shoulderY: -0.38,
	shoulderWidth: 0.26,
	elbowOffset: 0.28,
	handOffset: 0.42,
	armWidth: 0.06,
	// Beine
	hipY: 0.05,
	hipWidth: 0.14,
	kneeOffset: 0.35,
	footOffset: 0.55,
	legWidth: 0.07,
	// Füße
	footSize: 0.09
};

// ============================================================
// ANIMATION SYSTEM
// ============================================================

/**
 * Berechnet die Gliedmaßen-Winkel basierend auf Animationszeit und Richtung
 * @param {number} animTime - Animationszeit in ms
 * @param {boolean} moving - Ob sich der Charakter bewegt
 * @param {string} facing - Blickrichtung: 'left', 'right', 'up', 'down'
 * @returns {Object} Winkel für alle Gliedmaßen
 */
function getAnimationPose(animTime, moving, facing) {
	const t = animTime * 0.006; // Animation speed
	
	if (!moving) {
		// === IDLE ANIMATION ===
		const breathe = Math.sin(animTime * 0.002) * 0.03;
		const sway = Math.sin(animTime * 0.0015) * 0.02;
		return {
			// Leichtes Atmen
			bodyOffsetY: breathe * SCALE,
			headTilt: sway * 0.5,
			// Arme hängen leicht
			leftArmUpper: 0.15 + sway,
			leftArmLower: 0.1,
			rightArmUpper: -0.15 - sway,
			rightArmLower: -0.1,
			// Beine stehen still
			leftLegUpper: 0.05,
			leftLegLower: 0,
			rightLegUpper: -0.05,
			rightLegLower: 0,
			// Unterwasser-Schwebe
			floatY: Math.sin(animTime * 0.0025) * 2
		};
	}
	
	// === WALK ANIMATION ===
	const walkCycle = Math.sin(t);
	const walkCycle2 = Math.cos(t);
	const stepBounce = Math.abs(Math.sin(t * 2)) * 0.03;
	
	// Bein- und Arm-Schwung (gegengleich)
	const legSwing = walkCycle * 0.5;
	const armSwing = walkCycle * 0.35;
	
	// Knie-Beugung (stärker beim Vorwärtsschwung)
	const leftKneeBend = Math.max(0, walkCycle) * 0.3;
	const rightKneeBend = Math.max(0, -walkCycle) * 0.3;
	
	return {
		bodyOffsetY: -stepBounce * SCALE * 3,
		headTilt: walkCycle2 * 0.04,
		// Arme schwingen gegengleich zu den Beinen
		leftArmUpper: armSwing + 0.1,
		leftArmLower: Math.max(0, armSwing) * 0.4 + 0.15,
		rightArmUpper: -armSwing - 0.1,
		rightArmLower: Math.max(0, -armSwing) * 0.4 + 0.15,
		// Beine schwingen
		leftLegUpper: legSwing,
		leftLegLower: leftKneeBend,
		rightLegUpper: -legSwing,
		rightLegLower: rightKneeBend,
		// Kein Float beim Laufen
		floatY: Math.sin(animTime * 0.003) * 1
	};
}

// ============================================================
// ZEICHENFUNKTIONEN
// ============================================================

/**
 * Zeichnet ein Gliedmaß (Arm oder Bein) als abgerundete Linie
 */
function drawLimb(ctx, x1, y1, x2, y2, width, color) {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

/**
 * Zeichnet ein zweigliedriges Segment (z.B. Ober+Unterarm)
 */
function drawJointedLimb(ctx, startX, startY, upperAngle, upperLen, lowerAngle, lowerLen, width, color, darkColor) {
	// Oberer Teil
	const midX = startX + Math.sin(upperAngle) * upperLen;
	const midY = startY + Math.cos(upperAngle) * upperLen;
	drawLimb(ctx, startX, startY, midX, midY, width, color);
	
	// Unterer Teil
	const endX = midX + Math.sin(upperAngle + lowerAngle) * lowerLen;
	const endY = midY + Math.cos(upperAngle + lowerAngle) * lowerLen;
	drawLimb(ctx, midX, midY, endX, endY, width * 0.85, darkColor || color);
	
	// Gelenk-Punkt
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(midX, midY, width * 0.35, 0, Math.PI * 2);
	ctx.fill();
	
	return { x: endX, y: endY };
}

// ============================================================
// HAUPT-RENDER-FUNKTION
// ============================================================

/**
 * Zeichnet den Charakter
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Weltposition X
 * @param {number} y - Weltposition Y
 * @param {number} animTime - Animation Zeit in ms
 * @param {boolean} moving - Bewegt sich der Charakter?
 * @param {string} facing - 'left', 'right', 'up', 'down'
 */
export function renderCharacter(ctx, x, y, animTime, moving, facing) {
	const pose = getAnimationPose(animTime, moving, facing);
	
	ctx.save();
	ctx.translate(x, y + (pose.floatY || 0) + (pose.bodyOffsetY || 0));
	
	// Skalierung
	const s = SCALE;
	
	// Blickrichtung bestimmt die Darstellung
	const isSide = (facing === 'left' || facing === 'right');
	const isBack = (facing === 'up');
	const flipX = (facing === 'left') ? -1 : 1;
	
	// Bei Seitenansicht spiegeln
	if (facing === 'left') {
		ctx.scale(-1, 1);
	}
	
	// === SCHATTEN AUF DEM BODEN ===
	ctx.save();
	ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
	ctx.beginPath();
	ctx.ellipse(0, BODY.footOffset * s + 6, 14, 5, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	
	if (isSide) {
		drawSideView(ctx, s, pose, isBack);
	} else if (isBack) {
		drawBackView(ctx, s, pose);
	} else {
		drawFrontView(ctx, s, pose);
	}
	
	ctx.restore();
}

// ============================================================
// SEITENANSICHT (links/rechts)
// ============================================================

function drawSideView(ctx, s, pose) {
	// --- HINTERES BEIN (weiter weg) ---
	ctx.globalAlpha = 0.7;
	drawJointedLimb(ctx,
		-BODY.hipWidth * 0.3 * s, BODY.hipY * s,
		pose.rightLegUpper, BODY.kneeOffset * s,
		pose.rightLegLower, (BODY.footOffset - BODY.kneeOffset) * s,
		BODY.legWidth * s, COLORS.bodyDark, COLORS.boots
	);
	ctx.globalAlpha = 1;
	
	// --- HINTERER ARM (weiter weg) ---
	ctx.globalAlpha = 0.7;
	drawJointedLimb(ctx,
		0, BODY.shoulderY * s,
		pose.rightArmUpper, BODY.elbowOffset * s,
		pose.rightArmLower, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.bodyDark, COLORS.skinDark
	);
	ctx.globalAlpha = 1;
	
	// --- KÖRPER ---
	drawBodySide(ctx, s);
	
	// --- VORDERES BEIN ---
	const footPos = drawJointedLimb(ctx,
		BODY.hipWidth * 0.3 * s, BODY.hipY * s,
		pose.leftLegUpper, BODY.kneeOffset * s,
		pose.leftLegLower, (BODY.footOffset - BODY.kneeOffset) * s,
		BODY.legWidth * s, COLORS.body, COLORS.boots
	);
	// Fuß
	drawFoot(ctx, footPos.x, footPos.y, 1);
	
	// --- KOPF ---
	drawHeadSide(ctx, s, pose);
	
	// --- VORDERER ARM ---
	const handPos = drawJointedLimb(ctx,
		BODY.bodyWidth * 0.3 * s, BODY.shoulderY * s,
		pose.leftArmUpper, BODY.elbowOffset * s,
		pose.leftArmLower, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.body, COLORS.skin
	);
	// Hand
	drawHand(ctx, handPos.x, handPos.y);
}

// ============================================================
// FRONTANSICHT (nach unten laufend)
// ============================================================

function drawFrontView(ctx, s, pose) {
	// --- BEINE (abwechselnd heben/senken statt seitlich schwingen) ---
	// Vertikaler Versatz: ein Bein hebt sich (Knie beugt), das andere bleibt unten
	const leftLift = Math.max(0, pose.leftLegUpper) * 12;   // Bein hebt sich hoch
	const rightLift = Math.max(0, pose.rightLegUpper) * 12;
	const leftBend = Math.max(0, pose.leftLegUpper) * 0.5;  // Knie beugt sich mehr
	const rightBend = Math.max(0, pose.rightLegUpper) * 0.5;

	// Linkes Bein (bleibt gerade unter der Hüfte, hebt/senkt sich)
	const leftFoot = drawJointedLimb(ctx,
		-BODY.hipWidth * s, BODY.hipY * s - leftLift,
		0.05, BODY.kneeOffset * s * (1 - leftBend * 0.3),
		leftBend, (BODY.footOffset - BODY.kneeOffset) * s * (1 - leftBend * 0.2),
		BODY.legWidth * s, COLORS.body, COLORS.boots
	);
	drawFoot(ctx, leftFoot.x, leftFoot.y, -1);
	
	// Rechtes Bein
	const rightFoot = drawJointedLimb(ctx,
		BODY.hipWidth * s, BODY.hipY * s - rightLift,
		-0.05, BODY.kneeOffset * s * (1 - rightBend * 0.3),
		-rightBend, (BODY.footOffset - BODY.kneeOffset) * s * (1 - rightBend * 0.2),
		BODY.legWidth * s, COLORS.body, COLORS.boots
	);
	drawFoot(ctx, rightFoot.x, rightFoot.y, 1);
	
	// --- KÖRPER ---
	drawBodyFront(ctx, s);
	
	// --- ARME (abwechselnd heben/senken wie beim Laufen von vorne) ---
	const leftArmLift = Math.max(0, -pose.leftArmUpper) * 10;  // Arm hebt sich (gegengleich zu Bein)
	const rightArmLift = Math.max(0, pose.leftArmUpper) * 10;
	const leftArmBend = Math.max(0, -pose.leftArmUpper) * 0.4;
	const rightArmBend = Math.max(0, pose.leftArmUpper) * 0.4;

	// Linker Arm
	const leftHand = drawJointedLimb(ctx,
		-BODY.shoulderWidth * s, BODY.shoulderY * s - leftArmLift,
		0.15, BODY.elbowOffset * s * (1 - leftArmBend * 0.2),
		leftArmBend, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.body, COLORS.skin
	);
	drawHand(ctx, leftHand.x, leftHand.y);
	
	// Rechter Arm
	const rightHand = drawJointedLimb(ctx,
		BODY.shoulderWidth * s, BODY.shoulderY * s - rightArmLift,
		-0.15, BODY.elbowOffset * s * (1 - rightArmBend * 0.2),
		-rightArmBend, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.body, COLORS.skin
	);
	drawHand(ctx, rightHand.x, rightHand.y);
	
	// --- KOPF (Frontansicht) ---
	drawHeadFront(ctx, s, pose);
}

// ============================================================
// RÜCKENANSICHT (nach oben laufend)
// ============================================================

function drawBackView(ctx, s, pose) {
	// --- BEINE (abwechselnd heben/senken, gleich wie Front) ---
	const leftLift = Math.max(0, pose.leftLegUpper) * 12;
	const rightLift = Math.max(0, pose.rightLegUpper) * 12;
	const leftBend = Math.max(0, pose.leftLegUpper) * 0.5;
	const rightBend = Math.max(0, pose.rightLegUpper) * 0.5;

	const leftFoot = drawJointedLimb(ctx,
		-BODY.hipWidth * s, BODY.hipY * s - leftLift,
		0.05, BODY.kneeOffset * s * (1 - leftBend * 0.3),
		leftBend, (BODY.footOffset - BODY.kneeOffset) * s * (1 - leftBend * 0.2),
		BODY.legWidth * s, COLORS.bodyDark, COLORS.boots
	);
	drawFoot(ctx, leftFoot.x, leftFoot.y, -1);
	
	const rightFoot = drawJointedLimb(ctx,
		BODY.hipWidth * s, BODY.hipY * s - rightLift,
		-0.05, BODY.kneeOffset * s * (1 - rightBend * 0.3),
		-rightBend, (BODY.footOffset - BODY.kneeOffset) * s * (1 - rightBend * 0.2),
		BODY.legWidth * s, COLORS.bodyDark, COLORS.boots
	);
	drawFoot(ctx, rightFoot.x, rightFoot.y, 1);
	
	// --- KÖRPER ---
	drawBodyBack(ctx, s);
	
	// --- ARME (abwechselnd heben/senken, gleich wie Front) ---
	const leftArmLift = Math.max(0, -pose.leftArmUpper) * 10;
	const rightArmLift = Math.max(0, pose.leftArmUpper) * 10;
	const leftArmBend = Math.max(0, -pose.leftArmUpper) * 0.4;
	const rightArmBend = Math.max(0, pose.leftArmUpper) * 0.4;

	const leftHand = drawJointedLimb(ctx,
		-BODY.shoulderWidth * s, BODY.shoulderY * s - leftArmLift,
		0.15, BODY.elbowOffset * s * (1 - leftArmBend * 0.2),
		leftArmBend, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.bodyDark, COLORS.skinDark
	);
	drawHand(ctx, leftHand.x, leftHand.y);
	
	const rightHand = drawJointedLimb(ctx,
		BODY.shoulderWidth * s, BODY.shoulderY * s - rightArmLift,
		-0.15, BODY.elbowOffset * s * (1 - rightArmBend * 0.2),
		-rightArmBend, (BODY.handOffset - BODY.elbowOffset) * s,
		BODY.armWidth * s, COLORS.bodyDark, COLORS.skinDark
	);
	drawHand(ctx, rightHand.x, rightHand.y);
	
	// --- KOPF (Rückseite) ---
	drawHeadBack(ctx, s, pose);
}

// ============================================================
// KÖRPER-ZEICHNUNG
// ============================================================

function drawBodySide(ctx, s) {
	const bw = BODY.bodyWidth * s * 0.7;
	const top = BODY.bodyTop * s;
	const bot = BODY.bodyBottom * s;
	
	// Körper
	ctx.fillStyle = COLORS.body;
	ctx.beginPath();
	ctx.moveTo(-bw * 0.6, top);
	ctx.quadraticCurveTo(bw * 0.8, top - 2, bw * 0.6, top + (bot - top) * 0.3);
	ctx.lineTo(bw * 0.5, bot);
	ctx.lineTo(-bw * 0.7, bot);
	ctx.closePath();
	ctx.fill();
	
	// Gürtel
	ctx.fillStyle = COLORS.belt;
	ctx.fillRect(-bw * 0.7, bot - 4, bw * 1.3, 4);
}

function drawBodyFront(ctx, s) {
	const bw = BODY.bodyWidth * s;
	const top = BODY.bodyTop * s;
	const bot = BODY.bodyBottom * s;
	
	// Körper (leicht trapezförmig)
	ctx.fillStyle = COLORS.body;
	ctx.beginPath();
	ctx.moveTo(-bw, top);
	ctx.lineTo(bw, top);
	ctx.lineTo(bw * 0.9, bot);
	ctx.lineTo(-bw * 0.9, bot);
	ctx.closePath();
	ctx.fill();
	
	// Mittellinie (Anzug-Detail)
	ctx.strokeStyle = COLORS.bodyDark;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, top + 4);
	ctx.lineTo(0, bot - 2);
	ctx.stroke();
	
	// Gürtel
	ctx.fillStyle = COLORS.belt;
	ctx.fillRect(-bw * 0.95, bot - 4, bw * 1.9, 4);
	
	// Gürtelschnalle
	ctx.fillStyle = '#e8c84a';
	ctx.fillRect(-2, bot - 5, 4, 5);
}

function drawBodyBack(ctx, s) {
	const bw = BODY.bodyWidth * s;
	const top = BODY.bodyTop * s;
	const bot = BODY.bodyBottom * s;
	
	ctx.fillStyle = COLORS.bodyDark;
	ctx.beginPath();
	ctx.moveTo(-bw, top);
	ctx.lineTo(bw, top);
	ctx.lineTo(bw * 0.9, bot);
	ctx.lineTo(-bw * 0.9, bot);
	ctx.closePath();
	ctx.fill();
	
	// Rückenstreifen
	ctx.strokeStyle = COLORS.body;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(0, top + 3);
	ctx.lineTo(0, bot - 2);
	ctx.stroke();
	
	// Gürtel
	ctx.fillStyle = COLORS.belt;
	ctx.fillRect(-bw * 0.95, bot - 4, bw * 1.9, 4);
}

// ============================================================
// KOPF-ZEICHNUNG
// ============================================================

function drawHeadSide(ctx, s, pose) {
	const hx = 0;
	const hy = BODY.headY * s;
	const hr = BODY.headRadius * s;
	
	ctx.save();
	ctx.translate(hx, hy);
	ctx.rotate(pose.headTilt || 0);
	
	// Kopf
	ctx.fillStyle = COLORS.skin;
	ctx.beginPath();
	ctx.arc(0, 0, hr, 0, Math.PI * 2);
	ctx.fill();
	
	// Umriss
	ctx.strokeStyle = COLORS.outline;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(0, 0, hr, 0, Math.PI * 2);
	ctx.stroke();
	
	// Haare (Seegras-Style)
	ctx.fillStyle = COLORS.hair;
	ctx.beginPath();
	ctx.arc(0, -hr * 0.1, hr, Math.PI * 0.9, Math.PI * 0.1, true);
	ctx.quadraticCurveTo(hr * 0.3, -hr * 1.1, 0, -hr * 1.0);
	ctx.quadraticCurveTo(-hr * 0.3, -hr * 1.1, -hr * 0.8, -hr * 0.5);
	ctx.closePath();
	ctx.fill();
	
	// Auge
	ctx.fillStyle = COLORS.eyes;
	ctx.beginPath();
	ctx.ellipse(hr * 0.35, -hr * 0.1, hr * 0.22, hr * 0.25, 0, 0, Math.PI * 2);
	ctx.fill();
	
	// Pupille
	ctx.fillStyle = COLORS.pupils;
	ctx.beginPath();
	ctx.arc(hr * 0.4, -hr * 0.08, hr * 0.1, 0, Math.PI * 2);
	ctx.fill();
	
	// Glanzpunkt
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.arc(hr * 0.45, -hr * 0.15, hr * 0.05, 0, Math.PI * 2);
	ctx.fill();
	
	// Mund
	ctx.strokeStyle = COLORS.mouth;
	ctx.lineWidth = 1.2;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(hr * 0.4, hr * 0.25, hr * 0.15, 0, Math.PI * 0.7);
	ctx.stroke();
	
	ctx.restore();
}

function drawHeadFront(ctx, s, pose) {
	const hx = 0;
	const hy = BODY.headY * s;
	const hr = BODY.headRadius * s;
	
	ctx.save();
	ctx.translate(hx, hy);
	ctx.rotate(pose.headTilt || 0);
	
	// Kopf
	ctx.fillStyle = COLORS.skin;
	ctx.beginPath();
	ctx.arc(0, 0, hr, 0, Math.PI * 2);
	ctx.fill();
	
	// Umriss
	ctx.strokeStyle = COLORS.outline;
	ctx.lineWidth = 1;
	ctx.stroke();
	
	// Haare
	ctx.fillStyle = COLORS.hair;
	ctx.beginPath();
	ctx.arc(0, -hr * 0.1, hr * 1.02, Math.PI * 0.85, Math.PI * 0.15, true);
	ctx.quadraticCurveTo(hr * 0.5, -hr * 1.15, 0, -hr * 1.05);
	ctx.quadraticCurveTo(-hr * 0.5, -hr * 1.15, -hr * 0.85, -hr * 0.45);
	ctx.closePath();
	ctx.fill();
	
	// Linkes Auge
	ctx.fillStyle = COLORS.eyes;
	ctx.beginPath();
	ctx.ellipse(-hr * 0.3, -hr * 0.05, hr * 0.18, hr * 0.22, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = COLORS.pupils;
	ctx.beginPath();
	ctx.arc(-hr * 0.3, -hr * 0.02, hr * 0.09, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.arc(-hr * 0.24, -hr * 0.1, hr * 0.04, 0, Math.PI * 2);
	ctx.fill();
	
	// Rechtes Auge
	ctx.fillStyle = COLORS.eyes;
	ctx.beginPath();
	ctx.ellipse(hr * 0.3, -hr * 0.05, hr * 0.18, hr * 0.22, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = COLORS.pupils;
	ctx.beginPath();
	ctx.arc(hr * 0.3, -hr * 0.02, hr * 0.09, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.arc(hr * 0.36, -hr * 0.1, hr * 0.04, 0, Math.PI * 2);
	ctx.fill();
	
	// Mund (lächeln)
	ctx.strokeStyle = COLORS.mouth;
	ctx.lineWidth = 1.2;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(0, hr * 0.2, hr * 0.2, Math.PI * 0.15, Math.PI * 0.85);
	ctx.stroke();
	
	ctx.restore();
}

function drawHeadBack(ctx, s, pose) {
	const hx = 0;
	const hy = BODY.headY * s;
	const hr = BODY.headRadius * s;
	
	ctx.save();
	ctx.translate(hx, hy);
	ctx.rotate(pose.headTilt || 0);
	
	// Kopf (Rückseite - dunkler)
	ctx.fillStyle = COLORS.skinDark;
	ctx.beginPath();
	ctx.arc(0, 0, hr, 0, Math.PI * 2);
	ctx.fill();
	
	ctx.strokeStyle = COLORS.outline;
	ctx.lineWidth = 1;
	ctx.stroke();
	
	// Haare (von hinten - mehr sichtbar)
	ctx.fillStyle = COLORS.hair;
	ctx.beginPath();
	ctx.arc(0, -hr * 0.05, hr * 1.04, Math.PI * 0.95, Math.PI * 0.05, true);
	ctx.quadraticCurveTo(hr * 0.6, -hr * 1.2, 0, -hr * 1.1);
	ctx.quadraticCurveTo(-hr * 0.6, -hr * 1.2, -hr * 0.92, -hr * 0.35);
	ctx.closePath();
	ctx.fill();
	
	// Haar-Strähnen
	ctx.strokeStyle = '#165028';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(-hr * 0.3, -hr * 0.9);
	ctx.quadraticCurveTo(-hr * 0.2, -hr * 0.5, -hr * 0.4, -hr * 0.1);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(hr * 0.2, -hr * 0.95);
	ctx.quadraticCurveTo(hr * 0.3, -hr * 0.5, hr * 0.1, -hr * 0.1);
	ctx.stroke();
	
	ctx.restore();
}

// ============================================================
// HAND & FUSS
// ============================================================

function drawHand(ctx, x, y) {
	ctx.fillStyle = COLORS.skin;
	ctx.beginPath();
	ctx.arc(x, y, 3, 0, Math.PI * 2);
	ctx.fill();
}

function drawFoot(ctx, x, y, dir) {
	ctx.fillStyle = COLORS.boots;
	ctx.beginPath();
	ctx.ellipse(x + dir * 2, y + 1, BODY.footSize * SCALE * 0.8, BODY.footSize * SCALE * 0.5, 0, 0, Math.PI * 2);
	ctx.fill();
}

// ============================================================
// UNTERWASSER-BLASEN (folgen dem Charakter)
// ============================================================

const MAX_BUBBLES = 6;
let characterBubbles = [];

/**
 * Aktualisiert Blasen die vom Charakter aufsteigen
 */
export function updateCharacterBubbles(x, y, dt, moving) {
	// Neue Blasen spawnen
	const spawnChance = moving ? 0.03 : 0.008;
	if (Math.random() < spawnChance && characterBubbles.length < MAX_BUBBLES) {
		characterBubbles.push({
			x: x + (Math.random() - 0.5) * 16,
			y: y - 20,
			r: 1 + Math.random() * 2.5,
			life: 0,
			maxLife: 600 + Math.random() * 400,
			speed: 0.02 + Math.random() * 0.02,
			wobble: Math.random() * Math.PI * 2
		});
	}
	
	// Blasen updaten
	for (let i = characterBubbles.length - 1; i >= 0; i--) {
		const b = characterBubbles[i];
		b.life += dt;
		b.y -= b.speed * dt;
		b.x += Math.sin(b.life * 0.005 + b.wobble) * 0.15;
		
		if (b.life >= b.maxLife) {
			characterBubbles.splice(i, 1);
		}
	}
}

/**
 * Zeichnet die Blasen
 */
export function renderCharacterBubbles(ctx) {
	ctx.save();
	for (const b of characterBubbles) {
		const alpha = 1 - (b.life / b.maxLife);
		ctx.globalAlpha = alpha * 0.5;
		ctx.strokeStyle = 'rgba(180, 220, 255, 0.8)';
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.stroke();
		
		// Glanzpunkt
		ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
		ctx.beginPath();
		ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}
