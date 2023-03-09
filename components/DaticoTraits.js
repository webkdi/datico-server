const db = require("../routes/Database");

async function getNewQuestions(device, sex, answers) {
  var answersStored = [],
    answersCombined = [],
    trait = {};

  const res = await db.getDaticoUserAnswersOrCreateNew(device, sex);

  if (res.answersDone) {
    answersStored = JSON.parse(res.answersDone);
  }
  if (res.traitJson) {
    trait = JSON.parse(res.traitJson);
  }

  if (answersStored.length > 0 || answers.length > 0) {
    answersCombined = [...new Set(answersStored.concat(answers))];

    const storeAnswers = db.storeDaticoUserAnswers(device, answersCombined);
  }

  //create list of all questions
  const input = await db.getDaticoQuiz();

  const storeAnswersMapped = input
    .map(({ id_answer, code, grade }) => ({ id_answer, code, grade }))
    .filter((f) => {
      return answersCombined.includes(f.id_answer);
    });

  //PRERARE BEFORE RECALCULATION. Total number of questions can be stored only here
  trait.questions.total = new Set(input.map((obj) => obj.id_question)).size;
  trait.attitude.previous = trait.attitude.current;
  trait.position.previous = trait.position.current;
  trait.ego.previous = trait.ego.current;
  trait.level.previous = trait.level.current;

  const calcTrait = getTrait(storeAnswersMapped, trait);

  var output = [];
  let currentQuestion = null;
  let questionCount = 0;

  input.forEach((item) => {
    if (
      currentQuestion === null ||
      currentQuestion.id_question !== item.id_question
    ) {
      currentQuestion = {
        id_question: item.id_question,
        question_long: item.question_long,
        psycho: item.psycho,
        answers: [],
      };
      output.push(currentQuestion);
      questionCount++;
    }
    currentQuestion.answers.push({
      id_answer: item.id_answer,
      answer_long: item.answer_long,
      trait: item.trait,
      code: item.code,
      grade: item.grade,
      picture_url: item.picture_url || null,
    });
  });

  // //remove answered questions
  const freeQuestions = output.filter((question) => {
    // Filter out answers whose id_answer is in answersCombined array
    const filteredAnswers = question.answers.filter((answer) => {
      return answersCombined.includes(answer.id_answer);
    });

    // If there are no matching answers, keep the question
    return filteredAnswers.length === 0;
  });

  //create new list of current questions
  var yourQuestions = [];
  var tempQ = [];
  var maxNumberQuestions = 8;
  var freeSlots = 0,
    randomIndex = 0;
  //add attitude questions if needed
  if (trait.attitude.delta < 0.15) {
    tempQ = freeQuestions
      .filter((q) => q.psycho === "установка") // filter by psycho
      .sort((a, b) => b.grade - a.grade) // sort by grade descending
      .slice(0, 3); // get top 3
    tempQ.forEach((t) => yourQuestions.push(t));
  }
  //add position questions if needed
  if (trait.position.delta < 0.15) {
    tempQ = freeQuestions
      .filter((q) => q.psycho === "позиция") // filter by psycho
      .sort((a, b) => b.grade - a.grade) // sort by grade descending
      .slice(0, 3); // get top 3
    tempQ.forEach((t) => yourQuestions.push(t));
  }
  //add one ego question
  tempQ = freeQuestions.filter((q) => q.psycho === "эго");
  randomIndex = Math.floor(Math.random() * tempQ.length);
  yourQuestions.push(tempQ[randomIndex]);
  //add one trait question
  tempQ = freeQuestions.filter((q) => q.psycho === "темперамент");
  randomIndex = Math.floor(Math.random() * tempQ.length);
  yourQuestions.push(tempQ[randomIndex]);
  //add free slot random questions
  freeSlots = maxNumberQuestions - yourQuestions.length;
  if (freeSlots > 0) {
    const remainingQ = freeQuestions.filter((question) => {
      return !yourQuestions.some(
        (yourQuestion) => yourQuestion.id_question === question.id_question
      );
    });

    const randomRest = [];
    while (randomRest.length < freeSlots && remainingQ.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQ.length);
      randomRest.push(remainingQ[randomIndex]);
      remainingQ.splice(randomIndex, 1);
    }
    randomRest.forEach((t) => yourQuestions.push(t));
  }

  return yourQuestions;
}

