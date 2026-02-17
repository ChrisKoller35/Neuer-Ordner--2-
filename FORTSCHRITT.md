# Cashfisch – Refactoring-Fortschritt

> **Sage Copilot:** "Schau in FORTSCHRITT.md und mach dort weiter"

## Stand: 17. Februar 2026

### ✅ Erledigt

1. **index.html aufgeräumt** (1567 → 148 Zeilen)
   - Inline-JS extrahiert nach `src/ui/characterSelect.js`, `src/tools/gridEditor.js`, `src/cutscene.js`

2. **Walkable Grid in JSON** 
   - 560 Grid-Einträge aus index.html nach `src/data/walkableGrids.json` verschoben

3. **Ordner umbenannt** (Konvention: lowercase/kebab-case)
   - `Npc` → `npc`, `BuildingBackgrounds` → `building-backgrounds`, `Bodenstadt` → `bodenstadt`, `Animation` → `animation`
   - 32+ Referenzen aktualisiert

4. **bootGame() aufgeteilt** – 3 Module extrahiert, game.js von ~2350 auf ~1922 Zeilen:
   - `src/game/inputHelpers.js` – 6 Input-Hilfsfunktionen
   - `src/game/hudUpdate.js` – HUD-Update-System (createHUDSystem)
   - `src/game/spawning.js` – 12 Spawning-Funktionen (createSpawningSystem)

5. **Commit** – Punkt 4 committet ✔

6. **Game Actions extrahiert** – game.js von 1922 → 1449 Zeilen:
   - `src/game/gameActions.js` – NEU, 526 Zeilen, 19 Funktionen via `createGameActions(ctx)`:
     `showPickupMessage`, `hidePickupMessage`, `unlockShieldIfNeeded`, `concludeBossVictory`,
     `finishPendingSymbolAdvance`, `collectSymbolDrop`, `collectCoinDrop`, `maybeSpawnLevelThreeCoverRock`,
     `applyLevelConfig`, `advanceLevel`, `debugJumpToLevel`, `enterCity`, `startMission`,
     `resetGame`, `showGameOver`, `winGame`, `activateBoss`, `damagePlayer`, `awardFoeDefeat`
   - Late-binding Pattern für zirkuläre Abhängigkeiten (cityUI, levels, progressionSystem)
   - Unbenutzte Imports aus game.js entfernt (FOE_BASE_SCORE, buildCityStateModule, clearBossArrays)

### 🔲 Nächste Schritte

7. **Bilder umgezogen** ✔ – 34 PNGs aus `src/` Root in Unterordner:
   - 6 Player-Sprites → `src/player/`
   - 9 Gegner/Boss-Sprites → `src/foes/`
   - 8 Game-Assets (Böden, Hintergrund, Items) → `src/game/`
   - 4 City-Assets → `src/city/`
   - 3 UI/Menu-Assets → `src/ui/`
   - 4 Symbol-Sprites → `src/symbols/`
   - `Bodenplatte.png` entfernt (unused)
   - LEVEL_ASSETS Bug behoben (Bodengold/Bodenlava waren vertauscht)
   - 46 Dateien aktualisiert

8. **window.* Globals entfernt** ✔ – sharedState.js Modul ersetzt ~30 window.* Globals:
   - `src/core/sharedState.js` – NEU, zentrales State-Objekt für Cross-Modul-Kommunikation
   - `characterSelect.js`, `cutscene.js`, `gridEditor.js` zu ES Modules konvertiert
   - `index.html`: Script-Tags auf `type="module"`, ANIM_TEST inline entfernt
   - `game.js`: Alle window.* Zuweisungen durch `S.*` ersetzt
   - `city/render.js`, `city/update.js`: ~30 window.* durch `S.*` ersetzt
   - `buildingScene.js`: Dynamische `window[key]` durch `S.buildingWalkableGrids` ersetzt
   - `talentUI.js`: Duale Zuweisung (window.* für HTML onclick + S.*)
   - Debug-Konsolen-Zugang bleibt über `window.*` (Object.assign)

### 🔲 Nächste Schritte
- `backup/vor-struktur-refactoring-2026-02-16` – Vor allen Änderungen
- `backup/nach-struktur-refactoring-2026-02-16` – Nach Punkt 1-3

### Wichtige Dateien
- `src/game.js` – Hauptmodul (~1449 Zeilen, bootGame() noch ~1050 Zeilen)
- `src/core/sharedState.js` – NEU (zentraler Cross-Modul State)
- `src/game/inputHelpers.js` – NEU
- `src/game/hudUpdate.js` – NEU  
- `src/game/spawning.js` – NEU
- `src/game/gameActions.js` – NEU (19 Game-Action-Funktionen)
