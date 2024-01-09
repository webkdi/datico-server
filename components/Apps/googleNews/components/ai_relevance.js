const axios = require('axios');
require('dotenv').config();

// const relProject = process.env.RELEVANCE_PROJECT;
const relProject = 'd5ee5eaebddc-40f6-8cd9-589323c0815a';
const relApiUrl = 'https://api-d7b62b.stack.tryrelevance.com/latest/studios/85e86411-4331-4fdb-8ec7-8150153ed293/trigger_limited';

// Async function to perform the POST request
async function triggerRelAi(text) {
    console.log("Длина вводного текста в Relevance:", text.length);
    const url = relApiUrl;
    const data = {
        params: {
            text: text
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