# DUNGEON DESIGN — Finales Konzept (v2 FINAL) — TEIL 1
# Gegner, Elites, Spieler-Referenz
> Datum: 26.02.2026 | Überarbeitet nach Sub-Agent-Kritik
> Teil 2: Bosse, Spirits, KI-Pattern, Raum-Layout, Balancing

---

## ABSCHNITT 0: SPIELER-REFERENZ *(neu — Pflicht für Balancing)*

> Alle HP-, Schaden- und Telegraph-Zeiten beziehen sich auf diese Basis.

| Parameter | Wert | Notiz |
|-----------|------|-------|
| Spieler max. HP | 10 | Standard-Start |
| Spieler Schaden (Projektil) | 1 | Aufwertbar via Academy |
| Spieler Bewegungsgeschwindigkeit | 0.28 px/ms | Aus `dungeonConstants.js` |
| Dash vorhanden? | **NEIN** (aktuell) | Kein Dash-Move im aktuellen Code |
| Invulnerabilitätsfenster nach Treffer | 1000ms | `INVULN_DURATION` |
| Angriffsreichweite | 120px | `ATTACK_RANGE_PX` |
| Projektilgeschwindigkeit | 0.55 px/ms | `PROJECTILE_SPEED` |
| Angriffsrate | 350ms Cooldown | `ATTACK_COOLDOWN_MS` |

**Wichtige Konsequenz (kein Dash):**
Da der Spieler KEINEN Dash hat, gelten folgende Telegraph-Mindestzeiten:
- Schnelle Angriffe: **min. 500ms** Telegraph (Spieler muss laufen, kein Dodge-Burst)
- Sofortangriffe (ambush_static): **min. 400ms** (Zucken-Vorzeichen immer sichtbar)
- Instakill-Zonen: **Niemals** — alle "Instakills" werden zu 3-Schaden-Treffern umgewandelt
- Statuseffekt-Stacks: Maximal 2 gleichzeitig (siehe Abschnitt 0b)

### 0b — Statuseffekt-Budget *(neu)*

Spieler kann maximal **2 Statuseffekte gleichzeitig** tragen. Kommt ein dritter, wird der älteste ersetzt.
Prioritätshierarchie (höherer Wert ersetzt immer niedrigeren):

| Priorität | Effekt | Dauer | Spieler-Effekt |
|-----------|--------|-------|----------------|
| 5 (höchste) | **Freeze** | 0.3–0.5s | Kompletter Input-Stopp |
| 4 | **Stun** | 0.2–0.4s | Input-Blackout, kürzer |
| 3 | **Input-Delay** | 0.5s | Steuerung 300ms verzögert |
| 2 | **Slow** | 1–3s | Bewegung -30 bis -60% |
| 1 | **DoT** | 1.5–3s | 0.3–0.5 Schaden/s |
| 0 (niedrigste) | **Sichtreduktion** | 2–5s | Kamera-Dimming |

Freeze überschreibt immer alle anderen Effekte.
Nach Ende jedes Statuseffekts: 200ms Immunität gegen denselben Effekt-Typ.

---

## ABSCHNITT 1: BIOM-SYSTEM

| # | Biom | Ebenen | Atmosphäre | Leit-Farbpalette |
|---|------|--------|------------|-----------------|
| 1 | **Steinverliese** | 1–15 | Alte verfallene Meeresfestung | Dunkelgrau, Moos, Kaltblau |
| 2 | **Eiskristallhöhlen** | 16–30 | Gefrorenes Tiefsee-Labor | Eisblau, Türkis, Weiß |
| 3 | **Vulkanfestung** | 31–50 | Unterwasser-Vulkankomplex | Orange, Asche, Rotglut |
| 4 | **Abyssal-Riss** *(neu)* | 51–70 | Dimensionsspalt, Void-Energie | Void-Lila, Schwarz, Blitzweiß |
| 5 | **Korallen-Nekropolis** *(neu)* | 71+ | Verfallenes Korallenreich | Blutrot, Goldnekrose, Dunkelblau |

### Raum-Layout-Typen *(neu — kritisch für KI-Sinnhaftigkeit)*

Jeder Raum im Dungeon gehört zu einem dieser 5 Typen. Diese Typen bestimmen welche Gegner spawnen dürfen:

| Typ | Beschreibung | Erlaubte Gegner-Spezialen |
|-----|-------------|--------------------------|
| **Offene Arena** | Großer freier Raum, wenig Hindernisse | Formation-KI, Bosse, große Elites |
| **Verwinkelt** | Viele Ecken und kurze Korridore | Muräne, Geisterkrabbe, Ambush-Typen |
| **Säulenraum** | Freier Raum mit 4–8 Säulen als Deckung | Seeigel, Nadelrochen, Tintenfisch |
| **Korridor** | Langer schmaler Raum | Steinkrabbe, Panzerfisch, Schattenfisch |
| **Split-Arena** | Zwei verbundene Räume / Brücke | Zwillings-Bosse, koordinierte Fernkämpfer |

**Spawn-Regeln:**
- Muränen & Geisterkrabbe: **nur** in Verwinkelt oder Säulenraum
- Formation-Quallen (3+): **nur** in Offener Arena
- Lavaborwurm: **nie** in Korridor (zu eng für Auftauch-Mechanik)
- Gletscherschildkröte: **nur** in Offener Arena oder Split-Arena

---

## ABSCHNITT 2: NORMALE GEGNER — BIOM 1 (Ebene 1–15)

### Design-Prinzipien für alle Normalgegner
- Jeder Typ hat **eine Kernrolle** die ihn von allen anderen unterscheidet
- Jeder Typ hat neben Direktbewegung **mindestens ein zweites Verhaltensmuster**
- Telegraph-Mindestzeit wegen kein Dash: **500ms** für Dash-Angriffe, **350ms** für Projektile

---

