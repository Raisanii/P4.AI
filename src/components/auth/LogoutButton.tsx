// P4.AI — LogoutButton client component (AUTH-08).
// signOut clears the JWT session and redirects to /login.

"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      Keluar
    </button>
  );
}
