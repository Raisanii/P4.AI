// P4.AI — Not found page (NFR-06).
// Renders when next/navigation notFound() is called or a route doesn't exist.

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="error-boundary">
        <p className="error-boundary-icon" aria-hidden="true">🔍</p>
        <h2 className="error-boundary-title">Halaman tidak ditemukan</h2>
        <p className="error-boundary-message">
          Halaman yang Anda cari tidak tersedia.
        </p>
        <Link href="/" className="btn btn-primary btn-sm">← Kembali ke Dashboard</Link>
      </div>
    </main>
  );
}