### [N-01] QUALLE
- **Rolle:** Flächenfüller / Schwarmdruck
- **Aussehen:** Halbkugel-Körper (Ø 20px), pulsiert rhythmisch. Hellblau, 3–4 Tentakel hängen unten ab. Glüht stärker wenn auf Spieler ausgerichtet.
- **Kern-KI:** `drift` (verbessert) — driftet nicht mehr komplett zufällig, sondern zeigt Magnetismus Richtung Spieler (Sinus-Kurve, leicht ausweichend)
- **2. Verhalten:** `formation` — Ab 3 Quallen im Raum: synchronisieren sich und umzingeln langsam. Je 1 frontal, 1 links, 1 rechts. Bildung aktualisiert alle 2s.
- **Spezialfähigkeit:** *Druckwelle* — Wird sie getroffen, expandiert 300ms nach Invuln-Ende ein kleiner Ring (20px Radius, 0.5 Schaden). Erkennbar: Körper leuchtet nach Treffer 300ms weiß.
- **Visuelle Effekte:** Körper pulsiert (scale 1.0 → 1.1 → 1.0, Takt 1.2s). Treffer: orangefarbener Blitz + 4 kleine Partikel.
- **Spawn:** Ebene 1–12 (Hauptgegner 1–6)
- **HP:** 2 | **Schaden:** 1 | **Speed:** 0.035

---

### [N-02] STEINKRABBE
- **Rolle:** Nahkampf-Blocker / Lane-Controller
- **Aussehen:** Breite flache Krabbe (28x18px), dunkelbraun mit orangeroten Flecken. Bewegt sich seitlich. Scheren klappen auf kurz vor Angriff.
- **Kern-KI:** `ground` (verbessert) — bewegt sich schräg (nicht frontal) auf Spieler zu, wechselt alle 1.5s die Flanke
- **2. Verhalten:** Scherenschnapp unter 80px (500ms Telegraph: Scheren öffnen sich) → Kurzdash 200px, danach 600ms Cooldown
- **Spezialfähigkeit:** *Frontalpanzerung* — Die Vorderseite absorbiert 60% Schaden. Seitlich oder von hinten: voller Schaden. Erkennbar: Körpervorderseite hat dunklere Schuppentextur.
- **Rückzugsverhalten:** Bei HP < 30%: weicht 1s zurück (gibt Spieler Fenster), dann erneuter Angriff.
- **Visuelle Effekte:** Scheren-Open-Animation 150ms vor Schnapp. Kleines Staub-Partikel bei Landen.
- **Spawn:** Ebene 1–12 (Korridor + Verwinkelt bevorzugt)
- **HP:** 3 | **Schaden:** 1 | **Speed:** 0.045

---

### [N-03] LEUCHTFISCH
- **Rolle:** Kamikaze / Timing-Stresselement
- **Aussehen:** Kleiner Fisch (16px), leuchtendes Organ an Stirn (helles GelbWeiß). In Ladephase: Organ wechselt zu kräftig Orange-Rot, Körper zittert sichtbar.
- **KI-Phasen:**
  1. *Lockphase (1.5s):* Taucht auf, bleibt still, Organ pulsiert langsam — Spieler-Hinweis
  2. *Ladephase (0.8s):* Zieht sich leicht zurück, Organ orange-rot, Zittern beginnt — **klar lesbar**
  3. *Jagdphase:* Rush auf letzte bekannte Spielerposition (Speed 0.09), Richtungskorrektur alle 200ms
  4. *Explosion:* Spieler < 30px ODER Timer 0 → Explodiert (80px Radius, 2 Schaden)
- **Wandtreffer:** Kleines Puff, kein Schaden, stirbt.
- **Spezialfähigkeit:** *Kettenblitz* — Explodiert in 100px eine andere Qualle/Leuchtfisch → die explodiert ebenfalls (max. 2 Kettenreaktionen). Erkennbar: kurze gelbe Linie zwischen ihnen 300ms vor Explosion.
- **Visuelle Effekte:** Auflade-Glow (Radial-Gradient). Explosion: voller Screen-Tint gelb (50ms) + Partikelring.
- **Spawn:** Ebene 1–12 (nie in Korridor wegen Kettenreaktion-Gefahr für Spieler)
- **HP:** 2 | **Schaden:** 2 (Explosion) | **Rush-Speed:** 0.09

---

### [N-04] SEEIGEL
- **Rolle:** Zone-Control / Turret
- **Aussehen:** Runde Kugel (Ø 22px), stachelig, dreht sich permanent (~1 Umdrehung/3s). Dunkelviolett, Stacheln hellviolett. Stacheln leuchten kurz vor Schuss gelb auf.
- **Kern-KI:** `turret` — stationär
- **2. Verhalten:** Kommt Spieler auf < 60px: langsames Ausweichen (0.02 Speed rückwärts) während weiter schießt
- **Schussmuster:** Alle 2.5s: 3 Stacheln in 90°-Fächer Richtung Spieler. Telegraph: Stacheln leuchten 350ms gelb.
- **Stachelfeld beim Tod:** 4 Stacheln am Boden (8px Radius, 800ms Lebensdauer, 1 Schaden bei Berühren). Erkennbar: Grün-gelber Blitz beim Tod.
- **Spawn:** Ebene 2–15 (Säulenraum bevorzugt — Deckung macht Abstand halten interessant)
- **HP:** 4 | **Schaden:** 1 (Stacheln) | **Schuss-Interval:** 2500ms

---

### [N-05] MURÄNE
- **Rolle:** Ambush-Attentäter
- **Aussehen:** Langer Schlangenkörper (48x12px), dunkelgrün mit weißem Bauch. Im Versteck: nahezu transparent (alpha 0.12). Augen leuchten rot beim Aktivieren.
- **Kern-KI:** `ambush` — wartet transparent, dash bei Nähe
- **Verbesserungen:**
  - Ankündigungs-Zucken (300ms) vor Dash — kurzes Flackern sichtbar
  - Dash auf letzte Spielerposition (450ms, Speed 0.45)
  - Retreat (600ms), dann aufgelöst zurück in Unsichtbarkeit
  - Ab Ebene 8: Combo-Muränen — 2 zusammen, eine wartet während andere dasht
