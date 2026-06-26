#!/usr/bin/env python3
"""Static server with a custom 404 and a /api/contact endpoint backed by Resend.

The Resend API key is read from the environment (loaded from .env), never
hardcoded, so it stays out of the public repo and out of client-side code.

Run:  python3 server.py     (loads .env automatically if present)
"""
import http.server
import json
import os
import socketserver
import urllib.request
import urllib.error

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


def load_dotenv():
    """Minimal .env loader so the key is available without extra deps."""
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())


load_dotenv()

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
CONTACT_TO = os.environ.get("CONTACT_TO", "hello@rayl.be")
CONTACT_FROM = os.environ.get("CONTACT_FROM", "Rayl Website <onboarding@resend.dev>")


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def send_via_resend(data):
    """POST the submission to Resend. Returns (ok, status, detail)."""
    if not RESEND_API_KEY:
        return False, 500, "RESEND_API_KEY not configured on the server"

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    company = data.get("company", "").strip()
    topic = data.get("topic", "").strip()
    message = data.get("message", "").strip()

    if not name or not email or not message:
        return False, 400, "Missing required fields"

    accent = "#ff8a3d"
    logo = "https://rayl.be/favicon.png"
    msg_html = esc(message).replace(chr(10), "<br>")

    def row(label, value):
        return (
            f'<tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;'
            f'color:#888;width:130px;vertical-align:top;">{label}</td>'
            f'<td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;'
            f'color:#0a0a0a;font-weight:600;">{value}</td></tr>'
        )

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
    <tr><td style="padding:28px 40px;border-bottom:1px solid #eaeaea;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="vertical-align:middle;padding-right:12px;"><img src="{logo}" alt="Rayl" width="36" height="36" style="display:block;border-radius:8px;"></td>
        <td style="vertical-align:middle;"><span style="font-family:Georgia,serif;font-style:italic;font-weight:700;font-size:24px;letter-spacing:-.02em;color:#0a0a0a;">Rayl</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="height:4px;background:linear-gradient(90deg,{accent},#ff4d2e);font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:36px 40px 8px;">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-.015em;">New inquiry from the website</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#888;">Someone just submitted the contact form on rayl.be.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        {row("Name", esc(name))}
        {row("Email", f'<a href="mailto:{esc(email)}" style="color:{accent};text-decoration:none;">{esc(email)}</a>')}
        {row("Company", esc(company) or "—")}
        {row("Topic", esc(topic) or "—")}
      </table>
      <p style="margin:24px 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.08em;">Message</p>
      <div style="font-size:15px;line-height:1.65;color:#222;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px 18px;">{msg_html}</div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
        <tr><td bgcolor="{accent}" style="border-radius:8px;"><a href="mailto:{esc(email)}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#1a0d05;text-decoration:none;border-radius:8px;">Reply to {esc(name)}</a></td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 40px 30px;border-top:1px solid #eaeaea;font-size:12px;color:#999;line-height:1.6;">
      <p style="margin:0 0 4px;font-weight:700;color:#0a0a0a;">Rayl Technologies BV</p>
      <p style="margin:0;">Jos Ratinckxstraat 3, C082, 2600 Antwerp, Belgium · <a href="https://rayl.be" style="color:#999;">rayl.be</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""

    payload = json.dumps({
        "from": CONTACT_FROM,
        "to": [CONTACT_TO],
        "reply_to": email,
        "subject": f"New inquiry from {name}" + (f" ({company})" if company else ""),
        "html": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (rayl.be contact form)",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return True, 200, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return False, e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return False, 502, str(e)


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def _rewrite_clean_url(self):
        """Serve /about for /about.html so the site works without extensions."""
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        rest = self.path[len(path):]
        if path.endswith("/") or "." in os.path.basename(path):
            return
        candidate = os.path.join(ROOT, path.lstrip("/") + ".html")
        if os.path.isfile(candidate):
            self.path = path + ".html" + rest

    def do_GET(self):
        self._rewrite_clean_url()
        return super().do_GET()

    def do_HEAD(self):
        self._rewrite_clean_url()
        return super().do_HEAD()

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.rstrip("/") == "/api/contact":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length) if length else b"{}"
                data = json.loads(raw.decode("utf-8") or "{}")
            except Exception:  # noqa: BLE001
                return self._json(400, {"ok": False, "error": "Bad request"})

            # Honeypot: bots fill the hidden "website" field.
            if data.get("website"):
                return self._json(200, {"ok": True})

            ok, status, detail = send_via_resend(data)
            if ok:
                return self._json(200, {"ok": True})
            return self._json(status if status >= 400 else 502,
                              {"ok": False, "error": detail[:300]})

        self.send_error(404)

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            path = os.path.join(ROOT, "404.html")
            if os.path.exists(path):
                with open(path, "rb") as f:
                    body = f.read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
        super().send_error(code, message, explain)


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    with Server(("", PORT), CustomHandler) as httpd:
        key_state = "configured" if RESEND_API_KEY else "MISSING"
        print(f"Serving http://localhost:{PORT}  (Resend key: {key_state})")
        httpd.serve_forever()
