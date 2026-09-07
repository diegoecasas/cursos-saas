import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const COOKIE_NAME = "cursos_uid";
const TWO_YEARS_SEC = 60 * 60 * 24 * 365 * 2;

// Read or mint the anonymous per-browser identity. Only callable from
// Route Handlers (which can set cookies).
async function getOrCreateAnonId(): Promise<string> {
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

// The owner id used to key rows in the database.
// - Signed in: `user:<clerkId>`
// - Anonymous: `anon:<cookie-uuid>` (cookie minted on demand)
export async function getOwnerId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    return `anon:${await getOrCreateAnonId()}`;
  }

  const ownerId = `user:${userId}`;

  // First-signed-in reconciliation: if this browser still carries an anon
  // cookie, migrate its notes to the user's owner id, then drop the cookie.
  const store = await cookies();
  const anon = store.get(COOKIE_NAME);
  if (anon?.value) {
    try {
      await getDb()
        .update(schema.notes)
        .set({ ownerId })
        .where(eq(schema.notes.ownerId, `anon:${anon.value}`));
    } catch {
      // If the migration fails, we still return the signed-in id; the user
      // can rerun the merge from the seguimiento page.
    }
    store.delete(COOKIE_NAME);
  }

  return ownerId;
}
