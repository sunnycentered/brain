#!/usr/bin/env bash
# manage.sh - start/stop/restart/status and logs for public-insta (WSL-friendly)
# Creates timestamped rotating logs per start and stores pids in run/

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/logs"
RUN_DIR="$ROOT/run"
KEEP_LOGS=10

mkdir -p "$LOG_DIR"
mkdir -p "$RUN_DIR"

timestamp_file() { cat "$RUN_DIR/start.timestamp" 2>/dev/null || echo "none"; }

current_prefix() {
  if [ -f "$RUN_DIR/start.timestamp" ]; then
    echo "$LOG_DIR/app-$(cat "$RUN_DIR/start.timestamp")"
  else
    echo "$LOG_DIR/app-unknown"
  fi
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found in PATH. Please install Node.js (LTS 18.x or 20.x recommended) and try again." >&2
    echo "On WSL you can install nvm and then: nvm install 18 && nvm use 18" >&2
    return 1
  fi
  ver=$(node -v 2>/dev/null | sed 's/^v//')
  major=${ver%%.*}
  if [ -z "$major" ]; then
    echo "Unable to parse Node.js version ($ver). Proceeding but watch for build failures." >&2
    return 0
  fi
  if [ "$major" -ge 24 ]; then
    cat <<EOF >&2
Detected Node.js v$ver. Native modules like 'better-sqlite3' may not compile against this Node version due to V8/API changes.
Recommended actions:
  - Use Node.js LTS 18.x or 20.x (install via nvm):
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
      source ~/.nvm/nvm.sh
      nvm install 18
      nvm use 18
  - Install OS build dependencies (WSL / Debian/Ubuntu):
      sudo apt update && sudo apt install -y build-essential python3 pkg-config libsqlite3-dev

After switching Node versions, re-run this script. Aborting now to avoid long native rebuild failures.
EOF
    return 1
  fi
  return 0
}

start() {
  # Check node version and build tool prerequisites early to avoid long install attempts
  check_node || return 1

  if [ -f "$RUN_DIR/server.pid" ] || [ -f "$RUN_DIR/client.pid" ]; then
    echo "App already appears to be running (run/ contains pid files). Use status to check or stop first." >&2
    return 1
  fi

  TS=$(date +"%Y%m%d-%H%M%S")
  echo "$TS" > "$RUN_DIR/start.timestamp"

  PREFIX="$LOG_DIR/app-$TS"
  SERVER_LOG="$PREFIX-server.log"
  CLIENT_LOG="$PREFIX-client.log"
  COMBINED_LOG="$PREFIX-combined.log"

  echo "Starting backend and frontend. Logs: $SERVER_LOG, $CLIENT_LOG"

  # Ensure dependencies are installed for server and client. If node_modules missing, run npm install and log output.
  if [ ! -d "$ROOT/server/node_modules" ]; then
    echo "server/node_modules not found — installing server dependencies..."
    INST_LOG="$PREFIX-server-install.log"
    npm --prefix "$ROOT/server" install >"$INST_LOG" 2>&1 || {
      echo "Server npm install failed. See $INST_LOG" >&2
      tail -n 200 "$INST_LOG" || true
      return 1
    }
  fi

  if [ ! -d "$ROOT/client/node_modules" ]; then
    echo "client/node_modules not found — installing client dependencies..."
    INST_LOG_C="$PREFIX-client-install.log"
    npm --prefix "$ROOT/client" install >"$INST_LOG_C" 2>&1 || {
      echo "Client npm install failed. See $INST_LOG_C" >&2
      tail -n 200 "$INST_LOG_C" || true
      return 1
    }
  fi

  # Start server (node) via npm; uses server/package.json start script
  nohup bash -lc "npm --prefix \"$ROOT/server\" start" >"$SERVER_LOG" 2>&1 &
  echo $! > "$RUN_DIR/server.pid"

  # Start client (vite) via npm --prefix client run dev
  nohup bash -lc "npm --prefix \"$ROOT/client\" run dev" >"$CLIENT_LOG" 2>&1 &
  echo $! > "$RUN_DIR/client.pid"

  # Create a combined log that is the concatenation of both logs for quick reference
  (tail -F "$SERVER_LOG" "$CLIENT_LOG" >> "$COMBINED_LOG" 2>&1) &
  echo $! > "$RUN_DIR/combined.tail.pid"

  # Update symlink to latest
  ln -sf "$PREFIX" "$LOG_DIR/current"

  echo "Started. Server PID: $(cat $RUN_DIR/server.pid), Client PID: $(cat $RUN_DIR/client.pid)"
  echo "Recent errors (case-insensitive grep 'error') from logs:"
  grep -i --color=always -n "error" "$SERVER_LOG" "$CLIENT_LOG" 2>/dev/null | tail -n 50 || echo "(no recent errors)"

  rotate_logs
}

