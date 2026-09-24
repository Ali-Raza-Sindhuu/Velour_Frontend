CREATE TABLE IF NOT EXISTS product_option_values (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  option_type ENUM('size', 'color') NOT NULL,
  option_value VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_product_option (option_type, option_value)
);

INSERT IGNORE INTO product_option_values (option_type, option_value, sort_order) VALUES
  ('size', 'XS', 10), ('size', 'S', 20), ('size', 'M', 30), ('size', 'L', 40), ('size', 'XL', 50), ('size', 'XXL', 60),
  ('color', 'Black', 10), ('color', 'White', 20), ('color', 'Cream', 30), ('color', 'Beige', 40), ('color', 'Navy', 50), ('color', 'Brown', 60);

CREATE TABLE IF NOT EXISTS size_guide_rows (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  size_label VARCHAR(60) NOT NULL UNIQUE,
  chest_cm DECIMAL(6,1) NULL,
  waist_cm DECIMAL(6,1) NULL,
  hip_cm DECIMAL(6,1) NULL,
  garment_length_cm DECIMAL(6,1) NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  size_label VARCHAR(60) NOT NULL DEFAULT '',
  color_label VARCHAR(80) NOT NULL DEFAULT '',
  stock_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_product_variant (product_id, size_label, color_label),
  KEY idx_product_variant_stock (product_id, stock_quantity),
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT chk_product_variant_stock CHECK (stock_quantity >= 0)
);

ALTER TABLE stock_purchase_items
  ADD COLUMN IF NOT EXISTS selected_size VARCHAR(60) NOT NULL DEFAULT '' AFTER product_id,
  ADD COLUMN IF NOT EXISTS selected_color VARCHAR(80) NOT NULL DEFAULT '' AFTER selected_size;
