#!/usr/bin/env python3
"""Functional test suite for P2-BE-2 Milestone CRUD API (SUN-16)."""
import json, subprocess, sys, datetime, os

BASE = "http://localhost:3002"
ADMIN_USER, ADMIN_PASS = "TestAdmin", "password123"
SEC_USER, SEC_PASS = "TestSecretary", "password123"
STU_USER, STU_PASS = "TestStudent", "password123"

results = []
bugs = []

def curl(method, path, cookies=None, body=None, expect=None):
    cmd = ["curl", "-s", "-X", method, f"{BASE}{path}", "-w", "\\n__HTTP_CODE__%{http_code}"]
    if cookies:
        cmd += ["-b", cookies]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    parts = r.stdout.rsplit("__HTTP_CODE__", 1)
    resp_body = parts[0].strip()
    code = int(parts[1]) if len(parts) > 1 else 0
    try:
        data = json.loads(resp_body)
    except:
        data = resp_body
    return code, data

def login(name, password):
    """Login via NextAuth credentials endpoint with CSRF, return cookie header."""
    # Step 1: get CSRF token + cookie jar
    r = subprocess.run(
        ["curl", "-s", "-c", "/tmp/jar_login.txt", f"{BASE}/api/auth/csrf"],
        capture_output=True, text=True, timeout=15
    )
    csrf_token = json.loads(r.stdout)["csrfToken"]

    # Step 2: POST credentials with CSRF token + cookie jar
    r2 = subprocess.run(
        ["curl", "-s", "-b", "/tmp/jar_login.txt", "-c", "/tmp/jar_login.txt",
         "-X", "POST", f"{BASE}/api/auth/callback/credentials",
         "-H", "Content-Type: application/x-www-form-urlencoded",
         "-d", f"redirect=false&name={name}&password={password}&csrfToken={csrf_token}",
         "-D", "-", "-o", "/dev/null"],
        capture_output=True, text=True, timeout=15
    )
    # Parse Set-Cookie headers for session token
    cookies = []
    for line in r2.stdout.split("\n"):
        if line.lower().startswith("set-cookie:"):
            cookie = line.split(":", 1)[1].strip().split(";")[0]
            cookies.append(cookie)
    # Also include the csrf-token cookie from the jar
    # Build cookie header manually from the jar
    return "; ".join(cookies)

def tc(tc_id, prd, title, status, notes="—"):
    results.append({"tc": tc_id, "prd": prd, "title": title, "status": status, "notes": notes})

def bug(bug_id, sev, title, prd, steps, expected, actual):
    bugs.append({"id": bug_id, "sev": sev, "title": title, "prd": prd, "steps": steps, "expected": expected, "actual": actual})

# ============================================================
print("=== Logging in test users ===")
admin_ck = login(ADMIN_USER, ADMIN_PASS)
sec_ck = login(SEC_USER, SEC_PASS)
stu_ck = login(STU_USER, STU_PASS)
no_ck = ""

if not admin_ck:
    print("FATAL: Admin login failed. Cannot proceed.")
    sys.exit(1)
print(f"Admin cookie: {admin_ck[:30]}...")
print(f"Secretary cookie: {sec_ck[:30]}...")
print(f"Student cookie: {stu_ck[:30]}...")

