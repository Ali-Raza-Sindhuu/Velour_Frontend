-- Make the Shop, About and Contact banners editable from the Website Editor.
--
-- The editor builds its form from the keys already stored in a section, and
-- these sections were seeded (009) with only a title/subtitle — so although
-- the storefront reads a banner image (and badge text) from them, the admin
-- never got a field to set one.
--
-- JSON_MERGE_PATCH(defaults, content) only ADDS missing keys: anything the
-- admin has already saved in `content` wins. Defaults match what the pages
-- display today, so nothing changes visually until the admin edits it.
-- Empty images keep the current fallback photo until one is uploaded.

UPDATE cms_sections
SET content = JSON_MERGE_PATCH(
  '{"image": "", "badgeLabel": "Shop", "badgeText": "Curated for you"}',
  content
)
WHERE page_id = 'shop' AND id = 'header';

UPDATE cms_sections
SET content = JSON_MERGE_PATCH(
  '{"image": "", "badgeLabel": "About Us", "badgeText": "Crafting Experiences"}',
  content
)
WHERE page_id = 'about' AND id = 'story';

UPDATE cms_sections
SET content = JSON_MERGE_PATCH(
  '{"image": "", "badgeLabel": "Hello", "badgeText": "We''d love to hear from you"}',
  content
)
WHERE page_id = 'contact' AND id = 'form_text';

-- The large photo beside the contact form, plus the small lines under each
-- contact detail.
UPDATE cms_sections
SET content = JSON_MERGE_PATCH(
  '{"image": "", "imageAlt": "Get in touch with ZeeScents", "emailSub": "We reply within 24 hours", "phoneSub": "Mon–Fri, 9am to 6pm", "addressSub": "By appointment only"}',
  content
)
WHERE page_id = 'contact' AND id = 'info';
