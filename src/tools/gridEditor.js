// ============================================================
// GRID EDITOR - Debug-Tool für begehbare Bereiche
// ============================================================
// Tastenkürzel:
//   M = Grid-Editor an/aus
//   L = Spieler-Verschiebe-Modus an/aus
//   S = Grid speichern (im Grid-Modus) / Offset berechnen (im Drag-Modus)
//   R = Grid zurücksetzen
//   Pfeiltasten = Kamera bewegen (im Grid-Modus)
// ============================================================
"use strict";

import S from '../core/sharedState.js';

{
  // Grid Editor State
  let isMouseDown = false;
  let isRightMouseDown = false;
  let lastPaintedCell = null;
  
  // Kamera-Steuerung für Grid-Editor
  let gridEditorCameraX = 0;
  let gridEditorCameraY = 0;
  const CAMERA_SPEED = 30;
  
  // Warte bis Canvas existiert
  function initGridEditor() {
    const canvas = document.getElementById('game');
    if (!canvas) {
      setTimeout(initGridEditor, 100);
      return;
    }
    
    // Hilfsfunktion: Mausposition zu Grid-Zelle
    function mouseToGridCell(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const cameraX = S.CITY_GRID_EDIT_MODE ? gridEditorCameraX : (S.CITY_CAMERA_X_DEBUG || 0);
      const cameraY = S.CITY_GRID_EDIT_MODE ? gridEditorCameraY : (S.CITY_CAMERA_Y_DEBUG || 0);
      const buildingX = S.CITY_BUILDING_X_DEBUG || 100;
      const buildingY = S.CITY_BUILDING_Y_DEBUG || -765;
      const cellSize = S.CITY_GRID_CELL_SIZE || 50;
      
      const worldX = mouseX + cameraX;
      const worldY = mouseY + cameraY;
      
      const col = Math.floor((worldX - buildingX) / cellSize);
      const row = Math.floor((worldY - buildingY) / cellSize);
      
      return { col, row, worldX, worldY };
    }
    
    function markCell(col, row) {
      const maxCols = S.CITY_GRID_COLS || 32;
      const maxRows = S.CITY_GRID_ROWS || 29;
      
      if (col < 0 || col >= maxCols || row < 0 || row >= maxRows) {
        return false;
      }
      
      const key = `${col},${row}`;
      if (!S.CITY_WALKABLE_GRID[key]) {
        S.CITY_WALKABLE_GRID[key] = true;
        console.log(`%c[Grid] ✓ ${key}`, 'color: lime;');
        return true;
      }
      return false;
    }
    
    function removeCell(col, row) {
      const key = `${col},${row}`;
      if (S.CITY_WALKABLE_GRID[key]) {
        delete S.CITY_WALKABLE_GRID[key];
        console.log(`%c[Grid] ✗ ${key}`, 'color: orange;');
        return true;
      }
      return false;
    }
    
    canvas.addEventListener('mousedown', (e) => {
      if (!S.CITY_GRID_EDIT_MODE) return;
      if (S.CITY_PLAYER_DRAG_MODE) return;
      
      const { col, row } = mouseToGridCell(e);
      lastPaintedCell = `${col},${row}`;
      
      if (e.button === 0) {
        isMouseDown = true;
        markCell(col, row);
        e.stopPropagation();
        e.preventDefault();
      } else if (e.button === 2) {
        isRightMouseDown = true;
        removeCell(col, row);
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    
    canvas.addEventListener('mousemove', (e) => {
      if (!S.CITY_GRID_EDIT_MODE) return;
      if (S.CITY_PLAYER_DRAG_MODE) return;
      if (!isMouseDown && !isRightMouseDown) return;
      
      const { col, row } = mouseToGridCell(e);
      const cellKey = `${col},${row}`;
      
      if (cellKey !== lastPaintedCell) {
        lastPaintedCell = cellKey;
        
        if (isMouseDown) {
          markCell(col, row);
        } else if (isRightMouseDown) {
          removeCell(col, row);
        }
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) isMouseDown = false;
      if (e.button === 2) isRightMouseDown = false;
      lastPaintedCell = null;
    });
    
    canvas.addEventListener('contextmenu', (e) => {
      if (S.CITY_GRID_EDIT_MODE) {
        e.preventDefault();
      }
    });
    
    // ===== SPIELER-VERSCHIEBE-MODUS =====
    canvas.addEventListener('mousedown', (e) => {
      if (!S.CITY_PLAYER_DRAG_MODE) return;
      if (e.button !== 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const player = S.CITY_PLAYER_DEBUG;
      if (!player) {
        console.log('%c[Drag] Spieler nicht gefunden! Bist du im City-Level?', 'color: red;');
        return;
      }
      
      S.isDraggingPlayer = true;
      S.playerDragOffset.x = 0;
      S.playerDragOffset.y = 0;
      
      const cameraX = S.CITY_CAMERA_X_DEBUG || 0;
      const cameraY = S.CITY_CAMERA_Y_DEBUG || 0;
      player.x = mouseX + cameraX;
      player.y = mouseY + cameraY;
      
      console.log(`%c[Drag] Spieler wird gezogen... Position: ${  player.x.toFixed(0)  }, ${  player.y.toFixed(0)}`, 'color: yellow; font-weight: bold;');
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    canvas.addEventListener('mousemove', (e) => {
      if (!S.CITY_PLAYER_DRAG_MODE || !S.isDraggingPlayer) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const cameraX = S.CITY_CAMERA_X_DEBUG || 0;
      const cameraY = S.CITY_CAMERA_Y_DEBUG || 0;
      
      const worldX = mouseX + cameraX;
      const worldY = mouseY + cameraY;
      
      const player = S.CITY_PLAYER_DEBUG;
      if (player) {
        player.x = worldX - S.playerDragOffset.x;
        player.y = worldY - S.playerDragOffset.y;
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    document.addEventListener('mouseup', (e) => {
      if (S.isDraggingPlayer) {
        S.isDraggingPlayer = false;
        const player = S.CITY_PLAYER_DEBUG;
        if (player) {
          console.log(`%c[Drag] Spieler abgesetzt bei x=${  player.x.toFixed(1)  }, y=${  player.y.toFixed(1)}`, 'color: yellow; font-weight: bold;');
        }
      }
    });
    
    console.log('%c[Grid Editor] Canvas gefunden - Klick-Handler aktiv!', 'color: lime;');
  }
  
  // Tastatur - mit capture phase um VOR dem Spiel abzufangen
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // L = Toggle Spieler-Verschiebe-Modus
    if (key === 'l' && !e.ctrlKey && !e.altKey) {
      S.CITY_PLAYER_DRAG_MODE = !S.CITY_PLAYER_DRAG_MODE;
      
      if (S.CITY_PLAYER_DRAG_MODE) {
        const player = S.CITY_PLAYER_DEBUG;
        if (player) {
          const cellSize = S.CITY_GRID_CELL_SIZE || 50;
          S.DRAG_REFERENCE_POINT = {
            x: player.x,
            y: player.y - 71 - cellSize
          };
        }
        
        console.log('%c==========================================', 'color: yellow;');
        console.log('%c[DRAG MODE] AKTIVIERT', 'color: yellow; font-weight: bold; font-size: 16px;');
        console.log('%c==========================================', 'color: yellow;');
        console.log('%c\u{1F449} Irgendwo auf Canvas klicken und ziehen', 'color: yellow;');
        console.log('%c\u26AA Gelber Punkt = Fester Referenzpunkt (bleibt stehen)', 'color: yellow;');
        console.log('%cS = Position ausgeben (für Offset-Korrektur)', 'color: cyan;');
        console.log('%cL = Drag-Modus beenden', 'color: gray;');
        
        alert('DRAG MODE AKTIVIERT!\n\nDer GELBE PUNKT bleibt jetzt fest stehen.\nZiehe den Spieler zum gelben Punkt.\nDann drücke S um den Offset zu berechnen.\nDrücke L nochmal um den Modus zu beenden.');
      } else {
        S.DRAG_REFERENCE_POINT = null;
        console.log('%c[DRAG MODE] Deaktiviert', 'color: gray; font-weight: bold;');
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // S im Drag-Modus = Position und Offset ausgeben
    if (key === 's' && !e.ctrlKey && S.CITY_PLAYER_DRAG_MODE) {
      const player = S.CITY_PLAYER_DEBUG;
      const ref = S.DRAG_REFERENCE_POINT;
      if (player && ref) {
        const playerCorrectedY = player.y - 71;
        const offsetX = player.x - ref.x;
        const offsetY = playerCorrectedY - ref.y;
        
        const offsetInfo = `
========== OFFSET-BERECHNUNG ==========
Gelber Punkt (Referenz): x=${ref.x.toFixed(1)}, y=${ref.y.toFixed(1)}
Roter Punkt (Spieler):   x=${player.x.toFixed(1)}, y=${playerCorrectedY.toFixed(1)}

OFFSET: dx=${offsetX.toFixed(1)}, dy=${offsetY.toFixed(1)}

Wenn der Offset 0,0 ist, sind beide Punkte übereinander.
Falls nicht: Ziehe den Spieler näher zum gelben Punkt!
=======================================`;
        console.log(`%c${  offsetInfo}`, 'color: cyan; font-size: 14px;');
        
        const copyText = `OFFSET: dx=${offsetX.toFixed(1)}, dy=${offsetY.toFixed(1)}`;
        prompt('Offset berechnet! Kopiere den Text unten:\n\n(Strg+C zum Kopieren)', copyText);
        
        if (navigator.clipboard) {
          navigator.clipboard.writeText(copyText).then(() => {
            console.log('%c[Kopiert] Text wurde in die Zwischenablage kopiert!', 'color: lime;');
          }).catch(() => {
            console.log('%c[Hinweis] Kopieren fehlgeschlagen - nutze den Prompt-Dialog', 'color: orange;');
          });
        }
      }
      e.preventDefault();
      return;
    }
    
    // M = Toggle Grid Editor
    if (key === 'm' && !e.ctrlKey && !e.altKey) {
      S.CITY_GRID_EDIT_MODE = !S.CITY_GRID_EDIT_MODE;
      
      if (S.CITY_GRID_EDIT_MODE) {
        gridEditorCameraX = S.CITY_CAMERA_X_DEBUG || 0;
        gridEditorCameraY = S.CITY_CAMERA_Y_DEBUG || 0;
        
        console.log('%c[Grid Editor] AKTIVIERT', 'color: lime; font-weight: bold; font-size: 16px;');
        console.log('%c\u{1F449} Linksklick/halten = Zellen markieren', 'color: lime;');
        console.log('%c\u{1F449} Rechtsklick/halten = Zellen entfernen', 'color: orange;');
        console.log('%c\u2190\u2191\u2192\u2193 Pfeiltasten = Kamera bewegen', 'color: cyan;');
        console.log('%cS = Speichern | R = Reset', 'color: yellow;');
        console.log(`%cZellen: ${  Object.keys(S.CITY_WALKABLE_GRID).length}`, 'color: white;');
      } else {
        console.log('%c[Grid Editor] Deaktiviert', 'color: gray; font-weight: bold;');
      }
      e.preventDefault();
      return;
    }
    
    // Nur wenn Grid Editor aktiv
    if (!S.CITY_GRID_EDIT_MODE) return;
    
    if (e.key === 'ArrowUp') {
      gridEditorCameraY -= CAMERA_SPEED;
      S.CITY_CAMERA_Y_DEBUG = gridEditorCameraY;
      console.log(`%c[Kamera] Y=${  gridEditorCameraY}`, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      gridEditorCameraY += CAMERA_SPEED;
      S.CITY_CAMERA_Y_DEBUG = gridEditorCameraY;
      console.log(`%c[Kamera] Y=${  gridEditorCameraY}`, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft') {
      gridEditorCameraX -= CAMERA_SPEED;
      S.CITY_CAMERA_X_DEBUG = gridEditorCameraX;
      console.log(`%c[Kamera] X=${  gridEditorCameraX}`, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight') {
      gridEditorCameraX += CAMERA_SPEED;
      S.CITY_CAMERA_X_DEBUG = gridEditorCameraX;
      console.log(`%c[Kamera] X=${  gridEditorCameraX}`, 'color: cyan;');
      e.preventDefault();
      return;
    }
    
    // R = Reset Grid
    if (key === 'r' && !e.ctrlKey) {
      if (confirm('Grid wirklich komplett löschen?')) {
        S.CITY_WALKABLE_GRID = {};
        console.log('%c[Grid] Alle Zellen gelöscht!', 'color: orange; font-weight: bold;');
      }
      e.preventDefault();
      return;
    }
    
    // S = Speichern
    if (key === 's' && !e.ctrlKey) {
      const grid = S.CITY_WALKABLE_GRID;
      const keys = Object.keys(grid).sort((a, b) => {
        const [ax, ay] = a.split(',').map(Number);
        const [bx, by] = b.split(',').map(Number);
        return ay - by || ax - bx;
      });
      
      let result = `// Begehbare Grid-Zellen (${keys.length} Zellen)\n`;
      result += '// Grid-Daten für walkableGrids.json\n{\n';
      for (const k of keys) {
        result += `  "${k}": true,\n`;
      }
      result += '}\n';
      
      console.log('%c[Grid] GESPEICHERT:', 'color: lime; font-weight: bold; font-size: 16px;');
      console.log(result);
      
      navigator.clipboard.writeText(result).then(() => {
        alert(`Grid gespeichert! ${keys.length} begehbare Zellen.\n\nCode in Zwischenablage kopiert.\n\nFüge den Code in walkableGrids.json ein um ihn zu speichern.`);
      }).catch(() => {
        alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
      });
      e.preventDefault();
      
    }
  }, true);
  
  // Starte Initialisierung
  initGridEditor();
  
  console.log('%c[Grid Editor] Drücke M um den Grid-Editor zu öffnen!', 'color: lime; font-weight: bold; font-size: 14px;');
  console.log('%c[Drag Mode] Drücke L um den Spieler zu verschieben!', 'color: yellow; font-weight: bold; font-size: 14px;');
}
