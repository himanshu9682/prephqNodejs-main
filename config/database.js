const mysql = require("mysql2");
require("dotenv").config();
//aLL COnnection details are stored in .env file and accessed here using process.env
const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  })
  .promise();

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(" Database connected successfully");
    conn.release();
  } catch (err) {
    console.error(" Database connection failed:", err.message);
  }
})();

module.exports = pool;
