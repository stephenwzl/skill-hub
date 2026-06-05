import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import { SKILL_STATUS, CONTENT_SUMMARY_MAX_CHARS } from "./constants";
import { parseSkillId } from "./scope";
import { scanSkillsDir, readSkillMd, readSkillMdHash, computeContentHash, generateContentSummary } from "./fs";
import type { SkillMdFrontmatter } from "./frontmatter";

interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
}

/** Sync filesystem skills with the database on startup */
export async function syncSkillsFromFilesystem(): Promise<SyncResult> {
  await initializeDatabase();
  const db = getDb();

  const result: SyncResult = { added: [], updated: [], removed: [] };

  // 1. Scan filesystem for all skill IDs
  const fsSkillIds = new Set(scanSkillsDir());

  // 2. Get all DB skill IDs
  const dbRows = db.prepare("SELECT id, content_hash FROM skills").all() as Array<{ id: string; content_hash: string | null }>;
  const dbSkillMap = new Map(dbRows.map((row) => [row.id, row.content_hash]));

  // 3. For each filesystem skill: check if new or updated
  for (const skillId of fsSkillIds) {
    const parsed = readSkillMd(skillId);
    if (!parsed) continue;

    const fsHash = readSkillMdHash(skillId);
    const dbHash = dbSkillMap.get(skillId);

    if (!dbHash && !dbSkillMap.has(skillId)) {
      // New skill: not in DB → insert
      insertSkillFromFs(db, skillId, parsed.frontmatter, parsed.content);
      result.added.push(skillId);
    } else if (fsHash && dbHash !== fsHash) {
      // Content changed → update DB metadata + summary
      updateSkillFromFs(db, skillId, parsed.frontmatter, parsed.content);
      result.updated.push(skillId);
    }
    // else: hash matches, no action needed
  }

  // 4. For DB skills not in filesystem → mark as deprecated
  for (const [skillId] of dbSkillMap) {
    if (!fsSkillIds.has(skillId)) {
      const existing = db.prepare("SELECT status FROM skills WHERE id = ?").get(skillId) as { status: string } | undefined;
      if (existing && existing.status === SKILL_STATUS.ACTIVE) {
        db.prepare("UPDATE skills SET status = ?, updated_at = ? WHERE id = ?").run(
          SKILL_STATUS.DEPRECATED,
          new Date().toISOString(),
          skillId
        );
        result.removed.push(skillId);
      }
    }
  }

  if (result.added.length > 0 || result.updated.length > 0 || result.removed.length > 0) {
    console.log("[sync] filesystem → DB sync completed", result);
  }

  return result;
}

function insertSkillFromFs(
  db: ReturnType<typeof getDb>,
  skillId: string,
  frontmatter: SkillMdFrontmatter,
  content: string
): void {
  const now = new Date().toISOString();
  const contentHash = readSkillMdHash(skillId) ?? computeContentHash(content);
  const contentSummary = generateContentSummary(content);
  const source = frontmatter.metadata.source ?? "manual";
  const parsed = parseSkillId(skillId);

  db.prepare(`
    INSERT INTO skills (
      id, name, domain, tags_json, description, status, version,
      usage_count, author, content_summary, content_hash, source, language, framework,
      difficulty, license, prerequisites_json, related_skill_ids_json,
      import_url, imported_at, embedding_fingerprint, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      domain = excluded.domain,
      tags_json = excluded.tags_json,
      description = excluded.description,
      content_summary = excluded.content_summary,
      content_hash = excluded.content_hash,
      source = excluded.source,
      language = excluded.language,
      framework = excluded.framework,
      difficulty = excluded.difficulty,
      license = excluded.license,
      prerequisites_json = excluded.prerequisites_json,
      related_skill_ids_json = excluded.related_skill_ids_json,
      import_url = excluded.import_url,
      updated_at = excluded.updated_at
  `).run(
    skillId,
    frontmatter.name,
    frontmatter.metadata.domain,
    JSON.stringify(frontmatter.metadata.tags ?? []),
    frontmatter.description,
    SKILL_STATUS.ACTIVE,
    frontmatter.metadata.version ?? 1,
    0,
    frontmatter.metadata.author ?? "",
    contentSummary,
    contentHash,
    source,
    frontmatter.metadata.language ?? "",
    frontmatter.metadata.framework ?? "",
    frontmatter.metadata.difficulty ?? "intermediate",
    frontmatter.license ?? "",
    JSON.stringify(frontmatter.metadata.prerequisites ?? []),
    JSON.stringify(frontmatter.metadata.relatedSkillIds ?? []),
    frontmatter.metadata.importUrl ?? null,
    source === "imported" ? now : null,
    null, // embedding_fingerprint will be computed on next rebuild
    now,
    now
  );
}

function updateSkillFromFs(
  db: ReturnType<typeof getDb>,
  skillId: string,
  frontmatter: SkillMdFrontmatter,
  content: string
): void {
  const now = new Date().toISOString();
  const contentHash = readSkillMdHash(skillId) ?? computeContentHash(content);
  const contentSummary = generateContentSummary(content);

  db.prepare(`
    UPDATE skills
    SET name = ?, domain = ?, tags_json = ?, description = ?,
        content_summary = ?, content_hash = ?,
        source = ?, language = ?, framework = ?,
        difficulty = ?, license = ?,
        prerequisites_json = ?, related_skill_ids_json = ?,
        import_url = ?, embedding_fingerprint = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(
    frontmatter.name,
    frontmatter.metadata.domain,
    JSON.stringify(frontmatter.metadata.tags ?? []),
    frontmatter.description,
    contentSummary,
    contentHash,
    frontmatter.metadata.source ?? "manual",
    frontmatter.metadata.language ?? "",
    frontmatter.metadata.framework ?? "",
    frontmatter.metadata.difficulty ?? "intermediate",
    frontmatter.license ?? "",
    JSON.stringify(frontmatter.metadata.prerequisites ?? []),
    JSON.stringify(frontmatter.metadata.relatedSkillIds ?? []),
    frontmatter.metadata.importUrl ?? null,
    now,
    skillId
  );
}
