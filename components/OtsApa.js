require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const openAi = require("./OpenAiFunctions");
const db = require("../components/Databases/Database");

async function generateUrls() {
  const channel = ["politik", "wirtschaft", "chronik", "kultur"];
  const query = ["Russland", "Ukraine", "russisch"];
  const YourAppId = "9e9a9fd1a5994de2ce2a46e973dbf96d";

  for (let ch of channel) {
    for (let qr of query) {
      const url = `https://www.ots.at/api/liste?app=${YourAppId}&query=%28${qr}%29&channel=${ch}&inhalt=alle&von=1601314019&anz=10&sourcetype=OTS&format=json`;
      const fetch = await fetchAndStoreData(ch, url);
    //   console.log(ch, url);
    }
  }
}
generateUrls();

async function fetchAndStoreData(channel, url) {
  try {
    const response = await axios.get(url);
    const ergebnisse = response.data.ergebnisse;

    // Loop through each element in the ergebnisse array and log it
    for (const ergebnis of ergebnisse) {
      const SCHLUESSEL = ergebnis.SCHLUESSEL;
      const insert_affectedRows = await db.otsInsertIgnore(
        SCHLUESSEL,
        channel,
        ergebnis
      );
      if (insert_affectedRows == 1) {
        const create = await extractParams(ergebnis);
      } else {
        console.log("old post");
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}
// fetchAndStoreData();

async function extractParams(ergebnis_in) {
  var ergebnis = {
    LEAD: "In seiner Event-Reihe “Business Talk“ von C 3-Communications-Connecting-Consulting präsentiert Geschäftsführer Thomas Prantner Persönlichkeiten aus Politik, Wirtschaft, Medien und Gesellschaft und diskutiert mit ihnen über aktuelle Themen, ihre Pläne und Ziele.",
    ZEIT: "08:47:57",
    DATUM: "2023-06-07",
    TITEL:
      "NEOS-Chefin Beate Meinl-Reisinger im C 3- “Business Talk“: Harte Kritik an der Regierung",
    ANHANG: null,
    WEBLINK:
      "https://www.ots.at/presseaussendung/OTS_20230607_OTS0023/neos-chefin-beate-meinl-reisinger-im-c-3-business-talk-harte-kritik-an-der-regierung",
    EMITTENT: "PR:AG Ganster Communications GmbH",
    EMITTENTID: "19061",
    SCHLUESSEL: "OTS_20230607_OTS0023",
    ZEITSTEMPEL: "1686120477",
  };
  ergebnis = ergebnis_in;
  console.log("new post");
  const SCHLUESSEL = ergebnis.SCHLUESSEL;
  const WEBLINK = ergebnis.WEBLINK;
  const DATUM = ergebnis.DATUM;

  // Image
  let ANHANG = null;
  const inputANHANG = ergebnis.ANHANG;
  if (
    inputANHANG !== null &&
    inputANHANG.length > 0 &&
    inputANHANG[0].VORSCHAU &&
    inputANHANG[0].VORSCHAU.thumb
  ) {
    ANHANG = inputANHANG[0].VORSCHAU.thumb;
  }

  const TITEL = ergebnis.TITEL;
  const LEAD = ergebnis.LEAD;
  const EMITTENT = ergebnis.EMITTENT;

  //fetch text from article
  let TEXT = await fetchUrlText(WEBLINK);
  TEXT = TITEL.toUpperCase() + "\n\n" + TEXT;

  const update = await db.otsUpdateOriginal(
    SCHLUESSEL,
    DATUM,
    WEBLINK,
    ANHANG,
    TEXT
  );

  //   const TEXT_RU = await openAi.getRuTranslation(TEXT_DE);
  console.log(WEBLINK);
}
// extractParams("");

async function fetchUrlText(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;

    const $ = cheerio.load(html);
    const targetDOM = $("#maincontentstart");

    // Initialize the data object
    const data = {
      header: null,
      text: "",
    };

    // Extract header
    data.header = targetDOM.find('h1[itemprop="headline"]').text();

    // Extract text
    // Find all <p class="text"> elements that come after the h2 and before an h3
    let startedCollecting = false;
    targetDOM.children().each((index, element) => {
      if ($(element).is('h1[itemprop="headline"]')) {
        startedCollecting = true;
        return; // continue to the next iteration
      }

      if ($(element).is("h3") && startedCollecting) {
        startedCollecting = false;
      }

      if (startedCollecting) {
        if ($(element).is("p.text") || $(element).is("h2")) {
          let paragraphText = $(element)
            .text()
            .replace(/\s{2,}/g, " "); // Replace two or more spaces with a single space
          data.text += paragraphText + "\n\n"; // Append each paragraph with two new lines for clarity
        } else if ($(element).is("ul")) {
          $(element)
            .find("li")
            .each((liIndex, liElement) => {
              let listItemText = $(liElement)
                .text()
                .replace(/\s{2,}/g, " "); // Replace two or more spaces with a single space
              data.text += "- " + listItemText + "\n"; // Append each list item with a dash and a newline
            });
          data.text += "\n"; // Extra newline after each unordered list for clarity
        }
      }
    });

    // console.log(data);
    return data.text;
  } catch (error) {
    console.error("Error fetching or parsing the HTML:", error.message);
  }
}

module.exports = {
  fetchAndStoreData,
};
