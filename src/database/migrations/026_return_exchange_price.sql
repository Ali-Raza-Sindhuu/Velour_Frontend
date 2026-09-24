-- The exchange product's price is fixed when the customer requests it, so a
-- later price change can't alter what was agreed.
ALTER TABLE return_items
  ADD COLUMN IF NOT EXISTS exchange_unit_price DECIMAL(10, 2) NULL AFTER exchange_product_id;
