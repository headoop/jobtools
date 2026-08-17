const birthdayEl = document.getElementById("birthday");
const today = new Date();
const resultContainerEl = document.getElementById("result-container");
const ageTodayEl = document.getElementById("age-today");
const dayBefore18El = document.getElementById("day-before-18");
const dayBefore21El = document.getElementById("day-before-21");

const calcAges = (dateObject) => {
  let birthday = dateObject;
  let age;
  if (birthday > today) {
    age = "ungeboren";
  } else {
    age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
  }

  let date18 = new Date();
  date18.setFullYear(birthday.getFullYear() + 18);
  date18.setMonth(birthday.getMonth());
  date18.setDate(birthday.getDate() - 1);
  const date18string = date18.toLocaleDateString("de-de", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let date21 = new Date();
  date21.setFullYear(birthday.getFullYear() + 21);
  date21.setMonth(birthday.getMonth());
  date21.setDate(birthday.getDate() - 1);
  const date21string = date21.toLocaleDateString("de-de", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return [age, date18string, date21string];
};

const action = () => {
  if (birthdayEl.value !== "") {
    let birthday = new Date(birthdayEl.value);
    // console.log(birthday);
    let [age, date18string, date21string] = calcAges(birthday);
    resultContainerEl.style.display = "flex";
    ageTodayEl.textContent = age;
    dayBefore18El.textContent = date18string;
    dayBefore21El.textContent = date21string;
  }
};
