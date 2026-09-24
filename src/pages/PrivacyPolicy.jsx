import PageHeader from "../components/layout/PageHeader";

const SECTIONS = [
  {
    heading: "Information we collect",
    body: "When you create an account, place an order, or subscribe to our newsletter, we collect information such as your name, email address, shipping address, and phone number. We also collect order history and, where relevant, payment confirmation details — we never store your full card or mobile-wallet numbers ourselves.",
  },
  {
    heading: "How we use your information",
    body: "We use your information to process and deliver orders, provide customer support, send order and shipping updates, and — only if you've opted in — send newsletter updates about new drops and promotions. We do not sell your personal information to third parties.",
  },
  {
    heading: "Cookies and tracking",
    body: "We use cookies to keep you signed in, remember items in your cart, and understand how visitors use our site so we can improve it. You can control cookie preferences at any time from the Cookie Settings page.",
  },
  {
    heading: "Data sharing",
    body: "We share the minimum information necessary with trusted service providers — such as payment processors and delivery couriers — solely to fulfil your order. These providers are not permitted to use your data for any other purpose.",
  },
  {
    heading: "Your rights",
    body: "You can request a copy of your data, ask us to correct it, or request deletion of your account at any time by contacting our support team. You can also unsubscribe from marketing emails using the link in any newsletter we send.",
  },
  {
    heading: "Contact us",
    body: "If you have questions about this policy or how your data is handled, reach out via our Contact page and we'll get back to you within 24 hours.",
  },
];

const PrivacyPolicy = () => {
  return (
    <section className="page-section min-h-screen bg-white">
      <div className="page-inner">
        <PageHeader
          eyebrow="Legal"
          breadcrumbs={[{ label: "Privacy policy" }]}
          title="Privacy Policy"
          subtitle="Last updated September 2026 — how IT Store collects, uses, and protects your information."
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

export default PrivacyPolicy;
