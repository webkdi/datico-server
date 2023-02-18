const express = require("express");
const dtc = require("../components/DaticoTraits");
const router = express.Router();

router.post("/get_questions", async (req, res) => {
  const quiz = await dtc.getNewQuestions();
  res.send(quiz);
});

module.exports = router;