# Helper: compute future date string YYYY-MM-DD
today = datetime.date.today()
def future(days):
    return (today + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
def past(days):
    return (today - datetime.timedelta(days=days)).strftime("%Y-%m-%d")

# Expected countdown for a date N days in the future (WIB-aware, non-negative)
def expected_countdown(days_from_now):
    return max(0, days_from_now)

# ============================================================
print("\n=== TC-MILE-001..020: Functional Tests ===")

# --- Auth/RBAC Tests (MILE-02, Permission Matrix) ---

# TC-MILE-001: GET /api/milestone without auth → 401
code, data = curl("GET", "/api/milestone?active=true", cookies=no_ck)
tc("TC-MILE-001", "MILE-02", "GET milestone without auth → 401", "PASS" if code == 401 else "FAIL", f"HTTP {code}")

# TC-MILE-002: GET /api/milestone with student auth → 200 (read-only access)
code, data = curl("GET", "/api/milestone?active=true", cookies=stu_ck)
tc("TC-MILE-002", "MILE-02", "GET milestone as student → 200", "PASS" if code == 200 else "FAIL", f"HTTP {code}")

# TC-MILE-003: POST /api/milestone as student → 403 (forbidden)
code, data = curl("POST", "/api/milestone", cookies=stu_ck, body={"title": "Hack", "type": "PTS", "date": future(10)})
tc("TC-MILE-003", "MILE-02", "POST milestone as student → 403", "PASS" if code == 403 else "FAIL", f"HTTP {code}")

# TC-MILE-004: POST /api/milestone as SECRETARY → 201 (allowed)
code, data = curl("POST", "/api/milestone", cookies=sec_ck, body={"title": "PTS Semester", "type": "PTS", "date": future(15)})
tc("TC-MILE-004", "MILE-02", "POST milestone as secretary → 201", "PASS" if code == 201 else "FAIL", f"HTTP {code}, {data}")
ms1_id = data.get("milestone", {}).get("id") if isinstance(data, dict) else None

# TC-MILE-005: POST /api/milestone as SUPER_ADMIN → 201 (allowed)
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Prakerin", "type": "PRAKERIN", "date": future(30)})
tc("TC-MILE-005", "MILE-02", "POST milestone as admin → 201", "PASS" if code == 201 else "FAIL", f"HTTP {code}, {data}")
ms2_id = data.get("milestone", {}).get("id") if isinstance(data, dict) else None

# TC-MILE-006: PUT as student → 403
if ms2_id:
    code, data = curl("PUT", f"/api/milestone/{ms2_id}", cookies=stu_ck, body={"title": "Hacked"})
    tc("TC-MILE-006", "MILE-02", "PUT milestone as student → 403", "PASS" if code == 403 else "FAIL", f"HTTP {code}")

# TC-MILE-007: DELETE as student → 403
if ms2_id:
    code, data = curl("DELETE", f"/api/milestone/{ms2_id}", cookies=stu_ck)
    tc("TC-MILE-007", "MILE-02", "DELETE milestone as student → 403", "PASS" if code == 403 else "FAIL", f"HTTP {code}")

# --- Validation Tests (MILE-01) ---

# TC-MILE-008: POST empty title → 400
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "", "type": "PTS", "date": future(10)})
tc("TC-MILE-008", "MILE-01", "POST empty title → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# TC-MILE-009: POST invalid type → 400
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Test", "type": "EXAM", "date": future(10)})
tc("TC-MILE-009", "MILE-01", "POST invalid type → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# TC-MILE-010: POST missing date → 400
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Test", "type": "PTS"})
tc("TC-MILE-010", "MILE-01", "POST missing date → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# TC-MILE-011: POST invalid date format → 400
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Test", "type": "PTS", "date": "not-a-date"})
tc("TC-MILE-011", "MILE-01", "POST invalid date → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# TC-MILE-012: POST invalid JSON body → 400
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body=None)
tc("TC-MILE-012", "MILE-01", "POST invalid JSON → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# --- Countdown Tests (MILE-03) ---

# TC-MILE-013: GET active includes countdownDays
code, data = curl("GET", "/api/milestone?active=true", cookies=admin_ck)
has_countdown = False
countdown_val = None
if code == 200 and isinstance(data, dict):
    ms = data.get("milestones", [])
    if ms:
        has_countdown = "countdownDays" in ms[0]
        countdown_val = ms[0].get("countdownDays")
tc("TC-MILE-013", "MILE-03", "GET active returns countdownDays field", "PASS" if has_countdown else "FAIL", f"countdownDays={countdown_val}")

# TC-MILE-014: countdown value is non-negative integer
if code == 200 and isinstance(data, dict):
    ms = data.get("milestones", [])
    all_nonneg = all(isinstance(m.get("countdownDays"), int) and m.get("countdownDays") >= 0 for m in ms) if ms else True
    tc("TC-MILE-014", "MILE-03", "countdownDays is non-negative integer", "PASS" if all_nonneg else "FAIL", f"values={[m.get('countdownDays') for m in ms]}")

# TC-MILE-015: create milestone 5 days out, verify countdown ≈ 5
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "H-5 Test", "type": "UJIAN", "date": future(5)})
if code == 201:
    ms5_id = data["milestone"]["id"]
    code2, data2 = curl("GET", "/api/milestone?active=true", cookies=admin_ck)
    found = None
    if code2 == 200:
        for m in data2.get("milestones", []):
            if m.get("id") == ms5_id:
                found = m.get("countdownDays")
                break
    # WIB (UTC+7) may shift the day boundary by ±1; allow 4-5
    ok = found is not None and found in (4, 5)
    tc("TC-MILE-015", "MILE-03", "countdown ≈ 5 for date 5 days out (WIB±1)", "PASS" if ok else "FAIL", f"got {found}, expected 4-5")
else:
    tc("TC-MILE-015", "MILE-03", "countdown ≈ 5 for date 5 days out", "FAIL", f"create failed HTTP {code}")

# --- Auto-hide Expired (MILE-04) ---

# TC-MILE-016: expired milestone not in active list
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Past Exam", "type": "PAS", "date": past(5)})
if code == 201:
    past_id = data["milestone"]["id"]
    code2, data2 = curl("GET", "/api/milestone?active=true", cookies=admin_ck)
    hidden = True
    if code2 == 200:
        for m in data2.get("milestones", []):
            if m.get("id") == past_id:
                hidden = False
                break
    tc("TC-MILE-016", "MILE-04", "expired milestone auto-hidden from active list", "PASS" if hidden else "FAIL", f"past_id={past_id} visible={not hidden}")
else:
    tc("TC-MILE-016", "MILE-04", "expired milestone auto-hidden", "FAIL", f"create failed HTTP {code}")

# TC-MILE-017: expired milestone still accessible via GET [id]
if code == 201 and past_id:
    code2, data2 = curl("GET", f"/api/milestone/{past_id}", cookies=admin_ck)
    ok = code2 == 200 and data2.get("milestone", {}).get("id") == past_id
    tc("TC-MILE-017", "MILE-04", "expired milestone accessible via GET [id]", "PASS" if ok else "FAIL", f"HTTP {code2}")
else:
    tc("TC-MILE-017", "MILE-04", "expired milestone accessible via GET [id]", "FAIL", "no past milestone to test")

# --- Max 5 Active Cap (MILE-05) ---

# Create milestones until cap. Currently have some active. Let's count and fill to 5.
# First, clean up: deactivate all existing active milestones via PUT
code, data = curl("GET", "/api/milestone?active=true", cookies=admin_ck)
active_ids = []
if code == 200:
    active_ids = [m["id"] for m in data.get("milestones", [])]
print(f"  Active before cap test: {len(active_ids)}")

# Deactivate them all to start clean
for mid in active_ids:
    curl("PUT", f"/api/milestone/{mid}", cookies=admin_ck, body={"active": False})

# Create exactly 5 active milestones
cap_ids = []
all_created = True
for i in range(5):
    code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": f"Cap Test {i+1}", "type": "OTHER", "date": future(20+i)})
    if code == 201:
        cap_ids.append(data["milestone"]["id"])
    else:
        all_created = False
        print(f"  Cap create {i+1} failed: HTTP {code}")

# TC-MILE-018: 6th active create → 422 (MILE-05)
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "6th Cap", "type": "OTHER", "date": future(25)})
ok = code == 422
tc("TC-MILE-018", "MILE-05", "6th active create → 422", "PASS" if ok else "FAIL", f"HTTP {code}, {data}")

