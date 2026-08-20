// Functional test harness: authenticate via NextAuth, then run API test suite.
// Usage: npx tsx tests/schedule-functional.ts
import "dotenv/config";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3001";

/** Get a CSRF token + cookie jar, then submit credentials. Returns cookie header. */
async function login(name: string, password: string): Promise<{ cookies: string; csrf: string }> {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { Accept: "application/json" },
  });
  const csrfCookie = (csrfRes.headers.get("set-cookie") || "")
    .split(",")
    .map((c) => c.split(";")[0])
    .join("; ");
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  // 2. Submit credentials
  const body = new URLSearchParams({
    name,
    password,
    csrfToken,
    callbackUrl: `${BASE}/api/schedule`,
    json: "true",
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: body.toString(),
    redirect: "manual",
  });

  // Collect all Set-Cookie headers
  const setCookies = loginRes.headers.getSetCookie?.() || [loginRes.headers.get("set-cookie") || ""];
  const allCookies: string[] = [];
  for (const sc of setCookies) {
    if (sc) {
      const pairs = sc.split(",").map((c) => c.split(";")[0].trim());
      allCookies.push(...pairs.filter((p) => p.includes("=")));
    }
  }
  // Merge with csrf cookie
  const cookieMap = new Map<string, string>();
  for (const c of [...csrfCookie.split("; ").filter(Boolean), ...allCookies]) {
    const [k] = c.split("=");
    if (k) cookieMap.set(k.trim(), c.trim());
  }
  const cookieHeader = [...cookieMap.values()].join("; ");

  // Verify we got a session token
  if (!cookieHeader.includes("authjs") && !cookieHeader.includes("next-auth")) {
    throw new Error(`Login failed for ${name}: no session cookie. Status: ${loginRes.status}`);
  }

  return { cookies: cookieHeader, csrf: csrfToken };
}

interface TestResult {
  id: string;
  prdRef: string;
  title: string;
  pass: boolean;
  notes: string;
}

const results: TestResult[] = [];

function record(id: string, prdRef: string, title: string, pass: boolean, notes = "") {
  results.push({ id, prdRef, title, pass, notes });
  console.log(`${pass ? "✓" : "✗"} ${id} [${prdRef}] ${title}${notes ? " — " + notes : ""}`);
}

