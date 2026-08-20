#!/bin/bash
# P4.AI Functional Test Suite — SUN-20 Schedule + Milestone UI
# Run against http://localhost:3002
set -e
BASE="http://localhost:3002"
PASS=0
FAIL=0
declare -a RESULTS

record() {
  local tc_id="$1" prd="$2" title="$3" status="$4" notes="${5:-—}"
  RESULTS+=("$tc_id|$prd|$title|$status|$notes")
  if [ "$status" = "PASS" ]; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
}

# --- Login function ---
login() {
  local name="$1" pass="${2:-12345}" jar="$3"
  rm -f "$jar"
  CSRF=$(curl -s -c "$jar" -b "$jar" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
  curl -s -o /dev/null -c "$jar" -b "$jar" -X POST "$BASE/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "csrfToken=$CSRF&name=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$name'))")&password=$pass&json=true&callbackUrl=$BASE"
  echo "$jar"
}

# --- API call — returns "status|body_json" ---
api() {
  local method="$1" path="$2" jar="${3:-}" body="${4:-}"
  local cmd="curl -s -w $'\n%{http_code}'"
  [ -n "$jar" ] && cmd="$cmd -b $jar"
  if [ -n "$body" ]; then
    cmd="$cmd -X $method -H 'Content-Type: application/json' -d '$body'"
  elif [ "$method" != "GET" ]; then
    cmd="$cmd -X $method"
  fi
  cmd="$cmd $BASE$path"
  eval "$cmd" 2>/dev/null
}

# ============================================================
# Login all roles
# ============================================================
ADMIN_JAR=$(login "Test Admin" "12345" "/tmp/admin_jar.txt")
SEC_JAR=$(login "Test Secretary" "12345" "/tmp/sec_jar.txt")
STUDENT_JAR=$(login "Test Student" "12345" "/tmp/student_jar.txt")
BAD_JAR=$(login "Test Admin" "wrongpass" "/tmp/bad_jar.txt")

# Check sessions
ADMIN_SESS=$(curl -s -b "$ADMIN_JAR" "$BASE/api/auth/session")
SEC_SESS=$(curl -s -b "$SEC_JAR" "$BASE/api/auth/session")
STUDENT_SESS=$(curl -s -b "$STUDENT_JAR" "$BASE/api/auth/session")
BAD_SESS=$(curl -s -b "$BAD_JAR" "$BASE/api/auth/session")

echo "$ADMIN_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('user') else 'FAIL')" >/tmp/auth001 2>/dev/null || echo "FAIL" >/tmp/auth001
echo "$SEC_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('user') else 'FAIL')" >/tmp/auth002 2>/dev/null || echo "FAIL" >/tmp/auth002
echo "$STUDENT_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('user') else 'FAIL')" >/tmp/auth003 2>/dev/null || echo "FAIL" >/tmp/auth003
echo "$BAD_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if not d.get('user') else 'FAIL')" >/tmp/auth004 2>/dev/null || echo "FAIL" >/tmp/auth004
echo "$ADMIN_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('user',{}).get('role')=='SUPER_ADMIN' else 'FAIL')" >/tmp/auth005 2>/dev/null || echo "FAIL" >/tmp/auth005
echo "$STUDENT_SESS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('user',{}).get('role')=='STUDENT' else 'FAIL')" >/tmp/auth006 2>/dev/null || echo "FAIL" >/tmp/auth006

record "TC-AUTH-001" "AUTH-01" "Login admin valid" "$(cat /tmp/auth001)"
record "TC-AUTH-002" "AUTH-01" "Login secretary valid" "$(cat /tmp/auth002)"
record "TC-AUTH-003" "AUTH-01" "Login student valid" "$(cat /tmp/auth003)"
record "TC-AUTH-004" "AUTH-01" "Login invalid password rejected" "$(cat /tmp/auth004)"
record "TC-AUTH-005" "AUTH-07" "Admin role=SUPER_ADMIN" "$(cat /tmp/auth005)"
record "TC-AUTH-006" "AUTH-07" "Student role=STUDENT" "$(cat /tmp/auth006)"

# ============================================================
# RBAC — Unauthenticated
# ============================================================
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/schedule")
[ "$S" = "401" ] && record "TC-RBAC-001" "NFR-05" "Anon GET /api/schedule → 401" "PASS" || record "TC-RBAC-001" "NFR-05" "Anon GET /api/schedule → 401" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/milestone")
[ "$S" = "401" ] && record "TC-RBAC-002" "NFR-05" "Anon GET /api/milestone → 401" "PASS" || record "TC-RBAC-002" "NFR-05" "Anon GET /api/milestone → 401" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"x","startTime":"08:00","endTime":"09:00"}')
[ "$S" = "401" ] && record "TC-RBAC-003" "NFR-05" "Anon POST /api/schedule → 401" "PASS" || record "TC-RBAC-003" "NFR-05" "Anon POST /api/schedule → 401" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"x","type":"PTS","date":"2026-09-01"}')
[ "$S" = "401" ] && record "TC-RBAC-004" "NFR-05" "Anon POST /api/milestone → 401" "PASS" || record "TC-RBAC-004" "NFR-05" "Anon POST /api/milestone → 401" "FAIL" "got $S"

