const mysql = require("mysql2");
const { db, dbFreud } = require("./Connections.js");
const axios = require("axios");

async function insertIgnoreClient(clientId) {
  const sql = `
    INSERT IGNORE INTO datico.salebot_clients (client_id)
    VALUES (?)
    `;
  try {
    const [result] = await db.query(sql, clientId);
    //return 0 if customer ixists and 1 if customer has been entered.
    return result.affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function archiveVariables (clientId, webhookJson) {
  var sql = `
    INSERT INTO datico.salebot_archive (client_id, webhook)
    VALUES (?, ?)
  `;
  try {
    const result = await db.query(sql, [clientId, webhookJson]);
    return result[0].affectedRows;
  } catch (err) {
    // console.log(err);
    console.log(
      "error in archiveVariables. Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function updateBasics(id, email, phone) {
  var sql = `
    UPDATE datico.salebot_clients 
    SET email=?, phone=?
    WHERE client_id=?
    `;
  try {
    const [result] = await db.query(sql, [email, phone, id]);
    return result.affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function updateEmailPerClient(id, email) {
  var sql = `
    UPDATE datico.salebot_clients 
    SET email=? WHERE client_id=?
    `;
  try {
    const [result] = await db.query(sql, [email, id]);
    return result.affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function updatePhonePerClient(id, phone) {
  var sql = `
    UPDATE datico.salebot_clients 
    SET phone=? WHERE client_id=?
    `;
  try {
    const [result] = await db.query(sql, [phone, id]);
    return result.affectedRows;
  } catch (err) {
    console.log(err);
  }
}


async function updateTimestampPerClient(id, created_at) {
  var sql = `
    UPDATE datico.salebot_clients 
    SET updated=?
    WHERE client_id=?
    `;
  try {
    const [result] = await db.query(sql, [created_at, id]);
    return result.affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function updateVariable(id, variablesJson, checksum) {
  var sql = `
  UPDATE datico.salebot_clients 
  SET variables=?, variables_checksum=?
  WHERE client_id=?
  `;
  try {
    const result = await db.query(sql, [variablesJson, checksum, id]);
    return result[0].affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function getVariableChecksumPerClient(clientId) {
  var sql = `
    SELECT variables_checksum FROM datico.salebot_clients 
    WHERE client_id=?
  `;
  try {
    const result = await db.query(sql, clientId);
    const checksum = result[0][0].variables_checksum;
    // console.log("here",checksum);
    return checksum;
  } catch (err) {
    console.log(err);
  }
}

async function updateDataFromVariable(id) {
  var sql = `
    UPDATE datico.salebot_clients SET 
    name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.name')),
    last_name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.last_name')),
    full_name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.full_name')),
    client_type = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.client_type')),
    messenger = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.messenger')),
    platform_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.platform_id')),
    message_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.message_id')),
    main_client_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.main_client_id')),
    avatar = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client.avatar'))
    WHERE variables IS NOT NULL AND client_id=?;
  `;
  var sqlOutput = `
  SELECT name,  last_name, full_name, email, phone, client_type, messenger, platform_id, message_id, main_client_id, avatar 
  FROM datico.salebot_clients WHERE client_id=?;
`;
  try {
    const result = await db.query(sql, id);
    const resultOutput = await db.query(sqlOutput, id);
    console.log(resultOutput[0]);
    return result[0].affectedRows;
  } catch (err) {
    // console.log(err);
    console.log(
      "error in updateDataFromVariable for",
      id,
      ". Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function updateEmailFromVariable(id) {
  var sql = `
  UPDATE datico.salebot_clients
  SET email = platform_id
  WHERE client_id=? AND variables IS NOT NULL AND client_type = 14 and email is null;
  `;

  try {
    const result = await db.query(sql, id);
    return result[0].affectedRows;
  } catch (err) {
    // console.log(err);
    console.log(
      "error in updateEmailFromVariable for",
      id,
      ". Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function getGccData() {
  var sql = `
  SELECT client_id, main_client_id, email, phone, full_name, name, last_name
  FROM datico.salebot_clients;
  `;
  try {
    const result = await db.query(sql);
    return result[0]; // Return the first element of the array directly
  } catch (err) {
    // console.log(err);
    console.log(
      "error in getGccStartData. Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function getGccDataPerClient(clientId) {
  var sql = `
  SELECT main_client_id, email, phone, full_name, name, last_name
  FROM datico.salebot_clients
  WHERE client_id=?;
  `;
  try {
    const result = await db.query(sql, clientId);
    return result[0][0]; // Return the first element of the array directly
  } catch (err) {
    // console.log(err);
    console.log(
      "error in getGccStartData. Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}


async function getGccCandidatesPerInput(query) {
  var sql = `
  SELECT client_id, main_client_id, email, phone, full_name, name, last_name
  FROM datico.salebot_clients
  WHERE ${query};
  `;
  try {
    const result = await db.query(sql);
    return result[0]; 
  } catch (err) {
    // console.log(err);
    console.log(
      "error in getGccCandidatesPerInput. Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function storeGccData(id, email, phone, gccArray, gccKey) {
  const gccJsonString = JSON.stringify(gccArray); // Convert the array to a JSON string
  var sql = `
    UPDATE datico.salebot_clients 
    SET email=?, phone=?, gcc=?, gcc_key=?
    WHERE client_id=?
  `;
  try {
    const result = await db.query(sql, [email, phone, gccJsonString, gccKey, id]);
    return result[0].affectedRows;
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  insertIgnoreClient,
  archiveVariables,
  updateBasics,
  updateVariable,
  updateDataFromVariable,
  updateEmailFromVariable,
  getGccData,
  getGccDataPerClient,
  storeGccData,
  getVariableChecksumPerClient,
  getGccCandidatesPerInput,
  updateEmailPerClient,
  updatePhonePerClient,
  updateTimestampPerClient,
};
