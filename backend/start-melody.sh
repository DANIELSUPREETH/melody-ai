#!/usr/bin/env bash
# Runs the MelodyAI backend on this Mac and makes it public through ngrok,
# so the live site (melodymusic-ai.netlify.app) can process real uploads.
#
# First time:
#   1. Make a free account at https://ngrok.com and copy your authtoken.
#   2. Run:  ngrok config add-authtoken <your-token>
#   3. Copy your free dev domain from the ngrok dashboard (Domains page),
#      e.g. something-random.ngrok-free.app, and save it:
#        echo "something-random.ngrok-free.app" > backend/.ngrok-domain
#
# Every time:   ./backend/start-melody.sh     (Ctrl+C to stop)
# The site only works while this is running and the Mac is awake.

set -euo pipefail
cd "$(dirname "$0")"

say() { printf "\n\033[1;36m%s\033[0m\n" "$*"; }
die() { printf "\n\033[1;31m%s\033[0m\n" "$*"; exit 1; }

# --- Tools ---------------------------------------------------------------
command -v brew >/dev/null || die "Homebrew is needed. Install it from https://brew.sh and run this again."
for pkg in python@3.11 ffmpeg ngrok; do
  if ! brew list "$pkg" >/dev/null 2>&1; then
    say "Installing $pkg..."
    if [ "$pkg" = ngrok ]; then brew install ngrok/ngrok/ngrok; else brew install "$pkg"; fi
  fi
done
PY="$(brew --prefix python@3.11)/bin/python3.11"

# --- ngrok domain --------------------------------------------------------
DOMAIN="${NGROK_DOMAIN:-$(cat .ngrok-domain 2>/dev/null || true)}"
DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%/}"
[ -n "$DOMAIN" ] || die "No ngrok domain set. See the 'First time' steps at the top of this file."
ngrok config check >/dev/null 2>&1 || die "ngrok isn't set up yet. Run: ngrok config add-authtoken <your-token>"

# --- Python packages (first run takes a few minutes) ---------------------
if [ ! -x .venv/bin/python ]; then
  say "Creating Python environment..."
  "$PY" -m venv .venv
fi
if [ ! -f .venv/.installed ] || [ requirements.txt -nt .venv/.installed ]; then
  say "Installing Python packages (first time takes 5-10 minutes)..."
  .venv/bin/pip install --upgrade pip -q
  .venv/bin/pip install -r requirements.txt
  say "Downloading the Demucs model..."
  .venv/bin/python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
  touch .venv/.installed
fi

# --- Run -----------------------------------------------------------------
export PUBLIC_URL="https://$DOMAIN"
cleanup() { kill "${API_PID:-}" "${NGROK_PID:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

say "Starting the API on port 8000..."
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 &
API_PID=$!

for _ in $(seq 1 60); do
  curl -s http://127.0.0.1:8000/ >/dev/null && break
  sleep 1
done

say "Opening the tunnel at $PUBLIC_URL ..."
ngrok http 8000 --url="$PUBLIC_URL" --log=stdout --log-level=warn &
NGROK_PID=$!

sleep 4
if curl -s -H "ngrok-skip-browser-warning: true" "$PUBLIC_URL/" | grep -q '"ok"'; then
  say "MelodyAI is live: $PUBLIC_URL  (keep this window open, Ctrl+C to stop)"
else
  say "The tunnel didn't answer yet. Check the messages above."
fi

# Stop when either process exits; caffeinate keeps the Mac awake meanwhile.
caffeinate -i -w "$API_PID" &
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGROK_PID" 2>/dev/null; do
  sleep 2
done
say "MelodyAI stopped."