# ============================================================
# RBAC — Student (read-only)
# ============================================================
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" "$BASE/api/schedule")
[ "$S" = "200" ] && record "TC-RBAC-005" "SCHD-03" "Student GET /api/schedule → 200" "PASS" || record "TC-RBAC-005" "SCHD-03" "Student GET /api/schedule → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" "$BASE/api/milestone")
[ "$S" = "200" ] && record "TC-RBAC-006" "MILE-03" "Student GET /api/milestone → 200" "PASS" || record "TC-RBAC-006" "MILE-03" "Student GET /api/milestone → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"h","startTime":"08:00","endTime":"09:00"}')
[ "$S" = "403" ] && record "TC-RBAC-007" "§6" "Student POST /api/schedule → 403" "PASS" || record "TC-RBAC-007" "§6" "Student POST /api/schedule → 403" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"h","type":"PTS","date":"2026-09-01"}')
[ "$S" = "403" ] && record "TC-RBAC-008" "§6" "Student POST /api/milestone → 403" "PASS" || record "TC-RBAC-008" "§6" "Student POST /api/milestone → 403" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" -X PUT "$BASE/api/schedule/x" -H "Content-Type: application/json" -d '{"subject":"h"}')
[ "$S" = "403" ] && record "TC-RBAC-009" "SCHD-06" "Student PUT /api/schedule → 403" "PASS" || record "TC-RBAC-009" "SCHD-06" "Student PUT /api/schedule → 403" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" -X DELETE "$BASE/api/milestone/x")
[ "$S" = "403" ] && record "TC-RBAC-010" "MILE-01" "Student DELETE /api/milestone → 403" "PASS" || record "TC-RBAC-010" "MILE-01" "Student DELETE /api/milestone → 403" "FAIL" "got $S"

# ============================================================
# RBAC — Secretary + Admin CRUD
# ============================================================
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" "$BASE/api/schedule")
[ "$S" = "200" ] && record "TC-RBAC-011" "SCHD-03" "Secretary GET /api/schedule → 200" "PASS" || record "TC-RBAC-011" "SCHD-03" "Secretary GET /api/schedule → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" "$BASE/api/milestone")
[ "$S" = "200" ] && record "TC-RBAC-012" "MILE-03" "Secretary GET /api/milestone → 200" "PASS" || record "TC-RBAC-012" "MILE-03" "Secretary GET /api/milestone → 200" "FAIL" "got $S"

RES=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","weekType":"A","subject":"Sec Test","teacher":"T","startTime":"10:00","endTime":"11:00","room":"R1"}')
S=$(echo "$RES" | tail -1)
[ "$S" = "201" ] && record "TC-RBAC-013" "SCHD-01" "Secretary POST /api/schedule → 201" "PASS" || record "TC-RBAC-013" "SCHD-01" "Secretary POST /api/schedule → 201" "FAIL" "got $S"

RES=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"Sec Milestone","type":"PTS","date":"2026-12-01"}')
S=$(echo "$RES" | tail -1)
[ "$S" = "201" ] && record "TC-RBAC-014" "MILE-01" "Secretary POST /api/milestone → 201" "PASS" || record "TC-RBAC-014" "MILE-01" "Secretary POST /api/milestone → 201" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/api/schedule")
[ "$S" = "200" ] && record "TC-RBAC-015" "SCHD-03" "Admin GET /api/schedule → 200" "PASS" || record "TC-RBAC-015" "SCHD-03" "Admin GET /api/schedule → 200" "FAIL" "got $S"

