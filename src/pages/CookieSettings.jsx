import { useEffect, useState } from "react";
import PageHeader from "../components/layout/PageHeader";

const STORAGE_KEY = "zeescents_cookie_prefs";

const CATEGORIES = [
  {
    key: "essential",
    name: "Essential",
    locked: true,
    description: "Required for the site to function — keeping you signed in, remembering your cart, and securing checkout. These can't be turned off.",
  },
  {
    key: "analytics",
    name: "Analytics",
    locked: false,
    description: "Help us understand how visitors browse and shop so we can improve the site. No data is sold to third parties.",
  },
  {
    key: "marketing",
    name: "Marketing",
    locked: false,
    description: "Used to show you more relevant IT Store promotions on other sites and measure the performance of our campaigns.",
  },
];

const defaultPrefs = { essential: true, analytics: true, marketing: false };

const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
};

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
      checked ? "bg-[#c9a96e]" : "bg-black/15"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-[22px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

const CookieSettings = () => {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleToggle = (key, value) => setPrefs((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
  };

  const handleAcceptAll = () => {
    const allOn = { essential: true, analytics: true, marketing: true };
    setPrefs(allOn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allOn));
    setSaved(true);
  };

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Legal"
          breadcrumbs={[{ label: "Cookie settings" }]}
          title="Cookie Settings"
          subtitle="Choose which cookies IT Store is allowed to use on your browser."
        />

        <div className="flex flex-col gap-4">
          {CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="flex items-start justify-between gap-6 border-b border-black/10 py-5"
            >
              <div className="max-w-xl">
                <p className="text-[15px] font-medium text-black">{category.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-black/60">{category.description}</p>
              </div>
              <Toggle
                checked={prefs[category.key]}
                disabled={category.locked}
                onChange={(value) => handleToggle(category.key, value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-[13px] font-medium text-white transition hover:bg-black/85"
          >
            Save preferences
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="inline-flex items-center justify-center rounded-full border border-black/15 px-8 py-3.5 text-[13px] font-medium text-black transition hover:bg-black/5"
          >
            Accept all
          </button>
        </div>

        {saved && (
          <p role="status" className="mt-4 text-center text-sm text-green-700">
            Your cookie preferences have been saved.
          </p>
        )}
      </div>
    </section>
  );
};

export default CookieSettings;
