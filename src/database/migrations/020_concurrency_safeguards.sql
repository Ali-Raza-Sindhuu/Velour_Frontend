-- Concurrency & integrity safeguards.

-- 1) Idempotent checkout. The storefront sends an Idempotency-Key header with
--    each checkout attempt; the key is stored in the same transaction as the
--    order it created. A repeated request (double click, retry after a
--    dropped connection) finds the key and gets the original order back
--    instead of placing a second one. Keys are namespaced per customer
--    (`scope`) so one shopper's key can never reveal another's order.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  scope VARCHAR(120) NOT NULL,
  idem_key VARCHAR(100) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  response_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_idempotency_scope_key (scope, idem_key),
  KEY idx_idempotency_created (created_at)
);

-- 2) Stock can never go negative, whatever code path touches it. The app
--    already checks stock under a row lock; this is the database's own
--    last line of defence against overselling.
ALTER TABLE products ADD CONSTRAINT chk_products_stock_nonnegative CHECK (stock_quantity >= 0);

-- 3) One cart per signed-in customer. Without this, two simultaneous first
--    requests could each create a cart and split the customer's items.
--    (Guest carts are already unique by guest_token; NULL user_ids are
--    allowed to repeat.) Add the unique index first so the user_id foreign
--    key always has an index to use, then drop the old non-unique one.
ALTER TABLE carts ADD UNIQUE KEY uniq_carts_user (user_id);
ALTER TABLE carts DROP INDEX IF EXISTS user_id;
