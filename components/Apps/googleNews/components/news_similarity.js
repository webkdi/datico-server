// textAnalyzer.js
const natural = require('natural');
const TfIdf = natural.TfIdf;
const nlp = require('compromise');
const db = require("./db_datico");

// Keywords for different topics
const topics = {
    incidents: [
        "Unfall", "Fahrzeug", "Verletzt", "Todesopfer", "gestorben", "Zusammenstoß", "Autobahn", "Rettungsdienst", "Verkehr", "Sperrung", "Kollision", "Fahrer", "Fahrerin", "Schaden", "Zeugen", "Verkehrsunfall", "Fußgänger", "tödlich verletzt", "Fahrbahn", "Verbrechen", "Polizei", "Ermittlung", "Festnahme", "Tatverdächtiger", "Zeuge", "Gericht", "Straftat", "Anklage", "Urteil", "Diebstahl", "Überfall", "Mord", "Raub", "Betrug", "Körperverletzung", "Fahndung", "Verhaftung", "Verdächtig", "Täter", "tatverdächtigen", "gestohlene Bankomatkarte", "fahndet", "Ermittlungen",
        "Berufsrettung", "Notrufe", "Einsätze", "Feuerwehreinsatz", "Rettungskräfte", "Pyrotechnik", "Verletzungen", "Berufsfeuerwehr", "medizinisch versorgt", "Sanitäter", "Notarzt", "Reanimation"
    ],
    // ["Unfall", "Fahrzeug", "Verletzt", "Todesopfer", "gestorben", "Zusammenstoß", "Autobahn", "Rettungsdienst", "Verkehr", "Sperrung", "Kollision", "Fahrer", "Fahrerin", "Schaden", "Zeugen"],
    crime: ["Verbrechen", "Polizei", "Ermittlung", "Festnahme", "Tatverdächtiger", "Zeuge", "Gericht", "Straftat", "Anklage", "Urteil", "Diebstahl", "Überfall", "Mord", "Raub", "Betrug", "Körperverletzung", "Fahndung", "Verhaftung", "Verdächtig", "Täter"],
    // Add more topics and keywords as needed
};

function analyzeTextTopic(textInput) {
    const tfidf = new TfIdf();
    tfidf.addDocument(textInput);

    // Function to calculate similarity for each keyword and return detailed scores
    const calculateSimilarity = (docIndex, keywords) => {
        let keywordScores = {};
        let totalSimilarity = 0;

        keywords.forEach(keyword => {
            const score = tfidf.tfidf(keyword, docIndex);
            keywordScores[keyword] = score;
            totalSimilarity += score;
        });

        return { totalSimilarity, keywordScores };
    };

    // Object to store similarity scores and details for each topic
    const topicSimilarities = {};

    // Calculate and store similarity scores and details for each topic
    Object.keys(topics).forEach(topic => {
        topicSimilarities[topic] = calculateSimilarity(0, topics[topic]);
    });

    return topicSimilarities;
}

function compareHeadersForSimilarity(articleHeaders1, articleHeaders2) {
    function extractKeywords(text) {
        let doc = nlp(text);
        // Extract nouns and adjectives as they often carry the main topic of the text
        let nouns = doc.nouns().out('array');
        let adjectives = doc.adjectives().out('array');
        return [...new Set([...nouns, ...adjectives])]; // Combine and remove duplicates
    }
    let keywords1 = extractKeywords(articleHeaders1);
    let keywords2 = extractKeywords(articleHeaders2);

    // console.log("Keywords in Article 1:", keywords1);
    // console.log("Keywords in Article 2:", keywords2);

    // Find common keywords
    let common = keywords1.filter(keyword => keywords2.includes(keyword));
    let similarityScore = common.length / Math.min(keywords1.length, keywords2.length);

    // console.log("Common Keywords:", common);
    // console.log("Similarity Score:", similarityScore);

    return similarityScore;
}

async function compareSimilarity(articleHeaders, titlesPublishedPreviously) {
    let titleNow;
    if (typeof articleHeaders === 'string') {
        titleNow = articleHeaders;
    } else if (Array.isArray(articleHeaders)) {
        titleNow = articleHeaders.join('. ');
    }

    // const articles = await db.getLatestPostTitles();
    const articles = titlesPublishedPreviously;
    let similarScore = 0;
    for (const article of articles) {
        const titlesPast = article.titles.join('. ');
        // console.log(titleNow);
        // console.log(titlesPast);
        const similar = compareHeadersForSimilarity(titleNow, titlesPast)
        similarScore +=similar;
    }
    return similarScore;
}
// Example articles
let article1 = [
    "FPÖ-Chef Kickl in der \"ZiB 2\": Ein Geisterfahrer auf der Überholspur",
    "ORF-Neujahrs-Interview - Kickl mit Kreide, Thür mit verpasster Nachfrage | krone.at",
    "Kickl will \"Rechtslage\" für Entzug von Staatsbürgerschaft schaffen",
    "FPÖ-Chef über \"Käsezettel\", \"Sauhaufen\" und Remigration",
    "2024 werde das “Jahr der Wende werden” - Politik"
];
// compareSimilarity(article1);

module.exports = {
    analyzeTextTopic,
    compareSimilarity
};


// const fs = require('fs');
// const path = require('path');
// // Relative path to the JSON file
// const filePath = "components/Apps/googleNews/images/articles.json";
// // Read and parse the JSON file
// let fileContent;
// try {
//     fileContent = fs.readFileSync(filePath, 'utf8');
// } catch (err) {
//     console.error('Error reading the file:', err);
//     return;
// }
// const data = JSON.parse(fileContent);
// const entriesWithTexts = data.filter(entry => entry.texts !== undefined);
// entriesWithTexts.forEach(entry => {
//     let atricleTextsAll = entry.texts.map((element, index) => `Artikel ${index + 1}:\n"${element}"`).join('\n');
//     const topic = analyzeTextTopic(atricleTextsAll);

//     if (topic.incidents.totalSimilarity > 0 || topic.crime.totalSimilarity > 0) {
//         console.log("#################################");
//         console.log(topic);
//         console.log(atricleTextsAll);
//     }
// });