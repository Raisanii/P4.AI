// P4.AI — LoginForm client component (AUTH-01, AUTH-07, AUTH-08).
// Uses NextAuth v5 signIn with redirect:false so we can show inline errors
// without a full page reload. On success, router.push to the callbackUrl (or
// "/"), and the middleware (src/middleware.ts) handles role-based landing.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        name,
        password,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth returns the same error for any credentials failure — we
        // keep it generic too (never leak which part was wrong, NFR-05).
        setError("Nama atau password salah. Coba lagi.");
        return;
      }

      // Open-redirect guard: only allow same-origin, root-relative paths
      // (reject absolute URLs and protocol-relative "//" values).
      const safeUrl =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";

      router.push(safeUrl);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="name">Nama</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="username"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="Nama lengkap"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
