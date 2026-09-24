import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export const Modal = ({ open, onClose, title, children, footer, size = "md" }) => {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // always call the latest onClose, without it being a dep

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current?.();
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector("[data-autofocus]")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // <- only re-run when the modal actually opens/closes, not on every re-render

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="zs-modal-title"
        className={"max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--zs-white)] p-6 shadow-zs sm:rounded-2xl " + widths[size]}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="zs-modal-title" className="zs-display text-xl font-semibold text-zs-charcoal">{title}</h2>
          <button aria-label="Close dialog" onClick={onClose} className="rounded-full p-1.5 text-zs-charcoal/50 hover:bg-zs-beige hover:text-zs-charcoal">
            <X size={18} />
          </button>
        </div>
        <div>{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-zs-beigeLine pt-5">{footer}</div> : null}
      </div>
    </div>
  );
};