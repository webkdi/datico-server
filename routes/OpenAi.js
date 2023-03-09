const express = require("express");
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const router = express.Router();
const db = require("./Database");
const { v4: uuidv4 } = require("uuid");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post("/", async (req, res) => {
  try {
    const { messages, deviceId } = req.body;

    const systemMessage = {
      role: "user",
      content:
        "Act as Sigmund Freud, famous founder of psychoanalysis. Use psychoanalytic language. Answer only in Russian language.",
    };
    messages.unshift(systemMessage);

    const question = messages.slice(-1)[0].content;

    const userStat = await db.chatGetUserTokens(deviceId);

    var tokens = 0;
    var messageCount = 0;
    var status = 1;
    var timestamp = "2023-03-07T18:36:59.000Z";

    if (userStat.length == 0) {
      //device nicht existiert
      await db.chatCreateDevice(deviceId);
    } else {
      tokens = userStat[0].tokens; // сколько израсходовал
      messageCount = userStat[0].messages;
      status = userStat[0].status;
      timestamp = userStat[0].timestamp;
    }

    if (status == 2) {
      const waitingPeriodMs = 3 * 60 * 60 * 1000;  // 3 часа
      // const waitingPeriodMs = 60 * 1000;

      const futureTimestamp = new Date(Date.parse(timestamp) + waitingPeriodMs);
      const waitMinutes = Math.floor(
        (futureTimestamp - new Date()) / 1000 / 60
      );

      // const now = new Date();
      // const timestampDate = new Date(timestamp);

      // add hours to the timestamp using the setTime() method
      // const newTimestamp = new Date(
      //   timestamp.setTime(timestamp.getTime() + waitingPeriodMs)
      // );

      // convert the new timestamp back to a string in ISO 8601 format
      // const newTimestampString = newTimestamp.toISOString();

      if (waitMinutes>0) {
        // "24 hours have not yet passed since the timestamp."
        res.status(200).send({
          bot: "",
          status: 3, // stop communicating!
          wait: waitMinutes,
        });
        return;
      }
    }

    const uniqueId = uuidv4(); // Generate a unique ID
    await db.chatStoreMessage(deviceId, 1, question, uniqueId);

    // const prompt = `Act as Sigmund Freud, founder of psychoanalysis. Answer in Russian only: "${messages}"`;
    // console.log(prompt);

    const params = {
      // model: "text-davinci-003",
      model: "gpt-3.5-turbo-0301",
      // prompt: prompt,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    };

    // const response = await openai.createCompletion(params);
    const response = await openai.createChatCompletion(params);

    const tokensNow = response.data.usage.total_tokens;
    tokens = tokens + tokensNow; // Сумма затраченных
    messageCount += 1;

    let answer = await response.data.choices[0].message.content;
    let role = await response.data.choices[0].message.role;
    // if (answer.charAt(0) === "\n") {
    //   answer = answer.slice(1);
    // }
    await db.chatStoreMessage(deviceId, 2, answer, uniqueId);

    status = getStatus(tokens);
    if (status == 1) {
      await db.chatIncreaseUserTokens(deviceId, messageCount, tokens, status);
    } else {
      await db.chatIncreaseUserTokens(deviceId, 0, 0, status);
    }

    res.status(200).send({
      bot: answer,
      status: status,
      wait: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error || "Something went wrong");
  }
});

function getStatus(tokens) {
  var status = 1; //continue
  if (tokens > 2000) {
    //limit exseeded
    status = 2; //one day break
  }
  return status;
}

module.exports = router;
