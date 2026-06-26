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
  const field = (label, value) =>
    `<tr>
       <td style="padding:0 0 18px;font-size:12px;color:#9a9a9a;letter-spacing:.06em;text-transform:uppercase;width:120px;vertical-align:top;line-height:1.9;">${esc(label)}</td>
       <td style="padding:0 0 18px;font-size:15px;color:#0a0a0a;font-weight:600;vertical-align:top;line-height:1.6;">${value}</td>
     </tr>`;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New contact via rayl.be</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a;-webkit-font-smoothing:antialiased;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#ffffff;">
<tr><td align="center" style="padding:48px 24px;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;">

    <!-- Logo -->
    <tr><td style="padding:0 0 36px;">
      <img src="${LOGO_URL}" alt="Rayl" width="44" height="44" style="display:block;border-radius:10px;" />
    </td></tr>

    <!-- Heading -->
    <tr><td style="padding:0 0 4px;">
      <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.25;color:#0a0a0a;letter-spacing:-.02em;">New inquiry from the website</h1>
    </td></tr>
    <tr><td style="padding:0 0 32px;">
      <p style="margin:0;font-size:15px;color:#9a9a9a;">Someone just reached out through rayl.be.</p>
    </td></tr>

    <!-- Fields -->
    <tr><td style="padding:0 0 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${field("Name", esc(name))}
        ${field("Email", `<a href="mailto:${esc(email)}" style="color:${ACCENT};text-decoration:none;font-weight:600;">${esc(email)}</a>`)}
        ${field("Company", esc(company) || "—")}
        ${field("Topic", esc(topic) || "—")}
      </table>
    </td></tr>

    <!-- Message -->
    <tr><td style="padding:14px 0 6px;">
      <p style="margin:0 0 10px;font-size:12px;color:#9a9a9a;letter-spacing:.06em;text-transform:uppercase;">Message</p>
      <div style="font-size:16px;line-height:1.7;color:#1a1a1a;">${esc(message).replace(/\n/g, "<br>")}</div>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:34px 0 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td bgcolor="${ACCENT}" style="border-radius:10px;">
          <a href="mailto:${esc(email)}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#1a0d05;text-decoration:none;border-radius:10px;">Reply to ${esc(name)}</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:48px 0 0;font-size:12px;color:#b5b5b5;line-height:1.7;">
      <p style="margin:0 0 2px;font-weight:600;color:#6a6a6a;">${esc(COMPANY)}</p>
      <p style="margin:0;">${esc(ADDRESS)}</p>
      <p style="margin:6px 0 0;"><a href="${SITE}" style="color:${ACCENT};text-decoration:none;">rayl.be</a></p>
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