- **Spezialfähigkeit:** *Wundschlag* — Trifft Dash den Spieler: 2s lang -20% Bewegungsgeschwindigkeit (Slow Priorität 2). Erkennbar: rote Partikelschlitze + Spieler leuchtet kurz rot.
- **Visuelle Effekte:** Transparenz-Fade 500ms. Dash: 3-Frame Bewegungsunschärfe (Trail). Augen-Glow verstärkt beim Aktivieren.
- **Spawn:** Ebene 3–15. **NUR in Verwinkelt und Säulenraum.** (Ambush braucht Versteckmöglichkeit)
- **HP:** 4 | **Schaden:** 2 | **Dash-Speed:** 0.45

---

### [N-06] PANZERFISCH
- **Rolle:** Frontblocker / Druckpresser
- **Aussehen:** Massiger Fisch (30x24px), grüne Panzerplatten auf Rücken. Leuchtet gelb bei Rempel-Angriff.
- **Kern-KI:** `tank` — langsamer konstanter Vormarsch Richtung Spieler, rotiert Panzer immer zum Spieler
- **Verbesserungen:**
  - Rempel unter 50px: kurzer Burst (200ms), schiebt Spieler 30px zurück
  - Bodenstomp alle 4s: 60px Radius, 1 Schaden + 200ms Input-Delay (Priorität 3). Telegraph: Boden-Leuchten 500ms vorher.
  - Wut < 30% HP: Speed +50% für 3s, aber Panzer öffnet sich = voller Schaden möglich
- **Spezialfähigkeit:** *Frontalpanzerung* — Vorne 60% Schadensreduktion (gleich wie Steinkrabbe, aber stärker).
- **Visuelle Effekte:** Stamping Partikel bei Bodenstomp. Wut-Modus: Körper pulsiert dunkelrot.
- **Spawn:** Ebene 5–15 (Korridor und Offene Arena)
- **HP:** 6 | **Schaden:** 1 | **Speed:** 0.03

---

### [N-07] TINTENFISCH
- **Rolle:** Controller / Fernhalter
- **Aussehen:** 8 Tentakel, lila Körper (22x22px), weiße Augen. Beim Tintenausstoß: dunkle Wolke hinter ihm.
- **Kern-KI:** `flee` (verbessert) — hält 120–200px Abstand, weicht predictiv aus (antizipiert Spielerbewegungsrichtung)
- **Verhalten:**
  - Tintencloud alle 4s auf Spielerposition (60px Radius, 2.5s Dauer, 70% Kamera-Dimming im Bereich)
  - Tentakelpeitsche unter 80px: 2 Tentakel schnellen kurz (120ms), 1 Schaden + 15px Knockback
  - Quallen-Ruf alle 6s: spawnt 1 Qualle wenn < 8 Gegner im Raum
- **Spezialfähigkeit:** *Unsichtbarkeitscloud* — Betritt Spieler die Tintenwolke: Tintenfisch selbst wird 1.5s unsichtbar (lila Outline bleibt). Spieler lernt: Tintenwolke vermeiden.
- **Visuelle Effekte:** Tintenwolke: dunkelblauer Radial-Gradient (alpha 0.7). Tentakelpeitsche: Linien die kurz aufblitzen.
- **Spawn:** Ebene 6–15 (Säulenraum bevorzugt — Versteckoptionen wichtig)
- **HP:** 3 | **Schaden:** 1 | **Ink-Interval:** 4000ms

---

### [N-08] STEINWÄCHTER *(Elite-Grundtyp)*
- **Rolle:** Elite-Tank / Raumkontrolle
- **Aussehen:** Groß (1.5x, ca. 42x42px), humanoidartige Fischform mit Steinplatten. Grüngrau, rote Augen. Boden "zittert" mit jedem Schritt (kleines Particle beim Aufsetzen).
- **Kern-KI:** `elite` — patrouilliert feste Bahn bis Spieler < 200px, dann Fokus
- **Verhalten:**
  - Schockwelle alle 3.5s: expandierender Ring (0–140px, 0.18 Speed). Telegraph: Boden-Leuchten in Kreisform 600ms vorher.
  - Phase 2 (< 50% HP): Zusätzlich 4 langsame Steine in Himmelsrichtungen nach jeder Schockwelle (Steine prallen 1x von Wand ab)
- **Spezialfähigkeit:** *Erdbeben-Aura* — 80px Radius: Spieler 25% Slow (Priorität 2). Sichtbar als leichte Bodenverzerrung (shimmer-Effekt).
- **Visuelle Effekte:** Schockwelle: grau-grüner Ring + Risslinien vom Zentrum. Steine: eckige graue Projektile.
- **Spawn:** Ebene 8–15 (nur Offene Arena)
- **HP:** 10 | **Schaden:** 2 | **Schockwelle:** 3500ms

---

### [N-09] GEISTERKRABBE *(neu)*
- **Rolle:** Unsichtbarer Lauerer
- **Aussehen:** Wie Steinkrabbe aber transluzent-bläulich. Im Invis-Zustand: minimale Outline erkennbar. Im aktiven Zustand: blauweiß schimmernd.
- **KI-Zyklus:**
  1. 3s unsichtbar — positioniert sich hinter Spieler
  2. 0.5s Materialisierung (Partikel sammeln sich zu Körper — sichtbare Warnung)
  3. 1.5s voll sichtbar + 2 schnelle Kneifangriffe (je 0.5 Schaden, 100ms Abstand)
  4. Zurück zu Unsichtbarkeit
- **Spezialfähigkeit:** *Geisterschritt* — Wird sie getroffen während sichtbar: sofortiger Rückzug in Unsichtbarkeit (3s Cooldown auf dieses Escape).
- **Visuelle Effekte:** Materialisierung: Partikelsammlung 300ms. Unsichtbarer Bewegungs-Trail: faint ghostly shimmer.
- **Spawn:** Ebene 6–14. **Nur in Verwinkelt** (Unsichtbarkeit braucht Ecken zum Positionieren)
- **HP:** 3 | **Schaden:** 0.5 (je Kneif) | **Zyklus:** 3/0.5/1.5s

---

