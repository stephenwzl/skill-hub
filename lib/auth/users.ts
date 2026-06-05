import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import { generateApiKey, hashApiKey } from "./api-key";
import { hashSecret, verifySecret } from "./crypto";
import type { AuthUser, UserRole, PlanType } from "./types";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  api_key: string | null;
  api_key_prefix: string;
  role: UserRole;
  plan: PlanType;
  created_at: string;
  updated_at: string;
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    apiKeyPrefix: row.api_key_prefix,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Check if email is allowed for registration. Empty ALLOWED_EMAIL_DOMAIN = allow all. */
export function isAllowedEmail(email: string): boolean {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
  if (!domain) return true; // open registration
  return email.trim().toLowerCase().endsWith(`@${domain}`);
}

export function isSystemAdminEmail(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail;
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  plan?: PlanType;
}) {
  await initializeDatabase();
  const email = input.email.trim().toLowerCase();
  if (!isAllowedEmail(email) && !isSystemAdminEmail(email)) {
    const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
    throw new Error(domain ? `Email must be @${domain}` : "Email not allowed");
  }

  const now = new Date().toISOString();
  const apiKey = generateApiKey();
  const passwordHash = await hashSecret(input.password);
  const db = getDb();

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, api_key, api_key_hash, api_key_prefix, role, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    email,
    input.name.trim() || email,
    passwordHash,
    apiKey.apiKey,
    apiKey.hash,
    apiKey.prefix,
    input.role ?? "user",
    input.plan ?? "free",
    now,
    now
  );

  const user = await getUserByEmail(email);
  if (!user) throw new Error("Failed to create user");
  return { user, apiKey: apiKey.apiKey };
}

export async function getUserById(id: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  return row ? toAuthUser(row) : null;
}

export async function getUserByEmail(email: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  return row ? toAuthUser(row) : null;
}

export async function listUsers() {
  await initializeDatabase();
  const rows = getDb()
    .prepare("SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users ORDER BY name ASC")
    .all() as UserRow[];
  return rows.map(toAuthUser);
}

export async function listNonAdminUsers() {
  await initializeDatabase();
  const rows = getDb()
    .prepare(
      "SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users WHERE role != 'admin' ORDER BY name ASC"
    )
    .all() as UserRow[];
  return rows.map(toAuthUser);
}

export async function authenticatePassword(email: string, password: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  if (!row) return null;

  const valid = await verifySecret(password, row.password_hash);
  return valid ? toAuthUser(row) : null;
}

export async function authenticateApiKey(apiKey: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT id, email, name, password_hash, api_key, api_key_prefix, role, plan, created_at, updated_at FROM users WHERE api_key_hash = ?")
    .get(hashApiKey(apiKey)) as UserRow | undefined;
  return row ? toAuthUser(row) : null;
}

export async function getUserApiKey(userId: string) {
  await initializeDatabase();
  const row = getDb()
    .prepare("SELECT api_key FROM users WHERE id = ?")
    .get(userId) as { api_key: string | null } | undefined;
  return row?.api_key ?? null;
}

export async function resetUserApiKey(userId: string) {
  await initializeDatabase();
  const apiKey = generateApiKey();
  const now = new Date().toISOString();

  getDb()
    .prepare(
      "UPDATE users SET api_key = ?, api_key_hash = ?, api_key_prefix = ?, updated_at = ? WHERE id = ?"
    )
    .run(apiKey.apiKey, apiKey.hash, apiKey.prefix, now, userId);

  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  return { user, apiKey: apiKey.apiKey };
}
