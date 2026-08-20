#!/usr/bin/env bash
# TC-AUTH-001..008 functional tests for P4.AI auth backend
# Branch: p1-auth-login, commit: 0ffca83
# Run against dev server on localhost:3001

BASE="http://localhost:3001"
COOKIE_JAR="/tmp/p4ai-test-cookies.txt"
rm -f "$COOKIE_JAR"
PASS=0
FAIL=0
RESULTS=""
DB_ID_FILE="/tmp/p4ai-user-ids.txt"

log() { echo "--- $1 ---"; }

record() {
  local id="$1" prd="$2" title="$3" result="$4" notes="${5:-—}"
  RESULTS+="| ${id} | ${prd} | ${title} | ${result} | ${notes} |"$'\n'
  if [ "$result" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo ">>> RESULT: ${id} = ${result} — ${title} <<<"
}

get_json_val() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d${1})" 2>/dev/null || echo "NONE"
}

get_csrf() {
  curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE/api/auth/csrf" | get_json_val "['csrfToken']"
}

login() {
  local name="$1" pass="$2"
  local csrf=$(get_csrf)
  curl -s -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -X POST "$BASE/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "name=${name// /+}&password=${pass}&csrfToken=${csrf}"
}

session_user() {
  curl -s -b "$COOKIE_JAR" "$BASE/api/auth/session" | get_json_val "['user']['name']"
}

session_role() {
  curl -s -b "$COOKIE_JAR" "$BASE/api/auth/session" | get_json_val "['user']['role']"
}

get_user_id() {
  local role="$1"
  cd /home/ghostbreaker/multica_workspaces/6367d485-0bf5-477e-883e-c56b31c4a3c1/1d173519/workdir/P4.AI && npx tsx get-user-id.ts "${role}" 2>/dev/null
}

# ============================================================
# TC-AUTH-001: Login with valid name + password (AUTH-01)
# ============================================================
log "TC-AUTH-001: Login valid credentials (SUPER_ADMIN)"
rm -f "$COOKIE_JAR"
login "Admin Raisani" "10001"
SESS_USER=$(session_user)
log "Session user: $SESS_USER"
if [ "$SESS_USER" = "Admin Raisani" ]; then
  record "TC-AUTH-001" "AUTH-01" "Login valid name+password" "PASS"
else
  record "TC-AUTH-001" "AUTH-01" "Login valid name+password" "FAIL" "Session user: '$SESS_USER'"
fi

# ============================================================
# TC-AUTH-002: Login with wrong password rejected (AUTH-01)
# ============================================================
log "TC-AUTH-002: Login wrong password rejected"
rm -f "$COOKIE_JAR"
login "Admin Raisani" "wrongpass"
SESS_USER=$(session_user)
log "Session after bad login: '$SESS_USER'"
if [ "$SESS_USER" = "NONE" ] || [ -z "$SESS_USER" ]; then
  record "TC-AUTH-002" "AUTH-01" "Login wrong password rejected" "PASS"
else
  record "TC-AUTH-002" "AUTH-01" "Login wrong password rejected" "FAIL" "Session still active: '$SESS_USER'"
fi

# ============================================================
# TC-AUTH-003: Session persists + carries role (AUTH-06)
# ============================================================
log "TC-AUTH-003: Session persistence + role claim"
rm -f "$COOKIE_JAR"
login "Sekretaris Dini" "10002"
SESS_NAME=$(session_user)
SESS_ROLE=$(session_role)
log "Session: name=$SESS_NAME role=$SESS_ROLE"
if [ "$SESS_NAME" = "Sekretaris Dini" ] && [ "$SESS_ROLE" = "SECRETARY" ]; then
  record "TC-AUTH-003" "AUTH-06" "Session persists + role claim" "PASS"
else
  record "TC-AUTH-003" "AUTH-06" "Session persists + role claim" "FAIL" "name=$SESS_NAME role=$SESS_ROLE"
fi

# ============================================================
# TC-AUTH-004: RBAC — reset-password requires SUPER_ADMIN (AUTH-04, §6)
# ============================================================
log "TC-AUTH-004: RBAC reset-password requires SUPER_ADMIN"
# Currently logged in as SECRETARY — try reset-password on student
STUDENT_ID=$(get_user_id "STUDENT")
log "Student ID from DB: $STUDENT_ID"
RESET_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/admin/users/${STUDENT_ID}/reset-password")
log "Reset as SECRETARY: HTTP $RESET_CODE (expect 403)"
if [ "$RESET_CODE" = "403" ]; then
  record "TC-AUTH-004" "AUTH-04" "RBAC reset-password SECRETARY→403" "PASS"
else
  record "TC-AUTH-004" "AUTH-04" "RBAC reset-password SECRETARY→403" "FAIL" "Got $RESET_CODE, expected 403"
fi

# ============================================================
# TC-AUTH-005: Change own password (AUTH-03) — all roles
# ============================================================
log "TC-AUTH-005: Change own password (SECRETARY)"
CHANGE_RESP=$(curl -s -b "$COOKIE_JAR" \
  -X POST "$BASE/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"10002","newPassword":"newpass88"}')
log "Change-password response: $CHANGE_RESP"
CHANGE_OK=$(echo "$CHANGE_RESP" | get_json_val "['ok']")
if [ "$CHANGE_OK" = "True" ]; then
  record "TC-AUTH-005" "AUTH-03" "Change own password (all roles)" "PASS"
else
  record "TC-AUTH-005" "AUTH-03" "Change own password (all roles)" "FAIL" "Response: $CHANGE_RESP"
fi

# Verify new password works
rm -f "$COOKIE_JAR"
login "Sekretaris Dini" "newpass88"
SESS_NEW=$(session_user)
log "Login with new password: '$SESS_NEW'"
if [ "$SESS_NEW" = "Sekretaris Dini" ]; then
  echo "  ✓ New password works after change"
else
  echo "  ✗ New password failed after change"
fi

# ============================================================
# TC-AUTH-006: Admin reset password to NIS (AUTH-04)
# ============================================================
log "TC-AUTH-006: Admin reset-password to NIS"
# Login as SUPER_ADMIN
rm -f "$COOKIE_JAR"
login "Admin Raisani" "10001"

# Reset secretary's password back to NIS (10002)
SEC_ID=$(get_user_id "SECRETARY")
log "Secretary ID: $SEC_ID"
RESET_RESP=$(curl -s -b "$COOKIE_JAR" \
  -X POST "$BASE/api/admin/users/${SEC_ID}/reset-password" \
  -H "Content-Type: application/json")
log "Reset response: $RESET_RESP"
RESET_OK=$(echo "$RESET_RESP" | get_json_val "['ok']")

# Verify secretary can now login with NIS again
rm -f "$COOKIE_JAR"
login "Sekretaris Dini" "10002"
SESS_RESET=$(session_user)
log "Login after reset with NIS: '$SESS_RESET'"

if [ "$RESET_OK" = "True" ] && [ "$SESS_RESET" = "Sekretaris Dini" ]; then
  record "TC-AUTH-006" "AUTH-04" "Admin reset password to NIS" "PASS"
else
  record "TC-AUTH-006" "AUTH-04" "Admin reset password to NIS" "FAIL" "reset=$RESET_OK login=$SESS_RESET"
fi

# ============================================================
# TC-AUTH-007: Logout clears session (AUTH-08)
# ============================================================
log "TC-AUTH-007: Logout clears session"
# Currently logged in as secretary from TC-006
CSRF_LO=$(get_csrf)
LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/auth/signout" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=${CSRF_LO}")
log "Logout code: $LOGOUT_CODE"
SESS_LO=$(session_user)
log "Session after logout: '$SESS_LO'"
if [ "$SESS_LO" = "NONE" ] || [ -z "$SESS_LO" ]; then
  record "TC-AUTH-007" "AUTH-08" "Logout clears session" "PASS"
else
  record "TC-AUTH-007" "AUTH-08" "Logout clears session" "FAIL" "Session still has: '$SESS_LO'"
fi

# ============================================================
# TC-AUTH-008: Unauthenticated access to protected endpoints (AUTH-07/NFR-05)
# ============================================================
log "TC-AUTH-008: Unauth access to protected endpoints"
rm -f "$COOKIE_JAR"
UNAUTH_CP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"x","newPassword":"12345678"}')
UNAUTH_RP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/admin/users/some-id/reset-password" \
  -H "Content-Type: application/json")
