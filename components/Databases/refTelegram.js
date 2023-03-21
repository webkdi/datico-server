const mysql = require("mysql2");
const { db, dbFreud } = require("./Connections.js");
const axios = require("axios");

async function fbReportUpdate(update_id, type, file_path, message, page_id) {
  const sql = `
    UPDATE datico.serv_telegram
    SET type = '${type}', 
    file_path = '${file_path}', 
    message = '${message}',
    page_id = ${page_id}
    WHERE update_id = ${update_id};
    `;
  try {
    const [res] = await db.query(sql);
    console.log(`data for ${update_id} done with status: ${res.info}`);
    return res;
  } catch (err) {
    console.log(update_id, "error in INSERT IGNORE INTO datico.serv_telegram");
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

module.exports = {
  fbReportUpdate,
  fbReportLatestUpdate,
  fbReportClean,
  insertIgnore,
};
