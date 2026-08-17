// Gemeinsame Berechnungsbasis aller Seiten.
// Wird auf jeder Seite vor dem Seitenskript geladen, stellt die Einstellungen
// bereit und baut die Anzeige samt Einstellbereich in den Header ein.

const SETTINGS = {
  weekHours: { key: "jobtools.weekHours", fallback: 39, min: 1, max: 60 },
  dayHours: { key: "jobtools.dayHours", fallback: 7.8, min: 1, max: 24 },
};

const readSetting = (name) => {
  const { key, fallback, min, max } = SETTINGS[name];
  try {
    const stored = Number(localStorage.getItem(key));
    return stored >= min && stored <= max ? stored : fallback;
  } catch (e) {
    return fallback; // Privatmodus oder blockierter Speicher
  }
};

const writeSetting = (name, value) => {
  try {
    localStorage.setItem(SETTINGS[name].key, String(value));
    return true;
  } catch (e) {
    return false;
  }
};

const clearSettings = () => {
  try {
    Object.values(SETTINGS).forEach((setting) => localStorage.removeItem(setting.key));
    return true;
  } catch (e) {
    return false;
  }
};

const getWeekHours = () => readSetting("weekHours");
const getDayHours = () => readSetting("dayHours");
const isDefaultBasis = () =>
  getWeekHours() === SETTINGS.weekHours.fallback &&
  getDayHours() === SETTINGS.dayHours.fallback;

// gemeinsame Formathelfer
const format = (number) =>
  number.toFixed(2).replace(".", ",").replace(",00", "").replace(/,(\d)0$/, ",$1");

const toHoursMinutes = (decimalHours) => {
  // wandelt Dezimalstunden in die Schreibweise hh:mm um (31,2 -> 31:12)
  const totalMin = Math.round(decimalHours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const parseNumber = (value) => Number(String(value).replace(",", ".").trim());

// ---------------------------------------------------------------
// Anzeige und Einstellbereich im Header
// ---------------------------------------------------------------

const storageWorks = () => {
  try {
    localStorage.setItem("jobtools.probe", "1");
    localStorage.removeItem("jobtools.probe");
    return true;
  } catch (e) {
    return false;
  }
};

const buildSettings = () => {
  const header = document.querySelector("header");
  if (!header) return;

  const wrapper = document.createElement("div");
  wrapper.className = "settings";
  wrapper.innerHTML = `
    <button type="button" class="settings-toggle" id="settings-toggle"
            aria-expanded="false" aria-controls="settings-panel">
      <span class="settings-label">Basis:</span>
      <span class="settings-value" id="settings-summary"></span>
      <!-- FE0E erzwingt die monochrome Textdarstellung (Windows sonst farbig) -->
      <span class="settings-icon" aria-hidden="true">&#9881;&#xFE0E;</span>
    </button>
    <div class="settings-panel" id="settings-panel" hidden>
      <h2>Berechnungsbasis</h2>
      <!-- text statt number: type="number" verwirft Eingaben mit Komma -->
      <label for="setting-week">Wochenstunden</label>
      <input type="text" inputmode="decimal" id="setting-week" />
      <label for="setting-day">Stunden pro Arbeitstag</label>
      <input type="text" inputmode="decimal" id="setting-day" />
      <p class="settings-hint" id="settings-hint"></p>
      <p class="settings-error" id="settings-error" role="alert" hidden></p>
      <div class="settings-actions">
        <button type="button" id="settings-save">Speichern</button>
        <button type="button" class="link-button" id="settings-reset">
          Auf Standard zur&uuml;cksetzen
        </button>
      </div>
      <p class="settings-note" id="settings-note" hidden>
        Der Browser speichert nichts &ndash; die &Auml;nderung gilt nur f&uuml;r diese Sitzung.
      </p>
    </div>
  `;
  header.appendChild(wrapper);

  const toggleEl = document.getElementById("settings-toggle");
  const panelEl = document.getElementById("settings-panel");
  const summaryEl = document.getElementById("settings-summary");
  const weekInputEl = document.getElementById("setting-week");
  const dayInputEl = document.getElementById("setting-day");
  const hintEl = document.getElementById("settings-hint");
  const errorEl = document.getElementById("settings-error");

  if (!storageWorks()) {
    document.getElementById("settings-note").hidden = false;
  }

  const showSummary = () => {
    summaryEl.textContent =
      `${format(getWeekHours())} h/Woche · ${format(getDayHours())} h/Tag`;
    toggleEl.classList.toggle("is-custom", !isDefaultBasis());
    toggleEl.title = isDefaultBasis()
      ? "Standardbasis – zum Ändern klicken"
      : "Geänderte Basis – zum Bearbeiten klicken";
  };

  const showHint = () => {
    const week = parseNumber(weekInputEl.value);
    const day = parseNumber(dayInputEl.value);
    hintEl.textContent = week > 0 && day > 0
      ? `${format(week)} h/Woche ÷ ${format(day)} h/Tag = ${format(week / day)} Arbeitstage`
      + ` (${toHoursMinutes(day)} h pro Tag)`
      : "";
  };

  const fillInputs = () => {
    weekInputEl.value = format(getWeekHours());
    dayInputEl.value = format(getDayHours());
    errorEl.hidden = true;
    showHint();
  };

  const isValid = (value, name) =>
    value >= SETTINGS[name].min && value <= SETTINGS[name].max;

  const save = () => {
    const week = parseNumber(weekInputEl.value);
    const day = parseNumber(dayInputEl.value);
    if (!isValid(week, "weekHours") || !isValid(day, "dayHours")) {
      errorEl.textContent =
        "Bitte 1–60 Wochenstunden und 1–24 Stunden pro Arbeitstag eintragen.";
      errorEl.hidden = false;
      return;
    }
    writeSetting("weekHours", week);
    writeSetting("dayHours", day);
    errorEl.hidden = true;
    showSummary();
    closePanel(true);
    document.dispatchEvent(new CustomEvent("jobtools:basis"));
  };

  const reset = () => {
    clearSettings();
    fillInputs();
    showSummary();
    document.dispatchEvent(new CustomEvent("jobtools:basis"));
  };

  const openPanel = () => {
    fillInputs();
    panelEl.hidden = false;
    toggleEl.setAttribute("aria-expanded", "true");
    weekInputEl.focus();
  };

  // Fokus zurück auf die Schaltfläche, sonst landet er bei Tastaturbedienung
  // wieder am Seitenanfang
  const closePanel = (returnFocus) => {
    panelEl.hidden = true;
    toggleEl.setAttribute("aria-expanded", "false");
    if (returnFocus) toggleEl.focus();
  };

  toggleEl.addEventListener("click", () => {
    panelEl.hidden ? openPanel() : closePanel();
  });
  weekInputEl.addEventListener("input", showHint);
  dayInputEl.addEventListener("input", showHint);
  document.getElementById("settings-save").addEventListener("click", save);
  document.getElementById("settings-reset").addEventListener("click", reset);
  panelEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") closePanel(true);
  });
  document.addEventListener("click", (event) => {
    if (!panelEl.hidden && !wrapper.contains(event.target)) closePanel();
  });

  showSummary();
};

buildSettings();
