import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";

const normalizeList = (values) => [...new Set((Array.isArray(values) ? values : [])
  .map((value) => String(value || "").trim()).filter(Boolean))];

export class ProductOptionsService {
  static async getPublicOptions() {
    const [sizes] = await pool.query("SELECT option_value FROM product_option_values WHERE option_type = 'size' AND is_active = TRUE ORDER BY sort_order, option_value");
    const [colors] = await pool.query("SELECT option_value FROM product_option_values WHERE option_type = 'color' AND is_active = TRUE ORDER BY sort_order, option_value");
    const [sizeGuide] = await pool.query("SELECT * FROM size_guide_rows ORDER BY sort_order, size_label");
    return { sizes: sizes.map((row) => row.option_value), colors: colors.map((row) => row.option_value), sizeGuide };
  }

  static async getAdminOptions() {
    return this.getPublicOptions();
  }

  static async saveAdminOptions({ sizes, colors, sizeGuide = [] }) {
    const normalizedSizes = normalizeList(sizes);
    const normalizedColors = normalizeList(colors);
    const guide = Array.isArray(sizeGuide) ? sizeGuide : [];
    await withTransaction(async (connection) => {
      for (const [type, values] of [["size", normalizedSizes], ["color", normalizedColors]]) {
        await connection.query("UPDATE product_option_values SET is_active = FALSE WHERE option_type = ?", [type]);
        for (let index = 0; index < values.length; index += 1) {
          await connection.query(
            "INSERT INTO product_option_values (option_type, option_value, sort_order, is_active) VALUES (?, ?, ?, TRUE) ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = TRUE",
            [type, values[index], (index + 1) * 10]
          );
        }
      }

      const keptIds = [];
      for (let index = 0; index < guide.length; index += 1) {
        const row = guide[index];
        const label = String(row.size_label || "").trim();
        if (!label) continue;
        const values = [label, row.chest_cm || null, row.waist_cm || null, row.hip_cm || null, row.garment_length_cm || null, (index + 1) * 10];
        if (row.id) {
          await connection.query("UPDATE size_guide_rows SET size_label=?, chest_cm=?, waist_cm=?, hip_cm=?, garment_length_cm=?, sort_order=? WHERE id=?", [...values, row.id]);
          keptIds.push(Number(row.id));
        } else {
          const [result] = await connection.query("INSERT INTO size_guide_rows (size_label, chest_cm, waist_cm, hip_cm, garment_length_cm, sort_order) VALUES (?, ?, ?, ?, ?, ?)", values);
          keptIds.push(result.insertId);
        }
      }
      if (keptIds.length) await connection.query("DELETE FROM size_guide_rows WHERE id NOT IN (?)", [keptIds]);
      else await connection.query("DELETE FROM size_guide_rows");
    });
    return this.getPublicOptions();
  }
}
