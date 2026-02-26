// ============================================================
// CHARACTER SELECT - Charakterauswahl-UI
// ============================================================
// Verwaltet den Startbildschirm und die Charakterauswahl.
// Setzt sharedState.selectedCharacter basierend auf Benutzerauswahl.
// ============================================================
"use strict";

import S from '../core/sharedState.js';

const CHARACTER_SPRITE_URLS = {
  player: new URL('../player/Player.png', import.meta.url).href,
  pinkqualle: new URL('../player/Playerpinkqualle.png', import.meta.url).href,
  kleinerdrache: new URL('../player/playerkleinerdrache.png', import.meta.url).href,
  engelfisch: new URL('../player/Playerengelfisch.png', import.meta.url).href
};

// Charakter-Pfade
S.characterSprites = {
  'player': CHARACTER_SPRITE_URLS.player,
  'pinkqualle': CHARACTER_SPRITE_URLS.pinkqualle,
  'kleinerdrache': CHARACTER_SPRITE_URLS.kleinerdrache,
  'engelfisch': CHARACTER_SPRITE_URLS.engelfisch
};

// Warte auf DOM
document.addEventListener('DOMContentLoaded', function() {
  const startScreen = document.getElementById('startScreen');
  const characterSelectScreen = document.getElementById('characterSelectScreen');
  const startButton = document.getElementById('btnStartGame');
  const confirmButton = document.getElementById('btnConfirmCharacter');
  const cards = document.querySelectorAll('.character-card');

  // Charakter-Bilder über Vite-aufgelöste URLs setzen
  cards.forEach(card => {
    const charKey = card.dataset.character;
    const img = card.querySelector('.character-img');
    if (img && CHARACTER_SPRITE_URLS[charKey]) {
      img.src = CHARACTER_SPRITE_URLS[charKey];
    }
  });
  
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
