# DUNGEON DESIGN — Finales Konzept (v2 FINAL) — TEIL 2
# Bosse, Code Spirits, KI-Pattern, Balancing
> Datum: 26.02.2026 | Überarbeitet nach Sub-Agent-Kritik
> Teil 1: Spieler-Referenz, Gegner, Elites

---

## ABSCHNITT 8: BOSS-SYSTEM

### Boss-Grundregeln (gilt für ALLE Bosse)

1. **Zwei echte Phasen** — Phase 2 muss sich anders ANFÜHLEN, nicht nur schneller sein (neuer Angriff ODER neue Raumveränderung ODER neues Positionierungsspiel)
2. **Telegraph immer** — Kein Dash = min. 500ms visuelle Vorwarnung für Dash-Angriffe, 350ms für Projektile
3. **Begleit-Gegner aktiv** — Niemals `drift` als Add-KI bei einem Boss. Immer ein sinnvolles Verhalten.
4. **Raumveränderung** — Jeder Boss verändert den Kampfraum auf irgendeine Weise (Hindernisse, Gefahrenzonen, Sichtbehinderung etc.)
5. **Keine Instakills** — "Instakill"-Zonen werden zu 3-Schaden-Treffern. Spieler hat 10 HP.

---

### BIOM 1 BOSSE (Ebene 1–15)

---

#### BOSS 1 — RIESENKRABBE "GRANITKLAUE" *(Ebene 1, Tutorial-Boss)*
**Farbe/Form:** Massige Krabbe (3x normal), dunkelgrau mit roten Kratzern. Scheren leuchten rot wenn Angriff.
**Raum-Veränderung:** Keine (Tutorial — klarer Kampfraum). Lernt Grundmechaniken.

**Phase 1 (100%–60% HP):**
- *Charge (Telegraph: 600ms — Körper zieht sich zurück + Scheren leuchten):* Rast auf Spieler zu. Trifft er Wand: 500ms Betäubung (Schwachstelle — mehr Schaden möglich).
- *Scherenklammer (Telegraph: 500ms — beide Scheren öffnen sich weit):* Klammert zu. Spieler muss seitlich ausweichen. 2 Schaden.
- *Steinstoß alle 5s (Telegraph: 400ms — Boden vibriert radial):* Schlägt Boden, 2 Steinsegmente fliegen in L-Form als Wellen raus. 1 Schaden je.

**Phase 2 (< 60% HP — Shell kracht weg):**
- *Visuell:* Rücken-Panzer bricht ab (sichtbare Veränderung) → Körperkern leuchtend rot
- *Doppelcharge:* 2 Charges direkt hintereinander, kurze Pause (700ms) dazwischen
- *Scheren-Rotation (neu):* Dreht sich einmal 360° mit ausgestreckten Scheren. Telegraph: Scheren strecken sich 600ms aus. Gibt 2 Runden, dann Stop.
- *Tempo gesamt:* +30% Angriffsrate, +20% Speed

**Begleit-Gegner:** Keine. Tutorial-Boss bleibt 1vs1.

**Design-Absicht:** Spieler lernt: Charge = seitlich ausweichen. Wand = Schwachstelle. Shell = visuelles Phasen-Signal.

---

#### BOSS 2 — QUALLENKÖNIGIN "AURORAVEIL" *(Ebene 2)*
**Farbe/Form:** Riesige Qualle (2.5x), hellblau-violett, transluzent. Tentakel sehr lang (280px). Körper pulsiert rhythmisch.
**Raum-Veränderung:** Spawnt 3 Tintenwolken in festen Corner-Positionen (permanent für Kampfdauer — reduzieren Sichtraum schrittweise).

**Phase 1 (100%–70% HP):**
- *Tentakel-Sweep (Telegraph: 700ms — Tentakel richten sich aus):* 4 Tentakel fächern in 120°. Lücken zum Durchschlüpfen vorhanden. 1.5 Schaden je Tentakel.
- *Spawn Quallenring (Telegraph: 3x schnelles Pulsieren):* Spawnt 3 Quallensprößlinge.
  - **BEGLEIT-KI FIX:** 2x `kamikaze` (rasen sofort auf Spieler zu) + 1x `flee`-Typ (hält Abstand, erinnert an kleine Quallenkönigin). Keine `drift`-Adds.
  - Nach 5s: alle lebenden Adds wechseln in `formation`-KI (Umzingelung).
- *Tintenpuls (Telegraph: Körper verdunkelt 400ms):* Radialer Tintenausstoß 100px, Sicht-Dimming + 0.5 Schaden.

**Phase 2 (< 70% HP — Krone leuchtet auf):**
- *Tentakel-Minen (neu):* Legt 6 Tentakel als sichtbare Markierungen im Boden. Spieler betritt = 350ms Telegraph dann Reißen (1.5 Schaden + 0.5s Slow). Erkennbar als dünne lila Linien.
- *Elektro-Adds (neu):* Lebende Adds laden sich elektrisch auf (gelb leuchten 1.5s) → platzen als Elektro-Explosion 40px Radius. Spieler hat 1.5s Zeit wegzulaufen.
- *Verdunkelungsfeld:* 60% Screen-Dimming für 3s. Telegraph: pulsiert violett 800ms vorher. *(Sichtreduktion-Budget: Priorität 0, ersetzt früheres Dimming)*

**Phase 3 (< 30% HP — Enrage):**
- Tentakel rotieren kontinuierlich (langsam, 1 Umdrehung/4s)
- Alle Angriffe 35% schneller
- Neue Adds alle 8s

**Begleit-Gegner:** Quallensprößlinge (wie oben definiert, aktive KI).

---

#### BOSS 3 — STEINAAL "TIEFENBISS" *(Ebene 3)*
**Farbe/Form:** Langer Aal (4x Körperlänge), dunkelgrün, segmentierter Körper. Jedes Segment macht Kontaktschaden.
**Raum-Veränderung:** Hinterlässt Giftspur die sich im Raum akkumuliert. Phase 2: Raum hat dauerhaft grüne Giftzonen in Ecken.

**Phase 1 (100%–65% HP):**

- *Burrow (Telegraph NEU: Boden vibriert 600ms + roter Puls-Kreis zeigt genau wo Aal auftaucht, 800ms vor Auftauchen):*
  - **PROBLEM BEHOBEN:** Spieler hat jetzt immer 800ms um aus dem Telegraph-Kreis zu laufen.
  - Auftauchen: AoE 60px, 2 Schaden. Danach normaler Verfolgungsmodus 3s.
