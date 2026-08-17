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

## Barrierefreiheit

Diese vier Vorgaben gelten für jede Änderung an den Seiten:

1. **Bilder brauchen einen Alternativtext.** Jedes `<img>` bekommt ein
   `alt`-Attribut – beschreibend bei inhaltstragenden Bildern, leer
   (`alt=""`) bei rein dekorativen. Derzeit verwendet die App keine Bilder.
2. **Textgrößen müssen skalierbar sein.** Schriftgrößen, Abstände und
   Breiten ausschließlich in `rem`, Media Queries in `em`. Kein `px` für
   irgendetwas, das Text trägt oder umschließt. Ausgenommen sind
   Haarlinien (`border`), Fokusrahmen (`outline`) und Schatten – sie
   sollen bei größerer Schrift bewusst nicht mitwachsen.
3. **Alles muss per Tastatur bedienbar sein.** Bedienelemente sind echte
   `<button>`-, `<input>`- und `<a>`-Elemente, niemals klickbare `<div>`.
   Formulare liegen in `<form>` und reagieren auf Enter. Aufklappbereiche
   schließen mit Escape und geben den Fokus an ihren Auslöser zurück.
   Jede Seite beginnt mit einem Sprunglink zu `#inhalt`. Fokus nie über
   `outline: none` entfernen, ohne sichtbaren Ersatz zu setzen.
4. **HTML semantisch auszeichnen.** `<header>`, `<nav>`, `<main>`,
   `<footer>` als Seitengerüst; genau eine `<h1>` je Seite und keine
   übersprungene Ebene; Ergebnisse als `<dl>` aus Bezeichnung und Wert;
   Optionsgruppen als `<fieldset>` mit `<legend>`; jedes Eingabefeld mit
   zugehörigem `<label for>`. Die aktive Seite trägt `aria-current="page"`,
   die Navigation ein `aria-label`, Ergebnisbereiche ein `aria-live="polite"`
   und Fehlermeldungen `role="alert"`.

Der Farbaufbau erfüllt WCAG 2.1 AA; die geprüften Verhältnisse stehen als
Kommentar im Kopf von `style.css`.
