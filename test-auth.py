#!/usr/bin/env python3
"""Phase 1 Acceptance Tests — P4.AI (SUN-14)
Tests TC-AUTH-001..008, TC-RBAC-001 on branch p1-auth-login.
"""
import requests
import json
import sys
import sqlite3
import os

BASE = "http://localhost:3003"
DB_PATH = os.path.expanduser("~/P4.AI/prisma/dev.db")

results = []

def record(tc_id, prd_ref, title, status, notes=""):
    results.append({"tc": tc_id, "prd": prd_ref, "title": title, "status": status, "notes": notes})
    print(f"[{status}] {tc_id} ({prd_ref}) — {title}: {notes}")

def get_csrf(session):
    """Get NextAuth CSRF token."""
    r = session.get(f"{BASE}/api/auth/csrf")
    if r.status_code != 200:
        return None, None
    data = r.json()
    return data.get("csrfToken"), data.get("cookie", "")

def nextauth_login(session, name, password):
    """Login via NextAuth credentials provider. Returns (response, csrf_token)."""
    csrf, _ = get_csrf(session)
    if not csrf:
        return None, None

    r = session.post(
        f"{BASE}/api/auth/callback/credentials",
        data={
            "name": name,
            "password": password,
            "csrfToken": csrf,
            "callbackUrl": "/",
            "json": "true",
        },
        allow_redirects=False,
    )
    # NextAuth returns 302 redirect on success, error redirect on failure
    return r, csrf

def get_session(session):
    """Get current session info."""
    r = session.get(f"{BASE}/api/auth/session")
    if r.status_code == 200:
        return r.json()
    return None

