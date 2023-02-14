const express = require("express");
const db = require("./Database");
const tg = require("../components/TelegramFunctions");
const router = express.Router();

router.post("/get", async (req, res) => {

  if (JSON.stringify(req.body) !== "{}") {
    tg.sendToTelegram(req.body);
    console.log(req.body);
    // console.log(tgResponse);
  } else {
    console.log("no data");
  }

  const ideas = await db.getSuggestions();
  res.send(ideas);
});

router.get("/randomquote", async (req, res) => {
  const quote = await db.getRandomQuote();
  res.send(quote);
});

module.exports = router;
