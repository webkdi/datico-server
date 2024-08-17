const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const fs = require('fs');
const ai = require("./components/ai_openai");
const db = require("./components/db_datico");
const tg = require("./components/telegram");
const collage = require("./components/collage");
const urlShort = require("./components/urlshortener");
const relAi = require("./components/ai_relevance");
const gigaChatAi = require("./components/ai_gigachat");
const prompts = require("./components/ai_prompts");
const topics = require("./components/news_similarity");
const { URL } = require('url');
require("dotenv").config();


function getMainDomain(inputUrl) {
    try {
        const parsedUrl = new URL(inputUrl);
        const hostname = parsedUrl.hostname;

        // Remove 'www.' if it exists
        const hostnameWithoutWww = hostname.replace(/^www\./, '');

        // Split the hostname into parts
        const parts = hostnameWithoutWww.split('.');

        // Extract the main domain name (second to last part)
        // This handles standard domain formats like 'example.com'
        const mainDomain = parts.length > 1 ? parts[parts.length - 2] : hostnameWithoutWww;

        return mainDomain;
    } catch (error) {
        // Handle the error or return a default value
        console.error(`Error in getMainDomain for ${inputUrl}, error: ${error.message}`);
        return ''; // or any other default value or error handling
    }
}

// Separate function to decode URLs
function decodeUrl(href) {
    // Step 2: Split by '/articles/'
    const partsAfterArticles = href.split('/articles/');
    if (partsAfterArticles.length < 2) {
        return; // Skip if '/articles/' not found
    }

    const afterArticles = partsAfterArticles[1];

    // Step 3: Further split by '?'
    const partsBeforeQuery = afterArticles.split('?');
    const encodedUrlPart = partsBeforeQuery[0];
    const padding = '='.repeat((4 - encodedUrlPart.length % 4) % 4);
    let decodedUrl = Buffer.from(encodedUrlPart + padding, 'base64').toString('binary');

    console.log("href:", href, "\n", "encodedUrlPart:", encodedUrlPart)

    const urlMatch = decodedUrl.match(/https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/);
    return urlMatch ? urlMatch[0] : null;
}

async function decodeUrl_fetchDecodedBatchExecute(id) {
    const s = `[[["Fbv4je","[\\"garturlreq\\",[[\\"en-US\\",\\"US\\",[\\"FINANCE_TOP_INDICES\\",\\"WEB_TEST_1_0_0\\"],null,null,1,1,\\"US:en\\",null,180,null,null,null,null,null,0,null,null,[1608992183,723341000]],\\"en-US\\",\\"US\\",1,[2,3,4,8],1,0,\\"655000234\\",0,0,null,0],\\"${id}\\"]",null,"generic"]]]`;

    const headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "Referer": "https://news.google.com/",
    };

    try {
        const response = await axios.post(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je",
            `f.req=${encodeURIComponent(s)}`,
            { headers }
        );

        if (response.status !== 200) {
            throw new Error('Failed to fetch data from Google.');
        }

        const text = response.data;
        const header = '[\\"garturlres\\",\\"';
        const footer = '\\",';
        if (!text.includes(header)) {
            throw new Error(`Header not found in response: ${text}`);
        }
        const start = text.split(header)[1];
        if (!start.includes(footer)) {
            throw new Error("Footer not found in response.");
        }
        const url = start.split(footer)[0];
        return url;
    } catch (error) {
        throw error;
    }
}

