#!/bin/sh
# Prüft die Seiten auf Barrierefreiheit: Kontraste nach WCAG 2.1 AA,
# Tastaturbedienung und semantische Auszeichnung.
#
#   tools/a11y-check.sh              alle Seiten
#   tools/a11y-check.sh convert.html einzelne Seite
#
# Arbeitet auf einer Kopie im temporären Verzeichnis, damit die Seiten selbst
# das Prüfskript nicht einbinden müssen. Beendet sich mit 1, sobald eine
# Prüfung fehlschlägt – so lässt sich der Aufruf auch automatisiert nutzen.

set -eu

projekt=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
pruefskript="$projekt/tools/a11y-check.js"

browser=""
for kandidat in chromium chromium-browser google-chrome-stable google-chrome; do
  if command -v "$kandidat" >/dev/null 2>&1; then
    browser=$kandidat
    break
  fi
done
if [ -z "$browser" ]; then
  echo "Kein Chromium oder Chrome gefunden – wird für die Prüfung benötigt." >&2
  exit 2
fi

if [ "$#" -gt 0 ]; then
  seiten="$*"
else
  seiten="index.html convert.html ages.html durations.html"
fi

arbeitsverzeichnis=$(mktemp -d)
trap 'rm -rf "$arbeitsverzeichnis"' EXIT INT TERM
profil="$arbeitsverzeichnis/profil"

cp "$projekt"/*.html "$projekt"/*.js "$projekt"/style.css "$arbeitsverzeichnis"/
cp "$pruefskript" "$arbeitsverzeichnis"/

fehler=0

for seite in $seiten; do
  if [ ! -f "$arbeitsverzeichnis/$seite" ]; then
    echo "Seite nicht gefunden: $seite" >&2
    fehler=$((fehler + 1))
    continue
  fi

  # Prüfskript einhängen und style.css einbetten: bei file:// verweigert der
  # Browser den Zugriff auf cssRules verknüpfter Stylesheets, die Fokusregeln
  # wären sonst nicht lesbar
  pruefseite="$arbeitsverzeichnis/pruefung-$seite"
  awk -v css="$arbeitsverzeichnis/style.css" '
    /<link href="style.css"/ {
      print "<style>"
      while ((getline zeile < css) > 0) print zeile
      close(css)
      print "</style>"
      next
    }
    /<\/body>/ {
      print "<script src=\"a11y-check.js\" defer></script>"
    }
    { print }
  ' "$arbeitsverzeichnis/$seite" > "$pruefseite"

  bericht=$("$browser" --headless --disable-gpu --no-sandbox \
    --user-data-dir="$profil" --virtual-time-budget=8000 --dump-dom \
    "file://$pruefseite" 2>/dev/null |
    sed -n '/<pre id="a11y-report">/,/<\/pre>/p' |
    sed -e 's#<pre id="a11y-report">##' -e 's#</pre>##' \
        -e 's#&lt;#<#g' -e 's#&gt;#>#g' -e 's#&quot;#"#g' \
        -e "s/&#39;/'/g" -e 's#&amp;#\&#g')

  if [ -z "$bericht" ]; then
    echo "=== $seite ==="
    echo "  Kein Bericht erzeugt – lief das Prüfskript?" >&2
    fehler=$((fehler + 1))
    continue
  fi

  echo "=== $seite ==="
  echo "$bericht"
  echo

  # Schlusszeile des Berichts auswerten
  offen=$(echo "$bericht" | sed -n 's/.*Nicht bestanden: \([0-9][0-9]*\).*/\1/p' | tail -1)
  if [ -z "$offen" ]; then
    echo "  Bericht unvollständig – Prüfung abgebrochen." >&2
    fehler=$((fehler + 1))
  elif [ "$offen" -gt 0 ]; then
    fehler=$((fehler + offen))
  fi
done

if [ "$fehler" -gt 0 ]; then
  echo "Ergebnis: $fehler Beanstandungen." >&2
  exit 1
fi

echo "Ergebnis: alle Prüfungen bestanden."
