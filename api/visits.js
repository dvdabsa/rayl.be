// Vercel serverless function: GET /api/visits?token=YOUR_ADMIN_TOKEN
// Returns the most recent logged visits (IP + geo + page) as JSON.
// Protected by ADMIN_TOKEN env var so the log isn't public.
// Requires Vercel KV (KV_REST_API_URL + KV_REST_API_TOKEN) for stored data.

export default async function handler(req, res) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.query.token !== token) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvToken) {
    return res.status(200).json({
      ok: true,
      note: "Redis (Upstash) not configured — visits are only in runtime logs. Provision it to store & query them here.",
      visits: [],
    });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 5000);
  try {
    const r = await fetch(`${kvUrl}/lrange/rayl:visits/0/${limit - 1}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const data = await r.json();
    const visits = (data.result || []).map((s) => {
      try { return JSON.parse(s); } catch { return s; }
    });
    return res.status(200).json({ ok: true, count: visits.length, visits });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err).slice(0, 200) });
  }
}
