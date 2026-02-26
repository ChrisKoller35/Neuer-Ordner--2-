# Endlos-Dungeon - Verbesserungsplan

Ziel: Den Endlos-Dungeon spannender, klarer und langfristig motivierender machen, ohne das Core-Gameplay zu verlieren.

## 1) 3x2 Raum-Layout mit Mission-1-Look (Prioritaet)
- Jeder Endlos-Raum besteht aus 3x2 verbundenen Szenen/Chunks.
- Kamera/Zoom bleibt auf Mission-1-Niveau (naeher dran), damit Combat wieder "druckvoll" wirkt.
- Ergebnis: Nahes Spielgefuehl + grosse Gesamtflaeche (6x Mission-1-Raum = 3600x1350px).
- Dafuer muessen Spawn-Logik, Uebergaenge, Navigation, Kamera-Tracking und Event-Trigger chunk-uebergreifend angepasst werden.

## 2) Tiefen-Meilensteine mit klaren Rewards
- Alle 5 oder 10 Tiefenstufen ein sichtbarer Meilenstein (z. B. garantierter Reward, neues Gegner-Muster, Mini-Event).
- So fuehlt sich Progression messbar an und nicht nur "immer mehr vom Gleichen".

## 3) Run-Modifikatoren + Session-Ziele (kombiniert)
- Beim Run-Start: 1-2 zufaellige Modifikatoren aktivieren (positiv/negativ), z. B. "+20% Schaden, aber -30% Heal".
- Dazu ein klares Session-Ziel im HUD einblenden: "Erreiche Tiefe 15" oder "Ueberlebe 3 Elite-Wellen ohne Hit".
- Belohnung bei Zielerreichung: Bonus-Waehrung oder Buff.
- Beide Mechaniken greifen auf dasselbe System (Run-State-Flag) zurueck - ein Aufwand, doppelter Effekt.

## 4) Elite-Wellen mit Telegraphing
- Seltene Elite-Gegner mit klaren Vorwarnungen (VFX + kurze Wind-up-Zeit).
- Schwierigkeit steigt fair, weil der Spieler lernen und reagieren kann.
- 1 sichtbarer Modifier-Tag pro Elite (z. B. "Schnell", "Explosiv", "Regeneriert") mit Farbe/Symbol.

## 5) Tiefe-abhaengige Gegner-Pools
- Gegner nicht nur skalieren, sondern Pool pro Tiefenbereich wechseln (1-10 / 11-20 / 21-30).
- Pro Band: 1 Signature-Gegner mit einzigartiger Rolle (z. B. Flanker, Sniper, Tank).
- Verhindert Monotonie und verbessert Schwierigkeitskurve ohne neue Grundsysteme.

## 6) Gegner-KI-Variationen
- Aktuell: alle Gegner rollen "auf Spieler zu". Das ist der Hauptgrund fuer Monotonie im Combat.
- Mindestens 2 neue Bewegungsmuster einfuehren:
  - Flanker: versucht seitlich anzugreifen statt frontal.
  - Kiter: weicht zurueck wenn Spieler naehert, schiesst aus Distanz.
- Umsetzung: einfache State-Machine pro Gegnertyp (chase / flank / retreat), kein vollstaendiges KI-System noetig.

## 7) Zweiter Tileset / Raum-Optik-Varianten
- Gleiche Mechanik, aber unterschiedliche visuelle Themen ab Tiefe 11 und 21.
- Beispiel: Tiefe 1-10 = Korallen-Riff, 11-20 = Tiefsee-Wrack, 21+ = Abysszone.
- Wenn ein zweites vollstaendiges Tileset zu aufwendig ist: Farbpaletten-Shift + andere Deko-Objekte reichen fuer den Effekt.

## 8) Besseres Dungeon-Oekonomie-Tempo
- Gold/Drop-Raten nach Tiefe feinjustieren, damit Fortschritt spuerbar bleibt.
- Ziel: Kein Grinding-Gefuehl, aber auch kein Exploit durch Snowballing.