- *Salve (Telegraph NEU: Maul öffnet sich 500ms sichtbar + 3 gelbe Punkte markieren Abschuss-Stellen):*
  - **PROBLEM BEHOBEN:** 500ms klarer Vorlauf + Projektilabstand erhöht auf 400ms (statt 200ms).
  - 3 Projektile in 1.2s total, Geschwindigkeit reduziert auf 0.45 (statt 0.55): Spieler mit normaler Seitenbewegung kann dodgen.
- *Körperschwung (Telegraph: zieht Schwanz zurück 400ms):* Schwingt langen Körper horizontal, gefährliche Zone entsteht kurz.

**Phase 2 (< 65% HP — ECHT ANDERS, nicht nur schneller):**
- *Gift-Salve (neu statt normale Salve):* Projektile hinterlassen Giftpfützen (1.5s, 0.3/s). Telegraph identisch (500ms) — Spieler kennt Timing aber muss Giftpfützen vermeiden.
- *Spiral-Einengung (neu):* Aal kreist um Spieler im Radius 100px, Radius verkleinert sich auf 40px in 5s. Spieler muss ausbrechen bevor Kontakt. Telegraph: Kreisbewegung startet klar sichtbar.
- *Doppel-Burrow:* Taucht an 2 Positionen auf (zweite = 1s nach erster). Zwei Telegraph-Kreise gleichzeitig sichtbar.

**Begleit-Gegner:** Keine. Aal kämpft allein.

---

#### BOSS 4 — KORALLENKÖNIG "SPEKTRALKORALLE" *(Ebene 4)*
**Farbe/Form:** Krabbenform mit majestätischen Korall-Hörnern. Körper weißer Korall, biolumineszent.
**Raum-Veränderung:** Spawnt Korallen-Säulen (zerstörbare Hindernisse). Phase 2: Säulen regenerieren sich.

**Phase 1:**
- *Fächerschuss (Telegraph: 4 Kristalle um ihn rotieren schneller 600ms):* 5 Projektile im Fächer, 1 Schaden je.
- *Homing-Projektil (Telegraph: leuchtet orange 400ms vor Schuss):* 1 langsam drehendes Homing-Projektil. Spieler muss durch Säulen manövrieren zum Ablenken.
- *Korallen-Barriere (Telegraph: Boden leuchtet an 3 Positionen 700ms):* 3 Korallen-Säulen erscheinen (zerstörbar, je 2 HP, 5s Dauer). Verändern Raumgeometrie.

**Phase 2 (< 50% HP — ECHT ANDERS):**
- *Korallen heilen sich:* +1 HP alle 2s → muss aktiv über DPS zerstört werden. Spieler kann keine Deckung mehr ignorieren.
- *Fächerschuss-Doppel:* 2 Simultanfächer links + rechts.
- *Korallenregen (Telegraph: gesamter Körper flackert weiß 700ms):* 6 Spitzen fallen von oben. Je ein roter Kreismarker zeigt Zielposition 600ms vor Einschlag.

**Begleit-Gegner:** Keine, aber Säulen als aktives Element ersetzen Adds.

---

#### BOSS 5 — HAMMERHAI "TITANFLOSSE" *(Ebene 5)*
**Farbe/Form:** Riesiger Hammerhai, grau-blau. Hammerkopf übergroß. Sehr aggressiv.
**Raum-Veränderung:** Phase 2 spawnt 3 Schockwellen-Minen die den Raum aufteilen.

**Phase 1:**
- *Charge (Telegraph: zieht Körper zurück + leuchtet grün 500ms):* Sehr schnell (Speed 0.12), prallt von Wänden ab (3 Bounces = aktive Raumgefahr).
- *Wallbounce-Salve (Telegraph: Punkte erscheinen an Bounce-Positionen 600ms vorher):* 3 Bounce-Projektile (2x Abprall). Spieler kann Fluchtweg 600ms vorher planen.
- *Hai-Ramme (Nahkampf): unter 60px → kurze Rempelbewegung, 2 Schaden + Knockback 25px.*

**Phase 2 (< 50% HP — ECHT ANDERS):**
- *Tornado-Flosse (neu):* Dreht sich mit ausgestreckten Flossen (160px Radius, 2s). Telegraph: Körper beginnt zu rotieren 700ms vorher.
- *Echo-Minen:* Bei Phase-2-Start werden 3 Schockwellen-Minen platziert (aktivieren bei 50px Annäherung, 600ms Telegraph, dann 80px Schockwelle). Minen teilen den Raum dauerhaft auf.
- *Kein Stun nach Wandtreffer mehr:* Bounce-Charges ohne Pause. Gefährlicher da Minen gleichzeitig aktiv.

**Begleit-Gegner:** Keine.

---

#### BOSS 6 — SEESCHLANGEN-ZWILLINGE "SIBILIUS & VIPERUS" *(Ebene 6)*
**Stärkstes Design im ganzen Dokument.**
**Konzept:** 2 echte Bosse gleichzeitig. Entscheidung: Wen töte ich zuerst? Wann riskiere ich den Enrage?
**Farbe:** Sibilius = lila/blau (Distanzkämpfer), Viperus = grün/gold (Nahkämpfer)
**Raum-Veränderung:** Sibilius legt Säulen-Barrieren, Viperus reißt sie ein. Raum verändert sich dynamisch.

**Phase 1 (beide aktiv):**
- **Sibilius:** Spread-Angriff, hält 150px Abstand. Telegraph: leuchtet lila 450ms.
- **Viperus:** Charge-Angriff, aggressiver Nahkämpfer. Telegraph: zieht sich zurück 500ms.
- *Synergie:* Sibilius schießt in die Richtung wo Viperus den Spieler hintreibt. Müssen koordiniert bekämpft werden.
- *Fusion (Telegraph: beide leuchten gleichzeitig + Sirren-Ton 800ms):* Verschmelzen zu riesiger Serpente (3s). Fusionierter Boss: gleichzeitig Charge + Spread. Dann trennen.
- **Begleit-Gegner FIX:** Bei < 70% HP spawnt Viperus 2 Baby-Schlangen mit `ambush`-KI (nicht `drift`). Warten versteckt, dann Dash auf Spieler.

**Phase 2 (einer stirbt — Enrage des anderen):**
- Überlebender: +50% Speed, +70% Schaden, doppelte Angriffsrate.
- Überlebender färbt sich im Sterbeblitz des Partners (wenn Viperus stirbt: Sibilius wird grünlich, wenn Sibilius stirbt: Viperus wird lila).
- **Design-Entscheidung des Spielers:** Sibilius zuerst töten = leichtere Phase 2 (kein Distanzschaden) aber Viperus enraget. Viperus zuerst = Nahkampfgefahr weg aber Sibilius schießt rasant.

