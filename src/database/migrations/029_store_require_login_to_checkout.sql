-- Adds store.requireLoginToCheckout (boolean, default false) to the "store" settings JSON.
-- Creates the row if missing; on existing rows only fills the key in when it is absent
-- (existing values always win in JSON_MERGE_PATCH's second argument).
INSERT INTO store_settings (setting_key, setting_value)
VALUES ('store', JSON_OBJECT('requireLoginToCheckout', false))
ON DUPLICATE KEY UPDATE
  setting_value = JSON_MERGE_PATCH(JSON_OBJECT('requireLoginToCheckout', false), setting_value);
