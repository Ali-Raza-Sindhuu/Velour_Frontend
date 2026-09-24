import { BsWhatsapp } from "react-icons/bs";
import { useSelector } from "react-redux";
import { getCmsSection } from "../../utils/cms";

const DEFAULTS = {
  enabled: true,
  number: "",
  label: "Chat with us",
  message: "Hello! I have a question about IT Store.",
};

const WhatsAppCTA = () => {
  const pages = useSelector((state) => state.site.pages);
  const settings = { ...DEFAULTS, ...(getCmsSection(pages, "global_footer", "whatsapp_cta") || {}) };
  const phone = String(settings.number || "").replace(/\D/g, "");

  // Do not render a broken button before an admin has entered a WhatsApp number.
  if (!settings.enabled || !phone) return null;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(settings.message || DEFAULTS.message)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={settings.label || DEFAULTS.label}
      title={settings.label || DEFAULTS.label}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.4)] transition hover:scale-105 hover:bg-[#20bd5b] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-6 sm:right-6"
    >
      <BsWhatsapp size={28} aria-hidden="true" />
      <span className="sr-only">{settings.label || DEFAULTS.label}</span>
    </a>
  );
};

export default WhatsAppCTA;
