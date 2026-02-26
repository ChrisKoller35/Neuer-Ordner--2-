# Sprite Workflow (Google + lokaler Generator)

## 1) Einzelnes Sprite erzeugen
`npm run generate:sprite -- --prompt "pixel art fish knight with trident" --category "foe" --size 128`

## 2) Batch aus Datei
Prompts in `scripts/sprite-prompts.txt` eintragen (eine Zeile = ein Prompt), dann:
`npm run generate:sprites`

## 3) Dry-Run / Validate
Prüft Argumente und geplante Output-Pfade ohne API-Call:
`npm run generate:sprite -- --prompt "test" --dry-run`

## 4) Prompt-Template verwenden
Der Generator liest standardmäßig `scripts/sprite-prompt.template.txt` und kombiniert es mit deinem Prompt.

## 5) Outputs und Registrierung
- PNGs landen in `src/symbols/generated/`
- Einträge werden in `src/data/generatedSprites.json` ergänzt
- `src/data/assets.json` bekommt automatisch `groups.generatedSprites` + Scene-Mapping für `game`

## 6) Wichtige Optionen
- `--model "..."` anderes Google Modell
- `--category "boss|foe|icon|..."` für Dateiname/Manifest
- `--size 64|128|256` Normalisierung auf feste Kantenlänge
- `--no-alpha-check` deaktiviert Transparenz-Warnung
- `--no-auto-cutout` deaktiviert automatische Freistellung bei Bildern ohne Alpha-Kanal
- `--no-chroma-key` deaktiviert Magenta-Chroma-Key-Entfernung
- `--bg-threshold 12..120` steuert Stärke der randbasierten Hintergrundentfernung (Default: 58)
- `--manifest "src/data/generatedSprites.json"` alternativer Manifestpfad

Standardverhalten: Der Prompt fordert einen magenta Hintergrund (`#FF00FF`) und der Generator entfernt diesen per Chroma Key automatisch.

## 7) Sicherheit
- API-Key nur lokal in `.env.local`
- `.env.local` ist durch `.gitignore` geschützt
- Kein Key im Frontend-Bundle
