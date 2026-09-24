import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Heart,
  MapPin,
  Package,
  UserRound,
  Lock,
  Plus,
  Trash2,
  Pencil,
  LogOut,
  CheckCircle2,
  Loader2,
  Star,
} from "lucide-react";
import { fetchWishlist } from "../../features/wishlist/wishlistThunks";
import { logout } from "../../features/auth/authSlice";
import { formatPrice } from "../../utils/price";
import { resolveImg } from "../../utils/resolveImg";
import FramedImage from "../ui/FramedImage";
import Breadcrumbs from "../ui/Breadcrumbs";
import { fetchOrders } from "../../features/orders/ordersThunks";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../api/user/userThunks";
import {
  clearProfileStatus,
  clearPasswordStatus,
  clearAddressError,
} from "../../api/user/userSlice";

const TABS = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "orders", label: "Orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "security", label: "Security", icon: Lock },
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("overview");

  const authUser = useSelector((state) => state.auth.user);
  const profile = useSelector((state) => state.user.profile);
  const user = profile || authUser;
  const orders = useSelector((state) => state.orders.orders);
  const wishlist = useSelector((state) => state.wishlist.items);
  const allProducts = useSelector((state) => state.products.items) || [];
  const savedProducts = allProducts.filter((product) => wishlist.includes(product.slug));
  const name = user?.firstName || user?.first_name || user?.name || "Fragrance lover";

  const { addresses } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchOrders());
    dispatch(fetchAddresses());
    dispatch(fetchWishlist());
  }, [dispatch]);

  return (
    <main className="min-h-screen bg-[#f5f8fc] px-5 py-24 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 rounded-[1.5rem] border border-[#dce7f2] bg-[linear-gradient(120deg,#fff_35%,#e5f5fc)] p-6 shadow-[0_14px_35px_-24px_rgba(24,70,110,.35)] sm:flex-row sm:items-end sm:p-8">
          <div>
            <Breadcrumbs items={[{ label: "My account" }]} className="mb-4" />
            <h1 className="mt-1 text-3xl font-semibold text-[#14213d]">Welcome back, {name}</h1>
            <p className="mt-2 text-sm text-[#64748b]">Manage your orders, addresses, saved products and account security.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/shops" className="rounded-xl bg-[#087cc4] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#056aaa]">
              Browse catalog
            </Link>
            <button
              onClick={() => dispatch(logout())}
              className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/70 transition hover:border-black/25 hover:text-black"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package size={18} />} label="Orders" value={orders.length} />
          <Stat icon={<Heart size={18} />} label="Saved products" value={savedProducts.length} />
          <Stat icon={<MapPin size={18} />} label="Addresses" value={addresses.length} />
        </section>

        <div className="mt-7 flex gap-2 overflow-x-auto rounded-2xl border border-[#dce7f2] bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#087cc4] text-white shadow-sm" : "text-black/55 hover:bg-[#eef7fc] hover:text-[#087cc4]"
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "overview" && <OverviewTab orders={orders} savedProducts={savedProducts} user={user} />}
          {activeTab === "orders" && <OrdersTab orders={orders} />}
          {activeTab === "addresses" && <AddressesTab addresses={addresses} />}
          {activeTab === "security" && <SecurityTab user={user} />}
        </div>
      </div>
    </main>
  );
};

/* ---------------------------- Overview tab ---------------------------- */

