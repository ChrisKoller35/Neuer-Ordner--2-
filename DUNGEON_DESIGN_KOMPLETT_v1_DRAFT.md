# DUNGEON DESIGN — Komplettes Gegner- & Boss-Konzept (v1 Draft)

> Kein Code in diesem Dokument. Nur Design-Entscheidungen.
> Status: Erstentwurf zur Überprüfung.
> Datum: 26.02.2026

---

## ÜBERSICHT & DESIGNZIELE

**Kernproblem:** Gegner-KI ist zu passiv. Alle rollen auf den Spieler zu. Kämpfe fühlen sich identisch an.

**Designziele:**
1. Jeder Gegnertyp hat eine klar erkennbare Rolle und Verhaltenslogik.
2. Jede Ebene führt mindestens einen neuen Mechanikmix ein.
3. Elites überraschen ohne unfair zu sein — klare Telegraphing-Zeit.
4. Bosse haben Phasen die sich grundlegend ändern, nicht nur skalieren.
5. Code Spirits sind aktive Begleiter mit eigenem Verhalten, nicht passive Statisten.
6. Die erste Ebene macht bereits Spaß — kein "Warme-up-Müll"-Gefühl.

---

## BIOM-SYSTEM

| Biom | Name | Ebenen | Atmosphäre | Farbpalette |
|------|------|--------|------------|-------------|
| 1 | Steinverliese | 1–15 | Alte, dunkle Festung unter dem Meer | Dunkelgrau, Moos, kaltes Blau |
| 2 | Eiskristallhöhlen | 16–30 | Gefrorenes Tiefsee-Labor | Eisblau, Weiß, Türkis |
| 3 | Vulkanfestung | 31–50 | Unterwasser-Vulkankomplex | Dunkelorange, Asche, glühend |
| 4 | Abyssal-Verschiebung *(neu)* | 51–70 | Dimensionsspalt am Meeresgrund | Lila-Schwarz, Void-Blitzen |
| 5 | Korallen-Nekropolis *(neu)* | 71+ | Verfallenes Korallenreich der alten Götter | Blutrot, Goldglanz, Nekrose |

---

## TEIL 1: NORMALE GEGNER

---

### BIOM 1 — STEINVERLIESE (Ebene 1–15)

---

#### [N-01] QUALLE *(verbessert)*
- **Rolle:** Flächenfüller / Schwarmdruck
- **Aussehen:** Halbkugel-Form, pulsiert rhythmisch in Hellblau. Tentakel hängen 3–4 Pixel unter dem Körper. Glüht kurz stärker wenn sie sich auf den Spieler ausrichtet.
- **KI-Verhalten (verbessert):**
  - Treibt nicht mehr komplett zufällig. Hat einen *Magnetismus*: Ist der Spieler in Sichtweite (150px), driftet sie langsam in seine Richtung, leicht ausschweifend (Sinus-Kurve).
  - In Gruppen von 3+: synchronisieren sich und umzingeln langsam (formation drift). Jede 2te Qualle dreht leicht nach außen, damit der Spieler nicht einfach durch läuft.
  - Kontaktschaden. Keine Projektile.
- **Spezialfähigkeit:** *Quallenring* — Wird sie getroffen explodiert am Ende der Invuln-Zeit eine kleine Druckwelle (20px Radius, 0.5 Schaden). Erkennbar: Körper leuchtet 300ms weiß nach dem Treffer.
- **Visuelle Effekte:** Körper pulsiert (scale 1.0–1.1 in 1.2s Takt). Trifft sie den Spieler: oranger Blitz + tiny particles.
- **Spawn:** Ebene 1–15 (Hauptgegner Ebene 1–6)
- **Balancing:** 2 HP, 1 Schaden, Geschwindigkeit 0.035

---

#### [N-02] STEINKRABBE *(verbessert)*
- **Rolle:** Nahkampf-Blocker / Lane-Controller
- **Aussehen:** Breite, flache Krabbe. Zwei große Scheren vorne. Dunkelbraun mit kleinen orangeroten Flecken. Bewegt sich seitlich. Scheren klappen auf wenn sie angreift.
- **KI-Verhalten (verbessert):**
  - *Seitliches Vorwärtsdriften:* Bewegt sich schräg auf den Spieler zu, nicht frontal. Wechselt alle 1.5s die Flanke (links/rechts).
  - *Scherenschnapp:* Ist der Spieler unter 80px, kurze Zieldistanz-Lunge (dash 0.4 Fkt. * 200ms), danach 600ms Cooldown.
  - *Rückzug bei HP < 30%:* Weicht 1s zurück, dann erneuter Angriff. Gibt dem Spieler ein kurzes Fenster.
- **Spezialfähigkeit:** *Panzerung* — Die Vorderseite der Krabbe absorbiert 50% des Schadens, solange sie dem Spieler zugewandt ist. Muss von der Seite oder hinten getroffen werden für vollen Schaden.
- **Visuelle Effekte:** Scheren-Open-Animation (150ms) kurz vor dem Schnapp. Kleines Staub-Partikel wenn sie landet.
- **Spawn:** Ebene 1–15 (Hauptgegner Ebene 1–8)
- **Balancing:** 3 HP, 1 Schaden, Geschwindigkeit 0.045

---

#### [N-03] LEUCHTFISCH *(verbessert)*
- **Rolle:** Kamikaze / Stresselement
- **Aussehen:** Kleiner fischförmiger Körper, leuchtendes Organ an der Stirn (helles Gelb-Weiß). In der "Aufladephase" wird das Organ kräftig orange-rot. Zittert sichtbar.
- **KI-Verhalten (verbessert):**
  - *Lockphase (1.5s):* Taucht in der Nähe auf, bleibt 1.5s still und schaut den Spieler an. Das Frontlicht pulsiert langsam. Gibt der Spieler einen Hinweis.
  - *Ladephase (0.8s):* Zieht sich leicht zurück (Federung), Licht wechselt nach oranje, Körper zittert.
  - *Jagdphase:* Rast mit doppelter Geschwindigkeit auf letzte bekannte Spielerposition. Richtungskorrektur alle 200ms.
  - *Explosion:* Wenn Spieler unter 30px ODER Timer < 0. Explodiert in gelbem Blitz (80px Radius, 2 Schaden).
  - Trifft er eine Wand: kleines Puff, kein Schaden.
- **Spezialfähigkeit:** *Kettenblitz* — Explodiert eine andere Qualle oder Leuchtfisch in 100px? Die explodiert auch (Kettenreaktion, maximal 2). Erkennbar: kurze gelbe Linie zwischen ihnen bevor Explosion.
- **Visuelle Effekte:** Auflade-Glow (Radial-Gradient), Explosions-Flash (voller Screen-Tint 50ms), Partikelring beim Platzen.
- **Spawn:** Ebene 1–15, mix in Ebene 1–12
- **Balancing:** 2 HP, 2 Schaden (Explosion), Geschwindigkeit 0.07 im Rush

---

#### [N-04] SEEIGEL *(verbessert)*
- **Rolle:** Zone-Control / Turret
- **Aussehen:** Runde stachelige Kugel. Stacheln zeigen in alle Richtungen. Dunkelviolett, Stacheln heben sich in hellerem Violett ab. Dreht sich langsam permanent.
- **KI-Verhalten (verbessert):**
  - *Stationär* solange Spieler > 100px entfernt. 
  - *Rotierender Schuss (aktiv):* Alle 2.5s feuert er 3 Stacheln in einem 90°-Fächer zur Spielerposition. Kurze Telegraph-Leuchte der Stacheln (gelb, 350ms) bevor sie losfliegen.
  - *Nahkampfanpassung:* Kommt Spieler unter 60px rollt er langsam weg (0.02x) während er weiter schießt — ist jetzt kein reines Angriffsziel mehr.
  - *Ab Phase Eis (Eb. 16+):* Feuert Eisstacheln die kurz einfrieren.
- **Spezialfähigkeit:** *Stachelfeld* — Beim Tod hinterlässt er 4 Stacheln am Boden (6px Radius, 800ms Lebensdauer, 1 Schadenszone). Erkennbar: Grün-gelber Blitz beim Tod.
- **Visuelle Effekte:** Rotations-Animation (constante rotation). Stacheln leuchten kurz vor Schuss auf. Projektile sind kleine spitze Dreiecke.
- **Spawn:** Ebene 2–15 (signature Ebene 1–10)
- **Balancing:** 4 HP, 1 Schaden, Schuss-Interval 2500ms

---

#### [N-05] MURÄNE *(verbessert)*
- **Rolle:** Ambush-Attentäter / Stresstest
- **Aussehen:** Länglicher Schlangenkörper (3:1 Verhältnis), dunkelgrün mit weißem Bauch. Augen leuchten rot wenn sie aus dem Versteck kommt. Zähne sichtbar. Im versteckten Zustand: nahezu transparent (alpha 0.15).
- **KI-Verhalten (verbessert):**
  - *Lauerpool:* Je Raum sind 2–3 Muränen positioniert. Sie warten statisch bis Spieler > 130px ist (transparent), dann aktivieren.
  - *Ankündigungs-Zucken (300ms):* Kurz bevor sie dasht, eine kurze Zuckbewegung sichtbar (flackert kurz auf).
  - *Dash (450ms):* Schießt auf letzte Spielerposition, Geschw. 0.45.
  - *Retreat (600ms):* Zieht sich nach dem Dash zurück und wird wieder transparent.
  - *Combo-Muräne:* Ab Ebene 8 kommen 2 Muränen zusammen — eine dash attackt, die andere lauert noch.
- **Spezialfähigkeit:** *Wundschlag* — Trifft der Dash den Spieler, verliert der für 2s 20% Bewegungsgeschwindigkeit (Slash-Wunde). Erkennbar: rotes Blut-Partikel + Spieler leuchtet kurz rot.
- **Visuelle Effekte:** Transparenz-Fade (500ms Übergang). Dash hinterlässt 3-Frame Bewegungsunschärfe. Augen-Glow verstärkt sich beim Aktivieren.
- **Spawn:** Ebene 3–15 (signature Ebene 3–12, Ambush-Gegner)
- **Balancing:** 4 HP, 2 Schaden, Dash 0.45x

---

#### [N-06] PANZERFISCH *(verbessert)*
- **Rolle:** Tank / Frontblockierer
- **Aussehen:** Massiger Fisch, grüne Panzerplatten auf dem Rücken (schuppig). Kleiner Schwanz, dicker Körper. Leuchtet gelb wenn Panzerangriff aktiv.
- **KI-Verhalten (verbessert):**
  - *Langsamer Vormarsch:* Bewegt sich konstant auf den Spieler zu (0.03x), nicht ablenkbar.
  - *Rempeln:* Kommt er auf 50px, Kurz-Ram (0.2s Burst), schiebt den Spieler um 30px zurück.
  - *Panzerrotation:* Dreht sich immer so, dass der Panzer dem Spieler zugewandt ist. Flankenangriffe umgehen die Panzerung.
  - *Wut bei < 30% HP:* Geschwindigkeit +50% für 3s, aber Panzer öffnet sich leicht (voller Schaden möglich).
- **Spezialfähigkeit:** *Bodenstoß* — Alle 4s stampft er auf den Boden, was in 60px Radius 1 Vibrationsschaden macht + kurze Stun-Verwirbelung des Spielers (200ms Input-Drift). Erkennbar: Boden zittert kurz (gelbe Wellenlinie, 500ms Vorlauf).
- **Visuelle Effekte:** Stampf erzeugt kleinen Staubring. Panzer-Texturen heben sich ab (leichte Highlight-Kanten). Wut-Modi: Körper pulsiert dunkelrot.
- **Spawn:** Ebene 5–15
- **Balancing:** 6 HP, 1 Schaden, Frontalschutz 60%

