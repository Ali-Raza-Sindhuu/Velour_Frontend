import { createSlice } from "@reduxjs/toolkit";
import { fetchCMSData, fetchStoreInfo } from "./siteThunks";

const STORAGE_KEY = "zeescents_site_settings";

export const defaultSiteSettings = {
  pages: [],
  storeInfo: { name: "", supportEmail: "", phone: "", address: "" },
  hero: {
    badge: "Technology, simplified",
    heading: "Upgrade the way you live",
    subtext: "Discover dependable tech, from everyday essentials to your next favourite device.",
    // No stock image here: whatever sits in the defaults is painted on a
    // first visit before the CMS answers, which showed a placeholder photo
    // and then swapped it. Pages pick a fallback only once the CMS has
    // confirmed there's no image of its own (see useCmsReady).
    image: "",
    imagePosition: "center center",
    textAlign: "left",
    overlay: 52,
    primaryLabel: "Shop all products",
    primaryLink: "/shops",
    secondaryLabel: "Our Story",
    secondaryLink: "/about",
    isVisible: true,
  },
  sections: [
    { id: "new-arrivals", label: "New Arrivals", isVisible: true },
    { id: "brand-film", label: "Brand Film", isVisible: true },
    { id: "best-sellers", label: "Best Sellers", isVisible: true },
    { id: "collections", label: "Product Collections", isVisible: true },
    { id: "reviews", label: "Customer Reviews", isVisible: true },
    { id: "fragrance-guide", label: "Buying Guide", isVisible: true },
  ],
};

// cmsStatus (not persisted): "loading" on a first visit until the CMS
// responds, "cached" when a previous visit's CMS content is already in
// localStorage, then "ready" (or "error" if the request failed).
const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...defaultSiteSettings, cmsStatus: "loading" };
    return {
      ...defaultSiteSettings,
      ...saved,
      cmsStatus: saved.pages?.length ? "cached" : "loading",
    };
  } catch {
    return { ...defaultSiteSettings, cmsStatus: "loading" };
  }
};

const saveSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable in private browsing mode.
  }
};

const siteSlice = createSlice({
  name: "site",
  initialState: loadSettings(),
  reducers: {
    updateHero: (state, action) => {
      state.hero = { ...state.hero, ...action.payload };
      saveSettings(state);
    },
    updateSection: (state, action) => {
      const { id, changes } = action.payload;
      const section = state.sections.find((item) => item.id === id);
      if (section) Object.assign(section, changes);
      saveSettings(state);
    },
    moveSection: (state, action) => {
      const { id, direction } = action.payload;
      const index = state.sections.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index >= 0 && nextIndex >= 0 && nextIndex < state.sections.length) {
        [state.sections[index], state.sections[nextIndex]] = [state.sections[nextIndex], state.sections[index]];
      }
      saveSettings(state);
    },
    resetSiteSettings: (state) => {
      saveSettings(defaultSiteSettings);
      return { ...defaultSiteSettings, cmsStatus: state.cmsStatus };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCMSData.rejected, (state) => {
      state.cmsStatus = "error";
    });
    builder.addCase(fetchCMSData.fulfilled, (state, action) => {
      const pages = action.payload;
      state.cmsStatus = "ready";

      // Keep the raw, unprocessed pages array too — "home" gets special
      // treatment below (its sections map onto fixed layout components),
      // but every other page (shop, about, contact, global_footer, ...)
      // is exposed as-is so any page can pull its own CMS content
      // generically via a "shop"/"about"/etc. lookup, without needing
      // bespoke reducer logic added here every time a new page is edited.
      state.pages = pages;

      const homePage = pages.find((p) => p.id === "home");
      if (homePage) {
        homePage.sections.forEach(s => {
          if (s.id === "hero" && s.content) {
            const content = typeof s.content === "string" ? JSON.parse(s.content) : s.content;
            // Start from the defaults, not the cached hero, so a value the
            // admin has since removed (or an old placeholder image saved in
            // a visitor's localStorage) can't linger.
            state.hero = { ...defaultSiteSettings.hero, ...content, isVisible: state.hero.isVisible ?? true, overlay: state.hero.overlay ?? 52 };
          } else if (s.content) {
            const localSection = state.sections.find(local => local.id === s.id);
            if (localSection) {
              const content = typeof s.content === "string" ? JSON.parse(s.content) : s.content;
              localSection.content = content;
            }
          }
        });

        // Reorder local sections based on the backend array order
        // (hero is usually excluded from the sortable list in the UI, but it might be there)
        const orderedSections = [];
        homePage.sections.forEach(backendSection => {
          if (backendSection.id === "hero") return; // hero is fixed at top
          const localSection = state.sections.find(local => local.id === backendSection.id);
          if (localSection) orderedSections.push(localSection);
        });
        
        // Append any local sections that weren't in the backend (just in case)
        state.sections.forEach(localSection => {
          if (!orderedSections.find(s => s.id === localSection.id)) {
            orderedSections.push(localSection);
          }
        });

        state.sections = orderedSections;
      }
      // Persist the fresh CMS data so it survives a page refresh correctly
      saveSettings({ hero: state.hero, sections: state.sections, pages: state.pages, storeInfo: state.storeInfo });
    });
    builder.addCase(fetchStoreInfo.fulfilled, (state, action) => {
      state.storeInfo = { ...state.storeInfo, ...action.payload };
      saveSettings({ hero: state.hero, sections: state.sections, pages: state.pages, storeInfo: state.storeInfo });
    });
  }
});

export const { updateHero, updateSection, moveSection, resetSiteSettings } = siteSlice.actions;
export default siteSlice.reducer;
