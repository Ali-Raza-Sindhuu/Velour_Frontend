import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openLogin, setLoginPreFill } from "../../store/slice/Uislice";
import {
  EyeIcon,
  EyeOffIcon,
  GithubIcon,
  GoogleIcon,
} from "../Icons/SocialIcons";
import { signupUser } from "../../features/auth/authThunks";
import { apiBaseUrl } from "../../api/apiClient";

export const SocialButton = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
  >
    <Icon />
    {label}
  </button>
);

const SignUp = () => {
  const dispatch = useDispatch();
  const {loading, error : apiError} = useSelector((state) => state.auth)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const startGoogleLogin = () => {
    window.location.assign(`${apiBaseUrl}/auth/google`);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return; 
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    const resultAction = await dispatch(signupUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    }));

if (signupUser.fulfilled.match(resultAction)) {
  // console.log("Signup Successful");

  setFormData({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  // console.log(formData.email)
  dispatch(setLoginPreFill(formData.email))
  dispatch(openLogin())

} else {
  console.log(resultAction.payload);

  setError(
    resultAction.payload?.message || "Something went wrong"
  );
}
  };

  return (
    <div className="flex max-h-screen flex-col overflow-y-auto py-1">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Create your account
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Start your journey with us
        </p>
      </div>

      <>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label
              htmlFor="firstName"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="Jane"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="lastName"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-xs font-medium text-gray-700"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        {apiError && <p className="text-xs font-medium text-red-500">{apiError}</p>}

        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <span>
            I agree to the{" "}
            <button
              type="button"
              className="font-medium text-gray-900 hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="font-medium text-gray-900 hover:underline"
            >
              Privacy Policy
            </button>
          </span>
        </label>

        <button
  type="submit"
  disabled={loading}
  className={`w-full rounded-xl py-2.5 text-sm font-medium text-white transition
  ${
    loading
      ? "cursor-not-allowed bg-gray-500"
      : "bg-gray-900 hover:bg-gray-800"
  }`}
>
  {loading ? "Creating account..." : "Create account"}
</button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or sign up with</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex gap-2">
        <SocialButton icon={GoogleIcon} label="Google" onClick={startGoogleLogin} />
        {/* <SocialButton icon={GithubIcon} label="Github" /> */}
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(openLogin())}
          className="cursor-pointer font-medium text-gray-900 hover:underline"
        >
          Log in
        </button>
      </p>
      </>
    </div>
  );
};

export default SignUp;