// Google News URL Decoder
// https://github.com/SSujitX/google-news-url-decoder/blob/main/README.md
async function decodeUrl_v202408(sourceUrl) {
    try {
        const url = new URL(sourceUrl);
        const path = url.pathname.split("/");
        if (url.hostname === "news.google.com" && path.length > 1 && path[path.length - 2] === "articles") {
            const base64Str = path[path.length - 1];
            let decodedStr = Buffer.from(base64Str, 'base64').toString('latin1');

            const prefix = Buffer.from([0x08, 0x13, 0x22]).toString('latin1');
            if (decodedStr.startsWith(prefix)) {
                decodedStr = decodedStr.substring(prefix.length);
            }

            const suffix = Buffer.from([0xd2, 0x01, 0x00]).toString('latin1');
            if (decodedStr.endsWith(suffix)) {
                decodedStr = decodedStr.slice(0, -suffix.length);
            }

            const bytesArray = Buffer.from(decodedStr, 'latin1');
            const length = bytesArray[0];
            if (length >= 0x80) {
                decodedStr = decodedStr.substring(2, length + 1);
            } else {
                decodedStr = decodedStr.substring(1, length + 1);
            }

            if (decodedStr.startsWith("AU_yqL")) {
                return await decodeUrl_fetchDecodedBatchExecute(base64Str);
            }

            return decodedStr;
        } else {
            return sourceUrl;
        }
    } catch (error) {
        throw error;
    }
}

async function shortenUrl(originalUrl) {
    const clckUrl = `https://clck.ru/--?url=${encodeURIComponent(originalUrl)}`;

    try {
        const response = await axios.get(clckUrl);
        return response.data.trim();
    } catch (error) {
        console.error('Error occurred while shortening the URL:', error);
        return 'Error occurred while shortening the URL';
    }
}

