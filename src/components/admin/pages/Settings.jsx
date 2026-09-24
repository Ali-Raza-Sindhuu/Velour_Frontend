import { useEffect, useState } from "react";
import { User, KeyRound, Store, Truck, Percent, Bell, Undo2, Boxes } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { FormField, TextArea, TextInput } from "../components/ui/FormField";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { getSettings, saveSettings, getAdminProfile as getProfileRequest, updateAdminProfile as updateProfileRequest, changeAdminPassword as changePasswordRequest } from "../api/adminService";

const SectionCard = ({ icon: Icon, title, description, children, onSubmit, saving }) => (
  <form onSubmit={onSubmit} className="flex flex-col rounded-3xl border border-zs-beigeLine bg-white shadow-sm">
    <header className="flex items-start gap-3.5 border-b border-zs-beigeLine px-6 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-gold/15 text-zs-gold">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <h2 className="zs-display text-base font-semibold leading-tight text-zs-charcoal">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-snug text-zs-charcoal/55">{description}</p> : null}
      </div>
    </header>

    <div className="flex-1 px-6 pb-2 pt-5">{children}</div>

    <footer className="flex justify-end rounded-b-3xl border-t border-zs-beigeLine bg-zs-beige/30 px-6 py-3.5">
      <Button type="submit" variant="gold" loading={saving}>{saving ? "Savingâ€¦" : "Save changes"}</Button>
    </footer>
  </form>
);

const GroupHeading = ({ title, description }) => (
  <div className="mb-4 mt-10 first:mt-0">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-zs-charcoal/45">{title}</h2>
    {description ? <p className="mt-1 text-sm text-zs-charcoal/50">{description}</p> : null}
  </div>
);

