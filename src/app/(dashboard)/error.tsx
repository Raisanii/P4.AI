"use client";

// P4.AI — Dashboard error boundary (NFR-06 error handling).
// Catches unhandled errors in any (dashboard)/* server component.
// Shows a friendly message with a retry button. Must be a client component.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: Props) {
  const router = useRouter();

  useEffect(() => {
    // Log to console for dev visibility; production should wire a reporter.
    console.error("[dashboard error]", error);
  }, [error]);

  function handleRetry() {
    reset();
    router.refresh();
  }

  return (
    <main className="page">
      <div className="error-boundary" role="alert">
        <p className="error-boundary-icon" aria-hidden="true">⚠️</p>
        <h2 className="error-boundary-title">Terjadi kesalahan</h2>
        <p className="error-boundary-message">
          Gagal memuat data. Periksa koneksi Anda dan coba lagi.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleRetry}>
          Coba lagi
        </button>
      </div>
    </main>
  );
}
