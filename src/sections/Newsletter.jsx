import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Newsletter({
  heading = "Join The VÉRA List",
  subheading = "Be first to know about new drops, exclusive offers, and style edits — straight to your inbox.",
  onSubmit,
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitted

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    onSubmit?.(email);
    setStatus("submitted");
    setEmail("");
  };

  return (
    <section className="bg-[#F5F3EF]">
      <div className="container py-20 max-w-xl text-center">
        <h2 className="font-sans font-semibold text-3xl md:text-4xl mb-3">
          {heading}
        </h2>
        <p className="text-muted-foreground mb-8">{subheading}</p>

        {status === "submitted" ? (
          <p className="text-sm font-medium">
            You're on the list. Watch your inbox.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 sm:gap-0"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 h-12 px-4 border border-foreground bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:border-r-0"
            />
            <Button type="submit" size="lg" className="rounded-none">
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}