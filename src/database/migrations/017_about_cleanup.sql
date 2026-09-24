-- The About page's admin editor listed a "Team" section (seeded in
-- 009_cms_tables.sql as {"title": "Meet the Team", "members": []}) that
-- About.jsx / AboutSection.jsx never read — dead placeholder content with
-- no matching UI on the storefront. Remove it so the Website Editor only
-- shows sections that actually affect the live page.
DELETE FROM cms_sections WHERE page_id = 'about' AND id = 'team';

-- AboutSection.jsx's mission-statement block (the badge pill + headline
-- above the Trust Stats cards) was hardcoded and not editable at all.
-- Make it a real, editable section instead of the removed placeholder.
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('intro', 'about', 'Mission Statement', JSON_OBJECT(
  'badge', 'About ZeeScents',
  'heading', 'More than perfume — a commitment to memorable compositions, thoughtful ingredients and your personal scent journey.'
));
