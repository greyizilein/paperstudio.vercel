import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [tier, setTier] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      setError("No payment reference found");
      return;
    }
    void verify(reference);
  }, []);

  const verify = async (reference: string) => {
    try {
      const product = searchParams.get("product");
      const functionName = product === "czar" ? "verify-czar-payment" : "verify-paystack-payment";
      const res = await supabase.functions.invoke(functionName, {
        body: { reference },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.success || res.data?.ok) {
        setStatus("success");
        setTier(res.data.tier);
      } else {
        throw new Error(res.data?.error || "Verification failed");
      }
    } catch (err: any) {
      setStatus("failed");
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
            <h1 className="font-heading text-lg font-black text-foreground mb-2">Verifying payment…</h1>
            <p className="text-[13px] text-muted-foreground">Please wait while we confirm your transaction.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle size={48} className="text-green mx-auto mb-4" />
            <h1 className="font-heading text-lg font-black text-foreground mb-2">Payment successful!</h1>
            <p className="text-[13px] text-muted-foreground mb-1">
              You've been upgraded to <b className="text-foreground capitalize">{tier}</b> tier.
            </p>
            <p className="text-[11px] text-muted-foreground mb-6">Your word credits have been refreshed.</p>
            <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary/90 transition-colors cursor-pointer">
              Go to Dashboard
            </button>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle size={48} className="text-destructive mx-auto mb-4" />
            <h1 className="font-heading text-lg font-black text-foreground mb-2">Payment failed</h1>
            <p className="text-[13px] text-muted-foreground mb-6">{error || "Something went wrong. Please try again."}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigate("/pricing")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 transition-colors cursor-pointer">
                Try again
              </button>
              <button onClick={() => navigate("/dashboard")} className="px-4 py-2 rounded-lg border border-border text-[12px] font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer">
                Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
