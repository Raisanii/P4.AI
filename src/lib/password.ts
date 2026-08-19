// P4.AI — bcrypt password helpers (NFR-04: password security via bcrypt).
// bcryptjs is pure JS (no native build), works on Raspberry Pi + Vercel/Node.

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password (bcrypt, salted). */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

/** Constant-time-ish compare of a plaintext password against a stored hash. */
export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