---

#### BOSS 7 — ABGRUND-ANGLER "FINSTERNISAUGE" *(Ebene 7)*
**Farbe/Form:** Riesiger Anglerfisch, dunkelblau-schwarz. Riesiges Angellicht. Im Dunkelfeld kaum sichtbar, aber Silhouette bleibt immer erkennbar.
**Raum-Veränderung:** Dunkelfeld (reduzierte Sicht). Wichtig: Silhouette des Anglers ist immer im Dunkel sichtbar (kein blindes Raten).

**Phase 1:**
- *Lure-Pull (Telegraph: Angellicht bewegt sich langsam zu Zielposition 700ms):* Lure landet, Saugkraft 80px Richtung Lure. Spieler innerhalb 40px: 1 Schaden.
- *Dunkelfeld (Telegraph: Angellicht flackert 600ms):* Sichtkreis des Spielers auf 150px begrenzt (3s). Boss-Silhouette bleibt sichtbar — kein unfaires Verstecken.
- *Charge im Dunkel:* Charge-Angriff. Telegraph: Silhouette zieht sich sichtbar zurück 500ms im Dunkel.

**Phase 2 (< 50% HP — ECHT ANDERS durch permanente Umgebung):**
- *Dauerhaftes Dunkelfeld (60% Dimming, nicht komplett dunkel):* Spieler sieht immer noch Nahbereich 100px klar. Schafft Druck ohne Hilflosigkeit. *(Sicht-Reduktion Priorität 0 = schwächste)*
- *Scheinlures (neu):* 3 Fake-Lures die alle ziehen. Echter Lure leuchtet minimal heller (lernbarer Unterschied).
- *Salve im Halbdunkel:* 5 Projektile schnell. Spieler muss auf Silhouette reagieren statt auf Projektilanflug.
- *(Dauerhafte vollständige Verdunklung ist entfernt — war zu frustrierend laut sub-agent Feedback)*

---

#### BOSS 8 — GEZEITENWURM "WURMVATER" *(Ebene 8)*
**Farbe/Form:** 6 Segmente (je 3 HP), dunkelgrün-braun. Wellenförmige Bewegung. Gesamtlänge 240px.
**Raum-Veränderung:** Giftspur akkumuliert in Raum. Am Ende von Kampf: mehrere Giftbereiche.

**Phase 1 (alle Segmente verbunden):**
- *Gift-Spur:* Hinterlässt Giftspur (0.3/s, 2.5s) bei jeder Bewegung.
- *Segment-Slam (Telegraph: Segment leuchtet grün 500ms):* Einzelnes Segment schlägt auf Boden, 60px AoE.
- *Burrow-Kombi (wie Steinaal aber kürzer):* Segments-Kopf taucht unter, telegraph 600ms Kreis, dann Auftauchen.

**Phase 2 (< 3 Segmente — ECHT ANDERS, nicht nur skaliert):**
- *Aufspaltung:* Überlebende Segmente trennen sich und agieren als unabhängige Mini-Würmer.
- *Jedes Segment:* eigene Bewegung, schlägt auf Boden wenn Spieler nahe (60px), hinterlässt eigene Giftspur.
- *Mehrfach-Ziele:* Spieler muss priorisieren, Gift-Verseuchung des Raums beschleunigt sich.
- **Phase 2 fühlt sich völlig anders an:** Statt 1 großem Gegner → mehrere kleine bewegliche Gefahren + verseuchter Raum.

**Begleit-Gegner:** Keine extra Adds. Segmente sind die Adds.

---

#### BOSS 9 — NAUTILUS-MAGIER "SPIRALVOID" *(Ebene 9)*
**Farbe/Form:** Nautiloidform, violett-blau, Schale mit Runen. Im Uhrzeigersinn rotierend. Mystisch.
**Raum-Veränderung:** Spawnt Wände die Raum aufteilen. Phase 2: Wände + Gravitations-Vortex kombiniert.

**Phase 1:**
- *Ring-Schuss (Telegraph: Schale dreht sich 1.5x schneller 700ms):* 10 Projektile im Vollkreis.
- *Schildorbs (Telegraph: 800ms Schild-Aufbauanimation sichtbar):* 5 rotierende Schildkugeln blockieren Spieler-Projektile. Je 1 HP.
- *Wände spawnen (Telegraph: Boden leuchtet an Wand-Linien 600ms):* 2 Wände (5s Dauer) teilen Raum.

**Phase 2 (< 40% HP — ECHT ANDERS):**
- *Reverse Ring (stärkstes Design-Element):* Ring läuft nach Schuss in ENTGEGENGESETZTE Richtung zurück. Spieler der ausgewichen ist, kommt in zweiten Ring. Erzwingt echtes Verständnis statt Pattern-Repetition.
- *Gravitationsvortex (Telegraph: lila Sog-Animation 800ms):* Zieht Spieler heran + dreht ihn 270° (kurzer Orientierungsverlust). Gut spürbar als Mechanikmix mit Ring-Schuss.
- *Wand + Schildorbs gleichzeitig:* Räumliche Einschränkung + Defensive kombiniert.

---

#### BOSS 10 — KRISTALLDRACHE "GLITZERREAPER" *(Ebene 10)*
**Farbe/Form:** Drachen-Form (kristallin), helles Blau-Weiß, reflektierend.
**Raum-Veränderung:** Phase 2: 8 Spiegel im Raum. Spieler-Projektile können reflektiert werden (Selbstschaden möglich).

**Phase 1:**
- *Kristallregen (Telegraph: Kristalle erscheinen 700ms am Screen-Rand + rote Kreise zeigen Einschlagpositionen 600ms vorher):* 8 Kristalle fallen von oben. 2 Schaden je.
- *Charge (Telegraph: 500ms Rückzug):* Wie Boss 1, aber mit leichtem Homing (korrekt hinter Spieler herlaufen).
- *Reflektionsschild (Telegraph: Kristalle um ihn rotieren schneller 600ms):* Reflektiert Spieler-Projektile für 2s.

**Phase 2 (< 50% HP — ECHT ANDERS durch Raum):**
- *Kristall-Spiegel:* 8 Spiegel im Raum platziert. Jede Spielerkugel die einen Spiegel trifft wird reflektiert. Spieler kann sich selbst treffen (2 Schaden). Spiegel visuell klar erkennbar als glänzende Rauten.
- *Intensiverer Regen:* 12 Kristalle gleichzeitig.
- *Drachenflamme-Atem (Telegraph: Mund öffnet sich weit 600ms):* Kristall-Atemstrahl (200px Länge, 25px Breite). Dreht sich 90° während Schuss.

