import PageHeader from "../components/layout/PageHeader";

const SECTIONS = [
  {
    heading: "Acceptance of terms",
    body: "By accessing or using the IT Store website, placing an order, or creating an account, you agree to be bound by these Terms of Service. If you do not agree, please do not use the site.",
  },
  {
    heading: "Orders and payment",
    body: "All orders are subject to acceptance and availability. Prices are shown in PKR and may change without notice, though confirmed orders are honored at the price paid. We reserve the right to cancel any order suspected of fraud or error.",
  },
  {
    heading: "Shipping and delivery",
    body: "Delivery timeframes shown at checkout are estimates, not guarantees. Risk of loss and title for products pass to you upon delivery to the shipping carrier.",
  },
  {
    heading: "Returns and refunds",
    body: "Unopened items in their original, sealed packaging may be returned or exchanged within 30 days of delivery. Items that arrive damaged, leaking or incorrect are covered regardless of condition. Returns must be requested through our Returns page and approved before being sent back. Refunds are issued to the original payment method (or, for cash on delivery orders, to an account you provide) once the return is received and inspected, or as store credit if you choose. Items marked as final sale cannot be returned. See our Shipping & Returns page for full details.",
  },
  {
    heading: "Account responsibilities",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us immediately if you suspect unauthorized use.",
  },
  {
    heading: "Intellectual property",
    body: "All content on this site — including product photography, branding, and text — is the property of IT Store and may not be reproduced without permission.",
  },
  {
    heading: "Limitation of liability",
    body: "IT Store is not liable for indirect, incidental, or consequential damages arising from use of the site or products, to the fullest extent permitted by law.",
  },
  {
    heading: "Changes to these terms",
    body: "We may update these Terms of Service from time to time. Continued use of the site after changes are posted constitutes acceptance of the revised terms.",
  },
];

const TermsOfService = () => {
  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Legal"
          breadcrumbs={[{ label: "Terms of service" }]}
          title="Terms of Service"
          subtitle="Last updated September 2026 — the terms governing your use of IT Store."
        />

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a7148]">
                {section.heading}
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-black/60 sm:text-base">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TermsOfService;
