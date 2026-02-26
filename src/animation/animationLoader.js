// ============================================================
// ANIMATION LOADER - Lädt und spielt .anim.json Animationen
// ============================================================
// Erstellt mit dem Cashfish Animator Tool
// Format: Parts mit Keyframes, Interpolation, Transformationen

/**
 * Lädt eine Animation aus einer .anim.json Datei
 * @param {string} url - Pfad zur Animation
 * @returns {Promise<AnimationData>} Animation-Daten
 */
export async function loadAnimation(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Animation nicht gefunden: ${url}`);
    }
    const data = await response.json();
    
    // Bild laden falls vorhanden
    let image = null;
    if (data.image) {
        image = await loadImage(data.image);
    }
    
    return {
        version: data.version || 1,
        totalFrames: data.totalFrames || 8,
        fps: data.fps || 12,
        frameTime: 1000 / (data.fps || 12),
        imageWidth: data.imageWidth || image?.width || 0,
        imageHeight: data.imageHeight || image?.height || 0,
        canvasWidth: data.canvasWidth || 800,
        canvasHeight: data.canvasHeight || 600,
        parts: data.parts || [],
        image
    };
}

/**
 * Lädt ein Bild (Base64 oder URL)
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
        img.src = src;
    });
}

/**
 * Animation-Player Klasse
 */
export class AnimationPlayer {
    constructor(animationData) {
        this.data = animationData;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.isPlaying = false;
        this.loop = true;
        this.onComplete = null;
        
        // Cycle tracking für Abspiel-Häufigkeit (playbackMode)
        this.cycleCount = 0;
        this.partCycleActive = {};  // partId -> ob aktiv in diesem Zyklus
        this._initPartCycleActive();
    }
    
    /**
     * Startet die Animation
     */
    play() {
        this.isPlaying = true;
    }
    
    /**
     * Stoppt die Animation
     */
    stop() {
        this.isPlaying = false;
    }
    
    /**
     * Setzt die Animation zurück
     */
    reset() {
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.cycleCount = 0;
        this._initPartCycleActive();
    }
    
    /**
     * Springt zu einem bestimmten Frame
     */
    goToFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.data.totalFrames - 1));
    }
    
    /**
     * Update mit Delta-Zeit
     * @param {number} dt - Delta-Zeit in Millisekunden
     */
    update(dt) {
        if (!this.isPlaying) return;
        
        this.elapsedTime += dt;
        
        if (this.elapsedTime >= this.data.frameTime) {
            this.elapsedTime -= this.data.frameTime;
            this.currentFrame++;
            
            if (this.currentFrame >= this.data.totalFrames) {
                if (this.loop) {
                    this.currentFrame = 0;
                    this.cycleCount++;
                    this._initPartCycleActive();
                } else {
                    this.currentFrame = this.data.totalFrames - 1;
                    this.isPlaying = false;
                    if (this.onComplete) this.onComplete();
                }
            }
        }
    }
    
    /**
     * Entscheidet pro Part ob es in diesem Zyklus aktiv sein soll
     */
    _initPartCycleActive() {
        this.partCycleActive = {};
        for (const part of this.data.parts) {
            const mode = part.playbackMode || 'every';
            if (mode === 'every') {
                this.partCycleActive[part.id] = true;
            } else if (mode === 'every2') {
                this.partCycleActive[part.id] = (this.cycleCount % 2 === 0);
            } else if (mode === 'every3') {
                this.partCycleActive[part.id] = (this.cycleCount % 3 === 0);
            } else if (mode === 'random') {
                // ~30% Chance: natürliches Blinzeln
                this.partCycleActive[part.id] = (Math.random() < 0.3);
            }
        }
    }
    
    /**
     * Gibt den effektiven Frame für ein Part zurück.
     * Inaktive Parts bleiben auf Frame 0 (Ruhepose).
     */
    getEffectiveFrame(part) {
        const mode = part.playbackMode || 'every';
        if (mode === 'every') return this.currentFrame;
        if (!this.partCycleActive[part.id]) return 0;
        return this.currentFrame;
    }
    
    /**
     * Interpoliert zwischen Keyframes
     */
    getInterpolatedTransform(part, frame) {
        const keyframes = part.keyframes;
        const keys = Object.keys(keyframes).map(Number).sort((a, b) => a - b);
        
        // Exakter Keyframe?
        if (keyframes[frame]) {
            return { ...keyframes[frame] };
        }
        
        // Finde umgebende Keyframes
        let prevKey = 0;
        let nextKey = keys[keys.length - 1];
        
        for (const key of keys) {
            if (key < frame) prevKey = key;
            if (key > frame) { nextKey = key; break; }
        }
        
        if (prevKey === nextKey || !keyframes[prevKey] || !keyframes[nextKey]) {
            return keyframes[prevKey] ? { ...keyframes[prevKey] } : this.defaultTransform();
        }
        
        // Interpolieren
        const t = (frame - prevKey) / (nextKey - prevKey);
        const prev = keyframes[prevKey];
        const next = keyframes[nextKey];
        
        return {
            x: this.lerp(prev.x || 0, next.x || 0, t),
            y: this.lerp(prev.y || 0, next.y || 0, t),
            z: this.lerp(prev.z || 0, next.z || 0, t),
            rotation: this.lerpAngle(prev.rotation || 0, next.rotation || 0, t),
            scaleX: this.lerp(prev.scaleX || 1, next.scaleX || 1, t),
            scaleY: this.lerp(prev.scaleY || 1, next.scaleY || 1, t),
            skewX: this.lerp(prev.skewX || 0, next.skewX || 0, t),
            skewY: this.lerp(prev.skewY || 0, next.skewY || 0, t),
            // Ecken-Offsets
            c0x: this.lerp(prev.c0x || 0, next.c0x || 0, t),
            c0y: this.lerp(prev.c0y || 0, next.c0y || 0, t),
            c1x: this.lerp(prev.c1x || 0, next.c1x || 0, t),
            c1y: this.lerp(prev.c1y || 0, next.c1y || 0, t),
            c2x: this.lerp(prev.c2x || 0, next.c2x || 0, t),
            c2y: this.lerp(prev.c2y || 0, next.c2y || 0, t),
            c3x: this.lerp(prev.c3x || 0, next.c3x || 0, t),
            c3y: this.lerp(prev.c3y || 0, next.c3y || 0, t),
            // Eye fillAmount
            fillAmount: this.lerp(
                prev.fillAmount != null ? prev.fillAmount : 1,
                next.fillAmount != null ? next.fillAmount : 1, t
            )
        };
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }
    
    defaultTransform() {
        return {
            x: 0, y: 0, z: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
            c0x: 0, c0y: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, c3x: 0, c3y: 0,
            fillAmount: 1
        };
    }
    
    /**
     * Rendert die Animation
     * @param {CanvasRenderingContext2D} ctx - Canvas Context
     * @param {number} x - X-Position auf dem Canvas
     * @param {number} y - Y-Position auf dem Canvas
     * @param {number} scale - Skalierung (Standard: 1)
     * @param {boolean} flipX - Horizontal spiegeln (Standard: false)
     * @param {boolean} drawBase - Basisbild zuerst zeichnen (Standard: true)
     */
    render(ctx, x, y, scale = 1, flipX = false, drawBase = true) {
        if (!this.data.image) return;
        
        // Offscreen-Canvas für isoliertes Compositing
        if (!this._compCanvas) {
            this._compCanvas = document.createElement('canvas');
            this._compCanvas.width = this.data.canvasWidth;
            this._compCanvas.height = this.data.canvasHeight;
        }
        const offCtx = this._compCanvas.getContext('2d');
        offCtx.clearRect(0, 0, this._compCanvas.width, this._compCanvas.height);
        
        // === SCHRITT 1: Alle animierten Parts auf Offscreen zeichnen ===
        for (const part of this.data.parts) {
            const effectiveFrame = this.getEffectiveFrame(part);
            const transform = this.getInterpolatedTransform(part, effectiveFrame);
            
            if (part.type === 'eye') {
                this._renderEyePart(offCtx, part, transform);
                continue;
            }
            
            offCtx.save();
            
            const zScale = 1 + (transform.z || 0) / 200;
            const zOffsetY = (transform.z || 0) * 0.3;
            
            offCtx.translate(
                part.pivotX + (transform.x || 0), 
                part.pivotY + (transform.y || 0) + zOffsetY
            );
            offCtx.rotate(transform.rotation || 0);
            offCtx.transform(1, transform.skewY || 0, transform.skewX || 0, 1, 0, 0);
            offCtx.scale(
                (transform.scaleX || 1) * zScale, 
                (transform.scaleY || 1) * zScale
            );
            offCtx.translate(-part.pivotX, -part.pivotY);
            
            const imgScale = this.data.image.width / this.data.canvasWidth;
            
            if (part.polygon) {
                this._renderPolygonPart(offCtx, part, transform, imgScale);
            } else {
                // Prüfen ob Corner-Deformation aktiv ist (V-Modus im Animator)
                const hasCornerDeformation = (transform.c0x || 0) !== 0 || (transform.c0y || 0) !== 0 ||
                                             (transform.c1x || 0) !== 0 || (transform.c1y || 0) !== 0 ||
                                             (transform.c2x || 0) !== 0 || (transform.c2y || 0) !== 0 ||
                                             (transform.c3x || 0) !== 0 || (transform.c3y || 0) !== 0;
                
                if (hasCornerDeformation) {
                    // Quad-Warp: Quell-Rechteck auf verzerrtes Ziel-Quad zeichnen
                    const srcCorners = [
                        { x: part.x, y: part.y },
                        { x: part.x + part.width, y: part.y },
                        { x: part.x + part.width, y: part.y + part.height },
                        { x: part.x, y: part.y + part.height }
                    ];
                    const dstCorners = [
                        { x: part.x + (transform.c0x || 0), y: part.y + (transform.c0y || 0) },
                        { x: part.x + part.width + (transform.c1x || 0), y: part.y + (transform.c1y || 0) },
                        { x: part.x + part.width + (transform.c2x || 0), y: part.y + part.height + (transform.c2y || 0) },
                        { x: part.x + (transform.c3x || 0), y: part.y + part.height + (transform.c3y || 0) }
                    ];
                    this._drawQuadToQuad(offCtx, this.data.image, srcCorners, dstCorners, imgScale);
                } else {
                    // Standard: Einfaches Rechteck ohne Verzerrung
                    const srcX = part.x * imgScale;
                    const srcY = part.y * imgScale;
                    const srcW = part.width * imgScale;
                    const srcH = part.height * imgScale;
                    
                    offCtx.drawImage(
                        this.data.image,
                        srcX, srcY, srcW, srcH,
                        part.x, part.y, part.width, part.height
                    );
                }
            }
            
            offCtx.restore();
        }
        
        // === SCHRITT 2: Basisbild HINTER die Parts (mit ausgestanzten Originalformen) ===
        if (drawBase) {
            // Basisbild mit Cutouts einmalig cachen
            if (!this._baseCanvas) {
                this._baseCanvas = document.createElement('canvas');
                this._baseCanvas.width = this.data.canvasWidth;
                this._baseCanvas.height = this.data.canvasHeight;
                const baseCtx = this._baseCanvas.getContext('2d');
                
                baseCtx.drawImage(
                    this.data.image,
                    0, 0,
                    this.data.canvasWidth,
                    this.data.canvasHeight
                );
                
                // Original-Part-Bereiche ausstanzen (mit 2px Padding gegen Subpixel-Lücken)
                baseCtx.globalCompositeOperation = 'destination-out';
                const cutoutPad = 2; // Pixel Rand-Erweiterung um Geisterbilder zu vermeiden
                for (const part of this.data.parts) {
                    if (part.type === 'eye') continue;
                    // Nur ausschneiden bei 'cutout' oder 'fill' Modus
                    const mode = part.cutout === false ? 'none' : (part.cutout || 'cutout');
                    if (mode === 'none') continue;
                    
                    // Fill-Parts brauchen größeren Cutout (Outline mit entfernen)
                    const pad = mode === 'fill' ? 12 : cutoutPad;
                    
                    if (part.polygon) {
                        // Polygon-Cutout mit leichtem Expand
                        const cx = part.polygon.reduce((s, p) => s + p.x, 0) / part.polygon.length;
                        const cy = part.polygon.reduce((s, p) => s + p.y, 0) / part.polygon.length;
                        baseCtx.beginPath();
                        for (let i = 0; i < part.polygon.length; i++) {
                            const p = part.polygon[i];
                            // Punkt leicht nach außen verschieben (vom Zentroid weg)
                            const dx = p.x - cx;
                            const dy = p.y - cy;
                            const len = Math.sqrt(dx * dx + dy * dy) || 1;
                            const ex = p.x + (dx / len) * pad;
                            const ey = p.y + (dy / len) * pad;
                            if (i === 0) baseCtx.moveTo(ex, ey);
                            else baseCtx.lineTo(ex, ey);
                        }
                        baseCtx.closePath();
                        baseCtx.fill();
                    } else {
                        // Rechteck-Cutout mit gleichmäßigem Padding auf allen Seiten
                        baseCtx.fillRect(
                            part.x - pad,
                            part.y - pad,
                            part.width + pad * 2,
                            part.height + pad * 2
                        );
                    }
                }
                
                // === FILL-MODUS: Löcher mit Rand-Pixeln füllen (echte Dilation) ===
                // Bild OHNE die Fill-Parts erstellen, dann Rand-Pixel nach innen wachsen lassen
                const fillParts = this.data.parts.filter(p => {
                    if (p.type === 'eye') return false;
                    const mode = p.cutout === false ? 'none' : (p.cutout || 'cutout');
                    return mode === 'fill';
                });
                
                if (fillParts.length > 0) {
                    const fillCanvas = document.createElement('canvas');
                    fillCanvas.width = this.data.canvasWidth;
                    fillCanvas.height = this.data.canvasHeight;
                    const fillCtx = fillCanvas.getContext('2d');
                    
                    // Schritt 1: Originalbild zeichnen
                    fillCtx.drawImage(
                        this.data.image, 0, 0,
                        this.data.canvasWidth, this.data.canvasHeight
                    );
                    
                    // Schritt 2: Fill-Parts ausschneiden (transparent machen)
                    fillCtx.globalCompositeOperation = 'destination-out';
                    for (const part of fillParts) {
                        fillCtx.beginPath();
                        if (part.polygon && part.polygon.length >= 3) {
                            const cx = part.polygon.reduce((s, p) => s + p.x, 0) / part.polygon.length;
                            const cy = part.polygon.reduce((s, p) => s + p.y, 0) / part.polygon.length;
                            for (let i = 0; i < part.polygon.length; i++) {
                                const p = part.polygon[i];
                                const dx = p.x - cx, dy = p.y - cy;
                                const len = Math.sqrt(dx*dx + dy*dy) || 1;
                                const ex = p.x + (dx/len) * 10;
                                const ey = p.y + (dy/len) * 10;
                                if (i === 0) fillCtx.moveTo(ex, ey);
                                else fillCtx.lineTo(ex, ey);
                            }
                            fillCtx.closePath();
                        } else {
                            fillCtx.rect(part.x - 10, part.y - 10, part.width + 20, part.height + 20);
                        }
                        fillCtx.fill();
                    }
                    
                    // Schritt 3: Rand-Pixel nach innen wachsen lassen (Dilation)
                    fillCtx.globalCompositeOperation = 'destination-over';
                    const maxDilate = 60;
                    for (let d = 0; d < maxDilate; d++) {
                        fillCtx.drawImage(fillCanvas, -1,  0);
                        fillCtx.drawImage(fillCanvas,  1,  0);
                        fillCtx.drawImage(fillCanvas,  0, -1);
                        fillCtx.drawImage(fillCanvas,  0,  1);
                        fillCtx.drawImage(fillCanvas, -1, -1);
                        fillCtx.drawImage(fillCanvas,  1, -1);
                        fillCtx.drawImage(fillCanvas, -1,  1);
                        fillCtx.drawImage(fillCanvas,  1,  1);
                    }
                    fillCtx.globalCompositeOperation = 'source-over';
                    
                    // Schritt 4: Gefüllte Bereiche in baseCanvas einfügen
                    // Clip mit 12px-expandiertem Polygon (gleich wie Hintergrund-Cutout)
                    baseCtx.globalCompositeOperation = 'destination-over';
                    for (const part of fillParts) {
                        baseCtx.save();
                        baseCtx.beginPath();
                        if (part.polygon && part.polygon.length >= 3) {
                            const cx = part.polygon.reduce((s, p) => s + p.x, 0) / part.polygon.length;
                            const cy = part.polygon.reduce((s, p) => s + p.y, 0) / part.polygon.length;
                            for (let i = 0; i < part.polygon.length; i++) {
                                const p = part.polygon[i];
                                const dx = p.x - cx, dy = p.y - cy;
                                const len = Math.sqrt(dx*dx + dy*dy) || 1;
                                const ex = p.x + (dx/len) * 12;
                                const ey = p.y + (dy/len) * 12;
                                if (i === 0) baseCtx.moveTo(ex, ey);
                                else baseCtx.lineTo(ex, ey);
                            }
                            baseCtx.closePath();
                        } else {
                            baseCtx.rect(part.x - 12, part.y - 12, part.width + 24, part.height + 24);
                        }
                        baseCtx.clip();
                        baseCtx.drawImage(fillCanvas, 0, 0);
                        baseCtx.restore();
                    }
                }
                baseCtx.globalCompositeOperation = 'source-over';
            }
            
            offCtx.globalCompositeOperation = 'destination-over';
            offCtx.drawImage(this._baseCanvas, 0, 0);
            offCtx.globalCompositeOperation = 'source-over';
        }
        
        // === SCHRITT 3: Offscreen-Ergebnis auf den Haupt-Canvas zeichnen ===
        ctx.save();
        ctx.translate(x, y);
        if (flipX) {
            ctx.scale(-scale, scale);
        } else {
            ctx.scale(scale, scale);
        }
        ctx.drawImage(this._compCanvas, 0, 0);
        ctx.restore();
    }
    
    /**
     * Rendert ein Eye-Part (Blinzel-Kreis)
     */
    _renderEyePart(ctx, part, transform) {
        const fillAmount = transform.fillAmount != null ? transform.fillAmount : 1.0;
        const cx = part.eyeCenterX + (transform.x || 0);
        const cy = part.eyeCenterY + (transform.y || 0);
        const radius = part.eyeRadius * (transform.scaleX || 1);
        const color = part.eyeColor || '#000000';
        
        if (fillAmount < 0.001) return; // Auge komplett offen = nichts zeichnen
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(transform.rotation || 0);
        ctx.translate(-cx, -cy);
        
        // Kreis-Clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        
        // Füllung von oben (Lid)
        const diameter = radius * 2;
        const fillHeight = fillAmount * diameter;
        ctx.fillStyle = color;
        ctx.fillRect(cx - radius, cy - radius, diameter, fillHeight);
        
        // Weiche Unterkante
        if (fillAmount > 0.05 && fillAmount < 0.95) {
            const edgeY = cy - radius + fillHeight;
            ctx.beginPath();
            ctx.ellipse(cx, edgeY, radius * 0.9, radius * 0.15, 0, 0, Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
        ctx.restore();
    }
    
    /**
     * Rendert ein Polygon-Part mit Clipping und Quad-Warping
     * (Matches the animator tool's drawPolygonPart approach)
     */
    _renderPolygonPart(ctx, part, transform, imgScale) {
        const points = part.polygon;
        if (!points || points.length < 3) return;
        
        const bx = part.x, by = part.y;
        const bw = part.width, bh = part.height;
        
        // Transformierte Polygon-Punkte berechnen (bilineare Interpolation)
        const c0 = { x: bx + (transform.c0x||0), y: by + (transform.c0y||0) };
        const c1 = { x: bx + bw + (transform.c1x||0), y: by + (transform.c1y||0) };
        const c2 = { x: bx + bw + (transform.c2x||0), y: by + bh + (transform.c2y||0) };
        const c3 = { x: bx + (transform.c3x||0), y: by + bh + (transform.c3y||0) };
        
        const transformedPoly = points.map(p => {
            const u = bw > 0 ? (p.x - bx) / bw : 0;
            const v = bh > 0 ? (p.y - by) / bh : 0;
            return {
                x: (1-u)*(1-v)*c0.x + u*(1-v)*c1.x + u*v*c2.x + (1-u)*v*c3.x,
                y: (1-u)*(1-v)*c0.y + u*(1-v)*c1.y + u*v*c2.y + (1-u)*v*c3.y
            };
        });
        
        ctx.save();
        
        // Polygon-Clip-Path
        ctx.beginPath();
        ctx.moveTo(transformedPoly[0].x, transformedPoly[0].y);
        for (let i = 1; i < transformedPoly.length; i++) {
            ctx.lineTo(transformedPoly[i].x, transformedPoly[i].y);
        }
        ctx.closePath();
        ctx.clip();
        
        // Prüfen ob Verzerrung aktiv ist
        const hasDeformation = (transform.c0x||0) !== 0 || (transform.c0y||0) !== 0 ||
                               (transform.c1x||0) !== 0 || (transform.c1y||0) !== 0 ||
                               (transform.c2x||0) !== 0 || (transform.c2y||0) !== 0 ||
                               (transform.c3x||0) !== 0 || (transform.c3y||0) !== 0;
        
        if (hasDeformation) {
            // Quad-to-Quad Warping (wie im Animator)
            const srcCorners = [
                { x: bx, y: by },
                { x: bx + bw, y: by },
                { x: bx + bw, y: by + bh },
                { x: bx, y: by + bh }
            ];
            const dstCorners = [c0, c1, c2, c3];
            this._drawQuadToQuad(ctx, this.data.image, srcCorners, dstCorners, imgScale);
        } else {
            // Keine Verzerrung: Bild normal zeichnen
            ctx.drawImage(
                this.data.image,
                bx * imgScale, by * imgScale,
                bw * imgScale, bh * imgScale,
                bx, by, bw, bh
            );
        }
        
        ctx.restore();
    }
    
    /**
     * Zeichnet Bildinhalt von Quell-Quad auf Ziel-Quad (Strip-Technik)
     * Approximiert perspektivische Transformation mit 20 Streifen
     */
    _drawQuadToQuad(ctx, img, srcCorners, dstCorners, imgScale) {
        const strips = 20;
        
        const lerp = (p1, p2, t) => ({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        });
        
        for (let i = 0; i < strips; i++) {
            const t0 = i / strips;
            const t1 = (i + 1) / strips;
            
            // Source-Streifen (in Canvas-Koordinaten)
            const srcLeft0  = lerp(srcCorners[0], srcCorners[3], t0);
            const srcRight0 = lerp(srcCorners[1], srcCorners[2], t0);
            const srcLeft1  = lerp(srcCorners[0], srcCorners[3], t1);
            const srcRight1 = lerp(srcCorners[1], srcCorners[2], t1);
            
            // Ziel-Streifen
            const dstLeft0  = lerp(dstCorners[0], dstCorners[3], t0);
            const dstRight0 = lerp(dstCorners[1], dstCorners[2], t0);
            const dstLeft1  = lerp(dstCorners[0], dstCorners[3], t1);
            const dstRight1 = lerp(dstCorners[1], dstCorners[2], t1);
            
            // Source-Bereich im Bild (Pixel-Koordinaten)
            const srcX = Math.min(srcLeft0.x, srcRight0.x, srcLeft1.x, srcRight1.x) * imgScale;
            const srcY = Math.min(srcLeft0.y, srcRight0.y) * imgScale;
            const srcW = (Math.max(srcLeft0.x, srcRight0.x, srcLeft1.x, srcRight1.x) - 
                         Math.min(srcLeft0.x, srcRight0.x, srcLeft1.x, srcRight1.x)) * imgScale;
            const srcH = (Math.max(srcLeft1.y, srcRight1.y) - Math.min(srcLeft0.y, srcRight0.y)) * imgScale;
            
            if (srcW <= 0 || srcH <= 0) continue;
            
            ctx.save();
            
            // Clip auf Ziel-Trapez
            ctx.beginPath();
            ctx.moveTo(dstLeft0.x, dstLeft0.y);
            ctx.lineTo(dstRight0.x, dstRight0.y);
            ctx.lineTo(dstRight1.x, dstRight1.y);
            ctx.lineTo(dstLeft1.x, dstLeft1.y);
            ctx.closePath();
            ctx.clip();
            
            // Affine Transformation berechnen
            const dstWidth = Math.sqrt((dstRight0.x - dstLeft0.x) ** 2 + (dstRight0.y - dstLeft0.y) ** 2);
            const dstHeight = Math.sqrt((dstLeft1.x - dstLeft0.x) ** 2 + (dstLeft1.y - dstLeft0.y) ** 2);
            
            const angle = Math.atan2(dstRight0.y - dstLeft0.y, dstRight0.x - dstLeft0.x);
            const scaleX = dstWidth / (srcW / imgScale);
            const scaleY = dstHeight / (srcH / imgScale) || scaleX;
            
            ctx.translate(dstLeft0.x, dstLeft0.y);
            ctx.rotate(angle);
            ctx.scale(scaleX, scaleY);
            
            // Quellfragment zeichnen (1.1x Höhe um Streifenlücken zu vermeiden)
            ctx.drawImage(img,
                srcX, srcY, srcW, srcH * 1.1,
                0, 0, srcW / imgScale, (srcH / imgScale) * 1.1
            );
            
            ctx.restore();
        }
    }
    
    /**
     * Gibt die Bounds der Animation zurück
     */
    getBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const part of this.data.parts) {
            minX = Math.min(minX, part.x);
            minY = Math.min(minY, part.y);
            maxX = Math.max(maxX, part.x + part.width);
            maxY = Math.max(maxY, part.y + part.height);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}

/**
 * Convenience-Funktion: Animation laden und Player erstellen
 */
export async function createAnimationPlayer(url) {
    const data = await loadAnimation(url);
    return new AnimationPlayer(data);
}

export default { loadAnimation, AnimationPlayer, createAnimationPlayer };