---

#### BOSS 11 — PHANTOM-ROCHEN "VERSCHWINDENDES AUGE" *(Ebene 11)*
**Raum-Veränderung:** Spawnt Phantom-Kopien. Nur echter Treffer zählt.
**Phase 1:** Laser + Phasenshift (Teleport mit 8 Ring-Projektilen beim Landen).
**Phase 2:** Spawnt 2 Phantom-Kopien (identisch aber kein Treffer-Feedback). Spieler muss den echten identifizieren (echter Rochen nimmt Schaden = leuchtet kurz). Alle 3 teleportieren sich gleichzeitig. Rätselelement mit Timing-Druck.

---

#### BOSS 12 — KORALLENGOLEM "FRAGMENTIER" *(Ebene 12)*
**Raum-Veränderung:** Phase 2: Raum mit Korallenpfeilern (neue Gefahrenzone).
**Phase 1:** Schockwelle + Spread.
**Phase 2-Mechanik:** Spaltet sich in 4 kleine Golems. Reihenfolge des Tötens bestimmt Ergebnis: falscher Kill = Golem explodiert (2 Schaden, AoE). Richtige Reihenfolge angedeutet durch Leuchten-Timing (welcher leuchtet gerade = nächster). Puzzle-Mechanik mit Schaden-Konsequenz.

---

#### BOSS 13 — TINTENFÜRST "ABYSSMASTER" *(Ebene 13)*
**Raum-Veränderung:** Phase 2: Tentakel-Netz im ganzen Raum (halbsichtbar durch Tinte). Spieler kann Wege nicht mehr klar sehen.
**Phase 1:** Tentakel-AoE + Tintenvernebelung + Vortex (zieht Spieler in Tinte).
**Phase 2:** Tentakel werden halbsichtbar durch Tinte. Spieler muss Tentakel-Muster auswendiglernen. Vortex kombiniert mit Tentakel-Sweep: Spieler wird hineingezogen UND Sweep kommt.

---

#### BOSS 14 — GEISTERKAPITÄN "VERBLICHENER ANFÜHRER" *(Ebene 14)*
**Raum-Veränderung:** Adds verstecken Kapitän. Geister-Adds machen ihn unsichtbar.
**Phase 1:** Boomerangs (Arc-Projektile) + Geister-Adds spawnen. Adds sind halbtransparent (sichtbar aber irreführend). Kapitän wird unsichtbar wenn Adds leben = Spieler muss Adds töten um Bosse sichtbar zu halten.
**Phase 2:** Adds respawnen 10s nach Tod. Boomerangs 2x Anzahl. Kapitan teleportiert sich wenn Adds alle sterben (gibt Spieler kein "freies Fire-Fenster").

---

#### BOSS 15 — STEINKÖNIG "EWIGER HÜTER" *(Ebene 15 — Biom-1-Finale, 3 Phasen)*
**Raum-Veränderung:** Raum verkleinert sich Schritt für Schritt (Steinwände schließen sich ein). Phase 3: kämpft auf 40% der ursprünglichen Fläche.

**Phase 1 (100%–70%):** Schockwelle (wie Steinwächter aber größer) + Kristallregen.
**Phase 2 (70%–35%):** Charge + Adds spawnen (Steinkrabben mit `tank`-KI, nicht `drift`). Adds sind jetzt aggressiv (enraget-Variante: Speed 0.06, droppen nicht mehr).
**Phase 3 (< 35% — alles kombiniert):**
- Alle vorherigen Angriffe: Schockwelle + Regen + Charge + Adds gleichzeitig
- Raum auf 60% verkleinert (Wände sind eingefahren, sichtbar als Steinsäulen)
- Speed: +40%
- Jede Schockwelle sprengt 1 zusätzliche Steinwand kurz auf (kurze Gefahr außerhalb des Rings)

---

### BIOM 2 BOSSE (Ebene 16–30): ÜBERBLICK

| Boss | Name | Signature-Mechanik | Phase-Wechsel |
|------|------|--------------------|---------------|
| B16 | **Eisriesen-Krake** | Tentakel frieren Raumbereiche ein. Raum wird schrittweis vereist. | P2: Spieler gleitet auf Eis (Controls funktionieren, aber Momentum erhöht) |
| B17 | **Blizzard-Wyrm** | Segment-Mechanik wie B8 + Blizzard alle 20s (kurz verschleiert) | P2: Segmente hinterlassen Tiefkühlung statt Gift |
| B18 | **Frostphantin** | Phantom-Laser der einfriert (2s Freeze). Kopier-Mechanik wie B11. | P2: 3 Phantoms permanent |
| B19 | **Nordlicht-Magier** | Nordlicht-Strahlen aus 3 Raumecken. Spieler muss durch schmale Safezonsen. | P2: 4. Strahl hinzugefügt + Strahlen rotieren |
| B20 | **Eiskönig** *(Biom-2-Finale)* | 3-Phasen-Boss. P3: Raum komplett vereist (Spieler gleitet, aber nicht unkontrollierbar). | P3: Erste Kometartige Lavastürze als Biom-3-Vorschau |
| B21 | **Gletschertitan** | Fausthiebe = Eis-Säulen spawnen (4s). Raum füllt sich mit Eis. | P2: Eis-Säulen wachsen schneller, Titan wird schneller |
| B22 | **Frostserpent-Zwillinge** | Wie B6-Zwillinge (Eis-Version). Fusion = Blizzard-Körper. | Enrage-Mechanik identisch B6 |
| B23 | **Tiefseekristall** | Kristallform dreht, Reflexionen (echte Spielerprojektil-Reflektion). | P2: 12 Spiegel |
| B24 | **Polarlicht-Oktopus** | Tentakel ziehen Spieler langsam Richtung Körper (Saugkraft). | P2: Nordlicht-Flächenangriff zusätzlich |
| B25 | **Permafrost-Golem** | Erschafft permanente Eiswände (Raum zerfällt in Kammern). | P2: Raum in 4 getrennte Kammern aufgeteilt |
| B26 | **Eis-Drake** | Frosthauch (wie Feueratem, friert Raumbereiche). Flammenlasso = Frostlasso. | P2: Atemstrahl friert gesamte Raumbodensegmente |
| B27 | **Schneesturm-Angler** | Anglerfisch-Mechanik + Blizzard. | P2: Dunkel + Blizzard gleichzeitig = sehr begrenzte Sicht |
| B28 | **Tundrawurm** | Segmente regenerieren sich wenn nicht alle schnell genug getötet. | P2: Regenerations-Rate verdoppelt |
| B29 | **Frostarchimago** | Nautilus-Mechanik + Eis: Eiswände + Frostorbs. Zeitverlangsamung für Spieler 2s (selten, einmalig). | P2: Reverse-Frostring wie B9-Reverse-Ring |
| B30 | **Der Ewige Frost** *(Biom-2-Finale)* | 4-Phasen. P4: Raum komplett vereist + erste Lava-Mechanik als Biom-3-Vorschau. | Lore-Verbindung: Eis bricht, Lava sickert ein |

