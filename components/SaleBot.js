const db = require("./Databases/SaleBotDb");

const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const key = process.env.SB_KEY;
const baseUrl = "https://chatter.salebot.pro/api/";

// значение переменных для SaleBot client_type
const client_type_meanings = [
  { client_type: 0, meaning: "для вконтакте" },
  { client_type: 1, meaning: "для телеграмма" },
  { client_type: 2, meaning: "для вайбера" },
  { client_type: 3, meaning: "для фейсбука" },
  { client_type: 4, meaning: "для толкми" },
  { client_type: 5, meaning: "для онлайн-чата" },
  { client_type: 6, meaning: "в вотсапе" },
  { client_type: 7, meaning: "в авито" },
  { client_type: 8, meaning: "в одноклассниках" },
  { client_type: 10, meaning: "в инстаграм" },
  { client_type: 11, meaning: "Jivosite" },
  { client_type: 12, meaning: "Юла" },
  { client_type: 13, meaning: "Телефония" },
  { client_type: 14, meaning: "e-mail" },
];

async function newWebHook(clientId) {
  let lastUpdate = await db.insertClient(clientId);
  console.log(lastUpdate);
}

// тестовая часть
const subfolder = "jsons";

// тестовая часть
// Step 1: Make a call to the API and store the response
async function fetchAndStoreResponse() {
  try {
    const url = createUrl(baseUrl, key, "/subscribers");
    const response = await axios.get(url);
    const responseData = response.data;

    // Step 2: Store the response in a local JSON file
    const temporaryFilePath = path.join(
      __dirname,
      subfolder,
      "response_subscribers.json"
    );
    await fs.promises.writeFile(
      temporaryFilePath,
      JSON.stringify(responseData)
    );
    console.log("Response stored in response_subscribers.json");

    return responseData;
  } catch (error) {
    console.error("Error occurred during API call:", error);
    return null;
  }
}

// тестовая часть
// Step 3: Make a call to the API and store the response for get_clients
async function fetchAndStoreGetClientsResponse() {
  try {
    const url = createUrl(baseUrl, key, "/get_clients");
    const response = await axios.get(url);
    const responseData = response.data;

    // Step 4: Store the response in a local JSON file
    const temporaryFilePath = path.join(
      __dirname,
      subfolder,
      "response_get_clients.json"
    );
    await fs.promises.writeFile(
      temporaryFilePath,
      JSON.stringify(responseData)
    );
    console.log("Response stored in response_get_clients.json");

    return responseData;
  } catch (error) {
    console.error("Error occurred during API call:", error);
    return null;
  }
}

// тестовая часть
// Create the URL using key, base URL, and function part
function createUrl(baseUrl, key, functionPart) {
  return baseUrl + key + functionPart;
}