---

#### [N-07] TINTENFISCH *(verbessert)*
- **Rolle:** Controller / Weich-Stöter
- **Aussehen:** 8 Tentakel, lila Körper, weiße Augen. Tentakel bewegen sich flüssig. Beim Tintenausstoß: dunkle Wolke hinter ihm.
- **KI-Verhalten (verbessert):**
  - *Distanzhalter:* Hält immer 120–200px Abstand zum Spieler. Weicht cleverer aus: antizipiert Spielerbewegung (weicht in Richtung aus, wohin der Spieler NICHT geht).
  - *Tintencloud:* Alle 4s schießt er eine Tintenwolke auf den Spieler. Die Wolke blockiert die Spieler-Sicht (Kamera zu 70% verdunkelt im Block-Bereich). Dauer: 2.5s. Radius 60px.
  - *Tentakel-Peitsche:* Kommt Spieler unter 80px, eine Tentakelpeitsche: 2 Tentakel schnellen kurz raus (visual only 120ms), Kontakt 1 Schaden + 15px knockback.
  - *Quallen-Ruf:* Alle 6s ruft er 1 Qualle herbei (nur wenn < 8 Gegner im Raum).
- **Spezialfähigkeit:** *Unsichtbarkeitscloud* — Betritt der Spieler die Tintenwolke, wird der Tintenfisch selbst kurz (1.5s) unsichtbar. Erkennbar: Transparenz mit lila Outline.
- **Visuelle Effekte:** Tintenwolke ist dunkelblauer Radial-Gradient (alpha 0.7). Tentakelpeitsche: Linien die kurz aufblitzen. Spurpartikel beim Fliehen.
- **Spawn:** Ebene 6–15
- **Balancing:** 3 HP, 1 Schaden, Ink-Interval 4000ms

---

#### [N-08] STEINWÄCHTER *(verbessert, Elite-Grundtyp)*
- **Rolle:** Elite-Tank / Raumkontrolle
- **Aussehen:** Groß (1.5x normal), humanoid-artige Fischform, mit Steinplatten bekleidet. Grüngrauer Ton. Rote Augen. Schreitet langsam durch den Raum, Boden "zittert" mit jedem Schritt.
- **KI-Verhalten (verbessert):**
  - *Langsamer Patrouilleur:* Läuft eine feste Bahn durch den Raum, bis der Spieler unter 200px kommt.
  - *Fokus-modus:* Bei Spieler in Reichweite: dreht sich langsam, Schockwelle ca. alle 3.5s.
  - *Schockwelle:* Expandierender Ring aus dem Boden (stone-crumble particle), Radius bis 140px, Schaden 2. Telegraphing: Boden leuchtet 600ms in Kreisform um ihn.
  - *Phase 2 (< 50% HP):* Feuert jetzt auch 4 langsame Steine in Himmelsrichtungen nach jeder Schockwelle. Steine prallen von Wänden ab (1x).
- **Spezialfähigkeit:** *Erdbeben-Aura* — Im 80px Radius verlangsamt er Spieler um 25%. Sichtbar als leichte Bodenverzerrung.
- **Visuelle Effekte:** Schockwelle: stein-colored expanding ring + crack lines vom Zentrum. Phase-2-Steine: eckige graue Projektile.
- **Spawn:** Ebene 8–15 (Elite-Gegner)
- **Balancing:** 10 HP, 2 Schaden, Schockwelle 3500ms

---

#### [N-09] GEISTERKRABBE *(neu)*
- **Rolle:** Unsichtbarer Lauerer / Überraschungsangreifer
- **Aussehen:** Wie Steinkrabbe aber leicht transluzent-bläulich. Im unsichtbaren Zustand: kaum erkennbar (minimal Outline). Im aktiven Zustand: blauweiß schimmernd.
- **KI-Verhalten:**
  - *Unsichtbarkeits-Zyklus:* 3s unsichtbar bewegt sich nah an Spieler → 0.5s materialisiert (kurze Warnung) → 1.5s voll sichtbar und angreift → zurück in Unsichtbarkeit.
  - *Positionierung:* Versucht immer hinter den Spieler zu kommen während unsichtbar.
  - *Angriff:* 2 schnelle kleine Kneifangriffe (je 0.5 Schaden, 100ms Abstand) sobald sichtbar + in Reichweite.
- **Spezialfähigkeit:** *Geisterschritt* — Wird sie getroffen während sie materialisiert, flüchtet sie sofort in Unsichtbarkeit (3s Cooldown).
- **Visuelle Effekte:** Materialisierungs-Effekt: Partikel die sich zum Körper zusammensetzen (300ms). Spuren beim Bewegen: faint ghostly trail.
- **Spawn:** Ebene 6–14 (Biom 1 Specialist)
- **Balancing:** 3 HP, 1 Schaden (2x), Invis-Zyklus 3/0.5/1.5s

---

#### [N-10] NADELROCHEN *(neu)*
- **Rolle:** Fernkämpfer / Nadelbeschuss
- **Aussehen:** Flacher Rochenumriss (diamond-shape), dunkelgrau. Hat ein Organ am Bauch das in kurzen Intervallen rot leuchtet. Gleitet smooth durch den Raum.
- **KI-Verhalten:**
  - *Gleiter:* Bewegt sich gleichförmig in einem großen Kreis um den Spieler (oder gegen Wand: prallt ab). Hält 130–200px Abstand.
  - *Nadelschuss:* Alle 1.8s schießt er 1 langen Nadel-Projektil direkt auf Spieler. Die Nadel ist schmal (2px Breite) und schnell (0.7x). Sehr schwer auszuweichen ohne Bewegung.
  - *Reaktionsverhalten:* Wird er getroffen, weicht er in eine andere Kreisbahn aus.
- **Spezialfähigkeit:** *Nadelsalve* — Bei < 40% HP feuert er statt 1 jetzt 3 Nadeln (60° Fächer) pro Interval. Erkennbar: Bauch-Organ leuchtet schnell rot-gelb.
- **Visuelle Effekte:** Nadeln sind lange dünne Linien (2px, 14px lang), orange-rot. Schuss-Leuchte (150ms). Kreisbewegung hinterlässt leichte Wellenlinien.
- **Spawn:** Ebene 4–15
- **Balancing:** 3 HP, 1.5 Schaden, Schuss 1800ms

---

#### [N-11] SCHATTENFISCH *(neu)*
- **Rolle:** Geschwindigkeits-Dasher / Split-Mechanik
- **Aussehen:** Dunkler, fast schwarzer schlanker Fisch. Lila Akzente. Kein clearly defined Form — eher schemenartiger Umriss. Bewegt sich sehr flüssig.
- **KI-Verhalten:**
  - *Hochgeschwindigkeits-Follow:* Verfolgt den Spieler mit sehr hoher Beschleunigung, aber macht alle 1.5s kurze Richtungsänderung (unvorhersehbar).
  - *Dash-Teleport:* Alle 3s teleportiert er sich auf 80px Distanz zum Spieler (mit kurzem Vorsignal: lila Swirl 300ms).
  - *Split-Tod:* Bei < 2 HP teilt er sich in 2 Mini-Schattenfs (je 1 HP, halber Schaden, gleiche KI aber ohne Split).
- **Spezialfähigkeit:** *Schattenklinge* — Hat er den Spieler einmal getroffen, ist jeder folgende Schaden an diesen Fisch für 2s um 1 erhöht (er wird vorübergehend sichtbarer = "exposed").
- **Visuelle Effekte:** Bewegungsunschärfe (trail von 3 frames). Teleport: lila Swirl-In / Swirl-Out. Split: dunkle Explosion.
- **Spawn:** Ebene 7–15
- **Balancing:** 4 HP (teilt bei < 2 HP), 1 Schaden, Geschw. 0.09

---

#### [N-12] KORALLENRÜSTLING *(neu)*
- **Rolle:** Puffer / Buff-Geber für andere Gegner
- **Aussehen:** Mittelgroßer Fisch mit einem unförmigen Korallenaufsatz auf dem Rücken. Leuchtendes Organ vorne. Pinkrot-farbig.
- **KI-Verhalten:**
  - *Rückzug:* Hält itself möglichst weit vom Spieler (> 200px).
  - *Aura:* Alle Gegner in 120px Radius von ihm erhalten +0.4 Geschwindigkeit (sichtbar: kurzes orange Flackern um jene Gegner).
  - *Reparatur:* Alle 4s heilt er den verletzten Gegner mit den wenigsten HP in der Nähe um 1 HP. Visual: grüne Partikel von ihm zum Ziel.
  - *Wenn allein:* Greift selbst an (normaler drift-Angriff), Korallenorgan schießt 1 Projektil alle 3s.
- **Spezialfähigkeit:** *Korallenrüstung* — Beim ersten Treffer: ein Korallenpartikel (kleines Fragment) wird zerstört (visuell), macht 1 Flächenschaden in 30px Radius. Erkennbar: kurzes Aufflammen wenn getroffen.
- **Visuelle Effekte:** Aura: pulsierender oranger Ring um ihn. Heal-Strahl: grüne Partikelkurve. 
- **Spawn:** Ebene 9–15 (immer zusammen mit anderen Gegnern gespawnt)
- **Balancing:** 3 HP, 1 Schaden (Projektil), Heal 1 HP / 4s

---

### BIOM 2 — EISKRISTALLHÖHLEN (Ebene 16–30)

---

#### [N-13] EISKRABBE *(ausgearbeitet)*
- **Rolle:** Frostblocker / Slow-Applier
- **Aussehen:** Wie Steinkrabbe, aber aus Eis-Kristallen gebaut. Hellblau-transparent, Inneres leuchtet. Hinterlässt Eisspuren beim Gehen.
- **KI-Verhalten:**
  - *Blockierender Vormarsch:* Bewegt sich frontal auf Spieler zu, blockiert Fluchtrouten mit Eisspuren (1.5s Dauer, verlangsamt Spieler 40%).
  - *Eisklammer:* Beim Kontakt hält sie den Spieler kurz fest (350ms freeze, 0-Schaden, aber Schaden von anderen Gegnern +50% in dieser Zeit).
  - *Eisexplosion beim Tod:* Zerfällt in 3 Eissplitter die in verschiedene Richtungen fliegen (je 0.5 Schaden).
- **Spezialfähigkeit:** *Frostpanzerung* — Hat 2 "Frost-Schichten". Jeder Treffer entfernt eine Schicht (visuell: Eisabsplittern). Erst wenn beide weg: voller Schaden.
- **Visuelle Effekte:** Eisspur-Trail: hellblauer kurzer Rechteck. Klammer: blaue Partikel um Spieler. Explosion: Eissplitter-Partikelburst.
- **Spawn:** Ebene 16–30
- **Balancing:** 5 HP (+ 2 Frost-Puffer), 1 Schaden + Freeze

---

#### [N-14] FROSTQUALLE *(ausgearbeitet)*
- **Rolle:** Frost-Drifter / Langsamer Schaden
- **Aussehen:** Wie normale Qualle, aber weiß-blau, mit Eiskristall-Tentakeln. Beim Pulsieren sprühen kleine Eispartikel.
- **KI-Verhalten:**
  - *Drift mit Richtungsgedächtnis:* Driftet in die Richtung, in die der Spieler sich zuletzt bewegte (predicitve drift).
  - *Frost-Puls:* Alle 3s kurzer Puls (40px Radius, 0.5 Schaden + 1s Slow 30%). Erkennbar: Körper wird kurz eisblau.
  - *Eisnebel:* Bewegt sie sich, hinterlässt kurze Eisspur (0.5s, leichter Slow).
