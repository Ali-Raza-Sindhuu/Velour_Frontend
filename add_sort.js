import pool from "./src/config/db.js";

async function run() {
  try {
    await pool.query(`ALTER TABLE cms_sections ADD COLUMN sort_order INT DEFAULT 0`);
    console.log("Added sort_order");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') console.log("Column already exists");
    else console.error(err);
  } finally {
    process.exit();
  }
}
run();
