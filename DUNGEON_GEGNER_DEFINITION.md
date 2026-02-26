# Dungeon Gegner-Definition (Single Source of Truth)

Ziel: Eine klare, stabile Referenz für alle Dungeon-Gegner, Rollen, KI-Muster und Boss-Verhalten.

## 1) Basis-Gegner (Normal)

### qualle
- Rolle: Standard-Pressure / Flächenfüller
- AI: `drift`
- Verhalten: Treibt zufällig, leichter Kontaktdruck
- Typische Werte: niedrige HP, niedriger Schaden, mittlere Mobilität

### steinkrabbe
- Rolle: Nahkampf-Blocker
- AI: `ground`
- Verhalten: Boden-nah, horizontale Snap-Annäherung im Nahbereich
- Typische Werte: niedrige bis mittlere HP, solider Kontaktdruck

### leuchtfisch
- Rolle: Kamikaze / Burst-Gefahr
- AI: `kamikaze`
- Verhalten: Läuft an, startet Selbstexplosion in Nahdistanz
- Typische Werte: niedrige HP, hoher situativer Schaden

### seeigel
- Rolle: Stationäre Zone-Control
- AI: `turret`
- Verhalten: Bleibt stehen, feuert Projektile auf den Spieler
- Typische Werte: mittlere HP, konstantes Fernkampf-Poking

### muraene
- Rolle: Ambush / Dash-Angreifer
- AI: `ambush`
- Verhalten: Versteckt sich, dash't bei Nähe, retreatet danach
- Typische Werte: mittlere HP, hoher Peak-Schaden bei Fehlern

### panzerfisch
- Rolle: Tank / Frontdruck
- AI: `tank`
- Verhalten: Langsam, robust, drückt frontal
- Typische Werte: hohe HP, niedriger bis mittlerer Schaden

### tintenfisch
- Rolle: Kiter / Utility-Controller
- AI: `flee`
- Verhalten: Weicht aus, erzeugt Tintenwolken, kann Adds beisteuern
- Typische Werte: mittlere HP, kontrollorientiert statt Burst

### steinwaechter (Elite-Grundtyp)
- Rolle: Elite-Tank / Raumkontrolle
- AI: `elite`
- Verhalten: Langsam, robust, setzt Schockwellen
- Typische Werte: hohe HP, hoher Druck über AoE-Timing

---

## 2) KI-Muster (zusätzliche Verhaltens-Pattern)

### flank
- Zusatz-Pattern: Seitliches Umlaufen statt frontalem Rush
- Ziel: Dynamischere Kampfgeometrie

### kite
- Zusatz-Pattern: Distanz halten, rückwärts ausweichen
- Ziel: Anti-Face-Tanking, mehr Zielpriorisierung

Hinweis: Diese Pattern werden je nach Tiefenband auf geeignete Gegnertypen gemischt.

---

## 3) Tiefenbänder & Signature-Gegner

### Early (Tiefe 1–10)
- Schwerpunkt: Grundlesbarkeit, wenige Kombinationsfallen
- Signature: `seeigel`

### Mid (Tiefe 11–20)
- Schwerpunkt: mehr Flank/Setup-Druck
- Signature: `muraene`

### Late (Tiefe 21+)
- Schwerpunkt: Mischdruck aus Tank + Utility + Elite
- Signature: `steinwaechter`

---

## 4) Boss-System (aktuell)

- Boss-Definitionen laufen über `dungeon.json` (`bossDefinitions`) mit:
  - Name
  - Farbidentität
  - Attack-Set
  - HP/Speed
  - optionale Phasen

- Boss-Logik im Code umfasst u. a.:
  - Charge-/Spread-/Salven-Angriffe
  - Spezialmechaniken (z. B. Burrow, Laser, Shockwave, Adds, Reflect/Vortex je nach Boss)
  - Enrage/Phase-abhängige Eskalation (je nach Definition)

---

## 5) Visual-Regel (wichtig für Stabilität)

- Standard-Look: prozedurale Render-Formen (stabil, gameplay-konsistent)
- Sprite-Addon: optional zuschaltbar, niemals Pflicht
- Fallback-Regel: wenn Sprite fehlt/nicht geladen, immer auf Standard-Look zurück

---

## 6) Offene Ausbaupunkte (empfohlen)

1. Elite-Telegraphing standardisieren (einheitliche Vorwarnzeiten)
2. Elite-Modifier-Tags sichtbar machen (`Schnell`, `Explosiv`, `Regeneriert`)
3. Boss-Mechaniken pro Floor als kurze Design-Notiz ergänzen (1–2 Sätze pro Boss)
4. Balancing-Matrix pflegen (HP/Schaden/Spawn pro Tiefenband)

---

## 7) Änderungsregel für neue Gegner

Wenn ein neuer Gegnertyp eingeführt wird, müssen mindestens diese Felder ergänzt werden:
- Rolle
- AI-Basis (`drift`, `ground`, `kamikaze`, `turret`, `ambush`, `tank`, `flee`, `elite`)
- Tiefenband-Zuordnung
- Signature-Status (ja/nein)
- Visual-Quelle (Standard-Form + optionales Sprite)
- Kurz-Balancing-Notiz
