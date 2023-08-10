const db = require("./Databases/SaleBotDb");
const crc32 = require("crc32");
const axios = require("axios");
require("dotenv").config();

const key = process.env.SB_KEY;
const baseUrl = "https://chatter.salebot.pro/api/";

async function enterClientFromWebhook(webhookBody) {
  webhookBody = removeNullEntries(webhookBody);
  const clientId = webhookBody.client.id;
  const storeWebhookBody = JSON.stringify(webhookBody);

  ////////////
  //найти изменения, сохранить
  ////////////
  const clientObjectInWebhook = webhookBody.client;
  //убрать лишние данные, которые не относятся к основным, чтобы не мешать checksum (что поменялось?)
  delete clientObjectInWebhook.unread_count;
  delete clientObjectInWebhook.tag;
  const clientObjectJson = JSON.stringify(clientObjectInWebhook);
  const variablesChecksum = crc32(clientObjectJson).toString(16);

  //insert ignore client
  const insertedClient = await db.insertIgnoreClient(clientId);
  //обновить актуальность
  const updateTimestamp = new Date()
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  const updated = await db.updateTimestampPerClient(clientId, updateTimestamp);

  // создать критически важные переменные
  const client_type = clientObjectInWebhook.client_type;
  const recipient = clientObjectInWebhook.recepient;

  //update variable json
  const variablesChecksumOld = await db.getVariableChecksumPerClient(clientId);
  if (variablesChecksumOld != variablesChecksum) {
    // переменные поменялись

    // сохранить вебхук
    const archivedVariables = await db.archiveVariables(
      clientId,
      storeWebhookBody
    );

    // EMAIL. 14 - email bot
    let email;
    if (client_type == 14) {
      email = recipient;
    } else if (
      webhookBody &&
      webhookBody.client &&
      webhookBody.client.variables &&
      webhookBody.client.variables.email
    ) {
      email = webhookBody.client.variables.email;
    }
    if (email && email.trim() !== "") {
      const updateMail = await db.updateEmailPerClient(clientId, email);
    }

    // PHONE. 6  в вотсапе
    let phone;
    if (client_type == 6) {
      phone = recipient;
    } else if (
      webhookBody &&
      webhookBody.client &&
      webhookBody.client.variables &&
      webhookBody.client.variables.phone
    ) {
      phone = webhookBody.client.variables.phone;
    }
    if (phone && phone.trim() !== "") {
      const updatePhone = await db.updatePhonePerClient(clientId, phone);
    }

    const updatedVariable = await db.updateVariable(
      clientId,
      storeWebhookBody,
      variablesChecksum
    );
    const updateFromVariable = await db.updateDataFromVariable(clientId);
    console.log(clientId, insertedClient, updatedVariable, updateFromVariable);

    // find GCC and update
    const gcc = await getGccPerClient(clientId);
    console.log("gcc for", clientId, "with", gcc.gccKey, "calculated");

    const uploadClientData = await postGccVariablesToSalebot(
      gcc.gcc,
      gcc.gccNames,
      gcc.gccKey,
      gcc.email,
      gcc.phone
    );
    console.log("uploadClientData", uploadClientData, "for", clientId);

    return "data for " + clientId + " updated";
  } else {
    const returnText =
      "переменные for " +
      clientId +
      " unchanged: old " +
      variablesChecksumOld +
      " vs new " +
      variablesChecksum;
    console.log(returnText);
    return returnText;
  }

  // let doGcc = await getGcc();
}

