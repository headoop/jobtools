# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project

**jobtools** ist eine deutschsprachige Webanwendung zur Arbeitszeitberechnung.
Sie berechnet anhand von Beginn und Ende einer Schicht: reguläres Schichtende,
tatsächliche Arbeitszeit (nach Pausenabzug) und die Differenz zur
Sollarbeitszeit.

## Entwicklung

Kein Build-System, keine Abhängigkeiten – die App besteht aus drei Dateien
(`index.html`, `index.js`, `style.css`). Zum Entwickeln genügt es, `index.html`
direkt im Browser zu öffnen.

```sh
# Im Browser öffnen (Beispiel)
xdg-open index.html
```

Es gibt weder Tests noch eine Linting-Konfiguration.

## Architektur

Die gesamte Logik liegt in `index.js`. Zentraler Einstiegspunkt ist
`logInput()`, das bei Eingabe in die Zeitfelder ausgelöst wird und die UI
aktualisiert.

### Pausenregeln (deutsches Arbeitsrecht)

| Schichtdauer | Pause    |
| ------------ | -------- |
| ≤ 360 min    | keine    |
| 361–390 min  | variabel |
| 391–540 min  | 30 min   |
| ≥ 585 min    | 45 min   |

**Konstanten:** `standardWorkDay = 468` Minuten (7,8 h), `pauseShort = 30` Minuten.

### Offene TODOs

- `index.js:1` – Wochenarbeitszeit in Prozent umrechnen (und zurück)
- `style.css:1` – Nur Buttongröße skalieren, nicht das Label
