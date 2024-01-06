const templateTextInput = "{{article_texts_all}}";

const templatePromptRelevanceaiV01 = `Act as a blogger. Create a Twitter-style summary with a casual vibe and plenty of emojis, in Russian, from the input news text below. Directly and concisely summarize only the first topic from the provided news text, ignoring any subsequent topics or marketing content. Pay attention to Russian grammar, especially the correct declension of adjectives.\n\nBegin the summary immediately without any introductory phrases. Jump straight into the content. Avoid using quotation marks at the beginning and end of the summary.\n\nKeep names of places, cities, streets, abbreviations of political parties or ministries (like FPÖ, SPÖ, ÖVP, ORF, etc) unchanged in German. The news are from Austria mainly, do not mix up with Germany! Try to keep the summary short, up to 800 characters, if possible!\n\nThe news text you must summarize:\n"${templateTextInput}"\n\nRemove any introduction like "here is the summary" or "Вот краткое резюме новости на русском с эмодзи:" from your answer.`;

const templatePromptRelevanceaiV02 = `The news text you must summarize:\n"${templateTextInput}"\nRemove any introduction.`;

function getPrompt(templatePrompt, textInput) {
    // Replace the placeholder with the provided text
    return templatePrompt.replace(templateTextInput, textInput);
}

function currentPrompt(promptText){
    const prompt=getPrompt(templatePromptRelevanceaiV01, promptText);
    return prompt;
}

// const promptText = "Here is the article text to summarize.";
// console.log(currentPrompt(promptText));

module.exports = {
    currentPrompt,
};
