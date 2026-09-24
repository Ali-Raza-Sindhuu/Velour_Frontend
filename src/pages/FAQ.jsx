import { useState } from "react";
import { ChevronDown } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";

const FAQ_SECTIONS = [
  {
    category: "Ordering",
    items: [
      {
        q: "How do I place an order?",
        a: "Browse the catalog, open a product and add it to your cart. When you're ready, proceed to checkout. You don't need an account to order.",
      },
      {
        q: "Can I change or cancel my order after placing it?",
        a: "Orders can be changed or cancelled within 1 hour of placing them. After that, they move into processing and can no longer be edited — please contact support as soon as possible.",
      },
      {
        q: "Do you offer gift cards?",
        a: "Gift cards are coming soon. Sign up for our newsletter in the footer to be notified when they launch.",
      },
    ],
  },
  {
    category: "Shipping",
    items: [
      {
        q: "How long does shipping take?",
        a: "Orders are delivered nationwide, usually within 5–7 business days of confirmation.",
      },
      {
        q: "Is shipping free?",
        a: "Orders above our free-shipping amount ship free — your bag shows how close you are. Below that, a flat delivery fee is added at checkout.",
      },
      {
        q: "Do you ship internationally?",
        a: "We currently deliver within Pakistan. Join our newsletter for updates on new delivery regions.",
      },
    ],
  },
  {
    category: "Returns",
    items: [
      {
        q: "What is your return policy?",
        a: "Unused products in their original packaging can be returned or exchanged within 30 days of delivery. Damaged, faulty or incorrect items are always covered — just add a photo when you start the return.",
      },
      {
        q: "How do I start a return?",
        a: "Go to the Returns page (linked in the footer and on your order), enter your order number and email, and choose the items. We'll email you the return address once it's approved, and you can follow every step from the link in that email.",
      },
      {
        q: "When will I get my refund?",
        a: "Once your parcel passes inspection we refund your JazzCash wallet, or — for cash on delivery orders — the JazzCash, Easypaisa or bank account you give us. It usually arrives within 5–7 business days. Prefer store credit? It's issued the moment we receive your return.",
      },
    ],
  },
  {
    category: "Products",
    items: [
      {
        q: "How do I choose the right product?",
        a: "Each product page lists its key features and specifications. If you are unsure, contact us and our team will help you find the right device or accessory.",
      },
    ],
  },
];

const AccordionItem = ({ item, isOpen, onToggle }) => (
  <div className="border-b border-black/10">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-4 py-5 text-left"
    >
      <span className="text-[15px] font-medium text-black">{item.q}</span>
      <ChevronDown
        size={18}
        className={`shrink-0 text-black/50 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
    <div
      className={`grid overflow-hidden transition-all duration-300 ${
        isOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <p className="max-w-2xl text-sm leading-relaxed text-black/60">{item.a}</p>
      </div>
    </div>
  </div>
);

const FAQ = () => {
  const [openKey, setOpenKey] = useState(null);

  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Support"
          breadcrumbs={[{ label: "FAQ" }]}
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about ordering, delivery, returns, and choosing the right technology."
        />

        <div className="flex flex-col gap-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7148]">
                {section.category}
              </h2>
              <div>
                {section.items.map((item, i) => {
                  const key = `${section.category}-${i}`;
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={openKey === key}
                      onToggle={() => setOpenKey(openKey === key ? null : key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