async function getTrait(answers, trait) {
  const codes = await db.getDaticoTraitCodes();

  codes.forEach((code, index) => {
    const grouped = answers.filter((answer) => answer.code === code.code);
    const points = grouped.reduce((total, entry) => total + entry.grade, 0);
    const questions = grouped.reduce((total, entry) => total + 1, 0);
    code.points = points;
    code.questions = questions;
  });

  function getSumPsycho(searchTrait) {
    const temp = codes.filter((f) => f.psycho == searchTrait);
    return temp.reduce((sum, el) => sum + el.questions, 0);
  }

  trait.attitude.questions.single = getSumPsycho("установка");
  trait.position.questions.single = getSumPsycho("позиция");
  trait.temp.questions = getSumPsycho("темперамент");
  trait.ego.questions = getSumPsycho("эго");

  trait.attitude.questions.total =
    trait.attitude.questions.single + trait.temp.questions;
  trait.position.questions.total =
    trait.position.questions.single + trait.temp.questions;

  trait.questions.done = codes.reduce((sum, el) => sum + el.questions, 0);
  trait.questions.remaining = trait.questions.total - trait.questions.done;

  function getSumTrait(codeSearched) {
    const temp = codes.filter((f) => f.code == codeSearched);
    return temp.reduce((sum, el) => sum + el.points, 0);
  }

  trait.attitude.intro.single = getSumTrait(10000);
  trait.attitude.extra.single = getSumTrait(20000);
  trait.position.passive.single = getSumTrait(1000);
  trait.position.active.single = getSumTrait(2000);
  trait.temp.sangva.sum = getSumTrait(22000);
  trait.temp.mela.sum = getSumTrait(21000);
  trait.temp.hole.sum = getSumTrait(12000);
  trait.temp.flegma.sum = getSumTrait(11000);
  trait.ego.nat = getSumTrait(100);
  trait.ego.psy = getSumTrait(200);
  trait.ego.log = getSumTrait(300);

  trait.attitude.intro.total =
    trait.attitude.intro.single + trait.temp.hole.sum + trait.temp.flegma.sum;
  trait.attitude.extra.total =
    trait.attitude.extra.single + trait.temp.sangva.sum + trait.temp.mela.sum;
  trait.position.passive.total =
    trait.position.passive.single + trait.temp.flegma.sum + trait.temp.mela.sum;
  trait.position.active.total =
    trait.position.active.single + trait.temp.sangva.sum + trait.temp.hole.sum;

  trait.attitude.sum =
    trait.attitude.intro.single + trait.attitude.extra.single;
  trait.position.sum =
    trait.position.passive.single + trait.position.active.single;
  trait.temp.sum =
    trait.temp.sangva.sum +
    trait.temp.mela.sum +
    trait.temp.hole.sum +
    trait.temp.flegma.sum;

  const round = 2;
  trait.temp.sangva.pc_direct =
    Math.round((trait.temp.sangva.sum / trait.temp.sum) * 10 * round) /
    (10 * round);
  trait.temp.mela.pc_direct =
    Math.round((trait.temp.mela.sum / trait.temp.sum) * 10 * round) /
    (10 * round);
  trait.temp.hole.pc_direct =
    Math.round((trait.temp.hole.sum / trait.temp.sum) * 10 * round) /
    (10 * round);
  trait.temp.flegma.pc_direct =
    Math.round((trait.temp.flegma.sum / trait.temp.sum) * 10 * round) /
    (10 * round);

  trait.temp.sangva.pc_derived =
    Math.round(
      (((trait.attitude.extra.single / trait.attitude.sum) *
        trait.position.active.single) /
        trait.position.sum) *
        10 *
        round
    ) /
    (10 * round);
  trait.temp.mela.pc_derived =
    Math.round(
      (((trait.attitude.extra.single / trait.attitude.sum) *
        trait.position.passive.single) /
        trait.position.sum) *
        10 *
        round
    ) /
    (10 * round);
  trait.temp.hole.pc_derived =
    Math.round(
      (((trait.attitude.intro.single / trait.attitude.sum) *
        trait.position.active.single) /
        trait.position.sum) *
        10 *
        round
    ) /
    (10 * round);
  trait.temp.flegma.pc_derived =
    Math.round(
      (((trait.attitude.intro.single / trait.attitude.sum) *
        trait.position.passive.single) /
        trait.position.sum) *
        10 *
        round
    ) /
    (10 * round);

  trait.attitude.current = getAttPos(
    trait.sex,
    trait.attitude.previous,
    trait.attitude.intro.total,
    trait.attitude.extra.total,
    "att"
  );
  trait.attitude.delta = getDelta(
    trait.attitude.intro.total,
    trait.attitude.extra.total
  );

  trait.position.current =
    getAttPos(
      trait.sex,
      trait.position.previous,
      trait.position.passive.total,
      trait.position.active.total,
      "pos"
    ) / 10;

  trait.position.delts = getDelta(
    trait.position.passive.total,
    trait.position.active.total
  );

  trait.ego.current = getEgo(
    trait.ego.previous,
    trait.ego.nat,
    trait.ego.psy,
    trait.ego.log
  );

  trait.level.current = getLevel(
    trait.level.previous,
    trait.attitude.delta,
    trait.position.delta,
    trait.questions.done
  );

  const rest_traits = getTraitRest(trait.attitude.current, trait.ego.current);
  trait.group = rest_traits - (rest_traits % 10);
  trait.right = rest_traits % 10;
  trait.trait =
    trait.attitude.current +
    trait.position.current +
    trait.ego.current +
    trait.group +
    trait.right;
  trait.desc = codes.filter(c => c.code === trait.trait)[0].trait;
  const traitWithMatches = await getMatches(trait, codes);

  console.log(traitWithMatches);

  return trait;
}