- **Spezialfähigkeit:** *Frostverstärker* — Hält Spieler auf Körper 2s, verursacht continuierliche 0.3 Schaden/s (frost bite). Erkennbar durch blaues Glow-Aura wenn Spieler nahe.
- **Visuelle Effekte:** Puls: radial expanding iceblue ring. Eisspur: leichter weiß-blauer Gradient.
- **Spawn:** Ebene 16–25
- **Balancing:** 3 HP, 0.5 + Frost-Effekte

---

#### [N-15] OKTOPUS *(verbessert)*
- **Rolle:** Tentakel-Controller / Defensive Wand
- **Aussehen:** 8 Tentakel, mittelgroßer Körper, dunkelviolett mit biolumineszenten Punkten. Tentakel bewegen sich organisch (wave-animation).
- **KI-Verhalten (verbessert):**
  - *Stationäre Kontrolle:* Bevorzugt eine feste Position, schützt sie aktiv.
  - *Tentakel-Sweep:* Alle 2.5s animiert er 2–3 Tentakel auseinander, die auf verschiedenen Winkeln räumlich schaden (je 150px Reichweite, Linienschaden 1). Erkennbar: Tentakel richten sich 600ms vorher aus.
  - *Tintenbombe:* Alle 5s schießt er eine "Tintenbombe" (explodiert in 80px Wolke nach 1s Flugzeit). Erkennbar: blinkt lila vor Schuss.
  - *Rückzug:* Bei < 30% HP zieht er alle Tentakel ein und weicht aus.
- **Spezialfähigkeit:** *Tentakelnetz* — Wenn Spieler von 2 Tentakeln gleichzeitig getroffen: 0.5s Festhalten + 2x Schaden. Sehr selten durch Positionierung triggbar.
- **Visuelle Effekte:** Tentakel: sinuswellen-animierte Linien. Sweep: gelber Outline-Bogen. Tintenbombe: lila Wolken-Explosion.
- **Spawn:** Ebene 16–28
- **Balancing:** 6 HP, 1 Schaden (Tentakel), 1.5 Schaden (Explosion)

---

#### [N-16] SHADOWFISH *(verbessert)*
- **Rolle:** Dimensionsspringer / Positionsmanipulierer
- **Aussehen:** Dunkelblau bis schwarz, leuchtendes violettes Auge. Körper ist leicht transparent. Beim Dimensionssprung: zerstreut sich kurz in Partikel.
- **KI-Verhalten (verbessert):**
  - *Blink-Follow:* Alle 2s "blinkt" er einen Schritt auf den Spieler zu (teleportiert 80–120px geradeaus). Kein normales Bewegen.
  - *Scherenseite-Blink:* Blinkt alternierend Links/Rechts vom Spieler um Angriff von der Seite zu ermöglichen.
  - *Schadensstoß:* Bei Kontakt 1 Schaden + 10px push.
  - *Verfolgungsgedächtnis:* Merkt sich wo der Spieler war (phantom-tracking). Blinkt auf Position vor 1s falls Spieler sich schnell bewegt hat.
- **Spezialfähigkeit:** *Schattenblend* — 30% Chance dass nach einem Treffer er unsichtbar wird (0.5s). Während Unsichtbarkeit: kann nicht getroffen werden.
- **Visuelle Effekte:** Blink: Rauch-Partikel am Herkunfts- und Zielort. Schattenblend: kurzes Verblassen-Einblenden.
- **Spawn:** Ebene 18–30
- **Balancing:** 4 HP, 1 Schaden + Push

---

#### [N-17] FROSTMURÄNE *(neu)*
- **Rolle:** Eis-Ambush / Freeze-Attacker
- **Aussehen:** Wie Muräne, aber weiß-blau, hinterlässt kurze Eis-Kristalle wake. Augen leuchten eisblau.
- **KI-Verhalten:**
  - Gleiche Ambush-Basis wie Muräne (transparent wartend, Dash bei Nähe).
  - *Gefrierstrich:* Der Dash hinterlässt eine Eisspur (150px Länge, 1s Dauer, Spieler 30% Slow wenn drüber).
  - *Freeze-Treffer:* Trifft der Dash den Spieler direkt: 400ms Solidfreeze (Input-blockartig) + 1.5 Schadena.
  - *Eissplitter-Regen:* Bei Tod: 5 Eissplitter (random Winkel) fliegen aus dem Körper.
- **Spezialfähigkeit:** *Kältewelle* — Kommt er aus dem Versteck, spielt kurze Kältewelle (40px Radius, 0.5 Schaden + Slow). Erkennbar: blaues Radial-Frosting vor dem Dash.
- **Visuelle Effekte:** Eisspur: hellblauer Gradient hinter dem Dash. Freeze-Effekt: Spieler kurz in Eis-Outline. Eis-Splitter: kleine weiße Dreiecke.
- **Spawn:** Ebene 19–30
- **Balancing:** 5 HP, 1.5 Schaden (+ Freeze), Dash 0.5x

---

#### [N-18] GLETSCHERSCHILDKRÖTE *(neu)*
- **Rolle:** Massiver Slow-Tank / Gefahrenzone-Ersteller
- **Aussehen:** Riesige Schildkröte (1.8x Größe), Eisplatten statt Panzer, blau-weiß. Jeder Schritt hinterlässt kreisförmige Frostzone. Bewegt sich majestätisch langsam.
- **KI-Verhalten:**
  - *Langsam aber unaufhaltsam:* Bewegt sich gerade auf Spieler zu mit 0.015 Speed. Prallt von Wänden nicht zurück — dreht sich um.
  - *Eiszonenablage:* Alle 1.5s hinterlässt sie eine Frostzone (60px Radius, 2.5s Dauer, 40% Slow + 0.2 Schaden/s drin).
  - *Eisstoß:* Kommt Spieler auf 70px: Eisstoß von ihr aus (100px Knockback nach hinten, 2 Schaden, 1.5s Cooldown).
  - *Immunität:* Gegen Knockback immun.
- **Spezialfähigkeit:** *Permafrost-Aura* — In 70px Radius um sie herum: alle Gegner erhalten +1 Rüstung (Schaden -1, min 0). Gibt anderen Gegnern Schutz.
- **Visuelle Effekte:** Frostzone: radial ice-pattern am Boden, leuchtend. Eisstoß: white impact burst + partikel. Jeder Schritt: kleines Eis-Crunch-Partikel.
- **Spawn:** Ebene 22–30 (Elite-Level-Gegner)
- **Balancing:** 14 HP, 2 Schaden (+Knockback), Speed 0.015

---

#### [N-19] KRISTALLSPINNE *(neu)*
- **Rolle:** Fallen-Leger / Web-Controller
- **Aussehen:** 8-beinige Spinnen-ähnliche Form aus Eiskristallen. Transparent-hellblau. Hinterlässt Eisfäden beim Laufen.
- **KI-Verhalten:**
  - *Fallenleger:* Bewegt sich im Raum und hinterlässt alle 2s eine Eisweb-Falle (20px Radius, unsichtbar bis Spieler 40px nah). Stellt bis zu 4 Fallen gleichzeitig.
  - *Rückzug:* Sobald mehr als 2 Fallen im Raum sind, wartet sie statisch.
  - *Reaktionsangriff:* Tritt Spieler in eine Falle: Sprint-Dash die Spinne sofort auf den Spieler (0.3x, 1.5 Schaden).
  - *Falle-Trigger:* Falle: 0.8s Festhalten (slow 80%) + 0.5 Schaden. Erkennbar: minimale Glimmer wenn Spieler nah.
- **Spezialfähigkeit:** *Eisnetz-Kanone* — Alle 5s schießt sie ein Eisnetz-Projektil (mittelschnell, 0.25x). Trifft es: 1.5s 60% Slow + Schaden 1.
- **Visuelle Effekte:** Weblinien: dünne blaue Thread-Linien. Falle: fast durchsichtig mit kleinem kristallinen Zentrum. Trigger: Burst von Eis-Partikeln.
- **Spawn:** Ebene 20–30
- **Balancing:** 4 HP, 1–1.5 Schaden, Falle-Reset 2s

---

### BIOM 3 — VULKANFESTUNG (Ebene 31–50)

---

#### [N-20] MAGMAKRABBE *(ausgearbeitet)*
- **Rolle:** Brennender Tank / Schmelzfluss-Hinterlasser
- **Aussehen:** Wie Steinkrabbe, aber dunkelrote/schwarze Lava-Rüstung. Risse im Körper leuchten orange-rot. Hinterlässt Magma-Spur.
- **KI-Verhalten:**
  - Wie Steinkrabbe (seitlicher Vormarsch, Scherenschnapp).
  - *Magma-Spur:* Hinterlässt alle 0.5s Lavapool (20px Radius, 1.5s Dauer, 0.5 Schaden/s drin, 3px orange glow).
  - *Hitzeschild:* Erste 2 Treffer werden reflektiert (Projektil explodiert nahe ihr für kleinen AoE). Danach normal angreifbar.
- **Spezialfähigkeit:** *Überhitzung* — Bei < 25% HP: beginnt sie zu überhitzen (leuchtet hell), und explodiert nach 3s (Radius 80px, 3 Schaden). Erkennbar: immer intensiver leuchtendes Orange, Geschwindigkeit sinkt.
- **Visuelle Effekte:** Magma-Trail: orange-rote Kreise mit Glow. Hitzeschild: weißer Feuerfunken bei Treffer. Überhitzungs-Puls: schnell stärker leuchtend.
- **Spawn:** Ebene 31–45
- **Balancing:** 7 HP, 1.5 Schaden, Magma-Spur 0.5s

---

#### [N-21] FEUERFISCH *(ausgearbeitet)*
- **Rolle:** Feuer-Kamikaze / Brennpunkt-Ersteller
- **Aussehen:** Fischform, Körper besteht aus gefrorenem Magma, glüht orange-rot. Wenn er auf Angriffsfahrt geht, wird er heller und hinterlässt Feuerspur.
- **KI-Verhalten:**
  - Wie Leuchtfisch, aber mit Feuerspur während des Rushs (1s, je 20px Brennzone).
  - Explosion stärker (Radius 100px, 3 Schaden).
  - *Feuerkreis beim Tod:* Hinterlässt 4 Feuerpfützen gleichmäßig verteilt (2.5s Dauer).
- **Spezialfähigkeit:** *Überhitzung:* Wird er zweimal in kurzer Zeit getroffen (< 1s), beschleunigt er doppelt schnell (Panik-Rush).
- **Visuelle Effekte:** Feuerspur: orange-gelbe Partikellinien. Explosion: massiver rotorangefarbener Burst, Hitzewelle-Wellenlinie.
- **Spawn:** Ebene 31–50
- **Balancing:** 3 HP, 3 Schaden (Explosion), Rush-Speed 0.1x

---

#### [N-22] STINGRAY *(verbessert)*
- **Rolle:** Schneller Flanker / Stromschlag
- **Aussehen:** Rochenkörper (diamond-shape), goldgelb, elektrischer Schweif. Elektrische Arcs um den Körper wenn Spezialfähigkeit aktiv.
- **KI-Verhalten (verbessert):**
  - *Schnelle Kurven:* Bewegt sich in weiten Bögen durch den Raum, ähnlich wie Nadelrochen aber schneller und näher an Wände.
  - *Schweifangriff:* Bei Spieler unter 100px: Dreht sich, Schweif schlägt aus (140px Arc, 1.5 Schaden + 0.3s Stun). Erkennbar: Schweif leuchtet gelb 400ms vorher.
  - *Elektrostoß:* Alle 3s: schießt einen Elektroball (mittelschnell, 0.4x, 1 Schaden, bei Treffer 0.5s Stun).
