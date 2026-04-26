#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTIONS_ENV_EXAMPLE="$PROJECT_ROOT/supabase/functions/.env.example"
FUNCTIONS_ENV_FILE="$PROJECT_ROOT/supabase/functions/.env"

echo "==> Growth Copilot local runtime setup"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required but not installed."
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: Supabase CLI is required."
  echo "Install with: brew install supabase/tap/supabase"
  exit 1
fi

echo "==> Installing node dependencies"
cd "$PROJECT_ROOT"
npm install

if [ ! -f "$FUNCTIONS_ENV_FILE" ]; then
  if [ -f "$FUNCTIONS_ENV_EXAMPLE" ]; then
    echo "==> Creating supabase/functions/.env from template"
    cp "$FUNCTIONS_ENV_EXAMPLE" "$FUNCTIONS_ENV_FILE"
  else
    echo "==> Creating empty supabase/functions/.env"
    touch "$FUNCTIONS_ENV_FILE"
  fi
else
  echo "==> Existing supabase/functions/.env found; leaving as-is"
fi

if ! grep -q "^AI_PROVIDER=" "$FUNCTIONS_ENV_FILE" 2>/dev/null; then
  echo "AI_PROVIDER=gemini" >> "$FUNCTIONS_ENV_FILE"
fi

if ! grep -q "^GEMINI_API_KEY=" "$FUNCTIONS_ENV_FILE" 2>/dev/null; then
  echo "GEMINI_API_KEY=" >> "$FUNCTIONS_ENV_FILE"
fi

echo
echo "==> Setup complete"
echo "Next steps:"
echo "1) Fill in GEMINI_API_KEY in supabase/functions/.env"
echo "2) Link your Supabase project (one-time): supabase login && supabase link --project-ref <PROJECT_REF>"
echo "3) Optional local stack: supabase start"
echo "4) App checks: npm run lint && npm run build && npm run dev"
echo "5) Function checks: supabase functions serve upload-to-youtube --env-file ./supabase/functions/.env"
