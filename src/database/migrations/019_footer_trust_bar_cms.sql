-- Footer reassurance strip, editable from Website Editor > Global Footer.
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('trust_bar', 'global_footer', 'Trust Bar', JSON_OBJECT(
  'trustPoints', JSON_ARRAY(
    JSON_OBJECT('icon', 'shipping', 'label', 'Free shipping over 5,000 PKR'),
    JSON_OBJECT('icon', 'returns', 'label', '30-day hassle-free returns'),
    JSON_OBJECT('icon', 'secure', 'label', 'Secure, encrypted checkout')
  )
));
