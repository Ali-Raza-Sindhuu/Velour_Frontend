-- Inventory & cash-flow ledgers.
--
-- Stock: products.stock_quantity now means "available to sell" and the new
-- reserved_quantity holds units promised to orders that haven't shipped.
-- On hand = available + reserved. Every change to either bucket is written
-- to inventory_movements, so a product's stock card explains its numbers.
--
-- Money: every rupee that actually moves (payment received, courier
-- remittance, courier fee, refund sent, supplier paid) is one row in
-- cash_entries, written in the same transaction as the event.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0 AFTER stock_quantity,
  ADD COLUMN IF NOT EXISTS avg_cost DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER reserved_quantity;
ALTER TABLE products ADD CONSTRAINT chk_products_reserved_nonnegative CHECK (reserved_quantity >= 0);

-- Cost of each unit when it shipped (cost of goods sold).
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12, 2) NULL AFTER price_at_purchase;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  type ENUM('opening', 'purchase', 'adjustment', 'cost_update', 'reserve', 'release', 'ship', 'unship', 'return_restock', 'return_scrap') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  available_change INT NOT NULL DEFAULT 0,
  reserved_change INT NOT NULL DEFAULT 0,
  available_after INT NOT NULL,
  reserved_after INT NOT NULL,
  unit_cost DECIMAL(12, 2) NULL,
  ref_type ENUM('order', 'return', 'purchase', 'adjustment', 'product') NULL,
  ref_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_movements_product (product_id, id),
  KEY idx_movements_ref (ref_type, ref_id),
  KEY idx_movements_type (type, created_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_purchases (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  supplier VARCHAR(150) NOT NULL,
  invoice_ref VARCHAR(100) NULL,
  purchased_at DATE NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMP NULL,
  paid_account ENUM('jazzcash', 'easypaisa', 'bank', 'cash') NULL,
  note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_purchases_date (purchased_at)
);

CREATE TABLE IF NOT EXISTS stock_purchase_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(12, 2) NOT NULL,
  CONSTRAINT chk_purchase_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_purchase_items_cost CHECK (unit_cost >= 0),
  FOREIGN KEY (purchase_id) REFERENCES stock_purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- A courier's payout for a batch of delivered COD orders.
CREATE TABLE IF NOT EXISTS cod_remittances (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  courier VARCHAR(60) NOT NULL,
  reference VARCHAR(120) NULL,
  received_at DATE NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  account ENUM('jazzcash', 'easypaisa', 'bank', 'cash') NOT NULL DEFAULT 'bank',
  note VARCHAR(500) NULL,
  is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payments
  MODIFY status ENUM('pending', 'processing', 'submitted', 'paid', 'partially_refunded', 'failed', 'refunded', 'refund_due') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS remittance_id BIGINT UNSIGNED NULL,
  ADD KEY IF NOT EXISTS idx_payments_remittance (remittance_id),
  ADD CONSTRAINT fk_payments_remittance FOREIGN KEY (remittance_id) REFERENCES cod_remittances(id) ON DELETE SET NULL;

-- A refund can now be owed (a paid order was cancelled) before it is sent.
ALTER TABLE refunds
  MODIFY method ENUM('jazzcash_api', 'manual_transfer', 'store_credit') NULL,
  ADD COLUMN IF NOT EXISTS status ENUM('due', 'completed') NOT NULL DEFAULT 'completed' AFTER method,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL AFTER created_at;
UPDATE refunds SET completed_at = created_at WHERE completed_at IS NULL AND status = 'completed';

CREATE TABLE IF NOT EXISTS cash_entries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type ENUM('sale_payment', 'cod_remittance', 'courier_fee', 'refund', 'purchase_payment') NOT NULL,
  direction ENUM('in', 'out') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  account ENUM('jazzcash', 'easypaisa', 'bank', 'cash') NOT NULL,
  ref_type ENUM('payment', 'remittance', 'refund', 'purchase') NOT NULL,
  ref_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  note VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cash_amount CHECK (amount >= 0),
  -- Each source event is posted once, however many times its code runs.
  UNIQUE KEY uniq_cash_source (ref_type, ref_id, type),
  KEY idx_cash_occurred (occurred_at),
  KEY idx_cash_order (order_id)
);

INSERT IGNORE INTO store_settings (setting_key, setting_value) VALUES ('inventory', '{"unpaidHoldMinutes":60,"lowStockThreshold":5}');

-- ─── Backfill ────────────────────────────────────────────────────────────────

-- Units held by orders that haven't shipped. stock_quantity already excludes
-- them (checkout used to subtract immediately), so it is already "available".
UPDATE products p
JOIN (
  SELECT oi.product_id, SUM(oi.quantity) AS qty
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('pending', 'processing')
  GROUP BY oi.product_id
) r ON r.product_id = p.id
SET p.reserved_quantity = r.qty;

INSERT INTO inventory_movements (product_id, type, quantity, available_change, reserved_change, available_after, reserved_after, unit_cost, ref_type, ref_id, note)
SELECT id, 'opening', stock_quantity + reserved_quantity, stock_quantity, reserved_quantity, stock_quantity, reserved_quantity, 0, 'product', id,
       'Opening balance when stock tracking started'
FROM products;

-- Money already received online.
INSERT IGNORE INTO cash_entries (occurred_at, type, direction, amount, account, ref_type, ref_id, order_id, note)
SELECT COALESCE(p.verified_at, p.updated_at), 'sale_payment', 'in', p.amount,
       IF(p.method = 'easypaisa', 'easypaisa', 'jazzcash'), 'payment', p.id, p.order_id, 'Recorded before cash tracking started'
FROM payments p
WHERE p.method IN ('jazzcash', 'easypaisa') AND p.status IN ('paid', 'partially_refunded', 'refunded') AND p.amount > 0;

-- Paid orders that were cancelled were marked "refunded" without a refund
-- record; give each one so the books balance.
INSERT INTO refunds (order_id, return_id, amount, method, status, reference, created_at, completed_at)
SELECT p.order_id, NULL, p.amount, 'manual_transfer', 'completed', 'LEGACY', p.updated_at, p.updated_at
FROM payments p JOIN orders o ON o.id = p.order_id
WHERE o.status = 'cancelled' AND p.status = 'refunded' AND p.method IN ('jazzcash', 'easypaisa') AND p.amount > 0
  AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = p.order_id);

