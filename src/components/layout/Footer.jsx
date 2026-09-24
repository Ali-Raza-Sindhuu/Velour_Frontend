import { useState } from "react";
import {
  BsFacebook,
  BsInstagram,
  BsTwitter,
  BsYoutube,
  BsLinkedin,
  BsPinterest,
  BsTiktok,
  BsWhatsapp,
} from "react-icons/bs";
import { Globe, ShieldCheck, Truck, RotateCcw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { subscribeNewsletterRequest } from "../../api/newsletterApi";
import { getCmsSection } from "../../utils/cms";
import { resolveImg } from "../../utils/resolveImg";
import logo from "../../assets/almina-logo.svg";

const shopLinks = [
  { name: "Shop clothing", path: "/shops" },
  { name: "Wishlist", path: "/wishlist" },
];

const companyLinks = [
  { name: "About Us", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const supportLinks = [
  { name: "FAQ", path: "/faq" },
  { name: "Shipping & Returns", path: "/shipping-returns" },
  { name: "Start a Return", path: "/returns" },
  { name: "My Orders", path: "/orders" },
];

const legalLinks = [
  { name: "Privacy Policy", path: "/privacy-policy" },
  { name: "Terms of Use", path: "/terms-of-service" },
  { name: "Cookie Settings", path: "/cookie-settings" },
];

const trustPoints = [
  { icon: "shipping", Icon: Truck, label: "Complimentary delivery on qualifying orders" },
  { icon: "returns", Icon: RotateCcw, label: "Easy returns on eligible orders" },
  { icon: "secure", Icon: ShieldCheck, label: "Secure checkout, every time" },
];

const TRUST_ICONS = {
  shipping: Truck,
  returns: RotateCcw,
  secure: ShieldCheck,
};

// Maps whatever platform name an admin types in the Website Editor to an
// icon. Unrecognized platforms still render (with a generic globe icon)
// instead of silently disappearing.
const SOCIAL_ICONS = {
  instagram: BsInstagram,
  facebook: BsFacebook,
  twitter: BsTwitter,
  x: BsTwitter,
  youtube: BsYoutube,
  linkedin: BsLinkedin,
  pinterest: BsPinterest,
  tiktok: BsTiktok,
  whatsapp: BsWhatsapp,
};

const DEFAULT_SOCIALS = [
  { platform: "Instagram", url: "" },
  { platform: "Twitter", url: "" },
  { platform: "Facebook", url: "" },
  { platform: "YouTube", url: "" },
];

const FooterLinkList = ({ title, links }) => (
  <div className="flex flex-col gap-4">
    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
      {title}
    </p>
    <ul className="flex flex-col gap-3 text-sm text-white/65">
      {links.map((link) => (
        <li key={link.path}>
          <Link
            to={link.path}
            className="inline-block transition-colors duration-200 hover:text-[#c9a96e]"
          >
            {link.name}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const pages = useSelector((state) => state.site.pages);
  const storeInfo = useSelector((state) => state.site.storeInfo);

  // Editable from admin Website Editor -> Global Footer page.
  const brand = getCmsSection(pages, "global_footer", "brand") || {};
  const newsletter = getCmsSection(pages, "global_footer", "newsletter") || {};
  const socialsContent = getCmsSection(pages, "global_footer", "socials");
  const copyright = getCmsSection(pages, "global_footer", "copyright") || {};
  const trustBar = getCmsSection(pages, "global_footer", "trust_bar") || {};

  // An explicitly empty CMS list means the admin intentionally removed every
  // icon. Only use defaults before the CMS section exists at all.
  const socials = Array.isArray(socialsContent?.socials)
    ? socialsContent.socials.slice(0, 4)
    : DEFAULT_SOCIALS;
  const brandName = storeInfo?.name || "Almina";
  const brandLogo = brand.logo_image ? resolveImg(brand.logo_image) : logo;
  const editableTrustPoints = Array.isArray(trustBar.trustPoints) && trustBar.trustPoints.length
    ? trustBar.trustPoints.map((point, index) => ({
      ...point,
      Icon: TRUST_ICONS[point.icon] || trustPoints[index]?.Icon || ShieldCheck,
    }))
    : trustPoints;

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await subscribeNewsletterRequest(email.trim());
      setStatus("success");
      setMessage(response.data?.message || "You're subscribed!");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(
        err.code === "ECONNABORTED"
          ? "The server took too long to respond. Please try again shortly."
          : err.response?.data?.message || "We couldn't subscribe you right now. Please try again."
      );
    }
  };

  return (
    <footer className="fashion-footer bg-[#081526] text-white">
      <div className="fashion-footer-manifesto page-x"><div className="page-inner"><div><span>MADE TO BE WORN</span><span>MADE TO BE YOURS</span></div><p>BEYOND<br/>THE EVERYDAY</p></div></div>
      {/* Trust bar â€” quick reassurance strip, sits right above the footer content */}
      <div className="page-x border-b border-white/10 py-6">
        <div className="page-inner flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-12 sm:gap-y-3">
          {editableTrustPoints.map(({ Icon, label }, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-3 text-white/60">
              <Icon size={16} strokeWidth={1.5} className="shrink-0 text-[#c9a96e]" />
              <span className="text-xs tracking-wide sm:text-[13px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page-x py-14 sm:py-16">
        <div className="page-inner flex flex-col gap-14">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Brand + newsletter */}
            <div className="flex flex-col gap-7 lg:col-span-5">
              <div className="flex flex-col gap-3">
                <div className="relative h-14 w-[148px] overflow-hidden sm:h-16 sm:w-[170px]">
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className="absolute left-1/2 top-1/2 w-[156px] max-w-none -translate-x-1/2 -translate-y-[52%] sm:w-[180px]"
                  />
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-white/50">
                  {brand.tagline ||
                    "Considered clothing for everyday living, made to feel like you."}
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <p className="font-display text-base font-medium text-white sm:text-lg">
                  {newsletter.title || "Stay in the loop"}
                </p>
                <p className="text-sm leading-relaxed text-white/45">
                  {newsletter.subtitle ||
                    "Get first access to new collections, thoughtful edits and studio notes."}
                </p>

                <form onSubmit={handleSubscribe} className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={newsletter.placeholder || "your@email.com"}
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#c9a96e]/60"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="group flex items-center justify-center gap-2 rounded-xl bg-[#c9a96e] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#d9bd88] disabled:opacity-60"
                  >
                    {status === "loading" ? "Subscribing..." : newsletter.buttonLabel || "Subscribe"}
                    {status !== "loading" && (
                      <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    )}
                  </button>
                </form>
                {message && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      status === "error"
                        ? "border-red-400/40 bg-red-500/15 text-red-200"
                        : "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:border-l lg:border-white/10 lg:pl-10">
              <FooterLinkList title="Shop" links={shopLinks} />
              <FooterLinkList title="Company" links={companyLinks} />
              <div className="col-span-2 sm:col-span-1">
                <FooterLinkList title="Support" links={supportLinks} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10" />

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-white/35">
              {copyright.text || `Â© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
            </p>

            <div className="flex items-center gap-3">
              {socials.map(({ platform, url }) => {
                if (!url) return null;
                const Icon = SOCIAL_ICONS[String(platform || "").toLowerCase()] || Globe;
                return (
                  <a
                    key={`${platform}-${url}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors duration-200 hover:border-[#c9a96e]/50 hover:text-[#c9a96e]"
                  >
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/35 sm:gap-6 md:justify-end">
              {legalLinks.map((link) => (
                <Link key={link.path} to={link.path} className="transition-colors duration-200 hover:text-white/70">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;



