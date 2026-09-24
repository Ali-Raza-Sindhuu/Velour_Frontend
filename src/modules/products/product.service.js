import pool from "../../config/db.js";
import { withDiscount, withDiscountList, normalizeDiscountInput } from "../../utils/discount.js";
import { InventoryService } from "../inventory/inventory.service.js";

// Attaches an `images` array to each product: [cover (products.image_url),
// ...extra gallery images from product_images, in sort order]. Kept as a
// separate pass (one extra query) rather than a JOIN so existing callers
// that only care about product.image_url are completely unaffected.
async function attachImages(products) {
  if (products.length === 0) return products;
  const ids = products.map((p) => p.id);
  const [images] = await pool.query(
    "SELECT product_id, image_url FROM product_images WHERE product_id IN (?) ORDER BY product_id, sort_order",
    [ids]
  );
  const byProduct = new Map();
  for (const img of images) {
    if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, []);
    byProduct.get(img.product_id).push(img.image_url);
  }
  return withDiscountList(products.map((p) => ({
    ...p,
    images: [p.image_url, ...(byProduct.get(p.id) || [])].filter(Boolean),
  })));
}

async function attachVariants(products) {
  if (!products.length) return products;
  const ids = products.map((product) => product.id);
  const [rows] = await pool.query(
    "SELECT product_id, size_label, color_label, stock_quantity FROM product_variants WHERE product_id IN (?) ORDER BY id",
    [ids]
  );
  const byProduct = new Map();
  for (const row of rows) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
    byProduct.get(row.product_id).push({ size: row.size_label, color: row.color_label, stock_quantity: Number(row.stock_quantity) });
  }
  return products.map((product) => ({ ...product, variants: byProduct.get(product.id) || [] }));
}

const normalizeVariants = (variants) => {
  if (!Array.isArray(variants)) return [];
  return variants.map((variant) => ({
    size: String(variant.size || "").trim(),
    color: String(variant.color || "").trim(),
    stock_quantity: Math.max(0, Math.trunc(Number(variant.stock_quantity) || 0)),
  })).filter((variant) => variant.size || variant.color);
};

async function replaceVariants(connection, productId, variants) {
  await connection.query("UPDATE product_variants SET stock_quantity = 0 WHERE product_id = ?", [productId]);
  if (!variants.length) return;
  for (const variant of variants) {
    await connection.query(
      "INSERT INTO product_variants (product_id, size_label, color_label, stock_quantity) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity)",
      [productId, variant.size, variant.color, variant.stock_quantity]
    );
  }
}

async function setVariantStockTotal(connection, id, variants, adminId) {
  const [rows] = await connection.query("SELECT stock_quantity, reserved_quantity, avg_cost FROM products WHERE id = ? FOR UPDATE", [id]);
  const product = rows[0];
  if (!product) return;
  const total = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  const delta = total - Number(product.stock_quantity);
  if (delta < 0 && -delta > Number(product.stock_quantity)) {
    throw Object.assign(new Error("Variant stock cannot be lower than stock already held for orders."), { status: 409 });
  }
  if (delta) {
    await connection.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND stock_quantity + ? >= 0", [delta, id, delta]);
    await connection.query(
      "INSERT INTO inventory_movements (product_id, type, quantity, available_change, reserved_change, available_after, reserved_after, unit_cost, ref_type, note, created_by) VALUES (?, 'adjustment', ?, ?, 0, ?, ?, ?, 'adjustment', 'Variant stock matrix updated', ?)",
      [id, Math.abs(delta), delta, Number(product.stock_quantity) + delta, Number(product.reserved_quantity), product.avg_cost, adminId]
    );
  }
}

// Replaces a product's extra gallery images (everything after the cover)
// inside an existing transaction. Called on both create and update — for
// create the product has none yet, so this is just an insert.
async function replaceGalleryImages(connection, productId, extraUrls) {
  await connection.query("DELETE FROM product_images WHERE product_id = ?", [productId]);
  if (!extraUrls.length) return;
  const values = extraUrls.map((url, i) => [productId, url, i]);
  await connection.query("INSERT INTO product_images (product_id, image_url, sort_order) VALUES ?", [values]);
}

// Only changed when the form sends it, so older clients leave it alone.
async function setReturnable(connection, id, value) {
  if (value === undefined || value === null || value === "") return;
  await connection.query("UPDATE products SET is_returnable = ? WHERE id = ?", [value === true || value === "true" || value === "1", id]);
}

// Cost price and reservations are for the admin only.
const publicProduct = ({ avg_cost, reserved_quantity, ...product }) => product;

const normalizeOptions = (value) => (Array.isArray(value) ? value : String(value || "").split(/[;,\n]/))
  .map((option) => String(option).trim()).filter(Boolean).filter((option, index, all) => all.indexOf(option) === index).join(", ");

export class ProductService {
  static async getPublicProducts({ search, category, min_price, max_price, page, limit, sort }) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = ["p.status = 'active'"];
    let params = [];

