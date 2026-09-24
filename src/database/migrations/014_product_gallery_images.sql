-- Up to 4 extra gallery images per product, alongside the existing
-- products.image_url column which remains the "cover" image — every
-- existing query/page that reads product.image_url directly (storefront
-- listing cards, cart, orders, wishlist, admin table, CMS product picker)
-- keeps working unchanged. This table only adds the additional images.
CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product (product_id, sort_order)
);
