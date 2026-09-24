import { useMemo, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, X, UploadCloud, Star, Package, CheckCircle2, AlertTriangle, PackageX } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SearchInput } from "../components/ui/SearchInput";
import { FilterSelect } from "../components/ui/FilterSelect";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { FormField, TextInput, TextArea, Select } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getProducts, getCategories, getProductOptions, saveProduct, deleteProduct } from "../api/adminService";
import { formatPrice } from "../../../utils/price";
import { resolveImg } from "../../../utils/resolveImg";
import { ProductVideoField } from "../components/ProductVideoField";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const MAX_IMAGES = 5;

// images: [{ id, file?: File, url?: string (existing, from server), preview: string, isCover: boolean }]
// video: null | { file?: File (new upload), url?: string (already saved), preview: string }
const emptyForm = { name: "", category_name: "", description: "", specifications: "", sizes: [], colors: [], variants: [], video: null, price: "", discount_type: "", discount_value: "", stock: "", unit_cost: "", status: "draft", sku: "", images: [], is_returnable: true };

const uid = () => Math.random().toString(36).slice(2, 9);

const FormHeading = ({ children }) => (
  <h3 className="border-b border-zs-beigeLine pb-2 text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">{children}</h3>
);

const optionList = (value) => (Array.isArray(value) ? value : String(value || "").split(/[;,\n]/)).map((item) => String(item).trim()).filter(Boolean);
const makeVariantRows = (sizes, colors, existing = [], fallbackStock = 0) => {
  const sizeOptions = sizes.length ? sizes : [""];
  const colorOptions = colors.length ? colors : [""];
  if (!sizes.length && !colors.length) return [];
  const old = new Map(existing.map((item) => [item.size + "\u0000" + item.color, Number(item.stock_quantity) || 0]));
  const rows = sizeOptions.flatMap((size) => colorOptions.map((color) => ({
    size, color, stock_quantity: old.get(size + "\u0000" + color) || 0,
  })));
  const oldTotal = existing.reduce((sum, item) => sum + (Number(item.stock_quantity) || 0), 0);
  const allocated = rows.reduce((sum, item) => sum + item.stock_quantity, 0);
  if (rows.length && oldTotal > allocated) rows[0].stock_quantity += oldTotal - allocated;
  if (rows.length && !existing.length) rows[0].stock_quantity = Number(fallbackStock) || 0;
  return rows;
};

const OptionDropdown = ({ label, options, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm font-medium text-zs-charcoal">{label}</span>
    <details className="group relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-xl border border-zs-beigeLine bg-white px-3 text-sm text-zs-charcoal after:content-['▾']">
        <span className="truncate">{value.length ? value.join(", ") : "Choose options"}</span>
      </summary>
      <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-zs-beigeLine bg-white p-2 shadow-xl">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-zs-beige/40">
            <input type="checkbox" checked={value.includes(option)} onChange={() => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])} />
            {option}
          </label>
        ))}
        {!options.length && <p className="px-2 py-2 text-xs text-zs-charcoal/50">Add options in Size &amp; color settings.</p>}
      </div>
    </details>
  </div>
);