// The whole row is the switch, so the label and the knob can never disagree
// and there is no button-inside-label double toggling. The track has equal
// 2px padding on both sides, so the knob sits centred in both positions.
const Toggle = ({ label, description, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zs-beigeLine px-4 py-3.5 text-left transition-colors hover:bg-zs-beige/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zs-gold"
  >
    <span className="min-w-0">
      <span className="block text-sm font-medium text-zs-charcoal">{label}</span>
      {description ? <span className="mt-0.5 block text-xs text-zs-charcoal/50">{description}</span> : null}
    </span>
    <span
      aria-hidden="true"
      className={"flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 " + (checked ? "bg-zs-gold" : "bg-zs-charcoal/20")}
    >
      <span className={"h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 " + (checked ? "translate-x-5" : "translate-x-0")} />
    </span>
  </button>
);

export const Settings = () => {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [form, setForm] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => { setForm(s); setLoading(false); });
    getProfileRequest().then((res) => setProfile(res.user)).catch(() => {});
  }, []);

  const save = (section) => async (e) => {
    e.preventDefault();
    setSaving(section);
    try {
      await saveSettings(section, form[section]);
      push("Settings saved.", "success");
    } catch {
      push("Couldn't save settings.", "error");
    } finally {
      setSaving("");
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await updateProfileRequest({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email });
      setProfile(res.user);
      push("Account details updated.", "success");
    } catch (err) {
      push(err.response?.data?.message || "Couldn't update account details.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      push("New password and confirmation don't match.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      push("New password must be at least 8 characters.", "error");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePasswordRequest({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      push("Password changed.", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      push(err.response?.data?.message || "Couldn't change password.", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const update = (section, key, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));

  if (loading || !form) {
    return (
      <div>
        <PageHeader title="Settings" description="Store details, shipping, tax, payment accounts and notifications." />
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-zs-beige" />)}</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Store details, shipping, tax, payment accounts and notifications." />

      <GroupHeading title="Your account" />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard icon={User} title="Account & credentials" description="Your own admin login â€” name, email, and password." onSubmit={saveProfile} saving={profileSaving}>
          {profile ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First name" htmlFor="p-first" required>
                  <TextInput id="p-first" required value={profile.firstName || ""} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                </FormField>
                <FormField label="Last name" htmlFor="p-last" required>
                  <TextInput id="p-last" required value={profile.lastName || ""} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Login email" htmlFor="p-email" hint="Used to sign in to this admin panel." required>
                <TextInput id="p-email" type="email" required value={profile.email || ""} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </FormField>
            </>
          ) : (
            <div className="h-24 animate-pulse rounded-xl bg-zs-beige" />
          )}
        </SectionCard>

        <SectionCard icon={KeyRound} title="Change password" description="Requires your current password to confirm it's you." onSubmit={savePassword} saving={passwordSaving}>
          <FormField label="Current password" htmlFor="pw-current" required>
            <TextInput id="pw-current" type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} />
          </FormField>
          <FormField label="New password" htmlFor="pw-new" hint="At least 8 characters." required>
            <TextInput id="pw-new" type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} />
          </FormField>
          <FormField label="Confirm new password" htmlFor="pw-confirm" required>
            <TextInput id="pw-confirm" type="password" required value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
          </FormField>
        </SectionCard>
      </div>

      <GroupHeading title="Store" description="What customers see and pay at checkout." />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard icon={Store} title="Store details" description='Shown on invoices, order emails, and the public Contact page ("Visit Us").' onSubmit={save("store")} saving={saving === "store"}>
          <FormField label="Store name" htmlFor="s-name" required>
            <TextInput id="s-name" required value={form.store.name} onChange={(e) => update("store", "name", e.target.value)} />
          </FormField>
          <FormField label="Support email" htmlFor="s-email" required>
            <TextInput id="s-email" type="email" required value={form.store.supportEmail} onChange={(e) => update("store", "supportEmail", e.target.value)} />
          </FormField>
          <FormField label="Phone" htmlFor="s-phone">
            <TextInput id="s-phone" value={form.store.phone} onChange={(e) => update("store", "phone", e.target.value)} />
          </FormField>
          <FormField label="Address" htmlFor="s-address">
            <TextInput id="s-address" value={form.store.address} onChange={(e) => update("store", "address", e.target.value)} />
          </FormField>
        </SectionCard>

        <SectionCard icon={Truck} title="Shipping" description="Flat-rate delivery and free-shipping threshold." onSubmit={save("shipping")} saving={saving === "shipping"}>
          <FormField label="Flat shipping rate (PKR)" htmlFor="sh-rate">
            <TextInput id="sh-rate" type="number" min="0" value={form.shipping.flatRate} onChange={(e) => update("shipping", "flatRate", Number(e.target.value))} />
          </FormField>
          <FormField label="Free shipping over (PKR)" htmlFor="sh-threshold" hint="Set to 0 to disable free shipping.">
            <TextInput id="sh-threshold" type="number" min="0" value={form.shipping.freeThreshold} onChange={(e) => update("shipping", "freeThreshold", Number(e.target.value))} />
          </FormField>
          <div className="mb-4"><Toggle label="Allow cash on delivery" description="Customers can pay when the order arrives." checked={form.shipping.codEnabled} onChange={(v) => update("shipping", "codEnabled", v)} /></div>
        </SectionCard>

        <SectionCard icon={Percent} title="Tax" description="Applied at checkout across all orders." onSubmit={save("tax")} saving={saving === "tax"}>
          <FormField label="Tax rate (%)" htmlFor="t-percent">
            <TextInput id="t-percent" type="number" min="0" step="0.1" value={form.tax.taxPercent} onChange={(e) => update("tax", "taxPercent", Number(e.target.value))} />
          </FormField>
          <div className="mb-4"><Toggle label="Prices are tax-inclusive" description="Tax is already included in product prices." checked={form.tax.taxInclusive} onChange={(v) => update("tax", "taxInclusive", v)} /></div>
        </SectionCard>

        <SectionCard icon={Undo2} title="Returns policy" description="Used by the returns page, emails and automatic expiry." onSubmit={save("returns")} saving={saving === "returns"}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Return window (days)" htmlFor="r-window" hint="Counted from delivery.">
              <TextInput id="r-window" type="number" min="1" max="365" value={form.returns.windowDays} onChange={(e) => update("returns", "windowDays", Number(e.target.value))} />
            </FormField>
            <FormField label="Ship back within (days)" htmlFor="r-shipby" hint="After approval; then it expires.">
              <TextInput id="r-shipby" type="number" min="1" max="90" value={form.returns.shipByDays} onChange={(e) => update("returns", "shipByDays", Number(e.target.value))} />
            </FormField>
          </div>
          <FormField label="Return address" htmlFor="r-address" hint="Shown to customers only after you approve their return.">
            <TextArea id="r-address" className="min-h-[80px]" placeholder={"Almina Returns\nStreet, Area\nCity, Postal code\nPhone"} value={form.returns.returnAddress} onChange={(e) => update("returns", "returnAddress", e.target.value)} />
          </FormField>
          <FormField label="Packing instructions" htmlFor="r-instructions">
            <TextArea id="r-instructions" className="min-h-[70px]" value={form.returns.instructions} onChange={(e) => update("returns", "instructions", e.target.value)} />
          </FormField>
          <FormField label="Store credit bonus (%)" htmlFor="r-bonus" hint="Extra value when customers choose store credit instead of a refund. 0 to turn off.">
            <TextInput id="r-bonus" type="number" min="0" max="50" value={form.returns.storeCreditBonusPercent} onChange={(e) => update("returns", "storeCreditBonusPercent", Number(e.target.value))} />
          </FormField>
        </SectionCard>

        <SectionCard icon={Boxes} title="Inventory" description="How long unpaid orders hold stock, and when a product counts as low." onSubmit={save("inventory")} saving={saving === "inventory"}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unpaid order hold (minutes)" htmlFor="i-hold" hint="An online order still unpaid after this is cancelled and its stock goes back on sale. 10â€“1440.">
              <TextInput id="i-hold" type="number" min="10" max="1440" value={form.inventory.unpaidHoldMinutes} onChange={(e) => update("inventory", "unpaidHoldMinutes", Number(e.target.value))} />
            </FormField>
            <FormField label="Low stock at (units)" htmlFor="i-low" hint="Products with this many available or fewer are flagged.">
              <TextInput id="i-low" type="number" min="0" value={form.inventory.lowStockThreshold} onChange={(e) => update("inventory", "lowStockThreshold", Number(e.target.value))} />
            </FormField>
          </div>
        </SectionCard>
      </div>

      <GroupHeading title="Alerts" />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SectionCard icon={Bell} title="Notifications" description="Control which emails your team receives." onSubmit={save("notifications")} saving={saving === "notifications"}>
          <div className="mb-4 space-y-3">
            <Toggle label="New order emails" description="Get an email when a customer places an order." checked={form.notifications.orderEmails} onChange={(v) => update("notifications", "orderEmails", v)} />
            {form.notifications.orderEmails && (
              <FormField
                label="Send order emails to"
                htmlFor="n-order-email"
                hint={`The inbox that receives every new order. Leave empty to use the support email${form.store.supportEmail ? ` (${form.store.supportEmail})` : ""}.`}
              >
                <TextInput
                  id="n-order-email"
                  type="email"
                  placeholder={form.store.supportEmail || "owner@example.com"}
                  value={form.notifications.orderEmailRecipient || ""}
                  onChange={(e) => update("notifications", "orderEmailRecipient", e.target.value.trim())}
                />
              </FormField>
            )}
            <Toggle label="Low stock alerts" description="Get warned when a product is running low." checked={form.notifications.lowStockAlerts} onChange={(v) => update("notifications", "lowStockAlerts", v)} />
            <Toggle label="Marketing performance emails" description="Periodic summaries of promotions and campaigns." checked={form.notifications.marketingEmails} onChange={(v) => update("notifications", "marketingEmails", v)} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

