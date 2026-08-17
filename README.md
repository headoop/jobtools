# jobtools

Vier kleine Rechner rund um Arbeitszeit und Zeiträume, als reine Webseite
ohne Installation, Konto oder Server.

**Öffnen:** `index.html` im Browser öffnen – per Doppelklick oder über
`xdg-open index.html`. Es wird nichts hochgeladen und nichts übertragen; alle
Berechnungen laufen im Browser. Gespeichert wird ausschließlich die
Berechnungsbasis (siehe unten), und zwar nur lokal in diesem Browser.

| Seite | Zweck |
| --- | --- |
| [Arbeitszeit](#arbeitszeit-berechnen) | Schichtende, tatsächliche Arbeitszeit und Differenz zum Soll |
| [Wochenarbeitszeit](#teilzeitanteil-berechnen) | Wochenstunden und Prozent ineinander umrechnen |
| [Alter berechnen](#alter-berechnen) | Alter heute, vor dem 18./21. Geburtstag, zu einem Zieldatum |
| [Zeitraum berechnen](#zeitraum-berechnen) | Letzter Tag eines Zeitraums ab einem Startdatum |

---

## Berechnungsbasis

Rechts oben steht auf jeder Seite die Basis, mit der gerechnet wird, etwa
**39 h/Woche · 7,8 h/Tag**. Ein Klick darauf öffnet die Einstellung.

Beide Werte sind **getrennt** einstellbar. Das ist gewollt: So lässt sich eine
Vier-Tage-Woche abbilden, indem man 39 Wochenstunden bei 9,75 Stunden pro
Arbeitstag einträgt.

| Wert | Standard | Erlaubt | Wirkt sich aus auf |
| --- | --- | --- | --- |
| Wochenstunden | 39 | 1 bis 60 | Teilzeitanteil |
| Stunden pro Arbeitstag | 7,8 | 1 bis 24 | Arbeitszeit (Sollarbeitszeit, reguläres Ende) |

**Gut zu wissen**

- Weicht die Basis vom Standard ab, wechselt die Anzeige von Türkis auf
  Koralle – Sie sehen also sofort, dass nicht mit 39 h gerechnet wird.
- Die Einstellung bleibt über das Schließen des Browsers hinaus erhalten,
  **gilt aber nur für diesen Browser auf diesem Gerät**. An einem anderen
  Rechner, in einem anderen Browser oder nach dem Löschen der Browserdaten
  steht wieder der Standard.
- Im privaten Fenster oder bei gesperrtem Speicher gilt die Änderung nur für
  die laufende Sitzung; das Einstellfeld weist darauf hin.
- „Auf Standard zurücksetzen“ stellt 39 h und 7,8 h wieder her.
- Nach dem Speichern rechnet ein bereits angezeigtes Ergebnis sofort neu.
- Kommazahlen dürfen mit Komma oder Punkt eingegeben werden (`8,75` wie
  `8.75`). Werte außerhalb der Grenzen werden abgelehnt, statt still auf den
  Standard zurückzufallen.

---

## Arbeitszeit berechnen

Aus **Beginn** und **Ende** einer Schicht werden vier Angaben ermittelt:

| Angabe | Bedeutung |
| --- | --- |
| Ende regulär | Wann die Schicht endet, wenn genau die Sollzeit erreicht wird – Beginn + Sollarbeitszeit + 30 Minuten Pause |
| Arbeitszeit | Tatsächliche Arbeitszeit nach Abzug der Pause |
| Differenz | Abweichung von der Sollarbeitszeit, mit Vorzeichen |
| Pause | Die abgezogene Pause in Minuten |

### Pausenregeln

Die Pause wird nach der Brutto-Anwesenheit **automatisch abgezogen**, gestaffelt
nach dem deutschen Arbeitszeitgesetz:

| Anwesenheit | Abgezogene Pause | Arbeitszeit dann |
| --- | --- | --- |
| bis 6:00 h | keine | bis 6:00 h |
| 6:01 bis 6:29 h | 1 bis 29 Minuten | genau 6:00 h |
| 6:30 bis 9:30 h | 30 Minuten | 6:00 bis 9:00 h |
| 9:31 bis 9:44 h | 31 bis 44 Minuten | genau 9:00 h |
| ab 9:45 h | 45 Minuten | ab 9:00 h |

In den beiden variablen Stufen wird also nur so viel Pause abgezogen, dass die
Arbeitszeit auf 6:00 beziehungsweise 9:00 Stunden gedeckelt bleibt – die
Schwellen, ab denen das Gesetz die nächste Pausenstufe verlangt.

### Edge-Cases

- **Schicht über Mitternacht** wird unterstützt: Ist das Ende kleiner als der
  Beginn, wird der Tageswechsel eingerechnet. `22:00–06:00` ergibt 8 Stunden
  Anwesenheit und 7:30 Arbeitszeit.
- **Reguläres Ende nach Mitternacht** wird als Uhrzeit des Folgetags mit dem
  Zusatz „(Folgetag)“ ausgewiesen, etwa `6:18 (Folgetag)`.
- **Gleiche Uhrzeit für Beginn und Ende** ergibt null Minuten, nicht 24
  Stunden. Eine durchgehende 24-Stunden-Schicht lässt sich nicht eingeben.
- **Nur das Ende leer:** Es wird lediglich das reguläre Schichtende angezeigt.
- **Beginn leer:** Es erscheint kein Ergebnis.
- Die Pause ist eine **Annahme nach Gesetz**, keine erfasste Zeit. Wer länger
  Pause macht oder sie aufteilt, muss selbst nachrechnen.
- Es gibt **keine Prüfung auf Höchstarbeitszeit**, Ruhezeiten, Nacht- oder
  Sonntagszuschläge. Auch eine Schicht von 20 Stunden wird anstandslos
  berechnet.
- Die Seite kennt **kein Datum**. In der Nacht der Zeitumstellung ist die
  tatsächliche Anwesenheit deshalb eine Stunde kürzer oder länger als
  berechnet.
- Gerechnet wird auf **volle Minuten**; Sekunden gibt es nicht.

---

## Teilzeitanteil berechnen

Rechnet **Wochenstunden** und **Prozent** in beide Richtungen um. Das Ergebnis
zeigt beides zugleich, dazu die Stundenzahl in zwei Schreibweisen:

| Zeile | Beispiel | Bedeutung |
| --- | --- | --- |
| Anteil | 80 % | Anteil an der vollen Stelle |
| Wochenstunden | 31,2 | dezimal – 0,2 Stunden sind 12 Minuten |
| Stunden : Minuten | 31:12 | dieselbe Zeit als Stunden und Minuten |
| Berechnungsbasis | 39 h/Woche | woraus gerechnet wurde |

### Edge-Cases

- **Dezimal ist nicht hh:mm.** `31,2` heißt 31 Stunden und 12 Minuten, nicht
  31 Stunden 20 Minuten. Deshalb stehen beide Schreibweisen nebeneinander.
- Die Umrechnung in Stunden und Minuten **rundet auf ganze Minuten**. `33,33 %`
  ergibt 12,9987 Stunden und wird als `13:00` ausgewiesen – Hin- und
  Rückrechnung können daher um bis zu 30 Sekunden auseinanderliegen.
- Eingaben mit **Komma oder Punkt** sind beide erlaubt.
- Es gibt **keine Obergrenze**: 120 % oder 60 Wochenstunden werden berechnet,
  auch wenn das arbeitsrechtlich keinen Sinn ergibt. Negative Werte ebenso.
- Ein leeres Feld löst keine Berechnung aus; das vorherige Ergebnis bleibt
  stehen.
- Ändert sich die Berechnungsbasis, wird das angezeigte Ergebnis sofort neu
  berechnet.

---

## Alter berechnen

Aus dem **Geburtsdatum** ergeben sich drei Angaben, mit einem **Zieldatum**
eine vierte:

| Angabe | Bedeutung |
| --- | --- |
| heutiges Alter | Vollendete Lebensjahre am heutigen Tag |
| Tag vor dem 18. | Der letzte Tag vor Vollendung des 18. Lebensjahres |
| Tag vor dem 21. | Dasselbe für das 21. Lebensjahr |
| Alter am … | Vollendete Lebensjahre am eingegebenen Zieldatum |

### Edge-Cases

- Das **Zieldatum ist freiwillig**. Ohne Eingabe erscheint die Zeile gar nicht.
- **Am Geburtstag selbst** zählt das neue Lebensjahr bereits als vollendet.
- **29. Februar als Geburtstag:** In Jahren ohne Schalttag gilt das neue
  Lebensjahr ab dem 1. März. Am 28. Februar ist die Person also noch ein Jahr
  jünger.
- **Monatserster als Geburtstag:** Der Tag davor liegt im Vormonat. Zum
  1. März ist der Tag vor dem 18. der 28. Februar, im Schaltjahr der 29.
- **Datum in der Zukunft** ergibt „ungeboren“, ein Zieldatum vor der Geburt
  „noch nicht geboren“.
- Ohne Geburtsdatum erscheint ein Hinweis statt eines Ergebnisses.
- Gerechnet wird in **ganzen Kalendertagen** nach der Uhrzeit Ihres Geräts.
  Uhrzeiten spielen keine Rolle.

---

## Zeitraum berechnen

Aus **Startdatum** und einer Anzahl **Tage** oder **Wochen** ergibt sich der
letzte Tag des Zeitraums.

| Angabe | Bedeutung |
| --- | --- |
| Letzter Tag | Der letzte Tag des Zeitraums |
| Wochentag | Der Wochentag dieses Tages |
| Dauer | Die Länge in Tagen, bei Wochen zusätzlich umgerechnet |

### Edge-Cases

- **Das Startdatum zählt als erster Tag.** `17.08. + 14 Tage` endet am
  **30.08.**, nicht am 31.08. Eine Dauer von 1 Tag ergibt das Startdatum
  selbst.
- Zahlen **unter 1 werden abgelehnt** – ein Zeitraum, dessen erster Tag das
  Startdatum ist, umfasst mindestens einen Tag. Rückwärtsrechnen ist nicht
  vorgesehen.
- **Monate gibt es bewusst nicht**, nur Tage und Wochen.
- Gezählt werden **Kalendertage**, keine Arbeitstage: Wochenenden und
  Feiertage sind enthalten.
- Zeitumstellung, Schaltjahre und Jahreswechsel sind berücksichtigt, da im
  Kalender und nicht in 24-Stunden-Blöcken gerechnet wird.

---

## Was jobtools nicht ist

- **Keine Zeiterfassung.** Es gibt keine Historie, keine Wochen- oder
  Monatssummen und kein Konto. Jede Berechnung steht für sich; nichts wird
  gespeichert außer der Berechnungsbasis.
- **Keine Rechtsauskunft.** Die Pausenstaffel bildet die gesetzlichen
  Mindestpausen ab. Abweichende Regelungen aus Tarif-, Betriebs- oder
  Arbeitsvertrag kennt die Anwendung nicht, ebenso wenig Höchstarbeitszeiten
  und Ruhezeiten.
- **Keine Feiertage und keine Urlaubsberechnung.**

## Technische Hinweise

Vier HTML-Seiten, ein Stylesheet und je ein Skript – kein Build, keine
Abhängigkeiten. Läuft in aktuellen Browsern (Chrome, Edge, Firefox, Safari)
und auch direkt von der Festplatte über `file://`.

Die Seiten sind auf Barrierefreiheit ausgelegt: vollständige
Tastaturbedienung, semantische Auszeichnung für Screenreader, skalierbare
Schriftgrößen und Farbkontraste nach WCAG 2.1 AA. Geprüft wird das mit
`tools/a11y-check.sh`.

Hinweise für die Weiterentwicklung stehen in `CLAUDE.md`.
