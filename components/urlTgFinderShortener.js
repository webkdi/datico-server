const db = require("./Databases/refTelegram");
const axios = require("axios");

const yandexClickerEndpoint = "https://clck.ru/--";

function generateUrlFromTelegramMessage(message) {
  if (message.text || message.caption) {
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const match = (message.text || message.caption).match(urlRegex);
    return match ? match[0] : null;
  }
  if (
    message.forward_from_chat &&
    (message.forward_from_chat.username === "polkpress" ||
      message.forward_from_chat.username === "InfoDefenseDEUTSCH")
  ) {
    // If the message is forwarded from the "polkpress" channel, construct the URL using the username and message_id
    return `https://t.me/${message.forward_from_chat.username}/${message.forward_from_message_id}`;
  }
  if (message.caption_entities) {
    // If the message is not forwarded from "polkpress" channel, find the URL in the caption_entities
    const captionEntities = message.caption_entities;
    if (captionEntities) {
      const urlEntity = captionEntities.find((entity) => entity.type === "url");
      if (urlEntity) {
        const url = message.caption.substring(
          urlEntity.offset,
          urlEntity.offset + urlEntity.length
        );
        return url;
      }
    }
  }
  // If no URL is found in the given message, return null or an appropriate value as per your requirement.
  return null;
}

async function getShortenedUrl(originalURL) {
  // Check if originalURL is not null and exists
  if (originalURL === undefined || originalURL === null) {
    return null;
  }

  // Check if originalURL is not empty
  if (originalURL.trim() === "") {
    return null;
  }
  const length = originalURL.length;
  const endpoint = "https://clck.ru/--";
  if (length > 23) {
    try {
      const response = await axios.get(endpoint, {
        params: { url: originalURL },
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to get the shortened URL.");
    }
  } else {
    return originalURL;
  }
}

async function run(updateId) {
  let json = await db.getStoredJsonUpdateFromDb(updateId);
  let ms = null;
  if (json.result[0].message) {
    ms = json.result[0].message;
  } else {
    ms = json.result[0].channel_post;
  }
  let text = null;
  if (ms.caption) {
    text = ms.caption.substring(0, 50);
  }
  // console.log(message);
  const urlFound = await generateUrlFromTelegramMessage(ms);
  const urlShort = await getShortenedUrl(urlFound);

  console.log(updateId, urlFound, urlShort, text);
}
// run(349);

module.exports = {
  generateUrlFromTelegramMessage,
  getShortenedUrl,
};