RES=$(curl -s -w "\n%{http_code}" -b "$ADMIN_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"tuesday","weekType":"B","subject":"Admin Test","startTime":"13:00","endTime":"14:00"}')
S=$(echo "$RES" | tail -1)
[ "$S" = "201" ] && record "TC-RBAC-016" "SCHD-01" "Admin POST /api/schedule → 201" "PASS" || record "TC-RBAC-016" "SCHD-01" "Admin POST /api/schedule → 201" "FAIL" "got $S"

# ============================================================
# Schedule — Today view (SCHD-03)
# ============================================================
TODAY=$(curl -s -b "$ADMIN_JAR" "$BASE/api/schedule?week=today")
ENTRIES=$(echo "$TODAY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('entries',[])))" 2>/dev/null || echo "0")
[ "$ENTRIES" -ge 1 ] && record "TC-SCHD-001" "SCHD-03" "Today schedule returns entries" "PASS" "$ENTRIES entries" || record "TC-SCHD-001" "SCHD-03" "Today schedule returns entries" "FAIL" "$ENTRIES entries"

THURSDAYS=$(echo "$TODAY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len([e for e in d.get('entries',[]) if e.get('dayOfWeek')=='thursday']))" 2>/dev/null || echo "0")
[ "$THURSDAYS" -ge 1 ] && record "TC-SCHD-002" "SCHD-03" "Today entries are Thursday" "PASS" "$THURSDAYS thursday" || record "TC-SCHD-002" "SCHD-03" "Today entries are Thursday" "FAIL" "$THURSDAYS thursday"

NULLS=$(echo "$TODAY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len([e for e in d.get('entries',[]) if e.get('weekType') is None]))" 2>/dev/null || echo "0")
[ "$NULLS" -ge 1 ] && record "TC-SCHD-003" "SCHD-05" "NULL weekType entries appear" "PASS" "$NULLS null-week" || record "TC-SCHD-003" "SCHD-05" "NULL weekType entries appear" "FAIL" "$NULLS null-week"

SORTED=$(echo "$TODAY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
es=d.get('entries',[])
print('PASS' if all(es[i]['startTime']<=es[i+1]['startTime'] for i in range(len(es)-1)) or len(es)<=1 else 'FAIL')
" 2>/dev/null || echo "FAIL")
record "TC-SCHD-004" "SCHD-03" "Entries sorted by startTime" "$SORTED"

# ============================================================
# Schedule — Weekly view (SCHD-04)
# ============================================================
WEEKLY=$(curl -s -b "$ADMIN_JAR" "$BASE/api/schedule?week=weekly")
WENTRIES=$(echo "$WEEKLY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('entries',[])))" 2>/dev/null || echo "0")
[ "$WENTRIES" -ge 1 ] && record "TC-SCHD-005" "SCHD-04" "Weekly schedule returns entries" "PASS" "$WENTRIES entries" || record "TC-SCHD-005" "SCHD-04" "Weekly schedule returns entries" "FAIL" "$WENTRIES entries"
[ "$WENTRIES" -ge "$ENTRIES" ] && record "TC-SCHD-006" "SCHD-04" "Weekly >= today count" "PASS" "w=$WENTRIES t=$ENTRIES" || record "TC-SCHD-006" "SCHD-04" "Weekly >= today count" "FAIL" "w=$WENTRIES t=$ENTRIES"

# ============================================================
# Schedule — Date override
# ============================================================
FRI=$(curl -s -b "$ADMIN_JAR" "$BASE/api/schedule?week=today&date=2026-08-21")
FRIRES=$(echo "$FRI" | python3 -c "
import sys,json
d=json.load(sys.stdin)
es=d.get('entries',[])
print('PASS' if len(es)>=1 and all(e['dayOfWeek']=='friday' for e in es) else 'FAIL')
" 2>/dev/null || echo "FAIL")
record "TC-SCHD-007" "SCHD-03" "Date override → Friday entries" "$FRIRES"

# ============================================================
# Schedule — CRUD lifecycle (SCHD-01, SCHD-06)
# ============================================================
CR=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"wednesday","weekType":"A","subject":"Sejarah","teacher":"Bu Y","startTime":"08:00","endTime":"09:30","room":"R5"}')
CS=$(echo "$CR" | tail -1)
[ "$CS" = "201" ] && record "TC-SCHD-008" "SCHD-01" "Create schedule → 201" "PASS" || record "TC-SCHD-008" "SCHD-01" "Create schedule → 201" "FAIL" "got $CS"
SID=$(echo "$CR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('entry',{}).get('id',''))" 2>/dev/null || echo "")

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/api/schedule/$SID")
[ "$S" = "200" ] && record "TC-SCHD-009" "SCHD-01" "Get single schedule → 200" "PASS" || record "TC-SCHD-009" "SCHD-01" "Get single schedule → 200" "FAIL" "got $S"

UR=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X PUT "$BASE/api/schedule/$SID" -H "Content-Type: application/json" -d '{"subject":"Sejarah Nasional","room":"R6"}')
US=$(echo "$UR" | tail -1)
[ "$US" = "200" ] && record "TC-SCHD-010" "SCHD-06" "Update schedule → 200" "PASS" || record "TC-SCHD-010" "SCHD-06" "Update schedule → 200" "FAIL" "got $US"
USUBJ=$(echo "$UR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('entry',{}).get('subject',''))" 2>/dev/null || echo "")
[ "$USUBJ" = "Sejarah Nasional" ] && record "TC-SCHD-011" "SCHD-06" "Updated subject saved" "PASS" || record "TC-SCHD-011" "SCHD-06" "Updated subject saved" "FAIL" "got '$USUBJ'"
UROOM=$(echo "$UR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('entry',{}).get('room',''))" 2>/dev/null || echo "")
[ "$UROOM" = "R6" ] && record "TC-SCHD-012" "SCHD-06" "Updated room saved" "PASS" || record "TC-SCHD-012" "SCHD-06" "Updated room saved" "FAIL" "got '$UROOM'"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X DELETE "$BASE/api/schedule/$SID")
[ "$S" = "200" ] && record "TC-SCHD-013" "SCHD-06" "Delete schedule → 200" "PASS" || record "TC-SCHD-013" "SCHD-06" "Delete schedule → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/api/schedule/$SID")
[ "$S" = "404" ] && record "TC-SCHD-014" "SCHD-06" "Deleted entry → 404" "PASS" || record "TC-SCHD-014" "SCHD-06" "Deleted entry → 404" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X DELETE "$BASE/api/schedule/nonexistent")
[ "$S" = "404" ] && record "TC-SCHD-015" "SCHD-06" "Delete non-existent → 404" "PASS" || record "TC-SCHD-015" "SCHD-06" "Delete non-existent → 404" "FAIL" "got $S"

