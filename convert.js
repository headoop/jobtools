const valuePercentEl = document.querySelector("#value-percent");
const valueHoursEl = document.querySelector("#value-hours");
const valueHhmmEl = document.querySelector("#value-hhmm");
const fullTimeJob = 39;

const format = (number) => number.toFixed(2).replace(".", ",").replace(",00", "");

const toHoursMinutes = (decimalHours) => {
  // wandelt Dezimalstunden in die Schreibweise hh:mm um (31,2 -> 31:12)
  const totalMin = Math.round(decimalHours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const showResult = (percent, hours) => {
  valuePercentEl.textContent = format(percent);
  valueHoursEl.textContent = format(hours);
  valueHhmmEl.textContent = toHoursMinutes(hours);
};

const convertPercentToHours = () => {
  const input = document.getElementById("percent-input").value;
  if (input === "") return;
  const percent = Number(input);
  showResult(percent, fullTimeJob / 100 * percent);
}

const convertHoursToPercent = () => {
  const input = document.getElementById("hours-input").value;
  if (input === "") return;
  const hours = Number(input);
  showResult(hours / fullTimeJob * 100, hours);
}
