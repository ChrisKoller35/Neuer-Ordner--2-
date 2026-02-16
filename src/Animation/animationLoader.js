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
        image: image
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
                } else {
                    this.currentFrame = this.data.totalFrames - 1;
                    this.isPlaying = false;
                    if (this.onComplete) this.onComplete();
                }
            }
        }
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
            skewY: this.lerp(prev.skewY || 0, next.skewY || 0, t)
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
        return { x: 0, y: 0, z: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
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
        
        const frame = this.currentFrame;
        
        ctx.save();
        ctx.translate(x, y);
        if (flipX) {
            ctx.scale(-scale, scale);
        } else {
            ctx.scale(scale, scale);
        }
        
        // Basisbild zeichnen mit ausgestanzten Part-Bereichen
        if (drawBase) {
            // OffscreenCanvas für korrektes Ausstanzen
            const offCanvas = document.createElement('canvas');
            offCanvas.width = this.data.canvasWidth;
            offCanvas.height = this.data.canvasHeight;
            const offCtx = offCanvas.getContext('2d');
            
            // Erst das ganze Bild zeichnen
            offCtx.drawImage(
                this.data.image,
                0, 0,
                this.data.canvasWidth,
                this.data.canvasHeight
            );
            
            // Part-Bereiche ausstanzen (transparent machen)
            // Nur oben extra Padding für Flossenspitze
            offCtx.globalCompositeOperation = 'destination-out';
            for (const part of this.data.parts) {
                const topPad = 8; // Extra oben für Flossenspitze
                offCtx.fillRect(part.x, part.y - topPad, part.width, part.height + topPad);
            }
            
            // Fertiges Basisbild auf Ziel-Canvas zeichnen
            ctx.drawImage(offCanvas, 0, 0);
        }
        
        // Alle animierten Parts zeichnen
        for (const part of this.data.parts) {
            const transform = this.getInterpolatedTransform(part, frame);
            
            ctx.save();
            
            // Z-Achse: Tiefe simulieren
            const zScale = 1 + (transform.z || 0) / 200;
            const zOffsetY = (transform.z || 0) * 0.3;
            
            // Transform um Pivot-Punkt
            ctx.translate(
                part.pivotX + (transform.x || 0), 
                part.pivotY + (transform.y || 0) + zOffsetY
            );
            ctx.rotate(transform.rotation || 0);
            
            // Skew
            ctx.transform(1, transform.skewY || 0, transform.skewX || 0, 1, 0, 0);
            
            // Skalierung
            ctx.scale(
                (transform.scaleX || 1) * zScale, 
                (transform.scaleY || 1) * zScale
            );
            ctx.translate(-part.pivotX, -part.pivotY);
            
            // Part aus Originalbild zeichnen
            const imgScale = this.data.image.width / this.data.canvasWidth;
            const srcX = part.x * imgScale;
            const srcY = part.y * imgScale;
            const srcW = part.width * imgScale;
            const srcH = part.height * imgScale;
            
            ctx.drawImage(
                this.data.image,
                srcX, srcY, srcW, srcH,
                part.x, part.y, part.width, part.height
            );
            
            ctx.restore();
        }
        
        ctx.restore();
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