export const Products = () => {
  const { data: products, loading, error, reload, setData } = useAdminResource(getProducts, []);
  const { data: categories } = useAdminResource(getCategories, []);
  const { data: optionCatalog } = useAdminResource(getProductOptions, { sizes: [], colors: [] });
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', form }
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [videoPlayable, setVideoPlayable] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || p.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [products, query, status]);

  // Real catalog counts, so the cards always agree with the table.
  const counts = useMemo(() => {
    const list = products || [];
    const by = (s) => list.filter((p) => p.status === s).length;
    return { total: list.length, active: by("active"), low: by("low_stock"), out: by("out_of_stock") };
  }, [products]);

  // Focus the name field exactly once, when the modal transitions from closed -> open.
  // Deliberately NOT re-run on every keystroke/re-render â€” that was the cause of focus
  // jumping back to this field whenever another field's value changed.
  const openModal = (next) => {
    setModal(next);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const openCreate = () => {
    setVideoPlayable(true);
    openModal({ mode: "create", form: emptyForm });
  };

  const openEdit = (product) => {
    const existingImages = (product.images || (product.image_url ? [product.image_url] : [])).map((url, i) => ({
      id: uid(),
      url,
      preview: resolveImg(url),
      isCover: i === 0,
    }));
    setVideoPlayable(true);
    const sizes = optionList(product.sizes);
    const colors = optionList(product.colors);
    const variants = makeVariantRows(sizes, colors, product.variants || [], product.stock);
    openModal({
      mode: "edit",
      form: {
        ...product,
        sizes,
        colors,
        variants,
        price: String(product.price),
        discount_type: product.discount_type || "",
        discount_value: product.discount_value != null ? String(product.discount_value) : "",
        stock: String(product.stock),
        images: existingImages,
        video: product.video_url ? { url: product.video_url, preview: resolveImg(product.video_url) } : null,
      },
    });
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setModal((m) => {
      const room = MAX_IMAGES - m.form.images.length;
      if (room <= 0) {
        push(`You can upload up to ${MAX_IMAGES} images per product.`, "error");
        return m;
      }
      const toAdd = files.slice(0, room).map((file, i) => ({
        id: uid(),
        file,
        preview: URL.createObjectURL(file),
        isCover: m.form.images.length === 0 && i === 0,
      }));
      if (files.length > room) push(`Only ${room} more image${room === 1 ? "" : "s"} could be added (max ${MAX_IMAGES}).`, "error");
      return { ...m, form: { ...m.form, images: [...m.form.images, ...toAdd] } };
    });
  };

  const removeImage = (id) => {
    setModal((m) => {
      const images = m.form.images.filter((img) => img.id !== id);
      if (images.length && !images.some((img) => img.isCover)) images[0].isCover = true;
      return { ...m, form: { ...m.form, images } };
    });
  };

  const setCover = (id) => {
    setModal((m) => ({
      ...m,
      form: { ...m.form, images: m.form.images.map((img) => ({ ...img, isCover: img.id === id })) },
    }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const submit = async (e) => {
  e.preventDefault();
  if (!modal.form.images.length) {
    push("Add at least one product image.", "error");
    return;
  }
  if (modal.form.video && !videoPlayable) {
    push("This video can't be played in browsers. Replace or remove it before saving.", "error");
    return;
  }
  setSaving(true);
  try {
    const { images, ...rest } = modal.form;

    const productToSave = {
      ...rest,
      price: Number(rest.price),
      stock: rest.variants.length ? rest.variants.reduce((sum, row) => sum + (Number(row.stock_quantity) || 0), 0) : Number(rest.stock),
      // adminService.saveProduct builds the multipart upload (cover +
      // gallery) directly from this list.
      images,
    };

    const uploadingVideo = modal.form.video?.file instanceof File;
    const saved = await saveProduct(productToSave, {
      onProgress: uploadingVideo ? setUploadProgress : undefined,
    });
    setData((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    push(modal.mode === "create" ? "Product added." : "Product updated.", "success");
    setModal(null);
  } catch (err) {
    // Show the server's reason when there is one (e.g. a file over the size limit).
    push(err?.response?.data?.message || "Couldn't save this product. Try again.", "error");
  } finally {
    setSaving(false);
    setUploadProgress(null);
  }
};

  const confirmDelete = async () => {
    try {
      await deleteProduct(pendingDelete.id);
      setData((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      push("Product deleted.", "success");
    } catch (err) {
      push(err?.response?.data?.message || "Couldn't delete this product.", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your clothing catalog, pricing and stock levels."
        actions={
          <Button variant="gold" icon={Plus} onClick={openCreate}>
            Add product
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={loading ? "â€”" : counts.total} icon={Package} tone="gold" />
        <StatCard label="Active" value={loading ? "â€”" : counts.active} icon={CheckCircle2} tone="gold" />
        <StatCard label="Low stock" value={loading ? "â€”" : counts.low} icon={AlertTriangle} tone="gold" />
        <StatCard label="Out of stock" value={loading ? "â€”" : counts.out} icon={PackageX} tone="gold" />
      </div>

      <section className="mt-8">
      <div className="mb-4 flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
          <Package size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Catalog</h2>
          <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Search, edit and manage every clothing item you sell.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-zs-beigeLine bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKUâ€¦" label="Search products" />
        <FilterSelect label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      <div>
        <DataTable
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle="No products found"
          emptyDescription="Try a different search, or add your first product."
          rows={filtered}
          columns={[
            {
              key: "image",
              label: "",
              render: (p) => (
                <div className="h-11 w-11 overflow-hidden rounded-lg border border-zs-beigeLine bg-zs-beige/50">
                  {p.image_url ? (
                    <img src={resolveImg(p.image_url)} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-full w-full p-2.5 text-zs-charcoal/25" />
                  )}
                </div>
              ),
            },
            {
              key: "name",
              label: "Product",
              render: (p) => (
                <div>
                  <p className="font-medium text-zs-charcoal">{p.name}</p>
                  <p className="text-xs text-zs-charcoal/45">{p.sku}</p>
                  {(p.sizes || p.colors) && <p className="text-xs text-zs-charcoal/55">{[p.sizes && "Sizes: " + p.sizes, p.colors && "Colors: " + p.colors].filter(Boolean).join(" · ")}</p>}
                </div>
              ),
            },
            { key: "category_name", label: "Category", render: (p) => <span className="text-zs-charcoal/70">{p.category_name}</span> },
            { key: "stock", label: "Stock", render: (p) => <span className="tabular-nums text-zs-charcoal/70">{p.stock}</span> },
            { key: "status", label: "Status", render: (p) => <StatusBadge value={p.status} /> },
            { key: "price", label: "Price", render: (p) => p.has_discount ? (
                <span className="flex flex-col items-end tabular-nums leading-tight">
                  <span className="font-medium">{formatPrice(p.final_price)}</span>
                  <span className="flex items-center gap-1 text-[11px] text-zs-charcoal/40">
                    <span className="line-through">{formatPrice(p.price)}</span>
                    <span className="font-semibold text-zs-danger">-{p.discount_percent}%</span>
                  </span>
                </span>
              ) : <span className="font-medium tabular-nums">{formatPrice(p.price)}</span>, className: "text-right" },
            {
              key: "actions",
              label: "",
              className: "text-right",
              render: (p) => (
                <div className="flex justify-end gap-1.5">
                  <button aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)} className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-zs-gold/10 hover:text-zs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-gold">
                    <Pencil size={15} />
                  </button>
                  <button aria-label={`Delete ${p.name}`} onClick={() => setPendingDelete(p)} className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-red-50 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
          <span className="text-zs-charcoal/60">
            Showing {filtered.length} of {counts.total} product{counts.total === 1 ? "" : "s"}
          </span>
        </div>
      )}
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Add product" : "Edit product"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="gold" form="product-form" type="submit" disabled={saving}>
              {saving
                ? typeof uploadProgress === "number" && uploadProgress < 100
                  ? `Uploading ${uploadProgress}%â€¦`
                  : "Savingâ€¦"
                : modal?.mode === "create" ? "Add product" : "Save changes"}
            </Button>
          </>
        }
      >
        {modal && (
          <form id="product-form" onSubmit={submit} className="flex flex-col gap-5">
            <FormHeading>Media</FormHeading>
            {/* Image gallery â€” up to 5 images, click a thumbnail to set it as the cover/display image */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zs-charcoal">
                Product images <span className="text-zs-charcoal/40">({modal.form.images.length}/{MAX_IMAGES})</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {modal.form.images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setCover(img.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={img.isCover ? "Cover image" : "Set as cover image"}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCover(img.id); } }}
                    className={`group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                      img.isCover ? "border-zs-gold" : "border-zs-beigeLine hover:border-zs-gold/50"
                    }`}
                  >
                    <img src={img.preview} alt="" className="h-full w-full object-cover" />
                    {img.isCover && (
                      <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-zs-gold px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        <Star size={9} fill="white" /> Cover
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {modal.form.images.length < MAX_IMAGES && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-zs-charcoal/40 transition-colors ${
                      dragOver ? "border-zs-gold bg-zs-gold/10 text-zs-gold" : "border-zs-beigeLine bg-zs-beige/30 hover:border-zs-gold hover:text-zs-gold"
                    }`}
                  >
                    <UploadCloud size={18} className="mb-1" />
                    <span className="text-[10px]">Upload</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zs-charcoal/40">Click an image to set it as the cover shown in the catalog.</p>
            </div>

            <ProductVideoField
              value={modal.form.video}
              onChange={(video) => setModal((m) => ({ ...m, form: { ...m.form, video } }))}
              onPlayableChange={setVideoPlayable}
              onError={(message) => push(message, "error")}
              uploadProgress={uploadProgress}
            />

            <FormHeading>Details</FormHeading>
            <FormField label="Product name" htmlFor="p-name" required>
              <TextInput
                ref={nameInputRef}
                id="p-name"
                required
                value={modal.form.name}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="p-cat">
                <Select id="p-cat" value={modal.form.category_name || ""} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, category_name: e.target.value } }))}>
                  <option value="">Select category</option>
                  {(categories || []).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                </Select>
              </FormField>
              <FormField label="SKU" htmlFor="p-sku">
                <TextInput id="p-sku" value={modal.form.sku} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, sku: e.target.value } }))} />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="p-description">
              <TextArea id="p-description" rows={4} value={modal.form.description || ""} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} />
            </FormField>
            <FormField label="Specifications" htmlFor="p-specifications" hint="Notes, volume, concentration, or other product details.">
              <TextArea id="p-specifications" rows={4} value={modal.form.specifications || ""} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, specifications: e.target.value } }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <OptionDropdown label="Available sizes" options={[...new Set([...(optionCatalog?.sizes || []), ...modal.form.sizes])]} value={modal.form.sizes} onChange={(sizes) => setModal((m) => ({ ...m, form: { ...m.form, sizes, variants: makeVariantRows(sizes, m.form.colors, m.form.variants, Number(m.form.stock) || 0) } }))} />
              <OptionDropdown label="Available colors" options={[...new Set([...(optionCatalog?.colors || []), ...modal.form.colors])]} value={modal.form.colors} onChange={(colors) => setModal((m) => ({ ...m, form: { ...m.form, colors, variants: makeVariantRows(m.form.sizes, colors, m.form.variants, Number(m.form.stock) || 0) } }))} />
            </div>
            {modal.form.variants.length > 0 && (
              <div className="rounded-2xl border border-zs-beigeLine p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <FormHeading>Stock by size &amp; color</FormHeading>
                  <span className="text-xs text-zs-charcoal/50">Total available: {modal.form.variants.reduce((sum, row) => sum + (Number(row.stock_quantity) || 0), 0)}</span>
                </div>
                <div className="space-y-2">
                  {modal.form.variants.map((variant, index) => (
                    <div key={variant.size + "-" + variant.color} className="grid grid-cols-[1fr_7rem] items-center gap-3 border-b border-zs-beigeLine/70 pb-2 last:border-0">
                      <span className="text-sm text-zs-charcoal">{[variant.size && "Size " + variant.size, variant.color && "Color " + variant.color].filter(Boolean).join(" · ")}</span>
                      <TextInput aria-label={"Stock " + [variant.size, variant.color].filter(Boolean).join(" ")} type="number" min="0" step="1" value={variant.stock_quantity} onChange={(event) => setModal((m) => ({ ...m, form: { ...m.form, variants: m.form.variants.map((row, rowIndex) => rowIndex === index ? { ...row, stock_quantity: event.target.value } : row) } }))} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FormHeading>Pricing &amp; stock</FormHeading>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Price (PKR)" htmlFor="p-price" required>
                <TextInput id="p-price" type="number" min="0" required value={modal.form.price} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, price: e.target.value } }))} />
              </FormField>
              {modal.mode === "create" ? (
                modal.form.variants.length ? (
                  <FormField label="Opening stock" htmlFor="p-stock" hint="Set the opening quantity in the size and color stock table above.">
                    <TextInput id="p-stock" type="number" value={modal.form.variants.reduce((sum, row) => sum + (Number(row.stock_quantity) || 0), 0)} disabled readOnly />
                  </FormField>
                ) : <FormField label="Opening stock" htmlFor="p-stock" required>
                  <TextInput id="p-stock" type="number" min="0" required value={modal.form.stock} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, stock: e.target.value } }))} />
                </FormField>
              ) : (
                <FormField label="Available stock" htmlFor="p-stock" hint={<>Change it from <Link to="/adminDashboard/stock" className="font-medium text-zs-gold underline">Inventory â†’ Stock</Link>.</>}>
                  <TextInput id="p-stock" type="number" value={modal.form.stock} disabled readOnly />
                </FormField>
              )}
              <FormField label="Status" htmlFor="p-status">
                <Select id="p-status" value={modal.form.status} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="archived">Archived (hidden from shop)</option>
                </Select>
              </FormField>
            </div>

            {modal.mode === "create" && (
              <FormField label="Unit cost (PKR)" htmlFor="p-unit-cost" hint="What you paid per unit for the opening stock. Used for profit and stock value; never shown to customers.">
                <TextInput id="p-unit-cost" type="number" min="0" step="0.01" value={modal.form.unit_cost} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, unit_cost: e.target.value } }))} />
              </FormField>
            )}

            <label className="mb-4 flex items-start gap-3 rounded-2xl border border-zs-beigeLine p-4 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-zs-gold"
                checked={modal.form.is_returnable !== false}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, is_returnable: e.target.checked } }))}
              />
              <span>
                <span className="block font-medium text-zs-charcoal">Can be returned</span>
                <span className="block text-xs text-zs-charcoal/55">Untick for final-sale items like testers or decants â€” customers won't be able to request a return.</span>
              </span>
            </label>

            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-zs-beigeLine bg-zs-beige/30 p-4">
              <FormField label="Discount" htmlFor="p-discount-type" hint="Leave as â€œNo discountâ€ to sell at full price.">
                <Select
                  id="p-discount-type"
                  value={modal.form.discount_type || ""}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, discount_type: e.target.value, discount_value: e.target.value ? m.form.discount_value : "" } }))}
                >
                  <option value="">No discount</option>
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </Select>
              </FormField>
              <FormField
                label={modal.form.discount_type === "fixed" ? "Amount off (PKR)" : "Percent off (%)"}
                htmlFor="p-discount-value"
              >
                <TextInput
                  id="p-discount-value"
                  type="number"
                  min="0"
                  max={modal.form.discount_type === "percentage" ? "100" : undefined}
                  step="0.01"
                  disabled={!modal.form.discount_type}
                  value={modal.form.discount_value || ""}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, discount_value: e.target.value } }))}
                />
              </FormField>
              <FormField label="Price after discount">
                <div className="flex h-10 items-center px-1 text-sm font-medium tabular-nums text-zs-charcoal">
                  {(() => {
                    const price = Number(modal.form.price) || 0;
                    const value = Number(modal.form.discount_value) || 0;
                    if (!modal.form.discount_type || !value) return <span className="text-zs-charcoal/40">{formatPrice(price)}</span>;
                    const raw = modal.form.discount_type === "percentage" ? price - (price * value) / 100 : price - value;
                    const final = Math.min(price, Math.max(0, raw));
                    return (
                      <span className="flex items-center gap-2">
                        <span>{formatPrice(final)}</span>
                        <span className="text-xs text-zs-charcoal/40 line-through">{formatPrice(price)}</span>
                      </span>
                    );
                  })()}
                </div>
              </FormField>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this product?"
        description={pendingDelete ? `"${pendingDelete.name}" will be removed from the catalog. This can't be undone.` : ""}
        confirmLabel="Delete product"
      />
    </div>
  );
};
