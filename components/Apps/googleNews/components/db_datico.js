require("dotenv").config();

const mysql = require("mysql2");

const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_DATICO_USER,
    password: process.env.DB_DATICO_PASSWORD,
    database: process.env.DB_DATICO_DB,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
  })
  .promise();

async function insertIgnoreguid(guid) {
  const sql = `
    INSERT IGNORE INTO datico.news_google (guid)
    VALUES (?)
    `;
  const values = [guid];
  try {
    const [result] = await pool.execute(sql, values);
    return result.affectedRows;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function cleanNewsTable () {
  const sql = `
  DELETE FROM datico.news_google 
  WHERE main_url = '' AND timestamp < NOW() - INTERVAL 1 DAY;
  `;
  try {
    const [result] = await pool.execute(sql);
    return result.affectedRows;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function updateArticle(article) {

  const guid = article.guid;
  const images = article.images;
  const texts = article.texts;
  const links = article.links;
  var titles = article.titles;
  const pubDate = article.pubDate;
  const rusArticle = article.rusArticle;
  const rusShort = article.rusShort;
  const main_url = article.links[0];
  const main_image = article.images[0];

  // titles = typeof titles === 'string' ? titles : JSON.stringify(titles);

  const sql = `
  UPDATE datico.news_google SET 
  images = ?,
  texts = ?, 
  links = ?, 
  titles = ?, 
  pubDate = ?, 
  rus_text = ?, 
  rus_summary = ?,
  main_url = ?, 
  main_image = ?
  WHERE guid = ?;
  `;
  const values = [images, texts, links, titles, pubDate, rusArticle, rusShort, main_url, main_image, guid];
  try {
    const [result] = await pool.execute(sql, values);
    return result.affectedRows;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function getNewsMngt () {
  const sql = `
  SELECT * FROM datico.news_google_mng
  ;`;
  try {
    const [result] = await pool.execute(sql);
    return result;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function updateNewsMngt (crimeCounter) {
  const sql = `
  UPDATE datico.news_google_mng SET shareCrime = ?
  ;`;
  const values = [crimeCounter];
  try {
    const [result] = await pool.execute(sql, values);
    return result;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function getLatestPostTitles() {
  const sql = `
  SELECT titles FROM datico.news_google
  WHERE rus_summary <> ''
  ORDER BY timestamp DESC
  LIMIT 10;
  ;`;
  try {
    const [result] = await pool.execute(sql);
    return result;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

async function getRelevanceaiUrls() {
  const sql = `
  SELECT * FROM datico.news_google_relevanceai
  ;`;
  try {
    const [result] = await pool.execute(sql);
    return result;
  } catch (error) {
    console.log(error.sqlMessage);
    return 0;
  }
}

module.exports = {
  insertIgnoreguid,
  updateArticle,
  cleanNewsTable,
  getNewsMngt,
  updateNewsMngt,
  getLatestPostTitles,
  getRelevanceaiUrls,
};