async function getGccPerClient(clientId) {
  const gccData = await db.getGccDataPerClient(clientId);
  const sqlQueryForGcc = objectToSqlWhere(gccData);
  //gccClientsWithData: client_id, main_client_id, email, phone, full_name, name, last_name
  const gccClientsWithData = await db.getGccCandidatesPerInput(sqlQueryForGcc);

  const gccLinks = findConnectedClients(gccClientsWithData);

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

  // Add the gcc property in gccClientsWithData based on the gccMap
  for (const data of gccClientsWithData) {
    if (gccMap.has(data.client_id)) {
      data.gcc = gccMap
        .get(data.client_id)
        .filter((id, index, self) => self.indexOf(id) === index);
      data.gccKey = crc32(data.gcc).toString(16);
    }
  }

  function cleanDataByGCC(data) {
    let commonPhone = null;
    let commonEmail = null;

    // Step 1: Group data by gcc
    const groupedData = data.reduce((groups, entry) => {
      const gcc = entry.gcc.join(","); // Using join to get a unique key for gcc array
      groups[gcc] = groups[gcc] || [];
      groups[gcc].push(entry);
      return groups;
    }, {});

    // Step 2 and 3: Find non-null phone and email and populate entries within each group
    for (const group of Object.values(groupedData)) {
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
  await cleanDataByGCC(gccClientsWithData);

  //список имен
  const gccNamesArray = gccClientsWithData.map((client) => {
    if (client.name !== null && client.last_name !== null) {
      return `${client.name} ${client.last_name}`;
    } else if (client.name !== null) {
      return client.name;
    } else if (client.last_name !== null) {
      return client.last_name;
    } else {
      return ''; // If both name and last_name are null, return an empty string
    }
  });
  const gccNamesUnique = new Set(gccNamesArray);
  const gccNames = Array.from(gccNamesUnique).join(', ');
  for (const data of gccClientsWithData) {
      data.gccNames = gccNames;
  }

  // Loop through the gccClientsWithData array and log the client_id for each entry
  for (const client of gccClientsWithData) {
    let storeData = await db.storeGccData(
      client.client_id,
      client.email,
      client.phone,
      client.gcc,
      client.gccKey, 
      client.gccNames,
    );
  }

  //erster Kunde aus GCC hat alle relevanten Daten (GCC Liste, Mail, Phone)
  return gccClientsWithData[0];
}

function objectToSqlWhere(obj) {
  const conditions = [];

  for (const key in obj) {
    if (obj[key] !== null) {
      if (typeof obj[key] === "string") {
        conditions.push(`${key}='${obj[key]}'`);
      } else {
        conditions.push(`${key}=${obj[key]}`);
      }
    }
  }

  return conditions.join(" OR ");
}

async function postGccVariablesToSalebot(gccArray, gccNames, gccKey, email, phone) {

  const bodyData = {
    clients: gccArray,
    variables: {
      "client.gcc": gccKey,
      "client.gccNames": gccNames,
    },
  };

  if (
    typeof email === "string" &&
    (email ?? "" !== "") &&
    email !== "null" &&
    email !== null &&
    email !== undefined
  ) {
    bodyData.variables["client.email"] = email.trim();
  } else {
    bodyData.variables["client.email"] = null;
    console.log("update to SB: email is not strim or emtpy");
  }

  if (typeof phone === "number" && Number.isFinite(phone)) {
    bodyData.variables["client.phone"] = phone;
  } else {
    bodyData.variables["client.phone"] = null;
    console.log("update to SB: phone is not number or emtpy");
  }

  // Check if variables object is empty
  if (Object.keys(bodyData.variables).length === 0) {
    console.log("update to SB: No variables to save.");
    return; // Return early if variables object is empty
  }

  // const bodyData = {
  //   clients: gccArray,
  //   variables: {
  //     "client.phone": `${phone}`,
  //     "client.email": `${email}`,
  //   },
  // };
  // console.log(bodyData);

  // const bodyData = {
  //   clients: [
  //     226457257,
  //     226963878,
  //     227413149,
  //     227564886,
  //     227565045,
  //     227734101,
  //     227748964,
  //   ],
  //   variables: {
  //     "client.phone": "436605752835",
  //     "client.email": "dimitri.korenev@gmail.com",
  //   },
  // };

  const thisUrl = baseUrl + key + "/save_variables";

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: thisUrl,
    headers: {
      Accept: "application/json",
    },
    data: JSON.stringify(bodyData), // Convert the bodyData to a JSON string
  };
  try {
    const response = await axios.request(config);
    let jsonData = response.data;
    // console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
// postGccVariablesToSalebot([226457257,226963878],null);

function findConnectedClients(data) {
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

  const retunedData = sortedConnectedClients.filter(
    (group, index, self) =>
      index === self.findIndex((g) => g.some((id) => group.includes(id)))
  );

  // console.log("findConnectedClients:", data);
  // console.log("sortedConnectedClients:", sortedConnectedClients);
  // console.log("retunedData:", sortedConnectedClients);

  return retunedData;
}

function removeNullEntries(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeNullEntries);
  }

  const result = {};
  for (const key in obj) {
    const value = removeNullEntries(obj[key]);
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

async function manageAllClients() {
  const clientsData = await db.getGccData();
  const clientsAll = clientsData.map((obj) => obj.client_id);
  var countOfClients = clientsAll.length;

  // Map the clientsAll array to an array of Promises
  const promises = clientsAll.map(async (clientId) => {
    const gccData = await db.getGccDataPerClient(clientId);
    const sqlQueryForGcc = objectToSqlWhere(gccData);
    const gccClientsWithData = await db.getGccCandidatesPerInput(
      sqlQueryForGcc
    );
    const gcc = await getGccPerClient(gccClientsWithData);
    countOfClients--;
    console.log(
      "gcc for",
      clientId,
      "with",
      gcc.gccKey,
      "calculated.",
      countOfClients,
      "remains."
    );
    return clientId; // Return the clientId to keep track of calculated clients
  });

  // Wait for all Promises to resolve
  const calculatedClients = await Promise.all(promises);

  // clientsAll.forEach(async (clientId) => {
  //   const gccData = await db.getGccDataPerClient(clientId);
  //   const sqlQueryForGcc = objectToSqlWhere(gccData);
  //   const gccClientsWithData = await db.getGccCandidatesPerInput(
  //     sqlQueryForGcc
  //   );
  //   const gcc = await getGccPerClient(gccClientsWithData);
  //   countOfClients--;
  //   console.log("gcc for", clientId, "with", gcc.gccKey, "calculated.", countOfClients,"remains.");
  // });
  console.log("all clients calculated");
}
// manageAllClients();

//запускает callback, невидимый для клиента. Запускает отправку webhook. Полезная функция
async function triggerWebhook(clientId, message) {
  const thisUrl = baseUrl + key + "/callback";

  const bodyData = {
    client_id: clientId,
    message: message,
  };

  let config = {
    method: "post",
    url: thisUrl,
    headers: {
      Accept: "application/json",
    },
    data: JSON.stringify(bodyData), // Convert the bodyData to a JSON string
  };
  try {
    const response = await axios.request(config);
    let jsonData = response.data;
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error.response.data);
  }
}
// triggerWebhook(238741742,"trigger webhook");

async function triggerMailCallback(clientId, message) {
  const thisUrl = baseUrl + key + "/email_callback";

  const clientData = await db.getGccDataPerClient(clientId);

  const bodyData = {
    name: clientData.name,
    email: clientData.email,
    message: message,
  };

  let config = {
    method: "post",
    url: thisUrl,
    headers: {
      Accept: "application/json",
    },
    data: JSON.stringify(bodyData), // Convert the bodyData to a JSON string
  };
  try {
    const response = await axios.request(config);
    let jsonData = response.data;
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error.response.data);
  }
}
// triggerMailCallback(238382648, "trigger mail creation");

async function cleanEmail(clientId) {
  const gccArray = [clientId];
  const cleanMailInSb = await postGccVariablesToSalebot(gccArray, null, null);
  console.log(cleanMailInSb);
  const cleanMailInDb = await db.cleanEmailForClient(clientId);
  console.log(cleanMailInDb);
}
// cleanEmail(227086073);

module.exports = {
  enterClientFromWebhook,
};
