import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../features/auth/authThunks";

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await dispatch(resetPassword({ token, password }));
    setLoading(false);

    if (resetPassword.rejected.match(result)) {
      setError(result.payload?.message || "Unable to reset your password. The link may have expired.");
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/"), 2500);
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-medium text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a new password for your IT Store account.</p>
        </div>

        {success ? (
          <p role="status" className="text-center text-sm font-medium text-green-700">
            Your password has been reset. Redirecting you to sign in...
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/" className="font-medium text-gray-900 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </section>
  );
};

export default ResetPassword;