function convertToMySQLDateTime(inputString) {
    const date = new Date(inputString);

    // Function to add leading zeros for single digit numbers
    const zeroPad = (num, places) => String(num).padStart(places, '0');

    // Constructing MySQL datetime format: YYYY-MM-DD HH:MM:SS
    return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1, 2)}-${zeroPad(date.getDate(), 2)} ${zeroPad(date.getHours(), 2)}:${zeroPad(date.getMinutes(), 2)}:${zeroPad(date.getSeconds(), 2)}`;
}

function convertDateString(inputString) {
    // Parse the input string into a Date object
    // Assuming the input format is 'YYYY-MM-DD HH:MM:SS'
    const [datePart, timePart] = inputString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');

    // Function to add a leading zero for day and month
    const addLeadingZero = (num) => num.length === 1 ? '0' + num : num;

    // Format the date
    const formattedDate =
        `${addLeadingZero(day)}.${addLeadingZero(month)}.${year.substring(2)} ⏱️ ${hours}:${minutes}`;

    // Return the formatted string
    return formattedDate;
}

async function parseRSS(url) {
    try {
        const response = await axios.get(url);
        const result = await xml2js.parseStringPromise(response.data);
        const items = result.rss.channel[0].item.slice(0, 999);

        // fs.writeFileSync('components/Apps/googleNews/images/items.json', JSON.stringify(items));

        for (const item of items) {
            // Load description HTML content with Cheerio
            const $ = cheerio.load(item.description[0]);

            // Extract texts inside <a> tags
            const linksTexts = $('a').map((i, link) => $(link).text()).get();

            // Extract and decode URLs from the <a> tags
            const links = [];
            const anchors = $('a').toArray(); // Convert jQuery object to array

            for (const elem of anchors) {
                const href = $(elem).attr('href');
                const decodedUrl = await decodeUrl_v202408(href);
                if (decodedUrl) {
                    links.push(decodedUrl);
                }
            }

            // Assign the extracted data to the item object

            // item.link = decodeUrl(item.link[0]);
            item.titles = linksTexts;
            item.pubDate = convertToMySQLDateTime(item.pubDate[0]);
            item.links = links;
            // item.title = item.title[0];
            item.guid = item.guid[0]._;
            delete item.description;
            delete item.source;
            delete item.link;
            delete item.title;
        }

        return items;

    } catch (error) {
        console.error('Error parsing RSS feed:', error.message);
        return [];
    }
}

async function extractTextAndImageFromURL(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Extract text
        const text = $('p').text();

        // Try to extract the image URL from Open Graph meta tag
        let imageUrl = $('meta[property="og:image"]').attr('content');

        // If not found, try to extract from standard image meta tag
        if (!imageUrl) {
            imageUrl = $('meta[name="image"]').attr('content');
        }

        // Return both text and image URL
        return { text, imageUrl };
    } catch (error) {
        console.error('Error fetching article:', error.message);
        return { text: '', imageUrl: '' };
    }
}

async function makeRusNews(texts) {

    const active = true;

    let atricleTextsAll = texts.map((element, index) => `Artikel ${index + 1}:\n"${element}"`).join('\n');

    var response_length = 1000;
    atricleTextsAll = atricleTextsAll.slice(0, 16000 - response_length);

    let rusArticle = '';
    let rusFunny = '';

    let prompt = `
        Act as journalist. Create a summary, up to 800 characters, out of following input (that is in German). The input is an array of several articles about same topic. Analyse them and create best suitable aggregated description. Avoid redundancies, also avoid repeiting the same words. Do not make quotes in the beginning and end of the summary. If needed, separate text in paragraphs. Keep the summaty in German.

        The input:
        "${atricleTextsAll}"           
        `;
    rusArticle = await ai.getOpenAIResponse(prompt, "gpt-3.5-turbo-1106", response_length);

    response_length = 800;
    prompt = `
    Act as blogger. Make the Twitter-style summary of the news text below with suitable emojis, very casual, up to 150 signs. But watch the Russian grammar, especially the correct declension of the adjectives. 

    Then write more details of the news text below, in a conversational style that is simple and relaxed, up to 500 signs. The text should include humorous elements, such as jokes or witty remarks, and can optionally contain some crude blunders, depending on your creative choice. Make use of slang and professional jargon to enrich the vocabulary. The narrative should be expressive and have a free-flowing structure, mimicking the natural flow of a casual conversation.  
    
    Do not translate names of places, cities, streets, keep it in German. Do NOT greet or talk to the readers, like "Так что, ребята, ....". Do not aks questions or write "мы", "наши" and similar, if it is not mentioned in the original text. DO not make quotes. Try to separate text in paragraphs, 2-3 sentences in each, for easy reading.

    Whole text must be not longer then 800 signs, strict! Check with pithon sctript the exact number of characters, and rephrase if you get more then 800 characters! Output must be in RUSSIAN!

    The news text: "${rusArticle}"`;

    // rusArticle = await ai.getOpenAIResponse(prompt, "gpt-4", response_length);

    response_length = 800;
    prompt = `Act as blogger. Make the Twitter-style summary with suitable emojis, very casual, strictly within 150 characters, out of the input news text below. But watch the Russian grammar, especially the correct вeclension of the adjectives. Do not make quotes in the beginning and end of the summary. Output must be in RUSSIAN! Do not write something like "Twitter-style summary".

    Then white a new paragraph with more details, up to 300 characters, in a conversational style that is simple and relaxed. The text should include humorous elements, such as jokes or witty remarks, and can optionally contain some crude blunders, depending on your creative choice. Make use of slang and professional jargon to enrich the vocabulary. The narrative should be expressive and have a free-flowing structure, mimicking the natural flow of a casual conversation. Do not write something like "More details:".
    
    Do not translate names of places, cities, streets, keep it in German. Do NOT greet or talk to the readers, like "Так что, ребята, ....". Do not aks questions or write "мы", "наши" and similar, if it is not mentioned in the original text. DO not make quotes. Try to separate text in paragraphs, 2-3 sentences in each, for easy reading.

    The input news:
    "${rusArticle}"           
    `;
    prompt = `
        Act as a blogger. Create a Twitter-style summary with suitable emojis, very casual, in Russian, strictly within 150 characters, from the input news text below. Pay attention to Russian grammar, especially the correct declension of adjectives. Avoid using quotes at the beginning and end of the summary. Output must be in RUSSIAN. Do not mention "Twitter-style summary", "Твит", "tweet" or similar in beginning.
    
        Follow with a detailed paragraph about most interesting point of the news, strictly up to 300 characters, in a conversational and relaxed style. Include humorous elements like jokes or witty remarks, and optionally some crude blunders. Use slang and professional jargon to enrich the vocabulary. The narrative should be expressive, with a free-flowing structure, mimicking a casual conversation. Do NOT state "More details", "Paragraph", "Подробности" or similar in beginning.
    
        Do not translate names of places, cities, streets; keep them in German. Avoid addressing the readers directly, such as "Так что, ребята, ....", asking questions, or using "мы", "наши" if not in the original text. Avoid quotes. The news are from Austria mainly, do not mix up with Germany! Whole text must be strictly less then 500 characters! If more, repeat the text generation till you fulfill the limit of 500 characters!
    
        The input news:
        "${rusArticle}"           
    `;
    active ? rusFunny = await ai.getOpenAIResponse(prompt, "gpt-4", 600) : rusFunny;

    return {
        rusArticle: rusArticle,
        rusShort: rusFunny
    };
}

async function parseGoogleNewsRss(rssUrl, options = {}) {

    console.log(Date().toString(), "Parcing", rssUrl);
    var news = await parseRSS(rssUrl);

    await db.cleanNewsTable();

    const mng = await db.getNewsMngt();

    var makePost = mng[0].publish == 1 ? true : false;
    var crimeCounter = mng[0].shareCrime;
    const postCrime = crimeCounter % 3 === 0 ? true : false;

    // Set makePost to false from 10 PM (22) to 6 AM (6)
    const currentHour = new Date().getHours();
    if (makePost) {
        makePost = !(currentHour >= 1 && currentHour < 9);
    }

    // for checking of repearing topics already published
    const titlesPublishedPreviously = await db.getLatestPostTitles();

    for (const item of news) {

        const newItem = await db.insertIgnoreguid(item.guid);

        // let interesting = item.links.length > 4;
        let interesting = options.news ? item.links.length > 4 : true;


        if (newItem == 0) {
            // console.log("Уже существует:", item.titles[0]);
            continue;
        }

        const texts = [];
        const images = [];
        for (const link of item.links) {
            try {
                const parsedTextImage = await extractTextAndImageFromURL(link);
                texts.push(parsedTextImage.text);
                images.push(parsedTextImage.imageUrl);
            } catch (error) {
                console.error('Error processing link:', link, error.message);
            }
        }
        item.texts = texts;

        // retain longest article only
        function findAndKeepLongestString(array) {
            const longestString = array.reduce((a, b) => a.length >= b.length ? a : b, "");
            // Clear the array
            array.length = 0;
            // Add only the longest string back into the array
            array.push(longestString);
        }
        // findAndKeepLongestString(texts);

        // Keep only the first entry
        function keepFirstEntry(array) {
            if (array.length > 0) {
                // Store the first entry
                const firstEntry = array[0];
                // Clear the array
                array.length = 0;
                // Add only the first entry back into the array
                array.push(firstEntry);
            }
        }
        keepFirstEntry(texts);

        item.images = images;

        const imgCollage = await collage.createCollage(images);
        if (!imgCollage || imgCollage.length === 0) {
            continue;
        }

        let translations = {};
        let rusShort, rusArticle;

        var isCrime;
        rusArticle = texts.slice(0, 2).map((element, index) => `Artikel ${index + 1}:\n"${element}"`).join('\n');
        const themes = topics.analyzeTextTopic(rusArticle);
        isCrime = (themes.incidents.totalSimilarity > 1 || themes.crime.totalSimilarity > 1) ? true : false;

        const titles = item.titles;
        const similarScore = topics.compareSimilarity(titles, titlesPublishedPreviously);
        const repeating = similarScore >= 0.5 ? true : false;

        console.log(`Постить: ${makePost}, Интересно: ${interesting}, Крими: ${isCrime}, Жесть: ${postCrime}, Повтор: ${repeating}, Пост ${titles}`);

        // сделать текст статьи
        if (options.news) {
            if (repeating) {
                console.log("repeating topic, skip this time");
            } else if (isCrime && !postCrime) {
                console.log("crime topic, skip this time");
            } else if (makePost && interesting) {
                const prompt = prompts.currentPrompt(rusArticle);
                rusShort = await relAi.triggerRelAi(prompt);
                console.log("relAi:", rusShort);
            }
        } else {
            if (rusArticle.length > 2000) {
                rusArticle = await gigaChatAi.shortenArticle(rusArticle);
            }
            rusShort = await gigaChatAi.getPostOutOfArticle(rusArticle);

            let rusShortLength = rusShort.length;
            let maxIterations = 3;
            for (let i = 0; i < maxIterations; i++) {
                if (rusShortLength > 1000) {
                    console.log(`text with ${rusShortLength} characters too long, repeating`);
                    rusShort = await gigaChatAi.getPostOutOfArticle(rusShort);
                    rusShortLength = rusShort.length; // Update length after modification
                } else {
                    break; // Exit loop if the text is short enough
                }
            }
        }
        translations.rusShort = rusShort;
        translations.rusArticle = rusArticle;
        rusArticle = translations.rusArticle !== undefined ? translations.rusArticle : "";
        rusShort = translations.rusShort !== undefined ? translations.rusShort : "";

        item.rusArticle = rusArticle;
        item.rusShort = rusShort;






        // подготовить финальный текст или укоротить до нуля, чтобы не постить
        let tgText = "";
        if (rusShort.length > 300) {
            const newsSource = item.links[0];
            const shortUrl = await urlShort.postLink(newsSource);
            const sourceFrom = getMainDomain(newsSource);
            if (options.news) {
                tgText = `#ШницельНовости ${rusShort}\n\n🗓️ ${convertDateString(item.pubDate)} 🗞️ ${sourceFrom} 🔎 ${shortUrl}`;
            } else {
                const clckUrl = await shortenUrl(newsSource);
                tgText = `#ПсиСлухи ${rusShort}\n\n🗓️ ${convertDateString(item.pubDate)} 🔎 ${clckUrl}`;
            }
            console.log("Длина текста в Твиттер :", tgText.length);
            tgText = tgText.replace(/"/g, "''");
        }

        if (((makePost && interesting) || !options.news) && tgText.length > 300) {

            const sendTg = await tg.sendPhotoToTelegram(tgText, imgCollage, options.chatId, options.botToken);

            // only one post per execution, rest is stored
            if (sendTg.status === 200) {  // Use === for comparison
                makePost = false;
                crimeCounter += 1;
                await db.updateNewsMngt(crimeCounter);
            }
        }

        const updateArticle = await db.updateArticle(item);

    }

    fs.writeFileSync('components/Apps/googleNews/images/articles.json', JSON.stringify(news));
    return;
}

