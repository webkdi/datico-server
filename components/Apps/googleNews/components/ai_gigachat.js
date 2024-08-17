const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

let tokenCache = {
    token: null,
    expiresAt: null
};

async function getAccessToken() {
    const currentTime = Date.now();

    // Check if the token is still valid
    if (tokenCache.token && tokenCache.expiresAt > currentTime + 5 * 60 * 1000) {
        return tokenCache.token;
    }

    // If no valid token, request a new one
    const url = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    const clientId = process.env.GIGACHAT_CLIENT_ID;
    const clientSecret = process.env.GIGACHAT_CLIENT_SECRET;
    const authData = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const rqUID = uuidv4();
    const data = 'scope=GIGACHAT_API_PERS';

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authData}`,
                'Accept': 'application/json',
                'RqUID': rqUID
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        // Update the cache with the new token and expiration time
        const expiresIn = 30 * 60 * 1000; // 30 minutes
        tokenCache.token = response.data.access_token;
        tokenCache.expiresAt = currentTime + expiresIn;

        return tokenCache.token;
    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    }
}

async function generateChatResponse(token, messages) {
    const url = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    const data = {
        model: "GigaChat",
        messages: messages,
        stream: false,
        repetition_penalty: 1
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Bypass SSL
        });

        const output = response.data.choices[0].message.content;
        return output;
    } catch (error) {
        console.error('Error generating chat response:', error.response ? error.response.data : error.message);
    }
}

// Function to build a role-based message array for GigaChat
function buildMessages(articleText) {
    const systemMessage = {
        role: "system",
        content: `Ты копирайтер по соцсетям. Тебе будет дан [ТЕКСТ]. Из [ТЕКСТ] напиши КОРОТКИЙ пост для Телеграма (максимально 900 символов влючая пробелы) на РУССКОМ ЯЗЫКЕ.
        Если [ТЕКСТ] не на русском языке, переведи его на русский язык. 
        Сначала напиши короткий красочный заголовок для поста. Потом резюмируй [ТЕКСТ] в 2-3 абзацах. ЗАПРЕЩЕНО использовать слова "Заголовок" и "Резюме".
        Используй простой молодежный язык. Разбавь текст немногими емодзи и смайликами. Пост должен быть короче 900 печатных знаков!
        НЕ упоминай "в этом тексте написано", или "В статье рассказывается о том, как..". НЕ добавляй ковычки для названия и основного теста.`
    };

    const userMessage = {
        role: "user",
        content: `[ТЕКСТ] ${articleText}`
    };

    return [systemMessage, userMessage];
}

function buildTitlePrompt(articleText) {
    const systemMessage = {
        role: "system",
        content: 'Ты копирайтер по соцсетям. Тебе будет дан [ТЕКСТ]. Из [ТЕКСТ] напиши яркий, вызывающий любопытство заголовок из максимум 2 слов. Пример: [ТЕКСТ] """Бурые водоросли против болезни Паркинсона 🌊\n\nУчёные из Японии 🇯🇵 сделали крутое открытие в борьбе с болезнью Паркинсона 🧠. Оказывается, антиоксиданты в бурых морских водорослях 🌿, особенно в Ecklonia cava, могут защищать нейроны от повреждений 🛡️. Эти супер-полезные вещества нейтрализуют свободные радикалы 🌱, которые атакуют клетки и вызывают болезнь 🧬.\n\nВ эксперименте на мышах 🐭, которым ежедневно давали антиоксиданты из водорослей, учёные заметили улучшение моторных функций 🏃. В лабораторных условиях 🔬 антиоксиданты активировали фермент, который снижает уровень вредных веществ, разрушающих нейроны 💥. Хотя исследования ещё продолжаются, добавление бурых водорослей в рацион 🍽️ уже сейчас может стать отличным шагом для защиты мозга и профилактики болезни Паркинсона 💡.\n\nТак что, если хотите добавить что-то полезное в своё питание, обратите внимание на эти чудо-водоросли! 💚""" Твой ответ: Водоросли против Паркинсона'
    };

    const userMessage = {
        role: "user",
        content: `[ТЕКСТ] ${articleText}`
    };

    return [systemMessage, userMessage];
}

async function getPostOutOfArticle(articleText) {
    const token = await getAccessToken();
    const messages = buildMessages(articleText);
    if (token) {
        const res = await generateChatResponse(token, messages);
        console.log(res);
        return res;
    }
}

async function shortenArticle(articleText) {
    const token = await getAccessToken();
    const systemMessage = {
        role: "system",
        content: `Ты - копирайтер по соцсетям и переводчик. Получив [ТЕКСТ], ты сокращаешь его до одного абзаца, передавая ключевые мысли максимально лаконично. Если [ТЕКСТ] не на русском языке, переведи его на русский. Запрещается ссылаться на автора, использовать формулировки типа 'Автор пишет...' или 'Статья рассказывает...'. Пиши от первого лица, как будто ты сам автор текста, фокусируясь на сути и избегая повторов.`
    };
    const userMessage = {
        role: "user",
        content: `Сократи до 1 абзаца [ТЕКСТ]: ${articleText}`
    };
    if (token) {
        const res = await generateChatResponse(token, [systemMessage, userMessage]);
        console.log(res);
        return res;
    } else {
        throw new Error("Failed to get access token.");
    }
}


// Exported function to be used in other modules
async function getTitleOutIfPost(articleText) {
    const token = await getAccessToken();
    const messages = buildTitlePrompt(articleText);
    if (token) {
        const res = await generateChatResponse(token, messages);
        console.log(res);
        return res;
    }
}

// (async () => await getTitleOutIfPost("Кофе и чай с кофеином ускоряют метаболизм 🚀, как рассказала врач-терапевт Елена Устинова. Кофеин тонизирует организм, улучшает работу нервов и мышц, ускоряет сердцебиение и обладает мочегонным эффектом. А жгучие вещества, например, в имбирном чае, улучшают капиллярное кровообращение, расширяя сосуды и улучшая питание органов и тканей, включая мозг, руки и ноги. Это усиливает метаболизм 💪🏻. Так что пейте кофе и чай, а также имбирный чай, чтобы ускорить обмен веществ!"))();

module.exports = { getPostOutOfArticle, getTitleOutIfPost, shortenArticle };