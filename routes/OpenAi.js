const express = require("express");
require("dotenv").config();
const router = express.Router();
const db = require("../components/Databases/Database");
const { v4: uuidv4 } = require("uuid");

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post("/", async (req, res) => {
  try {
    var { messages, deviceId } = req.body;

    //needed ony for testing
    if (!messages) {
      messages = [
        {
          role: "assistant",
          content:
            "Добрый день, мое имя - Зигмунд Фрейд, и я специализируюсь на психоанализе. Что вы хотели бы обсудить со мной?",
        },
        { role: "user", content: "sdsd" },
      ];
    }

    const systemMessage = {
      role: "user",
      content:
        "Act as Sigmund Freud, famous founder of psychoanalysis. Use psychoanalytic language. Answer only in Russian language.",
    };

    if (Array.isArray(messages)) {
      messages.unshift(systemMessage);
    } else {
      messages = [systemMessage];
    }

    const question = messages.slice(-1)[0].content;

    const userStat = await db.chatGetUserTokens(deviceId);

    var tokens = 0;
    var messageCount = 0;
    var status = 1;
    var timestamp = new Date("2023-03-07T18:36:59.000Z");

    if (userStat.length == 0) {
      //device nicht existiert
      await db.chatCreateDevice(deviceId);
    } else {
      tokens = userStat[0].tokens; // сколько израсходовал
      messageCount = userStat[0].messages;
      status = userStat[0].status;
      // timestamp = userStat[0].timestamp;
      if (userStat[0].timestamp) {
        timestamp = new Date(userStat[0].timestamp);
      }
    }

    // status = 2;
    if (status == 2) {
      var waitingMinutes = parseInt(process.env.OPENAI_LIMIT_WAITING_MINUTES);
      //3 * 60 * 60 * 1000; // 3 часа
      const newTimestamp = new Date(
        timestamp.getTime() + waitingMinutes * 60 * 1000
      );

      // calculate the minutes from now till the new date
      var waitMinutes = Math.floor(
        (newTimestamp.getTime() - Date.now()) / (1000 * 60)
      );

      // waitMinutes=1;
      if (waitMinutes > 0) {
        // "24 hours have not yet passed since the timestamp."

        //add something to read
        const ideas = await db.getSuggestions();

        res.status(200).send({
          bot: "",
          status: 3, // stop communicating!
          wait: waitMinutes,
          ideas,
        });
        return;
      }
    }

    const uniqueId = uuidv4(); // Generate a unique ID
    await db.chatStoreMessage(deviceId, 1, question, uniqueId);

    // const prompt = `Act as Sigmund Freud, founder of psychoanalysis. Answer in Russian only: "${messages}"`;

    const params = {
      // model: "text-davinci-003",
      model: "gpt-3.5-turbo-0301",
      // prompt: prompt,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
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
  var limit = process.env.OPENAI_TOKEN_LIMIT;
  if (tokens > limit) {
    //limit exseeded
    status = 2; //one day break
  }
  return status;
}

module.exports = router;
