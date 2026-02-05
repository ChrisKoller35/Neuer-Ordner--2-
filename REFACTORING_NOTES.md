# Cashfisch Refactoring - Fortschrittsnotizen

## Aktueller Stand (04.02.2026)

### Ziel
game.js von ~8,800 Zeilen auf ~1,000 Zeilen reduzieren durch Modularisierung.

### Aktueller Fortschritt
- **game.js: ~4,814 Zeilen** (von ~8,800 ursprünglich)
- **~4,000 Zeilen eingespart** (45% des Codes modularisiert!)

---

## ✅ Abgeschlossene Module

### Boss-Module (`src/boss/`)
| Modul | Datei | Status |
|-------|-------|--------|
| Boss Render | `render.js` | ✅ Integriert |
| Boss Spawn | `spawn.js` | ✅ Integriert |
| Boss Update | `update.js` | ✅ Integriert |
| Boss Collision | `collision.js` | ✅ Integriert |
| Boss UI | `ui.js` | ✅ Integriert |

### Foes-Module (`src/foes/`)
| Modul | Datei | Status |
|-------|-------|--------|
| Foes Update | `update.js` | ✅ Integriert |
| Foes Arrows | `arrows.js` | ✅ Integriert |
| Foes Render | `render.js` | ✅ Integriert |
| Foes Spawn | `spawn.js` | ⚠️ Erstellt, aber lokale Funktionen werden noch verwendet |

---

## 🔜 Nächste Schritte (TODO)

### Option 1: Collision-Handler modularisieren (~200+ Zeilen)
- `handleShotFoeHits()`
- `handleShotFoeArrowHits()`
- `handlePlayerFoeCollisions()`
- `handlePlayerFoeArrowCollisions()`
- `handlePlayerHealPickups()`
- `handlePlayerCoinDrops()`
- `handlePlayerSymbolDrops()`

### Option 2: Render-Funktionen modularisieren (~150+ Zeilen)
- `renderShots()`
- `renderFoeArrows()`
- `renderHeals()`
- `renderCoinDrops()`
- `renderSymbolDrops()`
- `renderPlayer()`

### Option 3: Spawn-Funktionen vollständig migrieren (~100 Zeilen)
- Lokale `spawnFoe()`, `spawnLevelFoe()`, `scheduleNextFoeSpawn()` durch Modul ersetzen
- Erfordert Anpassung der Modul-API an game.js State-Struktur

---

## Wichtige technische Hinweise

### Context-Pattern
Alle Module verwenden **Context-basierte Dependency Injection**:
```javascript
const moduleCtx = {
    get canvas() { return canvas; },
    get state() { return state; },
    someFunction: () => localFunction()
};
const module = createModuleSystem(moduleCtx);
```

### Bekannte Fallstricke
1. **Getter vs. Function**: Manche Module erwarten `get canvas()` (Getter), andere `getCanvas()` (Funktion)
2. **Lokale vs. Modul-Funktionen**: Bei `spawnLevelFoe` mussten die lokalen Funktionen verwendet werden, weil sie die korrekte `state.levelConfig.spawnTable` Logik haben
3. **Modul-Initialisierung**: Module werden am Ende von game.js initialisiert, aber Funktionen die sie aufrufen sind früher definiert - das funktioniert durch JavaScript Hoisting

### Debug-Shortcuts
- **Alt+Shift+1/2/3/4**: Zum Anfang von Level 1/2/3/4 springen
- **Alt+Shift+5**: Stadt betreten

---

## Dateistruktur

```
src/
├── game.js          # Hauptdatei (~4,814 Zeilen)
├── boss/
│   ├── render.js    # Boss-Rendering
│   ├── spawn.js     # Boss-Spawning & Aktivierung
│   ├── update.js    # Boss-KI & Angriffe
│   ├── collision.js # Boss-Kollisionen
│   └── ui.js        # Boss HP-Bar
├── foes/
│   ├── update.js    # Gegner-KI (Jelly, Bogenschreck, Oktopus, Ritterfisch)
│   ├── arrows.js    # Gegner-Projektile
│   ├── render.js    # Gegner-Rendering
│   └── spawn.js     # Gegner-Spawning (teilweise)
├── city/            # Stadt-System
└── core/
    └── constants.js # TAU und andere Konstanten
```
