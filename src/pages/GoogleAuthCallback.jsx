import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeGoogleLoginCode } from "../api/authApi";
import { completeGoogleLogin } from "../features/auth/authSlice";

export default function GoogleAuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    const complete = async () => {
      const error = params.get("error");
      const code = params.get("code");
      if (error || !code) { setMessage(error || "Google sign-in was cancelled."); return; }
      try {
        const result = await exchangeGoogleLoginCode(code);
        dispatch(completeGoogleLogin(result));
        navigate("/dashboard", { replace: true });
      } catch (requestError) {
        setMessage(requestError.response?.data?.message || "Google sign-in could not be completed.");
      }
    };
    complete();
  }, [dispatch, navigate, params]);

  return <main className="grid min-h-screen place-items-center p-6 text-center text-sm text-gray-600">{message}</main>;
}
