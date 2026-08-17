const startEl = document.getElementById("start");
const summandEl = document.getElementById("summand");
const durationFormEl = document.getElementById("duration-form");
const errorEl = document.getElementById("duration-error");
const resultContainerEl = document.getElementById("result-container");
const resultDateEl = document.getElementById("result-date");
const resultWeekdayEl = document.getElementById("result-weekday");
const resultDaysEl = document.getElementById("result-days");

const unitNames = {
  days: ["Tag", "Tage"],
  weeks: ["Woche", "Wochen"],
};

const selectedUnit = () =>
  document.querySelector('input[name="units"]:checked').value;

const parseDateInput = (value) => {
  // als lokale Mitternacht lesen; new Date("2026-08-17") wäre UTC und
  // würde je nach Zeitzone auf den Vortag rutschen
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const totalDays = (amount, unit) => (unit === "weeks" ? amount * 7 : amount);

// letzter Tag des Zeitraums: das Startdatum ist bereits Tag 1, deshalb
// werden nur die restlichen Tage addiert
const lastDay = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days - 1);

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
  // das Startdatum zählt mit, ein Zeitraum umfasst also mindestens einen Tag
  if (amount < 1) {
    showError("Bitte eine Zahl ab 1 eintragen – das Startdatum zählt als erster Tag.");
    return;
  }

  const start = parseDateInput(startEl.value);
  const days = totalDays(amount, unit);
  const end = lastDay(start, days);

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
