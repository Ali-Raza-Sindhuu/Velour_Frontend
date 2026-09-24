import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole, ArrowUpRight } from "lucide-react";
import axios from "axios";
import { apiBaseUrl } from "../../api/apiClient";
import { Button } from "./components/ui/Button";
import { FormField, TextInput } from "./components/ui/FormField";
import { isAdminSignedIn, setAdminSession } from "./auth/adminSession";
import logo from "../../assets/almina-logo.svg";
import "./admin-theme.css";

const safeNext = (value) => (/^\/adminDashboard(\/|\?|$)/.test(value || "") ? value : "/adminDashboard");

export const AdminLogin = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(params.get("expired") ? "Your session ended. Please sign in again." : "");
  const [busy, setBusy] = useState(false);

  if (isAdminSignedIn()) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(`${apiBaseUrl}/auth/admin/login`, form);
      setAdminSession({ token: data.token, user: data.user });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="zs-root admin-login-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
      <main className="admin-login-card grid w-full max-w-5xl overflow-hidden bg-white">
        <aside className="admin-login-art">
          <img src={logo} alt="Almina" className="admin-login-logo" />
          <div className="admin-login-art-copy">
            <span>THE ALMINA STUDIO</span>
            <h1>Make room<br/>for <em>everyday.</em></h1>
            <p>Clothing, collections and customer care — all in one place.</p>
          </div>
          <div className="admin-login-art-foot"><span>ALMINA / CLOTHING</span><span>01 — 26</span></div>
        </aside>
        <section className="admin-login-form-wrap">
          <div className="admin-login-mobile-brand"><img src={logo} alt="Almina" /></div>
          <span className="admin-login-eyebrow">STORE MANAGEMENT</span>
          <h2 className="zs-display mt-3 text-3xl font-medium text-zs-charcoal">Welcome back</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zs-charcoal/55">Sign in to manage your products, orders and Almina storefront.</p>

          <form onSubmit={submit} className="admin-login-form mt-8">
            {error ? <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p> : null}
            <FormField label="Email address" htmlFor="admin-email" required>
              <TextInput id="admin-email" type="email" autoComplete="username" required autoFocus value={form.email} onChange={set("email")} />
            </FormField>
            <FormField label="Password" htmlFor="admin-password" required>
              <TextInput id="admin-password" type="password" autoComplete="current-password" required value={form.password} onChange={set("password")} />
            </FormField>
            <Button type="submit" variant="primary" icon={LockKeyhole} loading={busy} className="mt-3 w-full justify-center">
              Sign in to dashboard
            </Button>
          </form>

          <a href="/" className="admin-login-back mt-7 inline-flex items-center gap-2 text-xs font-medium text-zs-charcoal/55 transition hover:text-zs-charcoal">
            Return to storefront <ArrowUpRight size={14} />
          </a>
        </section>
      </main>
    </div>
  );
};

export default AdminLogin;
