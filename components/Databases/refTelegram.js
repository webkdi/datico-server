const mysql = require("mysql2");
const { db, dbFreud } = require("./Connections.js");
const axios = require("axios");

async function fbReportUpdate(update_id, type, file_path, message, messageFacebook, messageTwitter, page_id) {
  const sql = `
    UPDATE datico.serv_telegram
    SET type = '${type}', 
    file_path = '${file_path}', 
    message = '${message}',
    message_facebook = '${messageFacebook}',
    message_twitter = '${messageTwitter}',
    page_id = ${page_id}
    WHERE update_id = ${update_id};
    `;
  try {
    const [res] = await db.query(sql);
    console.log(`data for ${update_id} done with status: ${res.info}`);
    return res;
  } catch (err) {
    console.log("error in UPDATE datico.serv_telegram for",update_id, ". Code:", err.code, " sqlMessage:", err.sqlMessage);
    // console.log(err.code); // Log the 'code' property
    // console.log(err.sqlMessage); // Log the 'sqlMessage' property
  }
}

async function insertIgnore(update_id) {
  const sql = `
    INSERT IGNORE INTO datico.serv_telegram (update_id)
    VALUES (${update_id})
  `;
  // 27525383
  try {
    const [res] = await db.query(sql);
    return res.affectedRows;
  } catch (err) {
    console.log(update_id, "error in INSERT IGNORE INTO datico.serv_telegram");
    return 0;
  }
}

async function fbReportLatestUpdate() {
  const sql = `SELECT MAX(update_id) AS lastUpdateId FROM datico.serv_telegram`;
  try {
    const [res] = await db.query(sql);
    return res[0].lastUpdateId;
  } catch (err) {
    console.log(err);
  }
}

async function getMessagePerUpdate(update_id) {
  var sql = `
  SELECT * FROM datico.serv_telegram WHERE update_id=?;
  `;
  try {
    const result = await db.query(sql, update_id);
    return result[0]; // Return the first element of the array directly
  } catch (err) {
    // console.log(err);
    console.log(
      "error in getMessagePerUpdate. Code:",
      err.code,
      " sqlMessage:",
      err.sqlMessage
    );
  }
}

async function fbReportClean() {
  const sql = `
  DELETE FROM datico.serv_telegram
  WHERE update_id NOT IN (
    SELECT update_id FROM (
      SELECT update_id FROM datico.serv_telegram
      ORDER BY timestamp DESC
      LIMIT 50
    ) t
  )
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function insertJson(inputJson) {
  var sql = `
  INSERT INTO datico.serv_telegram_json (update_json)
  VALUES (?)
  `;
  try {
    const result = await db.query(sql, [inputJson]);
    return result[0].affectedRows;
  } catch (err) {
    console.log(err);
  }
}

async function getStoredJsonUpdateFromDb(id){
  var sql = `
  SELECT update_json FROM datico.serv_telegram_json
  WHERE id=?
  `;
  try {
    const result = await db.query(sql, id);
    return result[0][0].update_json;
  } catch (err) {
    console.log(err);
  }
}

async function cleanJsons () {
  var sql = `
  DELETE FROM datico.serv_telegram_json
  WHERE id NOT IN (
	SELECT id FROM (
      SELECT id FROM datico.serv_telegram_json
      ORDER BY timestamp DESC
      LIMIT 20
    ) t
  )
  `;
  try {
    const result = await db.query(sql);
    return result[0].affectedRows;
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  fbReportUpdate,
  fbReportLatestUpdate,
  fbReportClean,
  insertIgnore,
  insertJson,
  cleanJsons,
  getMessagePerUpdate,
  getStoredJsonUpdateFromDb,
};
