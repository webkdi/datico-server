// textAnalyzer.js
const natural = require('natural');
const TfIdf = natural.TfIdf;

// Keywords for different topics
const topics = {
    incidents: ["Unfall", "Fahrzeug", "Verletzt", "Todesopfer", "gestorben", "Zusammenstoß", "Autobahn", "Rettungsdienst", "Verkehr", "Sperrung", "Kollision", "Fahrer", "Fahrerin", "Schaden", "Zeugen"],
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

module.exports = {
    analyzeTextTopic,
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