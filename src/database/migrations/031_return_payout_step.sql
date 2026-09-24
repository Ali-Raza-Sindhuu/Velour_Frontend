-- Payout details are no longer collected upfront when the customer files a
-- return. Instead, once the parcel is received and inspected, an admin
-- explicitly requests where to send the refund — a new "awaiting_payout"
-- step between received and completed.
ALTER TABLE return_requests
  MODIFY status ENUM('requested', 'approved', 'rejected', 'shipped_back', 'received', 'awaiting_payout', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS payout_requested_at TIMESTAMP NULL AFTER received_at;