function getAttPos(sex, previous, i, e, type) {
  //type: att or pos
  let myres = 0;
  var temp = i - e;
  var prev = previous;
  switch (true) {
    case temp > 0:
      myres = 10000; //интроверсия 100
      break;
    case temp < 0:
      myres = 20000; //экстраверсия 200
      break;
    case 0:
      myres = 0; //неизвестно
  }

  if (myres === 0) {
    switch (true) {
      case prev > 0:
        myres = prev;
        break;
      case prev === 0:
        if (sex === -1) {
          // мужчина
          if (type == "att") {
            myres = 10000;
          } else {
            myres = 20000;
          }
        } else if (sex === -2) {
          // женщина
          if (type == "att") {
            myres = 20000;
          } else {
            myres = 10000;
          }
        } else {
          myres = 0;
        }
    }
  }
  return myres;
}

function getDelta(i, e) {
  let myres = 0;
  if (i === e) {
    myres = 0;
  } else {
    myres = (i - e) ** 2 / (i ** 2 - e ** 2);
  }
  return Math.round(Math.abs(myres) * 100) / 100;
}

function getEgo(prev, n, p, o) {
  var myres = 0;
  var maxvalue = Math.max(n, p, o);
  switch (true) {
    case n > p && n > o:
      myres = 100; //натурологичный 1
      break;
    case p > n && p > o:
      myres = 200; //психологичный 2
      break;
    case o > n && o > p:
      myres = 300; //онтологичный
  }
  switch (true) {
    case myres === 0 && prev > 0:
      myres = prev;
      break;
    case myres === 0 && prev === 0:
      if (n === maxvalue) {
        myres = 100;
      } else if (p === maxvalue) {
        myres = 200;
      } else {
        myres = 300;
      }
  }
  return myres;
}

