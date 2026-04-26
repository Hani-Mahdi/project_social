#!/usr/bin/env bash
# Installs the project's git hooks. Idempotent — safe to re-run.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"
HOOK_PATH="$HOOK_DIR/pre-commit"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found on PATH."
  echo "Install it before re-running this script:"
  echo "  macOS:  brew install gitleaks"
  echo "  Linux:  https://github.com/gitleaks/gitleaks/releases"
  exit 1
fi

mkdir -p "$HOOK_DIR"

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh — do not edit by hand.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
gitleaks protect --staged --redact --no-banner --config "$REPO_ROOT/.gitleaks.toml"
HOOK

chmod +x "$HOOK_PATH"

echo "Pre-commit hook installed at $HOOK_PATH"
echo
echo "Smoke test (in a fresh branch you can throw away):"
echo "  echo 'AIzaSyTESTFAKEFAKEFAKEFAKEFAKEFAKEFAKEFA1' > leak.txt"
echo "  git add leak.txt && git commit -m 'should fail'"
echo "  # expect: gitleaks blocks the commit"
echo "  rm leak.txt && git restore --staged leak.txt"
