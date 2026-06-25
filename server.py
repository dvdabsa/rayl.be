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

    html = f"""
      <h2>New contact via rayl.be</h2>
      <p><strong>Name:</strong> {esc(name)}</p>
      <p><strong>Email:</strong> {esc(email)}</p>
      <p><strong>Company:</strong> {esc(company) or '—'}</p>
      <p><strong>Topic:</strong> {esc(topic) or '—'}</p>
      <p><strong>Message:</strong></p>
      <p>{esc(message).replace(chr(10), '<br>')}</p>
    """

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
