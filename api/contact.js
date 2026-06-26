// Vercel serverless function: POST /api/contact
// Sends the contact-form submission via Resend. The API key lives only in
// Vercel environment variables (Project → Settings → Environment Variables),
// never in the repo or the browser.

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Vercel parses JSON bodies automatically; fall back to manual parse.
  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  data = data || {};

  // Honeypot — bots fill the hidden "website" field.
  if (data.website) return res.status(200).json({ ok: true });

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const company = (data.company || "").trim();
  const topic = (data.topic || "").trim();
  const message = (data.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: "Email is not configured" });
  }

  const html = `
    <h2>New contact via rayl.be</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    <p><strong>Company:</strong> ${esc(company) || "—"}</p>
    <p><strong>Topic:</strong> ${esc(topic) || "—"}</p>
    <p><strong>Message:</strong></p>
    <p>${esc(message).replace(/\n/g, "<br>")}</p>
  `;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || "Rayl Website <onboarding@resend.dev>",
        to: [process.env.CONTACT_TO || "hello@rayl.be"],
        reply_to: email,
        subject: `New inquiry from ${name}${company ? ` (${company})` : ""}`,
        html,
      }),
    });

    if (resp.ok) return res.status(200).json({ ok: true });

    const detail = await resp.text();
    return res.status(502).json({ ok: false, error: detail.slice(0, 300) });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err).slice(0, 300) });
  }
}