INSERT IGNORE INTO cash_entries (occurred_at, type, direction, amount, account, ref_type, ref_id, order_id, note)
SELECT COALESCE(r.completed_at, r.created_at), 'refund', 'out', r.amount,
       IF(r.method = 'jazzcash_api', 'jazzcash', 'bank'), 'refund', r.id, r.order_id, 'Recorded before cash tracking started'
FROM refunds r
WHERE r.status = 'completed' AND r.method IN ('jazzcash_api', 'manual_transfer') AND r.amount > 0;

-- COD already delivered: treat it as settled by the courier, so the
-- receivable starts from zero and only new deliveries appear there.
INSERT INTO cod_remittances (courier, reference, received_at, gross_amount, fee_amount, net_amount, account, note, is_legacy)
SELECT 'Various', 'LEGACY', CURDATE(), SUM(p.amount), 0, SUM(p.amount), 'bank', 'COD delivered before cash tracking started', TRUE
FROM payments p JOIN orders o ON o.id = p.order_id
WHERE p.method = 'cod' AND o.status = 'delivered' AND p.status IN ('paid', 'partially_refunded', 'refunded')
HAVING COUNT(*) > 0;

SET @legacy_remittance := (SELECT id FROM cod_remittances WHERE is_legacy = TRUE ORDER BY id LIMIT 1);

UPDATE payments p JOIN orders o ON o.id = p.order_id
SET p.remittance_id = @legacy_remittance
WHERE @legacy_remittance IS NOT NULL AND p.method = 'cod' AND o.status = 'delivered'
  AND p.status IN ('paid', 'partially_refunded', 'refunded') AND p.remittance_id IS NULL;

INSERT IGNORE INTO cash_entries (occurred_at, type, direction, amount, account, ref_type, ref_id, note)
SELECT created_at, 'cod_remittance', 'in', gross_amount, account, 'remittance', id, 'COD delivered before cash tracking started'
FROM cod_remittances WHERE is_legacy = TRUE AND gross_amount > 0;
