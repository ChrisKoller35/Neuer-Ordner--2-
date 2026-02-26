import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  buildPrompt,
  createManifestEntry,
  makeAssetKey,
  makeOutputPath,
  parseArgs,
  processImage,
  readPrompts,
  readTemplate,
  registerInAssetsManifest,
  resolveGoogleApiKey,
  upsertGeneratedManifest,
  validateArgs
} from './generate-sprite-lib.js';

async function generateSprite({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google API Fehler (${response.status}): ${details}`);
  }

  const data = await response.json();
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      const inlineData = part?.inlineData;
      if (inlineData?.data) {
        return {
          base64: inlineData.data,
          mimeType: inlineData.mimeType || 'image/png'
        };
      }
    }
  }

  throw new Error('Kein Bild in der API-Antwort gefunden. Nutze ggf. ein anderes Modell über --model.');
}

async function main() {
  const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const args = parseArgs(process.argv.slice(2));
  const templatePath = args.templatePath
    ? path.resolve(projectRoot, args.templatePath)
    : path.join(projectRoot, 'scripts', 'sprite-prompt.template.txt');
  const manifestPath = path.resolve(projectRoot, args.manifestPath);
  const assetsManifestPath = path.join(projectRoot, 'src', 'data', 'assets.json');

  validateArgs(args);

  const template = readTemplate(templatePath);
  const prompts = readPrompts(
    args.promptsFile ? path.resolve(projectRoot, args.promptsFile) : '',
    args.prompt
  );

  if (prompts.length === 0) {
    throw new Error('Keine gültigen Prompts gefunden.');
  }

  if (args.dryRun) {
    console.log(`[DRY-RUN] ${prompts.length} Prompt(s), Kategorie=${args.category}, Size=${args.size}`);
    for (const prompt of prompts) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outPath = makeOutputPath(projectRoot, prompt, args.category, stamp, args.out);
      const rel = path.relative(projectRoot, outPath).split(path.sep).join('/');
      console.log(`[DRY-RUN] -> ${rel}`);
    }
    return;
  }

  const apiKey = resolveGoogleApiKey(projectRoot);
  if (!apiKey) {
    throw new Error('Kein Google API Key gefunden. Trage ihn in .env.local als VITE_GOOGLE_API_KEY=... ein.');
  }

  for (const prompt of prompts) {
    const createdAt = new Date().toISOString();
    const stamp = createdAt.replace(/[:.]/g, '-');
    const fullPrompt = buildPrompt(template, prompt, args.chromaKeyMagenta);
    const outPath = makeOutputPath(projectRoot, prompt, args.category, stamp, args.out);

    const { base64, mimeType } = await generateSprite({
      apiKey,
      model: args.model,
      prompt: fullPrompt
    });

    if (!mimeType.startsWith('image/')) {
      throw new Error(`Unerwarteter MIME-Type: ${mimeType}`);
    }

    const sourceBuffer = Buffer.from(base64, 'base64');
    const { outputBuffer, hasAlpha, width, height, alphaWarning } = await processImage(
      sourceBuffer,
      args.size,
      args.checkAlpha,
      args.autoCutout,
      args.chromaKeyMagenta,
      args.bgThreshold
    );

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, outputBuffer);

    const relPath = path.relative(path.join(projectRoot, 'src'), outPath).split(path.sep).join('/');
    const key = makeAssetKey(args.category, prompt, stamp);

    const entry = createManifestEntry({
      key,
      relPath,
      category: args.category,
      prompt,
      model: args.model,
      size: args.size,
      width,
      height,
      hasAlpha,
      createdAt
    });

    upsertGeneratedManifest(manifestPath, entry);
    registerInAssetsManifest(assetsManifestPath, entry);

    const relOut = path.relative(projectRoot, outPath).split(path.sep).join('/');
    console.log(`Sprite gespeichert: ${relOut}`);
    console.log(`Manifest-Eintrag: ${entry.id}`);
    if (alphaWarning) {
      console.warn(alphaWarning);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
