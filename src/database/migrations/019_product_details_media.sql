ALTER TABLE products
  ADD COLUMN specifications TEXT NULL AFTER description,
  ADD COLUMN video_url VARCHAR(500) NULL AFTER specifications;
