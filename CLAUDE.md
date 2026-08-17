# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project

**jobtools** ist eine deutschsprachige Webanwendung zur Arbeitszeitberechnung.
Sie berechnet anhand von Beginn und Ende einer Schicht: reguläres Schichtende,
tatsächliche Arbeitszeit (nach Pausenabzug) und die Differenz zur
Sollarbeitszeit.

## Entwicklung

Kein Build-System, keine Abhängigkeiten – die App besteht aus vier Seiten
(`index.html`, `convert.html`, `ages.html`, `durations.html`) mit je einem
Skript, dazu `settings.js` und `style.css` für alle Seiten gemeinsam. Zum
Entwickeln genügt es, `index.html` direkt im Browser zu öffnen.

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

**Konstanten:** `pauseShort = 30` Minuten. Die Sollarbeitszeit eines Tages
liefert `standardWorkDay()` aus der eingestellten Stundenzahl pro Arbeitstag.

### Berechnungsbasis (`settings.js`)

Zwei getrennte, im `localStorage` abgelegte Werte bilden die Basis aller
Berechnungen – Standard ist 39 Wochenstunden und 7,8 Stunden pro Arbeitstag:

| Schlüssel              | Standard | Verwendung                       |
| ---------------------- | -------- | -------------------------------- |
| `jobtools.weekHours`   | 39       | `convert.html` (Teilzeitanteil)  |
| `jobtools.dayHours`    | 7,8      | `index.html` (Sollarbeitszeit)   |

Getrennt, damit auch eine Vier-Tage-Woche abbildbar ist (39 h bei 9,75 h/Tag).
`settings.js` baut Anzeige und Einstellbereich selbst in den `header` jeder
Seite ein und meldet Änderungen per `document`-Event `jobtools:basis`, worauf
die Seitenskripte ihr Ergebnis neu berechnen. Die Skripte müssen deshalb mit
`defer` (nicht `async`) eingebunden werden, damit `settings.js` zuerst läuft.

Eingabefelder für Dezimalzahlen sind `type="text"` mit `inputmode="decimal"`:
`type="number"` verwirft Eingaben mit Komma. `parseNumber()` akzeptiert beide
Schreibweisen.
