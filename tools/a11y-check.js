// Prüft eine Seite auf Kontraste (WCAG 2.1 AA), Bedienbarkeit per Tastatur
// und semantische Auszeichnung. Läuft im Browser, wird von a11y-check.sh in
// eine Kopie der Seite eingehängt und über --dump-dom ausgelesen.
//
// Das Ergebnis wird abschnittweise in <pre id="a11y-report"> geschrieben.
// Bricht die Ausführung ab, steht im Bericht, wie weit sie kam.

(() => {
  "use strict";

  // Übergänge abschalten: getComputedStyle liefert sonst den Startwert einer
  // laufenden Überblendung statt der Zielfarbe
  const noTransition = document.createElement("style");
  noTransition.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.appendChild(noTransition);

  const report = document.createElement("pre");
  report.id = "a11y-report";
  document.body.appendChild(report);

  let failures = 0;
  let checks = 0;

  const write = (line) => {
    report.textContent += line + "\n";
  };

  const result = (ok, ratioText, label) => {
    checks += 1;
    if (!ok) failures += 1;
    write(`  ${ok ? "OK   " : "FEHLT"} ${ratioText.padStart(12)}  ${label}`);
  };

  const section = (title, fn) => {
    write(`\n${title}`);
    try {
      fn();
    } catch (error) {
      failures += 1;
      write(`  ABBRUCH ${error.name}: ${error.message}`);
    }
  };

  // ---------------------------------------------------------------
  // Farbwerte
  // ---------------------------------------------------------------

  const channels = (color) => (color.match(/[\d.]+/g) || []).map(Number);

  const luminance = (rgb) => {
    const [r, g, b] = rgb.slice(0, 3).map((value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  // hellerer Endwert des Header-Verlaufs – der ungünstigere von beiden
  const HEADER_BACKGROUND = [39, 121, 167];

  // erste deckende Hintergrundfarbe über der Elementkette
  const backgroundOf = (element) => {
    let node = element;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage.includes("gradient")) return HEADER_BACKGROUND;
      const color = channels(style.backgroundColor);
      if (color.length < 4 || color[3] > 0) return color.slice(0, 3);
      node = node.parentElement;
    }
    return [255, 255, 255];
  };

  // große Schrift ab 24px, fett ab 18.66px braucht nur 3:1
  const threshold = (style) => {
    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10);
    return size >= 24 || (weight >= 600 && size >= 18.66) ? 3 : 4.5;
  };

  const ownText = (element) =>
    Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .join("");

  const isRendered = (element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  };

  // ---------------------------------------------------------------
  // Vorbereitung: eine Berechnung auslösen, damit auch die Ergebnis-
  // bereiche geprüft werden. Erkennt die Seite an ihren Formularen.
  // ---------------------------------------------------------------

  const submit = (form) => form.dispatchEvent(new Event("submit", { cancelable: true }));
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  };

  const prepare = () => {
    if (document.getElementById("work-form")) {
      setValue("beginWork", "07:30");
      setValue("endWork", "16:15");
      submit(document.getElementById("work-form"));
      return "Arbeitszeit berechnet";
    }
    if (document.getElementById("age-form")) {
      setValue("birthday", "2008-03-14");
      setValue("target", "2030-06-01");
      submit(document.getElementById("age-form"));
      return "Alter samt Zieldatum berechnet";
    }
    if (document.getElementById("duration-form")) {
      setValue("start", "2026-08-17");
      setValue("summand", "14");
      submit(document.getElementById("duration-form"));
      return "Zeitraum berechnet";
    }
    if (document.getElementById("hours-button")) {
      setValue("hours-input", "31,2");
      document.getElementById("hours-button").click();
      return "Teilzeitanteil umgerechnet";
    }
    return "keine Berechnung nötig";
  };

  // ---------------------------------------------------------------
  // Prüfungen
  // ---------------------------------------------------------------

  const checkText = () => {
    document.querySelectorAll("body *").forEach((element) => {
      if (element.closest("#a11y-report")) return;
      const text = ownText(element);
      if (!text || !isRendered(element)) return;
      // nur für Screenreader bzw. erst bei Fokus sichtbar
      if (element.classList.contains("visually-hidden")) return;
      if (element.classList.contains("skip-link")) return;

      const style = getComputedStyle(element);
      const need = threshold(style);
      const value = contrast(channels(style.color).slice(0, 3), backgroundOf(element));
      const name = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : "");
      result(value >= need, `${value.toFixed(2)}:1 / ${need}`, `${name} „${text.slice(0, 30)}“`);
    });
  };

  const checkControls = () => {
    document.querySelectorAll("input, button, .option-group label").forEach((element) => {
      if (!isRendered(element)) return;
      const style = getComputedStyle(element);
      const borderWidth = parseFloat(style.borderTopWidth);
      const borderColor = channels(style.borderTopColor);
      const transparent = borderColor.length === 4 && borderColor[3] === 0;
      const uses = borderWidth > 0 && !transparent ? "Rahmen" : "Fläche";
      const color =
        uses === "Rahmen" ? borderColor.slice(0, 3) : channels(style.backgroundColor).slice(0, 3);
      const value = contrast(color, backgroundOf(element.parentElement));
      const name = element.id || element.getAttribute("for") || element.tagName.toLowerCase();
      result(value >= 3, `${value.toFixed(2)}:1 / 3`, `${uses} ${name}`);
    });

    document.querySelectorAll("input[placeholder]").forEach((element) => {
      const color = channels(getComputedStyle(element, "::placeholder").color).slice(0, 3);
      const value = contrast(color, backgroundOf(element));
      result(value >= 4.5, `${value.toFixed(2)}:1 / 4.5`, `Platzhalter ${element.id}`);
    });
  };

  // Fokusrahmen werden aus dem Stylesheet gelesen statt gemessen: ein per
  // JavaScript gesetzter Fokus löst :focus-visible bei Buttons nicht aus,
  // die Messung meldete sonst fälschlich einen fehlenden Rahmen.
  // Dafür bettet a11y-check.sh style.css in die Prüfseite ein, denn bei
  // file:// verweigert der Browser den Zugriff auf cssRules verknüpfter
  // Stylesheets.
  const focusRules = () => {
    const rules = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      let list;
      try {
        list = sheet.cssRules;
      } catch (error) {
        return; // fremde Herkunft, nicht lesbar
      }
      Array.from(list).forEach((rule) => {
        if (rule.selectorText && rule.selectorText.includes(":focus")) rules.push(rule);
      });
    });
    return rules;
  };

  const rootStyle = getComputedStyle(document.documentElement);

  // "3px solid var(--focus)" -> [53, 165, 152]
  const resolveColor = (value) => {
    if (!value) return null;
    const filled = value.replace(/var\((--[\w-]+)\)/g, (_, name) =>
      rootStyle.getPropertyValue(name).trim()
    );
    const hex = filled.match(/#[0-9a-fA-F]{6}/);
    if (hex) {
      return [1, 3, 5].map((i) => parseInt(hex[0].substr(i, 2), 16));
    }
    const rgb = filled.match(/rgba?\([^)]+\)/);
    if (rgb) return channels(rgb[0]).slice(0, 3);
    if (/\bwhite\b/.test(filled)) return [255, 255, 255];
    if (/\bblack\b/.test(filled)) return [0, 0, 0];
    return null;
  };

  // grobe Gewichtung nach CSS-Spezifität: ohne sie gewänne die zuletzt
  // notierte Regel, obwohl etwa .settings-toggle:focus-visible stärker ist
  // als button:focus-visible
  const specificity = (selector) => {
    const rest = selector.replace(/:focus-visible|:focus/g, "");
    const ids = (rest.match(/#[\w-]+/g) || []).length;
    const classes = (rest.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(\([^)]*\))?/g) || []).length;
    const types = (
      rest.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[\w-]+(\([^)]*\))?/g, "").match(/[a-zA-Z][\w-]*/g) ||
      []
    ).length;
    return ids * 100 + classes * 10 + types;
  };

  const checkFocus = () => {
    const rules = focusRules();
    if (rules.length === 0) {
      write("  Stylesheet nicht lesbar – Fokusrahmen nicht prüfbar");
      failures += 1;
      return;
    }

    document.querySelectorAll(FOCUSABLE).forEach((element) => {
      if (!isRendered(element) || element.disabled) return;

      let declared = null;
      let removed = false;
      let bestWeight = -1;
      rules.forEach((rule) => {
        rule.selectorText.split(",").forEach((selector) => {
          // ":focus-visible" entfernen, damit der Rest gegen das Element passt
          const plain = selector.replace(/:focus-visible|:focus/g, "").trim();
          if (!plain) return;
          let matches = false;
          try {
            matches = element.matches(plain);
          } catch (error) {
            return; // z. B. Kombinatoren wie "+ label"
          }
          if (!matches) return;

          const color =
            resolveColor(rule.style.outlineColor) ||
            resolveColor(rule.style.outline) ||
            resolveColor(rule.style.borderColor);
          const weight = specificity(selector);
          // gleiche Spezifität: die spätere Regel gewinnt
          if (color && weight >= bestWeight) {
            declared = color;
            bestWeight = weight;
          }
          if (/\bnone\b/.test(rule.style.outline || rule.style.outlineStyle || "")) {
            removed = true;
          }
        });
      });

      const name = element.id || (element.textContent || "").trim().slice(0, 24);
      if (!declared) {
        // ohne eigene Regel zeichnet der Browser seinen Standardrahmen; das
        // ist ein gültiger Fokusanzeiger, nur ein ersatzloses Entfernen nicht
        result(!removed, removed ? "entfernt" : "Browserstandard", `Fokus ${name}`);
        return;
      }

      // der Rahmen liegt zwischen der Fläche des Elements und dem Umfeld;
      // 3:1 gegen eine der beiden Nachbarfarben genügt
      const outside = contrast(declared, backgroundOf(element.parentElement));
      const inside = contrast(declared, backgroundOf(element));
      const best = Math.max(outside, inside);
      result(best >= 3, `${best.toFixed(2)}:1 / 3`, `Fokus ${name}`);
    });
  };

  const FOCUSABLE =
    'a[href], button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';

  const checkKeyboard = () => {
    const elements = Array.from(document.querySelectorAll(FOCUSABLE)).filter(
      (element) => isRendered(element) && !element.disabled
    );
    elements.forEach((element, index) => {
      const label =
        (element.textContent || "").trim().slice(0, 30) ||
        (document.querySelector(`label[for="${element.id}"]`) || {}).textContent ||
        "";
      const name = element.tagName.toLowerCase() + (element.id ? `#${element.id}` : "");
      result(
        element.tabIndex >= 0,
        `${index + 1}.`,
        `${name} – ${label.trim().slice(0, 30)}`
      );
    });
  };

  // WCAG 1.4.10: Inhalte müssen umbrechen, statt waagerechtes Scrollen zu
  // erzwingen – besonders bei kleinem Fenster und großer Schrift
  const checkReflow = () => {
    const root = document.documentElement;
    // der eigene Bericht ist breiter als das Fenster und würde den Überlauf
    // vortäuschen, den er messen soll
    report.style.display = "none";
    const breite = root.clientWidth;
    const dokument = root.scrollWidth;
    const ueberlauf = dokument > breite + 1;
    const schuldige = [];
    if (ueberlauf) {
      document.querySelectorAll("body *").forEach((element) => {
        if (element.closest("#a11y-report")) return;
        const box = element.getBoundingClientRect();
        if (box.width > 0 && box.right > breite + 1) {
          schuldige.push(
            element.tagName.toLowerCase() +
              (element.id ? `#${element.id}` : "") +
              ` (bis ${Math.round(box.right)}px)`
          );
        }
      });
    }
    // Attribut wieder entfernen, nicht nur leeren: das Shell-Skript sucht
    // den Bericht über <pre id="a11y-report">
    report.removeAttribute("style");
    result(
      !ueberlauf,
      `${dokument} / ${breite}px`,
      `Dokumentbreite bei Grundschrift ${getComputedStyle(root).fontSize}` +
        (schuldige.length ? ` – ${schuldige.slice(0, 3).join(", ")}` : "")
    );
  };

  const checkStructure = () => {
    const has = (ok, label) => result(ok, "", label);

    has(document.documentElement.lang === "de", 'Sprache am <html> gesetzt');
    has(document.querySelectorAll("h1").length === 1, "genau eine <h1>");

    const levels = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) =>
      Number(h.tagName.slice(1))
    );
    has(
      levels.every((level, i) => i === 0 || level - levels[i - 1] <= 1),
      "keine übersprungene Überschriftenebene"
    );

    const skip = document.querySelector(".skip-link");
    has(
      Boolean(skip) && Boolean(document.querySelector(skip.getAttribute("href"))),
      "Sprunglink mit vorhandenem Ziel"
    );
    has(Boolean(document.querySelector("nav[aria-label]")), "Navigation benannt");
    has(Boolean(document.querySelector('[aria-current="page"]')), "aktive Seite ausgezeichnet");
    has(Boolean(document.querySelector("main")), "<main> vorhanden");
    has(Boolean(document.querySelector("[aria-live]")), "Ergebnisbereich mit aria-live");
    has(
      document.title.includes("Jobtools") && document.title.length > 8,
      `Seitentitel aussagekräftig („${document.title}“)`
    );

    document.querySelectorAll("input:not([type=hidden])").forEach((input) => {
      const labelled =
        Boolean(document.querySelector(`label[for="${input.id}"]`)) ||
        input.hasAttribute("aria-label") ||
        input.hasAttribute("aria-labelledby");
      has(labelled, `Feld ${input.id || input.name} beschriftet`);
    });

    document.querySelectorAll("button").forEach((button) => {
      has(Boolean(button.textContent.trim()), `Button „${button.textContent.trim().slice(0, 30)}“ benannt`);
    });

    has(
      document.querySelectorAll("[onclick]").length === 0,
      "keine Inline-Handler im Markup"
    );

    const error = document.querySelector(".form-error");
    if (error) has(error.getAttribute("role") === "alert", 'Fehlermeldung mit role="alert"');
  };

  // ---------------------------------------------------------------

  write(`Barrierefreiheit: ${document.title}`);
  write(`Vorbereitung: ${prepare()}`);

  section("Texte gegen Hintergrund (Kontrast / Soll)", checkText);
  section("Bedienelemente und Platzhalter", checkControls);
  section("Sichtbarkeit des Tastaturfokus", checkFocus);
  section("Reihenfolge und Erreichbarkeit per Tastatur", checkKeyboard);
  section("Umbruch ohne waagerechtes Scrollen", checkReflow);
  section("Struktur und Semantik", checkStructure);

  write(`\nGeprüft: ${checks}   Nicht bestanden: ${failures}`);
  document.title = failures === 0 ? "a11y-ok" : `a11y-fehler-${failures}`;
})();
