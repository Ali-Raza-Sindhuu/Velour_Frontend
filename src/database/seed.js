import pool from "./connection.js";
import { withTransaction } from "../utils/transaction.js";
import { InventoryService } from "../modules/inventory/inventory.service.js";

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;

const products = [
  { slug: "noir-oud-eau-de-parfum", title: "Noir Oud Eau de Parfum", price: 89.00, category_slug: "woody-oud", description: "A deep, refined blend of smoky oud, rose and warm amber for evenings that leave an impression.", img: image("photo-1541643600914-78b084683601") },
  { slug: "citrus-bloom-eau-de-parfum", title: "Citrus Bloom Eau de Parfum", price: 72.00, category_slug: "fresh-citrus", description: "Sparkling bergamot and neroli open into a soft floral heart with a clean musk finish.", img: image("photo-1615634260167-c8cdede054de") },
  { slug: "velvet-rose-extrait", title: "Velvet Rose Extrait", price: 105.00, category_slug: "floral", description: "An opulent rose fragrance enriched with saffron, raspberry and a luminous vanilla trail.", img: image("photo-1563170351-be82bc888aa4") },
  { slug: "amber-santal-eau-de-parfum", title: "Amber Santal Eau de Parfum", price: 95.00, category_slug: "woody-oud", description: "Golden amber, creamy sandalwood and cardamom create a quiet, enveloping signature.", img: image("photo-1585386959984-a41552231693") },
  { slug: "white-musk-eau-de-parfum", title: "White Musk Eau de Parfum", price: 68.00, category_slug: "fresh-citrus", description: "A skin-close composition of white musk, pear and soft iris with effortless everyday appeal.", img: image("photo-1557170334-a9632e77c6e4") },
  { slug: "midnight-vanilla-eau-de-parfum", title: "Midnight Vanilla Eau de Parfum", price: 78.00, category_slug: "amber-vanilla", description: "Rich Madagascar vanilla meets incense and patchouli in a smooth after-dark fragrance.", img: image("photo-1608528577891-eb055944f2e7") },
];

async function seed() {
  try {
    for (const p of products) {
      const [categories] = await pool.query("SELECT id FROM categories WHERE slug = ?", [p.category_slug]);
      const category_id = categories.length > 0 ? categories[0].id : null;
      
      // Existing products are left alone; new ones get their opening stock
      // through the stock card so the inventory ledger stays balanced.
      await withTransaction(async (connection) => {
        const [result] = await connection.query(
          "INSERT IGNORE INTO products (name, slug, description, price, stock_quantity, status, image_url, category_id) VALUES (?, ?, ?, ?, 0, 'active', ?, ?)",
          [p.title, p.slug, p.description, p.price, p.img, category_id]
        );
        if (result.affectedRows === 1) await InventoryService.opening(connection, result.insertId, 100, 0);
      });
    }
    console.log("Products seeded successfully.");
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    process.exit();
  }
}

seed();
