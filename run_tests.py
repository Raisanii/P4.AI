import subprocess, json, sys, time
from urllib.parse import urljoin

BASE = "http://localhost:3001"

def curl(method, path, cookie=None, body=None):
    cmd = ["curl", "-s", "-o", "-", "-w", "\n__HTTP_CODE__%{http_code}", "-X", method]
    if cookie:
        cmd += ["-b", cookie]
    if body:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    cmd += [f"{BASE}{path}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    out = r.stdout
    code = out.split("__HTTP_CODE__")[-1].strip() if "__HTTP_CODE__" in out else "0"
    raw = out.split("__HTTP_CODE__")[0].strip()
    try: data = json.loads(raw)
    except: data = raw
    return int(code), data

def login(name, password):
    cmd = ["curl", "-s", "-c", "-", "-o", "/dev/null", "-X", "POST",
           "-H", "Content-Type: application/application/x-www-form-urlencoded",
           "-d", f"name={name}&password={password}&callbackUrl={BASE}",
           f"{BASE}/api/auth/callback/credentials"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    # parse set-cookie from the cookie jar (we used -c -)
    # NextAuth returns cookies, we need to extract
    return r

def login_cookie(name, password):
    cmd = ["curl", "-s", "-D", "-", "-o", "/dev/null", "-X", "POST",
           "-H", "Content-Type: application/json",
           "-d", json.dumps({"name": name, "password": password}),
           f"{BASE}/api/auth/callback/credentials?callbackUrl={BASE}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    cookies = []
    for line in r.stdout.splitlines():
        if line.lower().startswith("set-cookie:"):
            cookie = line.split(":", 1)[1].strip().split(";")[0]
            cookies.append(cookie)
    cookie_str = "; ".join(cookies) if cookies else None
    return cookie_str, r.stdout[:200]

def get_csrf():
    cmd = ["curl", "-s", "-c", "-", f"{BASE}/api/auth/csrf"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    try: csrf = json.loads(r.stdout).get("csrfToken")
    except: csrf = None
    # extract cookie from -c - output which is on stderr? no, on stdout with -c -
    # Actually -c - writes cookie jar to stdout, but -s already has response on stdout too
    # Let's use -D to capture headers
    return csrf, r.stdout[:500]

# NextAuth v5 credentials flow: POST /api/auth/callback/credentials with JSON body returns set-cookie
# But v5 might require CSRF token. Let's check.

print("=== Testing NextAuth login flow ===")
csrf, _ = get_csrf()
print(f"CSRF: {csrf}")

# Try login as SUPER_ADMIN (name=Admin Raisani, password=10001)
cookie, headers = login_cookie("Admin Raisani", "10001")
print(f"Admin login cookie: {cookie[:80] if cookie else 'NONE'}...")
print(f"Headers: {headers[:300]}")

