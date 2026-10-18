// Zeiterfassung: Zeitblöcke nachträglich eintragen, nach Monat und
// Kalenderwoche summieren, je Tag als übertragen markieren und als CSV
// sichern. Alles bleibt im localStorage dieses Browsers.

const STORAGE_KEY = "jobtools.timelog";
const NOTE_MAX = 50;
const CSV_HEADER = [
  "Datum", "Beginn", "Ende", "Dauer (h:mm)", "Dauer (dezimal)", "Übertragen", "Notiz",
];

const formEl = document.getElementById("log-form");
const dateEl = document.getElementById("log-date");
const beginEl = document.getElementById("log-begin");
const endEl = document.getElementById("log-end");
const noteEl = document.getElementById("log-note");
const noteCountEl = document.getElementById("log-note-count");
const submitEl = document.getElementById("log-submit");
const cancelEl = document.getElementById("log-cancel");
const errorEl = document.getElementById("log-error");
const storageNoteEl = document.getElementById("log-storage-note");
const storageErrorEl = document.getElementById("log-storage-error");
const monthTitleEl = document.getElementById("month-title");
const listEl = document.getElementById("log-list");
const listStatusEl = document.getElementById("list-status");
const deleteMonthEl = document.getElementById("delete-month-button");
const deleteAllEl = document.getElementById("delete-all-button");
const fileEl = document.getElementById("import-file");
const backupStatusEl = document.getElementById("backup-status");
const backupErrorEl = document.getElementById("backup-error");

// ---------------------------------------------------------------
// Datum, Uhrzeit und Zahlen
// ---------------------------------------------------------------

// parseDateInput() und formatDate() stehen gleichlautend in ages.js und
// durations.js; die Seiten laden sich nie gemeinsam
const parseDateInput = (value) => {
  // als lokale Mitternacht lesen; new Date("2026-08-17") wäre UTC und
  // würde je nach Zeitzone auf den Vortag rutschen
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) =>
  date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

// wie format() aus settings.js, das diese Seite nicht einbindet
const format = (number) =>
  number.toFixed(2).replace(".", ",").replace(",00", "").replace(/,(\d)0$/, ",$1");

const pad = (number) => String(number).padStart(2, "0");

const toDateValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "2026-02-30" passt ins Muster, ergibt aber den 2. März
const isDateValue = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateValue(parseDateInput(value)) === value;
};

