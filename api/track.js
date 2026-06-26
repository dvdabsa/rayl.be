// Vercel serverless function: POST /api/track
// Logs per-visit IP + geo + page. Only called for visitors who accepted
// analytics in the cookie banner (consent-gated client-side).
//
// Storage:
//   - If Vercel KV is provisioned (KV_REST_API_URL + KV_REST_API_TOKEN env
//     vars present), each visit is pushed to a capped list "rayl:visits".
//   - Otherwise it logs structured JSON to the Vercel runtime logs.
//
// IMPORTANT (GDPR): IP addresses are personal data. This endpoint is disclosed
// in the Privacy & Cookie policies and runs only with the visitor's consent.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const fwd = req.headers["x-forwarded-for"] || "";
  const ip = String(fwd).split(",")[0].trim() || req.socket?.remoteAddress || "";

  const visit = {
    ts: new Date().toISOString(),
    ip,
    country: req.headers["x-vercel-ip-country"] || "",
    region: req.headers["x-vercel-ip-country-region"] || "",
    city: req.headers["x-vercel-ip-city"]
      ? decodeURIComponent(req.headers["x-vercel-ip-city"])
      : "",
    timezone: req.headers["x-vercel-ip-timezone"] || "",
    path: (body.path || "").slice(0, 200),
    referrer: (body.referrer || "").slice(0, 300),
    ua: (req.headers["user-agent"] || "").slice(0, 300),
  };

  // Persist to Vercel KV if configured; else log.
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      // LPUSH the visit, then LTRIM to keep the most recent 5000.
      await fetch(`${kvUrl}/lpush/rayl:visits/${encodeURIComponent(JSON.stringify(visit))}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      await fetch(`${kvUrl}/ltrim/rayl:visits/0/4999`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
    } catch (err) {
      console.log("[track] kv error", String(err));
      console.log("[track]", JSON.stringify(visit));
    }
  } else {
    console.log("[track]", JSON.stringify(visit));
  }

  // 204: nothing to return, keep the beacon cheap.
  return res.status(204).end();
}
