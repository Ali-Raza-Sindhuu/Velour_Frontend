import { Modal } from "./Modal";

export const ConfirmModal = ({ open, onClose, onConfirm, title = "Are you sure?", description, confirmLabel = "Confirm", tone = "danger", loading = false }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm" footer={
    <>
      <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-zs-charcoal/70 hover:bg-zs-beige">Cancel</button>
      <button
        data-autofocus
        onClick={onConfirm}
        disabled={loading}
        className={"rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 " + (tone === "danger" ? "bg-zs-danger hover:bg-zs-danger/90" : "bg-zs-charcoal hover:bg-zs-charcoalSoft")}
      >
        {loading ? "Working…" : confirmLabel}
      </button>
    </>
  }>
    <p className="text-sm text-zs-charcoal/70">{description}</p>
  </Modal>
);
