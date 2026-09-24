import mysql from "mysql2/promise";
import { config } from "./env.js";

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
