#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/ambiente.sh"
# Makes the HTTPS certificate the phones need for the microphone (docs/ascolto.md, «HTTPS»), with mkcert:
# - a local CA, kept in mkcert's own folder (`mkcert -CAROOT`): its private key never leaves that folder;
# - a certificate for this computer's LAN addresses, its host name and localhost, in cache/https/ (not in git):
#   telefoni.pem, telefoni-key.pem, and rootCA.pem = a copy of the CA's PUBLIC certificate, the one the phones install.
# The game server picks it up at its next start and answers https on the same port. Run this again when the computer
# gets another address on the network (the server log says so at start-up).
#   scripts/certificato.sh [extra-name-or-ip ...]
# Nothing is installed in this Mac's trust store (the projector uses http://localhost). `mkcert -install` would do
# that, asking for the password; it is not needed to play.
set -euo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${TAGM_CERTIFICATI:-$RADICE/cache/https}"

if ! command -v mkcert > /dev/null; then
  echo "certificate: mkcert is missing. Install it with: brew install mkcert"
  exit 1
fi

# Every non-internal IPv4 address of this computer (the phones reach it on one of them), as the server sees them.
IPS="$(node -e 'const os=require("os");const s=new Set();for(const a of Object.values(os.networkInterfaces()).flat())if(a&&a.family==="IPv4"&&!a.internal&&!a.address.startsWith("169.254."))s.add(a.address);console.log([...s].join(" "))')"
NOME="$(hostname -s 2>/dev/null || hostname)"
NOMI=(localhost 127.0.0.1 ::1 "$NOME" "$NOME.local")
for ip in $IPS; do NOMI+=("$ip"); done
NOMI+=("$@")

mkdir -p "$DIR"
chmod 700 "$DIR"
mkcert -cert-file "$DIR/telefoni.pem" -key-file "$DIR/telefoni-key.pem" "${NOMI[@]}" 2>&1 | grep -v "^$" | sed 's/^/  mkcert: /'
chmod 600 "$DIR/telefoni-key.pem"

CAROOT="$(mkcert -CAROOT)"
# Only the public certificate of the CA is copied; the file is checked so a key can never end up being served.
cp "$CAROOT/rootCA.pem" "$DIR/rootCA.pem"
if grep -q "PRIVATE KEY" "$DIR/rootCA.pem" || ! grep -q "BEGIN CERTIFICATE" "$DIR/rootCA.pem"; then
  rm -f "$DIR/rootCA.pem"
  echo "certificate: $CAROOT/rootCA.pem is not a plain public certificate; nothing copied"
  exit 1
fi
chmod 644 "$DIR/rootCA.pem"

SCADE="$(openssl x509 -enddate -noout -in "$DIR/telefoni.pem" 2>/dev/null | cut -d= -f2 || true)"
echo
echo "certificate ready in ${DIR#$RADICE/}/ for: ${NOMI[*]}"
[[ -n "$SCADE" ]] && echo "  valid until: $SCADE"
echo "  CA (private key stays here, never copied): $CAROOT"
echo
echo "Next: restart the game (scripts/partita.sh …): the phones' address becomes https."
echo "Each phone, once: open http://<this computer's address>:4610/certificato and follow the steps (Android / iPhone)."
