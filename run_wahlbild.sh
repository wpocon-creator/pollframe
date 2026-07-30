#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
URL="http://127.0.0.1:4173/"
LOCAL_CHROME="${XDG_DATA_HOME:-$HOME/.local/share}/google-chrome/google-chrome"

if command -v google-chrome-stable >/dev/null 2>&1; then
  BROWSER_BIN="$(command -v google-chrome-stable)"
elif command -v google-chrome >/dev/null 2>&1; then
  BROWSER_BIN="$(command -v google-chrome)"
elif [[ -x "$LOCAL_CHROME" ]]; then
  BROWSER_BIN="$LOCAL_CHROME"
else
  BROWSER_BIN=""
fi

open_wahlbild() {
  if [[ "${WAHLBILD_NO_OPEN:-0}" == "1" ]]; then
    return
  fi

  if [[ -n "$BROWSER_BIN" ]]; then
    "$BROWSER_BIN" --new-window --start-maximized "$URL" >/dev/null 2>&1 &
  else
    xdg-open "$URL" >/dev/null 2>&1 || true
  fi
}

cd "$APP_DIR"

if curl -fsS "$URL" >/dev/null 2>&1; then
  echo "Pollframe is already running."
  open_wahlbild
  sleep 1
  exit 0
fi

if [[ ! -f "$APP_DIR/dist/index.html" ]] || find "$APP_DIR/src" "$APP_DIR/public" "$APP_DIR/index.html" -newer "$APP_DIR/dist/index.html" -print -quit | grep -q .; then
  echo "Preparing the latest Pollframe version..."
  npm run build
fi

(
  for _ in $(seq 1 30); do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      open_wahlbild
      exit 0
    fi
    sleep 1
  done
  echo "Pollframe did not become ready within 30 seconds."
) &

echo "Starting Pollframe"
echo "URL: $URL"
echo "Leave this terminal open while using the app."
echo

status=0
npm run preview -- --host 127.0.0.1 --port 4173 || status=$?

echo
if [[ "$status" -ne 0 ]]; then
  echo "Pollframe exited with status $status."
else
  echo "Pollframe stopped."
fi
read -r -p "Press Enter to close this window..."
exit "$status"
