import { useEffect, useState } from "react";
import { Plus, Ruler, Save, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { FormField, TextInput } from "../components/ui/FormField";
import { useToast } from "../components/ui/Toast";
import { getProductOptions, saveProductOptions } from "../api/adminService";

const splitList = (value) => [...new Set(String(value || "").split(",").map((part) => part.trim()).filter(Boolean))];
const blankRow = () => ({ size_label: "", chest_cm: "", waist_cm: "", hip_cm: "", garment_length_cm: "" });

export const ProductOptions = () => {
  const { push } = useToast();
  const [values, setValues] = useState({ sizes: "", colors: "", sizeGuide: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProductOptions()
      .then((data) => setValues({
        sizes: (data.sizes || []).join(", "),
        colors: (data.colors || []).join(", "),
        sizeGuide: (data.sizeGuide || []).map((row) => ({
          ...row,
          chest_cm: row.chest_cm ?? "",
          waist_cm: row.waist_cm ?? "",
          hip_cm: row.hip_cm ?? "",
          garment_length_cm: row.garment_length_cm ?? "",
        })),
      }))
      .catch(() => push("Couldn't load size and color settings.", "error"))
      .finally(() => setLoading(false));
  }, [push]);

  const updateRow = (index, key, value) => setValues((current) => ({
    ...current,
    sizeGuide: current.sizeGuide.map((row, i) => i === index ? { ...row, [key]: value } : row),
  }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveProductOptions({
        sizes: splitList(values.sizes),
        colors: splitList(values.colors),
        sizeGuide: values.sizeGuide.filter((row) => row.size_label.trim()).map((row) => ({
          ...row,
          chest_cm: row.chest_cm === "" ? null : Number(row.chest_cm),
          waist_cm: row.waist_cm === "" ? null : Number(row.waist_cm),
          hip_cm: row.hip_cm === "" ? null : Number(row.hip_cm),
          garment_length_cm: row.garment_length_cm === "" ? null : Number(row.garment_length_cm),
        })),
      });
      setValues((current) => ({ ...current, sizeGuide: saved.sizeGuide }));
      push("Product options and size guide saved.", "success");
    } catch (error) {
      push(error?.response?.data?.message || "Couldn't save product options.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Size & color"
        description="Set the options available to products and maintain the customer size guide."
        actions={<Button variant="gold" icon={Save} type="submit" form="product-options-form" loading={saving}>Save changes</Button>}
      />
      {loading ? (
        <div className="rounded-2xl border border-zs-beigeLine bg-white p-8 text-sm text-zs-charcoal/50">Loading product options…</div>
      ) : (
        <form id="product-options-form" onSubmit={save} className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-zs-beigeLine bg-white p-5 sm:p-6">
              <FormField label="Size options" htmlFor="option-sizes" hint="Comma-separated options used in the product editor.">
                <TextInput id="option-sizes" value={values.sizes} onChange={(event) => setValues((current) => ({ ...current, sizes: event.target.value }))} placeholder="XS, S, M, L, XL, XXL" />
              </FormField>
            </div>
            <div className="rounded-2xl border border-zs-beigeLine bg-white p-5 sm:p-6">
              <FormField label="Color options" htmlFor="option-colors" hint="Comma-separated options used in the product editor.">
                <TextInput id="option-colors" value={values.colors} onChange={(event) => setValues((current) => ({ ...current, colors: event.target.value }))} placeholder="Black, White, Cream, Navy" />
              </FormField>
            </div>
          </section>

          <section className="rounded-2xl border border-zs-beigeLine bg-white p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-zs-gold/15 text-zs-gold"><Ruler size={18} /></span>
                <div>
                  <h2 className="font-semibold text-zs-charcoal">Size guide measurements</h2>
                  <p className="text-xs text-zs-charcoal/50">Centimetres. These rows appear in the storefront size guide.</p>
                </div>
              </div>
              <Button type="button" variant="secondary" icon={Plus} onClick={() => setValues((current) => ({ ...current, sizeGuide: [...current.sizeGuide, blankRow()] }))}>Add size</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="border-b border-zs-beigeLine text-xs uppercase tracking-wide text-zs-charcoal/50">
                  <th className="pb-3 pr-3">Size</th><th className="pb-3 px-2">Chest (cm)</th><th className="pb-3 px-2">Waist (cm)</th><th className="pb-3 px-2">Hip (cm)</th><th className="pb-3 px-2">Length (cm)</th><th className="pb-3 pl-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-zs-beigeLine">
                  {values.sizeGuide.map((row, index) => (
                    <tr key={row.id || "new-" + index}>
                      {["size_label", "chest_cm", "waist_cm", "hip_cm", "garment_length_cm"].map((field, fieldIndex) => (
                        <td key={field} className="py-2 pr-2">
                          <TextInput aria-label={["Size", "Chest in centimetres", "Waist in centimetres", "Hip in centimetres", "Length in centimetres"][fieldIndex]} type={fieldIndex === 0 ? "text" : "number"} min={fieldIndex === 0 ? undefined : 0} step={fieldIndex === 0 ? undefined : "0.1"} value={row[field] ?? ""} onChange={(event) => updateRow(index, field, event.target.value)} />
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-right"><button type="button" aria-label="Remove size guide row" onClick={() => setValues((current) => ({ ...current, sizeGuide: current.sizeGuide.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-zs-charcoal/40 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                  {!values.sizeGuide.length && <tr><td colSpan="6" className="py-8 text-center text-sm text-zs-charcoal/45">No size guide rows yet. Add sizes and measurements above.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </form>
      )}
    </div>
  );
};
