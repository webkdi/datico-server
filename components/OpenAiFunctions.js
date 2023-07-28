require("dotenv").config();
const db = require("../components/Databases/Database");

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getTwitterSummary(text) {
  const prompt = `Agiere als Twitter Blogger. Schreibe aud Deutsch eine Zusammenfassung des folgenden Textes für Twitter Post. Ein Post auf Twitter hat den Limit von 280 Zeichen, deswegen darf die Zusammenfassung maximal 280 Zeichen lang, inklusive Leerzeichen, sein! Entferne Anführungszeichen am Anfang und am Ende der Zusammenfassung. Zusammenfassung muss auf Deutsch, maximal 280 Zeichen, sein.
  
  Der Text is:  
  "${text}"`;

  const params = {
    model: "text-davinci-003",
    // model: "gpt-3.5-turbo-0301",
    prompt: prompt,
    // messages: messages,
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
  };

  const response = await openai.createCompletion(params);
  const newText = response.data.choices[0];
  newText.text = newText.text.trim();
  return newText.text;
}

module.exports = {
  getTwitterSummary,
};
