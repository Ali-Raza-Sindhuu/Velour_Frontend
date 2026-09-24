import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Modal shell shared by the checkout dialogs: backdrop, escape, scroll lock
// and focus return, matching the quick-view's behaviour.
//
// `dismissable` is false while a payment is in flight — a stray click on the
// backdrop must not tear the dialog away from a charge the customer is
// midway through approving.
const CheckoutDialog = ({ onClose, labelledBy, dismissable = true, className = "", children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus({ preventScroll: true });

    const onKey = (event) => {
      if (event.key === "Escape" && dismissable) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose, dismissable]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={() => dismissable && onClose()}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onMouseDown={(event) => event.stopPropagation()}
        className={
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl " +
          className
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default CheckoutDialog;
