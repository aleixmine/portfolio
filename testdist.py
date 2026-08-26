# serve.py
import http.server
import os

PORT = 8000
DIST_DIR = "dist"  # carpeta de tu build

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Ruta al archivo pedido dentro de dist/
        requested_path = self.translate_path(self.path)

        # Si el archivo existe (JS, CSS, imágenes...), sírvelo normal
        if os.path.isfile(requested_path):
            return super().do_GET()

        # Si no existe, fallback a index.html (igual que try_files en nginx)
        self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), SPAHandler) as httpd:
        print(f"Sirviendo {DIST_DIR}/ en http://localhost:{PORT}")
        httpd.serve_forever()