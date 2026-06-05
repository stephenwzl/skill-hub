import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DEFAULT_SKILLS_DIR } from "@/lib/skills/constants";

const DB_PATH = process.env.SKILL_HUB_DB_PATH
  ? path.resolve(process.env.SKILL_HUB_DB_PATH)
  : path.join(process.cwd(), "data", "skill-hub.sqlite");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }

  return db;
}

/** Get the skills directory path (from env or default) */
export function getSkillsDir(): string {
  const dir = process.env.SKILL_HUB_SKILLS_DIR
    ? path.resolve(process.env.SKILL_HUB_SKILLS_DIR)
    : path.join(process.cwd(), DEFAULT_SKILLS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