async function api(method: string, path: string, cookies: string, body?: unknown) {
  const headers: Record<string, string> = { Cookie: cookies };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\n=== P4.AI Schedule CRUD Functional Tests ===`);
  console.log(`Base: ${BASE}\n`);

  // --- Login all 3 roles ---
  let adminCookies: string, secretaryCookies: string, studentCookies: string;
  try {
    const a = await login("Admin Test", "adminpass");
    adminCookies = a.cookies;
    console.log("✓ Admin login");
  } catch (e) { console.error("Admin login FAILED:", e); process.exit(1); }
  try {
    const s = await login("Secretary Test", "secretpass");
    secretaryCookies = s.cookies;
    console.log("✓ Secretary login");
  } catch (e) { console.error("Secretary login FAILED:", e); process.exit(1); }
  try {
    const st = await login("Student Test", "studentpass");
    studentCookies = st.cookies;
    console.log("✓ Student login");
  } catch (e) { console.error("Student login FAILED:", e); process.exit(1); }

  console.log("\n--- TC-SCHD-001..0NN ---\n");

  // === SCHD-03: GET today's schedule (all roles) ===
  // 2026-01-05 is Monday = Week A. Today's = monday + Week A + NULL entries
  // Seed: monday A = Matematika (07:30-09:00), monday NULL = Upacara (07:00-07:30)
  let res = await api("GET", "/api/schedule?date=2026-01-05&week=today", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string; startTime: string }> };
    const subjects = (j.entries || []).map((e) => e.subject).sort();
    const pass = res.status === 200 && subjects.includes("Matematika") && subjects.includes("Upacara") &&
      !subjects.includes("Fisika"); // Fisika = Week B, should NOT appear
    record("TC-SCHD-001", "SCHD-03", "Student GET today's schedule (Week A Monday)", pass,
      pass ? "" : `status=${res.status}, subjects=${JSON.stringify(subjects)}`);
  }

  // === SCHD-03: Week B Monday ===
  res = await api("GET", "/api/schedule?date=2026-01-12&week=today", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string }> };
    const subjects = (j.entries || []).map((e) => e.subject).sort();
    const pass = res.status === 200 && subjects.includes("Fisika") && subjects.includes("Upacara") &&
      !subjects.includes("Matematika");
    record("TC-SCHD-002", "SCHD-03", "Student GET today's schedule (Week B Monday)", pass,
      pass ? "" : `status=${res.status}, subjects=${JSON.stringify(subjects)}`);
  }

  // === SCHD-04: Weekly view Week A ===
  res = await api("GET", "/api/schedule?date=2026-01-05&week=weekly", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string; weekType: string | null }> };
    const entries = j.entries || [];
    const subjects = entries.map((e) => e.subject).sort();
    // Week A: Mon A (Matematika), Mon NULL (Upacara), Tue A (B.Inggris), Tue NULL (Olahraga), Fri A (Sejarah), Fri NULL (Sholat Jumat)
    // Should NOT include Week B entries (Fisika, B.Indonesia)
    const hasWeekA = subjects.includes("Matematika") && subjects.includes("B.Inggris") && subjects.includes("Sejarah");
    const hasNull = subjects.includes("Upacara") && subjects.includes("Olahraga") && subjects.includes("Sholat Jumat");
    const noWeekB = !subjects.includes("Fisika") && !subjects.includes("B.Indonesia");
    const pass = res.status === 200 && hasWeekA && hasNull && noWeekB;
    record("TC-SCHD-003", "SCHD-04", "Weekly view Week A includes A+NULL, excludes B", pass,
      pass ? "" : `status=${res.status}, subjects=${JSON.stringify(subjects)}`);
  }

  // === SCHD-04: Weekly view Week B ===
  res = await api("GET", "/api/schedule?date=2026-01-12&week=weekly", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string }> };
    const subjects = (j.entries || []).map((e) => e.subject).sort();
    const hasWeekB = subjects.includes("Fisika") && subjects.includes("B.Indonesia") && subjects.includes("Sejarah");
    const hasNull = subjects.includes("Upacara") && subjects.includes("Olahraga") && subjects.includes("Sholat Jumat");
    const noWeekA = !subjects.includes("Matematika") && !subjects.includes("B.Inggris");
    const pass = res.status === 200 && hasWeekB && hasNull && noWeekA;
    record("TC-SCHD-004", "SCHD-04", "Weekly view Week B includes B+NULL, excludes A", pass,
      pass ? "" : `status=${res.status}, subjects=${JSON.stringify(subjects)}`);
  }

  // === SCHD-02: NULL weekType appears in both A and B weeks ===
  {
    // Already verified above — Upacara (NULL) appears in both Week A and Week B today/weekly
    const pass = results[0]?.pass && results[1]?.pass && results[2]?.pass && results[3]?.pass;
    record("TC-SCHD-005", "SCHD-02", "NULL weekType entries appear in both A and B weeks", !!pass,
      pass ? "" : "Depends on TC-SCHD-001..004");
  }

  // === SCHD-05: Week A/B detection ===
  // Already verified in self-test (12/12). Verify via API:
  // 2026-01-05 = A, 2026-01-12 = B, 2026-01-19 = A
  res = await api("GET", "/api/schedule?date=2026-01-05&week=today", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string }> };
    const subjects = (j.entries || []).map((e) => e.subject);
    const isWeekA = subjects.includes("Matematika") && !subjects.includes("Fisika");
    record("TC-SCHD-006", "SCHD-05", "Week detection: anchor date = Week A", res.status === 200 && isWeekA,
      isWeekA ? "" : `subjects=${JSON.stringify(subjects)}`);
  }
  res = await api("GET", "/api/schedule?date=2026-01-19&week=today", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string }> };
    const subjects = (j.entries || []).map((e) => e.subject);
    // 2026-01-19 is Monday = Week A again (14 days from anchor)
    const isWeekA = subjects.includes("Matematika") && !subjects.includes("Fisika");
    record("TC-SCHD-007", "SCHD-05", "Week detection: +14 days = Week A (cycle)", res.status === 200 && isWeekA,
      isWeekA ? "" : `subjects=${JSON.stringify(subjects)}`);
  }

  // === RBAC: Student CANNOT POST (create) → 403 ===
  res = await api("POST", "/api/schedule", studentCookies, {
    dayOfWeek: "wednesday", subject: "Test", startTime: "08:00", endTime: "09:00",
  });
  record("TC-SCHD-008", "RBAC §6", "Student POST schedule → 403", res.status === 403,
    `status=${res.status}`);

  // === RBAC: Student CANNOT PUT (update) → 403 ===
  res = await api("PUT", "/api/schedule/nonexistent", studentCookies, { subject: "Hacked" });
  record("TC-SCHD-009", "RBAC §6", "Student PUT schedule → 403", res.status === 403,
    `status=${res.status}`);

  // === RBAC: Student CANNOT DELETE → 403 ===
  res = await api("DELETE", "/api/schedule/nonexistent", studentCookies);
  record("TC-SCHD-010", "RBAC §6", "Student DELETE schedule → 403", res.status === 403,
    `status=${res.status}`);

  // === RBAC: Unauthenticated GET → 401 ===
  res = await api("GET", "/api/schedule", "");
  record("TC-SCHD-011", "RBAC §6", "Unauthenticated GET → 401", res.status === 401,
    `status=${res.status}`);

  // === RBAC: Unauthenticated POST → 401 ===
  res = await api("POST", "/api/schedule", "", { dayOfWeek: "monday", subject: "X", startTime: "08:00", endTime: "09:00" });
  record("TC-SCHD-012", "RBAC §6", "Unauthenticated POST → 401", res.status === 401,
    `status=${res.status}`);

  // === SCHD-01: Admin POST (create) happy path ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "Wednesday", subject: "Kimia", teacher: "Bu Rina",
    startTime: "09:00", endTime: "10:30", room: "Lab1", weekType: "A",
  });
  {
    const j = res.json as { entry?: { id: string; subject: string; dayOfWeek: string } };
    const pass = res.status === 201 && !!j.entry?.id && j.entry.subject === "Kimia" && j.entry.dayOfWeek === "wednesday";
    record("TC-SCHD-013", "SCHD-01", "Admin POST create schedule → 201", pass,
      pass ? `created id=${j.entry?.id}` : `status=${res.status}, body=${JSON.stringify(j).slice(0, 200)}`);
    if (pass) (globalThis as Record<string, unknown>).__createdId = j.entry!.id;
  }

  // === SCHD-01: Secretary POST (create) — also allowed ===
  res = await api("POST", "/api/schedule", secretaryCookies, {
    dayOfWeek: "thursday", subject: "Biologi", startTime: "10:00", endTime: "11:00",
  });
  {
    const j = res.json as { entry?: { id: string; subject: string; weekType: null } };
    const pass = res.status === 201 && !!j.entry?.id && j.entry.subject === "Biologi" &&
      j.entry.weekType === null; // omitted weekType → null
    record("TC-SCHD-014", "SCHD-01", "Secretary POST create (weekType omitted → null)", pass,
      pass ? "" : `status=${res.status}, body=${JSON.stringify(j).slice(0, 200)}`);
  }

  // === Input validation: invalid dayOfWeek → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "funday", subject: "X", startTime: "08:00", endTime: "09:00",
  });
  record("TC-SCHD-015", "SCHD-01", "Invalid dayOfWeek → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: missing subject → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", startTime: "08:00", endTime: "09:00",
  });
  record("TC-SCHD-016", "SCHD-01", "Missing subject → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: invalid time format → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", subject: "X", startTime: "8:00", endTime: "9:00",
  });
  record("TC-SCHD-017", "SCHD-01", "Invalid time format (non-HH:MM) → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: startTime >= endTime → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", subject: "X", startTime: "10:00", endTime: "10:00",
  });
  record("TC-SCHD-018", "SCHD-01", "startTime == endTime → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: startTime > endTime → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", subject: "X", startTime: "15:00", endTime: "10:00",
  });
  record("TC-SCHD-019", "SCHD-01", "startTime > endTime → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: invalid weekType → 400 ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", subject: "X", startTime: "08:00", endTime: "09:00", weekType: "C",
  });
  record("TC-SCHD-020", "SCHD-01", "Invalid weekType 'C' → 400", res.status === 400,
    `status=${res.status}`);

  // === Input validation: invalid JSON body → 400 ===
  res = await api("POST", "/api/schedule", adminCookies);
  record("TC-SCHD-021", "SCHD-01", "Empty/invalid JSON body → 400", res.status === 400,
    `status=${res.status}`);

  // === SCHD-06: GET single entry by ID ===
  const createdId = (globalThis as Record<string, unknown>).__createdId as string;
  res = await api("GET", `/api/schedule/${createdId}`, studentCookies);
  {
    const j = res.json as { entry?: { subject: string } };
    const pass = res.status === 200 && j.entry?.subject === "Kimia";
    record("TC-SCHD-022", "SCHD-06", "GET single entry by ID", pass,
      pass ? "" : `status=${res.status}, body=${JSON.stringify(j).slice(0, 200)}`);
  }

  // === SCHD-06: GET non-existent ID → 404 ===
  res = await api("GET", "/api/schedule/nonexistent-id-123", studentCookies);
  record("TC-SCHD-023", "SCHD-06", "GET non-existent ID → 404", res.status === 404,
    `status=${res.status}`);

  // === SCHD-06: PUT update entry (Admin) ===
  res = await api("PUT", `/api/schedule/${createdId}`, adminCookies, {
    subject: "Kimia Lanjut", room: "Lab2",
  });
  {
    const j = res.json as { entry?: { subject: string; room: string } };
    const pass = res.status === 200 && j.entry?.subject === "Kimia Lanjut" && j.entry?.room === "Lab2";
    record("TC-SCHD-024", "SCHD-06", "Admin PUT update entry", pass,
      pass ? "" : `status=${res.status}, body=${JSON.stringify(j).slice(0, 200)}`);
  }

  // === SCHD-06: PUT update weekType to null ===
  res = await api("PUT", `/api/schedule/${createdId}`, adminCookies, { weekType: null });
  {
    const j = res.json as { entry?: { weekType: null } };
    const pass = res.status === 200 && j.entry?.weekType === null;
    record("TC-SCHD-025", "SCHD-06", "PUT update weekType to null", pass,
      pass ? "" : `status=${res.status}, body=${JSON.stringify(j).slice(0, 200)}`);
  }

  // === SCHD-06: PUT update with invalid dayOfWeek → 400 ===
  res = await api("PUT", `/api/schedule/${createdId}`, adminCookies, { dayOfWeek: "notaday" });
  record("TC-SCHD-026", "SCHD-06", "PUT invalid dayOfWeek → 400", res.status === 400,
    `status=${res.status}`);

  // === SCHD-06: PUT update with startTime >= endTime → 400 ===
  res = await api("PUT", `/api/schedule/${createdId}`, adminCookies, { startTime: "20:00", endTime: "08:00" });
  record("TC-SCHD-027", "SCHD-06", "PUT startTime > endTime → 400", res.status === 400,
    `status=${res.status}`);

  // === SCHD-06: PUT non-existent ID → 404 ===
  res = await api("PUT", "/api/schedule/nonexistent-xyz", adminCookies, { subject: "X" });
  record("TC-SCHD-028", "SCHD-06", "PUT non-existent ID → 404", res.status === 404,
    `status=${res.status}`);

  // === SCHD-06: PUT by Secretary (allowed) ===
  res = await api("PUT", `/api/schedule/${createdId}`, secretaryCookies, { subject: "Kimia Dasar" });
  {
    const j = res.json as { entry?: { subject: string } };
    const pass = res.status === 200 && j.entry?.subject === "Kimia Dasar";
    record("TC-SCHD-029", "SCHD-06", "Secretary PUT update (allowed)", pass,
      pass ? "" : `status=${res.status}`);
  }

  // === SCHD-06: DELETE entry (Admin) ===
  res = await api("DELETE", `/api/schedule/${createdId}`, adminCookies);
  {
    const pass = res.status === 200;
    record("TC-SCHD-030", "SCHD-06", "Admin DELETE entry", pass,
      pass ? "" : `status=${res.status}`);

    // Verify deleted
    if (pass) {
      const verify = await api("GET", `/api/schedule/${createdId}`, studentCookies);
      const vpass = verify.status === 404;
      record("TC-SCHD-031", "SCHD-06", "Verify deleted entry → 404", vpass,
        `status=${verify.status}`);
    }
  }

  // === SCHD-06: DELETE non-existent ID → 404 ===
  res = await api("DELETE", "/api/schedule/nonexistent-abc", adminCookies);
  record("TC-SCHD-032", "SCHD-06", "DELETE non-existent ID → 404", res.status === 404,
    `status=${res.status}`);

  // === RBAC: Secretary DELETE (allowed) ===
  // Create then delete
  res = await api("POST", "/api/schedule", secretaryCookies, {
    dayOfWeek: "saturday", subject: "Extra Class", startTime: "08:00", endTime: "09:00",
  });
  {
    const j = res.json as { entry?: { id: string } };
    if (j.entry?.id) {
      const del = await api("DELETE", `/api/schedule/${j.entry.id}`, secretaryCookies);
      record("TC-SCHD-033", "SCHD-06", "Secretary DELETE (allowed)", del.status === 200,
        `status=${del.status}`);
    } else {
      record("TC-SCHD-033", "SCHD-06", "Secretary DELETE (allowed)", false, "setup failed");
    }
  }

  // === RBAC: Student DELETE → 403 ===
  res = await api("DELETE", "/api/schedule/any-id", studentCookies);
  record("TC-SCHD-034", "RBAC §6", "Student DELETE → 403", res.status === 403,
    `status=${res.status}`);

  // === Edge: dayOfWeek case-insensitive (Wednesday → wednesday) ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "WEDNESDAY", subject: "Case Test", startTime: "08:00", endTime: "09:00",
  });
  {
    const j = res.json as { entry?: { dayOfWeek: string } };
    const pass = res.status === 201 && j.entry?.dayOfWeek === "wednesday";
    record("TC-SCHD-035", "SCHD-01", "dayOfWeek case-insensitive (WEDNESDAY → wednesday)", pass,
      pass ? "" : `dayOfWeek=${j.entry?.dayOfWeek}`);

    // Cleanup
    if (pass && j.entry?.id) {
      await api("DELETE", `/api/schedule/${j.entry.id}`, adminCookies);
    }
  }

  // === Edge: weekType lowercase 'a' → normalized to 'A' ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "monday", subject: "WeekType Case", startTime: "14:00", endTime: "15:00", weekType: "a",
  });
  {
    const j = res.json as { entry?: { id: string; weekType: string } };
    const pass = res.status === 201 && j.entry?.weekType === "A";
    record("TC-SCHD-036", "SCHD-02", "weekType lowercase 'a' → 'A'", pass,
      pass ? "" : `weekType=${j.entry?.weekType}`);

    // Cleanup
    if (pass && j.entry?.id) {
      await api("DELETE", `/api/schedule/${j.entry.id}`, adminCookies);
    }
  }

  // === Edge: Default week param (no ?week=) → today ===
  res = await api("GET", "/api/schedule?date=2026-01-05", studentCookies);
  {
    const j = res.json as { entries?: Array<{ subject: string }> };
    const subjects = (j.entries || []).map((e) => e.subject).sort();
    const pass = res.status === 200 && subjects.includes("Matematika") && subjects.includes("Upacara");
    record("TC-SCHD-037", "SCHD-03", "Default week param → today", pass,
      pass ? "" : `subjects=${JSON.stringify(subjects)}`);
  }

  // === Edge: teacher/room null handling ===
  res = await api("POST", "/api/schedule", adminCookies, {
    dayOfWeek: "friday", subject: "No Teacher/Room", startTime: "13:00", endTime: "14:00",
  });
  {
    const j = res.json as { entry?: { id: string; teacher: string | null; room: string | null } };
    const pass = res.status === 201 && j.entry?.teacher === null && j.entry?.room === null;
    record("TC-SCHD-038", "SCHD-01", "Optional teacher/room omitted → null", pass,
      pass ? "" : `teacher=${j.entry?.teacher}, room=${j.entry?.room}`);

    if (pass && j.entry?.id) {
      await api("DELETE", `/api/schedule/${j.entry.id}`, adminCookies);
    }
  }

  // === Summary ===
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log("\nFAILURES:");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  ✗ ${r.id} [${r.prdRef}] ${r.title} — ${r.notes}`);
    }
  }
  console.log(failed === 0 ? "\n✅ ALL PASSED" : `\n❌ ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
