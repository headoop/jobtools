const startEl = document.getElementById("start");
const summandEl = document.getElementById("summand");
const durationFormEl = document.getElementById("duration-form");
const errorEl = document.getElementById("duration-error");
const resultContainerEl = document.getElementById("result-container");
const resultDateEl = document.getElementById("result-date");
const resultWeekdayEl = document.getElementById("result-weekday");
const resultDaysEl = document.getElementById("result-days");

const msPerDay = 24 * 60 * 60 * 1000;

const unitNames = {
  days: ["Tag", "Tage"],
  weeks: ["Woche", "Wochen"],
  months: ["Monat", "Monate"],
};

const selectedUnit = () =>
  document.querySelector('input[name="units"]:checked').value;

const parseDateInput = (value) => {
  // als lokale Mitternacht lesen; new Date("2026-08-17") wäre UTC und
  // würde je nach Zeitzone auf den Vortag rutschen
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addMonths = (date, count) => {
  const result = new Date(date.getFullYear(), date.getMonth() + count, date.getDate());
  // den 31. gibt es nicht in jedem Monat: 31.01. + 1 Monat ergibt sonst den
  // 03.03. – setDate(0) begrenzt auf den letzten Tag des Zielmonats
  if (result.getDate() !== date.getDate()) {
    result.setDate(0);
  }
  return result;
};

const addPeriod = (date, amount, unit) => {
  if (unit === "months") {
    return addMonths(date, amount);
  }
  const days = unit === "weeks" ? amount * 7 : amount;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
};

const formatDate = (date) =>
  date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const formatWeekday = (date) =>
  date.toLocaleDateString("de-DE", { weekday: "long" });

const formatAmount = (amount, unit) => {
  const [singular, plural] = unitNames[unit];
  return `${amount} ${Math.abs(amount) === 1 ? singular : plural}`;
};

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.hidden = false;
  resultContainerEl.style.display = "none";
};

const calcDuration = () => {
  if (startEl.value === "") {
    showError("Bitte ein Startdatum wählen.");
    return;
  }
  if (summandEl.value === "" || !Number.isFinite(Number(summandEl.value))) {
    showError("Bitte eintragen, wieviel addiert werden soll.");
    return;
  }

  const amount = Math.trunc(Number(summandEl.value));
  const unit = selectedUnit();
  const start = parseDateInput(startEl.value);
  const end = addPeriod(start, amount, unit);
  const days = Math.round((end - start) / msPerDay);

  errorEl.hidden = true;
  resultContainerEl.style.display = "grid";
  resultDateEl.textContent = formatDate(end);
  resultWeekdayEl.textContent = formatWeekday(end);
  resultDaysEl.textContent =
    unit === "days"
      ? formatAmount(days, "days")
      : `${formatAmount(amount, unit)} = ${formatAmount(days, "days")}`;
};

// Absenden per Enter aus den Feldern heraus, nicht nur per Mausklick
durationFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  calcDuration();
});
