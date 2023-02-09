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


  // const id = uuidv4();

  // const max = Object.keys(req.body).length;
  // let text = "";
  // var i = 1;
  // for (const [key, value] of Object.entries(req.body)) {
  //   text += `${key}: ${value}`;
  //   if (i != max) {
  //     text += "\n";
  //   }
  //   i += 1;
  // }

  // var botToken = "760187319:AAH08lE_RrrgDtB9rKRrttDzc1n3c9_5HQc";
  // var chat_id = -1001214457271;
  // const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  // const data = new FormData();
  // data.append("chat_id", chat_id);
  // data.append("text", text);

  // const response = await fetch(url, {
  //   method: "POST",
  //   body: data,
  // });
  // const send = await response.text();
  // if (!response.ok) {
  //   // console.log("error: ", response);
  //   return res.status(400).send(send);
  // }

  // res.status(200).send(send);
});

module.exports = router;
