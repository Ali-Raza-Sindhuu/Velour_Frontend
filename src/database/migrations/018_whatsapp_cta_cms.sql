-- Global floating WhatsApp button, editable from Website Editor > Global Footer.
-- The number is deliberately blank by default so no link is published until
-- the store owner enters their own WhatsApp number (with country code).
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('whatsapp_cta', 'global_footer', 'WhatsApp CTA', JSON_OBJECT(
  'enabled', TRUE,
  'number', '',
  'label', 'Chat with us',
  'message', 'Hello! I have a question about ZeeScents.'
));
