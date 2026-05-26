export const checkSystemHealth = async () => {
  const health = { db: false, api: false, latency: 0 };
  const start = Date.now();
  try {
    const res = await fetch(import.meta.env.VITE_SUPABASE_URL + "/rest/v1/", { method: "HEAD" });
    health.db = res.ok;
    health.api = true;
    health.latency = Date.now() - start;
  } catch {
    console.error("System Health Critical");
  }
  return health;
};
