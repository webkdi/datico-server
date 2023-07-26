// TwitterFunctionsAxios.js

require("dotenv").config();
const { TwitterApi, TwitterApiV2Settings } = require("twitter-api-v2");
const axios = require("axios");

async function initializeTwitterApi() {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_APP_KEY,
      appSecret: process.env.TWITTER_APP_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    const rwClient = client.readWrite;
    TwitterApiV2Settings.debug = true;

    // You can now use the 'client' object to make API requests and perform other operations.

    console.log("TwitterApi client initialized successfully.");
    return client;
  } catch (error) {
    console.error(
      "An error occurred while initializing the TwitterApi client:",
      error
    );
    // You can handle the error here, perform necessary logging, or take other actions.
    // For example, you can throw a custom error, return a default value, or retry the initialization.
  }
}

async function tweetPost(text, mediaType, mediaUrl) {
  try {
    const twitterApiInstance = await initializeTwitterApi();

    // Upload media (image, video) to Twitter
    let mediaId;
    if (mediaType !== "text") {
      const response = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
      });
      const mediaBuffer = Buffer.from(response.data);
      var mediaTypeDesc = "";
      if (mediaType === "image") {
        mediaTypeDesc = "image/jpeg";
      } else if (mediaType === "video") {
        mediaTypeDesc = "video/mp4";
      }
      mediaId = await twitterApiInstance.v1.uploadMedia(mediaBuffer, {
        mimeType: mediaTypeDesc,
      });
      console.log("Twitter: media uploaded with id", mediaId);
    }

    // Tweet!
    let tweet;
    if (mediaType !== "text") {
      tweet = await twitterApiInstance.v2.tweet({
        text,
        media: { media_ids: [mediaId] },
      });
    } else {
      tweet = await twitterApiInstance.v2.tweet({
        text,
      });
    }
    console.log(
      "Twitter: tweet created with id",
      tweet.data.id,
      "and text '",
      tweet.data.text,
      "'"
    );
    return tweet;
  } catch (error) {
    console.error("An error occurred while posting the tweet:", error);
  }
}

module.exports = {
  tweetPost,
};
