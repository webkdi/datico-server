const axios = require('axios');
require('dotenv').config();

const relProject = process.env.RELEVANCE_PROJECT;

// Async function to perform the POST request
async function triggerRelAi(text) {
    console.log("Длина вводного текста в Relevance:", text.length);
    const url = "https://api-d7b62b.stack.tryrelevance.com/latest/studios/efdc3268-1405-4de3-9b9c-b7b18c0e6cfb/trigger_limited";
    const data = {
        params: {
            article_texts_all: text
        },
        project: relProject
    };
    const config = {
        headers: {
            "Content-Type": "application/json"
        }
    };

    try {
        const response = await axios.post(url, data, config);
        // console.log('Response from Relevance:', response.data);
        return response.data.output.answer;
    } catch (error) {
        if (error.response && error.response.data && error.response.data.message) {
            console.error('Error message:', error.response.data.message);
        } else {
            console.error('Error in triggerRelAi:', error.message);
        }
        return '';
        // throw error; // Re-throw the error for the caller to handle
    }
}
// triggerLimitedAPI(message);



module.exports = {
    triggerRelAi,
};
