import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  useEffect(() => {
    if (code) localStorage.setItem("ps_referral_code", code);
  }, [code]);
  return <Navigate to={`/auth?ref=${encodeURIComponent(code || "")}`} replace />;
}
