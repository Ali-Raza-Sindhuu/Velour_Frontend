-- Switches JazzCash/Easypaisa from a live hosted-checkout API redirect to a
-- manual transfer flow: customer sends money to the store's account and
-- submits a transaction ID (+ optional receipt screenshot) for admin review.
ALTER TABLE payments
  MODIFY status ENUM('pending', 'submitted', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) NULL AFTER gateway_reference,
  ADD COLUMN IF NOT EXISTS receipt_path VARCHAR(255) NULL AFTER transaction_id,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NULL AFTER receipt_path,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL AFTER submitted_at;
