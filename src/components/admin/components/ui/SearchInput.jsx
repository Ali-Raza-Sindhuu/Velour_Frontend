import { Search } from "lucide-react";

export const SearchInput = ({ value, onChange, placeholder = "Search…", label = "Search" }) => (
  <label className="relative block w-full sm:w-72">
    <span className="sr-only">{label}</span>
    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zs-charcoal/40" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-zs-beigeLine bg-white py-2.5 pl-10 pr-3.5 text-sm text-zs-charcoal placeholder:text-zs-charcoal/40 focus:border-zs-gold"
    />
  </label>
);
