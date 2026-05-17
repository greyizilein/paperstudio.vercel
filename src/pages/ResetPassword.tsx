import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/firstdraft/Logo";
import { FDButton } from "@/components/firstdraft/FDButton";
import { FDInput } from "@/components/firstdraft/FDInput";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="bg-noise fixed inset-0 z-0 opacity-[0.03]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <Logo className="mx-auto mb-8" />
          <h1 className="font-display text-3xl font-bold text-primary tracking-tight">Set New Password</h1>
        </div>
        <div className="bg-surface border border-primary/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          {success ? (
            <div className="text-center py-8">
              <Check size={48} className="text-primary mx-auto mb-4" />
              <p className="text-primary font-bold">Password updated! Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <FDInput label="New Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <FDButton type="submit" disabled={loading || password.length < 6} className="w-full py-4 gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                Update Password
              </FDButton>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
