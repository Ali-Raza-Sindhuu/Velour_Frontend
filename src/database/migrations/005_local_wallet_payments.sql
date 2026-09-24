ALTER TABLE payments
  MODIFY method ENUM('cod', 'jazzcash', 'easypaisa') NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_token CHAR(64) NULL UNIQUE AFTER status,
  ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(100) NULL AFTER payment_token;
