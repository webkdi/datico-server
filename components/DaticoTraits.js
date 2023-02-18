const db = require("../routes/Database");

async function getNewQuestions() {
  const input = await db.getDaticoQuiz();

 const output = [];
let currentQuestion = null;
let questionCount = 0;
const limit = 2;

input.forEach((item) => {
  if (currentQuestion === null || currentQuestion.id_question !== item.id_question) {
    if (questionCount >= limit) {
      return;
    }
    currentQuestion = {
      id_question: item.id_question,
      question_long: item.question_long,
      answers: []
    };
    output.push(currentQuestion);
    questionCount++;
  }
  currentQuestion.answers.push({
    id_answer: item.id_answer,
    answer_long: item.answer_long,
    picture_url: item.picture_url || null
  });
});

  return output;
}

module.exports = {
  getNewQuestions,
};
