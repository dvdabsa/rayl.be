// =============================================================
// Rayl — /api/contact
// Vercel serverless function that sends contact-form messages
// through the Resend API.
//
// Required environment variable on Vercel:
//   RESEND_API_KEY        — your live Resend API key (re_…)
//
// Optional environment variables:
//   CONTACT_TO            — destination address (default: hello@rayl.be)
//   CONTACT_FROM          — sender address (default: Rayl <hello@rayl.be>)
//                           Must be on a verified domain in Resend.
//   CONTACT_ALLOWED_ORIGIN — CORS origin (default: https://rayl.be)
//
// Expected request:
//   POST /api/contact
//   Content-Type: application/json
//   Body: { name?: string, email: string, message: string,
//           subject?: string, _gotcha?: string }
//
// Responses:
//   200 { ok: true, id: string }
//   400 { error: string }   — validation failed
//   405 { error: string }   — wrong HTTP method
//   429 { error: string }   — rate-limited
//   500 { error: string }   — server misconfigured
//   502 { error: string }   — Resend rejected the send
// =============================================================

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const DEFAULTS = {
  to:     "hello@rayl.be",
  from:   "Rayl <hello@rayl.be>",
  origin: "https://rayl.be",
};

// --- Tiny in-memory rate limiter ---------------------------------
// Serverless instances are short-lived but warm instances DO reuse
// memory between invocations, so this catches the easy abuse cases.
// For real abuse protection, swap this for Upstash Redis or Vercel KV.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute
const RATE_LIMIT_MAX        = 5;          // 5 requests per IP per minute
const ipBucket = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipBucket.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipBucket.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  // Prune occasionally
  if (ipBucket.size > 500) ipBucket.clear();
  return entry.count > RATE_LIMIT_MAX;
}

// --- Helpers -----------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  }[c]));
}

function isValidEmail(s) {
  if (typeof s !== "string") return false;
  if (s.length > 254) return false;
  // Pragmatic check — Resend will reject anything genuinely malformed.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "0.0.0.0";
}

// --- Handler -----------------------------------------------------
export default async function handler(req, res) {
  const allowedOrigin = process.env.CONTACT_ALLOWED_ORIGIN || DEFAULTS.origin;
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit before doing any other work.
  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: "Too many requests" });
  }

  // Vercel's Node runtime parses JSON bodies automatically when the
  // Content-Type is application/json, but be defensive in case.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot — bots fill every field; humans never touch _gotcha.
  // Silently return success so spammers don't tune around it.
  if (body._gotcha) {
    return res.status(200).json({ ok: true, id: "honeypot" });
  }

  // Validate input.
  const email = (body.email || "").trim();
  const name = (body.name || "").trim();
  const message = (body.message || "").trim();
  const subject = (body.subject || "").trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (name.length > 200) {
    return res.status(400).json({ error: "Name too long" });
  }
  if (message.length < 1 || message.length > 5000) {
    return res.status(400).json({ error: "Message must be 1–5000 characters" });
  }
  if (subject.length > 200) {
    return res.status(400).json({ error: "Subject too long" });
  }

  // Server-side config.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set on the server");
    return res.status(500).json({ error: "Server is not configured" });
  }
  const to = process.env.CONTACT_TO || DEFAULTS.to;
  const from = process.env.CONTACT_FROM || DEFAULTS.from;

  const finalSubject = subject ||
    `New message from ${name || email} via rayl.be`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #0a0a0a; max-width: 560px; margin: 0 auto;">
      <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280;">
        New message · rayl.be
      </p>
      <h2 style="margin: 0 0 20px; font-size: 20px; line-height: 1.3; color: #0a0a0a;">
        From ${escapeHtml(name || email)}
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #6b7280; width: 80px;">Name</td><td style="padding: 6px 0;">${escapeHtml(name) || "—"}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #0a0a0a;">${escapeHtml(email)}</a></td></tr>
      </table>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
      <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #111827;">${escapeHtml(message)}</div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 22px 0;" />
      <p style="margin: 0; font-size: 11px; color: #9ca3af;">Sent via /api/contact on rayl.be</p>
    </div>
  `;

  const text =
    `New message from ${name || email} via rayl.be\n\n` +
    `Name:    ${name || "—"}\n` +
    `Email:   ${email}\n\n` +
    `${message}\n`;

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: finalSubject,
        html,
        text,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Resend rejected the request:", resp.status, detail);
      return res.status(502).json({ error: "Email could not be sent" });
    }

    const data = await resp.json().catch(() => ({}));
    return res.status(200).json({ ok: true, id: data.id || null });
  } catch (err) {
    console.error("Unexpected error sending email:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
