const express = require("express");
const tg = require("../components/TelegramFunctions")
const router = express.Router();

//Notify Telegram
router.post("/notify-admin", async (req, res) => {
  if (Object.keys(req.body).length == 0) {
    return res.sendStatus(400);
  }

  const response = await tg.sendToTelegram(req.body);
  res.status(response.status).send(response.response);

});

//Notify Telegram
router.post("/update_twitter", async (req, res) => {

  // Check if req.body is an object and contains exactly one field
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Object.keys(req.body).length !== 1
  ) {
    return res.sendStatus(400);
  }

  // Extract the update_id field from req.body
  const updateId = req.body.update_id;

  // Check if updateId is a valid number
  if (!Number.isInteger(updateId)) {
    return res.sendStatus(400);
  }

  // At this point, req.body contains one field with key "update_id" and its value is a numeric integer.
  // Proceed to call tg.sendSingleTweet() or perform any other necessary actions.
  const response = await tg.sendSingleTweet(updateId);
  res.send(response);
});

module.exports = router;
