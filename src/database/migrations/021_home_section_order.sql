-- Home page order: customer reviews now close the page (followed by the
-- scent trail), after the brand film, collections and product rows.
-- Every section gets its own sort_order — most were 0 before, which left
-- their order to the database's tie-breaking. The admin can still reorder
-- sections from the Website Editor afterwards.
UPDATE cms_sections SET sort_order = 0 WHERE page_id = 'home' AND id = 'hero';
UPDATE cms_sections SET sort_order = 1 WHERE page_id = 'home' AND id = 'brand-film';
UPDATE cms_sections SET sort_order = 2 WHERE page_id = 'home' AND id = 'collections';
UPDATE cms_sections SET sort_order = 3 WHERE page_id = 'home' AND id = 'fragrance-guide';
UPDATE cms_sections SET sort_order = 4 WHERE page_id = 'home' AND id = 'best-sellers';
UPDATE cms_sections SET sort_order = 5 WHERE page_id = 'home' AND id = 'new-arrivals';
UPDATE cms_sections SET sort_order = 6 WHERE page_id = 'home' AND id = 'reviews';