---

### BIOM 3 BOSSE (Ebene 31–50): ÜBERBLICK

| Boss | Name | Signature-Mechanik |
|------|------|--------------------|
| B31 | **Magma-Koloss** | Gepanzert, Rücken-Schwachstelle muss freigelegt werden durch Positionierung |
| B32 | **Flammengeist-Zwillinge** | B6-Mechanik Feuer-Version, Fusion = Feuertornado |
| B33 | **Inferno-Wyrm** | Raum füllt sich mit Lava (Spieler muss auf Plattformen kämpfen) |
| B34 | **Aschevulkan** | Eruptions-Phasen: Spieler muss zwischen Deckungspunkten wechseln |
| B35 | **Glutseele** | Aschegeist-Boss: phased durch alles, Kontakt = 2 Schaden, sehr schwer fassbar |
| B36 | **Leviathan-Erwachen** | Leviathan erste Form: so groß dass 30% des Raums sein Körper ist |
| B37 | **Inferno-Angler** | Wie B7 aber Feuer: Lure-Pull in Lavapfützen |
| B38 | **Magma-Nautilus** | Wie B9 aber Lava-Projektile + Feuer-Wände statt normale Wände |
| B39 | **Vulkan-Drache** | Sea Drake Boss-Version: phased 3 Angriffsmuster in schneller Folge |
| B40 | **Vulkankönig** *(Biom-3-Finale)* | P4: Lava steigt auf, Kampf auf schrumpfender Insel |
| B41–B44 | **Ascending Bosses** | Kombinierte Mechaniken aus Biom 3 + erste Void-Elemente |
| B45 | **Abyssal-Vorbote** | Brücke zu Biom 4: Void-Risse erscheinen, Teile des Raums verschwinden |
| B46–B49 | **Hybridbosse** | Lava + Void kombiniert |
| B50 | **Gezeitenkaiser** | Biom-3+4-Brücke. Lava + Void voll kombiniert. 4 Phasen. |

---

### BIOM 4 BOSSE (Ebene 51–70): SKIZZE

| Boss | Name | Signature-Mechanik |
|------|------|--------------------|
| B51 | **Void-Koloss** | Riesig, Körperteile werden Void (Teil des Körpers = unsichtbar aber treffsicher) |
| B55 | **Nullzwillinge** | Wie B6 aber einer ist "Null" (unsichtbar aber existierend). Spieler muss blind treffen. |
| B60 | **Dimensionsbrecher** | Kampfraum selbst verändert sich: Teile des Raums "existieren nicht mehr" (Void) |
| B65 | **Abyss-Leviathan** | Leviathan in Void-Form: Körper ist Risslandschaft. Kampf auf schmelzendem Raum. |
| B70 | **Abyssal-Kaiser** *(Biom-4-Finale)* | 5-Phasen. Letzte Phase: Spieler allein im kompletten Void. Begrenztes Orientierungssystem. |

---

## ABSCHNITT 9: CODE SPIRITS — VOLLSTÄNDIGES SYSTEM

### Systemregeln

**Slots:** 3 aktive Slots (aus bis zu 15 Karten im Deck)
**Aktivierung:** Spirits spawnen am Eingang jedes Dungeonraums
**Priorisierungs-KI:** 
- Tanks: positionieren sich zwischen Spieler und nächstem Gegner
- Heiler: folgen Spirit/Spieler mit niedrigstem HP, nicht fixed dem Spieler
- DPS: priorisieren Elite > Boss-Adds > normale Gegner (nach Bedrohlichkeit)
- Alle: mindestens 1 Angriff alle 3s (kein Stehenbleiben mehr)

**Synergy-Budget (neu):** Empfohlene Kombinationen und warum:
- Tank + Heiler + DPS: klassisch, stabilste Kombination
- 2x Tank + Heiler: für schwere Bosse mit vielen Adds
- 1x Tank + 2x DPS: für schnelle Räume, hohes Risiko
- 3x DPS: nur für Spieler die den Schaden-Wettkampf lieben (sehr fragil)

---

### BESTEHENDE SPIRITS (verbessert)

| ID | Name | Rolle | Kritischer Fix |
|----|------|-------|----------------|
| ritter_korall | Ritter Korall | Tank | **FIX:** Taunt-Aura jetzt wirklich funktional — Gegner in 60px ignorieren Spieler, greifen ihn an. Sichtbar: goldener Anziehungs-Partikelring um ihn. |
| schildkroete_magnus | Schildkröte Magnus | Tank | **FIX:** Aktive Positionierung — stellt sich vor Spieler wenn Gegner angreift (bewegt sich zwischen Spieler und Gegner). |
| qualle_luna | Qualle Luna | Heiler | **FIX:** Heilt sich selbst wenn < 20% HP. Heilt Ziel mit niedrigstem HP, nicht immer Spieler. |
| seepferdchen_vita | Seepferdchen Vita | Heiler | **FIX:** AoE-Heal nur wenn 2+ Ziele unter 70% HP — sonst Einzelheilung effizienter. |
| schwertfisch_razor | Schwertfisch Razor | DPS | OK — Priorisierungs-Fix (Elite zuerst). |
| kugelfisch_boom | Kugelfisch Boom | DPS | **FIX:** 5s Regenerations-Timer nach Explosion (statt sofort). Explosions-VFX verbessern. |
| hai_shadow | Hai Shadow | DPS | **FIX:** Crit-VFX implementieren (kleiner weißer Funkenblitz beim Crit). Sonst OK. |
| wal_guardian | Wal Guardian | Tank | **FIX:** Schild-Bubble sichtbar als halbtransparente Kuppel um Spieler wenn aktiv. |

---

### NEUE SPIRITS (12 neu)

---

