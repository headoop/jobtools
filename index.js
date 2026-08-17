const beginWorkEl = document.getElementById("beginWork");
const endWorkEl = document.getElementById("endWork");
const endDayEl = document.getElementById("endDay");
const workTimeEl = document.getElementById("workTime");
const diffTimeEl = document.getElementById("diffTime");
const pauseEl = document.getElementById("pause");
const resultContainerEl = document.getElementById("result-container");
const rowEndDayEl = document.getElementById("row-endDay");
const rowWorkTimeEl = document.getElementById("row-workTime");
const rowDiffTimeEl = document.getElementById("row-diffTime");
const rowPauseEl = document.getElementById("row-pause");
const workFormEl = document.getElementById("work-form");
const pauseShort = 30;
const minutesPerDay = 24 * 60;

// Sollarbeitszeit eines Tages in Minuten – Basis ist die eingestellte
// Stundenzahl pro Arbeitstag (siehe settings.js)
const standardWorkDay = () => Math.round(getDayHours() * 60);

// Ergebnis neu berechnen, wenn die Berechnungsbasis geändert wurde
document.addEventListener("jobtools:basis", () => logInput());

// Absenden per Enter aus den Zeitfeldern heraus, nicht nur per Mausklick
workFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  logInput();
});

// leere Zeile ausblenden; "" stellt den Wert aus dem Stylesheet wieder her
const showRow = (row, visible) => {
  row.style.display = visible ? "" : "none";
};

const logInput = () => {
  if (beginWorkEl.value !== "") {
    const b = beginWorkEl.value.split(":");
    const hBegin = Number(b[0]);
    const mBegin = Number(b[1]);
    const resultNormalEnd = normalEnd(hBegin, mBegin);
    resultContainerEl.style.display = "grid";
    showRow(rowEndDayEl, true);
    endDayEl.textContent = resultNormalEnd;
    if (endWorkEl.value !== "") {
      const e = endWorkEl.value.split(":");
      const hEnd = Number(e[0]);
      const mEnd = Number(e[1]);
      const resultWorkTime = workTime(hBegin, mBegin, hEnd, mEnd);
      showRow(rowWorkTimeEl, true);
      workTimeEl.textContent = `${resultWorkTime[0]}:${resultWorkTime[1].toString().padStart(2, "0")}`;
      showRow(rowDiffTimeEl, true);
      diffTimeEl.textContent = `${resultWorkTime[4]}${resultWorkTime[2]}:${resultWorkTime[3].toString().padStart(2, "0")}`
      showRow(rowPauseEl, true);
      pauseEl.textContent = `${resultWorkTime[5]} Minuten`;
    } else {
      showRow(rowWorkTimeEl, false);
      workTimeEl.textContent = "";
      showRow(rowDiffTimeEl, false);
      diffTimeEl.textContent = "";
      showRow(rowPauseEl, false);
      pauseEl.textContent = "";
    }
  } else {
    resultContainerEl.style.display = "none";
    showRow(rowEndDayEl, false);
    endDayEl.textContent = "";
  }
};

const normalEnd = (h, m) => {
  const beginnMin = h * 60 + m;
  const rohMin = beginnMin + standardWorkDay() + pauseShort;
  // reicht das Schichtende über Mitternacht, zählt die Uhrzeit des Folgetags
  const gesamtMin = rohMin % minutesPerDay;
  const endStd = Math.floor(gesamtMin / 60);
  const endMin = gesamtMin % 60;
  const uhrzeit = `${endStd}:${endMin.toString().padStart(2, "0")}`;
  return rohMin >= minutesPerDay ? `${uhrzeit} (Folgetag)` : uhrzeit;
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
  // berechnet Differenz Arbeitszeit zu Standardarbeitszeit
  // in Stunden und Minuten
  //
  // Math.trunc statt Math.floor: floor rundet negative Werte abwärts,
  // -468 Minuten wurden dadurch als 8:48 statt 7:48 ausgewiesen
  const result = [];
  result[0] = Math.abs(Math.trunc(minutes / 60));
  result[1] = Math.abs(minutes % 60);
  result[2] = minutes < 0 ? "-" : "+";
  return result;
};

const workTime = (hBegin, mBegin, hEnd, mEnd) => {
  // returns array 'times' of numbers
  // berechne Arbeitszeit abzüglich Pause
  const beginnMin = hBegin * 60 + mBegin;
  const endMin = hEnd * 60 + mEnd;
  let gesamtMin = endMin - beginnMin;
  // Ende vor Beginn heißt: die Schicht läuft über Mitternacht. Gleiche
  // Uhrzeit bleibt null, eine 24-Stunden-Schicht ist nicht gemeint.
  if (gesamtMin < 0) {
    gesamtMin += minutesPerDay;
  }
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