# TC-MILE-019: create inactive milestone when cap is full → 201 (not counted)
if all_created and len(cap_ids) == 5:
    code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Inactive Extra", "type": "OTHER", "date": future(40), "active": False})
    ok = code == 201
    tc("TC-MILE-019", "MILE-05", "inactive milestone created when cap full → 201", "PASS" if ok else "FAIL", f"HTTP {code}")
    if ok:
        # Now try to activate it → should fail 422
        extra_id = data["milestone"]["id"]
        code2, data2 = curl("PUT", f"/api/milestone/{extra_id}", cookies=admin_ck, body={"active": True})
        ok2 = code2 == 422
        tc("TC-MILE-019b", "MILE-05", "activate 6th via PUT when cap full → 422", "PASS" if ok2 else "FAIL", f"HTTP {code2}, {data2}")
else:
    tc("TC-MILE-019", "MILE-05", "inactive milestone created when cap full", "FAIL", f"only created {len(cap_ids)}/5")

# --- CRUD Lifecycle Tests ---

# TC-MILE-020: full CRUD lifecycle (create, GET [id], PUT, DELETE)
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Lifecycle Test", "type": "LIBUR", "date": future(50)})
if code == 201:
    lid = data["milestone"]["id"]
    # GET [id]
    code2, data2 = curl("GET", f"/api/milestone/{lid}", cookies=admin_ck)
    ok_get = code2 == 200 and data2.get("milestone", {}).get("title") == "Lifecycle Test"
    # PUT update
    code3, data3 = curl("PUT", f"/api/milestone/{lid}", cookies=admin_ck, body={"title": "Updated Lifecycle"})
    ok_put = code3 == 200 and data3.get("milestone", {}).get("title") == "Updated Lifecycle"
    # GET verify update
    code4, data4 = curl("GET", f"/api/milestone/{lid}", cookies=admin_ck)
    ok_verify = code4 == 200 and data4.get("milestone", {}).get("title") == "Updated Lifecycle"
    # DELETE
    code5, data5 = curl("DELETE", f"/api/milestone/{lid}", cookies=admin_ck)
    ok_del = code5 == 200 and data5.get("ok") == True
    # GET after delete → 404
    code6, data6 = curl("GET", f"/api/milestone/{lid}", cookies=admin_ck)
    ok_404 = code6 == 404
    all_ok = ok_get and ok_put and ok_verify and ok_del and ok_404
    notes = f"get={ok_get} put={ok_put} verify={ok_verify} del={ok_del} after_del_404={ok_404}"
    tc("TC-MILE-020", "MILE-01", "full CRUD lifecycle (create→get→put→verify→delete→404)", "PASS" if all_ok else "FAIL", notes)
