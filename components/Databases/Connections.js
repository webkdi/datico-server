require("dotenv").config();

const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_DATICO_USER,
  password: process.env.DB_DATICO_PASSWORD,
  database: process.env.DB_DATICO_DB,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
}).promise();

const dbFreud = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_FREUD_USER,
  password: process.env.DB_FREUD_PASSWORD,
  database: process.env.DB_FREUD_DB,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
}).promise();

module.exports = {
  db,
  dbFreud,
};