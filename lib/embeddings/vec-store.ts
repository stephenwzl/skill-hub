import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import { EMBEDDING_DIMS } from "./constants";
import { embedPassage } from "./model";
import { buildSkillEmbeddingText, computeSkillEmbeddingFingerprint } from "./text";
import { getSkillsWithContent } from "@/lib/skills/storage";
import type { SkillDetail } from "@/lib/skills/types";

let vecAvailable = false;
let vecChecked = false;

/** Try to load sqlite-vec extension into the database connection */
export async function ensureVecExtension(): Promise<boolean> {
  if (vecChecked) return vecAvailable;
  vecChecked = true;

  try {
    const db = getDb();
    const sqliteVec = await import("sqlite-vec");
    const extPath = process.env.SQLITE_VEC_PATH?.trim();
    if (extPath) {
      db.loadExtension(extPath);
    } else {
      // sqlite-vec package exposes getLoadablePath() for the native extension
      db.loadExtension(sqliteVec.getLoadablePath());
    }
    vecAvailable = true;
    console.log("[vec-store] sqlite-vec extension loaded");
  } catch (error) {
    vecAvailable = false;
    console.warn("[vec-store] sqlite-vec extension not available, falling back to file-based cache:", error);
  }

  return vecAvailable;
}

/** Create the virtual table for vector storage if sqlite-vec is available */
export async function ensureVecTable(): Promise<boolean> {
  await initializeDatabase();
  const available = await ensureVecExtension();
  if (!available) return false;

  try {
    const db = getDb();
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS skill_vectors
      USING vec0(
        skill_id TEXT PRIMARY KEY,
        embedding float[${EMBEDDING_DIMS}]
      )
    `);
    return true;
  } catch (error) {
    console.warn("[vec-store] Failed to create vec0 table:", error);
    return false;
  }
}

/** Rebuild all vectors in sqlite-vec from current skills */
export async function rebuildVecIndex(
  onProgress?: (current: number, total: number, skillId: string) => void
): Promise<{ rebuilt: number; reused: number }> {
  const available = await ensureVecTable();
  if (!available) return { rebuilt: 0, reused: 0 };

  const db = getDb();
  const skills = await getSkillsWithContent();

  if (skills.length === 0) {
    db.prepare("DELETE FROM skill_vectors").run();
    return { rebuilt: 0, reused: 0 };
  }

  // Get existing fingerprints
  const existingRows = db.prepare("SELECT skill_id, embedding FROM skill_vectors").all() as { skill_id: string; embedding: Buffer }[];
  const existingIds = new Set(existingRows.map((r) => r.skill_id));

  let rebuilt = 0;
  let reused = 0;

  // Delete vectors for skills that no longer exist
  const currentIds = new Set(skills.map((s) => s.id));
  for (const existingId of existingIds) {
    if (!currentIds.has(existingId)) {
      db.prepare("DELETE FROM skill_vectors WHERE skill_id = ?").run(existingId);
    }
  }

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i]!;
    const fingerprint = computeSkillEmbeddingFingerprint(skill);

    onProgress?.(i + 1, skills.length, skill.id);

    // Check if fingerprint changed
    const row = db.prepare("SELECT id FROM skills WHERE id = ? AND embedding_fingerprint = ?").get(skill.id, fingerprint);
    if (row && existingIds.has(skill.id)) {
      // Fingerprint unchanged and vector exists — skip
      reused++;
      continue;
    }

    // Compute new embedding
    const embedding = await embedPassage(buildSkillEmbeddingText(skill));
    const embeddingBuffer = Buffer.from(new Uint8Array(embedding.buffer, embedding.byteOffset, embedding.byteLength));

    db.prepare(`
      INSERT OR REPLACE INTO skill_vectors (skill_id, embedding)
      VALUES (?, ?)
    `).run(skill.id, embeddingBuffer);

    // Update fingerprint
    db.prepare("UPDATE skills SET embedding_fingerprint = ? WHERE id = ?").run(fingerprint, skill.id);
    rebuilt++;
  }

  console.log("[vec-store] index rebuilt", { total: skills.length, rebuilt, reused });
  return { rebuilt, reused };
}

/** Query top-K similar skills using sqlite-vec */
export async function vecSearch(
  queryEmbedding: Float32Array,
  topK: number = 20
): Promise<Array<{ skillId: string; distance: number }>> {
  const available = await ensureVecTable();
  if (!available) return [];

  const db = getDb();
  const queryBuffer = Buffer.from(new Uint8Array(queryEmbedding.buffer, queryEmbedding.byteOffset, queryEmbedding.byteLength));

  const rows = db.prepare(`
    SELECT skill_id, distance
    FROM skill_vectors
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `).all(queryBuffer, topK) as { skill_id: string; distance: number }[];

  return rows.map((row) => ({
    skillId: row.skill_id,
    distance: row.distance,
  }));
}

/** Check if sqlite-vec is available and the table has data */
export async function isVecIndexReady(): Promise<boolean> {
  const available = await ensureVecTable();
  if (!available) return false;

  try {
    const db = getDb();
    const count = db.prepare("SELECT COUNT(*) as cnt FROM skill_vectors").get() as { cnt: number };
    return count.cnt > 0;
  } catch {
    return false;
  }
}
