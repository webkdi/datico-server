const axios = require('axios');
require('dotenv').config();

// const relProject = process.env.RELEVANCE_PROJECT;
const relProject = 'd29d7a1698e0-44d3-bb75-d756c1cd3b3c';

// Async function to perform the POST request
async function triggerRelAi(text) {
    console.log("Длина вводного текста в Relevance:", text.length);
    const url = "https://api-d7b62b.stack.tryrelevance.com/latest/studios/c8632020-f831-4f65-9a72-9124abeb4d83/trigger_limited";
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
