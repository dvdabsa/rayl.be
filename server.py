#!/usr/bin/env python3
"""Tiny static server that serves 404.html for not-found requests."""
import http.server
import os
import socketserver

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class CustomHandler(http.server.SimpleHTTPRequestHandler):
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
        print(f"Serving http://localhost:{PORT}")
        httpd.serve_forever()
