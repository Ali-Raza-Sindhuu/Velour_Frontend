-- Home page CMS sections were seeded (009_cms_tables.sql) with placeholder
-- rows that the frontend never reads ("featured" / "about") and were
-- missing the rows for sections the frontend actually renders
-- (new-arrivals, best-sellers, collections, fragrance-guide, reviews,
-- brand-film) — which is why the admin couldn't edit the video or
-- collections sections at all: their rows didn't exist.

-- Remove the unused placeholder sections from the Home page.
DELETE FROM cms_sections WHERE page_id = 'home' AND id IN ('featured', 'about');

-- Add the real Home sections with defaults matching what's already
-- hardcoded in the frontend, so nothing changes visually until an admin
-- edits them.
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('new-arrivals', 'home', 'New Arrivals', '{"badge": "New Arrivals", "heading": "New scents in our latest drop", "subtext": "", "ctaLabel": "Shop Now", "ctaLink": "/shops", "product_slugs": ""}'),
('best-sellers', 'home', 'Best Sellers', '{"badge": "Best Seller", "heading": "Our signature best-selling scents", "subtext": "", "ctaLabel": "Shop Now", "ctaLink": "/shops", "product_slugs": ""}'),
('collections', 'home', 'Collections', '{"badge": "Our Collections", "heading": "Fragrance collections made to be remembered", "subtext": "", "ctaLabel": "Shop all items", "ctaLink": "/shops", "cards": [
  {"images": "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85", "wearType": "Woody & Oud", "wearBadge": "New", "title1": "Deep, warm", "title2": "oud collection", "priceFrom": "$45.00", "priceTo": "$79.00", "reverse": false},
  {"images": "https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1000&q=85", "wearType": "Floral", "wearBadge": "New", "title1": "Radiant floral", "title2": "compositions", "priceFrom": "$35.00", "priceTo": "$150.00", "reverse": true},
  {"images": "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=1000&q=85", "wearType": "Fresh & Citrus", "wearBadge": "2026", "title1": "Bright everyday", "title2": "fresh scents", "priceFrom": "$25.00", "priceTo": "$90.00", "reverse": false}
]}'),
('fragrance-guide', 'home', 'Fragrance Guide', '{"badge": "What defines our scents", "heading": "Where scent meets memory", "subtext": "Thoughtful fragrance design blending memorable notes, balance and versatility for every kind of moment.", "cards": [
  {"id": 1, "title": "Everyday Freshness", "description": "Light, clean fragrances designed to feel effortless from morning through evening.", "style01": "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85"},
  {"id": 2, "title": "Modern Compositions", "description": "Contemporary notes balance brightness, depth and warmth for an expressive signature.", "style01": "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85"},
  {"id": 3, "title": "Effortless Layering", "description": "Notes unfold naturally from first spray to dry-down, creating an intuitive scent journey.", "style01": "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=1000&q=85"},
  {"id": 4, "title": "Daily Essentials", "description": "Essential scents to complement your daily rituals and memorable moments.", "style01": "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1557170334-a9632e77c6e4?auto=format&fit=crop&w=1000&q=85"},
  {"id": 5, "title": "Lasting Design", "description": "Thoughtful compositions focused on balance, longevity and real-life wearability.", "style01": "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1608528577891-eb055944f2e7?auto=format&fit=crop&w=1000&q=85"},
  {"id": 6, "title": "Clean Aesthetic", "description": "Refined fragrances that feel close to the skin and become unmistakably yours.", "style01": "https://images.unsplash.com/photo-1619994403073-2cec844b8e63?auto=format&fit=crop&w=1000&q=85", "style02": "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1000&q=85"}
]}'),
('reviews', 'home', 'Reviews', '{"badge": "Customer Reviews", "heading": "The voice of quality", "subtext": "Experience the difference through the words of customers who value premium fabrics and timeless design.", "reviews": [
  {"name": "James Carter", "role": "Creative Director", "avatar": "", "text": "The premium quality is truly unmatched. The fabrics feel incredibly premium and soft.", "rating": 4.9, "reviewCount": 1}
]}'),
('brand-film', 'home', 'Brand Film', '{"heading": "A fragrance for every memory", "subtext": "We create expressive, long-lasting scents from nuanced notes and treasured ingredients—made to become part of your signature.", "primaryLabel": "More About Us", "primaryLink": "/about", "secondaryLabel": "Contact Us", "secondaryLink": "/contact", "video_url": ""}');
