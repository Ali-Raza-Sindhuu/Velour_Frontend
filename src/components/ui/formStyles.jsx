// Stripe-style form primitives shared by checkout and returns.
export const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif';

const inputBase =
  "block w-full bg-white px-4 py-2.5 text-[15px] text-[#1a1a1a] placeholder:text-[#a3a3a8] outline-none transition " +
  "focus:relative focus:z-10 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 disabled:bg-[#fafafa] disabled:text-[#6b6b73]";
export const inputSingle = inputBase + " rounded-xl border border-[#e3e3e6] shadow-sm";
// Stacked fields share borders, like Stripe's address element.
export const inputGrouped = inputBase + " -mt-px border border-[#e3e3e6] first:mt-0 first:rounded-t-xl last:rounded-b-xl";
export const cardBox = "rounded-xl border border-[#e3e3e6] shadow-sm";
export const primaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[15px] font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-105 disabled:cursor-default disabled:from-[#3a3a3f] disabled:to-[#3a3a3f] disabled:hover:shadow-md";
export const secondaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-[#1a1a1a] shadow-[0_0_0_1px_#e3e3e6] transition hover:shadow-[0_0_0_1px_#c9c9ce] disabled:opacity-50";

export const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#4a4a55]">
    {children}
  </label>
);

export const SectionTitle = ({ children }) => <h2 className="mb-3 text-[15px] font-semibold text-[#1a1a1a]">{children}</h2>;

export const ErrorNote = ({ children }) =>
  children ? (
    <p role="alert" className="mt-3 rounded-xl bg-[#fdf2f4] px-3 py-2.5 text-[13px] text-[#c01a3b]">
      {children}
    </p>
  ) : null;
