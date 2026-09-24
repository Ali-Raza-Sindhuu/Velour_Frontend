import { useState, useEffect, useRef } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { FormField, TextInput } from "../components/ui/FormField";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Save,
  Image as ImageIcon,
  LayoutTemplate,
  Layers,
  CheckCircle2,
  GripVertical,
  UploadCloud,
  Loader2,
  Search,
  X,
  Package,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getCmsPages, updateCmsSection, reorderCmsSections, uploadCmsImage, getProducts } from "../api/adminService";
import { useToast } from "../components/ui/Toast";
import { resolveImg } from "../../../utils/resolveImg";

// Fields that get a purpose-built control instead of a generic text input.
const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];
const IMAGE_POSITION_OPTIONS = [
  { value: "center center", label: "Centered" },
  { value: "top center", label: "Top" },
  { value: "bottom center", label: "Bottom" },
  { value: "left center", label: "Left" },
  { value: "right center", label: "Right" },
];
const IMAGE_KEYS = new Set([
  "image",
  "image_url",
  "background_image",
  "banner_image",
  "hero_image"
]);
const LONG_TEXT_KEYS = new Set(["content", "description", "text", "subtext", "subtitle", "banner_text"]);
const ALIGN_KEYS = new Set(["textAlign", "align", "alignment"]);
const POSITION_KEYS = new Set(["imagePosition", "backgroundPosition"]);
const RANGE_KEYS = new Set(["overlay"]);
// Comma-separated list of product slugs â€” read this way by ProductSection.jsx
// and BestSeller.jsx (state.site.sections[id].content.product_slugs).
const PRODUCT_SLUGS_KEYS = new Set(["product_slugs"]);
// Repeatable object-array fields â€” Collections' `cards`, Style Guide's
// `cards`, and Reviews' `reviews` all live here. Sub-field type is inferred
// per item the same way top-level fields are (name-based heuristics below).
const LIST_KEYS = new Set(["cards", "reviews", "socials", "trustPoints", "faqs"]);
const LIST_ITEM_TEMPLATES = {
  faqs: { question: "", answer: "" },
};

