#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

step() {
  printf "\n==> %s\n" "$1"
}

missing=()

if ! command -v node >/dev/null 2>&1; then
  missing+=("Node.js")
fi

if ! command -v npm >/dev/null 2>&1; then
  missing+=("npm")
fi

if ! command -v xcrun >/dev/null 2>&1; then
  missing+=("Xcode Command Line Tools")
elif ! xcrun --find swift >/dev/null 2>&1; then
  missing+=("Swift from Xcode Command Line Tools")
fi

if ! command -v codesign >/dev/null 2>&1; then
  missing+=("codesign")
fi

if [ "${#missing[@]}" -gt 0 ]; then
  printf "Missing required local tool(s):\n"
  for item in "${missing[@]}"; do
    printf "  - %s\n" "$item"
  done
  printf "\nInstall Node.js and run 'xcode-select --install', then rerun 'npm run setup'.\n"
  exit 1
fi

step "Installing npm dependencies"
npm install

step "Building Codex Apple plugins"
npm run build

step "Requesting macOS Apple app permissions"
printf "Approve any macOS prompts that appear. These probes read metadata only, not private content.\n"

set +e
npm exec -- tsx scripts/request-permissions.ts
permission_status=$?
set -e

if [ "$permission_status" -eq 0 ]; then
  step "Setup complete"
  printf "The plugins are built and the permission probes passed.\n"
  exit 0
fi

step "Manual macOS permission step required"
cat <<'EOF'
The plugins were installed and built, but macOS still needs one or more privacy
toggles before every app surface is ready. This is normal on a fresh Mac:
macOS does not let a script grant these permissions automatically.

Open System Settings > Privacy & Security and check:
  - Automation: allow Codex, Terminal, or your launching app to control Mail,
    Calendar, Messages, and Notes when prompted.
  - Calendars: enable Full Access for Codex or the apple-calendar helper entry.
  - Reminders: allow Codex, Terminal, or your launching app if it appears.
  - Full Disk Access: enable Codex, Terminal, or your launching app for Messages
    reads, then restart that app.

After changing settings, rerun:

  npm run permissions:request

No mail bodies, calendar notes, reminder notes, Notes bodies, or message text
are printed by the permission probes.
EOF

exit "$permission_status"
