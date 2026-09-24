import pool from "../../config/db.js";
import { withTransaction } from "../../utils/transaction.js";
import { computeFinalPrice } from "../../utils/discount.js";

export class CartService {
  // Get-or-create is a single atomic upsert: a first visit fires several
  // cart requests at once, and a plain "SELECT, then INSERT if missing" let
  // two of them both insert (one failing on the unique key). With
  // ON DUPLICATE KEY … LAST_INSERT_ID(id), the loser just gets the existing
  // cart's id. Relies on the unique keys on carts.guest_token and (from
  // migration 020) carts.user_id.
  static async getOrCreateGuestCart(guestToken) {
    if (!guestToken || guestToken.length > 100) throw new Error("A guest cart token is required");
    const [carts] = await pool.query("SELECT id FROM carts WHERE guest_token = ?", [guestToken]);
    if (carts.length) return carts[0].id;
    const [result] = await pool.query(
      "INSERT INTO carts (guest_token) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
      [guestToken]
    );
    return result.insertId;
  }

  static async getOrCreateUserCart(userId) {
    const [carts] = await pool.query("SELECT id FROM carts WHERE user_id = ?", [userId]);
    if (carts.length) return carts[0].id;
    const [result] = await pool.query(
      "INSERT INTO carts (user_id) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
      [userId]
    );
    return result.insertId;
  }

  static async getCartId(guestToken, userId) {
    if (userId) return this.getOrCreateUserCart(userId);
    return this.getOrCreateGuestCart(guestToken);
  }

  static async getCartItems(cartId) {
    const [items] = await pool.query(`
      SELECT ci.id, ci.quantity, ci.selected_size, ci.selected_color, p.id as product_id, p.name, p.slug, p.price, p.discount_type, p.discount_value, p.image_url,
             COALESCE(pv.stock_quantity, p.stock_quantity) AS stock_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON pv.product_id = ci.product_id AND pv.size_label = ci.selected_size AND pv.color_label = ci.selected_color
      WHERE ci.cart_id = ?
    `, [cartId]);
    // `price` becomes the price the customer actually pays (discount
    // applied) — the same number checkout will charge — with the original
    // kept as `original_price` so the UI can show a struck-through price.
    return items.map((item) => {
      const original = Number(item.price);
      const price = computeFinalPrice(original, item.discount_type, item.discount_value);
      return { ...item, original_price: original, price, has_discount: price < original };
    });
  }