async function executeGoogleParcing() {

    const rssAutNews = 'https://news.google.com/rss/topics/CAAqIAgKIhpDQkFTRFFvSEwyMHZNR2czZUJJQ1pHVW9BQVAB?hl=de&gl=AT&ceid=AT%3Ade';
    const chatIdAutNews = Number(process.env.TG_CHAT_ID_AT_NEWS);
    const botTokenAutNews = process.env.TG_BOT_TOKEN_SCHNITZELNEWS_BOT;

    const rssPsyDeNews = 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4Wm1nU0FtUmxLQUFQAQ?hl=de&gl=DE&ceid=DE%3Ade';
    const rssPsyRuNews = 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4Wm1nU0FtUmxLQUFQAQ?hl=ru&gl=RU&ceid=RU%3Aru';
    const rssPsyEnNews = 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4Wm1nU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US%3Aen';

    const chatIdPsyNews = Number(process.env.TG_CHAT_ID_PSY_NEWS);
    const botTokenPsyNews = process.env.TG_BOT_TOKEN_FREUD_ONLINE_REPOST_BOT;

    // Austria news feed with interesting check
    await parseGoogleNewsRss(rssAutNews, { news: true, chatId: chatIdAutNews, botToken: botTokenAutNews });

    // Psychology feeds without interesting check
    const options = { news: false, chatId: chatIdPsyNews, botToken: botTokenPsyNews };
    await parseGoogleNewsRss(rssPsyDeNews, options);
    await parseGoogleNewsRss(rssPsyRuNews, options);
    await parseGoogleNewsRss(rssPsyEnNews, options);

    console.log(Date().toString(), "executeGoogleParcing finished");
    return;
}
// executeGoogleParcing();

module.exports = { executeGoogleParcing };