## 9) Ein Endlos-Dungeon aktiv, weitere vorerst gesperrt
- Im UI gibt es nur einen startbaren Endlos-Dungeon ("Standard-Endlos").
- Slot 2 und Slot 3 sind sichtbar als "Bald verfuegbar", aber nicht auswaehlbar.
- Kein unnoetiger Varianten-Overhead im aktuellen Scope, volle Fokus-Qualitaet auf einen Modus.

---

## Spaeter (zu komplex fuer jetzt)

### Entscheidungsraeume zwischen Wellen
- Nach bestimmten Wellen eine Auswahl: "Heal", "Gold", "Buff", "Risiko-Raum".
- Benoetigt ein komplett neues UI-Zwischen-Fenster - erst angehen wenn Kern-Loop stabil ist.

### Synergie-Boni fuer Build-Kombos
- Kleine Boni bei bestimmten Item-/Skill-Kombinationen (z. B. Mine + Zeit-Blase = groesserer Radius).
- Erst sinnvoll wenn alle Skills sauber und vollstaendig im State leben. Sonst Balance-Alptraum.

### Fail-Feedback + Death-Recap
- Beim Tod kurze Analyse: haeufigster Schadenstyp, kritischer Moment, empfohlener Fokus.

### Meta-Progression fuer Endlos-Modus
- Separater, langsamer Endlos-Fortschritt (kleine permanente Utility-Upgrades).

---

## Umsetzungs-Reihenfolge (MVP)
1. 3x2 Raum-Layout + Mission-1 Kamera (Punkt 1) - groesster Spielgefuehl-Impact
2. Ein Dungeon aktiv, Slots 2/3 gesperrt (Punkt 9) - saubere UI-Basis
3. Run-Modifikatoren + Session-Ziele (Punkt 3) - wenig Aufwand, hoher Wiederspielwert
4. Tiefe-abhaengige Gegner-Pools + Signature-Gegner (Punkt 5) - Monotonie-Killer
5. Gegner-KI-Variationen (Punkt 6) - macht Combat wirklich anders

---

## Gegen "immer das Gleiche" - konkrete Quick Wins

Die schnellsten Verbesserungen ohne grossen Umbau:

1. Wellen-Templates rotieren
   - Statt Zufall aus einem Topf: 6-8 feste Muster (z. B. "Rush", "Sniper + Adds", "Tank-Wall"), zyklisch gemischt.

2. Alle 3 Tiefen ein Twist
   - Mini-Regel fuer kurze Zeit, z. B. "Projektile schneller", "Heilung reduziert", "mehr Elite-Chance".

3. 1 Signature-Gegner pro Tiefenband
   - Tiefe 1-10, 11-20, 21-30 jeweils ein klar neuer Gegnertyp mit eigener Rolle.

4. Arena-Varianten mit gleicher Logik
   - Gleiche Mechanik, aber andere Spawn-Punkte -> fuehlt sich neu an ohne komplettes Rework.

5. Tempo-Wechsel pro Welle
   - Nicht jede Welle gleich lang/intensiv: kurz-heftig, dann laenger-kontrolliert.

6. Risk/Reward-Angebote nach Boss-/Elite-Wellen
   - Wahlfenster: sicherer kleiner Reward oder riskanter grosser Reward.

7. Elite-Modifikatoren sichtbar machen
   - 1 klarer Tag pro Elite ("Schnell", "Explosiv", "Regeneriert") mit Farbe/Status-Symbol.

8. Kleine Event-Raeume mit 30-45s Dauer
   - Z. B. Ueberlebensraum, Jagdraum, Goldrauschraum.

9. Build-Checks im Spawn-System
   - Wenn Spieler z. B. starke Flaechenkontrolle hat, oefter mobile Gegner beimischen (Counterplay).

10. Session-Ziel anzeigen
    - Immer ein klares Kurz-Ziel oben einblenden ("Erreiche Tiefe 15", "2 Elites ohne Hit").

### Empfohlene Reihenfolge (sehr schnell umsetzbar)
1) Wellen-Templates
2) Signature-Gegner pro Tiefenband
3) Tempo-Wechsel
4) Session-Ziel