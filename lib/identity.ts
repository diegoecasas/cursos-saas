import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "cursos_uid";
const TWO_YEARS_SEC = 60 * 60 * 24 * 365 * 2;

// Server-only: read or mint the anonymous per-browser identity.
// Callable from Route Handlers (which are allowed to set cookies).
export async function getOrCreateCookieId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME);
  if (existing?.value) return existing.value;
  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TWO_YEARS_SEC,
    path: "/",
  });
  return id;
}

// Read-only variant safe to call from Server Components (never sets a cookie).
export async function readCookieId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}
