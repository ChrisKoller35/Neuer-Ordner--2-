# Cashfisch 2 — Deep Code Review

> Reviewed: All 72 source files under `src/`, plus `index.html`, `cutscene.js`, `vite.config.js`, `package.json`  
> Total codebase: **~1.715 KB** across **72 files** in `src/`; plus **1.524 lines** in `index.html`

---

## 1. Dateigrößen-Inventar (Top 20 nach Zeilen)

| # | Datei | Zeilen | Rolle |
|---|-------|--------|-------|
| 1 | `src/game.js` | 2.207 | God-File – Hauptorchestrator |
| 2 | `src/buildings/buildingScene.js` | 1.773 | Gebäude-Szenen, Grid-Editor, Debug-Drag |
| 3 | `src/overworld/overworld.js` | 862 | Top-Down-Overworld mit Chunks |
| 4 | `src/game/levels.js` | 710 | Level-Konfigurationen + Progression |
| 5 | `src/boss/update.js` | 687 | Boss-KI und Projektil-Updates |
| 6 | `src/boss/render.js` | 697 | Boss-Rendering |
| 7 | `src/overworld/character.js` | 641 | Overworld-Character |
| 8 | `src/game/background.js` | 635 | Hintergrund-Rendering |
| 9 | `src/game/models.js` | 685 | Prozedurales Sprite-Zeichnen |
| 10 | `src/game/coverRocks.js` | 590 | Cover-Felsen-System |
| 11 | `src/boss/spawn.js` | 574 | 16 Boss-Angriff-Spawn-Funktionen |
| 12 | `src/boss/collision.js` | 503 | Boss-Kollision |
| 13 | `src/map/map.js` | 475 | Weltkarte-Overlay |
| 14 | `src/city/render.js` | 453 | Stadt-Rendering |
| 15 | `src/foes/update.js` | 444 | Gegner-KI |
| 16 | `src/city/spriteDebug.js` | 432 | Debug-Panel für Sprites |
| 17 | `src/player/progression.js` | 432 | XP, Level, Talent-System |
| 18 | `src/core/camera.js` | 407 | Kamera-System |
| 19 | `src/city/ui.js` | 396 | Stadt-UI (Händler, Inventar, Missionen) |
| 20 | `src/player/talentUI.js` | 377 | Talentbaum-DOM-UI |

**Beobachtung**: 4 Dateien haben über 700 Zeilen. `buildingScene.js` ist mit 1.773 Zeilen ein neues God-File — es enthält Render, Update, Grid-Editor, Debug-Drag, Dialog-System und Walkable-Grid-Logik in einem einzigen Export.

---

## 2. God-File-Problem: `game.js`

[game.js](src/game.js) ist mit **2.207 Zeilen** nach wie vor das zentrale Problem der Architektur — trotz bereits erfolgter Auslagerung von ~4.000 Zeilen Boss-Code.

### Symptome

