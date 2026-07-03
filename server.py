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

    def field(label, value):
        return (
            f'<tr><td style="padding:0 0 18px;font-size:12px;color:#9a9a9a;'
            f'letter-spacing:.06em;text-transform:uppercase;width:120px;vertical-align:top;line-height:1.9;">{label}</td>'
            f'<td style="padding:0 0 18px;font-size:15px;color:#0a0a0a;font-weight:600;'
            f'vertical-align:top;line-height:1.6;">{value}</td></tr>'
        )

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:48px 24px;">
  <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;">
    <tr><td style="padding:0 0 36px;"><img src="{logo}" alt="Rayl" width="44" height="44" style="display:block;border-radius:10px;"></td></tr>
    <tr><td style="padding:0 0 4px;"><h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-.02em;">New inquiry from the website</h1></td></tr>
    <tr><td style="padding:0 0 32px;"><p style="margin:0;font-size:15px;color:#9a9a9a;">Someone just reached out through rayl.be.</p></td></tr>
    <tr><td style="padding:0 0 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        {field("Name", esc(name))}
        {field("Email", f'<a href="mailto:{esc(email)}" style="color:{accent};text-decoration:none;font-weight:600;">{esc(email)}</a>')}
        {field("Company", esc(company) or "—")}
        {field("Topic", esc(topic) or "—")}
      </table>
    </td></tr>
    <tr><td style="padding:14px 0 6px;">
      <p style="margin:0 0 10px;font-size:12px;color:#9a9a9a;letter-spacing:.06em;text-transform:uppercase;">Message</p>
      <div style="font-size:16px;line-height:1.7;color:#1a1a1a;">{msg_html}</div>
    </td></tr>
    <tr><td style="padding:34px 0 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td bgcolor="{accent}" style="border-radius:10px;"><a href="mailto:{esc(email)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#1a0d05;text-decoration:none;border-radius:10px;">Reply to {esc(name)}</a></td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:48px 0 0;font-size:12px;color:#b5b5b5;line-height:1.7;">
      <p style="margin:0 0 2px;font-weight:600;color:#6a6a6a;">Rayl Technologies BV</p>
      <p style="margin:0;">Antwerp, Belgium</p>
      <p style="margin:6px 0 0;"><a href="https://rayl.be" style="color:{accent};text-decoration:none;">rayl.be</a></p>
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
        if self.path.rstrip("/") == "/api/track":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length) if length else b"{}"
                data = json.loads(raw.decode("utf-8") or "{}")
            except Exception:  # noqa: BLE001
                data = {}
            ip = (self.headers.get("X-Forwarded-For", "")
                  or self.client_address[0] or "")
            print("[track]", json.dumps({
                "ip": ip.split(",")[0].strip(),
                "country": self.headers.get("X-Vercel-IP-Country", "(local)"),
                "path": str(data.get("path", ""))[:200],
                "referrer": str(data.get("referrer", ""))[:300],
                "ua": self.headers.get("User-Agent", "")[:300],
            }))
            self.send_response(204)
            self.end_headers()
            return

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
