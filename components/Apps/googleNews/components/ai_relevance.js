const axios = require('axios');
require('dotenv').config();
const db = require("./db_datico");

// const relProject = process.env.RELEVANCE_PROJECT;
// const relProject = '2eef9c6b19ed-46e9-9f2b-9c93e11583a8';
// const relApiUrl = 'https://api-d7b62b.stack.tryrelevance.com/latest/studios/cfb8606f-4af4-457d-84f0-d21b05940e0f/trigger_limited';

// Async function to perform the POST request
async function triggerRelAi(text, endpoint, project, apiKey = "") {
    
    const data = {
        params: {
            text: text
        },
        project: project
    };
    const config = {
        headers: {
            "Content-Type": "application/json",
            "Authorization": apiKey
        }
    };


    fetch('https://api-d7b62b.stack.tryrelevance.com/latest/studios/ef33e836-a5fa-43e8-9599-55912af202ed/trigger_limited', {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":"YOUR_API_KEY"},
        body: JSON.stringify({"params":{"text":""},"project":"6f54abdd0f8d-4e58-9eb0-42c79d6a225f"})
      })

    try {
        const response = await axios.post(endpoint, data, config);
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