| Problem | Stelle | Details |
|---------|--------|---------|
| **~130 Import-Zeilen** | [Zeile 1–130](src/game.js#L1-L130) | Importiert aus 25+ Modulen und 6 JSON-Dateien |
| **`bootGame()` = 1.800+ Zeilen** | [Zeile ~367–2207](src/game.js#L367) | Eine einzige Funktion enthält alle System-Initialisierung, Event-Listener, Game-Loop, Rendering |
| **30+ Collision-Handler sequentiell** | [Zeile ~1440–1470](src/game.js#L1440) | `update(dt)` ruft 30+ `handleXYCollision()`-Funktionen nacheinander auf |
| **Duplizierte `spawnFoe()`** | [Zeile ~655–740](src/game.js#L655) | Existiert AUCH in `foes/spawn.js` — die game.js-Version nutzt kein Object Pool |
| **Duplizierte Camera-Logik** | [Zeile ~1393–1438](src/game.js#L1393) | `updateCamera()` dupliziert `core/camera.js` |
| **Eigenes Key-Tracking** | [Zeile ~411](src/game.js#L411) | `const keys = new Set()` — obwohl `core/input.js` existiert |

### Konkrete Empfehlung

```
game.js (2.207 Zeilen) → sollte werden:

  gameLoop.js        (~80)   – requestAnimationFrame, delta-time
  gameInit.js        (~150)  – bootGame(), System-Erstellung
  gameEvents.js      (~200)  – Keyboard/Mouse Event-Listener
  gameUpdate.js      (~100)  – update(dt) Dispatcher
  gameRender.js      (~80)   – render() Dispatcher
  collision/index.js (~200)  – Alle Collision-Handler
  gameReset.js       (~100)  – resetGame(), startMission()
```

---

## 3. Bild-Assets in `src/` — Anti-Pattern

Bild-Dateien (PNG, WebP, JPG) liegen direkt im `src/`-Verzeichnis neben dem Quellcode. Das ist unüblich für Vite-Projekte.

**Problem**: Die Vite-Konfiguration setzt `publicDir: 'public'`, aber die Sprites werden über relative Pfade aus `src/` geladen (`./Player.png`, `./Backgroundlvlone.png`). Vite behandelt diese als Module und hasht sie — das funktioniert, vermischt aber Assets und Code.

**Empfehlung**:
- Statische Assets nach `public/assets/sprites/` verschieben
- Oder `src/assets/` verwenden und über Vites Asset-Import-System laden
- `sprites.json`-Pfade entsprechend anpassen

---

## 4. Modul-Kommunikation

### Das Context-Pattern (gut!)
Module verwenden Factory-Funktionen mit Dependency Injection:
```javascript
// Beispiel aus foes/update.js
export function createFoeUpdateSystem(ctx) {
    const { getState, getCanvas, clamp, ... } = ctx;
    // ...
    return { updateFoes };
}
```

### Probleme bei der Kommunikation

| Problem | Beispiel | Dateien |
|---------|----------|---------|
| **`window.*` Globals als Message-Bus** | `window.CITY_WALKABLE_GRID`, `window.ANIM_TEST`, `window.CITY_GRID_EDIT_MODE`, `window.SHOW_FLOOR_DEBUG_LINES` | [city/render.js#L370](src/city/render.js#L370), [city/update.js](src/city/update.js), [index.html](index.html) |
| **`window.*` für UI-Callbacks** | `window.closeTalentTree`, `window.investTalent`, `window.resetTalents` | [player/talentUI.js#L228-L235](src/player/talentUI.js#L228) |
| **Inkonsistente Context-Interfaces** | Manche Module erwarten `get canvas()` (Getter), andere `getCanvas()` (Funktion) | Dokumentiert in [REFACTORING_NOTES.md](REFACTORING_NOTES.md#L79) |
| **Walkable-Grid über `window[key]`** | `window['BUILDING_WALKABLE_GRID_' + buildingId]` — dynamische globale Keys | [buildings/buildingScene.js#L662](src/buildings/buildingScene.js#L662) |
| **localStorage als Persistenz** | Portal-Positionen, Teleporter-Positionen über `localStorage.setItem` | [buildings/buildingScene.js#L126](src/buildings/buildingScene.js#L126), [teleporter/teleporter.js#L89](src/teleporter/teleporter.js#L89) |

**Empfehlung**: 
- Die ~15 `window.*`-Globals durch ein zentrales `DebugConfig`-Modul ersetzen
- UI-Callbacks über Event-Emitter statt `window.*` registrieren
- Context-Interfaces standardisieren: immer `getX()`-Funktionen

---

## 5. Factory-Pattern-Nutzung

Das `create*System(ctx)`-Pattern ist **konsistent auf ~90% der Module** angewendet. Das ist die größte architektonische Stärke des Projekts.

### Gute Beispiele
- [createFoeUpdateSystem](src/foes/update.js#L12) — saubere Kapselung, klares Return-Interface
- [createAbilitiesSystem](src/player/abilities.js#L17) — lokaler State, öffentliches API
- [createMapSystem](src/map/map.js#L27) — eigener lokaler State, kein Leak nach außen
- [createBuildingsManager](src/buildings/buildingsManager.js#L16) — delegiert an Sub-Systeme

### Schwachstellen
- **`buildingScene.js`** — die Factory gibt ~40 Methoden zurück ([Zeile ~1700+](src/buildings/buildingScene.js#L1700)), das deutet auf mangelnde Kohäsion hin
- **Keine TypeScript/JSDoc Interfaces** — Context-Objekte sind undokumentierte Bags
- **Fehlende Abstraktion**: Jeder Boss-Angriff ist eine eigene Funktion statt eines datengetriebenen Attack-Patterns

---

## 6. Daten vs. Code Trennung

### Was gut funktioniert
- JSON-Dateien für statische Daten: `buildings.json`, `sprites.json`, `teleporter.json`, `upgrades.json`, `missions.json`, `items.json`, `shop.json`
- Sprite-Pfade in `sprites.json` und `assets.json` — sauber getrennt

### Was vermischt ist

| Datenproblem | Datei | Zeilen |
|-------------|-------|--------|
| **800+ Zeilen Grid-Daten in HTML** | [index.html#L550-L1350](index.html#L550) | `window.CITY_WALKABLE_GRID = {"8,3": true, "9,3": true, ...}` mit 560+ Zellen |
| **Level-Configs als Code** | [game/levels.js#L42-L560](src/game/levels.js#L42) | 9 Level-Definitionen mit 50+ Parametern pro Level sind inline-Code statt JSON |
| **Boss-Stats inline** | [game/levels.js#L65-L95](src/game/levels.js#L65) | Boss-Konfiguration (30+ Felder) direkt in JavaScript-Objekt-Literalen |
| **Hardcodierte Positionen** | [buildings/buildingScene.js#L93-L118](src/buildings/buildingScene.js#L93) | `DEFAULT_BUILDING_POSITIONS` als Objekt-Literal statt JSON |
| **Hardcodierte Teleporter-Position** | [teleporter/teleporter.js#L27](src/teleporter/teleporter.js#L27) | `{ x: 1350.54262597656, y: 521.276874023439 }` — magische Floats |
| **FOE_XP_VALUES als Code** | [player/progression.js#L39-L47](src/player/progression.js#L39) | XP-Tabelle gehört in ein JSON |

**Empfehlung**: 
- `index.html` Grid-Daten → `data/walkableGrids.json` (existiert bereits mit 380 Zeilen — die HTML-Version ist vermutlich die ältere Kopie!)
- Level-Configs → `data/levels/*.json` (Ordner existiert bereits, ist aber leer oder ungenutzt)
- Boss-Stats und FOE_XP in JSON auslagern

---

## 7. HTML/CSS Struktur

### `index.html` — 1.524 Zeilen

Die HTML-Datei enthält **weit mehr als Markup**:

| Inhalt | Zeilen (ca.) | Problem |
|--------|-------------|---------|
| HTML-Skeleton + HUD | ~150 | OK |
| Inline-Cutscene-System | ~400 | Vollständige Rendering-Engine in `<script>` |
| Walkable-Grid-Daten | ~800 | Riesiges JS-Objektliteral |
| Grid-Editor-Script | ~300 | Debug-Tool in Produktion |
| Character-Select-Script | ~100 | Inline statt Modul |
| Player-Drag-Mode | ~100 | Debug-Tool in Produktion |

**Empfehlung**:
1. Grid-Daten → JSON (1 Zeile Änderung: `import gridData from './data/walkableGrids.json'`)
2. Cutscene-System → `src/cutscene/cutscene.js` (als ES-Modul)
3. Grid-Editor → `src/debug/gridEditor.js` (nur im Dev-Build laden)
4. Player-Drag → `src/debug/dragMode.js`

### `styles.css` — 151 Zeilen (komprimiert)

CSS ist in **einer einzigen Zeile** für die Core-Rules geschrieben (Zeile 1), gefolgt von normal formatierten Klassen. Die Komprimierung von Zeile 1 macht das Debugging schwierig.

Der CSS-Code selbst ist solide — CSS-Custom-Properties (`--bg1`, `--glow`, `--txt`), klare Klassen-Namensgebung, responsive `min()`.

---

## 8. Namenskonventionen — Deutsch/Englisch-Mix

Die Codebase zeigt einen **klaren Trend**: Älterer Code ist überwiegend Deutsch, neuerer Code (nach Refactoring) überwiegend Englisch.

### Deutsch
| Typ | Beispiele |
|-----|-----------|
| **Enemy-Typen** | `bogenschreck`, `ritterfisch`, `Korallenbegleiter` |
| **Kommentare** | 90% aller JSDoc/Inline-Kommentare sind Deutsch |
| **UI-Strings** | `"Freischwimmen"`, `"Pfeilhagelriff"`, `"Flinke Flossen"` |
| **Variable-Mix** | `playerSpriteOffsetX` vs. `debugNpcOffset`, `floorHeight` vs. `Stockwerk` |

### Englisch
| Typ | Beispiele |
|-----|-----------|
| **Modul-Exports** | `createFoeUpdateSystem`, `createBossSpawnSystem`, `createMapSystem` |
| **Core-Utils** | `clamp`, `lerp`, `randomRange`, `easeOutCubic` |
| **Datei-Namen** | Alle `.js`-Dateien außer deutsche Ordner (`Bodenstadt/`, `Npc/`) |

### Empfehlung
Für ein Solo-Projekt ist Deutsch in Kommentaren und UI völlig OK. **Aber**: Identifier sollten einheitlich sein. `bogenschreck` als Foe-Type-String durchzieht die gesamte Codebase (Spawn, Update, Render, Collision, Levels) — eine Änderung wäre sehr aufwändig und brächte keinen Nutzen. **Akzeptabel lassen.**

---

## 9. State-Management

### Architektur
- **Zentral**: Ein einziges `state`-Objekt (erstellt in [core/initialState.js](src/core/initialState.js)) wird an alle Module durchgereicht
- **Mutable**: Module mutieren `state` direkt — kein Immutability-Pattern
- **Monolithisch**: `state` enthält Player, Boss, 15+ Boss-Projektil-Arrays, Foes, Pickups, Camera, City, Progression, Upgrades

### Projektil-Array-Explosion
In [core/initialState.js](src/core/initialState.js) und [game/levels.js#L625-L660](src/game/levels.js#L625):
```javascript
// Aus initialState.js / advanceLevel:
state.bossTorpedoes.length = 0;
state.bossSweeps.length = 0;
state.bossWakeWaves.length = 0;
state.bossWhirlpools.length = 0;
state.bossKatapultShots.length = 0;
state.bossShockwaves.length = 0;
state.bossSpeedboats.length = 0;
state.bossCoinBursts.length = 0;
state.bossCoinExplosions.length = 0;
state.bossDiamondBeams.length = 0;
state.bossCardBoomerangs.length = 0;
state.bossTreasureWaves.length = 0;
state.bossCrownColumns.length = 0;
state.bossPerfumeOrbs.length = 0;
state.bossFragranceClouds.length = 0;
```
**15 separate Arrays** für Boss-Projektile. Jeder neue Boss-Angriff benötigt ein neues Array + Reset-Code in 3+ Stellen.

**Empfehlung**: Ein einziges `state.bossProjectiles`-Map oder typisiertes Array:
```javascript
state.bossProjectiles = new Map(); // key = projectileType
// Oder: state.bossProjectiles = []; mit type-Feld pro Objekt
```

### State-Reset-Duplikation
State wird an **mindestens 3 Stellen** zurückgesetzt:
1. [game.js `resetGame()`](src/game.js)
2. [game/levels.js `advanceLevel()`](src/game/levels.js#L615)
3. [core/initialState.js `clearAllStateArrays()`](src/core/initialState.js)

Wenn ein neues Projektil-Array hinzugefügt wird, muss man alle 3 Stellen finden und updaten.

---

## 10. Overworld-Modul Qualität

[overworld/overworld.js](src/overworld/overworld.js) (862 Zeilen) + [overworld/character.js](src/overworld/character.js) (641 Zeilen) sind die **am besten strukturierten Module** des Projekts.

### Stärken
- **Selbst-contained**: Exportiert nur 3 Funktionen (`createOverworldState`, `updateOverworld`, `renderOverworld`)
- **Prozedural deterministisch**: Seeded RNG für konsistente Chunk-Generierung
- **Biome-System**: 11 Gebäude-Definitionen, Path-Network, Dekorations-Generierung
- **Chunk-Culling**: Nur sichtbare Chunks werden gerendert
- **Minimap**: Eigenständig integriert

### Verbesserungspotential
- 862 Zeilen in einer Datei — könnte in `overworld/render.js`, `overworld/biomes.js`, `overworld/buildings.js` aufgeteilt werden
- Hardcodierte Biome-Konfiguration (Zeile ~30-120) gehört in eine JSON-Datei
- `character.js` mit 641 Zeilen enthält sowohl Rendering als auch Logik

**Gesamtbewertung**: 8/10 — vorbildlich für den Rest des Projekts.

---

## 11. Backup-Ordner

| Ordner | Größe | Zweck |
|--------|-------|-------|
| `BACKUP_lazy_loading_2026-02-11_16-00/` | 49.8 MB | Zustand vor Lazy-Loading-Einführung |
| `BACKUP_refactoring_2026-02-11_16-30/` | 49.6 MB | Zustand vor Boss-Modulreferencing |
| `BACKUP_vor_gebaeude_2026-02-08_18-40/` | 34.1 MB | Zustand vor Gebäude-System |
| **Gesamt** | **133.5 MB** | Enthalten vollständige Copies inkl. Assets |

### Problem
- **133 MB** an duplizierten Daten im Projekt
- Binäre Assets (PNGs, WebPs) werden 3× kopiert
- Die Backups enthalten veralteten Code, der bei globaler Suche falsche Ergebnisse liefert

### Empfehlung
1. Git verwenden (oder wenn bereits: Backups löschen)
2. `.gitignore` für `BACKUP_*/` hinzufügen
3. `vite.config.js` schließt nur `tools/` aus — Backups werden ggf. vom Dev-Server beobachtet

---

## 12. Positive Aspekte

### Architekturelle Stärken

1. **Konsequentes Factory-Pattern**: `create*System(ctx)` ist durchgehend implementiert und löst Hoisting-Probleme elegant
2. **Object Pooling** ([core/pool.js](src/core/pool.js)): Shots und Foes werden gepoolt — verhindert GC-Stutter in Echtzeit-Rendering
3. **Spatial Hash Grid** ([core/spatial.js](src/core/spatial.js)): Professionelle Kollisions-Optimierung mit Zellgrößen-basiertem Hashing
4. **Lazy Sprite Loading** ([core/assets.js](src/core/assets.js)): `createLazySpriteProxy`-Pattern — Sprites werden on-demand geladen und automatisch ersetzt
5. **WebP mit PNG Fallback**: Modernes Asset-Format mit graceful degradation
6. **Saubere Daten-JSON-Trennung**: `buildings.json`, `sprites.json`, `teleporter.json`, `upgrades.json`, `missions.json` — zeigt guten Architektur-Instinkt
7. **Delta-Time-basierte Updates**: Konsistente `dt`-Parametrisierung in allen Update-Funktionen
8. **Progression-System** ([player/progression.js](src/player/progression.js)): Sauberes XP/Level/Talent-Design mit `effect`-Funktionen pro Talent

### Code-Qualität

9. **Gute Error-Handling-Kultur**: Try/Catch um localStorage-Zugriffe, Sprite-Ladung, etc.
10. **JSDoc-Kommentierung**: Konsistente `@param`/`@returns`-Dokumentation auf ~70% der Funktionen
11. **CSS-Custom-Properties**: Zeigt Verständnis von modernen CSS-Patterns
12. **Modulare Vite-Konfiguration**: Sauberes Setup mit Dev-Server, Build und Asset-Handling

### Game Design

13. **Tiefes Kampfsystem**: 4 Boss-Patterns (Default, ArrowVolley, Regatta, Cashfish) mit jeweils 4-6 Angriffen
14. **RPG-Progression**: XP → Level → Skillpoints → Talente + separates Upgrade-System
15. **Multi-Mode-Architektur**: Game/City/Building/Overworld — ambitioniertes Spieldesign

---

## 13. Top-Verbesserungen nach Impact gerankt

### Rang 1: `game.js` aufteilen (Impact: 🔴 KRITISCH)
**Aufwand**: ~4-6 Stunden | **Risiko**: Mittel | **Effekt**: Wartbarkeit +80%

`game.js` mit 2.207 Zeilen ist das Bottleneck. Die `bootGame()`-Funktion ist praktisch eine monolithische Anwendung. Aufteilen in:
- `gameInit.js` (System-Erstellung, Context-Objekte)
- `gameLoop.js` (tick, update, render Dispatcher)
- `gameEvents.js` (Keyboard, Mouse, Touch)
- `collision/` (eigenes Verzeichnis für 30+ Handler)
- Duplizierte `spawnFoe()` entfernen → bestehende `foes/spawn.js` nutzen

---

### Rang 2: `index.html` entschlacken (Impact: 🔴 KRITISCH)
**Aufwand**: ~2 Stunden | **Risiko**: Niedrig | **Effekt**: Wartbarkeit +50%, Ladegröße -40KB

800 Zeilen Grid-Daten + 700 Zeilen Inline-Scripts aus HTML entfernen:
- Grid-Daten → `import` aus `data/walkableGrids.json` (existiert schon!)
- Cutscene-System → eigenes ES-Modul
- Debug-Tools (Grid-Editor, Drag-Mode) → `src/debug/` mit Conditional Loading

---

### Rang 3: `window.*`-Globals eliminieren (Impact: 🟠 HOCH)
**Aufwand**: ~3 Stunden | **Risiko**: Niedrig | **Effekt**: Testbarkeit +60%, weniger spröde Kopplung

Alle `window.*`-Referenzen durch ein `DebugConfig`-Singleton oder ein Event-System ersetzen. Aktuell ~15 verschiedene `window.*`-Globals für Grid-Editor, Drag-Mode, Floor-Debug, Animation-Test.

---

### Rang 4: Boss-Projektil-Arrays konsolidieren (Impact: 🟠 HOCH)
**Aufwand**: ~3 Stunden | **Risiko**: Mittel | **Effekt**: Erweiterbarkeit +70% für neue Bosse

15 separate Arrays → 1 typisiertes `bossProjectiles`-Map. Ein einziger Update/Render/Clear-Mechanismus statt 3-fach duplizierter Reset-Code.

---

### Rang 5: `buildingScene.js` aufteilen (Impact: 🟡 MITTEL)
**Aufwand**: ~3 Stunden | **Risiko**: Niedrig | **Effekt**: Wartbarkeit +40%

1.773 Zeilen → Aufteilen in:
- `buildingScene.js` (~400) — Kern: Enter/Exit/Update
- `buildingRender.js` (~400) — Rendering
- `buildingGridEditor.js` (~300) — Debug-Grid-Editor
- `buildingDebugDrag.js` (~200) — Debug-Drag-Modus
- `buildingDialog.js` (~200) — NPC-Dialog-System

---

### Rang 6: Level-Configs als Daten (Impact: 🟡 MITTEL)
**Aufwand**: ~2 Stunden | **Risiko**: Niedrig | **Effekt**: Game-Designer-Friendly +80%

710 Zeilen `game/levels.js` enthalten hauptsächlich **Daten** (Boss-Stats, Spawn-Tabellen, Cooldowns). Als JSON-Dateien in `data/levels/` wären sie ohne Code-Kenntnisse editierbar.

---

### Rang 7: Backup-Ordner entfernen (Impact: 🟡 MITTEL)
**Aufwand**: 5 Minuten | **Risiko**: Null | **Effekt**: 133 MB weniger, saubere Suche

Git-Commit machen, dann alle 3 `BACKUP_*/`-Ordner löschen. Falls kein Git im Einsatz: `git init` + `.gitignore` aufsetzen.

---

### Rang 8: Code-Duplikation bereinigen (Impact: 🟢 NIEDRIG-MITTEL)
**Aufwand**: ~1 Stunde | **Risiko**: Niedrig | **Effekt**: Single Source of Truth

Duplizierter Code identifiziert:
- `clamp()` existiert in: `core/utils.js`, `boss/spawn.js` (lokal), `game/render.js` (lokal), `boss/update.js` (Import-Chain)
- `TAU = Math.PI * 2` definiert in: `core/constants.js`, `game/spawning.js`, `game/render.js`, `game/levels.js`
- `DEFAULT_BOSS_STATS` definiert in: `core/constants.js` UND `game/levels.js`
- `spawnFoe()` in: `game.js` UND `game/spawning.js` UND `foes/spawn.js`
- Camera-Update in: `game.js` UND `core/camera.js`

Lösung: Nur die `core/`-Versionen verwenden, lokale Kopien löschen.

---

### Rang 9: Context-Interface standardisieren (Impact: 🟢 NIEDRIG)
**Aufwand**: ~2 Stunden | **Risiko**: Niedrig | **Effekt**: Konsistenz, Dokumentation

Alle Context-Objekte auf ein einheitliches Pattern standardisieren:
```javascript
// Standard: Immer Funktionen, nie Getter-Properties
const ctx = {
    getState: () => state,
    getCanvas: () => canvas,
    // nie: get state() { return state; }
};
```

---

### Rang 10: Debug-Code in Production-Gate (Impact: 🟢 NIEDRIG)
**Aufwand**: ~1 Stunde | **Risiko**: Null | **Effekt**: Kürzere Ladezeiten, sauberer Prod-Build

Debug-Features (Grid-Editor, Drag-Mode, Floor-Debug-Lines, Sprite-Debug-Panel) sollten hinter `import.meta.env.DEV` gates stehen, damit sie im Production-Build per Tree-Shaking entfernt werden.

---

## Fazit

Das Projekt zeigt eine **ambitionierte und durchdachte Spielarchitektur** mit einem ausgereiften Factory-Pattern, professionellen Optimierungen (Object Pool, Spatial Grid) und sauberer Datentrennung. Die Refactoring-Arbeit der letzten Wochen (Boss-Module, City-Module) war erfolgreich und hat game.js bereits von ~8.800 auf ~2.200 Zeilen gebracht.

Die **drei wichtigsten nächsten Schritte** sind:
1. `game.js` weiter aufteilen (noch ~1.200 Zeilen zu extrahieren)
2. `index.html` entschlacken (800 Zeilen Grid-Daten + 700 Zeilen Scripts)
3. `window.*`-Globals durch ein sauberes Debug-Modul ersetzen

Die Codebase ist auf einem guten Weg — die Architektur-Entscheidungen sind solide, und das Refactoring folgt einem klaren Plan.
