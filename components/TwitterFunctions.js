require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const axios = require("axios");

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

async function tweetPost(text, mediaType, mediaeUrl) {
  // Upload media (image, video) to twitter
  let mediaId;
  if (mediaType != "text") {
    const response = await axios.get(mediaeUrl, {
      responseType: "arraybuffer",
    });
    const mediaBuffer = Buffer.from(response.data);
    var mediaTypeDesc = "";
    if (mediaType == "image") {
      mediaTypeDesc = "image/jpeg";
    } else if (mediaType == "video") {
      mediaTypeDesc = "video/mp4";
    }
    mediaId = await client.v1.uploadMedia(mediaBuffer, {
      mimeType: mediaTypeDesc,
    });
    console.log("Twitter: media uploaded with id",mediaId);
  }

  //Tweet!
  try {
    let tweet;
    if (mediaType != "text") {
      tweet = await client.v2.tweet({
        text,
        media: { media_ids: [mediaId] },
      });
    } else {
      tweet = await client.v2.tweet({
        text,
      });
    }
    console.log("Twitter: tweet created with id",tweet.data.id,"and text '",tweet.data.text,"'");
    return tweet;
  } catch (error) {
    const errorMessage = 'An error occurred while posting the tweet: ' + error.data + ', ' + error.rateLimit;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

module.exports = {
  tweetPost,
};