### [N-10] NADELROCHEN *(neu)*
- **Rolle:** Distanz-Kiter / Nadelbeschuss
- **Aussehen:** Flacher Rochenkörper (diamond-shape, 28x20px), dunkelgrau. Rotes Bauchorgan pulsiert vor Schuss. Gleitet smooth gleichmäßig.
- **Kern-KI:** Kreist Spieler in 130–200px Radius ein (Kreisbewegung, prallt von Wänden ab auf neue Kreisbahn)
- **Verhalten:**
  - Alle 1.8s: 1 Nadel-Projektil direkt auf Spieler (2px breit, 14px lang, Speed 0.65). Telegraph: Bauchorgan leuchtet 150ms rot.
  - Wird er getroffen: weicht sofort auf neue Kreisbahn aus
  - Unter 40% HP: 3 Nadeln im 60°-Fächer (Salve). Erkennbar: Bauchorgan leuchtet doppelt so schnell.
- **Visuelle Effekte:** Nadeln: lange dünne orange-rote Linien. Kreisbewegung: leichte Wellenlinien als Wake-Effekt.
- **Spawn:** Ebene 4–15 (Säulenraum und Offene Arena)
- **HP:** 3 | **Schaden:** 1.5 | **Schuss-Interval:** 1800ms

---

### [N-11] SCHATTENFISCH *(neu — thematisch in Biom 1 angepasst)*
- **Thematische Begründung:** Schattenfische sind blinde Tiefseebewohner die in alten Steinverliesen hausen. Ihre "Teleportation" ist tatsächlich extremes Schnellschwimmen durch dunkle Schlitze. Passt zu Biom 1 wenn entsprechend erklärt.
- **Rolle:** Geschwindigkeits-Dasher / Unberechenbarer Verfolger
- **Aussehen:** Dunkler fast schwarzer schlanker Fisch, lila Akzente. Körper hat schemenartigen Umriss. Bewegungs-Unschärfe sichtbar.
- **KI:** Verfolgt mit hoher Beschleunigung, macht alle 1.5s kurze Richtungsänderung
  - Blink-Teleport alle 3s auf 80px zum Spieler (lila Swirl 300ms vorher — Telegraph)
  - Split-Tod bei < 2 HP: teilt sich in 2 Mini-Schattenfs (je 1 HP, halber Schaden, keine weitere Split)
- **Spezialfähigkeit:** *Aussetzbarkeit* — Trifft er Spieler: nächster Schaden an ihn innerhalb 2s ist +1 (er bleibt kurz "exposed", leuchtet violett).
- **Visuelle Effekte:** Bewegungs-Trail (3 Frames). Teleport: lila Swirl-Out / Swirl-In. Split: dunkle Partikelexplosion.
- **Spawn:** Ebene 7–15 (Korridor bevorzugt)
- **HP:** 4 (teilt bei < 2 HP) | **Schaden:** 1 | **Speed:** 0.09

---

### [N-12] KORALLENRÜSTLING *(neu)*
- **Rolle:** Support / Gegner-Buffer
- **Aussehen:** Mittelgroßer Fisch (24x18px), pinkroter Korallenaufsatz auf Rücken, leuchtendes Frontalorgan. Bleibt gern hinten.
- **KI:** Hält sich > 200px vom Spieler. Heilt/bufft Gruppe.
  - Aura: alle Gegner in 120px erhalten +0.4 Speed (orange Flackern um jene Gegner sichtbar)
  - Reparatur: alle 4s heilt verletzten Gegner mit niedrigstem HP um 1 HP (grüne Partikel von ihm zum Ziel)
  - Wenn allein: schießt 1 Projektil alle 3s in Spielerrichtung
- **Spezialfähigkeit:** *Korallenrüstung* — Beim ersten Treffer: Korallenplatten splittern (visuell) und machen AoE 1 Schaden in 30px. Erkennbar: kurzes Aufflammen bei Treffer.
- **Priorität:** Spieler sollte Korallenrüstlinge zuerst töten (schützen alle anderen). Das ist die Game-Design-Absicht.
- **Spawn:** Ebene 9–15 (immer zusammen mit 2+ anderen Gegnern, nie allein gespawnt)
- **HP:** 3 | **Schaden:** 1 (Projektil) | **Heal:** 1 HP / 4s

---

## ABSCHNITT 3: NORMALE GEGNER — BIOM 2 (Ebene 16–30)

---

### [N-13] EISKRABBE
- **Rolle:** Frostblocker / Slow-Applier
- **Aussehen:** Wie Steinkrabbe, aus Eiskristallen gebaut. Hellblau-transparent, Inneres leuchtet kalt. Hinterlässt Eisspur beim Gehen.
- **KI:** Wie Steinkrabbe (seitlicher Vormarsch, Scherenschnapp), zusätzlich:
  - Hinterlässt alle 0.5s Eisspur (30px Radius, 1.5s Dauer — Slow 40% wenn drüber)
  - Kontakt: Eisklammer 350ms (Freeze Priorität 5, kein Schaden, aber Spieler nimmt in dieser Zeit 50% mehr Schaden)
  - Todexplosion: 3 Eissplitter in Zufallsrichtungen (je 0.5 Schaden)
- **Frost-Schichten:** Erste 2 Treffer entfernen "Frost-Puffer" (visuell: Eis splittert ab). Erst danach voller Schaden.
- **Effekt:** Frost-Puffer = 2 kostenlose Treffer absorbiert
- **Spawn:** Ebene 16–30
- **HP:** 3 (+2 Frost-Puffer) | **Schaden:** 1 + Freeze | **Speed:** 0.04

---

### [N-14] FROSTQUALLE
- **Rolle:** Predictiver Frost-Drifter
- **Aussehen:** Wie normale Qualle, weiß-blau, Eiskristall-Tentakel. Beim Pulsieren: kleine Eispartikel sprühen.
- **KI:** Predictive Drift — zielt auf Spielerposition + Velocity * 500ms (antizipiert Bewegung)
  - Frost-Puls alle 3s: 40px Radius, 0.5 Schaden + 1s Slow 30%. Telegraph: Körper wird kurz eisblau (300ms).
  - Eisspur-Wake: kurze 0.5s Eisspur hinter Bewegung (leichte Verlangsamung 20%)
- **Spawn:** Ebene 16–25
- **HP:** 3 | **Schaden:** 0.5 + Frost-Effekte | **Speed:** 0.04