- **Spezialfähigkeit:** *Elektrisches Feld* — Alle 6s aktiviert er für 2s ein Feld um sich (60px Radius, 0.5 Schaden/s wenn drin, Spieler-Steuerung "zittert"). Erkennbar: helle gelbe Pulsringe um ihn.
- **Visuelle Effekte:** Elektrische Arc-Effekte um den Körper. Schweif: gelb leuchtende Welle. Elektroball: gelber Orb mit kleinen Blitzen.
- **Spawn:** Ebene 33–50
- **Balancing:** 5 HP, 1.5 Schaden (Schweif), 1 Schaden (Elektroball)

---

#### [N-23] SEA DRAKE *(verbessert)*
- **Rolle:** Drachen-Presser / Feuer-Atemattacker
- **Aussehen:** Schlangendrachen-Form (lang, mit kleinen Flossen-Flügeln). Dunkelrote Schuppen. Mund leuchtet orange-rot wenn Atemangriff kommt. Majestätich.
- **KI-Verhalten (verbessert):**
  - *Umkreis-Presser:* Kreist den Spieler in 140–180px Radius, sucht Lücke.
  - *Feueratem:* Alle 2.5s: Kurzer Feuerstrahl (Länge 120px, Breite 25px, 800ms Dauer) auf aktuelle Spielerposition. Erkennbar: Mund leuchtet intensiv 500ms vorher + kurzes Vor-Pusten (kleiner Pre-Flamejet).
  - *Körper-Ramme:* Als Angriff Nr. 2 (abwechselnd): kurzer Direktanlauf (charge 600ms), 2 Schaden.
  - *Phase 2 (< 40% HP):* Feueratem gleichzeitig mit Körper-Ramme (kombinierter Angriff).
- **Spezialfähigkeit:** *Flammenlasso* — Einmal pro Kampf: legt einen Feuerring um den Spieler (Radius 60px schrumpft auf 0 in 2.5s). Spieler muss raus. Erkennbar: kreisende Feuerfunken kündigen Ring an.
- **Visuelle Effekte:** Feueratem: oranger Partikelstrahl mit Heatwave-Verzerrung. Flammenlasso: rotierender Feuerring. Phasechange: rote Aura-Puls.
- **Spawn:** Ebene 35–50
- **Balancing:** 8 HP, 2 Schaden, Feueratem 2500ms

---

#### [N-24] LAVABORWURM *(neu)*
- **Rolle:** Unterirdischer Überrascher / Positionsstörer
- **Aussehen:** Wumartige Form, segmentiert. Im Boden unsichtbar. Wenn er auftaucht: breiter Maul mit rotglühendem Schlund. Dunkelbraun-rot.
- **KI-Verhalten:**
  - *Unterirdisch:* Startet unsichtbar. Bewegt sich unter dem Boden auf Spielerposition zu (Bewegung sichtbar als kleines Rumble-Effekt am Boden wenn < 100px).
  - *Auftauchzeit (2s):* Taucht an Spielerposition (leichte Verzögerung geplant) auf: Schaden 2 beim Auftauchen (50px Radius) + kurzer Zahn-Angriff.
  - *An der Oberfläche (3s):* Kämpft normal (Kontaktdruck). Dann taucht er wieder unter.
  - *Mehrfach-Auftaucher:* Kann mehrmals auftauchen, versucht immer eine anderen Position.
- **Spezialfähigkeit:** *Magmageysir* — Beim Untertauchen: hinterlässt er einen Geysir (2s Timer → Geysir schießt hoch, 60px Radius, 2 Schaden). Erkennbar: Boden leuchtet rot an der Stelle.
- **Visuelle Effekte:** Boden-Rumble: kleine Risse wenn er kommt. Auftauchen: Magma-Burst + Staubringe. Geysir: oranger Geysirstrahl.
- **Spawn:** Ebene 34–50
- **Balancing:** 6 HP, 2 Schaden (Auftauchen), Zyklus 2s/3s

---

#### [N-25] ASCHEGEIST *(neu)*
- **Rolle:** Wand-Phasierer / Unberechenbarer Stalker
- **Aussehen:** Geisthafte Form, aus Asche gemacht. Grau-schwarz, mit glühenden roten Kernen. Leicht transparent / smoky boundary.
- **KI-Verhalten:**
  - *Durch-Wände:* Kann durch Wände phasen (ignoriert Kollision). Teleportiert durch max. 2 Tile-Breite.
  - *Umzingelung:* Nutzt Wände aktiv, um hinter den Spieler zu kommen.
  - *Ascheausstoß:* Alle 2.5s: schießt 1 Aschewolke (mittel Geschwindigkeit, Radius 35px, 1 Schaden + 1s Sicht-verminderung 50%).
  - *Körperkontakt:* 1 Schaden, kleine Zeitverzögerung (Spieler reagiert 0.5s verzögert auf Input = Asche im Gesicht).
- **Spezialfähigkeit:** *Wand-Einsauger* — Einmal pro Begegnung: zieht den Spieler via Wand-Pull (keine tatsächliche Wand-Kollision, aber Magnetismus-Pull auf nächste Wand 80px). Sehr kurze Warnung.
- **Visuelle Effekte:** Flimmernd beim Durchphasen. Aschewolke: graue Partikelwolke. Körper-Rauch im Trail.
- **Spawn:** Ebene 37–50
- **Balancing:** 5 HP, 1 Schaden, Asche 2500ms

---

#### [N-26] VULKANTURM *(neu)*
- **Rolle:** Stationäre Gefahrenzone / Lava-Kanone
- **Aussehen:** Zylindrische Steinform, oben offener Krater. Dunkelbraun mit oranefarbenen Lavastreifen. Dreht sich langsam. Gibt immer Dampf ab.
- **KI-Verhalten:**
  - *Vollständig stationär* — Bewegt sich nie.
  - *Dauereruption:* Alle 3s schießt er 1 Lavakugel geradeaus (dreht sich um den Schuss auf Spieler auszurichten, 1s Drehn-Telegraph).
  - *Lavaregen-Aura:* Im 50px Radius um ihn ständig kleine Lavakugeln die runterregnen (0.3 Schaden/s wenn drin).
  - *Todesexplosion:* Beim Tod: Massive Eruption (150px Radius, 3 Schaden, 2s Lavapfützen ringsherum).
- **Spawn:** Ebene 40–50 (immer in Gruppen von 2–3, verteilt im Raum)
- **Balancing:** 8 HP, 1.5 Schaden (Lavakugel), 0.3 Schaden/s im Aura-Radius

---

---

## TEIL 2: ELITE-GEGNER (1 pro Ebene, einzigartig)

Jede Ebene hat genau **1 Elite** pro Raum (maximal). Elite-Gegner sind:
- Deutlich markiert: goldener/roter Outline oder Aura
- 2.5–3x mehr HP als Normal-Pendant
- 1 einzigartige Mechanik die normale Gegner nicht haben
- Müssen Telegraph-Signale geben (min. 400ms vor Angriff)

---

### BIOM 1 ELITES (Ebene 1–15)

| Ebene | Elite-Name | Basis-Typ | Einzigartige Mechanik |
|-------|-----------|-----------|----------------------|
| 1 | **Alter Wächter** | Steinkrabbe xxl | Setzt alle 8s einen Steinkreis um sich (Käfig für 2s, Spieler muss schnell raus). HP: 8 |
| 2 | **Giftqualle** | Qualle | Hinterlässt giftige Schleimspur + beim Platzen giftige Wolke (3s, 0.3/s Schaden). HP: 6 |
| 3 | **Berserker-Muräne** | Muräne | Nach dem Dash: bleibt visible & chaset weiter (3s wut-modus), 3x Schaden. HP: 10 |
| 4 | **Gepanzerter Seeigel** | Seeigel | Feuert 5 Stacheln gleichzeitig im Kreis PLUS rollt auf Spieler zu wenn < 50% HP. HP: 10 |
| 5 | **Tintenfürst** | Tintenfisch | Spawnt 3 normale Tintenfische (1 mal). Riesige Tintenwolke (150px) die 5s hält. HP: 8 |
| 6 | **Schattenklinge** | Schattenfisch | Teilt sich sofort in 3 (nie 2). Alle 3 sind korrekte Schattenklinge (kein fake) — müssen alle getötet werden. HP: 14 total |
| 7 | **Granitriese** | Steinwächter | Schockwelle 2x größer, spawnt 3 Mini-Steinwächter (3 HP je) nach 1. Phasentod. HP: 22 |
| 8 | **Nadelmeister** | Nadelrochen | Feuert alle 0.8s statt 1.8s. Zusätzlich: homing-Nadeln (dreht nach dem Schuss Richtung Spieler). HP: 8 |
| 9 | **Geisten-Zwilling** | Geisterkrabbe | 2 Geisterkrabben die gleichzeitig aktiv sein können. Koordinieren Angriffe (1 hält Spieler fest, 2. schlägt). HP: 7 je |
| 10 | **Doppelgänger-Fisch** | Schattenfisch | Kopiert kurz die Farbe/Form des Spielers (1s), danach Angriff von innen (sehr überraschend). HP: 12 |
| 11 | **Frostkoloss** | Eiskrabbe | Freeze-Aura permanent 80px. Hinterlässt Eiswände beim Gehen (blockiert temporär). HP: 18 |
| 12 | **Blizzardserpent** | Frostmuräne | Dash friert ALLE Gegner + Spieler kurz ein (300ms globaler Freeze, Spieler kriegt kurz 0.5 Schaden). HP: 14 |
| 13 | **Tiefseekoloss** | Oktopus | Tentakel sind 200px lang und greifen gleichzeitig 3 Richtungen an. Sauger am Ende erhöhen Zugkraft auf Spieler. HP: 16 |
| 14 | **Kristallriese** | Gletscherschildkröte | Wirft alle 4s Eisbrocken (30px Radius, 2 Schaden + 2s große Eiszone). HP: 28 |
| 15 | **Vorhüter des Steinkönigs** | Steinwächter + | Mini-Boss-Charakter: 4 Phasen, spawnt nach Phase 1 Muränen, nach Phase 2 Steinkrabben, Phase 3 alle zusammen. HP: 35 |

---

### BIOM 2 ELITES (Ebene 16–30)

