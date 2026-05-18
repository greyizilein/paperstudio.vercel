import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { OnboardingCarousel } from "@/components/auth/OnboardingCarousel";
import { supabase } from "@/integrations/supabase/client";
import { FDButton } from "@/components/firstdraft/FDButton";
import { FDInput } from "@/components/firstdraft/FDInput";

type AuthMode = "landing" | "login" | "signup" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "landing" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralInput, setReferralInput] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refCode = searchParams.get("ref");
  useEffect(() => {
    if (refCode) localStorage.setItem("ps_referral_code", refCode);
  }, [refCode]);

  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams.get("redirect");
      const tier = searchParams.get("tier");
      if (redirect) {
        const target = tier ? `${redirect}${redirect.includes("?") ? "&" : "?"}tier=${tier}` : redirect;
        navigate(target, { replace: true });
      } else {
        navigate("/", { replace: true });
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
        if (data.session) {
          navigate("/", { replace: true });
        } else {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            setMessage("Account created. You can now sign in.");
            setMode("login");
          } else {
            navigate("/", { replace: true });
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/", { replace: true });
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

  const goBackToLanding = () => { setMode("landing"); setError(null); setMessage(null); };

  const formBody = (
    <>
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

      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-green/10 border border-green/20 rounded-xl text-green text-sm">
          <Mail size={18} />
          {message}
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {mode === "signup" && (
          <FDInput id="name" name="name" label="Full Name" value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
        )}
        <FDInput id="email" name="email" label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" autoComplete="email" />
        {mode !== "forgot" && (
          <FDInput id="password" name="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        )}
        <FDButton type="submit" disabled={loading} className="w-full py-4 gap-2">
          {loading && <Loader2 size={18} className="animate-spin" />}
          {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
        </FDButton>
      </form>

      <div className="mt-5 text-center space-y-2">
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
    </>
  );

  return (
    <div className="bg-[#1a1a1a] text-white">
      <div className="bg-noise fixed inset-0 z-0 opacity-[0.03]" />

      {/* ── Desktop: two-column layout ── */}
      <div className="hidden md:flex relative z-10 min-h-screen items-stretch">
        <div className="w-[420px] flex-shrink-0 border-r border-white/10 flex flex-col sticky top-0 h-screen">
          <div className="px-8 pt-8 pb-2">
            <span className="text-base font-bold uppercase tracking-tight text-white">PAPERSTUDIO</span>
          </div>
          <div className="flex-1 flex flex-col">
            <OnboardingCarousel />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-1.5 text-white">
                {mode === "login" || mode === "landing" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
              </h1>
              <p className="text-white/70 text-sm">
                {mode === "login" || mode === "landing"
                  ? "Sign in to continue your research"
                  : mode === "signup"
                  ? "Start your dissertation journey"
                  : "Enter your email to receive a reset link"}
              </p>
            </div>
            <div className="bg-card text-card-foreground border border-border rounded-2xl p-8 shadow-2xl">
              {formBody}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Mobile: full-screen carousel + bottom CTA / sliding form sheet ── */}
      <div className="md:hidden relative z-10 h-[100dvh] flex flex-col overflow-hidden">
        {/* Carousel fills available space */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 px-6 pt-8 pb-2 text-center">
            <span className="text-lg font-bold uppercase tracking-tight text-white">PAPERSTUDIO</span>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <OnboardingCarousel />
          </div>
        </div>

        {/* CTA buttons — visible only in landing mode */}
        <div className="flex-shrink-0 px-6 pb-10 pt-4 space-y-3">
          <button
            onClick={() => setMode("signup")}
            className="w-full py-3.5 rounded-xl bg-white text-[#1a1a1a] font-semibold text-sm active:opacity-80 transition-opacity"
          >
            Create account
          </button>
          <button
            onClick={() => setMode("login")}
            className="w-full py-2.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            Existing user? Sign in
          </button>
        </div>

        {/* Backdrop */}
        <AnimatePresence>
          {mode !== "landing" && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 z-10"
              onClick={goBackToLanding}
            />
          )}
        </AnimatePresence>

        {/* Bottom sheet form */}
        <AnimatePresence>
          {mode !== "landing" && (
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 bg-[#1e1e1e] rounded-t-3xl z-20 max-h-[88dvh] overflow-y-auto"
            >
              <div className="px-6 pt-5 pb-10">
                {/* Drag handle */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                {/* Back button */}
                <button
                  onClick={goBackToLanding}
                  className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-5 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                {/* Form heading */}
                <div className="mb-6">
                  <h1 className="text-xl font-bold mb-1 text-white">
                    {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
                  </h1>
                  <p className="text-white/60 text-sm">
                    {mode === "login"
                      ? "Sign in to continue your research"
                      : mode === "signup"
                      ? "Start your dissertation journey"
                      : "Enter your email to receive a reset link"}
                  </p>
                </div>

                {formBody}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
