import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tags, Package, PackageOpen, Trophy } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { FormField, TextInput, TextArea } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getCategories, saveCategory, deleteCategory } from "../api/adminService";

const emptyForm = { name: "", description: "" };

export const Categories = () => {
  const { data: categories, loading, error, reload, setData } = useAdminResource(getCategories, []);
  const { push } = useToast();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Real numbers from the categories below, so the cards match the table.
  const summary = useMemo(() => {
    const list = categories || [];
    const count = (c) => Number(c.product_count || 0);
    const top = list.reduce((best, c) => (count(c) > (best ? count(best) : 0) ? c : best), null);
    return {
      total: list.length,
      products: list.reduce((sum, c) => sum + count(c), 0),
      empty: list.filter((c) => count(c) === 0).length,
      top: top ? top.name : "â€”",
    };
  }, [categories]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveCategory(modal.form);
      setData((prev) => {
        const exists = prev?.some((c) => c.id === saved.id);
        return exists ? prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)) : [{ product_count: 0, ...saved }, ...(prev || [])];
      });
      push(modal.mode === "create" ? "Category created." : "Category updated.", "success");
      setModal(null);
    } catch {
      push("Couldn't save this category.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteCategory(pendingDelete.id);
      setData((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      push("Category deleted.", "success");
    } catch {
      push("Couldn't delete this category.", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize clothing into collections customers can browse with ease."
        actions={<Button variant="gold" icon={Plus} onClick={() => setModal({ mode: "create", form: emptyForm })}>Add category</Button>}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Categories" value={loading ? "â€”" : summary.total} icon={Tags} tone="gold" />
        <StatCard label="Products grouped" value={loading ? "â€”" : summary.products} icon={Package} tone="gold" />
        <StatCard label="Empty categories" value={loading ? "â€”" : summary.empty} icon={PackageOpen} tone="gold" />
        <StatCard label="Largest category" value={loading ? "â€”" : <span className="block truncate text-2xl">{summary.top}</span>} icon={Trophy} tone="gold" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
            <Tags size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">All categories</h2>
            <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Create, rename and remove the groups your products belong to.</p>
          </div>
        </div>

        <DataTable
          loading={loading} error={error} onRetry={reload} rows={categories || []}
          emptyTitle="No categories yet" emptyDescription="Create your first category to start organizing products."
          columns={[
            { key: "name", label: "Category", render: (c) => <span className="font-medium text-zs-charcoal">{c.name}</span> },
            { key: "slug", label: "Slug", render: (c) => <span className="font-mono text-xs text-zs-charcoal/55">{c.slug}</span> },
            { key: "description", label: "Description", render: (c) => <span className="line-clamp-2 text-zs-charcoal/65">{c.description || "â€”"}</span> },
            { key: "product_count", label: "Products", className: "text-right", render: (c) => <span className="tabular-nums">{c.product_count || 0}</span> },
            {
              key: "actions", label: "", className: "text-right",
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => setModal({ mode: "edit", form: c })}
                    className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-zs-gold/10 hover:text-zs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-gold"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => setPendingDelete(c)}
                    className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-red-50 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />

        {!loading && !error && (categories || []).length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
            <span className="text-zs-charcoal/60">{summary.total} categor{summary.total === 1 ? "y" : "ies"}</span>
            <span className="font-medium text-zs-charcoal">Products grouped: <b className="zs-display">{summary.products}</b></span>
          </div>
        )}
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Add category" : "Edit category"}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="gold" form="category-form" type="submit" loading={saving}>{saving ? "Savingâ€¦" : "Save category"}</Button></>}
      >
        {modal && (
          <form id="category-form" onSubmit={submit}>
            <FormField label="Category name" htmlFor="c-name" required>
              <TextInput data-autofocus id="c-name" required value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))} />
            </FormField>
            <FormField label="Description" htmlFor="c-desc">
              <TextArea id="c-desc" value={modal.form.description || ""} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} />
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this category?"
        description={pendingDelete ? `Products in "${pendingDelete.name}" will need to be reassigned.` : ""}
        confirmLabel="Delete category"
      />
    </div>
  );
};
