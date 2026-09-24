import { useDispatch } from "react-redux";
import { login } from "@/store/slices/authSlice";
import { closeAuthModal } from "@/store/slices/uiSlice";

export default function GoogleButton() {
  const dispatch = useDispatch();

  const handleGoogleContinue = () => {
    // TODO: replace with real Google OAuth (e.g. @react-oauth/google)
    dispatch(login({ name: "Google User", email: "user@gmail.com" }));
    dispatch(closeAuthModal());
  };

  return (
    <button
      type="button"
      onClick={handleGoogleContinue}
      className="w-full flex items-center justify-center gap-3 border border-border rounded-full py-2.5 text-sm font-medium hover:border-foreground transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.16l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.94H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.06l3.01-2.33z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      Continue with Google
    </button>
  );
}