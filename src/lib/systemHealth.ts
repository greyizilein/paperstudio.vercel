export const checkSystemHealth = async () => {
  const health = {
    supabase: false,
    aiProvider: false,
    version: "2.1.0",
  };

  try {
    const supabaseResp = await fetch(import.meta.env.VITE_SUPABASE_URL + "/rest/v1/", { method: "HEAD" });
    health.supabase = supabaseResp.ok;
    health.aiProvider = true;
  } catch {
    console.error("System Health Critical");
  }

  return health;
};
