import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "@/components/Modal";
import GoogleButton from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/store/slices/authSlice";
import { openAuthModal, closeAuthModal, selectActiveAuthModal } from "@/store/slices/uiSlice";

export default function LoginModal() {
  const dispatch = useDispatch();
  const activeModal = useSelector(selectActiveAuthModal);
  const isOpen = activeModal === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    // TODO: replace with real auth API call
    const name = email.split("@")[0];
    dispatch(login({ name, email }));
    dispatch(closeAuthModal());
    setEmail("");
    setPassword("");
  };

  /* Legacy layout retained temporarily for reference.
  return (
    <Modal isOpen={isOpen} onClose={() => dispatch(closeAuthModal())}>
      <h2 className="font-display text-2xl font-semibold mb-1">Welcome back</h2>
      <p className="text-sm text-muted-foreground mb-6">Log in to your VÉRA account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          className="border border-border rounded-full px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        />

        <button
          type="button"
          onClick={() => dispatch(openAuthModal("forgotPassword"))}
          className="text-xs text-muted-foreground hover:text-foreground self-end -mt-1"
        >
          Forgot password?
        </button>

        <button
          type="submit"
          className="bg-foreground text-background rounded-full py-2.5 text-sm font-medium mt-1"
        >
          Log In
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleButton />

      <p className="text-sm text-center text-muted-foreground mt-6">
        Don't have an account?{" "}
        <button
          onClick={() => dispatch(openAuthModal("signup"))}
          className="text-foreground font-medium underline"
        >
          Sign up
        </button>
      </p>
    </Modal>
  );
  */
  return (
    <Modal isOpen={isOpen} onClose={() => dispatch(closeAuthModal())} maxWidth="max-w-sm">
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to access your VÉRA account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-0">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <Button type="button" variant="link" className="ml-auto h-auto p-0 text-sm font-normal" onClick={() => dispatch(openAuthModal("forgotPassword"))}>Forgot?</Button>
                </div>
                <Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                <FieldDescription>Must be at least 8 characters.</FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col gap-2 px-0 pb-0">
            <Button type="submit" className="w-full">Sign in</Button>
            <GoogleButton />
          </CardFooter>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">Don't have an account? <button onClick={() => dispatch(openAuthModal("signup"))} className="font-medium text-foreground underline">Sign up</button></p>
    </Modal>
  );
}