| Ebene | Elite-Name | Basis-Typ | Einzigartige Mechanik |
|-------|-----------|-----------|----------------------|
| 16 | **Frosterst-Geist** | Shadowfish + Frost | Blinkt durch Wände + hinterlässt Frostfeld an jeder Teleport-Position. HP: 10 |
| 17 | **Eishammer-Krabbe** | Eiskrabbe xxl | Schlägt einmal mit massiver Schere: 200px Schockwelle aus Eis (wie Steinwächter aber Eis). HP: 14 |
| 18 | **Schneesturm-Oktopus** | Oktopus + Frost | Tentakel-Angriff kühlt Spieler ein (2s 50% Slow). Alle 5s: Schneesturm (Screen-Shake + alle Gegner heilen 1 HP). HP: 18 |
| 19 | **Frostmurä-Zwilling** | Frostmuräne x2 | Zwei Frostmuränen die aus gegenüberliegenden Seiten dashen. Gleichzeitiger Treffer: 4s Full-Freeze. HP: 10 je |
| 20 | **Permafrost-Wächter** | Gletscherschildkröte | Erzeugt alle 3s eine Eismauer (blokiert Weg, 3s). Kann Spieler einschließen. HP: 24 |
| 21 | **Nordlichtfisch** | Frostqualle | Setzt periodisch Strahlen aus Nordlicht-Energie (AoE-Linien, 3 Richtungen, 400ms Dauer, 1.5 Schaden). HP: 10 |
| 22 | **Eiskristall-Golem** | Kristallspinne xxl | Riesig, schleudert Eiskristall-Brocken (160px Wurf, AoE beim Landen). HP: 22 |
| 23 | **Blizzard-Wyrm** | Frostmuräne | Lässt bei Dash 5 Eiskristall-Explosionen zurück (timed, 1x Schaden je). HP: 14 |
| 24 | **Frostgeist-Doppel** | Shadowfish x2 + frost | Zwei Shadowfish die Positionen tauschen (swapping blink). Schaden beim Tausch an beiden Positionen. HP: 9 je |
| 25 | **Tiefeiskoloss** | Gletscherschildkröte | Schlägt Boden: entstehen 3 zufällige Eissäulen (instakill Zone für 1.5s =  Spieler muss ausweichen). HP: 30 |
| 26 | **Frostnadelschütze** | Nadelrochen + Frost | Nadeln frieren ein (1s Slow), feuert 4er Burst statt 1. HP: 9 |
| 27 | **Kristall-Schildwächter** | Eiskrabbe | 4 rotierende Eiskristalle als Schild (jeder Treffer: 1 Kristall zerstört, Schild vollständig: kein Schaden möglich). HP: 18 |
| 28 | **Blizzardkönig** | Frostqualle xxl | Einmal pro Kampf: globaler Blizzard (Screen verdunkelt 3s, alle Gegner werden stärker für Dauer). HP: 20 |
| 29 | **Eispanzer-Drake** | + Eis-Modifikation | Drake mit Eispanzer (erst nach 3 Treffern beschädigt). Schweif friert 2s ein statt nur Slow. HP: 22 |
| 30 | **Borealer Kolosswächter** | Eiskrabbe + Gletscherschildkröte | Hybrid: hat Scheren UND Eisstoß + Frost-Aura. Mini-Boss vor Biom-3-Eingang. HP: 40 |

---

### BIOM 3 ELITES (Ebene 31–50)

| Ebene | Elite-Name | Einzigartige Mechanik |
|-------|-----------|----------------------|
| 31 | **Magmasprenger** | Explodiert in 3 Magma-Schrapnell bei 50% HP. Neustart mit 1/3 HP jeder Splitter. HP: 12 |
| 32 | **Feuerbeweger** | Teleportiert sich alle 2s zu einem Feuerpfützen im Raum. Kann bis zu 5 Feuerpfützen aktiv halten. HP: 10 |
| 33 | **Lavastrom-Aal** | Wie Sea Drake, hinterlässt permanente Lavaspur die Raum einschränkt. HP: 18 |
| 34 | **Glutgeist-Doppel** | Aschegeist x2, die durch Wände greifen und Positionen täuschen. HP: 12 je |
| 35 | **Lava-Schleuderer** | Wirft Lavabrocken (3 gleichzeitig, 80px Radius, 3s Lavazone). HP: 16 |
| 36 | **Vulkan-Kolosswurm** | Lavaborwurm xxl: größer, taucht 3x gleichzeitig auf verschiedenen Positionen auf. HP: 22 |
| 37 | **Brennender Wächter** | Steinwächter komplett mit Feuer-Aura (60px Dauerfeuer), Schockwelle = Feuer-Ring. HP: 26 |
| 38 | **Glutriese** | Magmakrabbe xxl: riesig, Explosionsmacht doppelt groß, Überhitzung schon bei 60% HP. HP: 20 |
| 39 | **Inferno-Spinner** | Baut Feuerstricke (wie Eisspinne aber Feuer): treffen = 2s Flammen-DoT 0.5/s. HP: 12 |
| 40 | **Feuerkrone-Drake** | Sea Drake mit 360°-Feuerring statt Strahl. Flammenlasso sofort bei Kampfbeginn. HP: 24 |
| 41 | **Aschesturm** | Aschegeist der einen wandernden Aschesturm hinter sich lässt (180px Pfad, folgt dem Geist 1s verzögert). HP: 14 |
| 42 | **Vulkanturm-Golem** | Vulkanturm der beweglich ist (langsam). Schuss alle 1s. HP: 24 |
| 43 | **Feuerseeschlange** | Lange Schlangenlinie (5 Segmente), jedes Segment macht Kontaktschaden. HP: 5 je Segment |
| 44 | **Lava-Phantom** | Wechselt alle 3s Position via Teleport, landet mit Magma-Splash. HP: 16 |
| 45 | **Glutkönig-Wächter** | Steinwächter mit doppelter Schockwellen-Kette + Feuerspawn (spawnt 2 Feuerfische nach jeder Schockwelle). HP: 32 |
| 46–50 | **Ascendant Elites** | Progressive Kombinationen aus allen Biom-3-Gegnern. Jede Ebene: eine weitere Fähigkeit hinzugefügt. HP: 35–50 |

---

## TEIL 3: BOSS-SYSTEM (vollständig überarbeitet)

---

### DESIGN-REGELN FÜR ALLE BOSSE

1. **Zwei klare Phasen** — Mindestens. Phase 2 muss sich anders ANFÜHLEN (nicht nur schneller).
2. **Telegraph immer** — Jeder Angriff: min. 400ms Vorwarnung (visuelle/akustische Andeutung).
3. **Begleit-Gegner aktiv** — Begleiter tun etwas Sinnvolles (heilen, tanken, stören), niemals nur driften.
4. **Einzigartiger Raum-Trick** — Jeder Boss verändert den Kampfraum auf irgendeine Weise.
5. **Fluchtmöglichkeit** — Alle schnellen Angriffe dürfen den Spieler nicht in unmögliche Situationen treiben (außer explizit als Mechanik gedacht).

---

### BIOM 1 BOSSE (Ebene 1–15)

---

#### BOSS 1 — RIESENKRABBE "GRANITKLAUE" *(Ebene 1)*
**Farbe/Form:** Massige Krabbe (3x normal), dunkelgrau mit roten Kratzern. Scheren leuchten rot wenn Angriff.

**Phase 1 (100%–60% HP):**
- *Charge (Telegraph: 600ms rotes Anleuchten der Scheren):* Rast auf Spieler zu. Trifft er eine Wand: Betäubung 0.5s (Schwachstelle).
- *Scherenklammer (Telegraph: 500ms, beide Scheren öffnen sich):* Schnappt zu. Spieler muss lateral ausweichen.
- *Steinstoß (alle 5s):* Schlägt Boden, schickt 2 Steinsegmente in L-Form-Wellen raus.

**Phase 2 (< 60% HP — Rücken kracht auf):
- Schalen-Rücken fällt weg → Kernbereich freigelegt → +50% Schaden erleidet, aber +50% Angriffsrate.
- *Doppelcharge:* Macht 2 Charges hintereinander ohne Pause.
- *Scheren-Rotation:* Dreht sich 360° mit ausgestreckten Scheren (2 Runden, Spieler muss springen/dodge).
- *Schnappklappe (Telegraph: 200ms — fast!):* Extrem kurze Vorlaufzeit. Einziger "unfairer" Move – aber klar erkennbar durch Screen-Shake 200ms vorher.

**Begleit-Gegner:** Keine bei Boss 1 (Tutorial-Character).

---

#### BOSS 2 — QUALLENKÖNIGIN "AURORAVEIL" *(Ebene 2) — PROBLEM BEHOBEN*
**Farbe/Form:** Riesige Qualle (2.5x), hellblau-violett, transluzent. Tentakel sehr lang (300px). Körper pulsiert rhythmisch.

**Phase 1 (100%–70% HP):**
- *Tentakel-Sweep (Telegraph: Tentakel richten sich 700ms aus):* 4 Tentakel in 120° fächern. Ausweichen durch die Lücken.
- *Spawn Quallenring (Telegraph: pulsiert 3x schnell):* Spawnt 3 Quallensprößlinge, aber MIT sinnvollem Verhalten:
  - **Begleiter-Verhalten FIX:** Sprößlinge spawnen als `kamikaze`-Typ (nicht mehr `drift`). Verfolgen aktiv den Spieler. Eine von ihnen hebt also nach dem Spawn an den Spieler zu rasen.
  - Nach 5s: Quallensprößlinge werden stärker (kurze Anzeige auf ihnen) und wechseln zu "Umzingelungs-KI" (Formation-Drift).
- *Tintenpuls (Telegraph: Körper wird kurz dunkler):* Radialer Tintenausstoß (100px Radius, Sicht-Dimming + 0.5 Schaden).

**Phase 2 (< 70% HP — Krone leuchtet auf):**
- *Tentakel-Falle (neu):* Legt 6 Tentakel als unsichtbare Minenfelder im Boden, die bei Betreten aufleuchten und reißen (300ms Telegraph nach Trigger).
- *Elektrischer Puls (neu):* Alle Sprößlinge laden sich elektrisch auf (gelb leuchten 1s) dann platzen sie als Elektro-Explosion (statt normaler Drift). Spieler hat 1s Zeit weg zu sein.
- *Verdunkelungsfeld:* Körper der Königin verdunkelt 60% des Screens für 2s (Telegraph: Pulsiert violett 800ms vorher).

**Phase 3 (< 30% HP — WÜTEND):**
- *Kontinuierliches Tentakel-Wirbeln:* Tentakel rotieren kontinuierlich.
- Alle Angriffe 30% schneller. Sprößlinge spawnen jetzt alle 8s.

---

#### BOSS 3 — STEINAAL "TIEFENBISS" *(Ebene 3) — PROBLEM BEHOBEN*
**Farbe/Form:** Langer Aal (lang + schmal, 4x Länge), dunkelgrün, Körper segmentiert. Jedes Segment macht Kontaktschaden.

**Phase 1 (100%–65% HP):**
- *Burrow (Telegraph: Boden vibriert 600ms, dann verschwindet der Aal):*
  - Aal gräbt sich ein. Nach 1.5s: NEUE MECHANIK: Ein Kreis am Boden zeigt **genau wo er auftaucht** (rotes Pulsen, 800ms vor Auftauchen). Der Spieler hat damit IMMER Zeit auszuweichen.
  - **PROBLEM BEHOBEN:** Alter Bug = kein Ausweichen-Fenster. Neues System: 800ms Telegraph-Kreis bevor Aal auftaucht.
  - Nach Auftauchen: normaler Körper-Rush weiter.
- *Salve (Telegraph: Aal öffnet Maul 500ms, dann 3 Salven mit 300ms Abstand):*
  - **PROBLEM BEHOBEN:** Salven hatten keine Vorlaufzeit. Neues System: Maul-Open 500ms Vorlauf sichtbar, dann Salven. Spieler hat genug Zeit für die ersten 2 zu seitwärts-dodgen.
  - Salve-Schüsse kommen jetzt in größeren Abständen (400ms statt 200ms zwischen Schüssen im Burst).
- *Körperschwung (Telegraph: zieht Schwanz zurück 400ms):* Schwingt den langen Körper horizontal = ein Bereich des Raums wird gefährlich.

**Phase 2 (< 65% HP):**
- *Schnell-Burrow:* Telegraph verkürzt auf 400ms (fair aber schneller). Taucht 2x auf statt 1x.
- *Gift-Salve:* Projektile hinterlassen Giftpfützen (1.5s, 0.3 Schaden/s). Sehr wichtig: Telegraph bleibt 500ms.
- *Körperspirale:* Aal kreist um Spieler im Radius 120px, enger werdend. Spieler muss ausbrechen vor er berührt.

---

