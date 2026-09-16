#!/usr/bin/env bash
# LegacyMind AI - Start Script
# Launches backend (Node/Express) + frontend (Vite) for demo

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT/apps/server"
WEB_DIR="$ROOT/apps/web"

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh" && nvm use --lts 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         LegacyMind AI - Starting         ║"
echo "║  Understand. Prove. Modernize.           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  echo "ERROR: node not found."
  exit 1
fi

# Install server deps if needed
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "Installing server dependencies..."
  cd "$SERVER_DIR" && npm install
fi

# Install web deps if needed
if [ ! -d "$WEB_DIR/node_modules" ]; then
  echo "Installing web dependencies..."
  cd "$WEB_DIR" && npm install --no-package-lock
fi

# Kill any existing processes on our ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting backend on http://localhost:3001 ..."
cd "$SERVER_DIR" && npm run dev &
SERVER_PID=$!

sleep 2

echo "Starting frontend on http://localhost:5173 ..."
cd "$WEB_DIR" && npm run dev &
WEB_PID=$!

sleep 2

echo ""
echo "✓ Backend:  http://localhost:3001"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser."
echo "Press Ctrl+C to stop."
echo ""

# Cleanup on exit
trap "kill $SERVER_PID $WEB_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM

wait
