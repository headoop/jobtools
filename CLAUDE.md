# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project

**jobtools** ist eine deutschsprachige Webanwendung mit vier Werkzeugen rund
um Arbeitszeit und Zeiträume. Jede Seite steht für sich:

| Seite            | Berechnet                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`     | **Arbeitszeit** aus Beginn und Ende einer Schicht: reguläres Schichtende, tatsächliche Arbeitszeit nach Pausenabzug und Differenz zur Sollarbeitszeit |
| `convert.html`   | **Teilzeitanteil**: Wochenstunden und Prozent ineinander, Ausgabe dezimal und als hh:mm                                                               |
| `ages.html`      | **Alter** am heutigen Tag, am Tag vor dem 18. und 21. Geburtstag sowie wahlweise zu einem Zieldatum                                                   |
| `durations.html` | **Zeitraum**: letzter Tag ab einem Startdatum in Tagen oder Wochen, wobei das Startdatum als erster Tag zählt                                         |

Arbeitszeit- und Teilzeitseite rechnen auf einer gemeinsamen, einstellbaren
Berechnungsbasis (siehe „Berechnungsbasis“ weiter unten).

## Entwicklung

Kein Build-System, keine Abhängigkeiten – die App besteht aus vier Seiten
(`index.html`, `convert.html`, `ages.html`, `durations.html`) mit je einem
Skript, dazu `settings.js` und `style.css` für alle Seiten gemeinsam. Zum
Entwickeln genügt es, `index.html` direkt im Browser zu öffnen.

```sh
# Im Browser öffnen (Beispiel)
xdg-open index.html
```

Es gibt keine Unit-Tests und keine Linting-Konfiguration; geprüft wird mit
`tools/a11y-check.sh` (siehe „Barrierefreiheit → Prüfung“).

## Architektur

Jede Seite hat ihr eigenes Skript gleichen Namens; darunter liegt
`settings.js` mit der Berechnungsbasis und den gemeinsamen Formathelfern
`format()`, `toHoursMinutes()` und `parseNumber()`. Einstiegspunkt ist auf
jeder Seite das Absenden des Formulars: `logInput()` (Arbeitszeit),
`action()` (Alter), `calcDuration()` (Zeitraum) bzw.
`convertHoursToPercent()` / `convertPercentToHours()` (Teilzeitanteil).

Datumsfelder werden mit `parseDateInput()` als lokale Mitternacht gelesen –
`new Date("2026-08-17")` wäre UTC und rutschte je nach Zeitzone auf den
Vortag. Diese Funktion steht zusammen mit `formatDate()` gleichlautend in
`ages.js` und `durations.js`; die beiden Seiten laden sich nie gemeinsam,
ein Zusammenlegen in `settings.js` wäre aber die sauberere Lösung.

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

| Schlüssel            | Standard | Verwendung                      |
| -------------------- | -------- | ------------------------------- |
| `jobtools.weekHours` | 39       | `convert.html` (Teilzeitanteil) |
| `jobtools.dayHours`  | 7,8      | `index.html` (Sollarbeitszeit)  |

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

### Prüfung

`tools/a11y-check.sh` prüft die Seiten gegen diese Vorgaben – Kontraste,
Bedienelemente, Fokusrahmen, Tastaturreihenfolge und Semantik. Nötig ist
nur ein installiertes Chromium oder Chrome.

```sh
tools/a11y-check.sh              # alle vier Seiten
tools/a11y-check.sh convert.html # einzelne Seite
```

Der Aufruf endet mit 0, wenn alles besteht, sonst mit 1 – nutzbar also
auch automatisiert. Die eigentlichen Prüfungen stehen in
`tools/a11y-check.js` und laufen im Browser.

Zwei Eigenheiten, die beim Ändern des Prüfskripts zu beachten sind:

- **Übergänge abschalten.** `getComputedStyle` liefert während einer
  laufenden `transition` den Startwert; ohne `transition: none` misst man
  die alte Farbe statt der neuen.
- **Fokusrahmen aus dem Stylesheet lesen, nicht messen.** Ein per
  JavaScript gesetzter Fokus löst `:focus-visible` bei Buttons nicht aus.
  Deshalb bettet das Skript `style.css` in die Prüfseite ein – bei
  `file://` verweigert der Browser sonst den Zugriff auf `cssRules` – und
  wertet die Regeln samt ihrer Spezifität aus.

### Regeln

- Nach main darf nur mit ausdrücklicher Erlaubnis des Users committed werden.