---

### [N-15] OKTOPUS *(verbessert)*
- **Rolle:** Stationärer Tentakel-Controller
- **Aussehen:** 8 Tentakel, Körper dunkelviolett mit biolumineszenten Punkten (24px Körper). Tentakel in Wave-Animation.
- **KI:** Hält Position, agiert defensiv
  - Tentakel-Sweep alle 2.5s: 2–3 Tentakel in verschiedenen Winkeln (150px Reichweite, Linienschaden 1). Telegraph: Tentakel richten sich aus 600ms vorher.
  - Tintenbombe alle 5s: schießt mittleres Projektil, explodiert nach 1s Flugzeit in 80px Wolke. Telegraph: blinkt lila 400ms.
  - Rückzug bei < 30% HP: alle Tentakel einziehen, flucht.
- **Spezialfähigkeit:** *Tentakelnetz* — 2 Tentakel-Treffer gleichzeitig: 0.5s Festhalten (Slow 5, wie mini-Freeze) + 2x Schaden. Selten, aber lehrreich.
- **Spawn:** Ebene 16–28 (Säulenraum oder Offene Arena)
- **HP:** 6 | **Schaden:** 1 (Tentakel), 1.5 (Explosion)

---

### [N-16] SHADOWFISH *(verbessert, Biom-2-Version)*
- **Rolle:** Dimensionsspringer
- **Aussehen:** Wie N-11 Schattenfisch, aber dunkler und mit stärkerem Void-Flimmern. Biotop: Eisgrotten passen mit "Tiefseeschatten"-Lore.
- **KI:** Blink-Mechanik verstärkt
  - Alle 2s: Blink auf Spieler zu (80–120px)
  - Alterniert Links/Rechts-Blinks für Flankenangriff
  - Merkt letzte Spielerposition (1s alt): Blinkt dort hin wenn Spieler sich schnell bewegt hat
- **Spezialfähigkeit:** *Schattenblend* — 30% Chance nach Treffer: 0.5s unsichtbar (kein Schaden während Unsichtbarkeit).
- **Spawn:** Ebene 18–30
- **HP:** 4 | **Schaden:** 1 + Push 10px | **Speed:** Blink-basiert

---

### [N-17] FROSTMURÄNE *(neu)*
- **Rolle:** Eis-Ambush / Freeze-Attacker
- **Aussehen:** Wie Muräne, weiß-blau, hinterlässt Eiskristall-Wake. Augen eisblau leuchtend.
- **KI:** Gleiche Basis wie Muräne (transparent wartend, Dash bei Nähe)
  - Dash hinterlässt Eisspur (150px, 1s, 30% Slow)
  - Direkter Dash-Treffer: 400ms Freeze (Priorität 5) + 1.5 Schaden
  - Tod: 5 Eissplitter in Zufallsrichtungen
  - Kältewelle beim Auftauchen: 40px Radius 0.5 Schaden + kurzer Slow. Telegraph: blaues Radial-Frosting vor Dash (300ms).
- **Spawn:** Ebene 19–30. **Nur in Verwinkelt.**
- **HP:** 5 | **Schaden:** 1.5 + Freeze | **Dash:** 0.5 Speed

---

### [N-18] GLETSCHERSCHILDKRÖTE
- **Rolle:** Langsamer Zonen-Füller
- **Klassifizierung:** Normal-Gegner (nicht Elite) aber deutlich stärker — **nur in Offener Arena gespawnt**, maximal 1 pro Raum. Gilt als "schwerer Normalgegner".
- **Aussehen:** Riesig (1.6x, ca. 42x38px), Eisplatten statt Panzer, blau-weiß. Jeder Schritt: Frostzone-Kreis.
- **KI:** Langsam aber unaufhaltsam. Dreht sich um bei Wand (kein Abprall). Knockback-immun.
  - Alle 1.5s: Frostzone (60px Radius, 2.5s Dauer — Slow 40% + 0.2 Schaden/s im Bereich)
  - Eisstoß unter 70px: 100px Knockback nach hinten + 2 Schaden (1.5s Cooldown). Telegraph: Körper leuchtet kurz weiß 500ms.
- **Spezialfähigkeit:** *Permafrost-Aura* — 70px Radius: andere Gegner +1 Schadens-Puffer (Schaden -1, min 0). Gibt Begleitung Schutz.
- **Spawn:** Ebene 22–30, **nur Offene Arena**, max 1 pro Raum
- **HP:** 12 | **Schaden:** 2 + Knockback | **Speed:** 0.015

---

### [N-19] KRISTALLSPINNE *(neu)*
- **Rolle:** Fallen-Legerin / Web-Controller
- **Aussehen:** 8-beinig, aus Eiskristallen. Transparent-hellblau. Hinterlässt Eisfäden beim Laufen.
- **KI:** Legt Fallen, wartet statisch wenn genug Fallen aktiv sind
  - Alle 2s: Eisweb-Falle (20px Radius, fast unsichtbar bis Spieler 40px nah). Max 4 aktive Fallen.
  - Reiz-Reaktion: Tritt Spieler in Falle → Spinnendash sofort (0.3 Speed, 1.5 Schaden). 
  - Falle-Effekt: 0.8s Slow 80% + 0.5 Schaden.
  - Fernschuss alle 5s: Eisnetz-Projektil (Speed 0.25, Treffer = 1.5s Slow 60% + 1 Schaden)
- **Visuelle Effekte:** Weblinien: dünne blaue Threads. Falle: minimal Kristall-Glimmer. Trigger: Eis-Burst-Partikel.
- **Spawn:** Ebene 20–30 (Verwinkelt und Säulenraum)
- **HP:** 4 | **Schaden:** 1–1.5 | **Fallen-Reset:** 2s

---

## ABSCHNITT 4: NORMALE GEGNER — BIOM 3 (Ebene 31–50)

---

