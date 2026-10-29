"""Serve local builds without retaining outdated HTML or process frames."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import re
import json
import io
import os
import tempfile
import uuid

IMAGE_KEY = r'(?:product-[0-9]+|new_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'

def image_type(data):
    if data.startswith(b'\x89PNG'): return 'image/png'
    if data.startswith(b'GIF8'): return 'image/gif'
    if data.startswith(b'RIFF') and data[8:12] == b'WEBP': return 'image/webp'
    return 'image/jpeg'


class LocalHandler(SimpleHTTPRequestHandler):
    image_root = Path(__file__).resolve().parent.parent / '.local/product-composition'

    def image_name(self):
        path = urlsplit(self.path).path
        match = re.fullmatch(r'/__product-images/(' + IMAGE_KEY + r'\.img)', path)
        return match.group(1) if match else None

    def local_host(self):
        return self.headers.get('Host') in ('localhost:' + str(self.server.server_port), '127.0.0.1:' + str(self.server.server_port))

    def json_reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        # Same-origin, loopback-only local file writes; no public upload endpoint.
        name = self.image_name()
        if not name or not self.local_host():
            self.json_reply(404, {'error': 'Ruta de imagen no válida.'})
            return
        if self.headers.get('Origin') != 'http://' + self.headers.get('Host', '') or self.headers.get('X-Sigmyp-Local-Image') != '1':
            self.json_reply(403, {'error': 'Abre la aplicación desde este servidor local.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if length <= 0 or length > 5 * 1024 * 1024:
            self.json_reply(413, {'error': 'La imagen debe pesar como máximo 5 MB.'})
            return
        if self.headers.get('Content-Type') not in ('image/png', 'image/jpeg', 'image/webp'):
            self.json_reply(415, {'error': 'Selecciona PNG, JPG o WebP.'})
            return
        self.connection.settimeout(15)
        try:
            from PIL import Image
            data = self.rfile.read(length)
            if len(data) != length: raise ValueError('Archivo incompleto')
            with Image.open(io.BytesIO(data)) as img:
                if img.format not in ('PNG', 'JPEG', 'WEBP') or img.width * img.height > 25000000:
                    raise ValueError('Formato o dimensiones no permitidos')
                img.verify()
            with Image.open(io.BytesIO(data)) as img:
                img.load()
        except Exception:
            self.json_reply(400, {'error': 'No se pudo leer la imagen. Usa PNG, JPG o WebP de hasta 25 megapíxeles.'})
            return
        folder = self.image_root / 'image-overrides'
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / name
        temp = None
        try:
            if target.exists():
                history = self.image_root / 'image-history'
                history.mkdir(parents=True, exist_ok=True)
                (history / (name + '.' + uuid.uuid4().hex)).write_bytes(target.read_bytes())
            with tempfile.NamedTemporaryFile(dir=folder, delete=False) as f:
                temp = f.name
                f.write(data)
            os.replace(temp, target)
            self.json_reply(200, {'saved': True})
        except OSError:
            self.json_reply(500, {'error': 'No se pudo guardar el archivo en este computador.'})
        finally:
            if temp and os.path.exists(temp): os.unlink(temp)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        # Local overrides take precedence; original migration images remain intact.
        if urlsplit(self.path).path.startswith('/__product-images/'):
            name = self.image_name()
            if not name or not self.local_host():
                self.send_error(404)
                return
            asset = self.image_root / 'image-overrides' / name
            if not asset.is_file(): asset = self.image_root / 'images' / name
            if not asset.is_file():
                self.send_error(404)
                return
            data = asset.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', image_type(data))
            self.send_header('Content-Length', str(len(data)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(data)
            return
        # Always serve current files, even when a browser has an older validator.
        for header in ('If-Modified-Since', 'If-None-Match'):
            if header in self.headers:
                del self.headers[header]
        super().do_GET()

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent / 'dist-cloud'
    with ThreadingHTTPServer(('127.0.0.1', 5504), partial(LocalHandler, directory=str(root))) as server:
        print('SIGMYP local: http://localhost:5504', flush=True)
        server.serve_forever()
