import { getDb } from "./client";
import { generateApiKey } from "@/lib/auth/api-key";
import { hashSecret } from "@/lib/auth/crypto";

let initialized = false;

export async function initializeDatabase() {
  const db = getDb();

  db.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      api_key TEXT,
      api_key_hash TEXT NOT NULL UNIQUE,
      api_key_prefix TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Domain owners
    CREATE TABLE IF NOT EXISTS domain_owners (
      domain TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Skills (metadata + search summary; full content stored in filesystem)
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'deprecated')),
      version INTEGER NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      author TEXT NOT NULL,
      content_summary TEXT NOT NULL DEFAULT '',
      content_hash TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'submitted', 'imported')),
      language TEXT NOT NULL DEFAULT '',
      framework TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
      license TEXT NOT NULL DEFAULT '',
      prerequisites_json TEXT NOT NULL DEFAULT '[]',
      related_skill_ids_json TEXT NOT NULL DEFAULT '[]',
      import_url TEXT,
      imported_at TEXT,
      embedding_fingerprint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Skill embeddings (sqlite-vec virtual table created separately)
    -- See lib/embeddings/vec-store.ts

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain);
    CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
    CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills(updated_at);
    CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
    CREATE INDEX IF NOT EXISTS idx_skills_language ON skills(language);
    CREATE INDEX IF NOT EXISTS idx_skills_framework ON skills(framework);
    CREATE INDEX IF NOT EXISTS idx_skills_difficulty ON skills(difficulty);
  `);

  runMigrations(db);

  if (!initialized) {
    initialized = true;
    await seedAdminUser();
  }
}

function runMigrations(db: ReturnType<typeof getDb>) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = new Set(tables.map((t) => t.name));

  // Migrate users: add api_key, plan columns
  if (tableNames.has("users")) {
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const colNames = new Set(columns.map((c) => c.name));
    if (!colNames.has("api_key")) {
      db.prepare("ALTER TABLE users ADD COLUMN api_key TEXT").run();
    }
    if (!colNames.has("plan")) {
      db.prepare("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise'))").run();
    }
  }

  // Migrate skills: add new SKILL format columns, rename content → content_summary, add content_hash
  if (tableNames.has("skills")) {
    const columns = db.prepare("PRAGMA table_info(skills)").all() as { name: string }[];
    const colNames = new Set(columns.map((c) => c.name));

    if (!colNames.has("embedding_fingerprint")) {
      db.prepare("ALTER TABLE skills ADD COLUMN embedding_fingerprint TEXT").run();
    }
    if (!colNames.has("source")) {
      db.prepare("ALTER TABLE skills ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'submitted', 'imported'))").run();
    }
    if (!colNames.has("language")) {
      db.prepare("ALTER TABLE skills ADD COLUMN language TEXT NOT NULL DEFAULT ''").run();
    }
    if (!colNames.has("framework")) {
      db.prepare("ALTER TABLE skills ADD COLUMN framework TEXT NOT NULL DEFAULT ''").run();
    }
    if (!colNames.has("difficulty")) {
      db.prepare("ALTER TABLE skills ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced'))").run();
    }
    if (!colNames.has("license")) {
      db.prepare("ALTER TABLE skills ADD COLUMN license TEXT NOT NULL DEFAULT ''").run();
    }
    if (!colNames.has("prerequisites_json")) {
      db.prepare("ALTER TABLE skills ADD COLUMN prerequisites_json TEXT NOT NULL DEFAULT '[]'").run();
    }
    if (!colNames.has("related_skill_ids_json")) {
      db.prepare("ALTER TABLE skills ADD COLUMN related_skill_ids_json TEXT NOT NULL DEFAULT '[]'").run();
    }
    if (!colNames.has("import_url")) {
      db.prepare("ALTER TABLE skills ADD COLUMN import_url TEXT").run();
    }
    if (!colNames.has("imported_at")) {
      db.prepare("ALTER TABLE skills ADD COLUMN imported_at TEXT").run();
    }
    if (!colNames.has("content_hash")) {
      db.prepare("ALTER TABLE skills ADD COLUMN content_hash TEXT").run();
    }

    // Rename content → content_summary (if old column exists and new one doesn't)
    if (colNames.has("content") && !colNames.has("content_summary")) {
      db.prepare("ALTER TABLE skills RENAME COLUMN content TO content_summary").run();
    }

    // If content_summary doesn't exist and content also doesn't exist (fresh install handled by CREATE TABLE)
    if (!colNames.has("content_summary") && !colNames.has("content")) {
      db.prepare("ALTER TABLE skills ADD COLUMN content_summary TEXT NOT NULL DEFAULT ''").run();
    }
  }

  // Drop skill_examples table (examples migrated to references/ directory on filesystem)
  if (tableNames.has("skill_examples")) {
    db.prepare("DROP TABLE IF EXISTS skill_examples").run();
  }
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@skillhub.local";
  const name = "Admin";
  const password = process.env.ADMIN_PASSWORD || "skill-hub-admin";
  const db = getDb();

  const exists = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email) as
    | { id: string; role: string }
    | undefined;

  const passwordHash = await hashSecret(password);

  if (exists) {
    db.prepare("UPDATE users SET name = ?, password_hash = ?, role = 'admin', plan = 'enterprise', updated_at = ? WHERE id = ?").run(
      name,
      passwordHash,
      new Date().toISOString(),
      exists.id
    );
    return;
  }

  const now = new Date().toISOString();
  const apiKey = generateApiKey();

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, api_key, api_key_hash, api_key_prefix, role, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'enterprise', ?, ?)
  `).run(crypto.randomUUID(), email, name, passwordHash, apiKey.apiKey, apiKey.hash, apiKey.prefix, now, now);

  console.warn(
    `[auth] Seeded admin user ${email}. API key: ${apiKey.apiKey}`
  );
}
