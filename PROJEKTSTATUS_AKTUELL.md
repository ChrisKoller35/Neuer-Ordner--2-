# Cashfish – Projektstatus (Aktuell)

Diese Datei ist die zentrale Quelle für den aktuellen Stand, Ziele und nächste Schritte.

## Stand heute
- Das Spiel läuft lokal über Vite.
- Es gibt einen sicheren lokalen Sprite-Generator über Google API (CLI, nicht im Browser-Bundle).
- API-Keys bleiben lokal über .env.local und sind durch .gitignore geschützt.

## Aktive Ziele
1. KI-Sprite-Workflow stabil in den Alltag integrieren.
2. Neue Assets sauber in die bestehende Spielstruktur einhängen.
3. Refactoring nur noch gezielt und mit klarer Priorität durchführen.

## Nächste Schritte (konkret)
- Sprite-Import im Spiel vereinfachen (neue PNGs schneller nutzbar machen).
- Optional Batch-Generierung für mehrere Prompts ergänzen.
- Eine kurze Checkliste für "Prompt -> Sprite -> Einbau -> Test" festhalten.

## Regeln für Projektdokumentation
- Alte Statusdateien nicht wieder parallel führen.
- Änderungen am Plan nur in dieser Datei eintragen.
- Inhalte kurz halten: Stand, Ziel, nächste konkrete Schritte.

## Notizen
- Wenn sich Prioritäten ändern, zuerst diese Datei aktualisieren.
