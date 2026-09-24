-- cms_sections.sort_order was first added by the one-off add_sort.js script,
-- so a fresh database never had it and 021_home_section_order failed.
-- IF NOT EXISTS keeps this a no-op where the script already ran.
ALTER TABLE cms_sections ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