function getLevel(prev, ad, pd, qs) {
  var myres = 0;
  switch (true) {
    case qs >= 16 && ad > 0.3 && pd > 0.3:
      myres = 3; //достоверно отвечает на все вопросы, прошел от 3 тестов
      break;
    case qs > 10:
      myres = 2; //прошел 2 теста
      break;
    case qs > 1:
      myres = 1; //прошел начальный тест
      break;
    case 0:
      myres = 0; //неизвестно
  }
  if (myres < prev) {
    myres = prev;
  }
  return myres;
}

function getTraitRest(att, ego) {
  var myres;
  switch (true) {
    case att == 10000: //интроверсия
      switch (true) {
        case ego == 100:
          myres = 11; //анти, быть
          break;
        case ego == 200:
          myres = 35; //вне, желать
          break;
        case ego == 300:
          myres = 23; // соц, автоном
          break;
        case 0:
          myres = 0;
      }
      break;
    case att == 20000: //экстраверсия
      switch (true) {
        case ego == 100:
          myres = 24; //соц, незав
          break;
        case ego == 200:
          myres = 12; //анти, обесп
          break;
        case ego == 300:
          myres = 36; // вне, достигать
          break;
        case 0:
          myres = 0;
      }
      break;
    case 0:
      myres = 0; //неизвестно
  }
  return myres;
}

async function getMatches(trait, codes) {
  let temp = [],
    matches = [];
  const persons = codes.filter((p) => p.code >= 11111);
  //best
  temp = persons.filter(
    (m) =>
      m.att !== trait.attitude.current &&
      m.pos !== trait.position.current &&
      m.grp === trait.group
  );
  matches.push({
    grade: 1,
    trait: temp[0].code,
    desc: temp[0].trait,
  });
  // //second
  temp = persons.filter(
    (m) =>
      m.att !== trait.attitude.current &&
      m.pos !== trait.position.current &&
      m.grp !== trait.group &&
      isNeighbour(m.rgt, trait.right)
  );
  matches.push({
    grade: 2,
    trait: temp[0].code,
    desc: temp[0].trait,
  });

  //restlichen
  temp = persons.filter(
    (m) =>
      m.att !== trait.attitude.current &&
      m.pos === trait.position.current &&
      isNeighbour(m.rgt, trait.right)
  );

  var three, four;
  if (isUtopia()) {
    three = temp.filter((m) => m.grp !== trait.group);
    four = temp.filter((m) => m.grp === trait.group);
  } else {
    three = temp.filter((m) => m.grp === trait.group);
    four = temp.filter((m) => m.grp !== trait.group);
  }
  matches.push({ grade: 3, trait: three[0].code, desc: three[0].trait });
  matches.push({ grade: 4, trait: four[0].code, desc: four[0].trait });
  trait.matches = matches;

  function isUtopia() {
    let res = false;
    if (trait.position.current === 1000) {
      res = true;
    } //passive
    if (res && trait.sex === -2 && trait.attitude.current === 10000) {
      return true;
    } // woman, intron
    if (res && trait.sex === -1 && trait.attitude.current === 20000) {
      return true;
    }
    return false;
  }

  function addMatch(grade, trait) {
    matches.push({
      grade: grade,
      trait: trait,
      desc: translate(trait),
    });
  }

  function isNeighbour(a, b) {
    if ((a === 6 && b === 1) || (b === 6 && a === 1)) {
      return true;
    }
    let diff = a - b;
    diff = Math.abs(diff);
    if (diff === 1) {
      return true;
    } else {
      return false;
    }
  }

  // function isAhead(me, partner) {
  //   if (me === 6 && partner === 1) {
  //     return true;
  //   }
  //   let diff = me - partner;
  //   if (diff < 0) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  return trait;
}

module.exports = {
  getNewQuestions,
};
