const { v4: uuidv4 } = require("uuid");
var FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();
const db = require("../routes/Database");

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
    console.log("error: ", response);
    stat = 400;
  }
  return { status: stat, response: result };
}

async function infoDefRepost() {
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

  axios(telegramAPIEndpoint)
    .then((response) => response.data)
    .then((data) => {
      var updates = data.result;
      updates = updates.filter(
        (obj) =>
          obj.channel_post &&
          (obj.channel_post.chat.title === "FB_InfoDefenseDEUTSCH" ||
            obj.channel_post.chat.title === "InfodefenseFRANCEbis")
      );

      updates.length > 0 &&
        updates.forEach((ms) => {
          if (ms.channel_post) {
            var asset = {};
            if (ms.channel_post.text && ms.channel_post.text.length > 0) {
              asset.message = ms.channel_post.text;
              asset.type = "text";
            } else if (ms.channel_post.photo && ms.channel_post.caption) {
              asset.files = ms.channel_post.photo;
              asset.message = ms.channel_post.caption;
              asset.type = "image";
            } else if (ms.channel_post.photo && !ms.channel_post.caption) {
              asset.files = ms.channel_post.photo;
              asset.message = '';
              asset.type = "image";
            } else if (ms.channel_post.video) {
              asset.files = ms.channel_post.video;
              asset.message = ms.channel_post.caption;
              asset.type = "video";
            } else {
              unknown.push(ms);
            }
            if (Object.keys(asset).length > 0) {
              asset.chat_id = ms.channel_post.chat.id;
              asset.chat_name = ms.channel_post.chat.title;
              asset.update_id = ms.update_id;
              messages.push(asset);
            }
          }
        });

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

    })
    .then(async () => {
      const messagesWithFileId = messages.filter(
        (message) => message.file_fileId
      );

      for (const message of messagesWithFileId) {
        const fileData = await getFile(message.file_fileId, telegramBotToken);
        if (typeof fileData !== "undefined" && fileData) {
          message.file_path = `https://api.telegram.org/file/bot${telegramBotToken}/${fileData}`;
        } else {
          message.file_path = "";
        }
      }

    })
    .then(async () => {
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
        if (messages[i].chat_name == "FB_InfoDefenseDEUTSCH") {
          messages[
            i
          ].message += `${gap}Mehr und zensurfrei in Telegram:\n🇩🇪🇦🇹🇨🇭 https://t.me/InfoDefGermany\n🇺🇸🇪🇸🇫🇷 https://t.me/infoDefALL`;
          messages[i].repost_to = 105288955734641;
        } else if (messages[i].chat_name == "InfodefenseFRANCEbis") {
          messages[
            i
          ].message += `${gap}Plus et sans censure dans Telegram:\n🇫🇷 https://t.me/infodefFRANCE`;
          messages[i].repost_to = 102131486075155;
        }
      }
    })
    .then(async () => {
      //store in DB
      if (messages.length > 0) {
        const truncate = await db.fbReportTrucate();
        messages.forEach(async (ms) => {
          const store = await db.fbReportInsert(
            ms.update_id,
            ms.type,
            ms.file_path,
            ms.message,
            ms.repost_to
          );
        });
      }
    })
    .then(async () => {
      if (messages.length > 0) {
        messages.forEach(async (ms) => {       
          if (ms.update_id !== update_id_latest) {  // shon geliefert
            const sent = await sendToMakeForFb(
              ms.type,
              ms.file_path,
              ms.message,
              ms.repost_to
            );
          } 
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
}

async function sendToMakeForFb(type, filepath, message, page_id) {
  let url = `https://hook.eu1.make.com/${process.env.MAKE_WEBHOOK_FB_INFODEF}`;
  // let url = "https://hook.eu1.make.com/cy1q9h44e60jgtd2qg42imtb7aorjxof"; //test hook
  // let url = 'https://hook.eu1.make.com/ynq4oo37xwsgiafeylahxeg2qpsh52gp'; //real hook
  const sendFb = await axios
    .post(
      url,
      {
        type: type,
        filepath: filepath,
        message: message,
        page_id: page_id,
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
    .catch(error => {
      console.error("There was a problem with the POST request");
    });
}

async function getFile(file_Id, telegramBotToken) {
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

module.exports = {
  sendToTelegram,
  infoDefRepost,
};
