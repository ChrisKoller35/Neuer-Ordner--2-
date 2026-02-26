/**
 * Camera System for Multi-Scene World Scrolling
 * Handles viewport position and world-to-screen coordinate transformation
 */

/**
 * Creates the initial camera state
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} options - Camera options
 * @returns {Object} Camera state
 */
export function createCameraState(canvas, options = {}) {
	const {
		worldWidth = canvas.width,  // Default: single scene width
		worldHeight = canvas.height,
		sceneCount = 1,
		followSpeed = 0.08,          // How fast camera follows player (0-1)
		deadZoneX = canvas.width * 0.3,  // Player can move this far before camera follows
		deadZoneY = canvas.height * 0.3
	} = options;

	return {
		// Viewport position (top-left corner in world coordinates)
		x: 0,
		y: 0,
		
		// Viewport size (matches canvas)
		viewWidth: canvas.width,
		viewHeight: canvas.height,
		
		// World dimensions
		worldWidth,
		worldHeight,
		sceneCount,
		sceneWidth: canvas.width,  // Each scene is one canvas width
		
		// Follow settings
		followSpeed,
		deadZoneX,
		deadZoneY,
		
		// Target position (for smooth following)
		targetX: 0,
		targetY: 0,
		
		// Active flag
		enabled: false
	};
}

/**
 * Creates the camera system
 * @param {Object} ctx - Context with dependencies
 */
export function createCameraSystem(ctx) {
	const { getState, getCanvas } = ctx;

	/**
	 * Initialize camera for world mode
	 * @param {number} sceneCount - Number of scenes in the world
	 */
	function initWorldCamera(sceneCount = 1) {
		const state = getState();
		const canvas = getCanvas();
		
		if (!state.camera) {
			state.camera = createCameraState(canvas);
		}
		
		state.camera.sceneCount = sceneCount;
		state.camera.worldWidth = canvas.width * sceneCount;
		state.camera.sceneWidth = canvas.width;
		state.camera.enabled = sceneCount > 1;
		state.camera.x = 0;
		state.camera.y = 0;
		state.camera.targetX = 0;
		state.camera.targetY = 0;
	}

	/**
	 * Update camera position to follow player
	 * @param {number} dt - Delta time
	 */
	function updateCamera(dt) {
		const state = getState();
		const canvas = getCanvas();
		
		if (!state.camera || !state.camera.enabled) return;
		
		const camera = state.camera;
		const player = state.player;
		
		// Calculate where camera should look (centered on player with dead zone)
		const playerScreenX = player.x - camera.x;
		const playerScreenY = player.y - camera.y;
		
		// Horizontal following with dead zone
		const centerX = canvas.width / 2;
		const leftBound = centerX - camera.deadZoneX / 2;
		const rightBound = centerX + camera.deadZoneX / 2;
		
		if (playerScreenX < leftBound) {
			camera.targetX = player.x - leftBound;
		} else if (playerScreenX > rightBound) {
			camera.targetX = player.x - rightBound;
		}
		
		// Vertical following with dead zone
		const centerY = canvas.height / 2;
		const topBound = centerY - camera.deadZoneY / 2;
		const bottomBound = centerY + camera.deadZoneY / 2;
		
		if (playerScreenY < topBound) {
			camera.targetY = player.y - topBound;
		} else if (playerScreenY > bottomBound) {
			camera.targetY = player.y - bottomBound;
		}
		
		// Clamp target to world bounds
		camera.targetX = Math.max(0, Math.min(camera.targetX, camera.worldWidth - camera.viewWidth));
		camera.targetY = Math.max(0, Math.min(camera.targetY, camera.worldHeight - camera.viewHeight));
		
		// Smooth interpolation towards target
		const lerpFactor = 1 - Math.pow(1 - camera.followSpeed, dt / 16);
		camera.x += (camera.targetX - camera.x) * lerpFactor;
		camera.y += (camera.targetY - camera.y) * lerpFactor;
		
		// Snap if very close
		if (Math.abs(camera.x - camera.targetX) < 0.5) camera.x = camera.targetX;
		if (Math.abs(camera.y - camera.targetY) < 0.5) camera.y = camera.targetY;
	}

	/**
	 * Convert world coordinates to screen coordinates
	 * @param {number} worldX - X position in world
	 * @param {number} worldY - Y position in world
	 * @returns {Object} {x, y} in screen coordinates
	 */
	function worldToScreen(worldX, worldY) {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) {
			return { x: worldX, y: worldY };
		}
		
		return {
			x: worldX - state.camera.x,
			y: worldY - state.camera.y
		};
	}

	/**
	 * Convert screen coordinates to world coordinates
	 * @param {number} screenX - X position on screen
	 * @param {number} screenY - Y position on screen
	 * @returns {Object} {x, y} in world coordinates
	 */
	function screenToWorld(screenX, screenY) {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) {
			return { x: screenX, y: screenY };
		}
		
		return {
			x: screenX + state.camera.x,
			y: screenY + state.camera.y
		};
	}

	/**
	 * Check if a world position is visible on screen
	 * @param {number} worldX - X position in world
	 * @param {number} worldY - Y position in world
	 * @param {number} margin - Extra margin around viewport
	 * @returns {boolean} True if visible
	 */
	function isVisible(worldX, worldY, margin = 100) {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) {
			return true;
		}
		
		const camera = state.camera;
		return worldX >= camera.x - margin &&
			   worldX <= camera.x + camera.viewWidth + margin &&
			   worldY >= camera.y - margin &&
			   worldY <= camera.y + camera.viewHeight + margin;
	}

	/**
	 * Get the current scene index based on camera position
	 * @returns {number} Current scene index (0-based)
	 */
	function getCurrentScene() {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) {
			return 0;
		}
		
		const centerX = state.camera.x + state.camera.viewWidth / 2;
		return Math.floor(centerX / state.camera.sceneWidth);
	}

	/**
	 * Get visible scene indices (for rendering optimization)
	 * @returns {Array<number>} Array of scene indices that are visible
	 */
	function getVisibleScenes() {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) {
			return [0];
		}
		
		const camera = state.camera;
		const firstScene = Math.floor(camera.x / camera.sceneWidth);
		const lastScene = Math.floor((camera.x + camera.viewWidth) / camera.sceneWidth);
		
		const scenes = [];
		for (let i = firstScene; i <= lastScene && i < camera.sceneCount; i++) {
			if (i >= 0) scenes.push(i);
		}
		
		return scenes;
	}

	/**
	 * Apply camera transform to canvas context
	 * Call this before rendering world objects
	 */
	function applyCameraTransform() {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) return;
		
		const context = ctx.getCtx();
		context.save();
		context.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));
	}

	/**
	 * Restore canvas context after camera transform
	 * Call this after rendering world objects
	 */
	function restoreCameraTransform() {
		const state = getState();
		
		if (!state.camera || !state.camera.enabled) return;
		
		const context = ctx.getCtx();
		context.restore();
	}

	return {
		initWorldCamera,
		updateCamera,
		worldToScreen,
		screenToWorld,
		isVisible,
		getCurrentScene,
		getVisibleScenes,
		applyCameraTransform,
		restoreCameraTransform
	};
}
