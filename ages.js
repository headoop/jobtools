const birthdayEl = document.getElementById("birthday");
const targetEl = document.getElementById("target");
const ageFormEl = document.getElementById("age-form");
const errorEl = document.getElementById("age-error");
const resultContainerEl = document.getElementById("result-container");
const ageTodayEl = document.getElementById("age-today");
const dayBefore18El = document.getElementById("day-before-18");
const dayBefore21El = document.getElementById("day-before-21");
const rowAgeTargetEl = document.getElementById("row-age-target");
const ageTargetLabelEl = document.getElementById("age-target-label");
const ageTargetEl = document.getElementById("age-target");

const parseDateInput = (value) => {
  // als lokale Mitternacht lesen; new Date("2008-03-14") wäre UTC und
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

// Alter zum Stichtag; ist der Geburtstag im Stichtagsjahr noch nicht
// erreicht, zählt ein Jahr weniger. Vor der Geburt gibt es kein Alter.
const ageAt = (birthday, reference) => {
  if (birthday > reference) {
    return null;
  }
  let age = reference.getFullYear() - birthday.getFullYear();
  const months = reference.getMonth() - birthday.getMonth();
  if (months < 0 || (months === 0 && reference.getDate() < birthday.getDate())) {
    age--;
  }
  return age;
};

// Tag vor dem n-ten Geburtstag; Tag 0 eines Monats ist der letzte Tag des
// Vormonats, der 01.03. ergibt also korrekt den 28. bzw. 29.02.
const dayBeforeBirthday = (birthday, years) =>
  new Date(birthday.getFullYear() + years, birthday.getMonth(), birthday.getDate() - 1);

const showError = (message) => {
  errorEl.textContent = message;
  errorEl.hidden = false;
  resultContainerEl.style.display = "none";
};

const action = () => {
  if (birthdayEl.value === "") {
    showError("Bitte ein Geburtsdatum wählen.");
    return;
  }

  const birthday = parseDateInput(birthdayEl.value);
  const age = ageAt(birthday, new Date());

  errorEl.hidden = true;
  resultContainerEl.style.display = "grid";
  ageTodayEl.textContent = age === null ? "ungeboren" : age;
  dayBefore18El.textContent = formatDate(dayBeforeBirthday(birthday, 18));
  dayBefore21El.textContent = formatDate(dayBeforeBirthday(birthday, 21));

  // Zieldatum ist freiwillig: ohne Eingabe bleibt die Zeile ausgeblendet
  if (targetEl.value === "") {
    rowAgeTargetEl.style.display = "none";
    ageTargetEl.textContent = "";
    return;
  }

  const target = parseDateInput(targetEl.value);
  const ageAtTarget = ageAt(birthday, target);
  rowAgeTargetEl.style.display = "";
  ageTargetLabelEl.textContent = `Alter am ${formatDate(target)}`;
  ageTargetEl.textContent =
    ageAtTarget === null ? "noch nicht geboren" : ageAtTarget;
};

// Absenden per Enter aus den Datumsfeldern heraus, nicht nur per Mausklick
ageFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  action();
});
