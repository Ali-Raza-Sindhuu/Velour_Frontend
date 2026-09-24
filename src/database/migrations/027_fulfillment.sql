-- Fulfillment: an order is confirmed, then fulfilled with a shipment
-- (courier + tracking), then delivered. Every step is written to
-- order_events, the order's timeline for staff and customer.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL AFTER status;

UPDATE orders SET confirmed_at = COALESCE(shipped_at, updated_at)
WHERE status IN ('processing', 'shipped', 'delivered') AND confirmed_at IS NULL;

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(500) NULL AFTER courier_name,
  ADD COLUMN IF NOT EXISTS note VARCHAR(500) NULL AFTER tracking_url,
  ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN NOT NULL DEFAULT FALSE AFTER note,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP NULL AFTER customer_notified,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL AFTER shipped_at;

CREATE TABLE IF NOT EXISTS order_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  actor ENUM('customer', 'admin', 'system') NOT NULL,
  type VARCHAR(40) NOT NULL,
  message TEXT NULL,
  visible_to_customer BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_events_order (order_id, created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Give existing orders a timeline built from what we already know.
INSERT INTO order_events (order_id, actor, type, message, created_at)
SELECT id, 'customer', 'placed', 'Order placed.', created_at FROM orders;
INSERT INTO order_events (order_id, actor, type, message, created_at)
SELECT id, 'admin', 'confirmed', 'Order confirmed.', confirmed_at FROM orders WHERE confirmed_at IS NOT NULL;
INSERT INTO order_events (order_id, actor, type, message, created_at)
SELECT id, 'admin', 'fulfilled', 'Order shipped.', shipped_at FROM orders WHERE shipped_at IS NOT NULL;
INSERT INTO order_events (order_id, actor, type, message, created_at)
SELECT id, 'admin', 'delivered', 'Order delivered.', delivered_at FROM orders WHERE delivered_at IS NOT NULL;
INSERT INTO order_events (order_id, actor, type, message, created_at)
SELECT id, 'admin', 'cancelled', 'Order cancelled.', updated_at FROM orders WHERE status = 'cancelled';
