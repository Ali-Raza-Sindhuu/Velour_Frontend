import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Login from "./Login";
import SignUp from "./SignUp";
import ForgotPassword from "./ForgotPassword";

const AuthModal = ({ view, onClose }) => (
  <AnimatePresence>
    {view && (
      <motion.div
        className="fashion-auth-overlay fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={view === "login" ? "Sign in to Almina" : view === "signUp" ? "Create an Almina account" : "Reset your password"}
          onClick={(event) => event.stopPropagation()}
          initial={{ opacity: 0, scale: 0.97, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 18 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fashion-auth-panel relative grid w-full max-w-[820px] overflow-hidden bg-white shadow-2xl"
        >
          <button type="button" onClick={onClose} aria-label="Close dialog" className="fashion-auth-close absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center bg-white/90 text-[#171715] transition hover:bg-white">
            <X size={18} />
          </button>
          <aside className="fashion-auth-art" aria-hidden="true">
            <div className="fashion-auth-wordmark">ALMINA<span>CONSIDERED CLOTHING</span></div>
            <div className="fashion-auth-art-caption"><span>THE EVERYDAY EDIT</span><b>Feel like<br/><em>yourself.</em></b><small>Pieces to live in. Style that is all yours.</small></div>
          </aside>
          <div className="fashion-auth-content">
            {view === "login" ? <Login /> : view === "signUp" ? <SignUp /> : view === "forgotPassword" ? <ForgotPassword /> : null}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default AuthModal;
