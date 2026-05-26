from __future__ import annotations

import base64
import io
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

import qrcode

HOST = "127.0.0.1"
PORT = 5000


def build_response(payload: dict, status: int = 200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return status, body


def generate_qr(data: dict):
    required_fields = ["usuarioId", "nombre", "email", "matricula"]
    missing = [field for field in required_fields if not str(data.get(field, "")).strip()]

    if missing:
        return build_response({
            "ok": False,
            "message": "Faltan campos obligatorios: " + ", ".join(missing)
        }, 400)

    qr_data = {
        "tipo": "usuario",
        "usuarioId": data.get("usuarioId"),
        "pacienteId": data.get("pacienteId") or data.get("usuarioId"),
        "nombre": data.get("nombre", ""),
        "correo": data.get("correo") or data.get("email", ""),
        "email": data.get("email") or data.get("correo", ""),
        "matricula": data.get("matricula", ""),
        "carrera": data.get("carrera", ""),
        "grupo": data.get("grupo", ""),
        "semestre": data.get("semestre", ""),
        "tutor": data.get("tutor", ""),
        "fechaGeneracion": data.get("fechaGeneracion") or datetime.now().isoformat(),
    }

    qr_text = json.dumps(qr_data, ensure_ascii=False)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)

    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    # pyrefly: ignore [unexpected-keyword]
    image.save(buffer, format="PNG")
    buffer.seek(0)

    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    return build_response({
        "ok": True,
        "qrImage": f"data:image/png;base64,{img_base64}",
        "qrData": qr_data,
    })


class QRHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/qr/status":
            self._send_json({"ok": True, "message": "Servidor QR activo"})
            return
        self._send_json({"ok": False, "message": "Ruta no encontrada"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/qr/generar":
            self._send_json({"ok": False, "message": "Ruta no encontrada"}, 404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            data = json.loads(raw or "{}")
            status, body = generate_qr(data)
            payload = json.loads(body.decode("utf-8"))
            self._send_json(payload, status)
        except Exception as error:
            self._send_json({"ok": False, "message": str(error)}, 500)

    def log_message(self, format, *args):
        print("[QR]", format % args)


if __name__ == "__main__":
    print(f"Servidor QR activo en http://{HOST}:{PORT}")
    print(f"Prueba de estado: http://{HOST}:{PORT}/api/qr/status")
    HTTPServer((HOST, PORT), QRHandler).serve_forever()
