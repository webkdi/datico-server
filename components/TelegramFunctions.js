const { v4: uuidv4 } = require("uuid");
var FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();
// const db = require("./Databases/Database");
const db = require("./Databases/refTelegram");
const twitter = require("./TwitterFunctions");
const openAi = require("./OpenAiFunctions");
// const insta = require("./Instagram")
const images = require("./ImagesFunctions");
const url = require("./urlTgFinderShortener");
const https = require("https");

const now = new Date();

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

  var botToken = process.env.TG_BOT_TOKEN_FREUD_ONLINE_BOT;
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

  const result = await response.data.result;

  if (!response.ok) {
    // console.log("error: ", response);
    console.log("error in Telegram connection");
    stat = 400;
  }
  return { status: stat, response: result };
}

async function checkIfURLExists(url) {
  //checks if image file exists on the server
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function infoDefRepost() {
  // console.log(`${now}: Start of cron infoDefRepost`);

  const telegramBotToken = process.env.TG_BOT_TOKEN_INFODEFENSE_BOT;

  //letzten Update erkennen
  var update_id_latest = 0;
  let lastUpdate = await db.fbReportLatestUpdate();
  if (lastUpdate) {
    update_id_latest = lastUpdate;
  }
  const update_id_new = update_id_latest + 1;

  const urlRegex =
    /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/g;

  const telegramAPIEndpoint = `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${update_id_new}`;
  var messages = [];
  var unknown = [];

  const response = await axios(telegramAPIEndpoint);
  const data = response.data;
  if (data.result.length > 0) {
    // есть новые посты
    let jsonString = JSON.stringify(data);
    await db.insertJson(jsonString);
    await db.cleanJsons();
  }

  let updatesBeforeRenaming = data.result;

  // Function to rename the "message" property to "channel_post"
  function renameMessageToChannelPost(update) {
    if (update.hasOwnProperty("message")) {
      update.channel_post = update.message;
      delete update.message;
    }
    return update;
  }
  let updates = updatesBeforeRenaming.map(renameMessageToChannelPost);

  updates = updates.filter(
    (obj) =>
      obj.channel_post &&
      (obj.channel_post.chat.title === "FB_InfoDefenseDEUTSCH" ||
        obj.channel_post.chat.title === "InfodefenseFRANCEbis" ||
        obj.channel_post.chat.title === "FB_Polk")
  );

  if (updates.length === 0) {
    console.log(`${now}: No new updates. Skipped`);
    return;
  }

  await Promise.all(
    updates.map(async (ms) => {
      const newRow = await db.insertIgnore(ms.update_id);
      if (newRow === 0) {
        console.log(`Update ${ms.update_id} exists already. Ignored`);
        return; //entry already exists
      }
      if (ms.channel_post) {
        var asset = {};
        if (ms.channel_post.text && ms.channel_post.text.length > 0) {
          asset.message = ms.channel_post.text;
          asset.type = "text";
        } else if (ms.channel_post.photo && ms.channel_post.caption) {
          asset.files = ms.channel_post.photo;
          asset.message = ms.channel_post.caption;
          asset.type = "image";
          // } else if (ms.channel_post.photo && !ms.channel_post.caption) { //image without caption
          //   asset.files = ms.channel_post.photo;
          //   asset.message = "";
          //   asset.type = "image";
        } else if (ms.channel_post.video && ms.channel_post.caption) {
          asset.files = ms.channel_post.video;
          asset.message = ms.channel_post.caption;
          asset.type = "video";
        } else {
          unknown.push(ms);
        }

        //найти ссылку
        const urlFound = await url.generateUrlFromTelegramMessage(
          ms.channel_post
        );
        // const urlShort = await url.getShortenedUrl(urlFound);
        if (urlFound != undefined || urlFound != null) {
          asset.url = urlFound;
        }

        if (Object.keys(asset).length > 0) {
          asset.chat_id = ms.channel_post.chat.id;
          asset.chat_name = ms.channel_post.chat.title;
          asset.update_id = ms.update_id;
          messages.push(asset);
        }
      }
    })
  );

  messages
    .filter((ms) => ms && ms.files)
    .forEach((ms) => {
      if (ms.type === "image") {
        ms.file_fileId = ms.files[ms.files.length - 1].file_id;
      } else if (ms.type === "video") {
        ms.file_fileId = ms.files.file_id;
      }
      delete ms.files;
    });

  const messagesWithFileId = messages.filter((message) => message.file_fileId);
  for (const message of messagesWithFileId) {
    const fileData = await getFilePath(message.file_fileId, telegramBotToken);
    if (typeof fileData !== "undefined" && fileData) {
      let fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileData}`;
      if (message.type === "image") {
        let imageInstaLocalPath = await images.processImageForInstagram(
          message.update_id,
          fileUrl
        );
        imageInstaLocalPath =
          "https://app.freud.online/datico-server/images/output/" +
          imageInstaLocalPath;
        message.file_path_local_1080 = imageInstaLocalPath;
      }
      message.file_path = fileUrl;
    } else {
      message.file_path = "";
    }
  }

  messages = messages.filter((obj) => {
    if (obj.type === "text") {
      return true; // include objects with "type" of "text"
    } else if (obj.type === "image" || obj.type === "video") {
      // return true;
      return obj.file_path ? true : false; // include objects with "type" of "image" or "video" and a "file_path" property
    } else {
      return false; // exclude objects with unrecognized "type"
    }
  });

  for (let i = 0; i < messages.length; i++) {
    if (typeof messages[i].message !== "undefined") {
      messages[i].message = messages[i].message.replace(
        /📱 InfoDefenseDEUTSCH\n📱 InfoDefense/g,
        ""
      );
      messages[i].message = messages[i].message.replace(
        /📱 InfoDefenseDEUTSCH/g,
        ""
      );
      messages[i].message = messages[i].message.replace(
        /🔹Werden Sie InfoDefender! Teilen Sie diese Nachricht mit Ihren Freunden!🔹/g,
        ""
      );
      // Remove newlines and empty lines at the end of the string
      const regex = /\n\s*$/;
      messages[i].message = messages[i].message.replace(regex, "");
      messages[i].message.trim();
    } else {
      messages[i].message = "";
    }

    messages[i].message = messages[i].message.replace("\n\n", "\n");
    messages[i].message = messages[i].message.replace("'", "''");

    //Make sends filepath as link for text
    if (messages[i].type === "text") {
      const urls = messages[i].message.match(urlRegex);
      if (urls && urls.length > 0) {
        messages[i].file_path = urls[0];
      }
    }

    var gap = "\n\n";
    if (messages[i].message.length == 0) {
      gap = "";
    }

    // Подготовить версию текста для Фейсбука
    messages[i].messageForFacebook = messages[i].message;
    if (messages[i].chat_name == "FB_InfoDefenseDEUTSCH") {
      messages[
        i
      ].messageForFacebook += `${gap}🔹Werden Sie InfoDefender! Teilen Sie diese Nachricht mit Ihren Freunden!🔹${gap}Mehr und zensurfrei in Telegram:\n🇩🇪🇦🇹🇨🇭 https://t.me/InfoDefGermany\n🇺🇸🇪🇸🇫🇷 https://t.me/infoDefALL`;
      messages[i].repost_to = 105288955734641;
      messages[i].repost_insta_to = 17841460886756437;
    } else if (messages[i].chat_name == "InfodefenseFRANCEbis") {
      messages[
        i
      ].messageForFacebook += `${gap}Plus et sans censure dans Telegram:\n🇫🇷 https://t.me/infodefFRANCE`;
      messages[i].repost_to = 102131486075155;
    } else if (messages[i].chat_name == "FB_Polk") {
      messages[i].repost_to = 108264128925046;
    }

    // подготовить версию для Твиттера
    if (messages[i].message.length > 250) {
      try {
        let language;
        if (messages[i].repost_to === 105288955734641) {
          language = "de";
        } else if (messages[i].repost_to === 108264128925046) {
          language = "ru";
        }
        const textTwitter = await processTwitterSummary(
          messages[i].message,
          messages[i].url,
          language
        ); 
        messages[i].messageForTwitter = textTwitter;
      } catch (error) {
        console.error("Error while processing OpenAi tweet message:", error);
        messages[i].messageForTwitter = "";
      }
    } else {
      messages[i].messageForTwitter = messages[i].message;
    }
  }

  //store in DB
  messages.forEach(async (ms) => {
    const store = await db.fbReportUpdate(
      ms.update_id,
      ms.type,
      ms.file_path,
      ms.message,
      ms.messageForFacebook,
      ms.messageForTwitter,
      ms.repost_to
    );
  });
  const truncate = await db.fbReportClean();

  // post to Socials
  messages.forEach(async (ms) => {
    if (ms.update_id !== update_id_latest) {
      // schon geliefert

      // for newly created image for Insta for Polk
      if (
        ms.chat_name == "FB_Polk" &&
        ms.type === "image" &&
        ms.hasOwnProperty("file_path_local_1080")
      ) {
        //check if file is on the server
        const exists = await checkIfURLExists(ms.file_path_local_1080);
        if (exists) ms.file_path = ms.file_path_local_1080;
      }

      const sentToFacebook = await sendToMakeForFb(
        // post to Facebook
        ms.type,
        ms.file_path,
        ms.message,
        ms.messageForFacebook,
        ms.repost_to,
        ms.repost_insta_to
      );
      // const sentToTwitter = await twitter.tweetPost(
      //   ms.messageForTwitter,
      //   ms.type,
      //   ms.file_path
      // );
      if (
        ms.repost_to === 105288955734641 ||
        ms.repost_to === 108264128925046
      ) {
        const sentToTwitter = await tweetOnRender(ms.update_id);
      }
    }
  });

  //clean images directory
  images.deleteImageForInstagram();
}

