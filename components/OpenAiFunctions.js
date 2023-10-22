require("dotenv").config();
const db = require("../components/Databases/Database");

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function getTwitterSummary(text, url, language) {
  let prompt;
  if (language === "de") {
    prompt = `Agiere als Twitter Blogger. Schreibe aud Deutsch eine Zusammenfassung des folgenden Textes für Twitter Post. Ein Post auf Twitter hat den Limit von 280 Zeichen, deswegen darf die Zusammenfassung maximal 280 Zeichen lang, inklusive Leerzeichen, sein! Entferne Anführungszeichen am Anfang und am Ende der Zusammenfassung. Zusammenfassung muss auf Deutsch, maximal 280 Zeichen, sein. 
  
    Der Text is:  
    "${text}"`;
    if (typeof url !== "undefined" && url !== null && url.trim() !== '') {
      prompt += `\n\nAm Ende füge den URL "${url}" als Quelle ein.`;
    }
  } else if (language === "ru") {
    prompt = `Use only Russian language. Действуй как блоггер Твиттера. Напиши на русском языке короткое обобщение следующего текста длиной не более 280 знаков. Пост на Твиттере имеет ограничение в 280 знаков, включая пробелы и знаки препинания, поэтому очень важно сделать обобщение не более 280 знаков! Удали в начале и конце обобщения кавычки. 
  
    Текс для обобщенияЮ  
    "${text}"`;
    if (typeof url !== "undefined" && url !== null && url.trim() !== '') {
      prompt += `\n\nВ конце добавть ссылку "${url}" как источник.`;
    } 
  } 

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

  try {
    const response = await openai.createCompletion(params);
    const newText = response.data.choices[0];
    newText.text = newText.text.trim();
    return newText.text;
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
} 

async function getRuTranslation(text) {
  let prompt;
  prompt = `Действуй как журналист. Переведи текст на русский язык:  
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

  try {
    const response = await openai.createCompletion(params);
    const newText = response.data.choices[0];
    // console.log(response);
    newText.text = newText.text.trim();
   
    return newText.text;
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
} 



async function runForTesting() {
  const text = `🇷🇺 🇺🇦 "Ist die ukrainische Offensive ins Stocken geraten?": Selbst Spanien hat erkannt, dass die Gegenoffensive gescheitert ist, und nun müsste man klären, wer die Schuld trägt.

  👉🏻 "Russland hat eine stärkere Verteidigung aufgebaut als erwartet und reagiert auf den ukrainischen Vorstoß mit schnellen mobilen Gegenangriffen, anstatt sich auf Gräben und feste Stellungen zu beschränken. Dass die Ukraine nicht in der Lage ist, russische Stellungen zu durchbrechen, liegt zum Teil an der Ausrüstung: Sie braucht Minenräumgeräte, Luftabwehrsysteme und Panzerabwehrraketen. 
  
  👉🏻 Man weiß nicht, wie sich die ukrainischen Streitkräfte verhalten hätten, wenn ihre westlichen Partner sie im vergangenen Sommer besser ausgerüstet und ausgebildet hätten oder wenn die Ukraine im Frühjahr eine Offensive gestartet hätte!?`;
  const url = null;

  const MAX_TWITTER_LENGTH = 280;

  let textTwitter = text;

  while (textTwitter.length > MAX_TWITTER_LENGTH) {
    console.log('shortening OpenAi text for Twitter, length', textTwitter.length);
    textTwitter = await getTwitterSummary(textTwitter, url, "de");
    console.log(textTwitter.length, textTwitter);
  }

}
// runForTesting();

module.exports = {
  getTwitterSummary,
  getRuTranslation,
};
