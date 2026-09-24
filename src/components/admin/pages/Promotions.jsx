import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Percent, CheckCircle2, XCircle, Ticket } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { DataTable } from "../components/ui/DataTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { FormField, TextInput, Select } from "../components/ui/FormField";
import { useAdminResource } from "../hooks/useAdminResource";
import { useToast } from "../components/ui/Toast";
import { getPromotions, savePromotion, deletePromotion } from "../api/adminService";

const emptyForm = { code: "", type: "percentage", value: "", status: "active", expires_at: "" };

// expires_at is "YYYY-MM-DD", or "—" when the code never expires.
const isExpired = (p) => /^\d{4}-\d{2}-\d{2}$/.test(p.expires_at) && p.expires_at < new Date().toISOString().slice(0, 10);

export const Promotions = () => {
  const { data: promotions, loading, error, reload, setData } = useAdminResource(getPromotions, []);
  const { push } = useToast();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Real counts from the codes below, so the cards always match the table.
  const counts = useMemo(() => {
    const list = promotions || [];
    return {
      total: list.length,
      active: list.filter((p) => p.status === "active" && !isExpired(p)).length,
      inactive: list.filter((p) => p.status !== "active" || isExpired(p)).length,
      redemptions: list.reduce((sum, p) => sum + Number(p.usage || 0), 0),
    };
  }, [promotions]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...modal.form, value: Number(modal.form.value) };
      const saved = await savePromotion(payload);
      setData((prev) => {
        const exists = prev?.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)) : [{ usage: 0, ...saved }, ...(prev || [])];
      });
      push(modal.mode === "create" ? "Promotion created." : "Promotion updated.", "success");
      setModal(null);
    } catch {
      push("Couldn't save this promotion.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deletePromotion(pendingDelete.id);
      setData((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      push("Promotion removed.", "success");
    } catch {
      push("Couldn't remove this promotion.", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Discount codes and campaigns across the store."
        actions={<Button variant="gold" icon={Plus} onClick={() => setModal({ mode: "create", form: emptyForm })}>Create promotion</Button>}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Promotions" value={loading ? "—" : counts.total} icon={Percent} tone="gold" />
        <StatCard label="Active" value={loading ? "—" : counts.active} icon={CheckCircle2} tone="gold" />
        <StatCard label="Inactive / expired" value={loading ? "—" : counts.inactive} icon={XCircle} tone="gold" />
        <StatCard label="Redemptions" value={loading ? "—" : counts.redemptions} icon={Ticket} tone="gold" />
      </div>

      <section className="mt-8">
      <div className="mb-4 flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
          <Ticket size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">Discount codes</h2>
          <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">Create, edit and switch off codes customers can use at checkout.</p>
        </div>
      </div>

      <DataTable
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle="No promotions yet"
        emptyDescription="Create a code to drive your next campaign."
        rows={promotions}
        columns={[
          { key: "code", label: "Code", render: (p) => <span className="font-mono font-medium tracking-wide">{p.code}</span> },
          { key: "value", label: "Discount", render: (p) => (p.type === "percentage" ? `${p.value}%` : `PKR ${p.value}`) },
          { key: "usage", label: "Redemptions" },
          { key: "expires_at", label: "Expires", render: (p) => (
            <span className="flex items-center gap-2">
              <span className={isExpired(p) ? "text-zs-charcoal/45" : ""}>{p.expires_at}</span>
              {isExpired(p) ? <StatusBadge value="expired" /> : null}
            </span>
          ) },
          { key: "status", label: "Status", render: (p) => <StatusBadge value={p.status} /> },
          {
            key: "actions", label: "", className: "text-right",
            render: (p) => (
              <div className="flex justify-end gap-1.5">
                <button aria-label={`Edit ${p.code}`} onClick={() => setModal({ mode: "edit", form: { ...p, value: String(p.value) } })} className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-zs-gold/10 hover:text-zs-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-gold"><Pencil size={15} /></button>
                <button aria-label={`Delete ${p.code}`} onClick={() => setPendingDelete(p)} className="rounded-xl p-2 text-zs-charcoal/55 transition-colors hover:bg-red-50 hover:text-zs-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-zs-danger"><Trash2 size={15} /></button>
              </div>
            ),
          },
        ]}
      />

      {!loading && !error && promotions?.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-3xl border border-zs-beigeLine bg-white px-6 py-4 text-sm shadow-sm">
          <span className="text-zs-charcoal/60">{promotions.length} promotion{promotions.length === 1 ? "" : "s"}</span>
          <span className="font-medium text-zs-charcoal">Total redemptions: <b className="zs-display">{counts.redemptions}</b></span>
        </div>
      )}
      </section>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Create promotion" : "Edit promotion"}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="gold" form="promo-form" type="submit" loading={saving}>{saving ? "Saving…" : "Save promotion"}</Button></>}
      >
        {modal && (
          <form id="promo-form" onSubmit={submit}>
            <FormField label="Promo code" htmlFor="pr-code" required>
              <TextInput data-autofocus id="pr-code" required value={modal.form.code} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, code: e.target.value.toUpperCase() } }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount type" htmlFor="pr-type">
                <Select id="pr-type" value={modal.form.type} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, type: e.target.value } }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount (PKR)</option>
                </Select>
              </FormField>
              <FormField label="Value" htmlFor="pr-value" required>
                <TextInput id="pr-value" type="number" min="0" required value={modal.form.value} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, value: e.target.value } }))} />
              </FormField>
            </div>
            <FormField label="Expires on" htmlFor="pr-expiry">
              <TextInput id="pr-expiry" type="date" value={modal.form.expires_at} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, expires_at: e.target.value } }))} />
            </FormField>
            <FormField label="Status" htmlFor="pr-status" hint="Set automatically to inactive once the expiry date passes; use this to disable a code early.">
              <Select id="pr-status" value={modal.form.status} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Remove this promotion?"
        description={pendingDelete ? `"${pendingDelete.code}" will no longer be redeemable.` : ""}
        confirmLabel="Remove promotion"
      />
    </div>
  );
};