import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import type { Domain } from "@/lib/skills/types";
import type { DomainOwner } from "./types";

interface OwnerRow {
  domain: Domain;
  user_id: string;
  user_email: string;
  user_name: string;
  created_at: string;
  updated_at: string;
}

function toDomainOwner(row: OwnerRow): DomainOwner {
  return {
    domain: row.domain,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDomainOwners() {
  await initializeDatabase();
  const rows = getDb()
    .prepare(`
      SELECT o.domain, o.user_id, u.email AS user_email, u.name AS user_name, o.created_at, o.updated_at
      FROM domain_owners o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.domain ASC
    `)
    .all() as OwnerRow[];
  return rows.map(toDomainOwner);
}

export async function getDomainOwner(domain: Domain) {
  await initializeDatabase();
  const row = getDb()
    .prepare(`
      SELECT o.domain, o.user_id, u.email AS user_email, u.name AS user_name, o.created_at, o.updated_at
      FROM domain_owners o
      JOIN users u ON u.id = o.user_id
      WHERE o.domain = ?
    `)
    .get(domain) as OwnerRow | undefined;
  return row ? toDomainOwner(row) : null;
}

export async function listUserOwnedDomains(userId: string) {
  await initializeDatabase();
  const rows = getDb()
    .prepare("SELECT domain FROM domain_owners WHERE user_id = ? ORDER BY domain ASC")
    .all(userId) as { domain: Domain }[];
  return rows.map((row) => row.domain);
}

export async function setDomainOwner(domain: Domain, userId: string) {
  await initializeDatabase();
  const now = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO domain_owners (domain, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(domain) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at
    `)
    .run(domain, userId, now, now);
  return getDomainOwner(domain);
}

export async function removeDomainOwner(domain: Domain) {
  await initializeDatabase();
  getDb().prepare("DELETE FROM domain_owners WHERE domain = ?").run(domain);
}
