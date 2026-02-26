import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const DEFAULT_MODEL = 'gemini-2.5-flash-image';
export const DEFAULT_CATEGORY = 'misc';
export const DEFAULT_GROUP = 'generatedSprites';
export const DEFAULT_SIZE = 128;

export function parseArgs(argv) {
  const args = {
    prompt: '',
    promptsFile: '',
    out: '',
    model: process.env.GOOGLE_IMAGE_MODEL || DEFAULT_MODEL,
    category: DEFAULT_CATEGORY,
    size: DEFAULT_SIZE,
    dryRun: false,
    checkAlpha: true,
    autoCutout: true,
    chromaKeyMagenta: true,
    bgThreshold: 58,
    templatePath: '',
    manifestPath: 'src/data/generatedSprites.json'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if ((token === '--prompt' || token === '-p') && argv[index + 1]) {
      args.prompt = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if ((token === '--prompts-file' || token === '-f') && argv[index + 1]) {
      args.promptsFile = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if ((token === '--out' || token === '-o') && argv[index + 1]) {
      args.out = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (token === '--model' && argv[index + 1]) {
      args.model = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (token === '--category' && argv[index + 1]) {
      args.category = argv[index + 1].trim() || DEFAULT_CATEGORY;
      index += 1;
      continue;
    }

    if (token === '--size' && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed)) {
        args.size = parsed;
      }
      index += 1;
      continue;
    }

    if (token === '--bg-threshold' && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed)) {
        args.bgThreshold = Math.max(12, Math.min(120, parsed));
      }
      index += 1;
      continue;
    }

    if (token === '--template' && argv[index + 1]) {
      args.templatePath = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (token === '--manifest' && argv[index + 1]) {
      args.manifestPath = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--no-alpha-check') {
      args.checkAlpha = false;
      continue;
    }

    if (token === '--no-auto-cutout') {
      args.autoCutout = false;
      continue;
    }

    if (token === '--auto-cutout') {
      args.autoCutout = true;
      continue;
    }

    if (token === '--no-chroma-key') {
      args.chromaKeyMagenta = false;
      continue;
    }

    if (token === '--chroma-key') {
      args.chromaKeyMagenta = true;
    }
  }

  return args;
}

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

export function resolveGoogleApiKey(projectRoot) {
  const envLocal = parseEnvFile(path.join(projectRoot, '.env.local'));

  return (
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY ||
    envLocal.GOOGLE_API_KEY ||
    envLocal.VITE_GOOGLE_API_KEY ||
    ''
  ).trim();
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48) || 'sprite';
}

export function normalizeCategory(category) {
  return slugify(category || DEFAULT_CATEGORY).slice(0, 24) || DEFAULT_CATEGORY;
}

export function validateSize(size) {
  if (![64, 128, 256].includes(size)) {
    throw new Error('Ungültige --size. Erlaubt: 64, 128, 256');
  }
}

export function validateArgs(args) {
  const hasPrompt = Boolean(args.prompt);
  const hasPromptsFile = Boolean(args.promptsFile);

  if (!hasPrompt && !hasPromptsFile) {
    throw new Error('Fehlt: --prompt "..." oder --prompts-file "..."');
  }

  if (hasPrompt && hasPromptsFile) {
    throw new Error('Bitte nur eines nutzen: --prompt ODER --prompts-file');
  }

  if (hasPromptsFile && args.out) {
    throw new Error('--out ist nur mit einem einzelnen Prompt erlaubt');
  }

  validateSize(args.size);
}

export function readTemplate(templatePath) {
  if (!templatePath || !fs.existsSync(templatePath)) {
    return '';
  }
  return fs.readFileSync(templatePath, 'utf8').trim();
}