async function processTwitterSummary(message, url, language) {
  const MAX_TWITTER_LENGTH = 280;

  let textTwitter = message; 

  while (textTwitter.length > MAX_TWITTER_LENGTH) {
    console.log('shortening OpenAi text for',language,'Twitter, length', textTwitter.length);
    textTwitter = await openAi.getTwitterSummary(textTwitter, url, language);
  }
  console.log('final text length',textTwitter.length);
  return textTwitter;
}

async function sendToMakeForFb(
  type,
  filepath,
  message,
  message_fb,
  page_id,
  page_insta_id
) {
  let url = `https://hook.eu1.make.com/${process.env.MAKE_WEBHOOK_FB_INFODEF}`;
  const sendFb = await axios
    .post(
      url,
      {
        type: type,
        filepath: filepath,
        message: message,
        message_fb: message_fb,
        page_fb_id: page_id,
        page_insta_id: page_insta_id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((response) => {
      if (response.status === 202) {
        console.log("Request accepted, but response is not yet available.");
        return null;
      }
      console.log(response.status);
      return response.status;
    })
    .catch((error) => {
      console.error("There was a problem with the POST request");
    });
}

async function getFilePath(file_Id, telegramBotToken) {
  const url = `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${file_Id}`;

  try {
    const response = await axios(url);
    const result = await response.data;
    if (result.ok) {
      const file_path = result.result.file_path;
      return file_path;
    } else {
      return "error";
    }
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      console.log(file_Id, status, statusText);
      // response.status(status).send(statusText);
    } else {
      console.log(file_Id, error);
    }
  }
}

async function sendSingleTweet(update_id) {
  const line = await db.getMessagePerUpdate(update_id);
  const mediaUrl = line[0].file_path;
  const tweetText = line[0].message_twitter;
  // const tweetText = '';
  const mediaType = line[0].type;
  // console.log(mediaType, mediaUrl, tweetText);

  try {
    console.log("trying to create a tweet for", mediaType, mediaUrl, tweetText);
    const tweetGo = await twitter.tweetPost(tweetText, mediaType, mediaUrl);
    return tweetGo;
  } catch (error) {
    // Handle the error gracefully
    console.error(
      "An error occurred while initializing the TwitterApi client:",
      error
    );
  }
}

async function tweetOnRender(update_id) {
  const line = await db.getMessagePerUpdate(update_id);
  const mediaUrl = line[0].file_path;
  const tweetText = line[0].message_twitter;
  const mediaType = line[0].type;
  const pageFbForPosting = line[0].page_id;

  let channel;
  if (pageFbForPosting === 105288955734641) {
    channel = "infodefense";
  } else if (pageFbForPosting === 108264128925046) {
    channel = "polk";
  }

  try {
    var options = {
      method: "POST",
      url: "https://retweet.onrender.com/twitter/tweets",
      headers: {
        Accept: "*/*",
        "User-Agent": "Thunder Client (https://www.thunderclient.com)",
        "Content-Type": "application/json",
      },
      data: {
        text: tweetText,
        mediaType: mediaType,
        mediaeUrl: mediaUrl,
        channel: channel,
      },
    };

    const response = await axios.request(options);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log(error.response.status, error.response.statusText, error.data);
    return {
      error: true,
      message: "Failed to post tweet on Render.",
      // You can add additional error details here if needed
    };
  }
}

infoDefRepost();

module.exports = {
  sendToTelegram,
  infoDefRepost,
  sendSingleTweet,
  tweetOnRender,
};