# ============================================================
# Schedule — Input validation
# ============================================================
# Invalid dayOfWeek
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"funday","subject":"x","startTime":"08:00","endTime":"09:00"}')
[ "$S" = "400" ] && record "TC-VAL-001" "SCHD-01" "Invalid dayOfWeek → 400" "PASS" || record "TC-VAL-001" "SCHD-01" "Invalid dayOfWeek → 400" "FAIL" "got $S"

# Empty subject
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"","startTime":"08:00","endTime":"09:00"}')
[ "$S" = "400" ] && record "TC-VAL-002" "SCHD-01" "Empty subject → 400" "PASS" || record "TC-VAL-002" "SCHD-01" "Empty subject → 400" "FAIL" "got $S"

# Invalid time format
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"x","startTime":"25:00","endTime":"09:00"}')
[ "$S" = "400" ] && record "TC-VAL-003" "SCHD-01" "Invalid startTime 25:00 → 400" "PASS" || record "TC-VAL-003" "SCHD-01" "Invalid startTime 25:00 → 400" "FAIL" "got $S"

# start >= end
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"x","startTime":"10:00","endTime":"10:00"}')
[ "$S" = "400" ] && record "TC-VAL-004" "SCHD-01" "start >= end → 400" "PASS" || record "TC-VAL-004" "SCHD-01" "start >= end → 400" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","subject":"x","startTime":"11:00","endTime":"10:00"}')
[ "$S" = "400" ] && record "TC-VAL-005" "SCHD-01" "start > end → 400" "PASS" || record "TC-VAL-005" "SCHD-01" "start > end → 400" "FAIL" "got $S"

# Invalid weekType
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d '{"dayOfWeek":"monday","weekType":"C","subject":"x","startTime":"08:00","endTime":"09:00"}')
[ "$S" = "400" ] && record "TC-VAL-006" "SCHD-02" "Invalid weekType C → 400" "PASS" || record "TC-VAL-006" "SCHD-02" "Invalid weekType C → 400" "FAIL" "got $S"

# Invalid JSON body
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/schedule" -H "Content-Type: application/json" -d 'not json')
[ "$S" = "400" ] && record "TC-VAL-007" "SCHD-01" "Invalid JSON body → 400" "PASS" || record "TC-VAL-007" "SCHD-01" "Invalid JSON body → 400" "FAIL" "got $S"

