import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { fetchProductSizeGuideRequest } from "../../api/productOptionsApi";

const SizeGuide = ({ availableSizes = [] }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchProductSizeGuideRequest()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open]);

  const visibleRows = availableSizes.length
    ? rows.filter((row) => availableSizes.includes(row.size_label))
    : rows;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-sm text-black/60 underline-offset-4 transition hover:text-black hover:underline">
        Size guide
      </button>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
              <motion.section role="dialog" aria-modal="true" aria-labelledby="size-guide-title" className="w-full max-w-3xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.2em] text-black/45">Find your fit</p>
                    <h2 id="size-guide-title" className="mt-1 text-2xl font-medium tracking-tight text-black">Size guide</h2>
                    <p className="mt-1 text-sm text-black/55">Measurements are shown in centimetres.</p>
                  </div>
                  <button type="button" aria-label="Close size guide" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-black/60 hover:bg-black/5"><X size={17} /></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead><tr className="border-y border-black/10 text-[10px] uppercase tracking-[.14em] text-black/45">
                      <th className="py-3 pr-4">Size</th><th className="px-3 py-3">Chest</th><th className="px-3 py-3">Waist</th><th className="px-3 py-3">Hip</th><th className="py-3 pl-3">Length</th>
                    </tr></thead>
                    <tbody className="divide-y divide-black/5">
                      {loading ? <tr><td colSpan="5" className="py-8 text-center text-black/45">Loading size guide…</td></tr>
                        : visibleRows.length ? visibleRows.map((row) => (
                          <tr key={row.id}><th className="py-3 pr-4 font-medium text-black">{row.size_label}</th><td className="px-3 py-3 text-black/65">{row.chest_cm ?? "—"}</td><td className="px-3 py-3 text-black/65">{row.waist_cm ?? "—"}</td><td className="px-3 py-3 text-black/65">{row.hip_cm ?? "—"}</td><td className="py-3 pl-3 text-black/65">{row.garment_length_cm ?? "—"}</td></tr>
                        )) : <tr><td colSpan="5" className="py-8 text-center text-black/45">The size guide is being updated. Contact us if you need help with fit.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-black/45">For the best fit, compare these measurements with a similar garment that fits you well.</p>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default SizeGuide;
