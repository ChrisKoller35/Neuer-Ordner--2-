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

(function() {
  // Grid Editor State
  window.CITY_GRID_EDIT_MODE = false;
  let isMouseDown = false;
  let isRightMouseDown = false;
  let lastPaintedCell = null;
  
  // ===== SPIELER-VERSCHIEBE-MODUS =====
  window.CITY_PLAYER_DRAG_MODE = false;
  window.isDraggingPlayer = false;
  window.playerDragOffset = { x: 0, y: 0 };
  // Fester Referenzpunkt für Drag-Modus (wird beim Aktivieren gesetzt)
  window.DRAG_REFERENCE_POINT = null;
  
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
      
      // Hole Kamera-Position und Gebäude-Daten
      // Im Grid-Editor-Modus nutzen wir unsere eigene Kamera
      const cameraX = window.CITY_GRID_EDIT_MODE ? gridEditorCameraX : (window.CITY_CAMERA_X_DEBUG || 0);
      const cameraY = window.CITY_GRID_EDIT_MODE ? gridEditorCameraY : (window.CITY_CAMERA_Y_DEBUG || 0);
      const buildingX = window.CITY_BUILDING_X_DEBUG || 100;
      const buildingY = window.CITY_BUILDING_Y_DEBUG || -765;
      const cellSize = window.CITY_GRID_CELL_SIZE || 50;
      
      // Welt-Position berechnen
      const worldX = mouseX + cameraX;
      const worldY = mouseY + cameraY;
      
      // Grid-Zelle berechnen
      const col = Math.floor((worldX - buildingX) / cellSize);
      const row = Math.floor((worldY - buildingY) / cellSize);
      
      return { col, row, worldX, worldY };
    }
    
    // Zelle markieren (hinzufügen)
    function markCell(col, row) {
      const maxCols = window.CITY_GRID_COLS || 32;
      const maxRows = window.CITY_GRID_ROWS || 29;
      
      if (col < 0 || col >= maxCols || row < 0 || row >= maxRows) {
        return false;
      }
      
      const key = `${col},${row}`;
      if (!window.CITY_WALKABLE_GRID[key]) {
        window.CITY_WALKABLE_GRID[key] = true;
        console.log(`%c[Grid] ✓ ${key}`, 'color: lime;');
        return true;
      }
      return false;
    }
    
    // Zelle entfernen
    function removeCell(col, row) {
      const key = `${col},${row}`;
      if (window.CITY_WALKABLE_GRID[key]) {
        delete window.CITY_WALKABLE_GRID[key];
        console.log(`%c[Grid] ✗ ${key}`, 'color: orange;');
        return true;
      }
      return false;
    }
    
    // Mausklick - Start malen
    canvas.addEventListener('mousedown', (e) => {
      if (!window.CITY_GRID_EDIT_MODE) return;
      // Wenn Drag-Modus aktiv ist, Grid-Editor ignoriert Klicks komplett
      if (window.CITY_PLAYER_DRAG_MODE) return;
      
      const { col, row } = mouseToGridCell(e);
      lastPaintedCell = `${col},${row}`;
      
      if (e.button === 0) { // Linksklick = markieren
        isMouseDown = true;
        markCell(col, row);
        e.stopPropagation();
        e.preventDefault();
      } else if (e.button === 2) { // Rechtsklick = entfernen
        isRightMouseDown = true;
        removeCell(col, row);
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    
    // Maus bewegen - malen wenn gedrückt
    canvas.addEventListener('mousemove', (e) => {
      if (!window.CITY_GRID_EDIT_MODE) return;
      // Wenn Drag-Modus aktiv ist, Grid-Editor ignoriert Mausbewegungen
      if (window.CITY_PLAYER_DRAG_MODE) return;
      if (!isMouseDown && !isRightMouseDown) return;
      
      const { col, row } = mouseToGridCell(e);
      const cellKey = `${col},${row}`;
      
      // Nur wenn neue Zelle
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
    
    // Maus loslassen - Stop malen
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) isMouseDown = false;
      if (e.button === 2) isRightMouseDown = false;
      lastPaintedCell = null;
    });
    
    // Rechtsklick-Menü verhindern
    canvas.addEventListener('contextmenu', (e) => {
      if (window.CITY_GRID_EDIT_MODE) {
        e.preventDefault();
      }
    });
    
    // ===== SPIELER-VERSCHIEBE-MODUS =====
    // Mausklick im Drag-Modus - irgendwo klicken um Spieler zu bewegen
    canvas.addEventListener('mousedown', (e) => {
      if (!window.CITY_PLAYER_DRAG_MODE) return;
      if (e.button !== 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      // Hole Spieler-Position
      const player = window.CITY_PLAYER_DEBUG;
      if (!player) {
        console.log('%c[Drag] Spieler nicht gefunden! Bist du im City-Level?', 'color: red;');
        return;
      }
      
      // Im Drag-Modus: Sofort Spieler ziehen, egal wo geklickt wird
      window.isDraggingPlayer = true;
      window.playerDragOffset.x = 0;
      window.playerDragOffset.y = 0;
      
      // Spieler direkt zur Mausposition setzen
      const cameraX = window.CITY_CAMERA_X_DEBUG || 0;
      const cameraY = window.CITY_CAMERA_Y_DEBUG || 0;
      player.x = mouseX + cameraX;
      player.y = mouseY + cameraY;
      
      console.log('%c[Drag] Spieler wird gezogen... Position: ' + player.x.toFixed(0) + ', ' + player.y.toFixed(0), 'color: yellow; font-weight: bold;');
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Maus bewegen im Drag-Modus
    canvas.addEventListener('mousemove', (e) => {
      if (!window.CITY_PLAYER_DRAG_MODE || !window.isDraggingPlayer) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      
      const cameraX = window.CITY_CAMERA_X_DEBUG || 0;
      const cameraY = window.CITY_CAMERA_Y_DEBUG || 0;
      
      const worldX = mouseX + cameraX;
      const worldY = mouseY + cameraY;
      
      // Spieler-Position aktualisieren
      const player = window.CITY_PLAYER_DEBUG;
      if (player) {
        player.x = worldX - window.playerDragOffset.x;
        player.y = worldY - window.playerDragOffset.y;
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Maus loslassen im Drag-Modus
    document.addEventListener('mouseup', (e) => {
      if (window.isDraggingPlayer) {
        window.isDraggingPlayer = false;
        const player = window.CITY_PLAYER_DEBUG;
        if (player) {
          console.log('%c[Drag] Spieler abgesetzt bei x=' + player.x.toFixed(1) + ', y=' + player.y.toFixed(1), 'color: yellow; font-weight: bold;');
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
      window.CITY_PLAYER_DRAG_MODE = !window.CITY_PLAYER_DRAG_MODE;
      
      if (window.CITY_PLAYER_DRAG_MODE) {
        // Speichere den aktuellen "korrigierten" Punkt als festen Referenzpunkt
        const player = window.CITY_PLAYER_DEBUG;
        if (player) {
          const cellSize = window.CITY_GRID_CELL_SIZE || 50;
          window.DRAG_REFERENCE_POINT = {
            x: player.x,
            y: player.y - 71 - cellSize  // Eine Zelle nach oben (- cellSize)
          };
        }
        
        console.log('%c==========================================', 'color: yellow;');
        console.log('%c[DRAG MODE] AKTIVIERT', 'color: yellow; font-weight: bold; font-size: 16px;');
        console.log('%c==========================================', 'color: yellow;');
        console.log('%c\u{1F449} Irgendwo auf Canvas klicken und ziehen', 'color: yellow;');
        console.log('%c\u26AA Gelber Punkt = Fester Referenzpunkt (bleibt stehen)', 'color: yellow;');
        console.log('%cS = Position ausgeben (für Offset-Korrektur)', 'color: cyan;');
        console.log('%cL = Drag-Modus beenden', 'color: gray;');
        
        // Zeige Info-Overlay
        alert('DRAG MODE AKTIVIERT!\n\nDer GELBE PUNKT bleibt jetzt fest stehen.\nZiehe den Spieler zum gelben Punkt.\nDann drücke S um den Offset zu berechnen.\nDrücke L nochmal um den Modus zu beenden.');
      } else {
        window.DRAG_REFERENCE_POINT = null;
        console.log('%c[DRAG MODE] Deaktiviert', 'color: gray; font-weight: bold;');
      }
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // S im Drag-Modus = Position und Offset ausgeben
    if (key === 's' && !e.ctrlKey && window.CITY_PLAYER_DRAG_MODE) {
      const player = window.CITY_PLAYER_DEBUG;
      const ref = window.DRAG_REFERENCE_POINT;
      if (player && ref) {
        // Berechne den Offset zwischen Spieler und Referenzpunkt
        const playerCorrectedY = player.y - 71; // aktuelle korrigierte Position
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
        console.log('%c' + offsetInfo, 'color: cyan; font-size: 14px;');
        
        // Kopierbare Ausgabe - öffne Prompt-Dialog
        const copyText = `OFFSET: dx=${offsetX.toFixed(1)}, dy=${offsetY.toFixed(1)}`;
        const result = prompt('Offset berechnet! Kopiere den Text unten:\n\n(Strg+C zum Kopieren)', copyText);
        
        // Versuche auch in Zwischenablage zu kopieren
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
      window.CITY_GRID_EDIT_MODE = !window.CITY_GRID_EDIT_MODE;
      
      if (window.CITY_GRID_EDIT_MODE) {
        // Initialisiere Editor-Kamera mit aktueller Spielkamera
        gridEditorCameraX = window.CITY_CAMERA_X_DEBUG || 0;
        gridEditorCameraY = window.CITY_CAMERA_Y_DEBUG || 0;
        
        console.log('%c[Grid Editor] AKTIVIERT', 'color: lime; font-weight: bold; font-size: 16px;');
        console.log('%c\u{1F449} Linksklick/halten = Zellen markieren', 'color: lime;');
        console.log('%c\u{1F449} Rechtsklick/halten = Zellen entfernen', 'color: orange;');
        console.log('%c\u2190\u2191\u2192\u2193 Pfeiltasten = Kamera bewegen', 'color: cyan;');
        console.log('%cS = Speichern | R = Reset', 'color: yellow;');
        console.log('%cZellen: ' + Object.keys(window.CITY_WALKABLE_GRID).length, 'color: white;');
      } else {
        console.log('%c[Grid Editor] Deaktiviert', 'color: gray; font-weight: bold;');
      }
      e.preventDefault();
      return;
    }
    
    // Nur wenn Grid Editor aktiv
    if (!window.CITY_GRID_EDIT_MODE) return;
    
    // Pfeiltasten = Kamera steuern
    if (e.key === 'ArrowUp') {
      gridEditorCameraY -= CAMERA_SPEED;
      window.CITY_CAMERA_Y_DEBUG = gridEditorCameraY;
      console.log('%c[Kamera] Y=' + gridEditorCameraY, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      gridEditorCameraY += CAMERA_SPEED;
      window.CITY_CAMERA_Y_DEBUG = gridEditorCameraY;
      console.log('%c[Kamera] Y=' + gridEditorCameraY, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft') {
      gridEditorCameraX -= CAMERA_SPEED;
      window.CITY_CAMERA_X_DEBUG = gridEditorCameraX;
      console.log('%c[Kamera] X=' + gridEditorCameraX, 'color: cyan;');
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowRight') {
      gridEditorCameraX += CAMERA_SPEED;
      window.CITY_CAMERA_X_DEBUG = gridEditorCameraX;
      console.log('%c[Kamera] X=' + gridEditorCameraX, 'color: cyan;');
      e.preventDefault();
      return;
    }
    
    // R = Reset Grid
    if (key === 'r' && !e.ctrlKey) {
      if (confirm('Grid wirklich komplett löschen?')) {
        window.CITY_WALKABLE_GRID = {};
        console.log('%c[Grid] Alle Zellen gelöscht!', 'color: orange; font-weight: bold;');
      }
      e.preventDefault();
      return;
    }
    
    // S = Speichern
    if (key === 's' && !e.ctrlKey) {
      const grid = window.CITY_WALKABLE_GRID;
      const keys = Object.keys(grid).sort((a, b) => {
        const [ax, ay] = a.split(',').map(Number);
        const [bx, by] = b.split(',').map(Number);
        return ay - by || ax - bx;
      });
      
      let result = `// Begehbare Grid-Zellen (${keys.length} Zellen)\n`;
      result += 'window.CITY_WALKABLE_GRID = {\n';
      for (const k of keys) {
        result += `  "${k}": true,\n`;
      }
      result += '};\n';
      
      console.log('%c[Grid] GESPEICHERT:', 'color: lime; font-weight: bold; font-size: 16px;');
      console.log(result);
      
      navigator.clipboard.writeText(result).then(() => {
        alert(`Grid gespeichert! ${keys.length} begehbare Zellen.\n\nCode in Zwischenablage kopiert.\n\nFüge den Code in walkableGrids.json ein um ihn zu speichern.`);
      }).catch(() => {
        alert(`Grid: ${keys.length} begehbare Zellen.\n\nSiehe Konsole für Code.`);
      });
      e.preventDefault();
      return;
    }
  }, true); // true = capture phase, wird VOR dem Spiel ausgeführt
  
  // Starte Initialisierung
  initGridEditor();
  
  console.log('%c[Grid Editor] Drücke M um den Grid-Editor zu öffnen!', 'color: lime; font-weight: bold; font-size: 14px;');
  console.log('%c[Drag Mode] Drücke L um den Spieler zu verschieben!', 'color: yellow; font-weight: bold; font-size: 14px;');
})();
