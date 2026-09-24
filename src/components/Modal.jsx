import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, children, maxWidth = "max-w-md" }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}