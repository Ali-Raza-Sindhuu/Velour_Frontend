-- Courier hand-off details captured when an order is fulfilled: which courier
-- branch took the parcel, when it was handed over, and the courier's
-- cash/booking receipt (uploaded file, stored as /uploads/<name>).
-- Existing shipments simply get NULL for all three.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS courier_branch VARCHAR(100) NULL AFTER courier_name,
  ADD COLUMN IF NOT EXISTS handover_at DATETIME NULL AFTER courier_branch,
  ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500) NULL AFTER handover_at;