async function getVariablesPerClient(client_id) {
  const thisUrl = createUrl(
    baseUrl,
    key,
    "/get_variables?client_id=" + client_id.toString()
  );

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: thisUrl,
    headers: {
      Accept: "application/json",
    },
  };

  try {
    const response = await axios.request(config);
    let jsonData = response.data;
    if (
      jsonData.hasOwnProperty("main_client_id") &&
      jsonData.main_client_id === "NONE"
    ) {
      jsonData["deleted_main_client_id"] = jsonData["main_client_id"];
      // jsonData.main_client_id = '';
      delete jsonData.main_client_id;
    }
    if (
      jsonData.hasOwnProperty("message_id") &&
      jsonData.message_id === "NONE"
    ) {
      jsonData["deleted_message_id"] = jsonData["message_id"];
      delete jsonData.message_id;
    }

    const phoneRegex =
      /^(?:(?:\+|00)(?:\d{1,4}\s?-?)?)?\(?\d{1,4}\)?\s?-?\d{1,4}\s?-?\d{1,4}\s?-?\d{1,4}\s?-?\d{1,4}$/;
    if (jsonData.hasOwnProperty("phone") && !phoneRegex.test(jsonData.phone)) {
      console.log("phone", jsonData.phone, "did not pass regex check, deleted");
      jsonData["deleted_phone"] = jsonData["phone"];
      delete jsonData.phone;
    }

    let jsonString = JSON.stringify(jsonData);

    let updatedRows = await db.updateVariable(client_id, jsonString);
    return updatedRows;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getVariablesPerClient_start() {
  try {
    //227585686
    //226457257
    let variables = await getVariablesPerClient(228173160);
    console.log(variables);
  } catch (error) {
    console.error("Error occurred during example usage:", error);
  }
}
// getVariablesPerClient_start();

async function get_clients_list() {
  try {
    const url = createUrl(baseUrl, key, "/get_clients");
    const response = await axios.get(url);
    const responseData = response.data.clients;

    return responseData;
  } catch (error) {
    console.error("Error occurred during API call: get_clients_list");
    return null;
  }
}

async function getClientsFromSb(clientId) {
  const getClients = await get_clients_list();

  var idArray = Object.values(getClients).map((obj) => obj.id);
  if (clientId) {
    idArray = [clientId]; // Reset the idArray with a new array containing only clientId
  }
  for (const clientId of idArray) {
    try {
      let insertedRows = await db.insertClient(clientId);
      let variable = await getVariablesPerClient(clientId);
      let updateFromVariable = await db.updateDataFromVariable(clientId);
      let updateEmailFromVariable = await db.updateEmailFromVariable(clientId);
      console.log(
        clientId,
        insertedRows,
        variable,
        updateFromVariable,
        updateEmailFromVariable
      );
    } catch (error) {
      console.error("Error occurred in insert of", clientId);
    }
  }
}

function findConnectedClients(data) {
  //receives dataset
  // const databaseData = [
  //   { client_id: 1, main_client_id: 1, email: 'mail1@example.com', phone: '111-111-1111' },
  //   { client_id: 2, main_client_id: 1, email: null, phone: null },
  //   { client_id: 3, main_client_id: null, email: 'mail1@example.com', phone: '222-111-1111' },
  //   { client_id: 4, main_client_id: null, email: 'dasfsdaf@example.com', phone: '112-111-1111' },
  //   { client_id: 5, main_client_id: 2, email: null, phone: '112-111-1111' },
  //   { client_id: 6, main_client_id: null, email: null, phone: '111-111-1111' },
  //   { client_id: 7, main_client_id: null, email: null, phone: '114-111-1111' },
  //   { client_id: 8, main_client_id: null, email: null, phone: '114-111-1111' },
  // ];

  const connectedClients = [];

  function findConnected(client, group) {
    for (const item of data) {
      if (group.includes(item.client_id)) continue;

      if (
        item.main_client_id &&
        item.main_client_id === client.main_client_id
      ) {
        group.push(item.client_id);
        findConnected(item, group);
      } else if (item.email && item.email === client.email) {
        group.push(item.client_id);
        findConnected(item, group);
      } else if (item.phone && item.phone === client.phone) {
        group.push(item.client_id);
        findConnected(item, group);
      }
    }
  }

  for (const client of data) {
    const group = [client.client_id];
    findConnected(client, group);
    connectedClients.push(group);
  }

  const sortedConnectedClients = connectedClients.map((group) =>
    group.sort((a, b) => a - b)
  );
  return sortedConnectedClients.filter(
    (group, index, self) =>
      index === self.findIndex((g) => g.some((id) => group.includes(id)))
  );
}

async function getGcc() {
  const gccData = await db.getGccData();
  const gccLinks = findConnectedClients(gccData);

  // Create a map to store the gcc links for each client_id
  const gccMap = new Map();

  // Populate the gccMap with links
  for (const link of gccLinks) {
    for (const id of link) {
      if (!gccMap.has(id)) {
        gccMap.set(id, []);
      }
      gccMap.get(id).push(...link);
    }
  }

  // Add the gcc property in gccData based on the gccMap
  for (const data of gccData) {
    if (gccMap.has(data.client_id)) {
      data.gcc = gccMap
        .get(data.client_id)
        .filter((id, index, self) => self.indexOf(id) === index);
    }
  }

  function cleanDataByGCC(data) {
    // Step 1: Group data by gcc
    const groupedData = data.reduce((groups, entry) => {
      const gcc = entry.gcc.join(","); // Using join to get a unique key for gcc array
      groups[gcc] = groups[gcc] || [];
      groups[gcc].push(entry);
      return groups;
    }, {});

    // Step 2 and 3: Find non-null phone and email and populate entries within each group
    for (const group of Object.values(groupedData)) {
      let commonPhone = null;
      let commonEmail = null;

      for (const entry of group) {
        if (entry.phone !== null) {
          commonPhone = entry.phone;
        }
        if (entry.email !== null) {
          commonEmail = entry.email;
        }
      }

      for (const entry of group) {
        if (commonPhone !== null) {
          entry.phone = commonPhone;
        }
        if (commonEmail !== null) {
          entry.email = commonEmail;
        }
      }
    }

    // Return the cleaned data
    return data;
  }

  // await cleanDataByGCC(gccData);

  // Loop through the gccData array and log the client_id for each entry
  for (const client of gccData) {
    let storeData = await db.storeGccData(
      client.client_id,
      client.email,
      client.phone,
      client.gcc
    );
  }
  console.log("gcc done");

  // Find all objects where gcc contains client_id 226457257
  // const resultsAll = gccData.filter((data) => data.gcc && data.gcc.includes(227566079))
  // console.log(resultsAll);
  // const resultsMulti = gccData.filter((data) => data.gcc && data.gcc.length > 2);
  // console.log(resultsMulti);
  // const resultOne = gccData.filter((data) => data.client_id==226963878);
  // console.log(resultOne);

  // console.log(gccData);
}

async function run() {
  // runNow(227585686);
  let getClients = await getClientsFromSb();
  let doGcc = await getGcc();
}
// run();

module.exports = {
  newWebHook,
};
