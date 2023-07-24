require("dotenv").config();
const { TwitterApi, TwitterApiError } = require("twitter-api-v2");
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
    // console.log(mediaId);
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
    return tweet;
  } catch (error) {
    // console.error("An error occurred while posting the tweet:", error);
    handleTwitterApiError(error);
  }
}

/**
 * Informative Error Handler for Twitter API v2
 * @param {Error} error - The error object thrown by the Twitter API v2 library.
 */
function handleTwitterApiError(error) {
  if (error instanceof TwitterApiError) {
    const { errors } = error.response.data;

    // Twitter API often returns multiple errors; we'll handle the first one for simplicity
    if (errors && errors.length > 0) {
      const { title, detail } = errors[0];
      console.error('Twitter API Error:');
      console.error('Title:', title);
      console.error('Detail:', detail);

      // Additional error handling can be done here, like logging or specific actions for certain error types.
    } else {
      console.error('Twitter API Error (Unknown Error):', error.message);
    }
  } else {
    console.error('Non-Twitter API Error:', error.message);
    // Handle non-Twitter API errors, if needed.
  }
}


module.exports = {
  tweetPost,
};
