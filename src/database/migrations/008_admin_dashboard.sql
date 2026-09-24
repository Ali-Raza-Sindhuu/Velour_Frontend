ALTER TABLE reviews ADD COLUMN status ENUM('pending', 'approved', 'flagged') NOT NULL DEFAULT 'approved' AFTER comment;

CREATE TABLE store_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
