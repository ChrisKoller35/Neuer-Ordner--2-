// ============================================================
// CUTSCENE - Intro-Cutscene mit Dialog und Animationen
// ============================================================
// Zeigt die Einführungsgeschichte mit Erzähler und Spieler.
// Exportiert S.startCutscene für den Spielstart.
// ============================================================
"use strict";

import S from './core/sharedState.js';

const CUTSCENE_PLAYER_FALLBACK_URL = new URL('./player/Player.png', import.meta.url).href;
const CUTSCENE_NARRATOR_URL = new URL('./city/narrator.png', import.meta.url).href;
const CUTSCENE_BACKGROUND_LEVEL_ONE_URL = new URL('./game/Backgroundlvlone.png', import.meta.url).href;
const CUTSCENE_SYMBOLS_URL = new URL('./symbols/Allesymbole.png', import.meta.url).href;

{
  let cutsceneEnabled = false;
  const cvs = document.getElementById('cutCanvas');
  const ctx = cvs.getContext('2d');
  const nextBtn = document.getElementById('cutNext');
  const hint = document.getElementById('cutHint');
  const cutWrap = document.getElementById('cutWrap');
  const startOverlay = document.getElementById('startScreen');
  const characterSelectScreen = document.getElementById('characterSelectScreen');

  function enableCutscene(){
    if (cutsceneEnabled) return;
    cutsceneEnabled = true;
    // Aktualisiere den Spieler-Sprite basierend auf der Auswahl
    if (S.characterSprites && S.selectedCharacter) {
      playerSprite.src = S.characterSprites[S.selectedCharacter] || CUTSCENE_PLAYER_FALLBACK_URL;
    }
    if (cutWrap && cutWrap.style.display === 'none') cutWrap.style.display = 'block';
    if (startOverlay) startOverlay.style.display = 'none';
    if (characterSelectScreen) characterSelectScreen.style.display = 'none';
  }
  
  // Exportiere als globale Funktion für Charakterauswahl
  S.startCutscene = enableCutscene;

  const bubbles = [];
  for (let i=0;i<26;i++) bubbles.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height,r:2+Math.random()*5,spd:.3+Math.random()*1.0});

  const playerSprite = new Image();
  // Wird später von enableCutscene gesetzt
  playerSprite.src = CUTSCENE_PLAYER_FALLBACK_URL;
  const narratorSprite = new Image();
  narratorSprite.src = CUTSCENE_NARRATOR_URL;
  const backgroundLevelOneSprite = new Image();
  backgroundLevelOneSprite.src = CUTSCENE_BACKGROUND_LEVEL_ONE_URL;

  function spriteReady(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  const narrator = {
    x: 290,
    y: 230,
    dir: 1,
    t: 0,
    color:'#9ed0ff',
    scale: 1.15,
    decor:true,
    sprite: narratorSprite,
    spriteScale: 0.18,
    spriteOffsetX: 12,
    spriteOffsetY: -18,
    mouthOffset: { x: -52, y: 24 },
    glowRadius: 78
  };
  const player = {
    x: 790,
    y: 245,
    dir:-1,
    t: 0,
    color:'#77ffcc',
    scale:1.15,
    decor:false,
    sprite: playerSprite,
    spriteScale: 0.18,
    spriteOffsetX: -6,
    spriteOffsetY: -18,
    mouthOffset: { x: 44, y: 24 }
  };
  const talkBubbles = [];
  let narrEmit=0, playEmit=0;

  function fishMouth(f){
    if (f.mouthOffset) {
      const dir = f.dir >= 0 ? 1 : -1;
      return {
        mx: f.x + dir * (f.mouthOffset.x || 0),
        my: f.y + (f.mouthOffset.y || 0)
      };
    }
    const s=f.scale||1;
    return {mx: f.x + f.dir*26*s, my: f.y - 4*s + 30};
  }
  
  function drawGlow(x,y,r,clr){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(x,y,10,x,y,r);
    g.addColorStop(0,clr);
    g.addColorStop(1,'rgba(166,255,224,0)');
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  
  function drawFish(f, highlight, tint){
    if(highlight==null) highlight=false;
    tint=tint||'rgba(166,255,224,0.6)';
    const bob = Math.sin(f.t*0.002)*2;
    const s = f.scale || 1;
    const dir = f.dir >= 0 ? 1 : -1;
    const anchorY = f.baseOffsetY == null ? 30 : f.baseOffsetY;
    const sprite = f.sprite;
    const hasSprite = spriteReady(sprite);
    if(highlight) drawGlow(f.x, f.y + anchorY, (f.glowRadius || 82) * s, tint);
    ctx.save();
    ctx.translate(f.x, f.y + anchorY + bob);
    if (hasSprite) {
      const scale = f.spriteScale == null ? 0.18 : f.spriteScale;
      const drawW = sprite.naturalWidth * scale;
      const drawH = sprite.naturalHeight * scale;
      const offsetX = f.spriteOffsetX || 0;
      const offsetY = f.spriteOffsetY || 0;
      ctx.scale(dir, 1);
      if (highlight) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.ellipse(offsetX, offsetY + 12, drawW * 0.52, drawH * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.drawImage(sprite, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
      ctx.restore();
      return;
    }

    ctx.scale(f.dir * s, s);
    if(highlight){ ctx.shadowColor=tint; ctx.shadowBlur=18; }
    ctx.beginPath(); ctx.moveTo(0,-12); ctx.quadraticCurveTo(22,-18,40,0); ctx.quadraticCurveTo(22,18,0,12); ctx.quadraticCurveTo(8,0,0,-12); ctx.closePath(); ctx.fillStyle=f.color; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-22,-12); ctx.lineTo(-20,0); ctx.lineTo(-22,12); ctx.closePath(); ctx.globalAlpha=.9; ctx.fillStyle=f.color; ctx.fill(); ctx.globalAlpha=1;
    ctx.beginPath(); ctx.moveTo(10,2); ctx.quadraticCurveTo(4,14,18,14); ctx.lineTo(12,4); ctx.closePath(); ctx.fillStyle='#a6ffe0'; ctx.fill();
    ctx.beginPath(); ctx.arc(24,-4,3,0,Math.PI*2); ctx.fillStyle='#00121a'; ctx.fill();
    if(f.decor){
      ctx.save(); ctx.strokeStyle='#cfe4ff'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(24,-4,6.5,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(18,-5); ctx.lineTo(12,-6); ctx.stroke();
      ctx.fillStyle='#0f2b51'; ctx.fillRect(-4,-20,54,5); ctx.fillStyle='#173a6b'; ctx.fillRect(10,-44,26,24); ctx.fillStyle='#2a6fbf'; ctx.fillRect(10,-34,26,4);
      ctx.strokeStyle='#b4d2ff'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(22,2); ctx.quadraticCurveTo(16,6,14,8); ctx.quadraticCurveTo(18,6,20,4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(26,2); ctx.quadraticCurveTo(32,6,34,8); ctx.quadraticCurveTo(30,6,28,4); ctx.stroke();
      ctx.fillStyle='#b4d2ff'; ctx.beginPath(); ctx.moveTo(18,12); ctx.quadraticCurveTo(24,20,30,12); ctx.quadraticCurveTo(24,16,18,12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#cfe4ff'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(21,12); ctx.lineTo(20,16); ctx.moveTo(24,13); ctx.lineTo(24,18); ctx.moveTo(27,12); ctx.lineTo(28,16); ctx.stroke(); ctx.restore();
    }
    if(highlight){
      ctx.shadowBlur=0; ctx.lineWidth=2.0; ctx.strokeStyle=tint; ctx.globalAlpha=.9;
      ctx.beginPath(); ctx.moveTo(0,-12); ctx.quadraticCurveTo(22,-18,40,0); ctx.quadraticCurveTo(22,18,0,12); ctx.quadraticCurveTo(8,0,0,-12); ctx.closePath(); ctx.stroke(); ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  let showIcons=0;
  const symbolsSprite = new Image();
  symbolsSprite.src = CUTSCENE_SYMBOLS_URL;

  function drawSymbolSheet(x,y,a){
    a=(a==null?1:a);
    if(!spriteReady(symbolsSprite)) return;
    ctx.save();
    ctx.globalAlpha=a;
    ctx.translate(x,y);
    ctx.shadowColor='rgba(119,255,204,.45)';
    ctx.shadowBlur=20;
    const desiredWidth = 320;
    const scale = desiredWidth / symbolsSprite.naturalWidth;
    const drawW = symbolsSprite.naturalWidth * scale;
    const drawH = symbolsSprite.naturalHeight * scale;
    ctx.drawImage(symbolsSprite, -drawW/2, -drawH/2, drawW, drawH);
    ctx.restore();
  }

  function drawCutsceneBackdrop(time){
    const width = cvs.width;
    const height = cvs.height;
    ctx.clearRect(0,0,width,height);
    const baseGrad = ctx.createLinearGradient(0,0,0,height);
    baseGrad.addColorStop(0,'#03294a');
    baseGrad.addColorStop(0.55,'#02203b');
    baseGrad.addColorStop(1,'#02111f');
    ctx.save();
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0,0,width,height);
    ctx.restore();

    if (spriteReady(backgroundLevelOneSprite)) {
      const scale = Math.max(width / backgroundLevelOneSprite.naturalWidth, height / backgroundLevelOneSprite.naturalHeight);
      const drawW = backgroundLevelOneSprite.naturalWidth * scale;
      const drawH = backgroundLevelOneSprite.naturalHeight * scale;
      const overflowX = drawW - width;
      const overflowY = drawH - height;
      const drawX = overflowX > 0 ? -overflowX * 0.15 : 0;
      const drawY = overflowY > 0 ? -overflowY * 0.45 : 0;
      ctx.drawImage(backgroundLevelOneSprite, drawX, drawY, drawW, drawH);
    }

    ctx.save();
    const glow = ctx.createRadialGradient(width*0.5,height*0.1,0,width*0.5,height*0.1,height*0.9);
    glow.addColorStop(0,'rgba(110,170,220,0.32)');
    glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.82;
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,width,height);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.24;
    const beamCount=4;
    for(let i=0;i<beamCount;i+=1){
      const phase=time*0.00028+i*1.37;
      const center=(width/(beamCount+1))*(i+1)+Math.sin(phase)*width*0.08;
      const beamWidth=width*0.2;
      const grad=ctx.createLinearGradient(center,0,center,height*0.75);
      grad.addColorStop(0,'rgba(255,255,255,0.28)');
      grad.addColorStop(0.6,'rgba(40,80,120,0.25)');
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.moveTo(center-beamWidth*0.3,-height*0.1);
      ctx.lineTo(center+beamWidth*0.3,-height*0.1);
      ctx.lineTo(center+beamWidth*0.58,height*0.76);
      ctx.lineTo(center-beamWidth*0.58,height*0.76);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.28;
    ctx.fillStyle='rgba(40,80,120,0.32)';
    ctx.beginPath();
    ctx.moveTo(0,height*0.38);
    ctx.bezierCurveTo(width*0.22,height*0.3,width*0.42,height*0.32,width*0.7,height*0.42);
    ctx.lineTo(width,height*0.48);
    ctx.lineTo(width,height*0.62);
    ctx.lineTo(0,height*0.54);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.7;
    ctx.fillStyle='#031728';
    ctx.beginPath();
    ctx.moveTo(0,height*0.76);
    ctx.bezierCurveTo(width*0.18,height*0.7,width*0.34,height*0.82,width*0.52,height*0.78);
    ctx.bezierCurveTo(width*0.7,height*0.74,width*0.82,height*0.86,width,height*0.8);
    ctx.lineTo(width,height);
    ctx.lineTo(0,height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.88;
    ctx.fillStyle='#05233b';
    ctx.beginPath();
    ctx.moveTo(0,height*0.88);
    ctx.bezierCurveTo(width*0.16,height*0.82,width*0.3,height*0.92,width*0.46,height*0.9);
    ctx.bezierCurveTo(width*0.68,height*0.86,width*0.82,height*0.96,width,height*0.94);
    ctx.lineTo(width,height);
    ctx.lineTo(0,height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const pseudoRand = seed => {
      const s = Math.sin(seed)*43758.5453;
      return s - Math.floor(s);
    };
    ctx.save();
    ctx.globalAlpha=0.18;
    ctx.fillStyle='rgba(255,255,255,0.35)';
    const moteCount=42;
    for(let i=0;i<moteCount;i+=1){
      const noise=pseudoRand(i*12.93);
      const noise2=pseudoRand(i*34.37);
      const scroll=(time*0.00004+noise2)%1;
      const x=noise*width;
      const y=(1-scroll)*height;
      const size=2+pseudoRand(i*5.21)*6;
      ctx.beginPath();
      ctx.arc(x,y,size,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  const script=[
    {speaker:"Erzähler", text:"Spielsteuerung:\n\u2022 Bewegung: WASD\n\u2022 Angriff: Linke Maustaste (halten = Dauerfeuer)\n\u2022 Ab Level 2: Schild auf E\n\u2022 Ab Level 3: Korallenbegleiter auf R\n\u2022 Ab Level 4: Ultimate auf T (1 Aktivierung)\n\u2022 Hub-Menü: Tab"},
    {speaker:"Erzähler", text:"Tief unter der Oberfläche schuften Fische in engen Stollen \u2013 Diamanten für den gierigen Cashfisch."},
    {speaker:"Erzähler", text:"Er hortet jeden Glitzerstein. Für die anderen bleibt: nichts."},
    {speaker:"Spieler (murmelt)", text:"Jetzt muss ich schon wieder im Stollen arbeiten..."},
    {speaker:"Spieler", text:"Ich hab genug davon. Ich breche aus!"},
    {speaker:"Erzähler", text:"Drei Symbole können den Ausgang öffnen: ein Schlüssel-Symbol, ein Geldschein-Symbol und ein Yacht-Symbol. Nutze den Teleporter, um in die Stadt zurückzukehren."},
    {speaker:"Erzähler", text:"Besiege ihre Wächter, nimm dir die Zeichen \u2013 und stürze den Cashfisch. In der Stadt warten Händler, Gärtner, Hafen und Akademie."},
    {speaker:"Spieler (entschlossen)", text:"Kein Stollen mehr. Jetzt nehme ich mir die Freiheit."}
  ];

  let idx=0, typed="", typing=true, cutDone=false, startedIcons=false, t0=performance.now();

  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  function currentSpeaker(){ const s=(script[idx]&&script[idx].speaker||"").toLowerCase(); if(s.startsWith('erzähler')) return 'narr'; if(s.startsWith('spieler')) return 'play'; return ''; }
  function nextLine(){ if(idx>=script.length){ endCutscene(); return; } typed=""; typing=true; t0=performance.now(); }
  function startIcons(){ startedIcons=true; const start=performance.now(); (function fade(){ const k=Math.min(1,(performance.now()-start)/1200); showIcons=k; if(k<1 && !cutDone) requestAnimationFrame(fade); })(); }
  function endCutscene(){ cutDone=true; hint.style.display='block'; }
  
  function onAdvance(){
    if (!cutsceneEnabled) return;
    if(cutDone){
      try{
        document.getElementById('cutWrap').style.display='none';
        document.getElementById('gameWrap').style.display='block';
        document.removeEventListener('pointerdown', pointerAdvance);
        document.removeEventListener('keydown', keyAdvance);
        nextBtn.removeEventListener('click', onAdvance);
        if (typeof S.bootGame === 'function') S.bootGame();
        if (typeof S.cashBeginGame === 'function') S.cashBeginGame();
        else if (typeof S.cashResetGame === 'function') S.cashResetGame();
      }catch(err){
        const g=document.getElementById('globalErr'); if(g){ g.textContent=`Boot-Fehler: ${err.message}`; g.style.display='block'; }
      }
      return;
    }
    const cur=script[idx]; if(!cur){ endCutscene(); return; }
    if(typing){ typed=cur.text; typing=false; if(idx===4 && !startedIcons) startIcons(); }
    else{ idx++; if(idx>=script.length){ endCutscene(); } else { nextLine(); } }
  }
  
  function handleKeyAdvance(e){
    const key = (e.key || '').toLowerCase();
    if(key===' '||e.code==='Space'||key==='enter'){
      e.preventDefault();
      onAdvance();
    }
  }
  
  const keyAdvance = e => {
    if (!cutsceneEnabled) return;
    // Dungeon-Schutz: Cutscene-Handler dürfen im Dungeon nichts tun
    if (cutWrap && cutWrap.style.display === 'none') return;
    handleKeyAdvance(e);
  };
  const pointerAdvance = () => {
    if (!cutsceneEnabled) return;
    // Dungeon-Schutz: Cutscene-Handler dürfen im Dungeon nichts tun
    if (cutWrap && cutWrap.style.display === 'none') return;
    onAdvance();
  };
  document.addEventListener('keydown', keyAdvance, {passive:false});
  document.addEventListener('pointerdown', pointerAdvance);
  nextBtn.addEventListener('click', onAdvance);
  nextLine();

  function wrapText(str,maxW){
    const words=(str||'').split(' ');
    const lines=[];
    let cur='';
    ctx.font='20px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif';
    for(const w of words){
      const test=cur?`${cur} ${w}`:w;
      const width=ctx.measureText(test).width;
      if(width>maxW && cur){ lines.push(cur); cur=w; }
      else cur=test;
    }
    if(cur) lines.push(cur);
    return lines;
  }

  let last=performance.now();
  function loop(now){
    if (!cutsceneEnabled) {
      requestAnimationFrame(loop);
      return;
    }
    if (cutWrap && cutWrap.style.display === 'none') {
      return;
    }

    const dt=Math.min(33,now-last); last=now;
    drawCutsceneBackdrop(now);
    for(const b of bubbles){ b.y-=b.spd; if(b.y<-10){ b.y=cvs.height+10; b.x=Math.random()*cvs.width;} ctx.globalAlpha=.7; ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }

    narrator.t+=dt; player.t+=dt;
    const who=currentSpeaker(); const narrOn=(who==='narr'), playOn=(who==='play');

    drawFish(narrator, narrOn, 'rgba(200,230,255,0.65)');
    drawFish(player,   playOn, 'rgba(166,255,224,0.65)');

    // mouth bubbles
    function emitBubbles(from){
      const f = (from==='narr')? narrator : player;
      const m = {mx: f.x + f.dir*26*f.scale, my: f.y + 30 - 4*f.scale};
      for(let i=0;i<2;i++) talkBubbles.push({x:m.mx,y:m.my,r:2+Math.random()*3,vy:-(.8+Math.random()),vx:(Math.random()-.5)*0.6,a:.85});
    }
    if(who==='narr'){ narrEmit-=dt; if(narrEmit<=0){ emitBubbles('narr'); narrEmit=160+Math.random()*200; } }
    if(who==='play'){ playEmit-=dt; if(playEmit<=0){ emitBubbles('play'); playEmit=160+Math.random()*200; } }

    for(let i=talkBubbles.length-1;i>=0;i--){ const b=talkBubbles[i]; b.x+=b.vx; b.y+=b.vy; b.a-=0.004*dt/16; if(b.a<=0||b.y<-10){ talkBubbles.splice(i,1); continue;} ctx.save(); ctx.globalAlpha=Math.max(0,b.a); ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }

    if(!cutDone && typing){ const cur=script[idx]; const full=cur.text; const speed=22; const passed=now-t0; const want=Math.floor(passed/speed); if(want>typed.length) typed=full.slice(0,want); if(typed.length>=full.length){ typing=false; if(idx===4 && !startedIcons) startIcons(); } }

    const pad=16, boxH=130;
    ctx.save(); ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,cvs.height-boxH-12,cvs.width,boxH+12); ctx.fillStyle='#0b1320cc'; ctx.fillRect(0,cvs.height-boxH,cvs.width,boxH); ctx.restore();
    ctx.save(); ctx.font='16px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif'; ctx.fillStyle='#9aa3c7'; const cur=script[Math.min(idx,script.length-1)]; if(cur){ ctx.fillText(cur.speaker||'', pad+4, cvs.height-boxH+26); } ctx.fillStyle='#e8ecff'; ctx.font='20px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif'; const text=typing?typed:(script[idx]?script[idx].text:typed); const lines=wrapText(text,760); let y=cvs.height-boxH+56; for(const L of lines){ ctx.fillText(L, pad+4, y); y+=28; } ctx.restore();
    ctx.save(); ctx.font='600 14px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif'; ctx.fillStyle='#9aa3c7'; ctx.textAlign='right'; const blink=Math.floor(now/500)%2===0?'':' \u25B6'; ctx.fillText(cutDone?'Space/Klick: Start':(`Space/Klick: Weiter${blink}`), cvs.width-14, cvs.height-14); ctx.restore();

    if(showIcons>0){
      const gridSize = 50;
      const iconX = cvs.width*0.5 - gridSize*1.3 + 60;
      const iconY = cvs.height*0.44 + gridSize*1.4 + 20;
      const auraRadius = 160;
      const glowAlpha = Math.min(0.75, showIcons*0.85);
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = glowAlpha;
      const auraGrad = ctx.createRadialGradient(iconX, iconY, auraRadius*0.2, iconX, iconY, auraRadius);
      auraGrad.addColorStop(0,'rgba(180,255,230,0.6)');
      auraGrad.addColorStop(1,'rgba(60,140,200,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(iconX, iconY, auraRadius, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      drawSymbolSheet(iconX, iconY, showIcons);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