#### BOSS 4 — KORALLENKÖNIG "SPEKTRALKORALLE" *(Ebene 4)*
**Farbe/Form:** Riesige Krabbenform mit majestätischen Korallen-Hörnern. Körper aus weißem Korall, biolumineszent.

**Phase 1:**
- *Fächerschuss (Telegraph: 4 Kristalle um ihn rotieren schneller 600ms):* 5 Projektile im Fächer.
- *Homing-Kobold:* 1–2 homing Projektile (drehen dem Spieler hinterher, telegraph: leuchten kurz orange).
- *Korallen-Barriere (neu, Telegraph: 800ms Boden-Leuchten):* Spawnt 3 Korallen-Säulen die den Raum teilweise blockieren (zerstörbar, 2 HP je, 5s Dauer).

**Phase 2 (< 50% HP):**
- *Fächerschuss-Doppel:* 2 Fächer gleichzeitig links und rechts.
- Korallen-Barrieren heilen sich (1 HP alle 2s) → muss aktiv zerstört werden.
- *Korallenregen (Telegraph: Körper flackert 700ms weiß):* 6 Korallen-Spitzen fallen vom Oberkante des Screens auf random Positionen (guter Preview durch rotes Kreuzmarker 600ms vorher).

---

#### BOSS 5 — HAMMERHAI "TITANFLOSSE" *(Ebene 5)*
**Farbe/Form:** Riesiger Hammerhai, grau-blau, Hammerkopf besonders betont. Schnell, aggressiv.

**Phase 1:**
- *Charge (Telegraph: Zieht Körper zurück, leuchtet grün 500ms):* Sehr schnell (0.12x), prallt von Wänden ab (3 Bounces).
- *Wallbounce-Salve:* 3 Projektile die von Wänden abprallen (2x). Telegraph: kleine Punkte erscheinen an den Bounce-Positionen (600ms vorher) damit Spieler Fluchtweg planen kann.
- *Doppelcharge (Phase-Switch-Vorzeichen):* 2 Charges in schneller Folge, kurz ziehen als Telegraph.

**Phase 2 (< 50% HP):**
- *Tornado-Flosse:* Dreht sich mit ausgestreckten Flossen (160px Radius, 2s). Telegraph: Körper rotiert 700ms vorher.
- *Fehlcharge:* Weitercharger wenn er die Wand trifft — nimmt keinen Stun mehr. Gefährlicher.
- *Echo-Mine:* Lässt bei Phase-2-Start 3 Shockwave-Minen im Raum (aktivieren wenn Spieler 50px nähert, 600ms Telegraph dann Schockwelle 80px).

---

#### BOSS 6 — SEESCHLANGEN-ZWILLINGE "SIBILIUS & VIPERUS" *(Ebene 6)*
**Konzept:** Zwei Bosse gleichzeitig. Spieler muss priorisieren.
**Farbe/Form:** Sibilius = lila/blau, Viperus = grün/gold. Beide schlangenmäßig, mittelgroß.

**Phase 1 (beide aktiv):**
- **Sibilius:** Spread-Angriff (Standard), hält Abstand.
- **Viperus:** Charge-Angriff, aggressiver Nahkämpfer.
- *Synergy:* Wenn Sibilius schießt, wirft er Projektile in die Richtung wo Viperus den Spieler hintreiben will.
- *Fusion (Telegraph: beide Körper leuchten gleichzeitig 800ms auf):* Beide verschmelzen temporär → riesige Serpente. 3s Dauer. Fusionierter Boss: charge + spread gleichzeitig. Dann trennen sie sich wieder.
- **Begleit-Gegner:** Viperus spawnt bei < 70% HP 2 Baby-Schlangen (AI: `ambush`, aktiv, verfolgen Spieler). FIX: Baby-Schlangen haben jetzt `ambush`-AI statt `drift`.

**Phase 2 (ein Boss stirbt, der andere enragt):**
- Stirbt einer → der andere wird 50% schneller, 70% mehr Schaden, nimmt eigene Angriffe doppelt so oft.
- Überlebender färbt sich im Sterbeblitz des Partners (lila wenn Viperus stirbt, grün wenn Sibilius stirbt).

---

#### BOSS 7 — ABGRUND-ANGLER "FINSTERNISAUGE" *(Ebene 7)*
**Farbe/Form:** Riesiger Anglerfisch, dunkelblau-schwarz. Riesige Angel-Led-Lure. Kaum sichtbar im eigenen Dunkelfeld.

**Phase 1:**
- *Dunkelfeld (Telegraph: Angellicht flackert 600ms):* Aktiviert Dunkel (nur 150px Sichtkreis um Spieler für 3s). Während Dunkel: taucht er überraschend nah auf (aber Silhouette sichtbar im Dunkel!).
- *Lure-Pull (neu, Telegraph: Angellicht bewegt sich langsam auf Position 700ms vorher):* Lure wirft sich an eine Position des Raums. Als sie landet: Saugkraft zieht Spieler 80px in Richtung Lure. Wenn Spieler innerhalb 40px: 1 Schaden.
- *Charge in Dunkel:* Charge-Angriff aber nur sichtbar als Schattenumriss. Sehr einschüchternd.

**Phase 2 (< 50% HP):**
- Dauerhaft 60% Dunkelfeld (nicht pulsierend — dauerhaft reduziert).
- *Scheinlures (neu):* Spawnt 3 Fake-Lures die alle ziehen. Echter Lure leuchtet etwas heller.
- *Salve im Dunkeln:* 5 Projektile aus Positionen die der Spieler möglicherweise nicht sieht.

---

#### BOSS 8 — GEZEITENWURM "WURMVATER" *(Ebene 8)*
**Farbe/Form:** Langer Wurm (6 Segmente, jedes unabhängig beschädigbar), dunkelgrün-braun. Bewegt sich wellenförmig.

**Segment-Mechanik:** Jedes Segment hat eigene HP (3 je). Werden 2+ Segmente zerstört, teilt er sich.
- *Gift-Spur:* Hinterlässt Giftspur (0.3 Schaden/s, 2.5s).
- *Burrow:* wie Steinaal, aber mit mehreren Auftauchpunkten gleichzeitig (je Segment ein Kreis). 
- *Segment-Slam (Telegraph: Segment leuchtet grün 500ms):* Einzelnes Segment schlägt auf Boden, kleine AoE.
- Phase 2: Getrennte Segmente können unabhängig angreifen.

---

#### BOSS 9 — NAUTILUS-MAGIER "SPIRALVOID" *(Ebene 9)*
**Farbe/Form:** Nautiloidform, violett-blau, Schale spiralförmig mit Runen. Im Uhrzeigersinn rotierend. Mystisch.

**Phase 1:**
- *Ring-Schuss (Telegraph: Schale dreht sich 1.5x schneller 700ms):* 10 Projektile im Vollkreis.
- *Schildorbs (Telegraph: 800ms Schild-Aufbauanimation):* 5 rotierende Schildkugeln (blockieren Projektile). Müssen zerstört werden (je 1 HP).
- *Wände spawnen (Telegraph: Boden leuchtet 600ms an bestimmten Linien):* 2 Wände erscheinen die Raum aufteilen (5s Dauer).

**Phase 2 (< 40% HP):**
- *Reverse Ring:* Ring läuft in entgegengesetzte Richtung nach dem Schuss (Spieler der gedodged hat kommt in zweiten Ring).
- *Gravitations-Vortex (Telegraph: lila Sog-Animation 800ms):* Zieht Spieler an + dreht ihn 270° (kurzer Orientierungsverlust).
- *Wand + Schildorbs gleichzeitig.*

---

#### BOSS 10 — KRISTALLDRACHE "GLITZERREAPER" *(Ebene 10)*
**Farbe/Form:** Drachen-Form (Seadrake ähnlich aber kristallin), helles Blau-Weiß, reflektierend. Sehr imposant.

**Phase 1:**
- *Kristallregen (Telegraph: kurze Kristalle erscheinen 700ms vorher am oberen Screen-Rand):* 8 Kristalle fallen von oben, Zielpositions-Marker 600ms vorher sichtbar.
- *Charge (Telegraph: 500ms):* Wie Boss 1 aber mit homing (korrekt nach dem Spieler korrekt).
- *Reflektionsschild (Telegraph: Kristalle um ihn rotieren schneller 600ms):* Reflektiert Spieler-Projektile 2s.

**Phase 2 (< 50% HP):**
- *Kristall-Spiegel-Explosion:* Beim Aktivieren: Kristall-Explosion die 8 Spiegel im Raum platziert. Jede Spielerkugel die einen Spiegel trifft wird reflektiert (Spieler kann sich selbst treffen!).
- *Kristallregen intensiver:* 12 Kristalle gleichzeitig.
- *Drachenflamme (neu) – Telegraph: Mund öffnet sich weitgehend 600ms:* Kristall-Atem-Strahl (200px länge, 25px Breite). Dreht sich 90° während Schuss.

---

#### BOSS 11–15: ÜBERBLICK (Mechanik-Highlights)

**Boss 11 — Phantom-Rochen:** Laser + Phasenshift (teleportiert sich), Phase 2: schickt Phantom-Kopien aus (1 echter Rochen, 2 Fakes — nur echter Treffer zählt).

**Boss 12 — Korallengolem:** Schockwelle + Aufspaltung in 4 kleine Golems. Kleine Golems müssen in bestimmter Reihenfolge sterben (falscher Kill = Golem explodiert = 2 Schaden). Ordnung angedeutet durch Leuchten-Timing.

**Boss 13 — Tintenfürst:** Tentakel-AoE + Tinten-Vernebelung + Vortex. Vortex zieht Spieler in Tintenwolke (kombinierter Mechanismus). Phase 2: Tentakel werden halbsichtbar (durch Tinte).

**Boss 14 — Geisterkapitän:** Boomerangs + Geister-Adds (Adds sind halb-transparent). Adds müssen getötet werden um Kapitän sichtbar zu halten (Adds verstecken ihn wenn sie leben).

**Boss 15 — Steinkönig (3 Phasen):**
- Phase 1: Schockwelle + Regen
- Phase 2: Charge + enraged Adds (jetzt richtig aggressiv)
- Phase 3: ALLES. Kombiniert alle Angriffe, Raum wird kleiner (Steinwände schließen sich ein).

---

### BIOM 2 BOSSE (Ebene 16–30): KURZÜBERBLICK

| Boss | Name | Mechanik-Highlights |
|------|------|---------------------|
| B16 | **Eisriese Polarkrake** | Tentakel frieren Raumbereiche ein. Raum wird Schritt für Schritt vereist. |
| B17 | **Blizzard-Wyrm** | Wurm-Mechanik + Blizzard der Screen-Partikel ausblendet. |
| B18 | **Frostphantin** | Phantom wie Boss 11 aber mit Freeze-Laser (2s einfrieren). |
| B19 | **Nordlicht-Magier** | Polar-Magie: Nordlicht-Strahlen aus 3 Ecken. Spieler muss durch schmale Safe-Zones. |
| B20 | **Eiskönig** | Finale des Biom 2. 3 Phasen. Phase 3: vollständige Screen-Vereisung (Spieler gleitet auf Eis, veränderte Controls). |
| B21 | **Gletschertitan** | Riesig, schlägt mit Eisfäusten. Jeder Schlag: Eispartikel bleiben 4s. Raum füllt sich mit Eis. |
| B22 | **Frostserpent-Zwillinge** | Wie Biom-1-Zwillinge aber Eis-Version. Fusion = Blizzard-Körper. |
| B23 | **Tiefseekristall** | Kristallform die sich dreht und Reflexionen abgibt (echte Reflexionen aus Spielerprojektilen). |
| B24 | **Polarlicht-Oktopus** | Tentakel die Nordlicht-Energie abgeben. In Tentakel stehen = langsam hineingezogen. |
| B25 | **Permafrost-Golem** | Golem der den Raum in Segmente aufteilt (Eiswände werden permanent). |
| B26 | **Eis-Drake** | Eisige Version des Sea Drake. Feueratem = Frost-Atem (friert Raumbereiche). |
| B27 | **Schneesturm-Angler** | Anglerfisch-Mechanic + Blizzard der alle Gegner verschleiert. |
| B28 | **Tundrawurm** | Größerer Wurm als B8, Segmente regenerieren sich wenn am Leben (muss schnell töten). |
| B29 | **Frostarchimago** | Nautilus-Magier + Eis: spawnt Eiswände + Frostorbs. Phase 2: Zeitverlangsamung. |
| B30 | **Der Ewige Frost** | Finale Biom 2. 4 Phasen. Letzter Akt: Screen komplett vereist, Spieler muss Lava-Mechanik (aus Biom 3-Preview) nutzen. *(Lore-Verbindung)* |