const isTime = (value) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// 485 -> "8:05"
const formatDuration = (minutes) => `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;

const formatMonth = (year, month) =>
  new Date(year, month, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

const formatDay = (date) =>
  `${date.toLocaleDateString("de-DE", { weekday: "long" })}, ${formatDate(date)}`;

// Kalenderwoche nach ISO 8601: Die Woche beginnt am Montag und gehört zu dem
// Jahr, in dem ihr Donnerstag liegt. Gezählt wird über UTC-Tage, damit die
// Zeitumstellung keinen Tag verschluckt.
const dayNumber = (date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

const isoWeek = (date) => {
  const thursday = new Date(
    date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7)
  );
  const year = thursday.getFullYear();
  const week = Math.floor((dayNumber(thursday) - dayNumber(new Date(year, 0, 1))) / 7) + 1;
  return { year, week };
};

// Zeichen statt UTF-16-Einheiten: ein Emoji zählt als eines
const charCount = (text) => [...text].length;

const cleanNote = (text) => text.replace(/\r\n|[\r\n\t]/g, " ").trim();

const blockLabel = (entry) => `${entry.begin}–${entry.end}`;

const plural = (count, singular, pluralForm) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

// ---------------------------------------------------------------
// Speicher
// ---------------------------------------------------------------

const emptyLog = () => ({ version: 1, entries: [], transferred: [] });

const isEntry = (entry) =>
  entry !== null &&
  typeof entry === "object" &&
  typeof entry.id === "string" &&
  entry.id !== "" &&
  isDateValue(entry.date) &&
  isTime(entry.begin) &&
  isTime(entry.end) &&
  toMinutes(entry.end) > toMinutes(entry.begin) &&
  typeof entry.note === "string" &&
  charCount(entry.note) <= NOTE_MAX;

// liefert null für alles, was nicht genau diesem Aufbau entspricht – auch
// für eine spätere Version, die diese Seite nicht kennt
const parseStored = (raw) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.entries) ||
    !Array.isArray(parsed.transferred) ||
    !parsed.entries.every(isEntry) ||
    !parsed.transferred.every(isDateValue)
  ) {
    return null;
  }
  return {
    version: 1,
    entries: parsed.entries.map(({ id, date, begin, end, note }) => ({ id, date, begin, end, note })),
    transferred: [...new Set(parsed.transferred)],
  };
};

const storageWorks = () => {
  try {
    localStorage.setItem("jobtools.probe", "1");
    localStorage.removeItem("jobtools.probe");
    return true;
  } catch (e) {
    return false;
  }
};

// state: "ok", "unavailable" (Privatmodus, gesperrter Speicher) oder
// "broken" (unlesbarer Inhalt, der nicht überschrieben werden darf)
const loadLog = () => {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return { log: emptyLog(), state: "unavailable" };
  }
  if (raw === null) {
    return { log: emptyLog(), state: storageWorks() ? "ok" : "unavailable" };
  }
  const log = parseStored(raw);
  return log ? { log, state: "ok" } : { log: emptyLog(), state: "broken" };
};

let { log, state } = loadLog();

const persist = () => {
  if (state !== "ok") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (e) {
    // voller oder nachträglich gesperrter Speicher: weiterarbeiten, aber
    // sichtbar darauf hinweisen
    state = "unavailable";
    showStorageState();
  }
};

const showStorageState = () => {
  storageNoteEl.hidden = state !== "unavailable";
  storageErrorEl.hidden = state !== "broken";
  storageErrorEl.textContent =
    state === "broken"
      ? `Die gespeicherten Zeiten lassen sich nicht lesen (Speicherschlüssel ${STORAGE_KEY}). ` +
        "Damit nichts verloren geht, ändert und speichert diese Seite nichts, " +
        "bis der Inhalt repariert oder entfernt ist."
      : "";
};

// Bei unlesbarem Speicher wird jede Änderung abgelehnt; ein Speichern
// überschriebe die Daten, die sich vielleicht noch retten lassen.
const canChange = (showMessage) => {
  if (state !== "broken") return true;
  showMessage("Änderungen sind gesperrt, weil die gespeicherten Zeiten unlesbar sind.");
  return false;
};

const newId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const sortEntries = (entries) =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.begin.localeCompare(b.begin));

// ---------------------------------------------------------------
// Prüfen eines Blocks – für Formular und Import gleich
// ---------------------------------------------------------------

const overlapping = (block, entries, ignoreId) =>
  entries.find(
    (other) =>
      other.id !== ignoreId &&
      other.date === block.date &&
      toMinutes(block.begin) < toMinutes(other.end) &&
      toMinutes(other.begin) < toMinutes(block.end)
  );

// liefert eine Fehlermeldung oder null
const blockProblem = (block, entries, ignoreId) => {
  if (!isDateValue(block.date)) return "Das Datum ist ungültig.";
  if (!isTime(block.begin)) return "Der Beginn ist keine gültige Uhrzeit.";
  if (!isTime(block.end)) return "Das Ende ist keine gültige Uhrzeit.";
  if (toMinutes(block.end) <= toMinutes(block.begin)) {
    return "Das Ende muss nach dem Beginn liegen. " +
      "Eine Zeit über Mitternacht bitte als zwei Blöcke eintragen.";
  }
  if (charCount(block.note) > NOTE_MAX) {
    return `Die Notiz darf höchstens ${NOTE_MAX} Zeichen lang sein.`;
  }
  const other = overlapping(block, entries, ignoreId);
  if (other) {
    return `Der Block überschneidet sich mit ${blockLabel(other)} am ${formatDate(parseDateInput(other.date))}.`;
  }
  return null;
};

// ---------------------------------------------------------------
// Formular: Eintragen und Bearbeiten
// ---------------------------------------------------------------

let editingId = null;

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.hidden = false;
};

const hideError = () => {
  errorEl.hidden = true;
  errorEl.textContent = "";
};

const showNoteCount = () => {
  noteCountEl.textContent = `${charCount(noteEl.value)} von ${NOTE_MAX} Zeichen`;
};

// Grenze von 50 Zeichen beim Tippen und Einfügen; während einer Eingabe
// über eine Eingabemethode (etwa für Akzente) erst nach deren Abschluss
const limitNote = (event) => {
  if (event.isComposing) return;
  const chars = [...noteEl.value];
  if (chars.length > NOTE_MAX) {
    const caret = noteEl.selectionStart;
    noteEl.value = chars.slice(0, NOTE_MAX).join("");
    const position = Math.min(caret, noteEl.value.length);
    noteEl.setSelectionRange(position, position);
  }
  showNoteCount();
};

const missingFields = () => {
  const fields = [
    [dateEl, "ein Datum", "Datum"],
    [beginEl, "einen Beginn", "Beginn"],
    [endEl, "ein Ende", "Ende"],
  ].filter(([element]) => element.value === "");
  if (fields.length === 0) return null;
  if (fields.length === 1) return `Bitte ${fields[0][1]} eintragen.`;
  const names = fields.map(([, , name]) => name);
  return `Bitte ${names.slice(0, -1).join(", ")} und ${names[names.length - 1]} eintragen.`;
};

const startEdit = (id) => {
  const entry = log.entries.find((item) => item.id === id);
  if (!entry) return;
  editingId = id;
  dateEl.value = entry.date;
  beginEl.value = entry.begin;
  endEl.value = entry.end;
  noteEl.value = entry.note;
  showNoteCount();
  hideError();
  submitEl.textContent = "Änderung speichern";
  cancelEl.hidden = false;
  dateEl.focus();
};

// Fokus zurück auf die auslösende Schaltfläche, sonst landet er bei
// Tastaturbedienung am Seitenanfang
const endEdit = (returnFocus) => {
  const id = editingId;
  editingId = null;
  submitEl.textContent = "Eintragen";
  cancelEl.hidden = true;
  if (!returnFocus) return;
  const trigger = document.getElementById(`edit-${id}`);
  if (trigger) trigger.focus();
  else beginEl.focus();
};

const cancelEdit = () => {
  beginEl.value = "";
  endEl.value = "";
  noteEl.value = "";
  showNoteCount();
  hideError();
  endEdit(true);
};

const addEntry = () => {
  const missing = missingFields();
  if (missing) {
    showError(missing);
    return;
  }
  if (!canChange(showError)) return;

  const block = {
    date: dateEl.value,
    begin: beginEl.value,
    end: endEl.value,
    note: cleanNote(noteEl.value),
  };
  const problem = blockProblem(block, log.entries, editingId);
  if (problem) {
    showError(problem);
    return;
  }

  const wasEditing = editingId;
  if (wasEditing) {
    const entry = log.entries.find((item) => item.id === wasEditing);
    // ein Block, der den Tag wechselt, nimmt den Haken nicht mit; bleibt der
    // alte Tag leer, entfällt dessen Haken
    const oldDate = entry.date;
    Object.assign(entry, block);
    dropEmptyTransferred(oldDate);
  } else {
    log.entries.push({ id: newId(), ...block });
  }
  persist();

  hideError();
  beginEl.value = "";
  endEl.value = "";
  noteEl.value = "";
  showNoteCount();
  showMonthOf(block.date);
  if (wasEditing) {
    endEdit(true);
  } else {
    beginEl.focus();
  }
};

const dropEmptyTransferred = (date) => {
  if (!log.entries.some((entry) => entry.date === date)) {
    log.transferred = log.transferred.filter((item) => item !== date);
  }
};

// ---------------------------------------------------------------
// Liste: Löschen und Erledigt-Haken
// ---------------------------------------------------------------

const deleteEntry = (id) => {
  const entry = log.entries.find((item) => item.id === id);
  if (!entry || !canChange(showError)) return;
  const label = `Block ${blockLabel(entry)} am ${formatDate(parseDateInput(entry.date))} löschen?`;
  if (!window.confirm(label)) return;

  // Nachbar merken, bevor die Liste neu entsteht: nächster Block, sonst der
  // vorige, sonst die Monatsüberschrift
  const buttons = Array.from(listEl.querySelectorAll("[data-delete]"));
  const index = buttons.findIndex((button) => button.dataset.delete === id);
  const neighbour = buttons[index + 1] || buttons[index - 1];
  const neighbourId = neighbour ? neighbour.dataset.delete : null;

  log.entries = log.entries.filter((item) => item.id !== id);
  dropEmptyTransferred(entry.date);
  persist();
  if (editingId === id) cancelEdit();
  render();

  const target = neighbourId && document.getElementById(`delete-${neighbourId}`);
  (target || monthTitleEl).focus();
};

// Löscht mehrere Blöcke nach einer Rückfrage; where steht in den Texten,
// etwa „im Oktober 2026“. Liefert true, wenn gelöscht wurde.
const deleteEntries = (entries, where, showMessage, showResult) => {
  if (!canChange(showMessage)) return false;
  const days = new Set(entries.map((entry) => entry.date));
  const question =
    `${plural(entries.length, "Block", "Blöcke")} an ${plural(days.size, "Tag", "Tagen")} ` +
    `${where} endgültig löschen? Das lässt sich nicht rückgängig machen – wer die ` +
    "Zeiten noch braucht, exportiert sie vorher als CSV.";
  if (!window.confirm(question)) {
    showResult("Löschen abgebrochen, nichts wurde geändert.");
    return false;
  }

  const ids = new Set(entries.map((entry) => entry.id));
  log.entries = log.entries.filter((entry) => !ids.has(entry.id));
  days.forEach(dropEmptyTransferred);
  persist();
  if (editingId && ids.has(editingId)) cancelEdit();
  render();
  showResult(`${plural(entries.length, "Block", "Blöcke")} ${where} gelöscht.`);
  return true;
};

const showListStatus = (message) => {
  listStatusEl.textContent = message;
};

const deleteMonth = () => {
  const entries = monthEntries();
  // nur möglich, wenn ein anderes Fenster den Monat inzwischen geleert hat
  if (entries.length === 0) return;
  const where = `im ${formatMonth(view.year, view.month)}`;
  // der Knopf verschwindet mit dem letzten Block des Monats
  if (deleteEntries(entries, where, showError, showListStatus)) monthTitleEl.focus();
};

const setTransferred = (date, checked) => {
  if (!canChange(showError)) {
    render();
    return;
  }
  log.transferred = log.transferred.filter((item) => item !== date);
  if (checked) log.transferred.push(date);
  persist();
  render();
};

// ---------------------------------------------------------------
// Monatsansicht
// ---------------------------------------------------------------

const today = new Date();
let view = { year: today.getFullYear(), month: today.getMonth() };

// eine Meldung zum Löschen gehört zu dem Monat, in dem gelöscht wurde
const showMonthOf = (dateValue) => {
  const date = parseDateInput(dateValue);
  view = { year: date.getFullYear(), month: date.getMonth() };
  showListStatus("");
  render();
};

const changeMonth = (step) => {
  const date = new Date(view.year, view.month + step, 1);
  view = { year: date.getFullYear(), month: date.getMonth() };
  showListStatus("");
  render();
};

const monthEntries = () => {
  const prefix = `${view.year}-${pad(view.month + 1)}-`;
  return sortEntries(log.entries.filter((entry) => entry.date.startsWith(prefix)));
};

const el = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// <div><dt>…</dt><dd>…</dd></div> – dieselbe Zeilenform wie die
// Ergebnislisten der übrigen Seiten
const summaryRow = (term, value) => {
  const row = el("div", "result-row");
  row.append(el("dt", "", term), el("dd", "", value));
  return row;
};

const durationOf = (entry) => toMinutes(entry.end) - toMinutes(entry.begin);

const sumOf = (entries) => entries.reduce((sum, entry) => sum + durationOf(entry), 0);

// Lücken zwischen den Blöcken eines Tages; Überschneidungen gibt es nicht
const gapsOf = (sortedEntries) =>
  sortedEntries.reduce(
    (sum, entry, i) =>
      i === 0 ? 0 : sum + toMinutes(entry.begin) - toMinutes(sortedEntries[i - 1].end),
    0
  );

const formatTotal = (minutes) => `${formatDuration(minutes)} h · ${format(minutes / 60)} h`;

const renderBlock = (entry) => {
  const item = el("li", "log-block");
  const text = el("span", "log-block-time",
    `${blockLabel(entry)} (${formatDuration(durationOf(entry))})`);
  item.append(text);
  if (entry.note) {
    // textContent, nie innerHTML: die Notiz ist freier Text
    item.append(el("span", "log-block-note", entry.note));
  }

  const name = ` Block ${formatDate(parseDateInput(entry.date))}, ${blockLabel(entry)}`;
  const actions = el("span", "log-block-actions");
  const edit = el("button", "small-button", "Bearbeiten");
  edit.type = "button";
  edit.id = `edit-${entry.id}`;
  edit.dataset.edit = entry.id;
  edit.append(el("span", "visually-hidden", name));
  const remove = el("button", "small-button danger-button", "Löschen");
  remove.type = "button";
  remove.id = `delete-${entry.id}`;
  remove.dataset.delete = entry.id;
  remove.append(el("span", "visually-hidden", name));
  actions.append(edit, remove);
  item.append(actions);
  return item;
};

const renderDay = (dateValue, entries) => {
  const date = parseDateInput(dateValue);
  const transferred = log.transferred.includes(dateValue);
  const day = el("li", transferred ? "log-day is-transferred" : "log-day");

  const head = el("div", "log-day-head");
  head.append(el("span", "log-day-date", formatDay(date)));
  // zusätzlich zur Checkbox als Text, nicht nur über die Farbe (WCAG 1.4.1)
  if (transferred) head.append(el("span", "log-day-badge", "✓ übertragen"));
  day.append(head);

  const blocks = el("ul", "log-blocks");
  entries.forEach((entry) => blocks.append(renderBlock(entry)));
  day.append(blocks);

  const sums = el("dl", "log-day-sum");
  sums.append(summaryRow("Tagessumme", formatDuration(sumOf(entries))));
  if (entries.length > 1) {
    sums.append(summaryRow("Pause", formatDuration(gapsOf(entries))));
  }
  day.append(sums);

  const check = el("div", "log-check");
  const box = el("input");
  box.type = "checkbox";
  box.id = `transferred-${dateValue}`;
  box.checked = transferred;
  box.dataset.transferred = dateValue;
  const label = el("label", "", "übertragen");
  label.htmlFor = box.id;
  label.append(el("span", "visually-hidden", ` am ${formatDate(date)}`));
  check.append(box, label);
  day.append(check);
  return day;
};

const render = () => {
  // bei einer Neudarstellung entstehen alle Elemente neu; der Fokus bleibt
  // über die id erhalten, sonst fiele er auf den Seitenanfang zurück
  const focusedId = listEl.contains(document.activeElement) ? document.activeElement.id : null;

  const monthName = formatMonth(view.year, view.month);
  monthTitleEl.textContent = monthName;
  listEl.replaceChildren();

  const entries = monthEntries();
  deleteMonthEl.hidden = entries.length === 0;
  if (entries.length === 0) {
    listEl.append(el("p", "log-empty", `Für ${monthName} sind keine Zeiten erfasst.`));
    return;
  }

  const days = new Map();
  entries.forEach((entry) => {
    if (!days.has(entry.date)) days.set(entry.date, []);
    days.get(entry.date).push(entry);
  });
  const transferredDays = [...days.keys()].filter((date) => log.transferred.includes(date));

  const summary = el("dl", "log-summary");
  summary.append(
    summaryRow("Summe Monat", formatTotal(sumOf(entries))),
    summaryRow("Tage erfasst", String(days.size)),
    summaryRow("davon übertragen", String(transferredDays.length))
  );
  listEl.append(summary);

  // Wochen in Reihenfolge des Monats; am Monatsrand nur mit dessen Tagen
  const monthOnly = new Date(view.year, view.month, 1).toLocaleDateString("de-DE", { month: "long" });
  const weeks = new Map();
  days.forEach((dayEntries, dateValue) => {
    const { year, week } = isoWeek(parseDateInput(dateValue));
    const key = `${year}-${week}`;
    if (!weeks.has(key)) weeks.set(key, { year, week, days: [] });
    weeks.get(key).days.push([dateValue, dayEntries]);
  });

  weeks.forEach(({ year, week, days: weekDays }) => {
    const section = el("section", "log-week");
    // im Januar kann eine Woche noch zum Vorjahr gehören (KW 53)
    const title = year === view.year ? `KW ${week}` : `KW ${week}/${year}`;
    section.append(el("h4", "", title));

    // ragt die Woche über den Monat hinaus, zählt die Summe nur seine Tage
    const [firstDay] = weekDays[0];
    const date = parseDateInput(firstDay);
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const partial = monday.getMonth() !== view.month || sunday.getMonth() !== view.month;

    const weekSum = el("dl", "log-week-sum");
    weekSum.append(
      summaryRow(
        `Summe ${title}${partial ? ` (nur ${monthOnly})` : ""}`,
        formatTotal(sumOf(weekDays.flatMap(([, dayEntries]) => dayEntries)))
      )
    );
    section.append(weekSum);

    const list = el("ul", "log-days");
    weekDays.forEach(([dateValue, dayEntries]) => list.append(renderDay(dateValue, dayEntries)));
    section.append(list);
    listEl.append(section);
  });

  const focusTarget = focusedId && document.getElementById(focusedId);
  if (focusTarget) focusTarget.focus();
};

// ---------------------------------------------------------------
// CSV
// ---------------------------------------------------------------

// Excel führt Zellen, die mit =, +, - oder @ beginnen, als Formel aus; ein
// vorangestelltes ' verhindert das. Ein bereits vorhandenes ' am Anfang
// bekommt ebenfalls eines, damit der Import genau eines wieder abnimmt.
const FORMULA_START = /^'*[=+\-@]/;

const csvField = (text) => {
  let value = FORMULA_START.test(text) ? `'${text}` : text;
  if (/[;"\r\n]|^\s|\s$/.test(value)) value = `"${value.replace(/"/g, '""')}"`;
  return value;
};

const noteFromCsv = (text) => (FORMULA_START.test(text) && text.startsWith("'") ? text.slice(1) : text);

const buildCsv = () => {
  const lines = [CSV_HEADER.join(";")];
  sortEntries(log.entries).forEach((entry) => {
    const minutes = durationOf(entry);
    lines.push(
      [
        formatDate(parseDateInput(entry.date)),
        entry.begin,
        entry.end,
        formatDuration(minutes),
        format(minutes / 60),
        log.transferred.includes(entry.date) ? "ja" : "nein",
        csvField(entry.note),
      ].join(";")
    );
  });
  return lines.join("\r\n") + "\r\n";
};

// Zerlegt CSV mit ; als Trenner und "…" als Maskierung; Anführungszeichen
// dürfen Trenner und Zeilenumbrüche enthalten, "" steht für ein ".
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Leerzeilen, etwa am Dateiende, tragen nichts
  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ""));
};

// "18.10.2026" -> "2026-10-18"
const dateFromCsv = (text) => {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!match) return "";
  return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
};

// "8:05" und "08:05:00" kommen vor, wenn die Datei durch eine
// Tabellenkalkulation gelaufen ist
const timeFromCsv = (text) => {
  const match = /^(\d{1,2}):(\d{2})(?::00)?$/.exec(text.trim());
  return match ? `${pad(match[1])}:${match[2]}` : "";
};

const download = (content, filename) => {
  // BOM, damit Excel die Datei als UTF-8 liest und die Umlaute stimmen
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const showBackupStatus = (message) => {
  backupErrorEl.hidden = true;
  backupErrorEl.replaceChildren();
  backupStatusEl.textContent = message;
};

const showBackupError = (message, details = []) => {
  backupStatusEl.textContent = "";
  backupErrorEl.replaceChildren(el("p", "", message));
  if (details.length > 0) {
    const list = el("ul", "");
    details.forEach((detail) => list.append(el("li", "", detail)));
    backupErrorEl.append(list);
  }
  backupErrorEl.hidden = false;
};

const exportCsv = () => {
  if (log.entries.length === 0) {
    showBackupStatus("Es gibt noch nichts zu exportieren.");
    return;
  }
  download(buildCsv(), `jobtools-zeiterfassung-${toDateValue(new Date())}.csv`);
  showBackupStatus(`${plural(log.entries.length, "Block", "Blöcke")} exportiert.`);
};

// Prüft die ganze Datei, bevor etwas übernommen wird; liefert entweder
// { errors } oder { added, skipped, transferred }
const readBackup = (text) => {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length === 0 || rows[0].map((cell) => cell.trim()).join(";") !== CSV_HEADER.join(";")) {
    return { errors: ["Die Datei ist keine Sicherung der Zeiterfassung – die Kopfzeile passt nicht."] };
  }
  if (rows.length === 1) {
    return { errors: ["Die Datei enthält keine Zeiten."] };
  }

  const errors = [];
  const added = [];
  const transferred = new Set();
  let skipped = 0;
  // vorhandene und bereits angenommene Blöcke, gegen die geprüft wird
  const known = [...log.entries];

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.length !== CSV_HEADER.length) {
      errors.push(`Zeile ${line}: ${CSV_HEADER.length} Spalten erwartet, ${cells.length} gefunden.`);
      return;
    }
    const [dateText, beginText, endText, , , transferredText, noteText] = cells;
    const marker = transferredText.trim().toLowerCase();
    if (marker !== "ja" && marker !== "nein") {
      errors.push(`Zeile ${line}: In „Übertragen“ steht weder „ja“ noch „nein“.`);
      return;
    }
    const block = {
      date: dateFromCsv(dateText),
      begin: timeFromCsv(beginText),
      end: timeFromCsv(endText),
      note: cleanNote(noteFromCsv(noteText)),
    };

    const same = known.find(
      (entry) => entry.date === block.date && entry.begin === block.begin && entry.end === block.end
    );
    if (same) {
      // exakt vorhanden: überspringen, die vorhandene Notiz bleibt
      skipped += 1;
    } else {
      const problem = blockProblem(block, known, null);
      if (problem) {
        errors.push(`Zeile ${line}: ${problem}`);
        return;
      }
      const entry = { id: newId(), ...block };
      known.push(entry);
      added.push(entry);
    }
    if (marker === "ja" && !log.transferred.includes(block.date)) transferred.add(block.date);
  });

  return errors.length > 0 ? { errors } : { added, skipped, transferred: [...transferred] };
};

const applyBackup = ({ added, skipped, transferred }) => {
  const result =
    `${plural(added.length, "Block", "Blöcke")} übernommen, ` +
    `${skipped} ${skipped === 1 ? "war" : "waren"} bereits vorhanden`;
  if (added.length === 0 && transferred.length === 0) {
    showBackupStatus(`${result}. Es hat sich nichts geändert.`);
    return;
  }

  const marks = transferred.length > 0
    ? `, ${plural(transferred.length, "Tag", "Tage")} als übertragen markieren`
    : "";
  const question =
    `${plural(added.length, "Block", "Blöcke")} übernehmen, ${skipped} bereits vorhanden${marks}?`;
  if (!window.confirm(question)) {
    showBackupStatus("Import abgebrochen, nichts wurde übernommen.");
    return;
  }

  log.entries.push(...added);
  log.transferred.push(...transferred);
  persist();
  render();
  fileEl.value = "";
  showBackupStatus(`${result}.`);
};

const importCsv = () => {
  if (!canChange(showBackupError)) return;
  const file = fileEl.files && fileEl.files[0];
  if (!file) {
    showBackupError("Bitte zuerst eine CSV-Datei wählen.");
    fileEl.focus();
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const backup = readBackup(String(reader.result));
    if (backup.errors) {
      const shown = backup.errors.slice(0, 5);
      const rest = backup.errors.length - shown.length;
      if (rest > 0) shown.push(`und ${rest} weitere`);
      showBackupError("Import abgebrochen, nichts wurde übernommen:", shown);
      return;
    }
    applyBackup(backup);
  });
  reader.addEventListener("error", () => {
    showBackupError("Die Datei ließ sich nicht lesen.");
  });
  reader.readAsText(file, "utf-8");
};

const deleteAll = () => {
  // vor der Prüfung auf leeren Bestand: bei unlesbarem Speicher ist log leer,
  // die Meldung soll aber die Sperre nennen
  if (!canChange(showBackupError)) return;
  if (log.entries.length === 0) {
    showBackupStatus("Es gibt keine Zeiten zu löschen.");
    return;
  }
  // cancelEdit() setzt den Fokus ins Formular; er gehört zurück auf den Knopf
  if (deleteEntries([...log.entries], "aller Monate", showBackupError, showBackupStatus)) {
    deleteAllEl.focus();
  }
};

// ---------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------

// Absenden per Enter aus den Feldern heraus, nicht nur per Mausklick
formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  addEntry();
});
formEl.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editingId) cancelEdit();
});
cancelEl.addEventListener("click", cancelEdit);
noteEl.addEventListener("input", limitNote);
noteEl.addEventListener("compositionend", limitNote);

document.getElementById("month-prev").addEventListener("click", () => changeMonth(-1));
document.getElementById("month-next").addEventListener("click", () => changeMonth(1));
document.getElementById("export-button").addEventListener("click", exportCsv);
document.getElementById("import-button").addEventListener("click", importCsv);
deleteMonthEl.addEventListener("click", deleteMonth);
deleteAllEl.addEventListener("click", deleteAll);

// ein Handler für die ganze Liste, die bei jeder Darstellung neu entsteht
listEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.edit) startEdit(button.dataset.edit);
  if (button.dataset.delete) deleteEntry(button.dataset.delete);
});
listEl.addEventListener("change", (event) => {
  const box = event.target;
  if (box.dataset && box.dataset.transferred) setTransferred(box.dataset.transferred, box.checked);
});

// Ist die Seite zweimal offen, meldet das storage-Event dem anderen Fenster
// die Änderung – sonst zeigte es den alten Stand und überschriebe beim
// nächsten Speichern die neuen Einträge. Anders als settings.js schreibt
// die Seite nur einen Schlüssel, eine Sammelverzögerung braucht es nicht.
// null meldet der Browser, wenn der gesamte Speicher geleert wurde.
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  ({ log, state } = loadLog());
  showStorageState();
  // ein im anderen Fenster gelöschter Block lässt sich nicht mehr ändern;
  // die Eingaben bleiben stehen und lassen sich als neuer Block eintragen
  if (editingId && !log.entries.some((entry) => entry.id === editingId)) endEdit(false);
  render();
});

dateEl.value = toDateValue(today);
showStorageState();
showNoteCount();
render();
