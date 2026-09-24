-- Returns & exchanges: a customer request moves through
-- requested → approved → shipped_back → received → completed
-- (or rejected / cancelled / expired), with every step recorded in
-- return_events so the customer's timeline and emails always agree.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP NULL AFTER status,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL AFTER shipped_at,
  ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER total_amount;

-- The return window is measured from delivery; older delivered orders get
-- their last update as the best available delivery date.
UPDATE orders SET delivered_at = updated_at WHERE status = 'delivered' AND delivered_at IS NULL;
UPDATE orders SET shipped_at = updated_at WHERE status IN ('shipped', 'delivered') AND shipped_at IS NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE payments
  MODIFY method ENUM('cod', 'jazzcash', 'easypaisa', 'exchange') NOT NULL DEFAULT 'cod',
  MODIFY status ENUM('pending', 'processing', 'submitted', 'paid', 'partially_refunded', 'failed', 'refunded') NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS return_requests (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  rma_number VARCHAR(20) NULL UNIQUE,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(255) NOT NULL,
  status ENUM('requested', 'approved', 'rejected', 'shipped_back', 'received', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'requested',
  refund_method ENUM('original', 'store_credit') NOT NULL DEFAULT 'original',
  payout_details JSON NULL,
  customer_note TEXT NULL,
  decision_message TEXT NULL,
  internal_note TEXT NULL,
  return_courier VARCHAR(100) NULL,
  return_tracking VARCHAR(100) NULL,
  refund_amount DECIMAL(10, 2) NULL,
  store_credit_code VARCHAR(50) NULL,
  exchange_order_id BIGINT UNSIGNED NULL,
  access_token_hash CHAR(64) NOT NULL,
  reminder_sent_at TIMESTAMP NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  ship_by TIMESTAMP NULL,
  shipped_back_at TIMESTAMP NULL,
  received_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_returns_order (order_id),
  KEY idx_returns_status (status, ship_by),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (exchange_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  reason ENUM('changed_mind', 'damaged', 'leaking', 'wrong_item', 'not_as_described', 'other') NOT NULL,
  item_condition ENUM('sealed', 'opened') NOT NULL,
  resolution ENUM('refund', 'exchange') NOT NULL DEFAULT 'refund',
  exchange_product_id BIGINT UNSIGNED NULL,
  inspection ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  restock BOOLEAN NOT NULL DEFAULT TRUE,
  restocked BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_return_items_qty CHECK (quantity > 0),
  FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (exchange_product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS return_photos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  path VARCHAR(255) NOT NULL,
  FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS return_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  actor ENUM('customer', 'admin', 'system') NOT NULL,
  type VARCHAR(40) NOT NULL,
  message TEXT NULL,
  visible_to_customer BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_return_events_return (return_id, created_at),
  FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE CASCADE
);

-- One refund record per return: a return can never be refunded twice.
CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  return_id BIGINT UNSIGNED NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  method ENUM('jazzcash_api', 'manual_transfer', 'store_credit') NOT NULL,
  reference VARCHAR(120) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (return_id) REFERENCES return_requests(id) ON DELETE SET NULL
);

INSERT IGNORE INTO store_settings (setting_key, setting_value) VALUES (
  'returns',
  '{"windowDays":30,"shipByDays":14,"returnAddress":"","instructions":"Pack the item securely in its original box and write your return number (RMA) on the parcel.","storeCreditBonusPercent":0}'
);