---

### BIOM 3 BOSSE (Ebene 31–50): KURZÜBERBLICK

| Boss | Name | Mechanik-Highlights |
|------|------|---------------------|
| B31 | **Magma-Koloss** | Tank-Boss: gepanzert, muss Rücken-Schwachstelle angreifen. Rotiert. |
| B32 | **Flammengeist-Zwillinge** | Feurige Version von Biom-1-Zwillinge. Fusion = Feuertornado. |
| B33 | **Inferno-Wyrm** | Wurm + Lava-Spur. Gesamter Raum füllt sich mit Lava (Spieler muss auf Plattformen bleiben). |
| B34 | **Aschevulkan** | Vulkan-Pilz-Form: Eruptions-Phasen, Spieler muss zwischen Deckungspunkten wechseln. |
| B35 | **Glutseele** | Aschegeist xxl: phasiert durch alles, Körperkontakt = sofort 2 Schaden. Schwer fassbar. |
| B36 | **Leviathan-Erwachen** | Erster Leviathan-Encounter (kleine Form). Körper so groß er füllt 30% des Raums. |
| B40 | **Vulkankönig** | Biom-3-Finale. 4 Phasen. Phase 4: Lava steigt auf, Spieler kämpft auf schrumpfender Insel. |
| B45 | **Abyssal-Vorbote** | Brücke zu Biom 4. Zeigt Void-Mechanik an: Teile des Raumes verschwinden (Void). |
| B50 | **Gezeitenkaiser** | Biom 3+4-Brücke. Kombiniert Lava + Void. Erste Void-Mechanik voll aktiv. |

---

## TEIL 4: CODE SPIRITS (Begleitersystem — vollständig überarbeitet)

### Was sind Code Spirits?

Code Spirits sind magische Begleiter-Wesen, die der Spieler als "Karten" im Dungeon findet (Drops von Bossen/Elites) oder via API-Generierung erstellt. Im Spiel begleiten sie den Spieler als aktive Kämpfer. Aktuell: 8 Spirits. Ziel: **20+ Spirits** (8 bestehend + 12 neue).

---

### BESTEHENDE SPIRITS (verbessert)

| ID | Name | Rolle | Verhalten FIX |
|----|------|-------|---------------|
| ritter_korall | Ritter Korall | Tank | FIX: Taunt-Aura wirklich aktiv — Gegner in 60px schlagen ihn statt den Spieler an. |
| schildkroete_magnus | Schildkröte Magnus | Tank | FIX: Setzt sich vor den Spieler wenn Schaden incoming (Positionierung verbessert). |
| qualle_luna | Qualle Luna | Heiler | FIX: Heilt auch sich selbst wenn < 20% HP. |
| seepferdchen_vita | Seepferdchen Vita | Heiler | FIX: AoE-Heal nur aktivieren wenn mindestens 2 Ziele unter 70% HP. |
| schwertfisch_razor | Schwertfisch Razor | DPS | OK — kein Fix nötig. |
| kugelfisch_boom | Kugelfisch Boom | DPS | FIX: Regeneriert schneller nach 3s (statt gleich). |
| hai_shadow | Hai Shadow | DPS | FIX: Crit-Anzeige (kleiner Funken beim Crit) implementieren. |
| wal_guardian | Wal Guardian | Tank | FIX: Schild-Bubble sichtbar um Spieler wenn aktiv. |

---

### NEUE SPIRITS (12 neue)

---

#### [S-09] ELEKTROAAL "VOLTIS"
- **Rolle:** DPS / Ketten-Elektro
- **Aussehen:** Schlanker Aal, permanent mit kleinen Blitzen umhüllt, gelblich-weiß.
- **Fähigkeit:** *Kettenblitz* — Schuss verfehlt kein Ziel wenn mehrere Gegner zusammenstehen (Blitz springt auf 2. Ziel in 80px). Schaden: 15, Ketten-Schaden: 8.
- **Spezial:** *Überspannung* — Alle 10s: schlägt auf Boden, Blitz radial 100px, 20 Schaden. Telegraph: Körper leuchtet 600ms weiß.
- **API-Variante:** Kann via API generiert werden: Prompt → "Ein elektrischer Aal der durch Wasser Blitze weiterleitet"
- **Fundort:** Drop von Boss 5+ oder `Rare` Card.

---

#### [S-10] NEBELGEIST "HAZEARA"
- **Rolle:** Support / Sicht-Kontrolle
- **Aussehen:** Geisthafte Quallen-Form, weißgrau, mit Nebel-Aura. Halb-transparent.
- **Fähigkeit:** *Nebelfeld* — Alle 8s: erzeugt 120px Nebelkreis um sich (Gegner-Sicht reduziert: Gegner greifen 50% langsamer an im Nebel). Dauer: 4s.
- **Spezial:** *Geisterform* — Kann durch Wände gehen (nutzt Flanke). Tank-Spirits profitieren: sie können besser Gegner abfangen.
- **Fundort:** Drop von Elites Ebene 6+.

---

#### [S-11] KORALLENGOLEM "BASALT"
- **Rolle:** Tank / Festungs-Barrier
- **Aussehen:** Massiger Golem aus Korallen aufgebaut. Langsam aber riesig. Pinkrot.
- **Fähigkeit:** *Korallenwall* — Alle 12s: Errichtet kurzfristig eine Korallenbarriere (120px Wand, 2s Dauer) zwischen sich und dem Gegner.
- **Spezial:** *Korallenrüstung* — 3 "Korallenplatten" als Schildpunkte: jeder Treffer entfernt eine vor dem eigentlichen HP. 3 kostenlose Einzeltreffer.
- **Fundort:** Drop von Boss 4 oder `Epic` Card.

---

#### [S-12] KLAPPERFISCH "CLAXON"
- **Rolle:** Support / Debuffer
- **Aussehen:** Skelettartiger Fisch, bröckelnde Schuppen, weiß-gelb. Klappert beim Bewegen.
- **Fähigkeit:** *Lärmattacke* — Alle 5s: schrill-lauter Schuss auf nächsten Gegner. Gegner döst 0.8s (keine Angriffe). Sichtbar: Schallwellen-Ring.
- **Spezial:** *Panikschrei* — Wenn Spieler < 2 HP: sofortiger Schrei der alle Gegner in 150px für 1.5s deutlich verlangsamt. 1x pro Raum.
- **Fundort:** Drop von Elites Ebene 3–8 (niedrig-Seltenheit, nützlich early).

---

#### [S-13] EISDRACHE "FROSTERLING"
- **Rolle:** DPS / Frost-Kontroller
- **Aussehen:** Mini-Drachen (Seadrake-Mini), Eis-Kristall-Schuppen, hellblau-weiß.
- **Fähigkeit:** *Frosthauch* — Schuss: Eiskegel (60px Kegel, 12 Schaden + 1s Slow). Cooldown: 2s.
- **Spezial:** *Blizzard-Burst (Legendär):* Alle 15s: Kleiner Eisblizzard (150px Radius, 1s, alle Gegner 0.5s eingefroren). Sehr mächtig.
- **Fundort:** `Legendary` Card. Drop von Boss 11+.

---

#### [S-14] LAVAROBBE "EMBOAR"
- **Rolle:** Tank / Feuer-Aura
- **Aussehen:** Robbenform aber mit Lava-Rüstung (geschmolzene Platten), dunkelrot-orange.
- **Fähigkeit:** *Feueraura* — Dauerhaft 40px Feuer-Aura: Gegner die nah kommen erleiden 0.3 Schaden/s. (Gut gegen Tank-Gegner die er ablenkt.)
- **Spezial:** *Magma-Stoß* — Alle 10s: RumpeltS auf nächsten Gegner zu, 30 Schaden + Knockback.
- **Fundort:** Drop von Boss 7+ oder `Rare` Card.

---

#### [S-15] NAUTILUS-LÄUFER "SPIREX"
- **Rolle:** DPS / Schnell-Angreifer
- **Aussehen:** Kleiner Nautilus yang rotierend. Schale spiralförmig, lila-golden.
- **Fähigkeit:** *Spiralschuss* — Feuert in einer spiralförmigen Bahn auf Gegner zu (trifft und umläuft sie dabei). 18 Schaden.
- **Spezial:** *Echo-Spirale* — Schuss teilt sich nach Treffer in 2 kleinere Spiralen (je 8 Schaden) die weiterfliegen.
- **Fundort:** `Epic` Card. Drop von Boss 9+.

---

#### [S-16] SCHIMMERFISCH "PRISMA"
- **Rolle:** Support / Buff-Geber
- **Aussehen:** Transparenter Fisch, regenbogenfarben schimmernd. Sehr klein und schnell.
- **Fähigkeit:** *Prismenfeld* — Alle 8s: Wirft einen Prismenfeld auf den Spieler (3s). Im Prismenfeld: Spieler-Projektile machen +25% Schaden.
- **Spezial:** *Schimmer-Ausweichen* — Wenn ein Gegner-Projektil den Spieler trifft (in 30px): Schimmerfisch fliegt kurz davor und stoppt 1 Projektil (1x/5s). Wie "Schutzreflex".
- **Fundort:** `Rare` Card, Drop jedes 5. Bosses.

---

#### [S-17] DEEPSEA-TITAN "ABYSSON" *(API-generierbar)*
- **Rolle:** Tank / Abyssal-Presser
- **Aussehen:** Wird via API generiert — Prompt: "Abyssaler Tiefseekoloss, Void-Tentakel, dunkel lila". Erscheint unterschiedlich je nach Generation.
- **Fähigkeit:** *Gravitationsfeld* — Alle 10s: Feld zieht alle Gegner 100px in Richtung Abysson. Dann 2s Festhaltung.
- **Spezial:** *Void-Schrei* — 1x/Kampf: Screen kurz schwarz, alle Gegner erleiden 5 Schaden.
- **Fundort:** Nur via API-Generierung (besonderer Unlock via Spielfortschritt). Einzigartig für jeden Spieler!

---

#### [S-18] GEISTERFISCH "REVENANT"
- **Rolle:** DPS / Durch-Wände-Angreifer
- **Aussehen:** Geisterhafter Fisch, blassblau, sieht halb through-the-ground aus. Gleitet sanft.
- **Fähigkeit:** *Geisterklinge* — Projektile gehen durch Wände und Gegner (Piercing). Leicht schwächerer Schaden (10).
- **Spezial:** *Rache-Geist* — Wenn ein anderer Spirit stirbt: Revenant bekommt für 5s +50% Angriffsgeschwindigkeit und Lebenssteal (20% des Schadens als HP zurück).
- **Fundort:** `Epic` Card. Drop von Boss 7+.

---

