import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "@/components/Modal";
import GoogleButton from "@/components/auth/GoogleButton";
import { login } from "@/store/slices/authSlice";
import { openAuthModal, closeAuthModal, selectActiveAuthModal } from "@/store/slices/uiSlice";

export default function SignupModal() {
  const dispatch = useDispatch();
  const activeModal = useSelector(selectActiveAuthModal);
  const isOpen = activeModal === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    // TODO: replace with real signup API call
    dispatch(login({ name, email }));
    dispatch(closeAuthModal());
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <Modal isOpen={isOpen} onClose={() => dispatch(closeAuthModal())}>
      <h2 className="font-display text-2xl font-semibold mb-1">Create your account</h2>
      <p className="text-sm text-muted-foreground mb-6">Join VÉRA for faster checkout and order tracking.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />

        <button
          type="submit"
          className="bg-foreground text-background rounded-full py-2.5 text-sm font-medium mt-1"
        >
          Create Account
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleButton />

      <p className="text-sm text-center text-muted-foreground mt-6">
        Already have an account?{" "}
        <button
          onClick={() => dispatch(openAuthModal("login"))}
          className="text-foreground font-medium underline"
        >
          Log in
        </button>
      </p>
    </Modal>
  );
}