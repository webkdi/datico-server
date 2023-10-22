const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/** Reads previously authorized credentials from the save file.  */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/** Serializes credentials to a file comptible with GoogleAUth.fromJSON */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/** Load or request or authorization to call APIs. */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// https://developers.google.com/people/api/rest/v1/people/searchContacts
async function findContactPerPhone(people, phoneNumber) {
  // phones with plus are not identified in Google API
  try {
    const response = await people.people.searchContacts({
      readMask: "emailAddresses,names,phoneNumbers,organizations,biographies",
      // readMask:
      //   "addresses,ageRanges,biographies,birthdays,calendarUrls,clientData,coverPhotos,emailAddresses,events,externalIds,genders,imClients,interests,locales,locations,memberships,metadata,miscKeywords,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,urls,userDefined",
      // query: "436605752835",
      query: phoneNumber,
    });

    // if (Object.keys(response.data).length === 0) {
    //   console.log("No entries");
    // } else {
    //   // console.log(response.data.results);
    //   response.data.results.forEach((person) => {
    //     console.log(person.person);
    //     console.log(
    //       `\nid: ${
    //         person.person.names?.[0]?.metadata?.source?.id || "N/A"
    //       }\nemail: ${
    //         person.person.emailAddresses?.[0]?.value || "N/A"
    //       }\nphone: ${person.person.phoneNumbers?.[0]?.value || "N/A"}\nname: ${
    //         person.person.names?.[0]?.unstructuredName || "N/A"
    //       }\nresource: ${person.person.resourceName}\nnotes: ${
    //         person.person.biographies?.[0]?.value || "N/A"
    //       }`
    //     );
    //   });
    // }

    return Object.keys(response.data).length;
  } catch (err) {
    console.error("Find Error", err);
  }
}

// Function to create a new contact
async function createContact(people, name, phoneNumber) {
  try {
    const contactToCreate = {
      names: [
        {
          unstructuredName: name,
        },
      ],
      phoneNumbers: [
        {
          value: phoneNumber,
          type: "Mobile",
        },
      ],
      // emailAddresses: [
      //   {
      //     value: "test@test.com",
      //   },
      // ],
      biographies: [
        {
          value: "Создан из SaleBot",
        },
      ],
    };

    const response = await people.people.createContact({
      resource: contactToCreate,
    });

    // console.log("Contact created successfully:", response.data);
    console.log(
      `->Contact created successfully for Name: ${response.data.names[0].displayName}, phone: ${response.data.phoneNumbers[0].value}`
    );
  } catch (err) {
    console.error("Create contact error", err);
  }
}

// generating random output number between 1 and 99 in string form "01" to "99"
function generateRandomName() {
  // Generate a random number between 1 and 99
  const randomNum = Math.floor(Math.random() * 99) + 1;

  // Format the number as a string with leading zeros if needed
  let randomNumString = randomNum < 10 ? `0${randomNum}` : `${randomNum}`;
  randomNumString = "@test" + randomNumString;

  return randomNumString;
}

// makes "+436601112233" out of "436605752835"
function formatPhoneNumber(phone) {
  let phoneFormatted;
  if (!phone.startsWith("+")) {
    phoneFormatted = "+" + phone;
  }
  return phoneFormatted;
}

function generateRandomPhoneNumber() {
  // Generate the first part of the phone number (fixed "43660")
  const firstPart = "43660";

  // Generate seven random digits for the remaining part of the phone number
  const randomDigits = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0");

  // Concatenate the two parts to create the complete phone number
  const phoneNumber = firstPart + randomDigits;

  return phoneNumber;
}

async function checkAndCreateContacts(arrayOfContacts) {
  //create a random contact list for testing, if input is empty
  let phonebook;
  if (!arrayOfContacts || arrayOfContacts.length === 0) {
    phonebook = [
      { name: generateRandomName(), phone: generateRandomPhoneNumber() },
      { name: generateRandomName(), phone: generateRandomPhoneNumber() },
    ];
    console.log("no contacts for checkAndCreateContacts");
    return;
  } else {
    phonebook = arrayOfContacts;
  }
  // console.log(phonebook);

  //login to google
  const auth = await authorize();
  const people = google.people({
    version: "v1",
    auth,
  });

  // Loop through the phonebook and log each entry

  let createContactCount = 0;
  for (const entry of phonebook) {
    if (createContactCount >= 2) {
      // break; // Stop the loop after 3 createContact calls
    }

    const name = entry.name;
    const phone = entry.phone;
    const phoneFormatted = formatPhoneNumber(entry.phone);
    const foundNr = await findContactPerPhone(people, phone);
    if (foundNr === 0) {
      console.log(
        `Nothing found for name: ${name}, Phone: ${phoneFormatted}, CREATE`
      );
      await createContact(people, name, phoneFormatted);
      createContactCount++; // Increment the counter
    } else {
      // await createContact(people, name, phoneFormatted);
      console.log(
        `Found name: ${name}, Phone: ${phoneFormatted}, SKIP AND NEXT`
      );
    }
  }
}

// checkAndCreateContacts();

module.exports = {
  checkAndCreateContacts,
};