else:
    tc("TC-MILE-020", "MILE-01", "full CRUD lifecycle", "FAIL", f"create failed HTTP {code}")

# TC-MILE-021: PUT non-existent id → 404
code, data = curl("PUT", "/api/milestone/nonexistent-id-12345", cookies=admin_ck, body={"title": "Ghost"})
tc("TC-MILE-021", "MILE-01", "PUT non-existent id → 404", "PASS" if code == 404 else "FAIL", f"HTTP {code}")

# TC-MILE-022: DELETE non-existent id → 404
code, data = curl("DELETE", "/api/milestone/nonexistent-id-12345", cookies=admin_ck)
tc("TC-MILE-022", "MILE-01", "DELETE non-existent id → 404", "PASS" if code == 404 else "FAIL", f"HTTP {code}")

# TC-MILE-023: GET [id] non-existent → 404
code, data = curl("GET", "/api/milestone/nonexistent-id-12345", cookies=admin_ck)
tc("TC-MILE-023", "MILE-01", "GET [id] non-existent → 404", "PASS" if code == 404 else "FAIL", f"HTTP {code}")

# TC-MILE-024: GET with unknown param → 400
code, data = curl("GET", "/api/milestone?active=false", cookies=admin_ck)
tc("TC-MILE-024", "MILE-01", "GET ?active=false (unknown) → 400", "PASS" if code == 400 else "FAIL", f"HTTP {code}")

# TC-MILE-025: GET [id] as student → 200 (read access)
if ms1_id:
    code, data = curl("GET", f"/api/milestone/{ms1_id}", cookies=stu_ck)
    tc("TC-MILE-025", "MILE-02", "GET [id] as student → 200", "PASS" if code == 200 else "FAIL", f"HTTP {code}")
else:
    tc("TC-MILE-025", "MILE-02", "GET [id] as student → 200", "FAIL", "no milestone id")

# TC-MILE-026: PUT as SECRETARY → 200 (allowed)
# Create one as admin then update as secretary
code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": "Sec Update Target", "type": "PTS", "date": future(12)})
if code == 201:
    sid = data["milestone"]["id"]
    # Deactivate one cap milestone to make room
    if cap_ids:
        curl("PUT", f"/api/milestone/{cap_ids[0]}", cookies=admin_ck, body={"active": False})
    code2, data2 = curl("PUT", f"/api/milestone/{sid}", cookies=sec_ck, body={"title": "Secretary Updated"})
    ok = code2 == 200 and data2.get("milestone", {}).get("title") == "Secretary Updated"
    tc("TC-MILE-026", "MILE-02", "PUT as secretary → 200", "PASS" if ok else "FAIL", f"HTTP {code2}")

# TC-MILE-027: DELETE as SECRETARY → 200 (allowed)
if code == 201 and sid:
    code2, data2 = curl("DELETE", f"/api/milestone/{sid}", cookies=sec_ck)
    ok = code2 == 200 and data2.get("ok") == True
    tc("TC-MILE-027", "MILE-02", "DELETE as secretary → 200", "PASS" if ok else "FAIL", f"HTTP {code2}")

# --- Type enum validation (MILE-02) ---
valid_types = ["PTS", "PAS", "PRAKERIN", "UJIAN", "LIBUR", "OTHER"]
all_types_ok = True
# Deactivate a cap milestone to make room
if cap_ids:
    curl("PUT", f"/api/milestone/{cap_ids[1]}", cookies=admin_ck, body={"active": False})
for t in valid_types:
    code, data = curl("POST", "/api/milestone", cookies=admin_ck, body={"title": f"Type {t}", "type": t, "date": future(3)})
    if code != 201:
        all_types_ok = False
        print(f"  Type {t} failed: HTTP {code}")
    else:
        # Delete it to keep DB clean
        curl("DELETE", f"/api/milestone/{data['milestone']['id']}", cookies=admin_ck)
tc("TC-MILE-028", "MILE-02", "all 6 valid milestone types accepted", "PASS" if all_types_ok else "FAIL", f"types={valid_types}")

# --- Summary ---
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
total = len(results)

print(f"\n=== SUMMARY: {passed}/{total} PASSED, {failed} FAILED ===\n")
for r in results:
    mark = "✅" if r["status"] == "PASS" else "❌"
    print(f"{mark} {r['tc']} [{r['prd']}] {r['title']}: {r['status']} | {r['notes']}")

# Output as JSON for parsing
output = {
    "total": total,
    "passed": passed,
    "failed": failed,
    "results": results,
    "bugs": bugs,
}
with open("/tmp/test-results.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nResults saved to /tmp/test-results.json")
sys.exit(0 if failed == 0 else 1)
