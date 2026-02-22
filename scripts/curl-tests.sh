#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${E2E_BASE_URL:-http://localhost:1080}"
API_URL="${E2E_API_BASE:-${API_BASE:-http://localhost:1080}}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

check_contains() {
  local path="$1"
  local needle="$2"
  local body
  body="$(curl -sSf "${BASE_URL}${path}")"
  echo "$body" | grep -q "$needle" || fail "${path} missing: ${needle}"
}

check_status() {
  local path="$1"
  curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" | grep -q "^200$" || fail "${path} not 200"
}

echo "Testing frontend at ${BASE_URL}..."
check_status "/"
check_contains "/" "MAQZONE"
check_contains "/" "Subastas activas hoy"
check_contains "/" "Solicitar demo"
check_contains "/" "San Luis"

if [ "${CHECK_API:-1}" = "1" ]; then
  echo "Testing API at ${API_URL}..."
  curl -sS -o /dev/null -w "%{http_code}" "${API_URL}/api/health" | grep -q "^200$" || fail "api health not 200"
  curl -sS "${API_URL}/api/auctions?limit=1" | grep -q "title" || fail "api auctions missing data"
  curl -sS "${API_URL}/api/listings?limit=1" | grep -q "title" || fail "api listings missing data"

  # Test admin auth rejects without token
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/admin/auctions" -H "Content-Type: application/json" -d '{"title":"test"}')
  [ "$STATUS" = "401" ] || fail "admin should return 401 without token, got ${STATUS}"

  # Test admin CRUD with token
  TOKEN="${ADMIN_TOKEN:-change_me_please}"
  CREATED=$(curl -sS -X POST "${API_URL}/api/admin/auctions" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: ${TOKEN}" \
    -d '{"title":"Smoke Test","description":"QA test","location":"SLP","end_time":"2026-12-31T23:59:59Z"}')
  echo "$CREATED" | grep -q "Smoke Test" || fail "admin create auction failed"
  AUCTION_ID=$(echo "$CREATED" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

  # Delete the test auction
  DEL_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X DELETE "${API_URL}/api/admin/auctions/${AUCTION_ID}" \
    -H "X-Admin-Token: ${TOKEN}")
  [ "$DEL_STATUS" = "200" ] || fail "admin delete auction failed, got ${DEL_STATUS}"
fi

echo "OK: all smoke tests passed (frontend: ${BASE_URL}, api: ${API_URL})"
