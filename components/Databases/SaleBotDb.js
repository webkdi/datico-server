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

async function archiveVariables (clientId, variablesJson) {
  // const jsonString = JSON.stringify(variablesJson); // Convert the array to a JSON string
  var sql = `
    INSERT INTO datico.salebot_archive (client_id, variables)
    VALUES (?, ?)
  `;
  try {
    const result = await db.query(sql, [clientId, variablesJson]);
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
    name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.name')),
    last_name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.last_name')),
    full_name = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.full_name')),
    email = LCASE(JSON_UNQUOTE(JSON_EXTRACT(variables, '$.email'))),
    phone = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.phone')),
    client_type = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.client_type')),
    messenger = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.messenger')),
    platform_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.platform_id')),
    message_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.message_id')),
    main_client_id = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.main_client_id')),
    date_of_creation = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.date_of_creation')),
    date_of_creation = DATE_FORMAT(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(variables, '$.date_of_creation')), '%d.%m.%Y'), '%Y-%m-%d'),
    time_of_creation = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.time_of_creation')),
    avatar = JSON_UNQUOTE(JSON_EXTRACT(variables, '$.avatar'))
    WHERE variables IS NOT NULL AND client_id=?;
  `;

  try {
    const result = await db.query(sql, id);
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
};
