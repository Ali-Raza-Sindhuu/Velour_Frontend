import { useState } from "react";
import { useSelector } from "react-redux";
import HeroSection from "../components/sections/HeroSection";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { BsFacebook, BsInstagram, BsTwitter } from "react-icons/bs";
import { getCmsSection, useCmsReady } from "../utils/cms";
import { resolveImg } from "../utils/resolveImg";
import FramedImage from "../components/ui/FramedImage";
import HoverAccordion from "../components/ui/HoverAccordion";
import { submitContactRequest } from "../api/contactApi";

const fallbackContactImage = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const pages = useSelector((state) => state.site.pages);
  const cmsReady = useCmsReady();
  const storeInfo = useSelector((state) => state.site.storeInfo);
  // Editable from the admin Website Editor -> Contact page (heading/subtitle)
 const formText = getCmsSection(pages, "contact", "form_text") || {};
  // Editable from admin Settings -> Store details (name/email/phone/address) â€”
  // this is the actual source of truth for "Visit Us"; CMS "info" section is
  // kept only as a fallback for anything Settings hasn't been filled in yet.
  const info = getCmsSection(pages, "contact", "info") || {};
  const faqsContent = getCmsSection(pages, "contact", "faqs");
  const FAQS = (faqsContent?.faqs || []).map((f) => ({ q: f.question, a: f.answer }));

  const INFO = [
    { icon: <Mail size={18} strokeWidth={1.5} />, label: "Email Us", value: storeInfo.supportEmail || info.email || "support@itstore.pk", sub: info.emailSub || "We reply within 24 hours" },
    { icon: <Phone size={18} strokeWidth={1.5} />, label: "Call Us", value: storeInfo.phone || info.phone || "+92 300 000 0000", sub: info.phoneSub || "Monâ€“Fri, 9am to 6pm" },
    { icon: <MapPin size={18} strokeWidth={1.5} />, label: "Visit Us", value: storeInfo.address || info.address || "Lahore, Pakistan", sub: info.addressSub || "By appointment only" },
  ];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(false);
    setError("");
    setSending(true);
    try {
      await submitContactRequest(form);
      setSubmitted(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fashion-contact-page bg-white">
      <HeroSection
  mode="contact"
  ready={cmsReady}
  image={cmsReady ? resolveImg(formText.image) : ""}
  imagePosition={formText.imagePosition || "center center"}
  mobileImagePosition={formText.mobileImagePosition || "90% 22%"}
  badge={{ label: formText.badgeLabel || "Hello", text: formText.badgeText || "We'd love to hear from you" }}
  heading={formText.title || "Let's start a conversation"}
  subtext={formText.subtitle || "Have a question, collaboration idea, or just want to say hi? Our team is here to help."}
  primaryLabel={formText.primaryLabel || "Send a Message"}
  secondaryLabel={formText.secondaryLabel || "Visit Our Store"}
/>

      <section className="page-section bg-[#f8f8f8]">
        <div className="page-inner">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 lg:mb-14 lg:flex-row lg:items-end">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] sm:text-[11px]">
                ALMINA - GET IN TOUCH
              </span>
              <h2 className="mt-3 font-display text-pretty text-[clamp(2rem,4vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-black">
                Let's start a conversation
              </h2>
            </div>
            <p className="max-w-xs pb-1 text-sm leading-relaxed text-black/50">
              Questions about an order, a new collection or finding the right fit? Our team is here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="relative min-h-[420px] overflow-hidden rounded-[24px] sm:min-h-[520px] lg:min-h-[640px]">
              <FramedImage
                src={resolveImg(info.image) || fallbackContactImage}
                alt={info.imageAlt || "Contact Almina"}

                className="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/5" />

              <div className="absolute left-4 top-4 z-10 flex flex-col items-center sm:left-6 sm:top-6">
                <div className="h-3 w-px bg-black/30" />
                <div className="mt-0 flex items-center gap-2 rounded-sm border border-black/10 bg-[#f8f8f8] px-3 py-2 shadow-md sm:px-4">
                  <span className="h-2 w-2 rounded-full border border-black/40" />
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-black/70 sm:text-[10px]">
                    IT STORE Â· Lahore, PK
                  </span>
                </div>
              </div>

              <div className="absolute right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6 lg:flex-col">
                {[BsInstagram, BsTwitter, BsFacebook].map((Icon, i) => (
                  <button
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition-all duration-300 hover:bg-white hover:text-black"
                  >
                    <Icon size={16} strokeWidth={1.5} />
                  </button>
                ))}
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-3 sm:bottom-6 sm:left-6 sm:right-6">
                {INFO.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-2xl border border-black/6 bg-white/95 p-3 backdrop-blur sm:p-4"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black text-white">
                      {item.icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-black/30">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-black sm:text-base">
                        {item.value}
                      </span>
                      <span className="text-xs text-black/40">{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[24px] border border-black/6 bg-white p-5 sm:p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-6 sm:gap-7">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField index="01" label="Your name" name="name" value={form.name} onChange={handleChange} placeholder="First & last name" />
                  <FormField index="02" label="Email address" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" />
                </div>

                <FormField index="03" label="Subject" name="subject" value={form.subject} onChange={handleChange} placeholder="What's this about?" />

                <FormArea index="04" label="Message" name="message" value={form.message} onChange={handleChange} placeholder="Tell us more..." rows={5} />

                <button type="submit" disabled={sending} className="group mt-1 flex items-center justify-between border-t border-black/10 pt-5 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="font-display text-xl font-medium text-black sm:text-2xl">
                    {sending ? "Sendingâ€¦" : "Send message"}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition-colors duration-300 group-hover:bg-[#c9a96e] sm:h-12 sm:w-12">
                    <Send size={16} />
                  </span>
                </button>
                {submitted && (
                  <p role="status" className="text-sm text-green-700">
                    Thanks â€” your message is ready to send. Connect this form to the backend to deliver it.
                  </p>
                )}
              </div>
            </form>
            {error && <p id="contact-error" role="alert" className="text-sm text-red-700">{error}</p>}
          </div>
        </div>
      </section>

      <section className="page-section bg-white">
        <div className="page-inner">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:mb-10 lg:flex-row lg:items-end">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#c9a96e] sm:text-[11px]">
                Frequently asked
              </span>
              <h2 className="mt-3 font-display text-pretty text-[clamp(2rem,4vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-black">
                Questions we get asked often
              </h2>
            </div>
          </div>

          {FAQS.length ? (
            <HoverAccordion items={FAQS} />
          ) : (
            <p className="py-4 text-sm text-black/50">FAQs will be available soon.</p>
          )}
        </div>
      </section>
    </div>
  );
};

const FormField = ({ index, label, ...props }) => (
  <div className="flex flex-col gap-2 border-b border-black/10 pb-3 transition-colors duration-300 focus-within:border-[#c9a96e]">
    <label className="flex items-baseline gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-black/35">
      <span className="text-[#c9a96e]">{index}</span>
      {label}
    </label>
    <input
      {...props}
      required={props.name !== "subject"}
      className="w-full bg-transparent py-1 text-base text-black outline-none placeholder:text-black/25"
    />
  </div>
);

const FormArea = ({ index, label, ...props }) => (
  <div className="flex min-h-[160px] flex-1 flex-col gap-2 border-b border-black/10 pb-3 transition-colors duration-300 focus-within:border-[#c9a96e]">
    <label className="flex items-baseline gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-black/35">
      <span className="text-[#c9a96e]">{index}</span>
      {label}
    </label>
    <textarea
      {...props}
      required
      className="h-full w-full resize-none bg-transparent py-1 text-base text-black outline-none placeholder:text-black/25"
    />
  </div>
);

export default Contact;