### [N-20] MAGMAKRABBE
- **Erscheinungsbild:** Steinkrabbe in glutheißer Lava-Rüstung, dunkelrot mit orangenen Rissen. Hinterlässt Magmaspur.
- **KI:** Wie Steinkrabbe, zusätzlich: alle 0.5s Lavapool (20px, 1.5s, 0.5 Schaden/s).
- **Hitzeschild:** Erste 2 Treffer prallen ab (kleiner Funken-AoE beim Abprall 20px, 0.3 Schaden). Danach normal.
- **Überhitzung < 25% HP:** 3s Timer → Explosion (80px, 3 Schaden). Erkennbar: immer stärker leuchtendes Orange. Spieler kann Überhitzung nutzen um wegzulaufen.
- **Spawn:** Ebene 31–45 | **HP:** 7 | **Schaden:** 1.5

---

### [N-21] FEUERFISCH
- **Erscheinungsbild:** Leuchtfisch-Basis, aber gefrierend-magmaartig, glutrot-orange.
- **KI:** Wie Leuchtfisch, Feuerspur während Rush (je 20px Brennzone, 1s).
- Explosion: 100px Radius, 3 Schaden. Tod: 4 Feuerpfützen (2.5s).
- Panik-Rush: 2 Treffer < 1s → doppelter Rush-Speed sofort.
- **Spawn:** Ebene 31–50 | **HP:** 3 | **Schaden:** 3 (Explosion)

---

### [N-22] STINGRAY *(verbessert)*
- **Erscheinungsbild:** Rochenkörper, goldgelb, elektrischer Schweif. Arcs um Körper wenn Spezial aktiv.
- **KI:** Schnelle Bögen durch Raum (weiter als Nadelrochen, näher an Wände)
  - Schweifangriff < 100px: Arc-Sweep (140px, 1.5 Schaden + 0.3s Stun). Telegraph: Schweif leuchtet gelb 400ms.
  - Elektroball alle 3s: langsam (0.4), 1 Schaden + 0.5s Stun.
  - Elektrisches Feld alle 6s: 2s Dauer, 60px Radius, 0.5 Schaden/s + Input-Verzögerung. Telegraph: helle gelbe Pulsringe.
- **Spawn:** Ebene 33–50 | **HP:** 5 | **Schaden:** 1.5 (Schweif)

---

### [N-23] SEA DRAKE *(verbessert)*
- **Erscheinungsbild:** Drachen-Schlange (lang, kleine Flossenflügel), dunkelrote Schuppen. Majesätisch.
- **KI:** Kreist 140–180px Abstand, sucht Lücke
  - Feueratem alle 2.5s: Strahl 120px×25px, 800ms Dauer. Telegraph: Mund leuchtet intensiv 500ms + kurzes Pre-Pusten.
  - Körperramme abwechselnd: Direktanlauf 600ms, 2 Schaden. Telegraph: zieht sich leicht zurück 400ms.
  - Phase 2 (< 40% HP): beides gleichzeitig.
- **Flammenlasso (einmalig):** Feuerring um Spieler (60px Radius, schrumpft auf 0 in 2.5s). Telegraph: kreisende Feuerfunken. Spieler muss durch Ring entkommen.
- **Spawn:** Ebene 35–50 | **HP:** 8 | **Schaden:** 2

---

### [N-24] LAVABORWURM *(neu)*
- **Erscheinungsbild:** Wumartig, segmentiert, dunkelbraun-rot. Taucht aus Boden. Rotglühender Schlund.
- **KI:** Unterirdisch unsichtbar, bewegt auf Spieler zu (Boden-Rumble-Effekt bei < 100px Distanz als Telegraph)
  - Auftauchen: Kreis am Boden zeigt Position 800ms vorher (rotes Pulsen = Telegraph). Auftauchen-AoE 50px, 2 Schaden.
  - Oberflächenkampf (3s): Kontaktdruck, dann wieder unterirdisch.
  - Magmageysir beim Untertauchen: Geysir 2s Timer → Schuss nach oben 60px, 2 Schaden. Erkennbar: Boden leuchtet rot.
- **Spawn:** Ebene 34–50. **Nie in Korridor** (Auftauch-Mechanik braucht Platz).
- **HP:** 6 | **Schaden:** 2

---

### [N-25] ASCHEGEIST *(neu)*
- **Erscheinungsbild:** Geisthafte Form aus Asche, grau-schwarz, glühende rote Kerne. Smoky boundary.
- **KI:** Kann durch Wände phasen (max 2-Tile-Breite)
  - Nutzt Wände aktiv zum Flankieren
  - Ascheausstoß alle 2.5s: Aschewolke 35px Radius, 1 Schaden + 1s Sichtreduktion 50%. Telegraph: Körper-Verdichten 350ms.
  - Kontakt: 1 Schaden + 0.5s Input-Delay (Asche im Gesicht).
- **Wand-Einsauger (telegraph VERBESSERT):** Einmal pro Begegnung — jetzt **600ms klarer Vorwarnung** (lila Sog-Partikelwelle deutlich sichtbar bevor Pull-Effekt). Zieht Spieler 80px Richtung nächste Wand.
- **Spawn:** Ebene 37–50 | **HP:** 5 | **Schaden:** 1

---

### [N-26] VULKANTURM *(neu)*
- **Erscheinungsbild:** Zylindrisch, oben offener Krater, dunkelbraun mit Lavastreifen. Immer Dampfausstoß.
- **KI:** Vollständig stationär. Dreht sich um Schuss auszurichten (1s Dreh-Telegraph).
  - Alle 3s: 1 Lavakugel auf Spieler (Speed 0.4). 
  - Lavaregen-Aura: 50px Radius, 0.3 Schaden/s ständig.
  - Todesexplosion: 150px Radius, 3 Schaden + 2s Lavapfützen.
- **Spawn:** Ebene 40–50. **Immer in Gruppen von 2–3**, verteilt im Raum. Niemals allein.
- **HP:** 8 | **Schaden:** 1.5 (Lavakugel)

---

## ABSCHNITT 5: NORMALE GEGNER — BIOM 4 (Ebene 51–70) — KURZÜBERBLICK

> Detaillierte Ausarbeitung folgt wenn Biom 3 vollständig implementiert ist.

