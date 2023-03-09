const express = require("express");
const dtc = require("../components/DaticoTraits");
const router = express.Router();

router.post("/get_questions", async (req, res) => {

  const { body } = req;

  if (!body) {
    return res.status(400).json({ error: "no data" });
  }
  if (body && !body.device) {
    return res.status(400).json({ error: "Device missing in the request body" });
  }

  let userId = 0, deviceId='', answers=[], sex=0;;
  device=body.device;
  user=req.body.user;
  if (body.answers) {answers = JSON.parse(body.answers);}
  if (body.sex) {sex = body.sex;}
  
  const quiz = await dtc.getNewQuestions(device, sex, answers);
  res.send(quiz);
});

module.exports = router;
