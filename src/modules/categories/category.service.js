import pool from "../../config/db.js";

export class CategoryService {
  static async getAllCategories() {
    const [categories] = await pool.query(`
      SELECT c.*, COUNT(p.id) AS product_count 
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status <> 'archived'
      GROUP BY c.id ORDER BY c.name ASC
    `);
    return categories;
  }

  static async createCategory({ name, slug, description }) {
    const [result] = await pool.query(
      "INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)",
      [name, slug, description || null]
    );
    return { id: result.insertId, name, slug, description };
  }

  static async updateCategory(id, { name, slug, description }) {
    const [result] = await pool.query(
      "UPDATE categories SET name=?, slug=?, description=? WHERE id=?", 
      [name, slug, description || null, id]
    );
    if (result.affectedRows === 0) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
    }
    return { id, name, slug, description };
  }

  static async deleteCategory(id) {
    const [products] = await pool.query("SELECT COUNT(*) AS total FROM products WHERE category_id = ?", [id]);
    if (products[0].total > 0) {
        const error = new Error("Reassign products before deleting this category");
        error.status = 400;
        throw error;
    }
    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
        const error = new Error("Category not found");
        error.status = 404;
        throw error;
    }
    return true;
  }
}
