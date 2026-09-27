#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PORT="${POLLFRAME_LOCAL_PORT:-4173}"
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT > 1023 && PORT < 65536 )) || { echo "Invalid local port"; exit 1; }
URL="http://127.0.0.1:$PORT/"
LOG_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/pollframe"
mkdir -p "$LOG_DIR"
OPEN_LOG="$LOG_DIR/browser-open.log"
SERVER_LOG="$LOG_DIR/server-$PORT.log"
exec > >(tee -a "$LOG_DIR/launcher.log") 2>&1
finish() {
  local status=$?
  if (( status != 0 )); then
    echo "Pollframe konnte nicht gestartet werden (Fehler $status)."
    echo "Protokolle: $LOG_DIR"
    if [[ -t 0 ]]; then read -r -p "Enter zum Schließen …" || true; fi
  elif [[ -t 0 && "${WAHLBILD_NO_OPEN:-0}" != "1" ]]; then
    echo "Adresse: $URL — der Server läuft auch nach dem Schließen weiter."
    read -r -p "Enter zum Schließen …" || true
  fi
}
trap finish EXIT
LOCAL_CHROME="${XDG_DATA_HOME:-$HOME/.local/share}/google-chrome/google-chrome"

if [[ "${POLLFRAME_LOCAL_BROWSER:-}" == "default" ]]; then
  BROWSER_BIN=""
elif command -v google-chrome-stable >/dev/null 2>&1; then
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

  echo "Opening $URL in your browser."
  echo "If no window appears, open that address directly. Browser log: $OPEN_LOG"
  # The desktop's default Firefox currently stops at its recovery dialog.
  # Use installed Chrome for this shortcut only; leave system defaults intact.
  # Still check immediate errors rather than discarding the handoff status.
  if [[ -n "$BROWSER_BIN" ]]; then
    nohup setsid "$BROWSER_BIN" --new-window "$URL" >>"$OPEN_LOG" 2>&1 </dev/null &
  elif command -v xdg-open >/dev/null 2>&1; then
    nohup setsid xdg-open "$URL" >>"$OPEN_LOG" 2>&1 </dev/null &
  else
    echo "No browser launcher found. Open $URL manually."
    return 1
  fi
  local browser_pid=$!
  sleep 2
  if ! kill -0 "$browser_pid" 2>/dev/null; then
    if ! wait "$browser_pid"; then
      tail -20 "$OPEN_LOG"
      echo "The server is running, but the browser could not open."
      return 1
    fi
  fi
}

cd "$APP_DIR"

ready() {
  # Consume the complete response: grep -q can close the pipe early and make
  # curl fail with SIGPIPE under pipefail, despite a healthy local server.
  curl --noproxy '*' --connect-timeout 1 --max-time 2 -fsS "$URL" 2>/dev/null | grep '<title>Pollframe' >/dev/null
}

ensure_node() {
  local candidate node_major node_minor
  for candidate in "$(command -v node || true)" "$HOME"/.local/bin/node "$HOME"/.npm/_npx/*/node_modules/node/bin/node; do
    [[ -x "$candidate" ]] || continue
    read -r node_major node_minor < <("$candidate" -p 'process.versions.node.split(".").slice(0,2).join(" ")')
    if (( node_major > 22 || (node_major == 22 && node_minor >= 12) )); then
      export PATH="$(dirname -- "$candidate"):$PATH"
      return
    fi
  done
  echo "Pollframe needs Node.js 22.12 or newer; no compatible local installation was found."
  return 1
}

# Serialize startup; two double-clicks must not race to bind the same port.
exec 9>"$LOG_DIR/start-$PORT.lock"
flock -w 35 9
if ready; then
  echo "Pollframe is responding at $URL"
  flock -u 9
  open_wahlbild
  exit 0
fi

ensure_node
echo "Starting the current local source (nothing is published): $URL"
# Source mode avoids stale dist files and failing unrelated production checks.
# A separate session survives terminal closure; close the startup lock in it.
nohup setsid npm run dev -- --host 127.0.0.1 --port "$PORT" --strictPort >"$SERVER_LOG" 2>&1 </dev/null 9>&- &
SERVER_PID=$!
for ((attempt=0; attempt<30; attempt++)); do
  if ready; then
    flock -u 9
    echo "Pollframe is ready. The server keeps running when this window closes."
    open_wahlbild
    exit 0
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    status=0
    wait "$SERVER_PID" || status=$?
    tail -30 "$SERVER_LOG"
    ((status != 0)) || status=1
    exit "$status"
  fi
  sleep 1
done
echo "The local server did not become ready within 30 seconds."
tail -30 "$SERVER_LOG"
exit 1
