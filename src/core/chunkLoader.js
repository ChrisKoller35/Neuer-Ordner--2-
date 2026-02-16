/**
 * Chunk Loading System
 * Manages dynamic loading/unloading of world scenes for unlimited world size
 * Only keeps 2-3 scenes in memory at any time
 */

/**
 * Scene/Chunk states
 */
const ChunkState = {
	UNLOADED: 'unloaded',
	LOADING: 'loading',
	LOADED: 'loaded',
	ACTIVE: 'active'
};

/**
 * Creates the chunk loading system
 * @param {Object} ctx - Context with dependencies
 */
export function createChunkLoader(ctx) {
	const { getState, getCanvas, SPRITES, spriteReady } = ctx;

	// Chunk metadata storage
	const chunks = new Map();
	
	// How many chunks to keep loaded around the active chunk
	const LOAD_RADIUS = 1;  // Load 1 chunk ahead/behind = 3 total
	
	// Background templates that rotate
	const backgroundTemplates = [
		{ key: 'levelOne', palette: 'ocean' },
		{ key: 'levelTwo', palette: 'deep' },
		{ key: 'levelThree', palette: 'coral' }
	];

	// Color palettes for different biomes
	const palettes = {
		ocean: {
			top: "#03294a",
			mid: "#02203b",
			bottom: "#02111f",
			haze: "rgba(40,80,120,0.28)",
			hazeStrong: "rgba(110,170,220,0.22)",
			ridges: "#031728",
			foreground: "#05233b"
		},
		deep: {
			top: "#1d0f35",
			mid: "#0f1633",
			bottom: "#07091b",
			haze: "rgba(90,50,120,0.32)",
			hazeStrong: "rgba(180,110,220,0.22)",
			ridges: "#12031f",
			foreground: "#1a0633"
		},
		coral: {
			top: "#0a3a3a",
			mid: "#082828",
			bottom: "#041818",
			haze: "rgba(60,120,100,0.30)",
			hazeStrong: "rgba(140,200,180,0.24)",
			ridges: "#052020",
			foreground: "#083030"
		},
		volcano: {
			top: "#3a1a0a",
			mid: "#281008",
			bottom: "#180804",
			haze: "rgba(120,60,40,0.32)",
			hazeStrong: "rgba(220,140,80,0.26)",
			ridges: "#200f05",
			foreground: "#301508"
		},
		ice: {
			top: "#1a3a4a",
			mid: "#0f2838",
			bottom: "#051820",
			haze: "rgba(80,140,180,0.30)",
			hazeStrong: "rgba(160,200,240,0.24)",
			ridges: "#0a2030",
			foreground: "#102838"
		}
	};

	/**
	 * Initialize chunk system for a world
	 * @param {number} totalScenes - Total number of scenes in the world
	 * @param {Object} worldConfig - Optional world configuration
	 */
	function initChunks(totalScenes, worldConfig = {}) {
		chunks.clear();
		
		const canvas = getCanvas();
		const sceneWidth = canvas.width;
		
		// Create metadata for all chunks (but don't load them yet)
		for (let i = 0; i < totalScenes; i++) {
			const biomeIndex = Math.floor(i / 5) % Object.keys(palettes).length;
			const biomeKeys = Object.keys(palettes);
			const biome = biomeKeys[biomeIndex];
			
			const templateIndex = i % backgroundTemplates.length;
			const template = backgroundTemplates[templateIndex];
			
			chunks.set(i, {
				index: i,
				state: ChunkState.UNLOADED,
				x: i * sceneWidth,
				width: sceneWidth,
				biome: biome,
				palette: palettes[biome],
				backgroundKey: template.key,
				// Runtime data (populated when loaded)
				enemies: [],
				pickups: [],
				loaded: false
			});
		}
		
		console.log(`[ChunkLoader] Initialized ${totalScenes} chunks`);
	}

	/**
	 * Get chunk index for a world X position
	 * @param {number} worldX - X position in world coordinates
	 * @returns {number} Chunk index
	 */
	function getChunkIndexAt(worldX) {
		const canvas = getCanvas();
		return Math.floor(worldX / canvas.width);
	}

	/**
	 * Update which chunks should be loaded based on camera position
	 */
	function updateLoadedChunks() {
		const state = getState();
		if (!state.worldMode || !state.camera) return;
		
		const canvas = getCanvas();
		const cameraX = state.camera.x;
		const cameraCenterX = cameraX + canvas.width / 2;
		
		const currentChunk = getChunkIndexAt(cameraCenterX);
		const totalChunks = state.sceneCount || chunks.size;
		
		// Determine which chunks should be loaded
		const chunksToLoad = new Set();
		for (let offset = -LOAD_RADIUS; offset <= LOAD_RADIUS + 1; offset++) {
			const chunkIndex = currentChunk + offset;
			if (chunkIndex >= 0 && chunkIndex < totalChunks) {
				chunksToLoad.add(chunkIndex);
			}
		}
		
		// Unload chunks that are too far away
		for (const [index, chunk] of chunks) {
			if (!chunksToLoad.has(index) && chunk.state !== ChunkState.UNLOADED) {
				unloadChunk(index);
			}
		}
		
		// Load chunks that should be loaded
		for (const index of chunksToLoad) {
			const chunk = chunks.get(index);
			if (chunk && chunk.state === ChunkState.UNLOADED) {
				loadChunk(index);
			}
		}
		
		// Mark the current chunk as active
		state.activeChunk = currentChunk;
	}

	/**
	 * Load a chunk into memory
	 * @param {number} index - Chunk index to load
	 */
	function loadChunk(index) {
		const chunk = chunks.get(index);
		if (!chunk || chunk.state !== ChunkState.UNLOADED) return;
		
		chunk.state = ChunkState.LOADING;
		
		// For now, loading is instant since we reuse sprites
		// In a full implementation, this could load unique assets
		chunk.loaded = true;
		chunk.state = ChunkState.LOADED;
		
		console.log(`[ChunkLoader] Loaded chunk ${index} (${chunk.biome})`);
	}

	/**
	 * Unload a chunk from memory
	 * @param {number} index - Chunk index to unload
	 */
	function unloadChunk(index) {
		const chunk = chunks.get(index);
		if (!chunk || chunk.state === ChunkState.UNLOADED) return;
		
		// Clear runtime data
		chunk.enemies = [];
		chunk.pickups = [];
		chunk.loaded = false;
		chunk.state = ChunkState.UNLOADED;
		
		console.log(`[ChunkLoader] Unloaded chunk ${index}`);
	}

	/**
	 * Get all currently loaded chunks
	 * @returns {Array} Array of loaded chunk data
	 */
	function getLoadedChunks() {
		const loaded = [];
		for (const [index, chunk] of chunks) {
			if (chunk.state === ChunkState.LOADED || chunk.state === ChunkState.ACTIVE) {
				loaded.push(chunk);
			}
		}
		return loaded;
	}

	/**
	 * Get chunk data by index
	 * @param {number} index - Chunk index
	 * @returns {Object|null} Chunk data or null
	 */
	function getChunk(index) {
		return chunks.get(index) || null;
	}

	/**
	 * Get visible chunks (for rendering)
	 * @returns {Array} Array of visible chunk data
	 */
	function getVisibleChunks() {
		const state = getState();
		if (!state.worldMode || !state.camera) {
			// Return first chunk for non-world mode
			return chunks.size > 0 ? [chunks.get(0)] : [];
		}
		
		const canvas = getCanvas();
		const cameraX = state.camera.x;
		
		const firstVisible = Math.max(0, Math.floor(cameraX / canvas.width));
		const lastVisible = Math.min(
			(state.sceneCount || chunks.size) - 1,
			Math.ceil((cameraX + canvas.width) / canvas.width)
		);
		
		const visible = [];
		for (let i = firstVisible; i <= lastVisible; i++) {
			const chunk = chunks.get(i);
			if (chunk && chunk.loaded) {
				visible.push(chunk);
			}
		}
		
		return visible;
	}

	/**
	 * Get the palette for a specific chunk
	 * @param {number} index - Chunk index
	 * @returns {Object} Color palette
	 */
	function getChunkPalette(index) {
		const chunk = chunks.get(index);
		if (chunk) return chunk.palette;
		
		// Default ocean palette
		return palettes.ocean;
	}

	/**
	 * Get total number of chunks
	 * @returns {number} Total chunks
	 */
	function getTotalChunks() {
		return chunks.size;
	}

	/**
	 * Get current active chunk index
	 * @returns {number} Active chunk index
	 */
	function getActiveChunkIndex() {
		const state = getState();
		return state.activeChunk || 0;
	}

	/**
	 * Get memory usage stats
	 * @returns {Object} Memory stats
	 */
	function getStats() {
		let loaded = 0;
		let unloaded = 0;
		
		for (const chunk of chunks.values()) {
			if (chunk.loaded) loaded++;
			else unloaded++;
		}
		
		return {
			total: chunks.size,
			loaded,
			unloaded,
			loadRadius: LOAD_RADIUS
		};
	}

	return {
		initChunks,
		updateLoadedChunks,
		getChunkIndexAt,
		getChunk,
		getLoadedChunks,
		getVisibleChunks,
		getChunkPalette,
		getTotalChunks,
		getActiveChunkIndex,
		getStats,
		loadChunk,
		unloadChunk,
		ChunkState,
		palettes
	};
}
