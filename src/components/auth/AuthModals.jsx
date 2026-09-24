import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

export default function AuthModals() {
  return (
    <>
      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </>
  );
}