import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-zs-charcoal text-white hover:bg-zs-charcoalSoft",
  gold: "bg-zs-gold text-white hover:bg-zs-gold/90",
  secondary: "border border-zs-beigeLine bg-white text-zs-charcoal hover:bg-zs-beige/50",
  ghost: "text-zs-charcoal/70 hover:bg-zs-beige",
  danger: "bg-zs-danger text-white hover:bg-zs-danger/90",
};

export const Button = ({ variant = "primary", icon: Icon, loading = false, disabled, children, className = "", ...props }) => (
  <button
    {...props}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${className}`}
  >
    {loading ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : Icon ? <Icon size={16} strokeWidth={2} /> : null}
    {children}
  </button>
);