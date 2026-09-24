import { useState } from "react";
import { useDispatch } from "react-redux";
import { openLogin } from "../../store/slice/Uislice";
import { forgotPassword } from "../../features/auth/authThunks";

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await dispatch(forgotPassword(email));
    setLoading(false);

    if (forgotPassword.rejected.match(result)) {
      setError(result.payload?.message || "Unable to send reset instructions.");
      return;
    }
    setSent(true);
  };

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-medium text-gray-900">
          Forgot password?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>

      {sent ? (
        <p role="status" className="text-center text-sm font-medium text-green-700">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        <button
          type="button"
          onClick={() => dispatch(openLogin())}
          className="font-medium text-gray-900 hover:underline cursor-pointer"
        >
          Back to log in
        </button>
      </p>
    </>
  );
};

export default ForgotPassword;
