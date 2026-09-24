import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { config } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await connection.query(`USE \`${config.db.database}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    // Dotfiles are never migrations. macOS writes an AppleDouble sidecar
    // (`._name.sql`) for a file's extended attributes when it is copied over
    // FTP/SMB or zipped by Finder, and those land in this directory looking
    // like real migrations — they sort first and their binary contents fail
    // as SQL, blocking every migration behind them.
    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql") && !f.startsWith("."))
      .sort();

    const [executed] = await connection.query("SELECT name FROM migrations");
    const executedNames = executed.map(e => e.name);

    for (const file of files) {
      if (!executedNames.includes(file)) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await connection.query(sql);
        await connection.query("INSERT INTO migrations (name) VALUES (?)", [file]);
        console.log(`Successfully applied: ${file}`);
      }
    }
    console.log("All migrations applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    // Without this the process still exits 0, so a deploy script (and anyone
    // reading the return code) sees a failed migration as a success.
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

const command = process.argv[2];
if (command === "migrate") {
  runMigrations();
}
