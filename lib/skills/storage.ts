import { unstable_noStore as noStore } from "next/cache";
import { getDb } from "@/lib/db/client";
import { initializeDatabase } from "@/lib/db/schema";
import { listNonAdminUsers } from "@/lib/auth/users";
import { computeSkillEmbeddingFingerprint } from "@/lib/embeddings/text";
import type {
  SkillMetadata,
  SkillDetail,
  SkillListItem,
  SkillQueryParams,
  SkillQueryResult,
  SkillCreateInput,
  SkillUpdateInput,
  SkillCompactPlan,
  SkillScopeSummary,
  SkillFileReference,
} from "./types";
import { DOMAINS, SKILL_STATUS } from "./constants";
import { normalizeUserScope, parseSkillId } from "./scope";
import {
  readSkillMd,
  readAllSkillFiles,
  writeSkillFiles,
  deleteSkillDir,
  readSkillMdHash,
  computeContentHash,
  generateContentSummary,
} from "./fs";
import type { SkillMdFrontmatter } from "./frontmatter";

interface SkillRow {
  id: string;
  name: string;
  domain: string;
  tags_json: string;
  description: string;
  status: string;
  version: number;
  usage_count: number;
  author: string;
  content_summary: string;
  content_hash: string | null;
  source: string;
  language: string;
  framework: string;
  difficulty: string;
  license: string;
  prerequisites_json: string;
  related_skill_ids_json: string;
  import_url: string | null;
  imported_at: string | null;
  embedding_fingerprint: string | null;
  created_at: string;
  updated_at: string;
}

async function ensureDb() {
  noStore();
  await initializeDatabase();
}

function notifyEmbeddingCacheInvalidated() {
  void import("@/lib/embeddings/cache").then(({ invalidateEmbeddingCache }) => {
    invalidateEmbeddingCache();
  });
}

