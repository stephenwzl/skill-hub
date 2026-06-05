import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import { getUserById } from "./users";
import { randomToken, sha256 } from "./crypto";
import type { AuthUser } from "./types";

export const SESSION_COOKIE = "skill_hub_session";
const SESSION_DAYS = 14;

function isSecureCookieEnabled() {
  const value = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookieEnabled(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function createSession(userId: string) {
  await initializeDatabase();
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  getDb()
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), userId, sha256(token), expiresAt.toISOString(), now.toISOString());

  return token;
}

export async function deleteSession(token: string) {
  await initializeDatabase();
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .get(sha256(token)) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSession(token);
    return null;
  }

  return getUserById(row.user_id);
}

export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? getUserBySessionToken(token) : null;
}