    if (search) {
      where.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where.push("c.slug = ?");
      params.push(category);
    }
    if (min_price) {
      where.push("p.price >= ?");
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      where.push("p.price <= ?");
      params.push(parseFloat(max_price));
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    let orderBy = "p.created_at DESC";
    if (sort === "price_asc") orderBy = "p.price ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC";
    else if (sort === "name") orderBy = "p.name ASC";

    const countQuery = `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    const dataQuery = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const [products] = await pool.query(dataQuery, [...params, limitNum, offset]);

    return {
      products: (await attachVariants(await attachImages(products))).map(publicProduct),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  static async getAllAdminProducts() {
    const [products] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id 
      ORDER BY p.created_at DESC
    `);
    return attachVariants(await attachImages(products));
  }

  static async getProductBySlug(slug) {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `, [slug]);
    
    if (products.length === 0) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }
    const [withVariants] = await attachVariants(await attachImages(products));
    return publicProduct(withVariants);
  }

  // Opening stock is recorded on the stock card with its unit cost; after
  // that, stock only changes through orders, purchases and adjustments.
  static async createProduct(data, adminId = null) {
    const { name, slug, description, specifications, video_url, price, stock_quantity, unit_cost, status, category_id, imageUrls = [] } = data;
    const sizes = normalizeOptions(data.sizes);
    const colors = normalizeOptions(data.colors);
    const variants = normalizeVariants(data.variants);
    const openingStock = variants.length ? variants.reduce((sum, variant) => sum + variant.stock_quantity, 0) : Math.max(0, parseInt(stock_quantity) || 0);
    const [cover = null, ...extra] = imageUrls;
    const { discount_type, discount_value } = normalizeDiscountInput(data);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        "INSERT INTO products (name, slug, description, specifications, sizes, colors, video_url, price, discount_type, discount_value, stock_quantity, status, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
        [name, slug, description || null, specifications || null, sizes || null, colors || null, video_url || null, price, discount_type, discount_value, status || 'active', cover, category_id || null]
      );
      await InventoryService.opening(connection, result.insertId, openingStock, Number(unit_cost) || 0, adminId);
      if (variants.length) await replaceVariants(connection, result.insertId, variants);
      await replaceGalleryImages(connection, result.insertId, extra);
      await setReturnable(connection, result.insertId, data.is_returnable);

      await connection.commit();

      const [rows] = await pool.query(
        `SELECT p.*, c.name AS category_name FROM products p
         LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
        [result.insertId]
      );
      const [withVariants] = await attachVariants(await attachImages(rows));
      return withVariants;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async updateProduct(id, data, adminId = null) {
    // Stock is deliberately not editable here — use Inventory → Adjust or a
    // purchase, so every change is on the stock card.
    const { name, slug, description, specifications, video_url, price, status, category_id, imageUrls } = data;
    const sizes = normalizeOptions(data.sizes);
    const colors = normalizeOptions(data.colors);
    const variants = normalizeVariants(data.variants);
    const { discount_type, discount_value } = normalizeDiscountInput(data);
    // imageUrls is only sent when the client actually touched the images —
    // an empty/absent list means "leave the current cover and gallery
    // alone" rather than wiping them out, so any caller that only updates
    // text fields (or predates the gallery feature) can't accidentally
    // blank out a product's images.
    const touchingImages = Array.isArray(imageUrls) && imageUrls.length > 0;
    const [cover, ...extra] = touchingImages ? imageUrls : [undefined];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (touchingImages) {
        await connection.query(
          "UPDATE products SET name=?, slug=?, description=?, specifications=?, sizes=?, colors=?, video_url=?, price=?, discount_type=?, discount_value=?, status=?, image_url=?, category_id=? WHERE id=?",
          [name, slug, description || null, specifications || null, sizes || null, colors || null, video_url || null, price, discount_type, discount_value, status, cover, category_id || null, id]
        );
        await replaceGalleryImages(connection, id, extra);
      } else {
        await connection.query(
          "UPDATE products SET name=?, slug=?, description=?, specifications=?, sizes=?, colors=?, video_url=?, price=?, discount_type=?, discount_value=?, status=?, category_id=? WHERE id=?",
          [name, slug, description || null, specifications || null, sizes || null, colors || null, video_url || null, price, discount_type, discount_value, status, category_id || null, id]
        );
      }
      await setReturnable(connection, id, data.is_returnable);
      if (Array.isArray(data.variants)) {
        if (variants.length) await setVariantStockTotal(connection, id, variants, adminId);
        await replaceVariants(connection, id, variants);
      }

      await connection.commit();

      const [rows] = await pool.query(
        `SELECT p.*, c.name AS category_name FROM products p
         LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        const error = new Error("Product not found");
        error.status = 404;
        throw error;
      }
      const [withVariants] = await attachVariants(await attachImages(rows));
      return withVariants;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // The product's currently saved video (null if none / no such product).
  static async getVideoUrl(id) {
    const [rows] = await pool.query("SELECT video_url FROM products WHERE id = ?", [id]);
    return rows[0]?.video_url || null;
  }

  static async deleteProduct(id) {
    // Deleting would cascade into customers' order lines and the stock card,
    // rewriting sales history — a product that has ever been ordered or
    // stocked through a purchase can only be archived.
    const [[history]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM order_items WHERE product_id = ?) AS orders,
              (SELECT COUNT(*) FROM stock_purchase_items WHERE product_id = ?) AS purchases`,
      [id, id]
    );
    if (history.orders > 0 || history.purchases > 0) {
      const error = new Error("This product has order or purchase history, so it can't be deleted. Set its status to Archived instead — it will disappear from the shop but its history stays intact.");
      error.status = 409;
      throw error;
    }
    // product_images rows are removed automatically via ON DELETE CASCADE.
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }
    return true;
  }
}
