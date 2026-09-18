#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo -e "${BOLD}${BLUE}📣 ProMarketer — Setup${RESET}"
echo -e "Setting up your local marketing assistant...\n"

# ── Check requirements ──────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required. Install from https://python.org"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Install from https://nodejs.org"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Python virtual environment ───────────────────────────────────────────────
echo -e "${YELLOW}[1/4]${RESET} Setting up Python environment..."
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r backend/requirements.txt
echo -e "     ${GREEN}✓ Python packages installed${RESET}"

# ── Frontend build ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/4]${RESET} Installing frontend dependencies..."
cd frontend
npm install --silent
echo -e "     ${GREEN}✓ Node packages installed${RESET}"

echo -e "${YELLOW}[3/4]${RESET} Building frontend..."
npm run build --silent
cd ..
echo -e "     ${GREEN}✓ Frontend built${RESET}"

# ── Launch ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4]${RESET} Starting ProMarketer...\n"
echo -e "${BOLD}${GREEN}✅ ProMarketer is ready!${RESET}"
echo -e "   Opening: ${BLUE}http://localhost:8000${RESET}\n"
echo -e "   Press ${BOLD}Ctrl+C${RESET} to stop.\n"

# Open browser after short delay
(sleep 2 && open "http://localhost:8000" 2>/dev/null || xdg-open "http://localhost:8000" 2>/dev/null || true) &

source .venv/bin/activate
PYTHONPATH="$SCRIPT_DIR" uvicorn backend.main:app --host 0.0.0.0 --port 8000
