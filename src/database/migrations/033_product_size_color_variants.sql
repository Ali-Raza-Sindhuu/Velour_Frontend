-- Clothing options live on the product; the selected options are snapshotted
-- on cart and order lines so different variants stay separate.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sizes TEXT NULL AFTER specifications,
  ADD COLUMN IF NOT EXISTS colors TEXT NULL AFTER sizes;

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS selected_size VARCHAR(60) NOT NULL DEFAULT '' AFTER product_id,
  ADD COLUMN IF NOT EXISTS selected_color VARCHAR(80) NOT NULL DEFAULT '' AFTER selected_size;

-- The initial cart key allowed one line per product. Replace it with a key
-- that also distinguishes selected size and color.
ALTER TABLE cart_items
  DROP INDEX IF EXISTS cart_id,
  ADD UNIQUE KEY uniq_cart_product_variant (cart_id, product_id, selected_size, selected_color);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS selected_size VARCHAR(60) NOT NULL DEFAULT '' AFTER product_id,
  ADD COLUMN IF NOT EXISTS selected_color VARCHAR(80) NOT NULL DEFAULT '' AFTER selected_size;
