import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  slugify,
  normalizeCategory,
  validateArgs,
  makeAssetKey,
  createManifestEntry
} from '../scripts/generate-sprite-lib.js';

describe('generate-sprite-lib', () => {
  it('parses prompt and category args', () => {
    const args = parseArgs(['--prompt', 'blue fish mage', '--category', 'NPC Boss', '--size', '64']);
    expect(args.prompt).toBe('blue fish mage');
    expect(args.category).toBe('NPC Boss');
    expect(args.size).toBe(64);
    expect(args.autoCutout).toBe(true);
    expect(args.chromaKeyMagenta).toBe(true);
  });

  it('supports disabling auto-cutout via flag', () => {
    const args = parseArgs(['--prompt', 'test', '--no-auto-cutout']);
    expect(args.autoCutout).toBe(false);
  });

  it('supports disabling chroma-key via flag', () => {
    const args = parseArgs(['--prompt', 'test', '--no-chroma-key']);
    expect(args.chromaKeyMagenta).toBe(false);
  });

  it('slugifies umlauts and symbols safely', () => {
    expect(slugify('ÄÖÜ Schlüssel Symbol!!!')).toBe('aou-schlussel-symbol');
  });

  it('normalizes categories into safe folder/id names', () => {
    expect(normalizeCategory('Boss Gegner')).toBe('boss-gegner');
  });

  it('validates that exactly one prompt source is used', () => {
    expect(() => validateArgs({
      prompt: 'x',
      promptsFile: 'scripts/sprite-prompts.txt',
      out: '',
      size: 128
    })).toThrow();
  });

  it('builds deterministic asset key shape', () => {
    const key = makeAssetKey('boss', 'giant stone shark', '2026-02-25T10-11-12-000Z');
    expect(key.startsWith('boss_')).toBe(true);
    expect(key.includes('giant-stone-shark')).toBe(true);
  });

  it('creates manifest entry with expected fields', () => {
    const entry = createManifestEntry({
      key: 'boss_stone_101112',
      relPath: 'symbols/generated/boss-stone.png',
      category: 'boss',
      prompt: 'stone shark',
      model: 'model-x',
      size: 128,
      width: 128,
      height: 128,
      hasAlpha: true,
      createdAt: '2026-02-25T10:11:12.000Z'
    });

    expect(entry.path).toBe('symbols/generated/boss-stone.png');
    expect(entry.size).toBe(128);
    expect(entry.hasAlpha).toBe(true);
  });
});
