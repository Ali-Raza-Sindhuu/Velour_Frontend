export const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="block text-sm">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-xl border border-zs-beigeLine bg-white px-3.5 py-2.5 text-sm text-zs-charcoal focus:border-zs-gold"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </label>
);
