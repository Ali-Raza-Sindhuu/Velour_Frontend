-- Remove the standalone "Collections" CMS page (added outside migrations,
-- directly in the live DB — there is no create/delete-page route in this
-- codebase). This does NOT touch the "collections" section that lives under
-- the "home" page (page_id = 'home'), which powers the Home page's
-- Collections section and stays as-is.
DELETE FROM cms_pages WHERE id IN ('collections', 'collection');

-- About page: make the trust-stat cards (AboutSection.jsx) and the
-- partner/trust bar (PartnerSection.jsx) editable from the Website Editor.
-- Icons stay code-defined (not practical to store as JSON); image/stat/label
-- and trust-bar copy are editable.
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('stats', 'about', 'Trust Stats', '{"cards": [
  {"id": 1, "image": "https://framerusercontent.com/images/pEBq80I4IeHuPWY6F4zlaCYPo.png?width=600&height=600", "stat": "10M+", "label": "Pieces worn daily"},
  {"id": 2, "image": "https://framerusercontent.com/images/gXeXEdJCGwcyaYKiWNSbF2Wf5Yg.jpeg?width=405&height=720", "stat": "98%", "label": "Customer Satisfaction"},
  {"id": 3, "image": "https://framerusercontent.com/images/nvGX8w2EmNhLJbIVjLMsGKTV4I.jpeg?width=640&height=640", "stat": "300+", "label": "Essential Styles"},
  {"id": 4, "image": "https://framerusercontent.com/images/k4gwIeU3rPPXIyxSMgWszrewfy8.png?width=600&height=452", "stat": "500K+", "label": "Community worldwide"}
]}'),
('partners', 'about', 'Partner / Trust Bar', '{"trustText": "Trusted by 1k+ customers", "rating": "4.9/5", "ratingColor": "#ff6a00", "avatars": "https://framerusercontent.com/images/xjBP37MgaLIT2MdXe0Kl896XmbM.png?width=80&height=80,https://framerusercontent.com/images/V6kvRnK4tvwVKtnM3SDW7g4T9I.png?width=80&height=80,https://framerusercontent.com/images/8Y1Vd6ysDPyE3ONSfgw125SCPw.png?width=80&height=80,https://framerusercontent.com/images/qL5xOqMFC6yF35qSRHaAWJGZQKU.png?width=80&height=80,https://framerusercontent.com/images/G8RDO1PQndTWIrwwR6NkSGjho.png?width=80&height=80"}');

-- Contact page: make the FAQ list (currently hardcoded in Contact.jsx) editable.
INSERT IGNORE INTO cms_sections (id, page_id, name, content) VALUES
('faqs', 'contact', 'FAQs', '{"faqs": [
  {"id": 1, "question": "How long does shipping take?", "answer": "Standard shipping takes 5–7 business days. Express shipping (2–3 days) is available at checkout."},
  {"id": 2, "question": "What is your return policy?", "answer": "We offer a 30-day hassle-free return policy. Items must be unworn and in original packaging."},
  {"id": 3, "question": "Do you ship internationally?", "answer": "Yes, we ship to over 40 countries. International delivery takes 10–14 business days."},
  {"id": 4, "question": "How do I choose a fragrance?", "answer": "Each product page lists its notes and fragrance family. Start with the family you usually enjoy, then sample on skin."},
  {"id": 5, "question": "Can I modify or cancel my order?", "answer": "Orders can be modified or cancelled within 12 hours of placement. Contact us immediately if needed."},
  {"id": 6, "question": "How should I store my perfume?", "answer": "Keep the bottle upright in a cool, dry place away from heat and direct sunlight."}
]}');
