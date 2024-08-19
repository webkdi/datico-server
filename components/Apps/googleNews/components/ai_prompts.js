const templateTextInput = "{{article_texts_all}}";

const templatePromptRelevanceaiV01 = `Act as a blogger. Create a Twitter-style summary with a casual vibe and plenty of emojis, in Russian, from the input news text below. Directly and concisely summarize only the first topic from the provided news text, ignoring any subsequent topics or marketing content. Pay attention to Russian grammar, especially the correct declension of adjectives.\n\nBegin the summary immediately without any introductory phrases. Jump straight into the content. Avoid using quotation marks at the beginning and end of the summary.\n\nKeep names of places, cities, streets, abbreviations of political parties or ministries (like FPÖ, SPÖ, ÖVP, ORF, etc) unchanged in German. The news are from Austria mainly, do not mix up with Germany! Try to keep the summary short, up to 800 characters, if possible!\n\nThe news text you must summarize:\n"${templateTextInput}"\n\nRemove any introduction like "here is the summary" or "Вот краткое резюме новости на русском с эмодзи:" from your answer.`;

const templatePromptRelevanceaiV02 = `The news text you must summarize:\n"${templateTextInput}"\nRemove any introduction.`;

const templatePromptClaudePsyNews = `
You are tasked with creating a Twitter-style summary in Russian based on the following input text. The summary should have a casual vibe and include plenty of emojis. Here is the input text:

<text>
${templateTextInput}
</text>

Your task is to create a summary that is informative, engaging, and adheres to the following requirements:

1. The summary must be in Russian.
2. Use a casual tone and include plenty of emojis.
3. Write from a general perspective, avoiding first-person references or personal opinions.
4. The entire summary, including every single character, space, and punctuation mark, must be exactly 800 characters or less. This limit is non-negotiable.
5. Pay close attention to Russian grammar, especially the correct declension of adjectives.
6. Do not reference any specific individuals, institutions, or events mentioned in the input text.

Important guidelines:

- Do not use any introductory phrases. Jump straight into the content.
- Avoid using quotation marks at the beginning and end of the summary.
- Do not include phrases like "here is the summary" or "Вот краткое резюме новости на русском с эмодзи:".

If the input text contains any of the following:
- Calls to action (e.g., "subscribe", "watch the video", "buy now")
- Mentions of specific products, services, subscriptions, or prices
- Praising or promotional statements about a person, place, or product with the intent to advertise
- Repeated phrases urging registration, subscription, or service use
- Emotional appeals related to products or services that transition into calls to action

In such cases, write only: "This is an advertisement" or "The topic is not psychological."

Remember, the entire text, including the header, all spaces, and punctuation, must be within the strict 800-character limit. Exceeding this limit is unacceptable.

Approach: 

1. Create the summary for Twitter.
2. If the length of the summary, including the header, all spaces, and punctuation, exceeds the 800-character limit, recreate the summary till it is exactly below the limit of 800 characters.
`;


function getPrompt(templatePrompt, textInput) {
    // Replace the placeholder with the provided text
    return templatePrompt.replace(templateTextInput, textInput);
}

function promptNewsAt(textInput) {
    const prompt = getPrompt(templatePromptRelevanceaiV01, textInput);
    return prompt;
}

function promptPsyNews(textInput) {
    const prompt = getPrompt(templatePromptClaudePsyNews, textInput);
    return prompt;
}

// const textInput = "Here is the article text to summarize.";
// console.log(promptNewsAt(textInput));

module.exports = {
    promptNewsAt, promptPsyNews
};