| ID | Name | Rolle | Kerneigenschaft |
|----|------|-------|----------------|
| N-27 | **Void-Gleiter** | Schneller Kiter | Teleportiert kurze Strecken durch Wände (wie Aschegeist aber Fernkampf) |
| N-28 | **Schattenkoloss** | Tank | 1.8x Größe, zieht Spieler durch Gravitationsfelder an |
| N-29 | **Dimensionsqualle** | Flächenfüller | Teilt sich bei Treffer in 2 kleinere (max. 2 Generationen) |
| N-30 | **Void-Seeigel** | Turret | Schießt Projektile die durch Wände gehen (Void-Munition) |
| N-31 | **Raumrifter** | Ambush | Öffnet Dimensionsriss, kommt von unerwarteter Richtung heraus |
| N-32 | **Nullfisch** | Debuffer | Entfernt alle aktiven Spirit-Buffs des Spielers für 3s |
| N-33 | **Schattenwächter** | Elite-Basis | Void-Version Steinwächter: Schockwelle teleportiert alle Gegner kurz |
| N-34 | **Tentakelvoid** | Controller | Tentakel erscheinen aus Boden an Spielerposition (keine Körperpräsenz) |
| N-35 | **Abyssal-Aal** | Kamikaze | Dimension-Dash durch gesamten Raum. Explosion tötet sich selbst + Riss hinterlassen |

---

## ABSCHNITT 6: NORMALE GEGNER — BIOM 5 (Ebene 71+) — KURZÜBERBLICK

| ID | Name | Rolle | Kerneigenschaft |
|----|------|-------|----------------|
| N-36 | **Nekrallqualle** | Flächenfüller | Reviviert sich 1x nach Tod (mit 1 HP) wenn andere Gegner im Raum leben |
| N-37 | **Blutkorallen-Krabbe** | Blocker | Hinterlässt Blutspur die DoT macht und Gegner heilt die drüber laufen |
| N-38 | **Seelenfresser** | Ambush | Wird unsichtbar und absorbiert getötete Gegner-Seelen (HP steigt bei Kills) |
| N-39 | **Korallen-Nekromant** | Support | Reviviert tote Gegner im Raum (1x, einmal pro Kampf) |
| N-40 | **Gotteskrabbe** | Boss-artiger Normal | Riesig, 3 Angriffsmuster, erste Normalgegner-Phase eines langen Biom-5 |

---

## ABSCHNITT 7: ELITE-GEGNER — VOLLSTÄNDIGE LISTE

---

### Elite-Grundregeln
- Goldener/roter 2px Glow-Outline (farblich zum Biom passend)
- Icon über Kopf: ⭐
- Modifier-Tag unter HP-Balken (z.B. "🔴 Explosiv", "🟡 Schnell", "🟢 Regeneriert")
- Telegraph-Zeit wie Normalgegner (min. 500ms für Dash, da kein Spieler-Dash)
- Elite Ebene 15: **klassifiziert als "Mini-Boss-Zimmer"** (eigene Raum-Optik, bewusste Entscheidung)

---

### BIOM 1 ELITES (Ebene 1–15)

| Eb. | Name | Basis | HP | Einzigartige Mechanik | Raum-Typ |
|-----|------|-------|----|-----------------------|----------|
| 1 | **Alter Wächter** | Steinkrabbe xxl | 8 | Alle 8s: Steinkreis um ihn (Käfig 2s, Spieler muss schnell raus). Telegraph: Boden leuchtet kreisförmig 700ms. | Offene Arena |
| 2 | **Giftqualle** | Qualle mod. | 6 | Hinterlässt giftige Schleimspur (DoT 0.3/s, 3s). Beim Platzen: giftige 60px Wolke (4s). | Offene Arena |
| 3 | **Berserker-Muräne** | Muräne mod. | 10 | Nach Dash: bleibt sichtbar + 3s Wutmodus (2x Speed, 3x Schaden). Erkennbar: Augen leuchten konstant rot. | Verwinkelt |
| 4 | **Gepanzerter Seeigel** | Seeigel mod. | 10 | Feuert 5 Stacheln gleichzeitig im Kreis. Bei < 50% HP: rollt auf Spieler zu (Speed 0.03). | Säulenraum |
| 5 | **Tinten-Fürst** | Tintenfisch xxl | 8 | Spawnt 3 Tintenfische (einmalig). Tintencloud 150px, 5s. Unsichtbarkeit dauert 3s statt 1.5s. | Säulenraum |
| 6 | **Schattendreiheit** | Schattenfisch x3 | 14 (total) | Beginnt als 3 identische Schattenfische. Alle 3 müssen getötet werden. Koordinieren Blink-Angriffe. | Offene Arena |
| 7 | **Granitriese** | Steinwächter mod. | 22 | Schockwelle 2x größer (280px). Spawnt 3 Mini-Steinwächter (3 HP je) nach 50% HP. | Offene Arena |
| 8 | **Nadelmeister** | Nadelrochen mod. | 8 | Schuss-Interval 0.8s (statt 1.8s). Nadeln kurskorrigieren 1x nach Schuss. | Offene Arena / Säulenraum |
| 9 | **Geisten-Zwilling** | Geisterkrabbe x2 | 7 (je) | Koordinierter Angriff: 1 materialisiert und hält ab, 2. greift an. Wenn 1 stirbt → 2. wird permanent sichtbar. | Verwinkelt |
| 10 | **Doppelgänger** | Schattenfisch mod. | 12 | Kopiert kurz Spieler-Farbe/Form (1s). Danach Angriff aus Richtung des Spielers. Sehr überraschend. | Korridor |
| 11 | **Frostkoloss** *(Biom-1-Thema: Permafrost-Sektion des Verlieses)* | Eiskrabbe xxl | 18 | Permanente Freeze-Aura 80px hinzugefügt. Hinterlässt Eiswände beim Gehen (blockieren 3s). | Offene Arena |
| 12 | **Blizzardserpent** | Frostmuräne mod. | 14 | Dash-Frost friert alle Gegner + Spieler gleichzeitig ein (300ms globaler Freeze, 0.5 Schaden leise). | Verwinkelt |
| 13 | **Tiefseekoloss** | Oktopus xxl | 16 | Tentakel 200px lang. 3 Tentakel gleichzeitig. Sauger: zieht Spieler 30px Richtung Treffer. | Offene Arena |
| 14 | **Kristallriese** | Gletscherschildkröte | 22 | Wirft alle 4s Eisbrocken (30px AoE, 2 Schaden + 2s Eiszone). Brocken-Telegraph: 600ms roter Kreis. | Offene Arena |
| **15** | **Vorhüter** *(Mini-Boss-Zimmer)* | Steinwächter + | 28 | **Eigener Raum, eigene Musik, bewusste Wahl.** 3 Phasen: Phase 1 allein, Phase 2 spawnt Muränen, Phase 3 spawnt Steinkrabben. Kein normaler Raumgegner — echtes Mini-Boss-Erlebnis. | Mini-Boss-Zimmer |

