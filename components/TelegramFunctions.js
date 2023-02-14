const { v4: uuidv4 } = require("uuid");
var FormData = require('form-data');
const axios = require("axios");

async function sendToTelegram(body) {
    const id = uuidv4();
  
    const max = Object.keys(body).length;
    let text = "";
    var i = 1;
    for (const [key, value] of Object.entries(body)) {
      text += `${key}: ${value}`;
      if (i != max) {
        text += "\n";
      }
      i += 1;
    }
  
    var botToken = "760187319:AAH08lE_RrrgDtB9rKRrttDzc1n3c9_5HQc";
    var chat_id = -1001214457271;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const data = new FormData();
    data.append("chat_id", chat_id);
    data.append("text", text);
  
    let stat = 200;
  
    let response;
    try {
      response = await axios(url, {
        method: "POST",
        data: data,
      });
    } catch (error) {
      stat = 400;
      return { status: stat, response: error };
    }
  
    // console.log(response.status, response.statusText, response.data.result);
    const result = await response.data.result;
  
    if (!response.ok) {
      // console.log("error: ", response);
      stat = 400;
    }
    return { status: stat, response: result };
  }

  module.exports = {
    sendToTelegram,
  };