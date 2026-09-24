// Small helpers for reading CMS-driven content out of the "pages" array
// stored in state.site (see features/site/siteSlice.js). Every storefront
// page that wants editable copy/images should go through these instead of
// reaching into state.site.pages directly, so the lookup logic (missing
// page, missing section, string-vs-object content) only lives in one place.

import { useSelector } from "react-redux";

// True once CMS content is available — either fresh from the API, or cached
// from a previous visit. Until then pages should hold back editable copy and
// images instead of flashing placeholder defaults that are about to change.
// A failed request also counts as ready, so defaults show rather than nothing.
export const useCmsReady = () => useSelector((state) => state.site.cmsStatus !== "loading");

export const getCmsPage = (pages, pageId) => (pages || []).find((p) => p.id === pageId) || null;

export const getCmsSection = (pages, pageId, sectionId) => {
  const page = getCmsPage(pages, pageId);
  const section = page?.sections?.find((s) => s.id === sectionId);
  if (!section) return null;
  return typeof section.content === "string" ? JSON.parse(section.content) : section.content;
};