---

### BIOM 2 ELITES (Ebene 16–30)

| Eb. | Name | Kerneigenschaft | HP |
|-----|------|-----------------|-----|
| 16 | **Frosterst-Geist** | Shadowfish + Frostfeld an jeder Teleportposition | 10 |
| 17 | **Eishammer-Krabbe** | Massiver Eishammerschlag: 200px Eis-Schockwelle | 14 |
| 18 | **Schneesturm-Oktopus** | Tentakel-Treffer = 2s 50% Slow. Alle 5s: allen Gegnern +1 HP heilen | 18 |
| 19 | **Frostmurä-Zwilling** | 2 Frostmuränen aus gegenüberliegenden Seiten. Gleichzeitiger Treffer = 4s Full-Freeze | 10 (je) |
| 20 | **Permafrost-Wächter** | Erzeugt alle 3s Eiswand (blockiert Weg, 3s Dauer) | 24 |
| 21 | **Nordlichtfisch** | Periodische Nordlicht-Strahlen (3 Richtungen, AoE-Linien, 1.5 Schaden). Telegraph: 700ms Lichtaufbau. | 10 |
| 22 | **Eiskristall-Golem** | Wirft Eiskristall-Brocken (160px Wurfweite, AoE beim Landen) | 22 |
| 23 | **Blizzard-Wyrm** | Hinterlässt bei Dash 5 Eiskristall-Explosionen (timed, 1s bis Auslösung) | 14 |
| 24 | **Frostgeist-Doppel** | 2 Shadowfish tauschen Positionen (swapping blink). Schaden an beiden Positionen beim Tausch. | 9 (je) |
| 25 | **Tiefeiskoloss** | Schlägt Boden: 3 Eissäulen erscheinen (1.5s, 3 Schaden wenn drüber). Telegraph: **800ms** rote Kreise. | 28 |
| 26 | **Frostnadelschütze** | Nadeln frieren ein (1s Slow). 4er Burst statt 1. | 9 |
| 27 | **Kristall-Schildwächter** | 4 rotierende Eiskristalle als Schild. Jeder Treffer entfernt 1. Vollschild = kein Schaden. | 18 |
| 28 | **Blizzardkönig** | Einmalig: globaler Blizzard (Screen dunkel 3s, alle Gegner +1 HP heilen für Dauer). | 20 |
| 29 | **Eispanzer-Drake** | Drake mit Eispanzer (3 Treffer zum Durchbrechen). Schweif friert 2s ein. | 22 |
| 30 | **Borealer Kolosswächter** *(Mini-Boss-Zimmer)* | Hybrid: Scheren + Eisstoß + Frost-Aura + 3 Phasen. Biom-2-Abschluss-Elite vor Biom-3-Eingang. | 38 |

---

### BIOM 3 ELITES (Ebene 31–45) — Kompaktform

| Eb. | Name | Kerneigenschaft | HP |
|-----|------|-----------------|-----|
| 31 | **Magmasprenger** | Bei 50% HP: Aufspaltung in 3 Splitter (je 1/3 HP, gleiche Mechanik) | 12 |
| 32 | **Feuerbeweger** | Teleportiert zu Feuerpfützen im Raum. Hält bis 5 Feuerpfützen aktiv. | 10 |
| 33 | **Lavastrom-Aal** | Hinterlässt permanente Lavaspur die den Raum einschränkt. | 18 |
| 34 | **Glutgeist-Doppel** | 2 Aschegeister die durch Wände greifen und Positionen täuschen | 12 (je) |
| 35 | **Lava-Schleuderer** | Wirft 3 Lavabrocken gleichzeitig (80px Radius, 3s Lavazone je) | 16 |
| 36 | **Vulkan-Kolosswurm** | Lavaborwurm xxl: taucht an 3 Positionen gleichzeitig auf | 22 |
| 37 | **Brennender Wächter** | Steinwächter + Feuer-Aura 60px dauerhaft. Schockwelle = Feuer-Ring. | 26 |
| 38 | **Glutriese** | Magmakrabbe xxl: Explosion doppelt groß. Überhitzung schon bei 60% HP. | 20 |
| 39 | **Inferno-Spinner** | Feuerstricke (wie Eisspinne): treffen = 2s Flammen-DoT 0.5/s | 12 |
| 40 | **Feuerkrone-Drake** | Drake mit 360°-Feuerring statt Strahl. Flammenlasso sofort bei Kampfbeginn. | 24 |
| 41 | **Aschesturm** | Hinterlässt wandernden Aschesturm-Pfad (folgt 1s verzögert). | 14 |
| 42 | **Vulkanturm-Golem** | Vulkanturm der sich bewegt (Speed 0.01). Schuss alle 1s. | 24 |
| 43 | **Feuerseeschlange** | 5-Segment-Schlange, jedes Segment Kontaktschaden. Segmente müssen separat getötet werden. | 5 (je Segment) |
| 44 | **Lava-Phantom** | Wechselt alle 3s Position via Teleport. Landet mit Magma-Splash (AoE). | 16 |
| 45 | **Glutkönig-Wächter** *(Mini-Boss-Zimmer)* | Doppelte Schockwellenkette + spawnt 2 Feuerfische nach jeder Schockwelle. 3 Phasen. | 32 |

---

*→ Weiter in DUNGEON_DESIGN_FINAL_Teil2.md: Bosse, Code Spirits, KI-Pattern, Balancing-Matrix*