  // Adding to the bag is one atomic upsert, then a check of the resulting
  // quantity — all in a transaction. Two quick "Add to bag" clicks used to
  // read the same old quantity and overwrite each other (or collide on the
  // unique (cart_id, product_id) key); now they're applied one after the
  // other. Adding doesn't reserve stock — checkout re-checks it under lock.
  static async addItem(cartId, productId, quantity = 1, selectedSize = "", selectedColor = "") {
    await withTransaction(async (connection) => {
      const [products] = await connection.query("SELECT name, sizes, colors, stock_quantity, status FROM products WHERE id = ?", [productId]);
      const product = products[0];
      if (!product || product.status !== "active") {
        throw Object.assign(new Error("This product is no longer available"), { status: 404 });
      }

      const allowedSizes = String(product.sizes || "").split(/[;,\n]/).map((value) => value.trim()).filter(Boolean);
      const allowedColors = String(product.colors || "").split(/[;,\n]/).map((value) => value.trim()).filter(Boolean);
      if (allowedSizes.length && !allowedSizes.includes(selectedSize)) {
        throw Object.assign(new Error("Choose an available size before adding this item"), { status: 400 });
      }
      if (allowedColors.length && !allowedColors.includes(selectedColor)) {
        throw Object.assign(new Error("Choose an available color before adding this item"), { status: 400 });
      }
      if (!allowedSizes.length && selectedSize || !allowedColors.length && selectedColor) {
        throw Object.assign(new Error("This product does not have that variant"), { status: 400 });
      }

      const [[variantCount]] = await connection.query("SELECT COUNT(*) AS count FROM product_variants WHERE product_id = ?", [productId]);
      let variantStock = null;
      if (Number(variantCount.count) > 0) {
        const [[variant]] = await connection.query(
          "SELECT stock_quantity FROM product_variants WHERE product_id = ? AND size_label = ? AND color_label = ? FOR UPDATE",
          [productId, selectedSize, selectedColor]
        );
        if (!variant) throw Object.assign(new Error("That size and color combination is not available"), { status: 409 });
        variantStock = Number(variant.stock_quantity);
      }

      await connection.query(
        `INSERT INTO cart_items (cart_id, product_id, selected_size, selected_color, quantity) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [cartId, productId, selectedSize, selectedColor, quantity]
      );
      const [[line]] = await connection.query(
        "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, productId]
      );
      let requested = Number(line.quantity);
      if (variantStock != null) {
        const [[variantLine]] = await connection.query(
          "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND selected_size = ? AND selected_color = ?",
          [cartId, productId, selectedSize, selectedColor]
        );
        requested = Number(variantLine.quantity);
      }
      const available = variantStock == null ? Number(product.stock_quantity) : variantStock;
      if (requested > available) {
        const message = available > 0
          ? "Only " + available + " of \"" + product.name + "\" in this variant are available"
          : "\"" + product.name + "\" in this variant is sold out";
        throw Object.assign(new Error(message), { status: 409 }); // rolls the upsert back
      }
    });
  }

  static async updateItem(cartId, itemId, quantity) {
    if (quantity <= 0) {
      await pool.query("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cartId]);
      return;
    }

    const [itemRows] = await pool.query("SELECT product_id, selected_size, selected_color FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cartId]);
    if (itemRows.length === 0) {
      const error = new Error("Item not found");
      error.status = 404;
      throw error;
    }

    const [[cartQuantity]] = await pool.query(
      "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND selected_size = ? AND selected_color = ? AND id <> ?",
      [cartId, itemRows[0].product_id, itemRows[0].selected_size, itemRows[0].selected_color, itemId]
    );
    const [[variantCount]] = await pool.query("SELECT COUNT(*) AS count FROM product_variants WHERE product_id = ?", [itemRows[0].product_id]);
    let available;
    if (Number(variantCount.count) > 0) {
      const [[variant]] = await pool.query(
        "SELECT stock_quantity FROM product_variants WHERE product_id = ? AND size_label = ? AND color_label = ?",
        [itemRows[0].product_id, itemRows[0].selected_size, itemRows[0].selected_color]
      );
      available = Number(variant?.stock_quantity || 0);
    } else {
      const [[product]] = await pool.query("SELECT stock_quantity FROM products WHERE id = ?", [itemRows[0].product_id]);
      available = Number(product?.stock_quantity || 0);
    }
    if (available < cartQuantity.quantity + quantity) {
      const error = new Error("Not enough stock");
      error.status = 400;
      throw error;
    }

    await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?", [quantity, itemId, cartId]);
  }

  static async removeItem(cartId, itemId) {
    await pool.query("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cartId]);
  }

  static async mergeGuestCartIntoUserCart(guestToken, userId) {
    if (!guestToken || !userId) return;

    const [guestCarts] = await pool.query("SELECT id FROM carts WHERE guest_token = ?", [guestToken]);
    if (guestCarts.length === 0) return; // No guest cart to merge
    const guestCartId = guestCarts[0].id;

    const userCartId = await this.getOrCreateUserCart(userId);

    if (guestCartId === userCartId) return; // Should not happen, but just in case

    // Get all items from guest cart
    const guestItems = await this.getCartItems(guestCartId);
    
    // Add each to user cart (handling duplicates via addItem logic or directly)
    for (const item of guestItems) {
      try {
        await this.addItem(userCartId, item.product_id, item.quantity, item.selected_size || "", item.selected_color || "");
      } catch (err) {
        // Ignore "Not enough stock" during merge if stock is short, just skip that item
        console.warn(`Could not merge item ${item.product_id}:`, err.message);
      }
    }

    // Delete the old guest cart
    await pool.query("DELETE FROM carts WHERE id = ?", [guestCartId]);
  }
}