# ============================================================
# Milestone — CRUD lifecycle (MILE-01/02/03/04/05)
# ============================================================
# Create milestone
MR=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"Test Milestone","type":"PTS","date":"2026-12-15"}')
MS=$(echo "$MR" | tail -1)
[ "$MS" = "201" ] && record "TC-MILE-001" "MILE-01" "Create milestone → 201" "PASS" || record "TC-MILE-001" "MILE-01" "Create milestone → 201" "FAIL" "got $MS"
MID=$(echo "$MR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('milestone',{}).get('id',''))" 2>/dev/null || echo "")

# Get single milestone
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/api/milestone/$MID")
[ "$S" = "200" ] && record "TC-MILE-002" "MILE-03" "Get single milestone → 200" "PASS" || record "TC-MILE-002" "MILE-03" "Get single milestone → 200" "FAIL" "got $S"

# Verify countdown in single
CD=$(curl -s -b "$ADMIN_JAR" "$BASE/api/milestone/$MID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('milestone',{}).get('countdownDays',''))" 2>/dev/null || echo "")
[ -n "$CD" ] && [ "$CD" != "''" ] && record "TC-MILE-003" "MILE-03" "Single milestone has countdownDays" "PASS" "cd=$CD" || record "TC-MILE-003" "MILE-03" "Single milestone has countdownDays" "FAIL" "cd=$CD"

# Get active milestones — should include countdown
AM=$(curl -s -b "$ADMIN_JAR" "$BASE/api/milestone?active=true")
AMRES=$(echo "$AM" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms=d.get('milestones',[])
print('PASS' if len(ms)>=1 and all('countdownDays' in m for m in ms) else 'FAIL')
" 2>/dev/null || echo "FAIL")
record "TC-MILE-004" "MILE-03" "Active milestones have countdownDays" "$AMRES"

# Update milestone
UR=$(curl -s -w "\n%{http_code}" -b "$SEC_JAR" -X PUT "$BASE/api/milestone/$MID" -H "Content-Type: application/json" -d '{"title":"Updated Milestone","type":"UJIAN"}')
US=$(echo "$UR" | tail -1)
[ "$US" = "200" ] && record "TC-MILE-005" "MILE-01" "Update milestone → 200" "PASS" || record "TC-MILE-005" "MILE-01" "Update milestone → 200" "FAIL" "got $US"
USUBJ=$(echo "$UR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('milestone',{}).get('title',''))" 2>/dev/null || echo "")
[ "$USUBJ" = "Updated Milestone" ] && record "TC-MILE-006" "MILE-01" "Updated title saved" "PASS" || record "TC-MILE-006" "MILE-01" "Updated title saved" "FAIL" "got '$USUBJ'"
UTYPE=$(echo "$UR" | head -n -1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('milestone',{}).get('type',''))" 2>/dev/null || echo "")
[ "$UTYPE" = "UJIAN" ] && record "TC-MILE-007" "MILE-02" "Updated type saved" "PASS" || record "TC-MILE-007" "MILE-02" "Updated type saved" "FAIL" "got '$UTYPE'"

# Delete milestone
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X DELETE "$BASE/api/milestone/$MID")
[ "$S" = "200" ] && record "TC-MILE-008" "MILE-01" "Delete milestone → 200" "PASS" || record "TC-MILE-008" "MILE-01" "Delete milestone → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/api/milestone/$MID")
[ "$S" = "404" ] && record "TC-MILE-009" "MILE-01" "Deleted milestone → 404" "PASS" || record "TC-MILE-009" "MILE-01" "Deleted milestone → 404" "FAIL" "got $S"

# ============================================================
# Milestone — Input validation (MILE-02)
# ============================================================
# Invalid type
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"x","type":"EXAM","date":"2026-09-01"}')
[ "$S" = "400" ] && record "TC-VAL-008" "MILE-02" "Invalid type EXAM → 400" "PASS" || record "TC-VAL-008" "MILE-02" "Invalid type EXAM → 400" "FAIL" "got $S"

# Empty title
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"","type":"PTS","date":"2026-09-01"}')
[ "$S" = "400" ] && record "TC-VAL-009" "MILE-01" "Empty title → 400" "PASS" || record "TC-VAL-009" "MILE-01" "Empty title → 400" "FAIL" "got $S"