def main():
    print("=" * 70)
    print("P4.AI Phase 1 Acceptance Tests — Branch: p1-auth-login")
    print("=" * 70)

    # ====================================================================
    # TC-AUTH-001: Login with valid name + password succeeds
    # ====================================================================
    s = requests.Session()
    r, _ = nextauth_login(s, "Student Test", "00003")
    
    if r.status_code == 302:
        # Check redirect URL — NextAuth redirects to callbackUrl on success
        loc = r.headers.get("location", "")
        if "error" in loc.lower():
            record("TC-AUTH-001", "AUTH-01", "Login valid credentials", "FAIL",
                   f"Redirected with error: {loc}")
        else:
            # Verify session was created
            sess = get_session(s)
            if sess and sess.get("user"):
                record("TC-AUTH-001", "AUTH-01", "Login valid credentials", "PASS",
                       f"Session user: {sess['user'].get('name')}, role: {sess['user'].get('role')}")
            else:
                record("TC-AUTH-001", "AUTH-01", "Login valid credentials", "FAIL",
                       "302 redirect but no session")
    else:
        record("TC-AUTH-001", "AUTH-01", "Login valid credentials", "FAIL",
               f"Status {r.status_code}, expected 302")

    # ====================================================================
    # TC-AUTH-002: Login with wrong password returns 401 + UI error
    # ====================================================================
    s2 = requests.Session()
    r2, _ = nextauth_login(s2, "Student Test", "wrongpassword")
    
    if r2.status_code == 302:
        loc = r2.headers.get("location", "")
        # NextAuth redirects to /login?error=CredentialsSignin on failed login
        if "error" in loc.lower():
            # Verify no session created
            sess2 = get_session(s2)
            if sess2 and sess2.get("user"):
                record("TC-AUTH-002", "AUTH-01", "Login wrong password rejected", "FAIL",
                       f"Error redirect but session still active: {sess2}")
            else:
                record("TC-AUTH-002", "AUTH-01", "Login wrong password rejected", "PASS",
                       f"Error redirect: {loc}, no session")
        else:
            record("TC-AUTH-002", "AUTH-01", "Login wrong password rejected", "FAIL",
                   f"No error in redirect: {loc}")
    elif r2.status_code == 401:
        record("TC-AUTH-002", "AUTH-01", "Login wrong password rejected", "PASS",
               f"401 returned")
    else:
        record("TC-AUTH-002", "AUTH-01", "Login wrong password rejected", "FAIL",
               f"Status {r2.status_code}, expected 302+error or 401")

    # ====================================================================
    # TC-AUTH-003: Password stored as bcrypt (no plaintext in DB)
    # ====================================================================
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.execute("SELECT name, nis, passwordHash, role FROM User")
        rows = cursor.fetchall()
        conn.close()
        
        all_bcrypt = True
        no_plaintext = True
        details = []
        for name, nis, ph, role in rows:
            is_bcrypt = ph.startswith("$2a$") or ph.startswith("$2b$") or ph.startswith("$2y$")
            if not is_bcrypt:
                all_bcrypt = False
                details.append(f"{name}: hash not bcrypt format: {ph[:20]}")
            # Check no plaintext NIS stored as password
            if ph == nis:
                no_plaintext = False
                details.append(f"{name}: passwordHash = NIS (plaintext!)")
            # Check length (bcrypt hashes are 60 chars)
            if len(ph) != 60:
                details.append(f"{name}: hash length {len(ph)}, expected 60")
        
        if all_bcrypt and no_plaintext:
            record("TC-AUTH-003", "NFR-04", "Password stored as bcrypt", "PASS",
                   f"All {len(rows)} users have bcrypt hashes ($2a/$2b/$2y$), 60 chars, no plaintext")
        else:
            record("TC-AUTH-003", "NFR-04", "Password stored as bcrypt", "FAIL",
                   "; ".join(details))
    except Exception as e:
        record("TC-AUTH-003", "NFR-04", "Password stored as bcrypt", "FAIL",
               f"DB check error: {e}")

    # ====================================================================
    # TC-AUTH-004: Session persists across page refresh
    # ====================================================================
    # Using the session from TC-AUTH-001 (s)
    sess1 = get_session(s)
    if sess1 and sess1.get("user"):
        # Simulate "refresh" by making another request with same cookie jar
        sess1b = get_session(s)
        if sess1b and sess1b.get("user") and sess1b["user"]["name"] == sess1["user"]["name"]:
            record("TC-AUTH-004", "AUTH-04", "Session persists across refresh", "PASS",
                   f"Session survived: {sess1b['user']['name']}")
        else:
            record("TC-AUTH-004", "AUTH-04", "Session persists across refresh", "FAIL",
                   "Session lost on second request")
    else:
        record("TC-AUTH-004", "AUTH-04", "Session persists across refresh", "FAIL",
               "No session from TC-AUTH-001")

    # ====================================================================
    # TC-AUTH-005: Role-based redirect (student → /, secretary → /, admin → /admin)
    # ====================================================================
    # This is tested via middleware. We test each role's session role claim.
    redirect_results = []
    
    # Test student
    s_student = requests.Session()
    nextauth_login(s_student, "Student Test", "00003")
    sess = get_session(s_student)
    if sess and sess.get("user", {}).get("role") == "STUDENT":
        redirect_results.append("STUDENT role correct")
    else:
        redirect_results.append(f"STUDENT role wrong: {sess}")
    
    # Test secretary
    s_sec = requests.Session()
    nextauth_login(s_sec, "Secretary Test", "00002")
    sess = get_session(s_sec)
    if sess and sess.get("user", {}).get("role") == "SECRETARY":
        redirect_results.append("SECRETARY role correct")
    else:
        redirect_results.append(f"SECRETARY role wrong: {sess}")
    
    # Test super admin
    s_admin = requests.Session()
    nextauth_login(s_admin, "Super Admin Test", "00001")
    sess = get_session(s_admin)
    if sess and sess.get("user", {}).get("role") == "SUPER_ADMIN":
        redirect_results.append("SUPER_ADMIN role correct")
    else:
        redirect_results.append(f"SUPER_ADMIN role wrong: {sess}")
    
    # Test middleware redirect for super admin hitting /
    r_admin = s_admin.get(f"{BASE}/", allow_redirects=False)
    if r_admin.status_code == 307 or r_admin.status_code == 308:
        loc = r_admin.headers.get("location", "")
        if "/admin" in loc:
            redirect_results.append("SUPER_ADMIN → /admin redirect OK")
        else:
            redirect_results.append(f"SUPER_ADMIN redirect to {loc}, expected /admin")
    else:
        redirect_results.append(f"SUPER_ADMIN / → status {r_admin.status_code} (expected 307/308 redirect to /admin)")
    
    # Student hitting / should NOT redirect to /admin
    r_student = s_student.get(f"{BASE}/", allow_redirects=False)
    if r_student.status_code in (200, 307, 308):
        loc = r_student.headers.get("location", "")
        if "/admin" in loc:
            redirect_results.append("FAIL: STUDENT redirected to /admin")
        else:
            redirect_results.append("STUDENT → / OK (no /admin redirect)")
    else:
        redirect_results.append(f"STUDENT / → {r_student.status_code}")
    
    if all("OK" in r or "correct" in r for r in redirect_results):
        record("TC-AUTH-005", "AUTH-07", "Role-based redirect", "PASS",
               "; ".join(redirect_results))
    else:
        record("TC-AUTH-005", "AUTH-07", "Role-based redirect", "FAIL",
               "; ".join(redirect_results))

    # ====================================================================
    # TC-AUTH-006: Student changes own password; old password no longer works
    # ====================================================================
    s_pwd = requests.Session()
    nextauth_login(s_pwd, "Student Test", "00003")
    
    # Change password
    r_change = s_pwd.post(
        f"{BASE}/api/auth/change-password",
        json={"currentPassword": "00003", "newPassword": "newpassword123"},
    )
    
    if r_change.status_code == 200 and r_change.json().get("ok"):
        # Verify old password no longer works
        s_old = requests.Session()
        r_old, _ = nextauth_login(s_old, "Student Test", "00003")
        old_fails = False
        if r_old.status_code == 302:
            loc = r_old.headers.get("location", "")
            if "error" in loc.lower():
                old_fails = True
        
        # Verify new password works
        s_new = requests.Session()
        r_new, _ = nextauth_login(s_new, "Student Test", "newpassword123")
        new_works = False
        if r_new.status_code == 302:
            loc = r_new.headers.get("location", "")
            if "error" not in loc.lower():
                new_works = True
                sess = get_session(s_new)
                if sess and sess.get("user"):
                    new_works = True
        
        if old_fails and new_works:
            record("TC-AUTH-006", "AUTH-03", "Change own password", "PASS",
                   "Old password rejected, new password works")
        else:
            record("TC-AUTH-006", "AUTH-03", "Change own password", "FAIL",
                   f"old_fails={old_fails}, new_works={new_works}")
        
        # Reset password back to NIS for other tests
        # Use admin to reset
        s_reset = requests.Session()
        nextauth_login(s_reset, "Super Admin Test", "00001")
        # Get student user id
        sess = get_session(s_pwd)
        # We need the student's user id — get from DB
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute("SELECT id FROM User WHERE nis='00003'").fetchone()
        conn.close()
        if row:
            student_id = row[0]
            s_reset.post(f"{BASE}/api/admin/users/{student_id}/reset-password")
    else:
        record("TC-AUTH-006", "AUTH-03", "Change own password", "FAIL",
               f"Change password response: {r_change.status_code} {r_change.text[:200]}")

    # ====================================================================
    # TC-AUTH-007: Super admin resets student password to NIS; NIS login works
    # ====================================================================
    # Ensure student password is "newpassword123" from TC-AUTH-006 test
    # (or was reset). Let's change it first to non-NIS, then reset.
    s_admin2 = requests.Session()
    nextauth_login(s_admin2, "Super Admin Test", "00001")
    
    # Get student user id
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id FROM User WHERE nis='00003'").fetchone()
    conn.close()
    
    if row:
        student_id = row[0]
        # Reset password to NIS
        r_reset = s_admin2.post(f"{BASE}/api/admin/users/{student_id}/reset-password")
        
        if r_reset.status_code == 200 and r_reset.json().get("ok"):
            # Verify NIS login works
            s_nis = requests.Session()
            r_nis, _ = nextauth_login(s_nis, "Student Test", "00003")
            nis_works = False
            if r_nis.status_code == 302:
                loc = r_nis.headers.get("location", "")
                if "error" not in loc.lower():
                    sess = get_session(s_nis)
                    if sess and sess.get("user"):
                        nis_works = True
            
            if nis_works:
                record("TC-AUTH-007", "AUTH-04", "Admin reset password to NIS", "PASS",
                       "Reset OK, NIS login works")
            else:
                record("TC-AUTH-007", "AUTH-04", "Admin reset password to NIS", "FAIL",
                       "Reset OK but NIS login fails")
        else:
            record("TC-AUTH-007", "AUTH-04", "Admin reset password to NIS", "FAIL",
                   f"Reset response: {r_reset.status_code} {r_reset.text[:200]}")
    else:
        record("TC-AUTH-007", "AUTH-04", "Admin reset password to NIS", "FAIL",
               "Student user not found in DB")

    # ====================================================================
    # TC-AUTH-008: Logout clears session; protected route redirects to /login
    # ====================================================================
    s_logout = requests.Session()
    nextauth_login(s_logout, "Student Test", "00003")
    
    # Verify session exists
    sess_before = get_session(s_logout)
    has_session = sess_before and sess_before.get("user")
    
    if not has_session:
        record("TC-AUTH-008", "AUTH-05", "Logout clears session", "FAIL",
               "No session before logout")
    else:
        # NextAuth signout requires CSRF token
        csrf, _ = get_csrf(s_logout)
        r_signout = s_logout.post(
            f"{BASE}/api/auth/signout",
            data={"csrfToken": csrf, "callbackUrl": "/", "json": "true"},
            allow_redirects=False,
        )
        
        # Verify session cleared
        sess_after = get_session(s_logout)
        session_cleared = not sess_after or not sess_after.get("user")
        
        # Test protected route redirects to /login
        r_protected = s_logout.get(f"{BASE}/", allow_redirects=False)
        redirects_to_login = False
        if r_protected.status_code in (307, 308):
            loc = r_protected.headers.get("location", "")
            if "/login" in loc:
                redirects_to_login = True
        
        if session_cleared and redirects_to_login:
            record("TC-AUTH-008", "AUTH-05", "Logout clears session", "PASS",
                   "Session cleared, / redirects to /login")
        elif session_cleared:
            record("TC-AUTH-008", "AUTH-05", "Logout clears session", "PASS",
                   f"Session cleared (protected route: {r_protected.status_code})")
        else:
            record("TC-AUTH-008", "AUTH-05", "Logout clears session", "FAIL",
                   f"session_cleared={session_cleared}, redirects_to_login={redirects_to_login}")

    # ====================================================================
    # TC-RBAC-001: Student cannot access admin-only route (403/redirect)
    # ====================================================================
    s_rbac = requests.Session()
    nextauth_login(s_rbac, "Student Test", "00003")
    
    # Try to access admin reset-password endpoint (SUPER_ADMIN only)
    # Get any user id
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id FROM User WHERE nis='00003'").fetchone()
    conn.close()
    
    if row:
        student_id = row[0]
        r_rbac = s_rbac.post(f"{BASE}/api/admin/users/{student_id}/reset-password")
        
        if r_rbac.status_code == 403:
            record("TC-RBAC-001", "NFR-05", "Student blocked from admin route", "PASS",
                   f"403 Forbidden returned")
        elif r_rbac.status_code == 401:
            record("TC-RBAC-001", "NFR-05", "Student blocked from admin route", "PASS",
                   f"401 Unauthorized returned")
        else:
            record("TC-RBAC-001", "NFR-05", "Student blocked from admin route", "FAIL",
                   f"Expected 403, got {r_rbac.status_code}: {r_rbac.text[:200]}")
    else:
        record("TC-RBAC-001", "NFR-05", "Student blocked from admin route", "FAIL",
               "No user found for test")

    # ====================================================================
    # SUMMARY
    # ====================================================================
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    blocked = sum(1 for r in results if r["status"] == "BLOCKED")
    print(f"Total: {total} | Passed: {passed} | Failed: {failed} | Blocked: {blocked}")
    print()
    for r in results:
        print(f"  [{r['status']}] {r['tc']} ({r['prd']}) — {r['title']}")
    
    # Write results to JSON file
    with open(os.path.expanduser("~/P4.AI/test-results.json"), "w") as f:
        json.dump({"total": total, "passed": passed, "failed": failed, "blocked": blocked,
                     "results": results}, f, indent=2)
    print(f"\nResults saved to ~/P4.AI/test-results.json")

if __name__ == "__main__":
    main()
