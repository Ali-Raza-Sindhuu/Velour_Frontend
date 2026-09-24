CREATE TABLE IF NOT EXISTS cms_pages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_sections (
  id VARCHAR(50) NOT NULL,
  page_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  content JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, page_id),
  FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE
);

-- Seed Initial Data
INSERT IGNORE INTO cms_pages (id, name) VALUES 
('home', 'Home Page'),
('shop', 'Shop / Catalog'),
('about', 'About Us'),
('contact', 'Contact'),
('global_footer', 'Global Footer');

INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES 
('hero', 'home', 'Hero Banner', '{"badge": "New Signature scents 2026", "heading": "A scent that stays with you", "subtext": "Discover fine fragrances layered with memorable notes and made for the moments that matter most.", "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=2200&q=90", "imagePosition": "center center", "textAlign": "left", "primaryLabel": "Explore Fragrances", "primaryLink": "/shops", "secondaryLabel": "Our Story", "secondaryLink": "/about"}'),
('featured', 'home', 'Featured Products', '{"title": "Featured Scents", "description": "Our most loved fragrances."}'),
('about', 'home', 'About Snippet', '{"text": "A brief introduction to ZeeScents."}'),

('header', 'shop', 'Shop Header', '{"title": "All Fragrances", "subtitle": "Browse our full collection."}'),
('promos', 'shop', 'Active Promos', '{"banner_text": "Free shipping on orders over 5000 PKR!"}'),

('story', 'about', 'Our Story', '{"title": "The ZeeScents Journey", "content": "How we started..."}'),
('team', 'about', 'Team', '{"title": "Meet the Team", "members": []}'),

('info', 'contact', 'Contact Info', '{"email": "support@zeescents.com", "phone": "+92 300 1234567"}'),
('form_text', 'contact', 'Form Text', '{"title": "Get in touch", "subtitle": "We would love to hear from you."}'),

('socials', 'global_footer', 'Social Links', '{"instagram": "https://instagram.com/zeescents", "facebook": "https://facebook.com/zeescents"}'),
('newsletter', 'global_footer', 'Newsletter Text', '{"title": "Join our newsletter", "subtitle": "Stay updated."}'),
('copyright', 'global_footer', 'Copyright info', '{"text": "© 2026 ZeeScents. All rights reserved."}');