function rowToMetadata(row: SkillRow): SkillMetadata {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain as SkillMetadata["domain"],
    tags: JSON.parse(row.tags_json) as string[],
    description: row.description,
    status: row.status as SkillMetadata["status"],
    version: row.version,
    usageCount: row.usage_count,
    author: row.author,
    source: (row.source || "manual") as SkillMetadata["source"],
    language: row.language || "",
    framework: row.framework || "",
    difficulty: (row.difficulty || "intermediate") as SkillMetadata["difficulty"],
    license: row.license || "",
    prerequisites: JSON.parse(row.prerequisites_json || "[]") as string[],
    relatedSkillIds: JSON.parse(row.related_skill_ids_json || "[]") as string[],
    importUrl: row.import_url,
    importedAt: row.imported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Build SkillDetail by reading content from filesystem */
async function rowToDetail(row: SkillRow): Promise<SkillDetail> {
  const metadata = rowToMetadata(row);
  const parsed = readSkillMd(row.id);
  const files = readAllSkillFiles(row.id);

  return {
    ...metadata,
    content: parsed?.content ?? row.content_summary ?? "",
    scripts: files.scripts,
    references: files.references,
    assets: files.assets,
  };
}

function buildFrontmatterFromInput(input: SkillCreateInput, metadata: SkillMetadata): SkillMdFrontmatter {
  return {
    name: input.name,
    description: input.description,
    license: input.license || undefined,
    metadata: {
      domain: input.domain,
      language: input.language || undefined,
      framework: input.framework || undefined,
      difficulty: input.difficulty || undefined,
      tags: input.tags,
      prerequisites: input.prerequisites || undefined,
      relatedSkillIds: input.relatedSkillIds || undefined,
      author: input.author,
      source: input.source,
      version: metadata.version,
      importUrl: input.importUrl ?? undefined,
    },
  };
}

function computeEmbeddingFingerprint(
  metadata: SkillMetadata,
  content: string,
  files: { scripts: SkillFileReference[]; references: SkillFileReference[]; assets: SkillFileReference[] }
): string {
  return computeSkillEmbeddingFingerprint({ ...metadata, content, scripts: files.scripts, references: files.references, assets: files.assets });
}

function buildFilterClauses(filters?: {
  status?: SkillMetadata["status"];
  domain?: SkillMetadata["domain"];
  scope?: string;
  search?: string;
  ids?: string[];
  language?: string;
  framework?: string;
  difficulty?: string;
  source?: string;
}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.domain) {
    clauses.push("domain = ?");
    params.push(filters.domain);
  }
  if (filters?.scope) {
    clauses.push("id LIKE ?");
    params.push(`@${filters.scope}/%`);
  }
  if (filters?.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    clauses.push(
      "(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags_json) LIKE ? OR LOWER(language) LIKE ? OR LOWER(framework) LIKE ? OR LOWER(content_summary) LIKE ?)"
    );
    params.push(q, q, q, q, q, q);
  }
  if (filters?.ids && filters.ids.length > 0) {
    const placeholders = filters.ids.map(() => "?").join(", ");
    clauses.push(`id IN (${placeholders})`);
    params.push(...filters.ids);
  }
  if (filters?.language) {
    clauses.push("language = ?");
    params.push(filters.language);
  }
  if (filters?.framework) {
    clauses.push("framework = ?");
    params.push(filters.framework);
  }
  if (filters?.difficulty) {
    clauses.push("difficulty = ?");
    params.push(filters.difficulty);
  }
  if (filters?.source) {
    clauses.push("source = ?");
    params.push(filters.source);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

function listSkillRows(filters?: Parameters<typeof buildFilterClauses>[0]): SkillRow[] {
  const { where, params } = buildFilterClauses(filters);
  return getDb()
    .prepare(`SELECT * FROM skills ${where} ORDER BY updated_at DESC`)
    .all(...params) as SkillRow[];
}

// --- Public API ---

export async function getAllSkills(params?: SkillQueryParams): Promise<SkillQueryResult> {
  await ensureDb();
  const rows = listSkillRows({
    status: params?.status,
    domain: params?.domain,
    scope: params?.scope,
    search: params?.search,
    language: params?.language,
    framework: params?.framework,
    difficulty: params?.difficulty,
    source: params?.source,
  });

  const metadatas = rows.map(rowToMetadata);

  const sortBy = params?.sortBy ?? "updatedAt";
  const sortOrder = params?.sortOrder ?? "desc";
  metadatas.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "createdAt":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "usageCount":
        cmp = a.usageCount - b.usageCount;
        break;
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const total = metadatas.length;
  const start = (page - 1) * pageSize;
  const skills: SkillListItem[] = metadatas.slice(start, start + pageSize);

  return { skills, total, page, pageSize };
}

type ScopeAggregate = Pick<
  SkillScopeSummary,
  "skillCount" | "activeCount" | "deprecatedCount" | "totalUsage" | "latestUpdatedAt"
>;

function emptyScopeAggregate(): ScopeAggregate {
  return { skillCount: 0, activeCount: 0, deprecatedCount: 0, totalUsage: 0 };
}

function aggregateSkillsByScope(): Map<string, ScopeAggregate> {
  const aggregates = new Map<string, ScopeAggregate>();

  for (const row of listSkillRows()) {
    const parsed = parseSkillId(row.id);
    if (!parsed) continue;

    const existing = aggregates.get(parsed.scope) ?? emptyScopeAggregate();
    existing.skillCount += 1;
    existing.totalUsage += row.usage_count;
    if (row.status === SKILL_STATUS.ACTIVE) existing.activeCount += 1;
    if (row.status === SKILL_STATUS.DEPRECATED) existing.deprecatedCount += 1;
    if (!existing.latestUpdatedAt || new Date(row.updated_at).getTime() > new Date(existing.latestUpdatedAt).getTime()) {
      existing.latestUpdatedAt = row.updated_at;
    }
    aggregates.set(parsed.scope, existing);
  }

  return aggregates;
}

export async function getSkillScopeSummaries(): Promise<{
  organizations: SkillScopeSummary[];
  users: SkillScopeSummary[];
}> {
  await ensureDb();
  const aggregatesByScope = aggregateSkillsByScope();

  const organizations = DOMAINS.map((domain) => ({
    scope: domain,
    kind: "domain" as const,
    domain,
    ...(aggregatesByScope.get(domain) ?? emptyScopeAggregate()),
  }));

  const registeredUsers = await listNonAdminUsers();
  const users = registeredUsers
    .map((user) => {
      const scope = normalizeUserScope(user);
      return {
        scope,
        kind: "personal" as const,
        ...(aggregatesByScope.get(scope) ?? emptyScopeAggregate()),
      };
    })
    .sort((a, b) => {
      const usageDiff = b.totalUsage - a.totalUsage;
      if (usageDiff !== 0) return usageDiff;
      const countDiff = b.skillCount - a.skillCount;
      if (countDiff !== 0) return countDiff;
      return a.scope.localeCompare(b.scope);
    });

  return { organizations, users };
}

export async function getSkillById(id: string): Promise<SkillDetail | null> {
  await ensureDb();
  const row = getDb().prepare("SELECT * FROM skills WHERE id = ?").get(id) as SkillRow | undefined;
  if (!row) return null;

  return rowToDetail(row);
}

export async function getSkillsWithContent(params?: {
  domain?: SkillMetadata["domain"];
  status?: SkillMetadata["status"];
  ids?: string[];
}): Promise<SkillDetail[]> {
  await ensureDb();
  const rows = listSkillRows({
    domain: params?.domain,
    status: params?.status,
    ids: params?.ids,
  });
  const details: SkillDetail[] = [];
  for (const row of rows) {
    details.push(await rowToDetail(row));
  }
  return details;
}

export async function createSkill(
  input: SkillCreateInput,
  options?: { force?: boolean }
): Promise<SkillDetail> {
  await ensureDb();
  const id = input.id;
  const now = new Date().toISOString();
  const existing = getDb().prepare("SELECT * FROM skills WHERE id = ?").get(id) as SkillRow | undefined;
  if (existing && !options?.force) throw new Error("Skill ID already exists");

  const metadata: SkillMetadata = {
    id,
    name: input.name,
    domain: input.domain,
    tags: input.tags,
    description: input.description,
    status: SKILL_STATUS.ACTIVE,
    version: existing ? existing.version + 1 : 1,
    usageCount: existing?.usage_count ?? 0,
    author: input.author,
    source: input.source ?? "manual",
    language: input.language ?? "",
    framework: input.framework ?? "",
    difficulty: input.difficulty ?? "intermediate",
    license: input.license ?? "",
    prerequisites: input.prerequisites ?? [],
    relatedSkillIds: input.relatedSkillIds ?? [],
    importUrl: input.importUrl ?? null,
    importedAt: input.source === "imported" ? now : (existing?.imported_at ?? null),
    createdAt: existing?.created_at ?? now,
    updatedAt: now,
  };

  const frontmatter = buildFrontmatterFromInput(input, metadata);
  const files = {
    scripts: input.scripts ?? [],
    references: input.references ?? [],
    assets: input.assets ?? [],
  };

  // Write to filesystem first
  writeSkillFiles(id, frontmatter, input.content, files);

  const contentHash = computeContentHash(input.content);
  const contentSummary = generateContentSummary(input.content);
  const embeddingFingerprint = computeEmbeddingFingerprint(metadata, input.content, files);

  const db = getDb();
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
      status = excluded.status,
      version = excluded.version,
      usage_count = excluded.usage_count,
      author = excluded.author,
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
      imported_at = excluded.imported_at,
      embedding_fingerprint = excluded.embedding_fingerprint,
      updated_at = excluded.updated_at
  `).run(
    metadata.id, metadata.name, metadata.domain, JSON.stringify(metadata.tags),
    metadata.description, metadata.status, metadata.version,
    metadata.usageCount, metadata.author, contentSummary, contentHash,
    metadata.source, metadata.language, metadata.framework,
    metadata.difficulty, metadata.license,
    JSON.stringify(metadata.prerequisites), JSON.stringify(metadata.relatedSkillIds),
    metadata.importUrl, metadata.importedAt,
    embeddingFingerprint, metadata.createdAt, metadata.updatedAt
  );

  notifyEmbeddingCacheInvalidated();
  return { ...metadata, content: input.content, ...files };
}

export async function updateSkill(id: string, input: SkillUpdateInput): Promise<SkillDetail | null> {
  await ensureDb();
  const row = getDb().prepare("SELECT * FROM skills WHERE id = ?").get(id) as SkillRow | undefined;
  if (!row) return null;

  const now = new Date().toISOString();
  const metadata = rowToMetadata(row);
  const updated: SkillMetadata = {
    ...metadata,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.domain !== undefined && { domain: input.domain }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.language !== undefined && { language: input.language }),
    ...(input.framework !== undefined && { framework: input.framework }),
    ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
    ...(input.license !== undefined && { license: input.license }),
    ...(input.prerequisites !== undefined && { prerequisites: input.prerequisites }),
    ...(input.relatedSkillIds !== undefined && { relatedSkillIds: input.relatedSkillIds }),
    updatedAt: now,
  };

  // Read current content from filesystem, or fallback to DB summary
  const currentParsed = readSkillMd(id);
  const content = input.content !== undefined ? input.content : (currentParsed?.content ?? row.content_summary);

  // Read current files from filesystem
  const currentFiles = readAllSkillFiles(id);
  const files = {
    scripts: input.scripts ?? currentFiles.scripts,
    references: input.references ?? currentFiles.references,
    assets: input.assets ?? currentFiles.assets,
  };

  // Write to filesystem
  const frontmatter: SkillMdFrontmatter = {
    name: updated.name,
    description: updated.description,
    license: updated.license || undefined,
    metadata: {
      domain: updated.domain,
      language: updated.language || undefined,
      framework: updated.framework || undefined,
      difficulty: updated.difficulty || undefined,
      tags: updated.tags,
      prerequisites: updated.prerequisites.length > 0 ? updated.prerequisites : undefined,
      relatedSkillIds: updated.relatedSkillIds.length > 0 ? updated.relatedSkillIds : undefined,
      author: updated.author,
      source: updated.source,
      version: updated.version,
      importUrl: updated.importUrl ?? undefined,
    },
  };

  writeSkillFiles(id, frontmatter, content, {
    scripts: input.scripts,
    references: input.references,
    assets: input.assets,
  });

  const contentHash = computeContentHash(content);
  const contentSummary = generateContentSummary(content);
  const embeddingFingerprint = computeEmbeddingFingerprint(updated, content, files);

  const db = getDb();
  db.prepare(`
    UPDATE skills
    SET name = ?, domain = ?, tags_json = ?, description = ?,
        content_summary = ?, content_hash = ?,
        language = ?, framework = ?, difficulty = ?, license = ?,
        prerequisites_json = ?, related_skill_ids_json = ?,
        embedding_fingerprint = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.name, updated.domain, JSON.stringify(updated.tags),
    updated.description, contentSummary, contentHash,
    updated.language, updated.framework, updated.difficulty, updated.license,
    JSON.stringify(updated.prerequisites), JSON.stringify(updated.relatedSkillIds),
    embeddingFingerprint, updated.updatedAt, id
  );

  notifyEmbeddingCacheInvalidated();
  return getSkillById(id);
}

export async function deleteSkill(id: string): Promise<boolean> {
  await ensureDb();
  const result = getDb().prepare("DELETE FROM skills WHERE id = ?").run(id);
  if (result.changes > 0) {
    // Also delete filesystem directory
    deleteSkillDir(id);
    notifyEmbeddingCacheInvalidated();
  }
  return result.changes > 0;
}

export async function incrementUsageCount(id: string): Promise<void> {
  await ensureDb();
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE skills SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?")
    .run(now, id);
}

export async function mergeSkills(
  plan: SkillCompactPlan
): Promise<{ targetSkillId: string; deprecatedSkillIds: string[] } | null> {
  await ensureDb();
  const targetRow = getDb().prepare("SELECT * FROM skills WHERE id = ?").get(plan.targetSkillId) as SkillRow | undefined;
  if (!targetRow) return null;

  const now = new Date().toISOString();
  let mergedUsageCount = targetRow.usage_count;
  const deprecatedSkillIds: string[] = [];
  const targetFiles = readAllSkillFiles(plan.targetSkillId);
  const targetMetadata: SkillMetadata = {
    ...rowToMetadata(targetRow),
    name: plan.name,
    domain: plan.domain,
    tags: plan.tags,
    description: plan.description,
    usageCount: mergedUsageCount,
    version: targetRow.version + 1,
    updatedAt: now,
  };

  for (const sourceId of plan.sourceSkillIds) {
    if (sourceId === plan.targetSkillId) continue;
    const sourceRow = getDb()
      .prepare("SELECT usage_count FROM skills WHERE id = ?")
      .get(sourceId) as { usage_count: number } | undefined;
    if (sourceRow) mergedUsageCount += sourceRow.usage_count;
  }

  targetMetadata.usageCount = mergedUsageCount;

  // Write merged content to filesystem
  const frontmatter: SkillMdFrontmatter = {
    name: plan.name,
    description: plan.description,
    license: targetRow.license || undefined,
    metadata: {
      domain: plan.domain,
      tags: plan.tags,
      author: targetRow.author,
      source: (targetRow.source || "manual") as SkillMdFrontmatter["metadata"]["source"],
      version: targetRow.version + 1,
    },
  };
  writeSkillFiles(plan.targetSkillId, frontmatter, plan.content);

  const contentHash = computeContentHash(plan.content);
  const contentSummary = generateContentSummary(plan.content);
  const targetEmbeddingFingerprint = computeEmbeddingFingerprint(targetMetadata, plan.content, targetFiles);

  const db = getDb();
  const apply = db.transaction(() => {
    db.prepare(`
      UPDATE skills
      SET name = ?, domain = ?, tags_json = ?, description = ?,
          content_summary = ?, content_hash = ?,
          usage_count = ?, version = ?, embedding_fingerprint = ?, updated_at = ?
      WHERE id = ?
    `).run(
      plan.name, plan.domain, JSON.stringify(plan.tags), plan.description,
      contentSummary, contentHash,
      mergedUsageCount, targetRow.version + 1, targetEmbeddingFingerprint, now, plan.targetSkillId
    );

    for (const sourceId of plan.sourceSkillIds) {
      if (sourceId === plan.targetSkillId) continue;
      const source = db.prepare("SELECT * FROM skills WHERE id = ?").get(sourceId) as SkillRow | undefined;
      if (!source) continue;
      const sourceFiles = readAllSkillFiles(sourceId);
      const sourceEmbeddingFingerprint = computeEmbeddingFingerprint(
        { ...rowToMetadata(source), status: SKILL_STATUS.DEPRECATED, updatedAt: now },
        source.content_summary,
        sourceFiles
      );
      const result = db
        .prepare("UPDATE skills SET status = ?, embedding_fingerprint = ?, updated_at = ? WHERE id = ?")
        .run(SKILL_STATUS.DEPRECATED, sourceEmbeddingFingerprint, now, sourceId);
      if (result.changes > 0) deprecatedSkillIds.push(sourceId);
    }
  });
  apply();

  notifyEmbeddingCacheInvalidated();
  return { targetSkillId: plan.targetSkillId, deprecatedSkillIds };
}

export async function getActiveSkillsForMatching(scopePrefix?: string): Promise<
  Pick<SkillMetadata, "id" | "name" | "domain" | "tags" | "description">[]
> {
  await ensureDb();
  const rows = listSkillRows({ status: SKILL_STATUS.ACTIVE });
  return rows
    .map(rowToMetadata)
    .filter((meta) => !scopePrefix || meta.id.startsWith(scopePrefix))
    .map(({ id, name, domain, tags, description }) => ({ id, name, domain, tags, description }));
}

export async function getStats() {
  await ensureDb();
  const metadatas = listSkillRows().map(rowToMetadata);

  const total = metadatas.length;
  const active = metadatas.filter((m) => m.status === SKILL_STATUS.ACTIVE).length;
  const deprecated = metadatas.filter((m) => m.status === SKILL_STATUS.DEPRECATED).length;
  const totalUsage = metadatas.reduce((sum, m) => sum + m.usageCount, 0);

  const domainDistribution: Record<string, number> = {};
  for (const m of metadatas) {
    domainDistribution[m.domain] = (domainDistribution[m.domain] || 0) + 1;
  }

  const recentUpdated = metadatas
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return { total, active, deprecated, totalUsage, domainDistribution, recentUpdated };
}

export type SkillMetadataFilter = {
  status?: SkillMetadata["status"];
  domain?: SkillMetadata["domain"];
  scope?: string;
};

export async function getAllSkillMetadata(
  filters?: SkillMetadataFilter
): Promise<SkillMetadata[]> {
  await ensureDb();
  return listSkillRows({
    status: filters?.status,
    domain: filters?.domain,
    scope: filters?.scope,
  }).map(rowToMetadata);
}

export async function getSkillsByIds(ids: string[]): Promise<{
  found: SkillDetail[];
  missing: string[];
}> {
  await ensureDb();
  const found: SkillDetail[] = [];
  const missing: string[] = [];

  if (ids.length === 0) return { found, missing };

  const rows = listSkillRows({ ids });
  const foundIds = new Set(rows.map((row) => row.id));

  for (const row of rows) {
    found.push(await rowToDetail(row));
  }
  for (const id of ids) {
    if (!foundIds.has(id)) missing.push(id);
  }

  return { found, missing };
}

/** Import a skill from a ZIP-extracted parsed result */
export async function importSkillFromParsed(
  input: SkillCreateInput,
  options?: { force?: boolean }
): Promise<SkillDetail> {
  return createSkill(input, { force: options?.force });
}
