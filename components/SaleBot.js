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
      // jsonData.main_client_id = '';
      delete jsonData.main_client_id;
    }
    if (
      jsonData.hasOwnProperty("message_id") &&
      jsonData.message_id === "NONE"
    ) {
      // jsonData.main_client_id = '';
      delete jsonData.message_id;
    }

    // if (jsonData.hasOwnProperty("phone")) {
    //   console.log("before: ",jsonData.phone);
    //   const phoneNumber = parsePhoneNumber(jsonData.phone);
    //   if (phoneNumber) {
    //     jsonData.phone =
    //       phoneNumber.countryCallingCode + phoneNumber.nationalNumber;
    //     console.log("after: ",jsonData.phone);
    //   } else {
    //     delete jsonData.phone;
    //   }
    // }

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

// Preparing part
async function execute() {
  const temporaryFilePath = path.join(
    __dirname,
    subfolder,
    "response_get_clients.json"
  );

  fs.readFile(temporaryFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the JSON file:", err);
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      const clients = jsonData.clients;

      // Log the "id" property for each client
      clients.forEach(async (client) => {
        // console.log(client.id);
        let insertedRows = await db.insertClient(
          client.id,
          client.client_type,
          client.platform_id,
          client.name,
          client.avatar
        );

        var email = "";
        var phone = "";

        // console.log('inserted: ',insertedRows);
        if (insertedRows === 1) {
          // New client, data is not normalized
          if (client.client_type === 6 || client.client_type === 14) {
            phone = client.client_type === 6 ? client.platform_id : phone; // WhatsApp
            email = client.client_type === 14 ? client.platform_id : email; // Email
            let updatedRow = await db.updateBasics(client.id, email, phone);
            // console.log(client.client_type, 'updated: ',updatedRow, client.id, email, phone);
          }
        }

        //store variables
        let variables = await getVariablesPerClient(client.id);
        console.log(variables);
      });
    } catch (err) {
      console.error("Error parsing JSON:", err);
    }
  });
}

// execute();

module.exports = {
  newWebHook,
};