#### [S-09] ELEKTROAAL "VOLTIS"
- **Rolle:** DPS / Ketten-Elektro
- **Aussehen:** Schlanker Aal, permanent mit kleinen Blitzen umhüllt, gelblich-weiß. Körper leuchtet stärker kurz vor Ketten-Schuss.
- **Fähigkeit:** *Kettenblitz* — Schuss springt auf 2. Ziel in 80px (Schaden: 15, Ketten: 8). Nie verschwendet bei Gruppen.
- **Spezial (alle 10s):** *Überspannung* — Schlägt auf Boden, Blitz radial 100px, 20 Schaden. Telegraph: Körper leuchtet 600ms weiß.
- **Seltenheit:** Rare | **Fundort:** Boss 5+ Drop oder Rare-Card
- **API-generierbar:** Prompt: "Ein elektrischer Aal der durch Wasser Blitze weiterleitet"

---

#### [S-10] NEBELGEIST "HAZEARA"
- **Rolle:** Support / Sicht-Kontrolle
- **Aussehen:** Geisthafte Quallen-Form, weißgrau, mit Nebel-Aura. Halb-transparent.
- **Fähigkeit:** *Nebelfeld alle 8s* — 120px Nebelkreis (Gegner greifen 50% langsamer an im Nebel, 4s).
- **Spezial:** *Geisterform* — Kann durch Wände gehen für Flankenpositionierung. Tank-Spirits nutzen dies für bessere Positionierung.
- **Seltenheit:** Rare | **Fundort:** Elite-Drop Ebene 6+

---

#### [S-11] KORALLENGOLEM "BASALT"
- **Rolle:** Tank / Barriere-Ersteller
- **Aussehen:** Massiger Golem aus Korallen, langsam, riesig. Pinkrot.
- **Fähigkeit:** *Korallenwall alle 12s* — Errichtet 120px Wand zwischen sich und nächstem Gegner (2s Dauer).
- **Spezial:** *Korallenrüstung* — 3 Korallen-Puffer (wie Gegner N-12). 3 kostenlose Einzeltreffer absorbiert.
- **Seltenheit:** Epic | **Fundort:** Boss 4 Drop

---

#### [S-12] KLAPPERFISCH "CLAXON"
- **Rolle:** Support / Debuffer
- **Aussehen:** Skelettartiger Fisch, weiß-gelb, Klappergeräusch-Aura. Animationsblitzen aus dem Maul.
- **Fähigkeit:** *Lärmattacke alle 5s* — Schrill-Schuss auf nächsten Gegner, 0.8s Stun. Schallwellen-Ring sichtbar.
- **Spezial:** *Panikschrei (1x/Raum)* — Wenn Spieler < 2 HP: sofortiger Schrei, alle Gegner 150px = 1.5s Slow 60%.
- **Seltenheit:** Common | **Fundort:** Elite-Drop Ebene 3–8 (early nützlich)

---

#### [S-13] EISDRACHE "FROSTERLING"
- **Rolle:** DPS / Frost-Controller
- **Aussehen:** Mini-Seadrake, Eis-Schuppen, hellblau-weiß. Atmet kurzen Frosthauch zum Angriff.
- **Fähigkeit:** *Frosthauch* — Eiskegel 60px, 12 Schaden + 1s Slow 40%. Cooldown 2s.
- **Spezial (Legendary, alle 15s):** *Blizzard-Burst* — Kleiner Eisblizzard 150px Radius, 1s, alle Gegner 0.5s Freeze.
- **Seltenheit:** Legendary | **Fundort:** Boss 11+ Drop

---

#### [S-14] LAVAROBBE "EMBOAR"
- **Rolle:** Tank / Feuer-Aura-Träger
- **Aussehen:** Robbenform, Lava-Rüstungsplatten, dunkelrot-orange.
- **Fähigkeit:** *Feueraura permanent* — 40px Radius, 0.3 Schaden/s für angrenzende Gegner.
- **Spezial (alle 10s):** *Magma-Stoß* — Rempelt auf nächsten Gegner, 30 Schaden + Knockback.
- **Seltenheit:** Rare | **Fundort:** Boss 7+ Drop

---

#### [S-15] NAUTILUS-LÄUFER "SPIREX"
- **Rolle:** DPS / Spiralschütze
- **Aussehen:** Kleiner Nautilus, rotierend, lila-golden. Schießt leuchtende Spiralprojektile.
- **Fähigkeit:** *Spiralschuss* — Projektil dreht sich in einem Spiralbogen auf Gegner zu (trifft ihn von der Seite, schwerer auszuweichen). 18 Schaden.
- **Spezial:** *Echo-Spirale* — Pierce: Schuss teilt sich nach Treffer in 2 kleinere (je 8 Schaden, andere Winkel).
- **Seltenheit:** Epic | **Fundort:** Boss 9+ Drop

---

#### [S-16] SCHIMMERFISCH "PRISMA"
- **Rolle:** Support / Buff-Geber
- **Aussehen:** Transparenter Fisch, regenbogenfarben, sehr schnell.
- **Fähigkeit:** *Prismenfeld alle 8s* — Spieler erhält 3s lang +25% Projektilschaden.
- **Spezial (reaktiv, 1x/5s):** *Schimmer-Ausweichen* — Wenn Gegner-Projektil auf Spieler zufliegt (< 30px): Fisch fliegt kurz davor und stoppt 1 Projektil.
- **Seltenheit:** Rare | **Fundort:** Jedes 5. Boss-Drop

---

#### [S-17] DEEPSEA-TITAN "ABYSSON" *(API-generierbar)*
- **Rolle:** Tank / Abyssal-Presser
- **Aussehen:** Via API generiert — einzigartig je Spieler. Basis-Prompt: "Abyssaler Tiefseekoloss, Void-Tentakel, dunkel lila, 64x64 sprite".
- **Fähigkeit:** *Gravitationsfeld alle 10s* — Zieht alle Gegner 100px Richtung sich. 2s Festhaltung.
- **Spezial (1x/Kampf):** *Void-Schrei* — Screen kurz schwarz (0.3s), alle Gegner -5 HP.
- **Seltenheit:** Einzigartig (API) | **Fundort:** Nur via Spirit Forge (Unlock ab Ebene 30)

---

#### [S-18] GEISTERFISCH "REVENANT"
- **Rolle:** DPS / Durch-Alles-Schütze
- **Aussehen:** Geisterhafter Fisch, blassblau, halb im Boden. Gleitet sanft.
- **Fähigkeit:** *Geisterklinge* — Projektile gehen durch Wände und Gegner (Piercing). 10 Schaden.
- **Spezial:** *Rache-Geist* — Wenn anderer Spirit stirbt: 5s +50% Angriffsrate + 20% Lebenssteal.
- **Seltenheit:** Epic | **Fundort:** Boss 7+ Drop

---

