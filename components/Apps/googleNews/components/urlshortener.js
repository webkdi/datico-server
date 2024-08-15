const axios = require('axios');
require("dotenv").config();

var apiKey = process.env.URLDAY_APIKEY;

async function postLink(urlToPost) {
    const endpoint = 'https://www.urlday.com/api/v1/links';
    const data = `url=${encodeURIComponent(urlToPost)}`;

    const config = {
        method: 'post',
        url: endpoint,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${apiKey}`
        },
        data: data
    };

    try {
        const response = await axios(config);
        // Assuming the shortened URL is in the response data and directly accessible
        // You may need to adjust the path depending on the actual structure of the response
        return response.data.data.short_url;
    } catch (error) {
        console.error("urlday:", error.message);
        // throw error; // re-throw the error for the caller to handle
        return '';
    }
}

module.exports = { postLink };