#### [S-19] GIFTSCHLANGE "VENENARA"
- **Rolle:** DPS / DoT-Spezialistin
- **Aussehen:** Schlanke Schlange, giftgrün mit schwarzen Streifen. Zischend animiert.
- **Fähigkeit:** *Giftbiss* — Alle 3s: Schuss der bei Treffer 3s Gifteffekt gibt (0.4 Schaden/s). Stacks bis zu 2x.
- **Spezial:** *Giftexplosion* — Stirbt ein Gegner mit doppeltem Gift-Stack: explodiert in 60px Giftwolke (5s, 0.3/s). Kettenreaktion möglich.
- **Fundort:** `Rare` Card. Drop jedes Biom-1-Bosses.

---

#### [S-20] ORAKELKRABBE "SIBYL" *(API-generierbar)*
- **Rolle:** Support / Hellseherin
- **Aussehen:** Via API generierbar — Prompt: "Mystische Krabbe mit Kristallkugeln, goldfarben, sehend". Unikat.
- **Fähigkeit:** *Prophezeiung* — Alle 12s: markiert kurz 2 Gegner rot die in den nächsten 3s angreifen werden (Vorwarnung dem Spieler).
- **Spezial:** *Kristallorakel* — 1x/Raum: zeigt alle Fallen und unsichtbaren Gegner im Raum für 3s (Muränen, Geisterkrabben etc. werden kurz sichtbar).
- **Fundort:** Nur via API-Generierung.

---

### API-GENERIERUNGSSYSTEM FÜR SPIRITS

**Konzept:** Spieler mit bestimmtem Spielfortschritt (z.B. Ebene 30+ erreicht) schaltet einen "Spirit Forge"-Slot frei. Dort kann er:
1. Einen Archetyp wählen (Tank / Heiler / DPS / Support)
2. Ein Thema eingeben (z.B. "Feuer", "Eis", "Dunkel", "Licht")
3. Optional: eine kurze Beschreibung

Die API generiert:
- Einen Namen
- Eine Text-Beschreibung der Fähigkeiten
- Einen Visual-Prompt (für Sprite-Generation falls gewünscht)
- Statblock (automatisch balanciert nach Spielerebene)
- Ein einzigartiges `specialValue`-Set

Generierte Spirits sind **einzigartig pro Run** oder permanent speicherbar (max. 2 gespeicherte API-Spirits gleichzeitig).

---

## TEIL 5: KI-VERHALTEN — VOLLSTÄNDIGE PATTERN-BIBLIOTHEK

---

### NEUE KI-PATTERN (zusätzlich zu bestehenden)

#### `predictive` — Vorausschauend
Anstatt auf aktuelle Position zu zielen: zielt auf Spielerposition + Velocity-Vektor * 500ms. Erschwert Ausweichen erheblich für erfahrene Spieler. Gut für Seeigel-Turrets ab Ebene 6.

#### `formation` — Schwarmintelligenz
Gegner in Gruppe (3+) koordinieren Positionen: einer kommt frontal, einer links, einer hinten. Aktualisiert Formation alle 2s. Gut für Quallen-Gruppen.

#### `ambush_static` — Aufgestellte Falle
Gegner ist komplett still bis Spieler auf Triggerdistanz kommt (60px). Dann sofortiger Dash ohne pre-animation. Nur 250ms Telegraph (Körper-Zucken). Risiko: SEHR überraschend, daher nur für erfahrene-Ebenen (5+).

#### `berserker` — Berserk-KI
Gegner läuft unaufhaltsam in Spielerrichtung (keine Flank, keine Cleverness), aber mit 2x Geschwindigkeit. Ignoriert alles außer dem Spieler. Gut für "Wut-Phase" niedrig-HP-Gegner.

#### `patrol_hunt` — Patrouilleur
Circlet eine feste Route durch den Raum (zufällig generiert per Chunk), bis der Spieler in Sichtweite (200px). Dann Chase-Mode.

#### `coordinated_ranged` — Koordinierter Fernkämpfer
Mehrere Turret-Gegner koordinieren Feuerzeitpunkte: sind 2+ im Raum, feuern sie abwechselnd (damit Spieler kein "safe window" findet). Guter Stressfaktor ohne unfair zu sein.

#### `leash` — Leinenreißer
Gegner darf sich max. 200px vom Spawnpunkt entfernen. Kehrt zurück wenn er weiter geht. Schafft verteidigte Zonen statt freie Verfolgung.

---

## TEIL 6: BEKANNTE PROBLEME — FIXIT-LISTE

---

### PROBLEM 1: Boss 2 — Begleiter tun nichts *(KRITISCH)*

**Grund:** `spawn_adds` spawnt immer `qualle` mit `drift`-AI. Quallensprößlinge einer Quallenkönigin sollten aggressiv und koordiniert sein.

**Fix-Plan:**
- Quallenkönigin-Adds spawnen als Mix: `kamikaze`-Typ (2 von 3) und `flee`-Typ (1 von 3, hält Abstand, erinnert an Mini-Quallenkönigin).
- Adds Level-skaliert: Ebene 2 = 2 HP, Ebene 17 (Eis-Version) = 4 HP.
- Adds wechseln nach 5s in Formation-Drift (umzingeln).

---

### PROBLEM 2: Boss 3 — Salve kein Ausweichen-Fenster *(KRITISCH)*

**Grund:** `salve` feuert Projektile in 200ms Abstand. Bei 3 Projektilen: 600ms total. Zu schnell ohne Telegraph.

**Fix-Plan:**
- Salve-Telegraph: Aal öffnet Maul (neue Animation mögl.) + gelbe Leuchtpunkte markieren kommende Projektile 500ms vorher auf Boss-Position.
- Projektilabstand erhöhen: 400ms (statt 200ms) = 1.2s total für 3 Projektile.
- Projektilgeschwindigkeit leicht reduzieren: 0.45x (statt 0.55x). Spieler mit normaler Bewegung kann auf Seite dodgen.

---

### PROBLEM 3: Alle Gegner rollen nur auf Spieler zu *(MITTEL)*

**Fix-Plan:**
- Jeder Gegner-Typ bekommt ein zweites Verhaltensmuster (wie Vorlage oben).
- Implementierung schrittweise: zunächst 4–5 Gegner mit neuer KI, dann Rest.
- Priorität: `qualle` (formation), `steinkrabbe` (sidestep), `seeigel` (flee wenn nahe), `tintenfisch` (predictive retreat).

---

### PROBLEM 4: Elites haben keine visuelle Unterscheidung *(MITTEL)*

**Fix-Plan:**
- Alle Elite-Gegner: goldener/roter Outline (2px Glow-Effekt).
- Kleine Icon-Plakette über dem Kopf: `⭐` für Elite.
- Modifier-Tag unter HP-Balken: z.B. "🔴 Explosiv", "🟡 Schnell", "🟢 Regeneriert".

---

### PROBLEM 5: Code Spirits stehen herum *(KRITISCH)*

**Fix-Plan:**
- Tank-Spirits: aktive Positionierung zwischen Spieler und Gegner. Taunt-Mechanik wirklich funktionierend.
- Healer-Spirits: folgen dem Spirit/Spieler mit niedrigsten HP. Nicht fixed-follow dem Spieler.
- DPS-Spirits: Priorisierung: zuerst Elite/Boss, dann normalste nahe Gegner.
- Alle Spirits: minimum 1 Angriff alle 3s (kein "steht herum").

---

## TEIL 7: BALANCING-MATRIX

---

### HP / Schaden Übersicht (Normalgegner)

| Gegner | HP | Schaden | Speed | Ebenen | Gefährlichkeit |
|--------|-----|---------|-------|--------|----------------|
| Qualle | 2 | 1 | 0.035 | 1–6 | ⭐ |
| Steinkrabbe | 3 | 1 | 0.045 | 1–8 | ⭐⭐ |
| Leuchtfisch | 2 | 2 (Expl.) | 0.07r | 1–12 | ⭐⭐ |
| Seeigel | 4 | 1 | — | 2–15 | ⭐⭐ |
| Muräne | 4 | 2 | 0.15 | 3–15 | ⭐⭐⭐ |
| Panzerfisch | 6 | 1 | 0.03 | 5–15 | ⭐⭐⭐ |
| Tintenfisch | 3 | 1 | 0.05 | 6–15 | ⭐⭐ |
| Steinwächter | 10 | 2 | 0.02 | 8–15 | ⭐⭐⭐⭐ |
| Geisterkrabbe | 3 | 1 (2x) | var. | 6–14 | ⭐⭐⭐ |
| Nadelrochen | 3 | 1.5 | var. | 4–15 | ⭐⭐⭐ |
| Schattenfisch | 4 | 1 | 0.09 | 7–15 | ⭐⭐⭐ |
| Korallenrüstling | 3 | 1 | 0.03 | 9–15 | ⭐⭐ (+ Buff) |
| Eiskrabbe | 7 | 1+Freeze | 0.04 | 16–30 | ⭐⭐⭐ |
| Frostqualle | 3 | 0.5+DoT | 0.04 | 16–25 | ⭐⭐ |
| Oktopus | 6 | 1–1.5 | 0.03 | 16–28 | ⭐⭐⭐⭐ |
| Shadowfish | 4 | 1 | 0.08 | 18–30 | ⭐⭐⭐ |
| Frostmuräne | 5 | 1.5+Freeze | 0.15 | 19–30 | ⭐⭐⭐⭐ |
| Gletscherschildkröte | 14 | 2+KB | 0.015 | 22–30 | ⭐⭐⭐⭐ |
| Kristallspinne | 4 | 1–1.5 | 0.05 | 20–30 | ⭐⭐⭐ |
| Magmakrabbe | 7 | 1.5 | 0.04 | 31–45 | ⭐⭐⭐ |
| Feuerfisch | 3 | 3 (Expl.) | 0.10 | 31–50 | ⭐⭐⭐ |
| Stingray | 5 | 1.5+Stun | var. | 33–50 | ⭐⭐⭐⭐ |
| Sea Drake | 8 | 2 | var. | 35–50 | ⭐⭐⭐⭐ |
| Lavaborwurm | 6 | 2 | var. | 34–50 | ⭐⭐⭐⭐ |
| Aschegeist | 5 | 1+Delay | var. | 37–50 | ⭐⭐⭐ |
| Vulkanturm | 8 | 1.5 | — | 40–50 | ⭐⭐⭐ |

---

### Zusammenfassung Zahlen

| Kategorie | Aktuell | Geplant |
|-----------|---------|---------|
| Normale Gegner | 8 | 26 (+Biom 4/5 noch offen) |
| Elite-Typen | 1 (Steinwächter) | 1 pro Ebene = 50 unique Elites |
| Bosse (definiert) | 15 | 50 (B1–B50) |
| Code Spirits | 8 | 20 |
| KI-Pattern | 8 | 15 |

---

## ANHANG: SPRITE-GENERATION PROMPTS

Für neue Gegner die noch kein Sprite haben:

```
Geisterkrabbe: "A translucent blue ghost crab, barely visible, rimlit, ocean dungeon aesthetic, 64x64, top-down sprite, transparent background"

Nadelrochen: "A dark grey stingray with a glowing red belly organ, sleek, needle-shaped dorsal spine, ocean dungeon aesthetic, 64x64 sprite"

Schattenfisch: "A shadowy dark fish with purple accents, blurred edges suggesting speed, ocean dungeon aesthetic, 64x64 sprite"

Korallenrüstling: "A pink-red fish with a coral crown growth on its back, glowing front organ, ocean dungeon aesthetic, 64x64 sprite"
```

---

*Ende des Erstentwurfs v1. Zur kritischen Prüfung durch Sub-Agenten.*