#### [S-19] GIFTSCHLANGE "VENENARA"
- **Rolle:** DPS / DoT-Spezialistin
- **Aussehen:** Schlanke Schlange, giftgrün mit schwarzen Streifen.
- **Fähigkeit:** *Giftbiss alle 3s* — Bei Treffer: 3s Gifteffekt (0.4/s). Stacks 2x.
- **Spezial:** *Giftexplosion* — Stirbt Gegner mit doppelt-Gift-Stack: 60px Giftwolke (5s, 0.3/s). Kettenreaktion möglich.
- **Seltenheit:** Rare | **Fundort:** Biom-1-Boss-Drops

---

#### [S-20] ORAKELKRABBE "SIBYL" *(API-generierbar)*
- **Rolle:** Support / Hellseherin
- **Aussehen:** Via API. Basis-Prompt: "Mystische Krabbe mit goldenen Kristallkugeln, sehende Augen, 64x64 sprite".
- **Fähigkeit:** *Prophezeiung alle 12s* — Markiert 2 Gegner rot die in den nächsten 3s angreifen. Spieler kann vorbereiten.
- **Spezial (1x/Raum):** *Kristallorakel* — Alle Fallen + unsichtbare Gegner im Raum für 3s sichtbar (Muränen, Geisterkrabben etc.).
- **Seltenheit:** Einzigartig (API) | **Fundort:** Nur via Spirit Forge

---

### SPIRIT FORGE — API-GENERIERUNGSSYSTEM

**Freischaltung:** Ab Ebene 30 abgeschlossen.
**Vorgehen:**
1. Spieler wählt Archetyp: Tank / Heiler / DPS / Support
2. Spieler wählt Thema (Freitext + Vorschläge: Feuer / Eis / Elektro / Dunkel / Licht / Gift / Void)
3. Optional: kurze Beschreibung ("Ein Hai der durch Wände schwimmt")

**API liefert:**
- Name
- Text-Fähigkeitsbeschreibung
- Visual-Prompt (für optionale Sprite-Generierung)
- Statblock — balanciert nach Formel: `HP = Archetyp-Basis * (1 + floor/50)`, `Schaden = Archetyp-Basis`
- Unique `specialValue` (zufällig aus Archetype-Pool)

**Balancing-Formel für API-Spirits:**
| Archetyp | HP-Basis | Schaden-Basis | Speed-Basis |
|----------|----------|---------------|-------------|
| Tank | 150 | 6 | 1.5 |
| Heiler | 50 | 2 | 2.8 |
| DPS | 40 | 18 | 4.0 |
| Support | 35 | 3 | 3.5 |

**Speicherlimit:** Max. 2 gespeicherte API-Spirits gleichzeitig (Slot 3 muss freigeschaltet werden).

---

## ABSCHNITT 10: KI-PATTERN BIBLIOTHEK

### Bestehende Pattern (8, alle weiterhin gültig)
`drift`, `ground`, `kamikaze`, `turret`, `ambush`, `tank`, `flee`, `elite`
Plus Zusatz-Pattern: `flank`, `kite`

### Neue Pattern (7 neue)

#### `predictive`
Zielt auf Spielerposition + Velocity-Vektor × 500ms. Einsatz: Seeigel ab Ebene 6, Nadelrochen, Frostqualle.

#### `formation`
Gegner in Gruppe (3+) koordinieren Positionen: einer frontal, einer links, einer rechts. Aktualisiert alle 2s.
- **Fallback:** Wenn Mitglied stirbt → Formation-Neuberechnung sofort. Wenn Raum zu eng → fallback auf `drift`.
- **Mindestzahl:** Nur aktiv wenn 3+ Gegner des gleichen Typs im Raum.

#### `ambush_static`
Komplett still bis Spieler auf 60px kommt. Dann Dash. Telegraph: 400ms Körperzucken (kein Dash ohne Zucken).
- Einsatz: nur ab Ebene 5+, niemals mit anderen ambush_static im gleichen Raum.

#### `berserker`
Läuft unaufhaltsam in Spielerrichtung, 2x Speed, kein Ausweichen. Ignoriert Formation, Hindernisse etc.
- Einsatz: Wut-Phase niedriger HP-Gegner, enragt-Adds.

#### `patrol_hunt`
Läuft zufällig generierte Patrouillenbahn. Wechselt zu Chase bei Spieler < 200px.
- Einsatz: Steinwächter (Patrouille bis Fokus), Korallenrüstling (hält sicheren Abstand zur Gruppe).

#### `coordinated_ranged`
Mehrere Turret-Gegner im Raum feuern alternierend (kein gleichzeitiges "Safe Window"). Timer-Offset-System: wenn 2 Seeigel → feuern 1.25s versetzt.
- Einsatz: 2+ Seeigel im gleichen Raum.

#### `leash`
Max 200px vom Spawnpunkt. Kehrt zurück wenn weiter. Schafft verteidigte Zonen.
- Einsatz: Vulkanturm-Bereich, Schneckenhäuser, bewachte Schatzkammern.

---

## ABSCHNITT 11: BEKANNTE PROBLEME — ALLE FIXES

| # | Problem | Status | Fix-Beschreibung |
|---|---------|--------|-----------------|
| 1 | Boss 2 Adds haben `drift`-KI | BEHOBEN | Adds spawnen als `kamikaze` (2x) + `flee` (1x). Nach 5s: `formation`. |
| 2 | Boss 3 Salve kein Ausweichfenster | BEHOBEN | Telegraph 500ms + Projektilabstand erhöht auf 400ms + Speed reduziert. |
| 3 | Alle Gegner nur frontal | KLAR DEFINIERT | 12 überarbeitete Gegnertypen + 7 neue KI-Pattern. |
| 4 | Elites keine visuelle Unterscheidung | DEFINIERT | Goldener Glow-Outline + ⭐ Icon + Modifier-Tag. |
| 5 | Code Spirits stehen herum | BEHOBEN | Aktive Positionierungsregeln + Priorisierungs-KI + min 1 Angriff/3s. |
| 6 | Elite Ebene 15 zu stark | BEHOBEN | Klassifiziert als Mini-Boss-Zimmer (eigene Optik, eigene Musik, bewusste Entscheidung). |
| 7 | Boss 8 Phase 2 nur skaliert | BEHOBEN | Phase 2 = echte Aufspaltung in unabhängige Segmente = völlig anderes Spielgefühl. |
| 8 | Schattenfisch thematisch falsch | ERKLÄRT | Lore-Begründung hinzugefügt (Schnellschwimmer durch Steinrisse). |
| 9 | Boss 7 permanentes Dunkel | ABGEMILDERT | Nicht komplett dunkel, 60% Dimming + Silhouette immer sichtbar. |
| 10 | Keine Spieler-Referenz | HINZUGEFÜGT | Abschnitt 0 mit vollständiger Spieler-Stat-Referenz. |
| 11 | Biom 4+5 komplett leer | KURZÜBERBLICK | N-27–N-40 als Kurzüberblick, B51–B70 skizziert. |
| 12 | Statuseffekte unbegrenzt | DEFINIERT | Statuseffekt-Budget Abschnitt 0b: max 2 gleichzeitig, Prioritätshierarchie. |
| 13 | Raum-Layout ignoriert | HINZUGEFÜGT | 5 Raum-Typen mit Spawn-Regeln. |

