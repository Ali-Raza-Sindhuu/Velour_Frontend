-- JazzCash Mobile Wallet API: the customer approves the charge with their
-- MPIN on their phone and the server hears the result directly from JazzCash.
-- 'processing' marks a charge that has been sent and is awaiting that answer.
ALTER TABLE payments
  MODIFY status ENUM('pending', 'processing', 'submitted', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS gateway_message VARCHAR(255) NULL AFTER gateway_reference;
