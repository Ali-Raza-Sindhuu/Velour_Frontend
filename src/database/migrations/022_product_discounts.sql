-- Per-product discount, set by the admin on any product. NULL discount_type
-- means "no discount" (the default for every existing product).
ALTER TABLE products
  ADD COLUMN discount_type ENUM('percentage', 'fixed') NULL DEFAULT NULL AFTER price,
  ADD COLUMN discount_value DECIMAL(10, 2) NULL DEFAULT NULL AFTER discount_type;
