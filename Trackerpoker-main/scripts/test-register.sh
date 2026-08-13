#!/usr/bin/env bash
# Verifica el registry y registra un usuario de prueba en el Sheet maestro.
# Uso: ./scripts/test-register.sh [slug] [email]
# Requiere: Code.gs desplegado con setupRegistry() ejecutado.

set -euo pipefail

URL="${VITE_REGISTRY_SCRIPT_URL:-https://script.google.com/macros/s/AKfycbwIMlaknlGwPUTGtcjiYpFNwRH3g73G0e3BdndvDqI9BMrLNXpWyn-GvRn9nusID4o/exec}"
SLUG="${1:-nahuel}"
EMAIL="${2:-test@example.com}"
SHEET_ID="${3:-1VA-fLXpqY12A6rdFiE6Y3x1KWRoNpy8qdkAI67jOTz4}"

echo "→ Health check..."
HEALTH=$(curl -sL --max-time 15 "${URL}?action=registryHealth")
echo "$HEALTH"

if echo "$HEALTH" | grep -q '"Unknown action"'; then
  echo ""
  echo "❌ Apps Script desactualizado. Pegá Code.gs, ejecutá setupRegistry() y redeploy."
  exit 1
fi

echo ""
echo "→ Registrando usuario '${SLUG}'..."
REGISTER=$(curl -sG --max-time 20 "${URL}" \
  --data-urlencode "action=registerUser" \
  --data-urlencode "email=${EMAIL}" \
  --data-urlencode "displayName=Nahuel Test" \
  --data-urlencode "googleId=test-$(date +%s)" \
  --data-urlencode "slug=${SLUG}" \
  --data-urlencode "pokerSheetId=${SHEET_ID}" \
  --data-urlencode "pokerSheetUrl=https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit")
echo "$REGISTER"

echo ""
echo "→ Usuarios en Sheet maestro:"
curl -sL --max-time 15 "${URL}?action=listUsers"
echo ""