export function readPrompts(promptsFile, singlePrompt) {
  if (singlePrompt) {
    return [singlePrompt.trim()].filter(Boolean);
  }

  const content = fs.readFileSync(promptsFile, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export function buildPrompt(template, prompt, chromaKeyMagenta = true) {
  const backgroundHint = chromaKeyMagenta
    ? 'Background requirement: Use a solid pure magenta background (#FF00FF) behind the subject.'
    : '';

  if (!template) {
    return [prompt, backgroundHint].filter(Boolean).join('\n');
  }

  return [template, backgroundHint, `User Prompt: ${prompt}`].filter(Boolean).join('\n\n');
}

export function makeOutputPath(projectRoot, prompt, category, stamp, out) {
  if (out) {
    return path.resolve(projectRoot, out);
  }

  const safeCategory = normalizeCategory(category);
  const safePrompt = slugify(prompt);
  const fileName = `${safeCategory}-${safePrompt}-${stamp}.png`;

  return path.join(projectRoot, 'src', 'symbols', 'generated', fileName);
}

function colorDistance(aR, aG, aB, bR, bG, bB) {
  const dr = aR - bR;
  const dg = aG - bG;
  const db = aB - bB;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getPixelOffset(x, y, width, channels = 4) {
  return (y * width + x) * channels;
}

function collectDominantBorderColors(data, width, height, channels) {
  const bins = new Map();
  const quant = 24;

  function addPixel(x, y) {
    const offset = getPixelOffset(x, y, width, channels);
    const alpha = data[offset + 3];
    if (alpha < 12) {
      return;
    }

    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const qr = Math.floor(r / quant);
    const qg = Math.floor(g / quant);
    const qb = Math.floor(b / quant);
    const key = `${qr},${qg},${qb}`;
    const entry = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    entry.count += 1;
    entry.r += r;
    entry.g += g;
    entry.b += b;
    bins.set(key, entry);
  }

  for (let x = 0; x < width; x += 1) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  return Array.from(bins.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((entry) => {
      const inv = 1 / entry.count;
      return {
        r: entry.r * inv,
        g: entry.g * inv,
        b: entry.b * inv
      };
    });
}

export async function autoCutoutSolidBackground(inputBuffer, threshold = 58) {
  const { data, info } = await sharp(inputBuffer, { failOnError: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (!width || !height || channels < 4) {
    return { outputBuffer: inputBuffer, cutoutApplied: false };
  }

  const borderPalette = collectDominantBorderColors(data, width, height, channels);
  if (!borderPalette.length) {
    return { outputBuffer: inputBuffer, cutoutApplied: false };
  }

  const visited = new Uint8Array(width * height);
  const queue = [];

  function pushIfBackground(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const idx = y * width + x;
    if (visited[idx]) {
      return;
    }

    const offset = getPixelOffset(x, y, width, channels);
    const alpha = data[offset + 3];
    if (alpha === 0) {
      visited[idx] = 1;
      queue.push([x, y]);
      return;
    }

    const pixelR = data[offset];
    const pixelG = data[offset + 1];
    const pixelB = data[offset + 2];
    const isBackground = borderPalette.some((bg) => {
      const dist = colorDistance(pixelR, pixelG, pixelB, bg.r, bg.g, bg.b);
      return dist <= threshold;
    });

    if (isBackground) {
      visited[idx] = 1;
      queue.push([x, y]);
    }
  }

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x, 0);
    pushIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBackground(0, y);
    pushIfBackground(width - 1, y);
  }

  let removed = 0;
  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const offset = getPixelOffset(x, y, width, channels);
    if (data[offset + 3] !== 0) {
      data[offset + 3] = 0;
      removed += 1;
    }

    pushIfBackground(x + 1, y);
    pushIfBackground(x - 1, y);
    pushIfBackground(x, y + 1);
    pushIfBackground(x, y - 1);
  }

  if (removed === 0) {
    return { outputBuffer: inputBuffer, cutoutApplied: false };
  }

  const outputBuffer = await sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();

  return { outputBuffer, cutoutApplied: true };
}

function isMagentaLike(r, g, b, tolerance = 140) {
  const dist = colorDistance(r, g, b, 255, 0, 255);
  return dist <= tolerance && g <= 140 && r >= 90 && b >= 90;
}

export async function removeMagentaBackground(inputBuffer, tolerance = 140) {
  const { data, info } = await sharp(inputBuffer, { failOnError: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (!width || !height || channels < 4) {
    return { outputBuffer: inputBuffer, chromaApplied: false };
  }

  const visited = new Uint8Array(width * height);
  const queue = [];

  function pushIfMagentaBackground(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const idx = y * width + x;
    if (visited[idx]) {
      return;
    }

    const offset = getPixelOffset(x, y, width, channels);
    const alpha = data[offset + 3];
    if (alpha === 0) {
      visited[idx] = 1;
      queue.push([x, y]);
      return;
    }

    if (isMagentaLike(data[offset], data[offset + 1], data[offset + 2], tolerance)) {
      visited[idx] = 1;
      queue.push([x, y]);
    }
  }

  for (let x = 0; x < width; x += 1) {
    pushIfMagentaBackground(x, 0);
    pushIfMagentaBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfMagentaBackground(0, y);
    pushIfMagentaBackground(width - 1, y);
  }

  let removed = 0;
  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const offset = getPixelOffset(x, y, width, channels);
    if (data[offset + 3] !== 0) {
      data[offset + 3] = 0;
      removed += 1;
    }

    pushIfMagentaBackground(x + 1, y);
    pushIfMagentaBackground(x - 1, y);
    pushIfMagentaBackground(x, y + 1);
    pushIfMagentaBackground(x, y - 1);
  }

  if (removed === 0) {
    return { outputBuffer: inputBuffer, chromaApplied: false };
  }

  const outputBuffer = await sharp(data, {
    raw: { width, height, channels }
  })
    .png()
    .toBuffer();

  return { outputBuffer, chromaApplied: true };
}

export async function processImage(buffer, targetSize, checkAlpha, autoCutout = true, chromaKeyMagenta = true, bgThreshold = 58) {
  const metadata = await sharp(buffer, { failOnError: false }).metadata();
  const hasAlpha = Number(metadata.channels || 0) >= 4;

  let workingBuffer = buffer;
  let chromaApplied = false;
  if (chromaKeyMagenta) {
    const chromaResult = await removeMagentaBackground(workingBuffer);
    workingBuffer = chromaResult.outputBuffer;
    chromaApplied = chromaResult.chromaApplied;
  }

  let cutoutApplied = false;
  if (autoCutout && !hasAlpha && !chromaApplied) {
    const cutoutResult = await autoCutoutSolidBackground(workingBuffer, bgThreshold);
    workingBuffer = cutoutResult.outputBuffer;
    cutoutApplied = cutoutResult.cutoutApplied;
  }

  const outputBuffer = await sharp(workingBuffer, { failOnError: false })
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const outMeta = await sharp(outputBuffer, { failOnError: false }).metadata();

  return {
    outputBuffer,
    hasAlpha: hasAlpha || cutoutApplied || chromaApplied,
    width: outMeta.width || targetSize,
    height: outMeta.height || targetSize,
    chromaApplied,
    cutoutApplied,
    alphaWarning: checkAlpha && !hasAlpha
      ? (chromaApplied
        ? 'Hinweis: Magenta-Hintergrund wurde per Chroma Key entfernt.'
        : (cutoutApplied
          ? 'Hinweis: Kein Alpha im Original erkannt, Hintergrund wurde automatisch freigestellt.'
          : 'Warnung: Bild hatte keinen Alpha-Kanal (kein transparenter Hintergrund im Original).'))
      : ''
  };
}

export function readJsonSafe(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJsonPretty(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function makeAssetKey(category, prompt, stamp) {
  return `${normalizeCategory(category)}_${slugify(prompt).slice(0, 28)}_${stamp.slice(11, 19).replace(/-/g, '')}`;
}

export function createManifestEntry({ key, relPath, category, prompt, model, size, width, height, hasAlpha, createdAt }) {
  return {
    id: key,
    key,
    path: relPath,
    category: normalizeCategory(category),
    prompt,
    model,
    size,
    width,
    height,
    hasAlpha,
    createdAt
  };
}

export function upsertGeneratedManifest(manifestPath, entry) {
  const fallback = {
    version: '1.0',
    group: DEFAULT_GROUP,
    updatedAt: '',
    sprites: []
  };

  const manifest = readJsonSafe(manifestPath, fallback);
  if (!Array.isArray(manifest.sprites)) {
    manifest.sprites = [];
  }

  const index = manifest.sprites.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    manifest.sprites[index] = entry;
  } else {
    manifest.sprites.push(entry);
  }

  manifest.updatedAt = new Date().toISOString();
  writeJsonPretty(manifestPath, manifest);

  return manifest;
}

export function registerInAssetsManifest(assetsManifestPath, entry) {
  const data = readJsonSafe(assetsManifestPath, null);
  if (!data || typeof data !== 'object') {
    return;
  }

  if (!data.groups || typeof data.groups !== 'object') {
    data.groups = {};
  }

  if (!data.groups.generatedSprites) {
    data.groups.generatedSprites = {
      description: 'Automatisch erzeugte KI-Sprites',
      preload: false,
      assets: {}
    };
  }

  data.groups.generatedSprites.assets[entry.key] = `./${entry.path}`;

  if (!data.sceneMapping || typeof data.sceneMapping !== 'object') {
    data.sceneMapping = {};
  }

  if (!Array.isArray(data.sceneMapping.game)) {
    data.sceneMapping.game = ['core'];
  }

  if (!data.sceneMapping.game.includes('generatedSprites')) {
    data.sceneMapping.game.push('generatedSprites');
  }

  writeJsonPretty(assetsManifestPath, data);
}
