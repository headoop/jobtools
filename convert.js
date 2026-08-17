const valuePercentEl = document.querySelector("#value-percent");
const valueHoursEl = document.querySelector("#value-hours");
const valueHhmmEl = document.querySelector("#value-hhmm");
const valueBasisEl = document.querySelector("#value-basis");

// zuletzt berechnete Richtung, damit das Ergebnis einer geänderten
// Berechnungsbasis folgen kann
let lastInput = null;

const showResult = (percent, hours) => {
  valuePercentEl.textContent = format(percent);
  valueHoursEl.textContent = format(hours);
  valueHhmmEl.textContent = toHoursMinutes(hours);
  valueBasisEl.textContent = `${format(getWeekHours())} h/Woche`;
};

const convertPercentToHours = () => {
  const input = document.getElementById("percent-input").value;
  if (input === "") return;
  const percent = parseNumber(input);
  lastInput = { mode: "percent", value: percent };
  showResult(percent, getWeekHours() / 100 * percent);
}

const convertHoursToPercent = () => {
  const input = document.getElementById("hours-input").value;
  if (input === "") return;
  const hours = parseNumber(input);
  lastInput = { mode: "hours", value: hours };
  showResult(hours / getWeekHours() * 100, hours);
}

document.addEventListener("jobtools:basis", () => {
  if (!lastInput) return;
  if (lastInput.mode === "percent") {
    showResult(lastInput.value, getWeekHours() / 100 * lastInput.value);
  } else {
    showResult(lastInput.value / getWeekHours() * 100, lastInput.value);
  }
});
