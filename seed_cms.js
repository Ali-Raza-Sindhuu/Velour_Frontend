import pool from "./src/config/db.js";

async function run() {
  try {
    await pool.query(`
      INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES 
      ('new-arrivals', 'home', 'New Arrivals', '{"product_slugs": "french-tobacco, citrus-bloom-eau-de-parfum, velvet-rose-extrait"}'),
      ('best-sellers', 'home', 'Best Sellers', '{"product_slugs": "white-musk-eau-de-parfum, amber-santal-eau-de-parfum, midnight-vanilla-eau-de-parfum"}')
    `);
    console.log("Done");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