const OverviewTab = ({ orders, savedProducts, user }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });
  const [editing, setEditing] = useState(false);
  const { savingProfile, saveProfileError, saveProfileSuccess } = useSelector((state) => state.user);

  useEffect(() => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    });
  }, [user]);

  useEffect(() => {
    if (saveProfileSuccess) {
      setEditing(false);
      const timer = setTimeout(() => dispatch(clearProfileStatus()), 2500);
      return () => clearTimeout(timer);
    }
  }, [saveProfileSuccess, dispatch]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    dispatch(updateProfile(form));
  };

  return (
    <div className="grid gap-7 lg:grid-cols-[1.4fr_.6fr]">
      <section className="rounded-2xl bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Recent orders</h2>
        {orders.length ? (
          <div className="mt-5 divide-y divide-black/6">
            {orders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 py-4 first:pt-0"
              >
                <div>
                  <p className="font-medium">{order.id}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {new Date(order.date).toLocaleDateString()} · {order.items?.length || 0} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium">{order.status}</span>
                  <p className="mt-2 text-sm font-semibold">{formatPrice(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon={<Package size={22} />} text="You have not placed an order yet." link="Explore the collection" to="/shops" />
        )}

        <div className="mt-7 flex items-center justify-between border-t border-black/8 pt-6">
          <h2 className="text-xl font-semibold">Saved products</h2>
          <Link to="/wishlist" className="text-sm underline">View wishlist</Link>
        </div>
        {savedProducts.length ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {savedProducts.slice(0, 4).map((product) => (
              <Link key={product.slug} to={`/shop/${product.slug}`}>
                <FramedImage src={resolveImg(product.image_url)} alt={product.name} className="aspect-square w-full rounded-xl bg-[#ededed]" />
                <p className="mt-2 text-sm font-medium">{product.name}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon={<Heart size={22} />} text="Save your favourite pieces for later." link="Explore the collection" to="/shops" />
        )}
      </section>

      <aside className="h-fit rounded-2xl bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <UserRound size={18} />
          </span>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-sm text-black/45">{user?.email || "Your account details"}</p>
          </div>
        </div>

        {!editing ? (
          <div className="mt-6 space-y-3 border-t border-black/8 pt-5 text-sm">
            <Row label="First name" value={user?.firstName || "—"} />
            <Row label="Last name" value={user?.lastName || "—"} />
            <Row label="Email" value={user?.email || "—"} />
            <button
              onClick={() => setEditing(true)}
              className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 text-left transition hover:border-black/25"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-3 border-t border-black/8 pt-5 text-sm">
            <Field label="First name" name="firstName" value={form.firstName} onChange={handleChange} />
            <Field label="Last name" name="lastName" value={form.lastName} onChange={handleChange} />
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />

            {saveProfileError && <p className="text-xs text-red-600">{saveProfileError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
              >
                {savingProfile && <Loader2 size={14} className="animate-spin" />}
                {savingProfile ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-black/10 px-4 py-3 text-sm font-medium text-black/60 transition hover:border-black/25"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {saveProfileSuccess && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-600">
            <CheckCircle2 size={14} /> Profile updated
          </p>
        )}
      </aside>
    </div>
  );
};

/* ----------------------------- Orders tab ------------------------------ */

const OrdersTab = ({ orders }) => (
  <section className="rounded-2xl bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">All orders</h2>
      <Link to="/orders" className="text-sm underline">Open full order history</Link>
    </div>
    {orders.length ? (
      <div className="mt-5 divide-y divide-black/6">
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div>
              <p className="font-medium">{order.id}</p>
              <p className="mt-1 text-xs text-black/45">
                {new Date(order.date).toLocaleDateString()} · {order.items?.length || 0} item(s)
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium">{order.status}</span>
              <p className="mt-2 text-sm font-semibold">{formatPrice(order.total)}</p>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <Empty icon={<Package size={22} />} text="You have not placed an order yet." link="Explore the collection" to="/shops" />
    )}
  </section>
);

/* ---------------------------- Addresses tab ---------------------------- */

const emptyAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const AddressesTab = ({ addresses }) => {
  const dispatch = useDispatch();
  const { addressesLoading, savingAddress, addressActionError } = useSelector((state) => state.user);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddress);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const startAdd = () => {
    setForm(emptyAddress);
    setEditingId(null);
    setShowForm(true);
    dispatch(clearAddressError());
  };

  const startEdit = (address) => {
    setForm({ ...emptyAddress, ...address });
    setEditingId(address.id);
    setShowForm(true);
    dispatch(clearAddressError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = editingId
      ? await dispatch(updateAddress({ id: editingId, data: form }))
      : await dispatch(addAddress(form));

    if (!action.error) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyAddress);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Saved addresses</h2>
        {!showForm && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
          >
            <Plus size={15} /> Add address
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3 rounded-xl border border-black/10 p-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
          <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
          <Field label="Address line 1" name="line1" value={form.line1} onChange={handleChange} required className="sm:col-span-2" />
          <Field label="Address line 2 (optional)" name="line2" value={form.line2} onChange={handleChange} className="sm:col-span-2" />
          <Field label="City" name="city" value={form.city} onChange={handleChange} required />
          <Field label="State / Province" name="state" value={form.state} onChange={handleChange} required />
          <Field label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} required />
          <Field label="Country" name="country" value={form.country} onChange={handleChange} required />

          {addressActionError && (
            <p className="text-xs text-red-600 sm:col-span-2">{addressActionError}</p>
          )}

          <div className="flex gap-2 pt-1 sm:col-span-2">
            <button
              type="submit"
              disabled={savingAddress}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
            >
              {savingAddress && <Loader2 size={14} className="animate-spin" />}
              {editingId ? "Save address" : "Add address"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium text-black/60 transition hover:border-black/25"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        {addressesLoading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-black/45">
            <Loader2 size={16} className="animate-spin" /> Loading addresses...
          </p>
        ) : addresses.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <div key={address.id} className="rounded-xl border border-black/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {address.fullName}
                      {address.isDefault && (
                        <span className="flex items-center gap-1 rounded-full bg-[#c9a96e]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a7148]">
                          <Star size={10} fill="currentColor" /> Default
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-black/55">{address.phone}</p>
                    <p className="mt-2 text-sm text-black/60">
                      {address.line1}{address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city}, {address.state} {address.postalCode}
                      <br />
                      {address.country}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(address)}
                      aria-label="Edit address"
                      className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => dispatch(deleteAddress(address.id))}
                      aria-label="Delete address"
                      className="rounded-lg p-2 text-black/45 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {!address.isDefault && (
                  <button
                    onClick={() => dispatch(setDefaultAddress(address.id))}
                    className="mt-3 text-xs font-medium text-black/55 underline"
                  >
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showForm && <Empty icon={<MapPin size={22} />} text="You have not saved any addresses yet." link="Add your first address" onClick={startAdd} />
        )}
      </div>
    </section>
  );
};

/* ----------------------------- Security tab ----------------------------- */

const SecurityTab = ({ user }) => {
  const dispatch = useDispatch();
  const { changingPassword, passwordError, passwordSuccess } = useSelector((state) => state.user);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (passwordSuccess) {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      const timer = setTimeout(() => dispatch(clearPasswordStatus()), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordSuccess, dispatch]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return;
    dispatch(changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    }));
  };

  const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;

  return (
    <div className="grid gap-7 lg:grid-cols-[1.4fr_.6fr]">
      <section className="rounded-2xl bg-white p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-black/50">Use a strong password you don't use anywhere else.</p>

        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            required
            minLength={8}
          />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            error={mismatch ? "Passwords do not match" : null}
          />

          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
          {passwordSuccess && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <CheckCircle2 size={14} /> Password updated successfully
            </p>
          )}

          <button
            type="submit"
            disabled={changingPassword || mismatch}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
          >
            {changingPassword && <Loader2 size={14} className="animate-spin" />}
            {changingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      <aside className="h-fit rounded-2xl bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <Lock size={18} />
          </span>
          <div>
            <h2 className="font-semibold">Account credentials</h2>
            <p className="text-sm text-black/45">Sensitive account details</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 border-t border-black/8 pt-5 text-sm">
          <Row label="Email" value={user?.email || "—"} />
          <Row label="Account ID" value={user?.id || user?._id || "—"} />
          <Row label="Member since" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
        </div>
      </aside>
    </div>
  );
};

/* ------------------------------ Shared bits ----------------------------- */

const Stat = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-[#dce7f2] bg-white p-5 shadow-sm">
    <div className="text-[#087cc4]">{icon}</div>
    <p className="mt-4 text-2xl font-semibold text-[#14213d]">{value}</p>
    <p className="mt-1 text-sm text-[#64748b]">{label}</p>
  </div>
);

const Empty = ({ icon, text, link, to, onClick }) => (
  <div className="flex flex-col items-start gap-3 py-8 text-sm text-black/50">
    <span className="text-black/35">{icon}</span>
    <p>{text}</p>
    {to ? (
      <Link to={to} className="font-medium text-black underline">{link}</Link>
    ) : (
      <button onClick={onClick} className="font-medium text-black underline">{link}</button>
    )}
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-black/45">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const Field = ({ label, name, value, onChange, type = "text", required, minLength, error, className = "" }) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-xs font-medium text-black/55">{label}</span>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      minLength={minLength}
      className={`rounded-lg border px-3.5 py-2.5 text-sm text-black outline-none transition focus:border-black/40 ${
        error ? "border-red-400" : "border-black/12"
      }`}
    />
    {error && <span className="text-xs text-red-600">{error}</span>}
  </label>
);

export default Dashboard;
