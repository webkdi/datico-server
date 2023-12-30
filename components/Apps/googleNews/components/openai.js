require('dotenv').config();
const axios = require('axios');

async function getOpenAIResponse(prompt, model, max_tokens) {
  const openai_api_key = process.env.OPENAI_API_KEY;

  var tokens = 400;
  tokens = max_tokens;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      // model: "gpt-3.5-turbo", "gpt-4",
      model: model,
      messages: [{"role": "user", "content": prompt}],
      temperature: 0.7,
      max_tokens: tokens
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_api_key}`
      }
    });
    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Error in OpenAi:', error.response.data);
  }
}



module.exports = {
  getOpenAIResponse,
};