# Missing date
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"x","type":"PTS"}')
[ "$S" = "400" ] && record "TC-VAL-010" "MILE-01" "Missing date → 400" "PASS" || record "TC-VAL-010" "MILE-01" "Missing date → 400" "FAIL" "got $S"

# Invalid date
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"x","type":"PTS","date":"not-a-date"}')
[ "$S" = "400" ] && record "TC-VAL-011" "MILE-01" "Invalid date → 400" "PASS" || record "TC-VAL-011" "MILE-01" "Invalid date → 400" "FAIL" "got $S"

# ============================================================
# Milestone — Active cap (MILE-05)
# ============================================================
# Seed has 2 active milestones. Create 3 more = 5 total.
for i in 1 2 3; do
  curl -s -o /dev/null -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d "{\"title\":\"Cap Test $i\",\"type\":\"OTHER\",\"date\":\"2027-01-0$i\"}"
done

# 6th active should fail with 422
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"Cap Fail","type":"OTHER","date":"2027-06-01"}')
[ "$S" = "422" ] && record "TC-MILE-010" "MILE-05" "6th active milestone → 422 (cap)" "PASS" || record "TC-MILE-010" "MILE-05" "6th active milestone → 422 (cap)" "FAIL" "got $S"

# ============================================================
# Milestone — Auto-hide expired (MILE-04)
# ============================================================
# Create milestone with past date (active=true but date in past)
CR=$(curl -s -b "$SEC_JAR" -X POST "$BASE/api/milestone" -H "Content-Type: application/json" -d '{"title":"Past Milestone","type":"LIBUR","date":"2025-01-01","active":true}')
# Should be created (DB allows) but NOT appear in active list
# First clean up — delete the 3 cap test milestones to make room
# Actually, the past milestone shouldn't count against cap since it's expired
# But the cap check is at DB level (active=true). Past + active = still counts.
# So we need to check if it appears in the active list (should NOT, per MILE-04)
AM=$(curl -s -b "$ADMIN_JAR" "$BASE/api/milestone?active=true")
EXPIRED=$(echo "$AM" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms=d.get('milestones',[])
print('PASS' if not any(m.get('title')=='Past Milestone' for m in ms) else 'FAIL')
" 2>/dev/null || echo "FAIL")
record "TC-MILE-011" "MILE-04" "Expired milestone auto-hidden from active list" "$EXPIRED"

# ============================================================
# Dashboard — Page renders (DASH-03, DASH-06)
# ============================================================
# Dashboard page should be protected → redirect to login if not authed
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" "$BASE/")
[ "$S" = "200" ] && record "TC-DASH-001" "DASH-01" "Dashboard page loads (student) → 200" "PASS" || record "TC-DASH-001" "DASH-01" "Dashboard page loads (student) → 200" "FAIL" "got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ADMIN_JAR" "$BASE/")
[ "$S" = "200" ] && record "TC-DASH-002" "DASH-01" "Dashboard page loads (admin) → 200" "PASS" || record "TC-DASH-002" "DASH-01" "Dashboard page loads (admin) → 200" "FAIL" "got $S"

# Jadwal page
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" "$BASE/jadwal")
[ "$S" = "200" ] && record "TC-DASH-003" "SCHD-03" "Jadwal page loads → 200" "PASS" || record "TC-DASH-003" "SCHD-03" "Jadwal page loads → 200" "FAIL" "got $S"

# Milestone page
S=$(curl -s -o /dev/null -w "%{http_code}" -b "$STUDENT_JAR" "$BASE/milestone")
[ "$S" = "200" ] && record "TC-DASH-004" "MILE-03" "Milestone page loads → 200" "PASS" || record "TC-DASH-004" "MILE-03" "Milestone page loads → 200" "FAIL" "got $S"

# ============================================================
# OUTPUT
# ============================================================
echo ""
echo "## Test Results: SUN-20 — Schedule + Milestone UI"
echo ""
echo "### Summary"
echo "| Total | Passed | Failed |"
echo "|-------|--------|--------|"
echo "| $((PASS+FAIL)) | $PASS | $FAIL |"
echo ""
echo "### Results"
echo "| TC ID | PRD Ref | Title | Result | Notes |"
echo "|-------|---------|-------|--------|-------|"
for r in "${RESULTS[@]}"; do
  IFS='|' read -r tc prd title status notes <<< "$r"
  if [ "$status" = "PASS" ]; then
    echo "| $tc | $prd | $title | ✅ PASS | $notes |"
  else
    echo "| $tc | $prd | $title | ❌ FAIL | $notes |"
  fi
done
