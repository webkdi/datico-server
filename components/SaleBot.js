const db = require("./Databases/SaleBotDb");
const crc32 = require("crc32");
const axios = require("axios");
require("dotenv").config();

const key = process.env.SB_KEY;
const baseUrl = "https://chatter.salebot.pro/api/";

async function enterClientFromWebhook(webhookBody) {
  const clientId = webhookBody.client.id;
  const variables = webhookBody.client.variables;
  const variablesJson = JSON.stringify(variables);
  // let variablesChecksum = calculateChecksum(variablesJson);
  let variablesChecksum = crc32(variablesJson).toString(16);
  //insert ignore client
  const insertedClient = await db.insertIgnoreClient(clientId);
  //update variable json
  const variablesChecksumOld = await db.getVariableChecksumPerClient(clientId);
  if (variablesChecksumOld != variablesChecksum) {
    // variables поменялись
    const archivedVariables = await db.archiveVariables(
      clientId,
      variablesJson
    );
    const updatedVariable = await db.updateVariable(
      clientId,
      variablesJson,
      variablesChecksum
    );
    const updateFromVariable = await db.updateDataFromVariable(clientId);
    console.log(clientId, insertedClient, updatedVariable, updateFromVariable);

    // find GCC and update
    const gccData = await db.getGccDataPerClient(clientId);
    const sqlQueryForGcc = objectToSqlWhere(gccData);
    const gccClientsWithData = await db.getGccCandidatesPerInput(
      sqlQueryForGcc
    );
    const gcc = await getGccPerClient(gccClientsWithData);
    console.log(gcc, "for", clientId);
    const uploadClientData = await storeVariablesForGcc();
    console.log("uploadClientData", uploadClientData, "for", clientId);
    return "data for " + clientId + " updated";
  } else {
    const returnText =
      "variables for " +
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

async function getGccPerClient(gccData) {
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
      data.gccKey = crc32(data.gcc).toString(16);
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
  await cleanDataByGCC(gccData);
  // console.log(gccData);

  // Loop through the gccData array and log the client_id for each entry
  for (const client of gccData) {
    let storeData = await db.storeGccData(
      client.client_id,
      client.email,
      client.phone,
      client.gcc,
      client.gccKey
    );
  }
  return "gcc done";

  // Find all objects where gcc contains client_id 226457257
  // const resultsAll = gccData.filter((data) => data.gcc && data.gcc.includes(227566079))
  // console.log(resultsAll);
  // const resultsMulti = gccData.filter((data) => data.gcc && data.gcc.length > 2);
  // console.log(resultsMulti);
  // const resultOne = gccData.filter((data) => data.client_id==226963878);
  // console.log(resultOne);

  // console.log(gccData);
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

async function storeVariablesForGcc(gccArray, email, phone) {
  const thisUrl = baseUrl + key + "/save_variables";

  const bodyData = {
    clients: gccArray,
    variables: {
      "client.phone": "${email}",
      "client.email": "${phone}",
    },
  };

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
  return sortedConnectedClients.filter(
    (group, index, self) =>
      index === self.findIndex((g) => g.some((id) => group.includes(id)))
  );
}

module.exports = {
  enterClientFromWebhook,
};
