import mysql from "mysql2/promise";
import { config } from "./src/config/env.js";
import fs from "fs";

async function run() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  await connection.query("DROP TABLE IF EXISTS cms_sections;");
  await connection.query("DROP TABLE IF EXISTS cms_pages;");
  await connection.query("DELETE FROM migrations WHERE name = '009_cms_tables.sql';");

  console.log("Dropped CMS tables.");
  process.exit(0);
}
run();
