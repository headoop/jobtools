const beginWorkEl = document.getElementById("beginWork");
const endWorkEl = document.getElementById("endWork");
const endDayEl = document.getElementById("endDay");
const workTimeEl = document.getElementById("workTime");
const diffTimeEl = document.getElementById("diffTime");
const pauseEl = document.getElementById("pause");
const resultContainerEl = document.getElementById("result-container");
const pauseShort = 30;

// Sollarbeitszeit eines Tages in Minuten – Basis ist die eingestellte
// Stundenzahl pro Arbeitstag (siehe settings.js)
const standardWorkDay = () => Math.round(getDayHours() * 60);

// Ergebnis neu berechnen, wenn die Berechnungsbasis geändert wurde
document.addEventListener("jobtools:basis", () => logInput());

const logInput = () => {
  if (beginWorkEl.value !== "") {
    const b = beginWorkEl.value.split(":");
    const hBegin = Number(b[0]);
    const mBegin = Number(b[1]);
    const resultNormalEnd = normalEnd(hBegin, mBegin);
    resultContainerEl.style.display = "flex";
    endDayEl.style.display = "inline-block";
    endDayEl.textContent = `Ende regulär: ${resultNormalEnd}`;
    if (endWorkEl.value !== "") {
      const e = endWorkEl.value.split(":");
      const hEnd = Number(e[0]);
      const mEnd = Number(e[1]);
      const resultWorkTime = workTime(hBegin, mBegin, hEnd, mEnd);
      workTimeEl.style.display = "inline-block";
      workTimeEl.textContent = `Arbeitszeit: ${resultWorkTime[0]}:${resultWorkTime[1].toString().padStart(2, "0")}`;
      diffTimeEl.style.display = "inline-block";
      diffTimeEl.textContent = `Differenz: ${resultWorkTime[4]}${resultWorkTime[2]}:${resultWorkTime[3].toString().padStart(2, "0")}`
      pauseEl.style.display = "inline-block";
      pauseEl.textContent = `Pause: ${resultWorkTime[5]}`;
    } else {
      workTimeEl.style.display = "none";
      workTimeEl.textContent = "";
      diffTimeEl.style.display = "none";
      diffTimeEl.textContent = "";
      pauseEl.style.display = "none";
      pauseEl.textContent = "";
    }
  } else {
    resultContainerEl.style.display = "none";
    endDayEl.style.display = "none";
    endDayEl.textContent = "";
  }
};

const normalEnd = (h, m) => {
  const beginnMin = h * 60 + m;
  const gesamtMin = beginnMin + standardWorkDay() + pauseShort;
  const endStd = Math.floor(gesamtMin / 60);
  const endMin = gesamtMin % 60;
  return `${endStd}:${endMin.toString().padStart(2, "0")}`;
};

const minutesGesamt = (minutes) => {
  // returns array 'result' of numbers
  // berechnet Arbeitszeit in Stunden und Minuten
  const result = [];
  result[0] = Math.floor(minutes / 60);
  result[1] = minutes % 60;
  return result;
};

const minutesDiff = (minutes) => {
  // returns array 'result' of numbers
  // berechnet Differnez Arbeitszeit zu Standardarbeitsszeit
  // in Stunden und Minuten
  const result = [];

  if (minutes < 60 && minutes > -60) {
    result[0] = 0;
  } else {
    if (minutes < 0) {
      result[0] = Math.abs(Math.floor(minutes / 60));
    } else {
      result[0] = Math.floor(minutes / 60);
    }
  }
  result[1] = Math.abs(minutes % 60);
  result[2] = (minutes < 0) ? "-" : "+";
  return result;
};

const workTime = (hBegin, mBegin, hEnd, mEnd) => {
  // returns array 'times' of numbers
  // berechne Arbeitszeit abzüglich Pause
  const beginnMin = hBegin * 60 + mBegin;
  const endMin = hEnd * 60 + mEnd;
  let gesamtMin = endMin - beginnMin;
  const times = [];
  let pause;
  switch (true) {
    case gesamtMin <= 360:
      pause = 0;
      times.push(...minutesGesamt(gesamtMin));
      times.push(...minutesDiff(gesamtMin - standardWorkDay()));
      times.push(pause);
      break;
    case gesamtMin > 360 && gesamtMin < 390:
      pause = gesamtMin - 360;
      gesamtMin = gesamtMin - pause;
      times.push(...minutesGesamt(gesamtMin));
      times.push(...minutesDiff(gesamtMin - standardWorkDay()));
      times.push(pause);
      break;
    case gesamtMin >= 390 && gesamtMin <= 540:
      pause = 30;
      gesamtMin = gesamtMin - pause;
      times.push(...minutesGesamt(gesamtMin));
      times.push(...minutesDiff(gesamtMin - standardWorkDay()));
      times.push(pause);
      break;
    case gesamtMin > 540 && gesamtMin < 585:
      pause = gesamtMin - 540;
      pause = pause < 30 ? 30 : gesamtMin - 540;
      gesamtMin = gesamtMin - pause;
      times.push(...minutesGesamt(gesamtMin));
      times.push(...minutesDiff(gesamtMin - standardWorkDay()));
      times.push(pause);
      break;
    case gesamtMin >= 585:
      pause = 45;
      gesamtMin = gesamtMin - pause;
      times.push(...minutesGesamt(gesamtMin));
      times.push(...minutesDiff(gesamtMin - standardWorkDay()));
      times.push(pause);
      break;
  }
  return times;
};
