import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "@/components/Modal";
import { openAuthModal, closeAuthModal, selectActiveAuthModal } from "@/store/slices/uiSlice";

export default function ForgotPasswordModal() {
  const dispatch = useDispatch();
  const activeModal = useSelector(selectActiveAuthModal);
  const isOpen = activeModal === "forgotPassword";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    // TODO: replace with real "send reset email" API call
    setSubmitted(true);
  };

  const handleClose = () => {
    dispatch(closeAuthModal());
    setSubmitted(false);
    setEmail("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {submitted ? (
        <>
          <h2 className="font-display text-2xl font-semibold mb-2">Check your inbox</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
          </p>
          <button
            onClick={() => dispatch(openAuthModal("login"))}
            className="w-full bg-foreground text-background rounded-full py-2.5 text-sm font-medium"
          >
            Back to Login
          </button>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl font-semibold mb-1">Reset your password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email and we'll send you a link to reset it.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
            <button
              type="submit"
              className="bg-foreground text-background rounded-full py-2.5 text-sm font-medium"
            >
              Send Reset Link
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Remembered it?{" "}
            <button
              onClick={() => dispatch(openAuthModal("login"))}
              className="text-foreground font-medium underline"
            >
              Log in
            </button>
          </p>
        </>
      )}
    </Modal>
  );
}