log "Unauth change-password: HTTP $UNAUTH_CP (expect 401)"
log "Unauth reset-password: HTTP $UNAUTH_RP (expect 401)"
if [ "$UNAUTH_CP" = "401" ] && [ "$UNAUTH_RP" = "401" ]; then
  record "TC-AUTH-008" "AUTH-07" "Unauth→401 on protected endpoints" "PASS"
else
  record "TC-AUTH-008" "AUTH-07" "Unauth→401 on protected endpoints" "FAIL" "change=$UNAUTH_CP reset=$UNAUTH_RP"
fi

# ============================================================
# Edge cases
# ============================================================
echo ""
echo "=== EDGE CASES ==="

# Edge: change-password validation — short password
log "Edge: change-password too short (<8 chars)"
rm -f "$COOKIE_JAR"
login "Siswa Andi" "10003"
SHORT_RESP=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"10003","newPassword":"short"}')
log "Short password change: HTTP $SHORT_RESP (expect 400)"
if [ "$SHORT_RESP" = "400" ]; then
  echo "  ✓ Short password rejected (400)"
else
  echo "  ✗ Short password should return 400, got $SHORT_RESP"
fi

# Edge: change-password same password
log "Edge: change-password same as current"
SAME_RESP=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"10003","newPassword":"10003"}')
log "Same password change: HTTP $SAME_RESP (expect 400)"
if [ "$SAME_RESP" = "400" ]; then
  echo "  ✓ Same password rejected (400)"
else
  echo "  ✗ Same password should return 400, got $SAME_RESP"
fi

# Edge: change-password wrong current
log "Edge: change-password wrong current"
WRONG_CUR=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrongpass","newPassword":"newpass88"}')
log "Wrong current: HTTP $WRONG_CUR (expect 401)"
if [ "$WRONG_CUR" = "401" ]; then
  echo "  ✓ Wrong current password rejected (401)"
else
  echo "  ✗ Wrong current should return 401, got $WRONG_CUR"
fi

# Edge: reset-password non-existent user
log "Edge: reset-password non-existent user"
rm -f "$COOKIE_JAR"
login "Admin Raisani" "10001"
NOTFOUND_RESP=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE/api/admin/users/nonexistent-id/reset-password")
log "Reset non-existent user: HTTP $NOTFOUND_RESP (expect 404)"
if [ "$NOTFOUND_RESP" = "404" ]; then
  echo "  ✓ Non-existent user returns 404"
else
  echo "  ✗ Non-existent user should return 404, got $NOTFOUND_RESP"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "============================================"
echo "SUMMARY: $PASS passed, $FAIL failed (of $((PASS+FAIL)))"
echo "============================================"
echo ""
echo "| TC ID | PRD Ref | Title | Result | Notes |"
echo "|-------|---------|-------|--------|-------|"
printf '%s' "$RESULTS"
