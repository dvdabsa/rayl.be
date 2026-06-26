// Vercel serverless function: POST /api/contact
// Sends a branded contact-form notification via Resend. The API key lives only
// in Vercel environment variables, never in the repo or the browser.

const SITE = "https://rayl.be";
const LOGO_URL = `${SITE}/favicon.png`;
const ACCENT = "#ff8a3d";
const COMPANY = "Rayl Technologies BV";
const ADDRESS = "Jos Ratinckxstraat 3, C082, 2600 Antwerp, Belgium";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHtml({ name, email, company, topic, message }) {
  const row = (label, value) =>
    `<tr>
       <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;color:#888;width:130px;vertical-align:top;">${esc(label)}</td>
       <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#0a0a0a;font-weight:600;">${value}</td>
     </tr>`;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New contact via rayl.be</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f4f4;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">

    <!-- Header -->
    <tr><td style="padding:28px 40px;border-bottom:1px solid #eaeaea;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:12px;">
          <img src="${LOGO_URL}" alt="Rayl" width="36" height="36" style="display:block;border-radius:8px;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:24px;letter-spacing:-.02em;color:#0a0a0a;">Rayl</span>
        </td>
      </tr></table>
    </td></tr>

    <!-- Accent bar -->
    <tr><td style="height:4px;background:linear-gradient(90deg,${ACCENT},#ff4d2e);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Body -->
    <tr><td style="padding:36px 40px 8px;">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;line-height:1.3;color:#0a0a0a;letter-spacing:-.015em;">New inquiry from the website</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888;">Someone just submitted the contact form on rayl.be.</p>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${row("Name", esc(name))}
        ${row("Email", `<a href="mailto:${esc(email)}" style="color:${ACCENT};text-decoration:none;">${esc(email)}</a>`)}
        ${row("Company", esc(company) || "—")}
        ${row("Topic", esc(topic) || "—")}
      </table>

      <p style="margin:24px 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.08em;">Message</p>
      <div style="font-size:15px;line-height:1.65;color:#222;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px 18px;">${esc(message).replace(/\n/g, "<br>")}</div>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
        <tr><td bgcolor="${ACCENT}" style="border-radius:8px;">
          <a href="mailto:${esc(email)}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#1a0d05;text-decoration:none;border-radius:8px;">Reply to ${esc(name)}</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 40px 30px;border-top:1px solid #eaeaea;font-size:12px;color:#999;line-height:1.6;">
      <p style="margin:0 0 4px;font-weight:700;color:#0a0a0a;">${esc(COMPANY)}</p>
      <p style="margin:0;">${esc(ADDRESS)} · <a href="${SITE}" style="color:#999;text-decoration:underline;">rayl.be</a></p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

function renderText({ name, email, company, topic, message }) {
  return [
    "New inquiry from the website",
    "============================",
    "",
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Company: ${company || "—"}`,
    `Topic:   ${topic || "—"}`,
    "",
    "Message:",
    message,
    "",
    "--",
    COMPANY,
    ADDRESS,
    SITE,
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  data = data || {};

  // Honeypot — bots fill the hidden "website" field.
  if (data.website) return res.status(200).json({ ok: true });

  const fields = {
    name: (data.name || "").trim(),
    email: (data.email || "").trim(),
    company: (data.company || "").trim(),
    topic: (data.topic || "").trim(),
    message: (data.message || "").trim(),
  };

  if (!fields.name || !fields.email || !fields.message) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: "Email is not configured" });
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || "Rayl <onboarding@resend.dev>",
        to: [process.env.CONTACT_TO || "hello@rayl.be"],
        reply_to: fields.email,
        subject: `New inquiry from ${fields.name}${fields.company ? ` (${fields.company})` : ""}`,
        html: renderHtml(fields),
        text: renderText(fields),
      }),
    });

    if (resp.ok) return res.status(200).json({ ok: true });
    const detail = await resp.text();
    return res.status(502).json({ ok: false, error: detail.slice(0, 300) });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err).slice(0, 300) });
  }
}