// Seed skeletons so the field appears (with the site's current live content
// as a starting point) even before anything has been saved for a section.
const SECTION_LIST_SEEDS = {
  collections: {
    cards: [
      { images: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85", wearType: "Womenswear", wearBadge: "New", title1: "Everyday", title2: "essentials", priceFrom: "", priceTo: "", reverse: false },
      { images: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85", wearType: "Menswear", wearBadge: "New", title1: "Modern", title2: "classics", priceFrom: "", priceTo: "", reverse: true },
      { images: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85", wearType: "New Arrivals", wearBadge: "2026", title1: "New season", title2: "favourites", priceFrom: "", priceTo: "", reverse: false },
    ],
  },
  "fragrance-guide": {
    cards: [
      { id: 1, title: "Everyday Layers", description: "Lightweight layers that move easily through the day.", style01: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85", style02: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85" },
      { id: 2, title: "Modern Classics", description: "Versatile shapes designed to work across your wardrobe.", style01: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85", style02: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85" },
      { id: 3, title: "Easy Dressing", description: "Comfortable pieces with thoughtful details and an effortless fit.", style01: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85", style02: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85" },
    ],
  },
  reviews: { reviews: [] },
  "brand-film": {
    heading: "Clothing for the way you live",
    subtext: "We create thoughtful pieces that make getting dressed feel easy, personal and entirely your own.",
    primaryLabel: "More about Almina",
    primaryLink: "/about",
    secondaryLabel: "Get in touch",
    secondaryLink: "/contact",
    video_url: "",
  },
};

export const WebsiteEditor = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const { push } = useToast();

  const [draggedSectionId, setDraggedSectionId] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const fileInputRefs = useRef({});

  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    loadPages();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const list = await getProducts();
      setAllProducts(list || []);
    } catch (err) {
      push("Failed to load products.", "error");
    } finally {
      setProductsLoading(false);
    }
  };

  const loadPages = async () => {
  try {
    setLoading(true);

    const data = await getCmsPages();

    console.log("CMS Backend Response:", data);

    setPages(data);

    if (data.length > 0) {
      setSelectedPage(data[0]);

      if (data[0].sections.length > 0) {
        selectSection(data[0].sections[0]);
      }
    }
  } catch (err) {
    push("Failed to load CMS pages.", "error");
  } finally {
    setLoading(false);
  }
};

  const handlePageSelect = (page) => {
    setSelectedPage(page);
    if (page.sections.length > 0) {
      selectSection(page.sections[0]);
    } else {
      setSelectedSection(null);
    }
  };

  const selectSection = (section) => {
    setSelectedSection(section);
    try {
      const content = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
      const seed = SECTION_LIST_SEEDS[section.id];
      setFormData({ ...(seed || {}), ...(content || {}) });
    } catch (e) {
      setFormData(SECTION_LIST_SEEDS[section.id] || {});
    }
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (key, file) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const imageUrl = await uploadCmsImage(file);
      handleFieldChange(key, imageUrl);
    } catch (err) {
      push("Image upload failed. Try again.", "error");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    if (!selectedPage || !selectedSection) return;
    setIsSaving(true);
    try {
      await updateCmsSection(selectedPage.id, selectedSection.id, formData);
      setJustSaved(true);
      push("Section updated successfully.", "success");
      localStorage.removeItem("zeescents_site_settings");
      setTimeout(() => setJustSaved(false), 1800);

      setPages(prev => prev.map(p => {
        if (p.id !== selectedPage.id) return p;
        return {
          ...p,
          sections: p.sections.map(s => {
            if (s.id !== selectedSection.id) return s;
            return { ...s, content: formData };
          })
        };
      }));
    } catch (err) {
      push("Failed to save section.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragStart = (e, section) => {
    setDraggedSectionId(section.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetSection) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetSection.id) return;

    const sections = [...selectedPage.sections];
    const draggedIdx = sections.findIndex(s => s.id === draggedSectionId);
    const targetIdx = sections.findIndex(s => s.id === targetSection.id);

    const [draggedItem] = sections.splice(draggedIdx, 1);
    sections.splice(targetIdx, 0, draggedItem);

    // Update local immediately for snappy UI
    setPages(prev => prev.map(p => p.id === selectedPage.id ? { ...p, sections } : p));
    setSelectedPage(prev => ({ ...prev, sections }));
    setDraggedSectionId(null);

    try {
      const orderData = sections.map((s, i) => ({ id: s.id, sort_order: i }));
      await reorderCmsSections(selectedPage.id, orderData);
      localStorage.removeItem("zeescents_site_settings");
    } catch (err) {
      push("Failed to reorder sections.", "error");
      loadPages(); // rollback on failure
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Website Editor"
          description="Manage page content, sections, and global settings like the footer. Drag sections to reorder them."
        />
        <div className="flex flex-col overflow-hidden rounded-3xl border border-zs-beigeLine bg-white shadow-sm lg:h-[calc(100vh-14rem)] lg:flex-row">
          <div className="w-full shrink-0 border-b border-zs-beigeLine bg-zs-beige/30 p-4 lg:w-56 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-9 animate-pulse rounded-xl bg-zs-beige" />)}
            </div>
          </div>
          <div className="w-full shrink-0 border-b border-zs-beigeLine bg-zs-beige/15 p-4 lg:w-64 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-9 animate-pulse rounded-xl bg-zs-beige" />)}
            </div>
          </div>
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-zs-beige" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Website Editor"
        description="Manage page content, sections, and global settings like the footer. Drag sections to reorder them."
      />

      <div className="flex flex-col overflow-hidden rounded-3xl border border-zs-beigeLine bg-white shadow-sm lg:h-[calc(100vh-14rem)] lg:flex-row">
        {/* Pages column */}
        <div className="w-full shrink-0 overflow-y-auto border-b border-zs-beigeLine bg-zs-beige/30 p-4 lg:w-56 lg:border-b-0 lg:border-r">
          <h3 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">
            Pages
          </h3>
          <div className="flex flex-col gap-1">
            {pages.map((page) => {
              const active = selectedPage?.id === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handlePageSelect(page)}
                  className={
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold " +
                    (active
                      ? "border-zs-gold/30 bg-zs-gold/15 text-zs-gold"
                      : "border-transparent text-zs-charcoal/70 hover:border-zs-gold/40 hover:bg-zs-gold/5 hover:text-zs-charcoal")
                  }
                >
                  <LayoutTemplate size={16} className={active ? "shrink-0 text-zs-gold" : "shrink-0 text-zs-charcoal/40"} />
                  <span className="truncate">{page.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections column with drag & drop */}
        <div className="w-full shrink-0 overflow-y-auto border-b border-zs-beigeLine bg-zs-beige/15 p-4 lg:w-64 lg:border-b-0 lg:border-r">
          <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">
            {selectedPage?.name} sections
          </h3>
          <p className="mb-3 px-1 text-xs text-zs-charcoal/45">Drag to reorder.</p>
          <div className="flex flex-col gap-1">
            {selectedPage?.sections.map((section) => {
              const active = selectedSection?.id === section.id;
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, section)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section)}
                  className={
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors " +
                    (active
                      ? "border-zs-gold/30 bg-zs-gold/15 text-zs-gold"
                      : "border-transparent text-zs-charcoal/70 hover:border-zs-gold/40 hover:bg-zs-gold/5 hover:text-zs-charcoal")
                  }
                >
                  <button
                    type="button"
                    onClick={() => selectSection(section)}
                    className="flex flex-1 items-center gap-3 overflow-hidden text-left text-sm font-medium outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
                  >
                    <Layers size={16} className={active ? "shrink-0 text-zs-gold" : "shrink-0 text-zs-charcoal/35"} />
                    <span className="truncate">{section.name}</span>
                  </button>
                  <GripVertical size={14} className="shrink-0 cursor-move text-zs-charcoal/25" />
                </div>
              );
            })}
            {selectedPage && selectedPage.sections.length === 0 && (
              <p className="rounded-2xl bg-zs-beige/40 px-4 py-3 text-xs text-zs-charcoal/55">
                This page has no sections yet.
              </p>
            )}
          </div>
        </div>

        {/* Editor column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedSection ? (
            <>
              <header className="flex items-start gap-3.5 border-b border-zs-beigeLine px-6 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
                  <Layers size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">{selectedSection.name}</h2>
                  <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Part of {selectedPage?.name}</p>
                </div>
              </header>

              <form
                className="flex flex-1 flex-col overflow-hidden"
                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
              >
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
                    {/* Dynamically render fields based on formData keys â€” each key gets the
                        most appropriate control (image uploader, alignment picker, position
                        picker, range slider, long text, or a plain text input as fallback). */}
                    {Object.keys(formData).map((key) => {
                      const label = <span className="capitalize">{key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}</span>;

                      // Real image upload â€” drag/drop or click, with a URL fallback for
                      // pasting an already-hosted image instead of uploading a new file.
                      if (IMAGE_KEYS.has(key)) {
                        const isUploading = uploadingKey === key;
                        return (
                          <FormField key={key} label={label}>
                            <div
                              onClick={() => !isUploading && fileInputRefs.current[key]?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleImageUpload(key, file);
                              }}
                              className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zs-beigeLine bg-zs-beige/30 p-4 text-zs-charcoal/45 transition-colors hover:border-zs-gold/40 hover:bg-zs-gold/5 hover:text-zs-gold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zs-gold"
                            >
                              {isUploading ? (
                                <div className="flex h-40 w-full items-center justify-center">
                                  <Loader2 size={26} className="animate-spin text-zs-gold" />
                                </div>
                              ) : formData[key] ? (
                                <div className="group relative w-full">
                                  <img src={resolveImg(formData[key])} alt="Preview" className="h-40 w-full rounded-md object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-white">
                                      <UploadCloud size={14} /> Replace image
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center py-6">
                                  <UploadCloud size={30} className="mb-2" />
                                  <span className="text-sm">Click or drop an image to upload</span>
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                ref={(el) => (fileInputRefs.current[key] = el)}
                                className="hidden"
                                onChange={(e) => handleImageUpload(key, e.target.files?.[0])}
                              />
                            </div>
                            <input
                              type="text"
                              value={formData[key] || ""}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className="mt-1.5 w-full rounded-lg border border-zs-beigeLine px-3 py-1.5 text-xs text-zs-charcoal/70 outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                              placeholder="Or paste an image URL directly"
                            />
                          </FormField>
                        );
                      }

                      // Text alignment â€” left / center / right picker
                      if (ALIGN_KEYS.has(key)) {
                        return (
                          <FormField key={key} label={label}>
                            <div className="flex gap-2">
                              {ALIGN_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleFieldChange(key, opt.value)}
                                  className={
                                    "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold " +
                                    (formData[key] === opt.value
                                      ? "border-zs-gold/30 bg-zs-gold/15 text-zs-gold"
                                      : "border-zs-beigeLine text-zs-charcoal/60 hover:border-zs-gold/40 hover:bg-zs-gold/5")
                                  }
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </FormField>
                        );
                      }

                      // Image focal position â€” where the image is anchored within its box
                      if (POSITION_KEYS.has(key)) {
                        return (
                          <FormField key={key} label={label}>
                            <select
                              className="w-full rounded-xl border border-zs-beigeLine bg-white px-4 py-2.5 text-sm text-zs-charcoal outline-none focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                              value={formData[key] || "center center"}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                            >
                              {IMAGE_POSITION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </FormField>
                        );
                      }

                      // Numeric range â€” e.g. dark overlay strength on a hero image
                      if (RANGE_KEYS.has(key)) {
                        const val = Number(formData[key]) || 0;
                        return (
                          <FormField key={key} label={<span className="flex items-center justify-between">{label}<span className="text-zs-charcoal/40">{val}%</span></span>}>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={val}
                              onChange={(e) => handleFieldChange(key, Number(e.target.value))}
                              className="w-full accent-zs-gold"
                            />
                          </FormField>
                        );
                      }

                      // Long free text
                      if (LONG_TEXT_KEYS.has(key)) {
                        return (
                          <FormField key={key} label={label}>
                            <textarea
                              rows={4}
                              className="w-full rounded-xl border border-zs-beigeLine bg-white px-4 py-2.5 text-sm text-zs-charcoal outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                              value={formData[key] || ""}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                            />
                          </FormField>
                        );
                      }

                      // Product list â€” comma-separated slugs, edited as a live
                      // searchable picker against the real catalog.
                      if (PRODUCT_SLUGS_KEYS.has(key)) {
                        const selectedSlugs = String(formData[key] || "").split(",").map((s) => s.trim()).filter(Boolean);
                        return (
                          <ProductSlugsField
                            key={key}
                            label={label}
                            selectedSlugs={selectedSlugs}
                            allProducts={allProducts}
                            loading={productsLoading}
                            onChange={(slugs) => handleFieldChange(key, slugs.join(", "))}
                          />
                        );
                      }

                      // Repeatable object-array fields (Collections' cards,
                      // Style Guide's cards, Reviews' reviews list).
                      if (LIST_KEYS.has(key) && Array.isArray(formData[key])) {
                        return (
                          <RepeatableListField
                            key={key}
                            label={label}
                            items={formData[key]}
                            emptyItem={LIST_ITEM_TEMPLATES[key]}
                            onChange={(items) => handleFieldChange(key, items)}
                          />
                        );
                      }

                      // Fallback: plain text/short input (labels, links, titles, etc.)
                      return (
                        <FormField key={key} label={label}>
                          <TextInput
                            value={formData[key] ?? ""}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                          />
                        </FormField>
                      );
                    })}
                  </div>
                </div>

                <footer className="flex items-center justify-end gap-3 border-t border-zs-beigeLine bg-zs-beige/30 px-6 py-3.5">
                  <Button type="submit" variant="gold" icon={justSaved ? CheckCircle2 : Save} loading={isSaving}>
                    {justSaved ? "Saved" : "Save changes"}
                  </Button>
                </footer>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-10">
              <EmptyState
                icon={Layers}
                title="Select a section"
                description="Choose a page and section on the left to start editing its content."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* --------------------------- Product slugs picker --------------------------- */

const ProductSlugsField = ({ label, selectedSlugs, allProducts, loading, onChange }) => {
  const [query, setQuery] = useState("");

  const selectedProducts = selectedSlugs
    .map((slug) => allProducts.find((p) => p.slug === slug))
    .filter(Boolean);

  const results = !query.trim()
    ? []
    : allProducts
        .filter((p) => !selectedSlugs.includes(p.slug))
        .filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8);

  const addProduct = (slug) => {
    onChange([...selectedSlugs, slug]);
    setQuery("");
  };
  const removeProduct = (slug) => onChange(selectedSlugs.filter((s) => s !== slug));
  const move = (index, direction) => {
    const next = [...selectedSlugs];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zs-charcoal">{label}</label>
      <p className="rounded-2xl bg-zs-beige/40 px-4 py-3 text-xs text-zs-charcoal/55">
        Products shown here are pulled live from your catalog, in this order.
      </p>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zs-charcoal/35" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading products..." : "Search products to add..."}
          disabled={loading}
          className="w-full rounded-xl border border-zs-beigeLine bg-white py-2.5 pl-9 pr-4 text-sm text-zs-charcoal outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-zs-beigeLine bg-white shadow-lg">
            {results.map((product) => (
              <button
                key={product.slug}
                type="button"
                onClick={() => addProduct(product.slug)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-zs-beige/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
              >
                <ProductThumb product={product} />
                <span className="flex-1 truncate">{product.name}</span>
                {product.price != null && (
                  <span className="text-xs text-zs-charcoal/45">${Number(product.price).toFixed(2)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 flex flex-col gap-2">
        {selectedProducts.length === 0 && (
          <p className="rounded-2xl bg-zs-beige/40 px-4 py-6 text-center text-xs text-zs-charcoal/55">
            No products selected â€” the storefront will fall back to its default list.
          </p>
        )}
        {selectedProducts.map((product, index) => (
          <div key={product.slug} className="flex items-center gap-3 rounded-xl border border-zs-beigeLine bg-zs-beige/20 px-3 py-2">
            <div className="flex flex-col gap-0.5 text-zs-charcoal/35">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-0.5 hover:bg-zs-beige disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move up">
                <ChevronUp size={13} />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === selectedProducts.length - 1} className="rounded p-0.5 hover:bg-zs-beige disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move down">
                <ChevronDown size={13} />
              </button>
            </div>
            <ProductThumb product={product} />
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-zs-charcoal">{product.name}</p>
              {product.price != null && <p className="text-xs text-zs-charcoal/45">${Number(product.price).toFixed(2)}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeProduct(product.slug)}
              aria-label="Remove product"
              className="rounded-lg p-1.5 text-zs-charcoal/35 hover:bg-zs-danger/10 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductThumb = ({ product }) => {
  const src = resolveImg(product.image_url);
  return src ? (
    <img src={src} alt={product.name} className="h-9 w-9 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zs-beige text-zs-charcoal/35">
      <Package size={15} />
    </span>
  );
};

/* --------------------------- Multi-image uploader --------------------------- */

// Stored as an array of URLs. Older content saved a comma-separated string, so
// both shapes are read; the storefront (CollectionSection) accepts either.
const toImageArray = (value) =>
  Array.isArray(value)
    ? value.filter(Boolean)
    : String(value || "").split(",").map((s) => s.trim()).filter(Boolean);

const ImagesUploadField = ({ value, onChange }) => {
  const { push } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const urls = toImageArray(value);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    const added = [];
    for (const file of files) {
      try {
        added.push(await uploadCmsImage(file));
      } catch {
        push(`Couldn't upload ${file.name}.`, "error");
      }
    }
    if (added.length) onChange([...urls, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (i) => onChange(urls.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const t = i + dir;
    if (t < 0 || t >= urls.length) return;
    const next = [...urls];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zs-charcoal/55">Images (the first one is shown first)</span>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-zs-beigeLine bg-zs-beige/40">
            <img src={resolveImg(url)} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">Cover</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-white disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move earlier">
                  <ChevronLeft size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === urls.length - 1} className="px-1 text-white disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move later">
                  <ChevronRight size={13} />
                </button>
              </div>
              <button type="button" onClick={() => remove(i)} className="p-0.5 text-white hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Remove image">
                <X size={13} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zs-beigeLine bg-white text-zs-charcoal/45 transition-colors hover:border-zs-gold/40 hover:bg-zs-gold/5 hover:text-zs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold disabled:opacity-60"
        >
          {uploading ? <Loader2 size={20} className="animate-spin text-zs-gold" /> : <UploadCloud size={20} />}
          <span className="text-[10px] font-medium">{uploading ? "Uploadingâ€¦" : "Upload"}</span>
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
    </div>
  );
};

/* ------------------------------- Toggle switch ------------------------------- */

// Same pattern as Settings.jsx: the whole row is the switch, so the label and
// the knob can never disagree. Track/knob sizing matches exactly (h-6 w-11
// track with p-0.5 padding, h-5 w-5 knob, translate-x-0 / translate-x-5).
const Toggle = ({ label, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-3 rounded-lg border border-zs-beigeLine px-3 py-2.5 text-left transition-colors hover:bg-zs-beige/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
  >
    <span className="text-xs font-medium capitalize text-zs-charcoal/70">{label}</span>
    <span
      aria-hidden="true"
      className={"flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 " + (checked ? "bg-zs-gold" : "bg-zs-charcoal/20")}
    >
      <span className={"h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 " + (checked ? "translate-x-5" : "translate-x-0")} />
    </span>
  </button>
);

/* ------------------------- Repeatable list field ------------------------- */

// Sub-field type inferred from its name â€” same heuristics as the top-level
// field renderer, just applied per-item inside the list.
const isImageField = (name) => /image|avatar|logo|style0|style1|photo/i.test(name);
const isMultiImageField = (name) => name === "images";
const isLongTextField = (name) => /description|text|subtext|content|answer/i.test(name);
const isBooleanField = (val) => typeof val === "boolean";
const HIDDEN_ITEM_KEYS = new Set(["id"]);

const blankItemFrom = (template) => {
  const blank = {};
  Object.keys(template || {}).forEach((k) => {
    if (k === "id") { blank.id = Date.now(); return; }
    blank[k] = typeof template[k] === "boolean" ? false : isMultiImageField(k) ? [] : "";
  });
  return blank;
};

const RepeatableListField = ({ label, items, emptyItem, onChange }) => {
  const isSocials = String(label?.props?.children || label).toLowerCase().includes("social");
  const [uploadingAt, setUploadingAt] = useState(null); // `${index}-${fieldName}`

  const updateItem = (index, fieldName, value) => {
    const next = items.map((item, i) => (i === index ? { ...item, [fieldName]: value } : item));
    onChange(next);
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => {
    if (isSocials && items.length >= 4) return;
    onChange([...items, isSocials ? { platform: "Instagram", url: "" } : blankItemFrom(items[0] || emptyItem)]);
  };
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleUpload = async (index, fieldName, file) => {
    if (!file) return;
    const uploadKey = `${index}-${fieldName}`;
    setUploadingAt(uploadKey);
    try {
      const imageUrl = await uploadCmsImage(file);
      updateItem(index, fieldName, imageUrl);
    } finally {
      setUploadingAt(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zs-charcoal">{label}</label>
        <button
          type="button"
          onClick={addItem}
          disabled={isSocials && items.length >= 4}
          className="flex items-center gap-1 rounded-xl border border-zs-beigeLine px-2.5 py-1.5 text-xs font-semibold text-zs-charcoal/60 transition-colors hover:border-zs-gold/40 hover:bg-zs-gold/5 hover:text-zs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold disabled:pointer-events-none disabled:opacity-40"
        >
          {isSocials ? `+ Add social (${items.length}/4)` : "+ Add item"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          <div key={item.id ?? index} className="rounded-2xl border border-zs-beigeLine bg-zs-beige/15 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-zs-charcoal/40">Item {index + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg p-1 text-zs-charcoal/35 hover:bg-zs-beige disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move up">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="rounded-lg p-1 text-zs-charcoal/35 hover:bg-zs-beige disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Move down">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => removeItem(index)} className="rounded-lg p-1 text-zs-charcoal/35 hover:bg-zs-danger/10 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold" aria-label="Remove item">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.keys(item).filter((k) => !HIDDEN_ITEM_KEYS.has(k)).map((fieldName) => {
                const fieldLabel = fieldName.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
                const uploadKey = `${index}-${fieldName}`;
                const value = item[fieldName];

                if (isBooleanField(value)) {
                  return (
                    <div key={fieldName} className="sm:col-span-2">
                      <Toggle label={fieldLabel} checked={value} onChange={(v) => updateItem(index, fieldName, v)} />
                    </div>
                  );
                }

                if (isMultiImageField(fieldName)) {
                  return (
                    <div key={fieldName} className="sm:col-span-2">
                      <ImagesUploadField value={value} onChange={(urls) => updateItem(index, fieldName, urls)} />
                    </div>
                  );
                }

                if (isImageField(fieldName)) {
                  const isUploading = uploadingAt === uploadKey;
                  return (
                    <div key={fieldName} className="flex flex-col gap-1">
                      <span className="text-xs font-medium capitalize text-zs-charcoal/55">{fieldLabel}</span>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zs-beigeLine bg-white px-2 py-1.5 text-xs text-zs-charcoal/50 transition-colors hover:border-zs-gold/40 hover:bg-zs-gold/5">
                        {isUploading ? <Loader2 size={13} className="animate-spin text-zs-gold" /> : value ? (
                          <img src={resolveImg(value)} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : <ImageIcon size={13} />}
                        <span className="truncate">{isUploading ? "Uploading..." : value ? "Replace" : "Upload image"}</span>
                        <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleUpload(index, fieldName, e.target.files?.[0])} />
                      </label>
                      <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => updateItem(index, fieldName, e.target.value)}
                        placeholder="Or paste image URL"
                        className="w-full rounded-md border border-zs-beigeLine px-2 py-1 text-[11px] text-zs-charcoal/60 outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                      />
                    </div>
                  );
                }

                if (isLongTextField(fieldName)) {
                  return (
                    <div key={fieldName} className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-xs font-medium capitalize text-zs-charcoal/55">{fieldLabel}</span>
                      <textarea
                        rows={2}
                        value={value ?? ""}
                        onChange={(e) => updateItem(index, fieldName, e.target.value)}
                        className="w-full rounded-lg border border-zs-beigeLine bg-white px-3 py-2 text-xs text-zs-charcoal outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                      />
                    </div>
                  );
                }

                return (
                  <div key={fieldName} className="flex flex-col gap-1">
                    <span className="text-xs font-medium capitalize text-zs-charcoal/55">{fieldLabel}</span>
                    <input
                      type="text"
                      value={value ?? ""}
                      onChange={(e) => updateItem(index, fieldName, e.target.value)}
                      className="w-full rounded-lg border border-zs-beigeLine bg-white px-3 py-2 text-xs text-zs-charcoal outline-none transition-colors focus:border-zs-gold focus:ring-1 focus:ring-zs-gold"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-2xl bg-zs-beige/40 px-4 py-6 text-center text-xs text-zs-charcoal/55">
            No items yet. Click "Add item" to create one.
          </p>
        )}
      </div>
    </div>
  );
};


