// ============================================================
// CHARACTER SELECT - Charakterauswahl-UI
// ============================================================
// Verwaltet den Startbildschirm und die Charakterauswahl.
// Setzt sharedState.selectedCharacter basierend auf Benutzerauswahl.
// ============================================================
"use strict";

import S from '../core/sharedState.js';

// Charakter-Pfade
S.characterSprites = {
  'player': './src/player/Player.png',
  'pinkqualle': './src/player/Playerpinkqualle.png',
  'kleinerdrache': './src/player/playerkleinerdrache.png',
  'engelfisch': './src/player/Playerengelfisch.png'
};

// Warte auf DOM
document.addEventListener('DOMContentLoaded', function() {
  const startScreen = document.getElementById('startScreen');
  const characterSelectScreen = document.getElementById('characterSelectScreen');
  const startButton = document.getElementById('btnStartGame');
  const confirmButton = document.getElementById('btnConfirmCharacter');
  const cards = document.querySelectorAll('.character-card');
  
  // Start-Button: Zeigt Charakterauswahl
  if (startButton) {
    startButton.addEventListener('click', function(e) {
      e.stopPropagation();
      if (startScreen) startScreen.style.display = 'none';
      if (characterSelectScreen) characterSelectScreen.style.display = 'flex';
    });
  }
  
  // Charakter-Karten klickbar machen
  cards.forEach(card => {
    card.addEventListener('click', function(e) {
      e.stopPropagation();
      cards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      S.selectedCharacter = this.dataset.character;
      console.log('[Cashfisch] Charakter gewählt:', S.selectedCharacter);
    });
  });
  
  // Confirm-Button: Startet das Spiel
  if (confirmButton) {
    confirmButton.addEventListener('click', function(e) {
      e.stopPropagation();
      S.characterConfirmed = true;
      console.log('[Cashfisch] Spiel startet mit Charakter:', S.selectedCharacter);
      
      if (typeof S.resetPlayerSpriteCache === 'function') {
        S.resetPlayerSpriteCache();
      }
      
      if (characterSelectScreen) characterSelectScreen.style.display = 'none';
      if (typeof S.startCutscene === 'function') {
        S.startCutscene();
      }
    });
  }
});