stop() {
  local killed=0
  for f in "$RUN_DIR/server.pid" "$RUN_DIR/client.pid" "$RUN_DIR/combined.tail.pid"; do
    if [ -f "$f" ]; then
      pid=$(cat "$f")
      if kill -0 "$pid" 2>/dev/null; then
        echo "Stopping pid $pid..."
        kill "$pid" && killed=$((killed+1))
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
          echo "PID $pid did not exit, sending SIGKILL"
          kill -9 "$pid" || true
        fi
      fi
      rm -f "$f"
    fi
  done
  rm -f "$RUN_DIR/start.timestamp"
  if [ $killed -eq 0 ]; then
    echo "No running processes stopped (pid files may not exist)."
  else
    echo "Stopped processes."
  fi
}

status() {
  echo "Application status"
  if [ -f "$RUN_DIR/server.pid" ]; then
    spid=$(cat "$RUN_DIR/server.pid")
    if kill -0 "$spid" 2>/dev/null; then
      echo "  Server: running (pid $spid)"
    else
      echo "  Server: pid file exists but process not found (pid $spid)"
    fi
  else
    echo "  Server: not running"
  fi

  if [ -f "$RUN_DIR/client.pid" ]; then
    cpid=$(cat "$RUN_DIR/client.pid")
    if kill -0 "$cpid" 2>/dev/null; then
      echo "  Client: running (pid $cpid)"
    else
      echo "  Client: pid file exists but process not found (pid $cpid)"
    fi
  else
    echo "  Client: not running"
  fi

  echo "Start timestamp: $(timestamp_file)"
  echo "Recent combined log tail (last 50 lines):"
  PREFIX=$(current_prefix)
  if [ -f "${PREFIX}-combined.log" ]; then
    tail -n 50 "${PREFIX}-combined.log"
  else
    echo "  (no combined log yet)"
  fi

  echo "Recent errors (grep 'error'):
"
  grep -i --color=always -n "error" ${PREFIX}-server.log ${PREFIX}-client.log 2>/dev/null | tail -n 100 || echo "  (no errors found)"
}

logs() {
  # Tail the current combined log
  PREFIX=$(current_prefix)
  LOG="${PREFIX}-combined.log"
  if [ -f "$LOG" ]; then
    echo "Tailing $LOG (ctrl-c to exit)"
    tail -n +1 -F "$LOG"
  else
    echo "No combined log to tail. Start the app first."
  fi
}

rotate_logs() {
  # Keep only $KEEP_LOGS most recent log sets
  files=("$LOG_DIR"/app-*[0-9]-combined.log)
  # Extract unique prefixes
  prefixes=()
  for f in "${files[@]}"; do
    [ -e "$f" ] || continue
    base=$(basename "$f" "-combined.log")
    prefixes+=("$base")
  done
  if [ ${#prefixes[@]} -le $KEEP_LOGS ]; then
    return
  fi
  # Sort and remove oldest
  IFS=$'\n' sorted=($(printf "%s\n" "${prefixes[@]}" | sort))
  remove_count=$((${#sorted[@]} - KEEP_LOGS))
  for ((i=0;i<remove_count;i++)); do
    p=${sorted[$i]}
    echo "Removing old logs for $p"
    rm -f "$LOG_DIR/${p}"-*.log || true
  done
}

help() {
  cat <<EOF
Usage: $0 {start|stop|restart|status|logs|help}

Commands:
  start     Start backend and frontend (creates timestamped rotating logs under logs/)
  stop      Stop running processes (reads pids from run/)
  restart   Stop and then start
  status    Show running status, recent logs and recent errors
  logs      Tail the current combined log
  help      Show this help

Logs and pids are stored under: $RUN_DIR and $LOG_DIR
EOF
}

case "${1-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  logs) logs ;;
  help|--help|-h) help ;;
  *) echo "Unknown command. See help."; help; exit 2 ;;
esac

