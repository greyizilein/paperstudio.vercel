import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/firstdraft/Logo";
import { FDButton } from "@/components/firstdraft/FDButton";
import { FDInput } from "@/components/firstdraft/FDInput";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralInput, setReferralInput] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Capture referral code from URL
  const refCode = searchParams.get("ref");
  useEffect(() => {
    if (refCode) localStorage.setItem("ps_referral_code", refCode);
  }, [refCode]);

  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams.get("redirect");
      const tier = searchParams.get("tier");
      if (redirect) {
        // If signup carried a redirect (e.g. from a pricing-card click),
        // forward to that URL with any tier param preserved so checkout auto-fires.
        const target = tier ? `${redirect}${redirect.includes("?") ? "&" : "?"}tier=${tier}` : redirect;
        navigate(target, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate, searchParams]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const storedRef = referralInput.trim() || localStorage.getItem("ps_referral_code") || "";
        if (storedRef) localStorage.setItem("ps_referral_code", storedRef);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, ...(storedRef ? { referral_code: storedRef } : {}) },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        supabase.functions.invoke("notify-new-signup", {
          body: { email, name, referralCode: storedRef || null },
        }).catch(() => {});
        // Auto-confirm is on, so a session is returned immediately
        if (data.session) {
          navigate("/dashboard", { replace: true });
        } else {
          // Try sign in (covers cases where confirm-email is enforced)
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            setMessage("Account created. You can now sign in.");
            setMode("login");
          } else {
            navigate("/dashboard", { replace: true });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("rate limit") || msg.includes("security purposes")) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("This email is already registered. Try signing in instead.");
      } else {
        setError(err.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Persist any typed referral so it survives the OAuth round-trip
      const ref = referralInput.trim();
      if (ref) localStorage.setItem("ps_referral_code", ref);
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      <div className="bg-noise fixed inset-0 z-0 opacity-[0.03]" />

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-10">
            <span className="text-2xl font-bold uppercase tracking-tight text-white">PAPERSTUDIO</span>
            <h1 className="text-3xl font-bold mt-6 mb-2 text-white">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
            </h1>
            <p className="text-white/70 text-sm">
              {mode === "login"
                ? "Sign in to continue your research"
                : mode === "signup"
                ? "Start your dissertation journey"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-2xl p-8 shadow-2xl">
            {/* Referral code (visible above Google so OAuth signups can use it too) */}
            {mode === "signup" && (
              <div className="mb-4">
                <FDInput
                  label="Referral Code (optional)"
                  value={referralInput}
                  onChange={(v) => { setReferralInput(v); if (v.trim()) localStorage.setItem("ps_referral_code", v.trim()); }}
                  placeholder="e.g. PS-ABC123"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Applied to either Google or email signup.</p>
              </div>
            )}

            {/* Google Sign In */}
            {mode !== "forgot" && (
              <>
                <FDButton
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-4 gap-3 mb-6"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </FDButton>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-green/10 border border-green/20 rounded-xl text-green text-sm">
                <Mail size={18} />
                {message}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-5">
              {mode === "signup" && (
                <FDInput
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                />
              )}
              <FDInput
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@university.edu"
              />
              {mode !== "forgot" && (
                <FDInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />
              )}

              <FDButton type="submit" disabled={loading} className="w-full py-4 gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              </FDButton>
            </form>

            <div className="mt-6 text-center space-y-2">
              {mode === "login" && (
                <>
                  <button onClick={() => { setMode("forgot"); setError(null); setMessage(null); }} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot your password?
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <button onClick={() => { setMode("signup"); setError(null); setMessage(null); }} className="text-primary font-bold hover:underline">
                      Sign up
                    </button>
                  </p>
                </>
              )}
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-primary font-bold hover:underline">
                    Sign in
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <button onClick={() => { setMode("login"); setError(null); setMessage(null); }} className="text-xs text-primary font-bold hover:underline">
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
