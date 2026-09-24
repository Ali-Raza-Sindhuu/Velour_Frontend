-- Make the storefront Footer (components/layout/Footer.jsx) fully editable
-- from the admin Website Editor, the same way every other page's sections
-- already are. The footer was previously 100% hardcoded and never read the
-- 'global_footer' page rows seeded back in 009_cms_tables.sql.

-- 'socials' existed as a flat {instagram, facebook} object, which can't
-- grow past two platforms and doesn't match how the frontend renders icons.
-- Reshape it into an ordered, addable/removable list (same pattern as
-- Collections' "cards" or Contact's "faqs"), and refresh 'newsletter' /
-- 'copyright' with the copy that's currently hardcoded in Footer.jsx so
-- nothing on the live site changes until an admin edits it.
INSERT INTO cms_sections (id, page_id, name, content) VALUES
('socials', 'global_footer', 'Social Links', JSON_OBJECT('socials', JSON_ARRAY(
  JSON_OBJECT('platform', 'Instagram', 'url', 'https://instagram.com/zeescents'),
  JSON_OBJECT('platform', 'Twitter', 'url', 'https://twitter.com/zeescents'),
  JSON_OBJECT('platform', 'Facebook', 'url', 'https://facebook.com/zeescents'),
  JSON_OBJECT('platform', 'YouTube', 'url', 'https://youtube.com/@zeescents')
))),
('newsletter', 'global_footer', 'Newsletter Text', JSON_OBJECT(
  'title', 'Stay in the loop',
  'subtitle', 'Get first access to new drops, exclusive offers and stories from the studio.',
  'placeholder', 'your@email.com',
  'buttonLabel', 'Subscribe'
)),
('copyright', 'global_footer', 'Copyright', JSON_OBJECT('text', '© 2026 ZeeScents. All rights reserved.'))
ON DUPLICATE KEY UPDATE content = VALUES(content);

-- New: brand column (wordmark tagline + optional logo image override).
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('brand', 'global_footer', 'Brand', JSON_OBJECT(
  'tagline', 'Minimal luxury for those who dress with intention. Curated drops, timeless pieces.',
  'logo_image', ''
));
