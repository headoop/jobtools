const toPercent = document.querySelector("#to-percent");
const toHours = document.querySelector("#to-hours");
const fullTimeJob = 39;

const convertPercentToHours = () => {
  const value = document.getElementById("percent-input").value;
  const result = fullTimeJob / 100 * value;
  toHours.innerHTML = "to hours " + result;
}

const convertHoursToPercent = () => {
  const value = document.getElementById("hours-input").value;
  const result = value / fullTimeJob * 100;
  toPercent.innerHTML = "to percent " + result;
}