---

## ABSCHNITT 12: BALANCING-MATRIX

### Spieler-Referenz (für Kontext)
- Spieler HP: 10 | Spieler Schaden: 1 | Invuln-Fenster: 1s

### Normalgegner Übersicht

| Gegner | HP | Schaden | Speed | Gefährlichkeit | Biom |
|--------|-----|---------|-------|----------------|------|
| Qualle | 2 | 1 | 0.035 | ⭐ | 1 |
| Steinkrabbe | 3 | 1 | 0.045 | ⭐⭐ | 1 |
| Leuchtfisch | 2 | 2 (Expl) | 0.07–0.09 | ⭐⭐ | 1 |
| Seeigel | 4 | 1 | — | ⭐⭐ | 1 |
| Muräne | 4 | 2 | 0.15 | ⭐⭐⭐ | 1 |
| Panzerfisch | 6 | 1 | 0.03 | ⭐⭐⭐ | 1 |
| Tintenfisch | 3 | 1 | 0.05 | ⭐⭐ | 1 |
| Steinwächter | 10 | 2 | 0.02 | ⭐⭐⭐⭐ | 1 |
| Geisterkrabbe | 3 | 0.5×2 | var | ⭐⭐⭐ | 1 |
| Nadelrochen | 3 | 1.5 | var | ⭐⭐⭐ | 1 |
| Schattenfisch | 4 (→2) | 1 | 0.09 | ⭐⭐⭐ | 1 |
| Korallenrüstling | 3 | 1 | 0.03 | ⭐⭐(+Buff) | 1 |
| Eiskrabbe | 3+2 Frost | 1+Freeze | 0.04 | ⭐⭐⭐ | 2 |
| Frostqualle | 3 | 0.5+DoT | 0.04 | ⭐⭐ | 2 |
| Oktopus | 6 | 1–1.5 | 0.03 | ⭐⭐⭐⭐ | 2 |
| Shadowfish | 4 | 1+Push | blink | ⭐⭐⭐ | 2 |
| Frostmuräne | 5 | 1.5+Freeze | 0.15 | ⭐⭐⭐⭐ | 2 |
| Gletscherschildkröte | 12 | 2+KB | 0.015 | ⭐⭐⭐⭐ | 2 |
| Kristallspinne | 4 | 1–1.5 | 0.05 | ⭐⭐⭐ | 2 |
| Magmakrabbe | 7 | 1.5 | 0.04 | ⭐⭐⭐ | 3 |
| Feuerfisch | 3 | 3 (Expl) | 0.10 | ⭐⭐⭐ | 3 |
| Stingray | 5 | 1.5+Stun | var | ⭐⭐⭐⭐ | 3 |
| Sea Drake | 8 | 2 | var | ⭐⭐⭐⭐ | 3 |
| Lavaborwurm | 6 | 2 | var | ⭐⭐⭐⭐ | 3 |
| Aschegeist | 5 | 1+Delay | var | ⭐⭐⭐ | 3 |
| Vulkanturm | 8 | 1.5 | — | ⭐⭐⭐ | 3 |

### Zahlenzusammenfassung

| Kategorie | War | Jetzt | Geplant (Biom 4+5) |
|-----------|-----|-------|---------------------|
| Normale Gegner | 8 | 26 | ~40 |
| Elite-Typen (unique) | 1 | 45 | ~70 |
| Bosse (definiert) | 15 | 50 skizziert, 15 voll ausgearbeitet | alle 50 voll |
| Code Spirits | 8 | 20 | offen |
| KI-Pattern | 8 | 15 | stabil |

---

## ABSCHNITT 13: SPRITE-PROMPTS FÜR NEUE GEGNER

Für Gegner ohne vorhandenes Sprite-Asset:

```
[N-09] Geisterkrabbe:
"A translucent blue ghost crab, barely visible with a faint rim light, ocean dungeon aesthetic, 
top-down view, outline style, 64x64 PNG, transparent background, game asset"

[N-10] Nadelrochen:
"A dark grey stingray with a glowing red belly organ, sleek, needle-like dorsal spine visible, 
ocean dungeon aesthetic, top-down view, 64x64 PNG, transparent background"

[N-12] Korallenrüstling:
"A pink-red deep sea fish with a coral growth crown on its back, glowing front organ, 
ocean dungeon style, top-down view, 64x64 PNG, transparent background"

[N-22] Stingray (Biom 3):
"A golden yellow stingray with electric blue arcs around its body, electric tail glow, 
ocean dungeon aesthetic, top-down view, 64x64 PNG, transparent background"

[N-24] Lavaborwurm:
"A segmented dark red magma worm with glowing orange segmentation lines, wide mouth opening, 
dungeon game asset, top-down view, 64x64 PNG, transparent background"

[N-25] Aschegeist:
"A ghostly dark grey ash creature, smoky boundary, glowing red cores inside, 
translucent spectral style, dungeon aesthetic, 64x64 PNG, transparent background"
```

---

## NÄCHSTE SCHRITTE (Implementierungsreihenfolge)

1. **Spieler-Referenz bestätigen** — HP und Dash-Status im Code verifizieren
2. **KI-Fixes für bestehende 8 Gegner** — verbesserte Verhaltenslogik implementieren
3. **Boss 2 Add-KI fix** — kamikaze statt drift
4. **Boss 3 Salve-Telegraph** — 500ms Telegraph + Projektilabstand
5. **Code-Spirits Positionierung** — Tanks aktiv zwischen Spieler und Gegner
6. **Elite-Visualisierung** — Glow-Outline + Icon + Modifier-Tag
7. **4 neue Gegner (N-09 bis N-12)** — mit neuen KI-Pattern
8. **Raum-Typ-System** — Spawn-Regeln nach Raumtyp
9. **Statuseffekt-Budget** — Max 2, Prioritätshierarchie
10. **12 neue Spirits** — schrittweise

---

*Ende DUNGEON_DESIGN_FINAL_Teil2.md*
*Zusammen mit Teil 1 vollständiges Design-Dokument für Review.*
