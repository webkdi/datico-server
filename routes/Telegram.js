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

module.exports = router;
