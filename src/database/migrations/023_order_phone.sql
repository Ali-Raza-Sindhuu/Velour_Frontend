-- Customer contact number captured at checkout, so the admin panel can show
-- it on the order and the store can call/WhatsApp about delivery.
ALTER TABLE orders ADD COLUMN phone VARCHAR(30) NULL AFTER email;

-- Orders placed since the checkout form started sending a phone already carry
-- it inside the saved shipping_address JSON — copy it into the new column.
UPDATE orders
SET phone = NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(shipping_address, '$.phone'))), '')
WHERE phone IS NULL AND JSON_VALID(shipping_address);
