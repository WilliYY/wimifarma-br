#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Uso: bash %s [--local-url URL] [--public-url URL]\n' "$0"
}

local_url=http://127.0.0.1:3001
public_url=
origin_pattern='^https?://([[:alnum:].-]+|\[[[:xdigit:]:.]+\])(:[0-9]+)?/?$'

while (($#)); do
  case "$1" in
    --local-url|--public-url)
      if [[ ! ${2:-} =~ $origin_pattern ]]; then
        printf 'Informe uma origem HTTP(S) valida para %s.\n' "$1" >&2
        usage >&2
        exit 2
      fi
      if [[ $1 == --local-url ]]; then
        local_url=${2%/}
      else
        public_url=${2%/}
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v python3 >/dev/null; then
  printf 'Comando necessario: python3\n' >&2
  exit 2
fi

python3 - "$local_url" "$public_url" <<'PY'
from html.parser import HTMLParser
from http.client import HTTPConnection, HTTPException, HTTPSConnection
import json
import sys
from urllib.parse import urlsplit

BODY_LIMIT = 65536


class SiteMetadata(HTMLParser):
    is_wimifarma = False
    is_checkout = False
    in_title = False
    title = ""

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            metadata = dict(attrs)
            if metadata.get("property") == "og:site_name" and metadata.get("content") == "Wimifarma":
                self.is_wimifarma = True
        elif tag == "title":
            self.in_title = True
            self.title = ""

    def handle_data(self, data):
        if self.in_title:
            self.title += data

    def handle_endtag(self, tag):
        if tag == "title" and self.in_title:
            self.in_title = False
            if self.title.strip() == "Checkout | Wimifarma":
                self.is_checkout = True


def health_ok(body):
    if len(body) > BODY_LIMIT:
        return False
    try:
        payload = json.loads(body)
    except (ValueError, RecursionError):
        return False
    return isinstance(payload, dict) and payload.get("ok") is True and payload.get("service") == "wimifarma-br"


def check_path(origin, path):
    connection_type = HTTPSConnection if origin.scheme == "https" else HTTPConnection
    connection = connection_type(origin.netloc, timeout=10)
    try:
        connection.request("GET", path)
        with connection.getresponse() as response:
            if response.status != 200:
                return f"HTTP {response.status}, esperado 200."

            if path == "/api/health":
                if not health_ok(response.read(BODY_LIMIT + 1)):
                    return "resposta JSON inesperada."
                return None

            if response.headers.get_content_type() != "text/html":
                return "Content-Type inesperado, esperado text/html."

            metadata = SiteMetadata()
            metadata.feed(response.read(BODY_LIMIT).decode("utf-8", errors="replace"))
            if not metadata.is_wimifarma:
                return "marcador og:site_name da Wimifarma ausente."
            if path == "/checkout" and not metadata.is_checkout:
                return "titulo do checkout ausente."
    except (HTTPException, OSError, ValueError):
        return "falha de comunicacao."
    finally:
        connection.close()
    return None


targets = []
for label, url in zip(("Local", "Publico"), sys.argv[1:]):
    if url:
        try:
            origin = urlsplit(url)
            if origin.port == 0:
                raise ValueError("porta zero")
        except ValueError:
            print(f"{label}: origem HTTP(S) invalida.", file=sys.stderr)
            sys.exit(2)
        targets.append((label, origin))

result = 0
for label, origin in targets:
    for path in ("/api/health", "/", "/checkout"):
        failure = check_path(origin, path)
        if failure:
            print(f"{label} {path}: {failure}", file=sys.stderr)
            result = 1
        else:
            print(f"{label} {path}: HTTP 200.")
sys.exit(result)
PY
