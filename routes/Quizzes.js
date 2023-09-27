const express = require("express");
const router = express.Router();
const db = require("../components/Databases/Database");

router.post("/poll_update", async (req, res) => {
  const { body } = req;

  if (!body) {
    return res.status(400).json({ error: "no data" });
  }

  const poll_id = body.id_poll;
  const answer_id = body.id_answer;
  const analytics = JSON.stringify(body.analytics);

  const update = await db.quiz_update_vote(poll_id, answer_id);
  const log = await db.quiz_log_vote(poll_id, answer_id, analytics);
  //get updated data
  const quiz = await db.quiz_get_poll_data(poll_id);

  res.send(quiz);
});

router.get("/poll_get", async (req, res) => {
  const { body } = req;

  if (!body) {
    return res.status(400).json({ error: "no data" });
  }

  const poll_id = req.query.id_poll;
  //increase by 1 the views
  const view = await db.quiz_increase_view(poll_id);
  const quiz = await db.quiz_get_poll_data(poll_id);
  res.send(quiz);
});

module.exports = router;
