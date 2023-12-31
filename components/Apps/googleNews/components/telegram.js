var FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();


const now = new Date();

async function sendToTelegram(text) {

    var botToken = process.env.TG_BOT_TOKEN_SCHNITZELNEWS_BOT;
    var chat_id = -1001352848071;
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

    const result = await response.data.result;

    return { status: stat, response: result};
}

async function sendPhotoToTelegram(caption, imageBuffer, chat_id) {
    var botToken = process.env.TG_BOT_TOKEN_SCHNITZELNEWS_BOT;
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    const data = new FormData();
    data.append("chat_id", chat_id);
    data.append("caption", caption);
    data.append("photo", imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

    let stat = 200;
    let response;
    try {
        response = await axios.post(url, data, {
            headers: { ...data.getHeaders() },
        });
        console.log(`Создан пост https://t.me/${response.data.result.sender_chat.username}/${response.data.result.message_id}`);
        // console.log(response.status, response.statusText, JSON.stringify(response.data, null, 2));
        const result = response.data.result;
        const message_id = response.data.result.message_id; 
        return { status: response.status, response: result, message_id: message_id };
    } catch (error) {
        stat = error.response ? error.response.status : 400;
        const errorMessage = error.response ? error.response.data.description : error.message;
        return { status: stat, response: errorMessage };
    }
}

module.exports = {
    sendToTelegram,
    sendPhotoToTelegram,
};
