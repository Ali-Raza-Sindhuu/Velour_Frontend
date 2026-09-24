import { Instagram, Facebook, Twitter } from "lucide-react";

const FOOTER_LINKS = [
  {
    heading: "Shop",
    links: ["Women", "Men", "Kids", "New Arrivals", "Sale"],
  },
  {
    heading: "Help",
    links: ["Contact Us", "Shipping & Returns", "Size Guide", "FAQs"],
  },
  {
    heading: "Company",
    links: ["About VÉRA", "Careers", "Sustainability", "Press"],
  },
];

const SOCIALS = [
  { label: "Instagram", icon: Instagram, href: "#" },
  { label: "Facebook", icon: Facebook, href: "#" },
  { label: "Twitter", icon: Twitter, href: "#" },
];

export default function Footer({ year = new Date().getFullYear() }) {
  return (
    <footer className="bg-[#111111] text-white">
      <div className="container py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        {/* Brand column */}
        <div className="col-span-2">
          <span className="font-display text-2xl tracking-[0.15em] font-semibold block mb-4">
            VÉRA
          </span>
          <p className="text-sm text-white/60 max-w-xs mb-6">
            Considered clothing for everyday movement — designed to last,
            made to be worn.
          </p>
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {FOOTER_LINKS.map((col) => (
          <div key={col.heading}>
            <h4 className="text-sm font-medium mb-4">{col.heading}</h4>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <span>© {year} VÉRA. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}