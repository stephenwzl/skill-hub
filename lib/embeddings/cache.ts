import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getSkillsWithContent } from "@/lib/skills/storage";
import {
  EMBEDDING_CACHE_DIR,
  EMBEDDING_CACHE_VERSION,
  EMBEDDING_MANIFEST_FILE,
  EMBEDDING_MODEL_ID,
  EMBEDDING_VECTORS_FILE,
} from "./constants";
import { embedPassage } from "./model";
import {
  getEmbeddingCacheBuildProgress,
  logEmbeddingBuildProgress,
  markEmbeddingBuildDirty,
  patchEmbeddingBuildProgress,
} from "./progress";
import { buildSkillEmbeddingText, computeSkillEmbeddingFingerprint } from "./text";
import { rebuildVecIndex, isVecIndexReady } from "./vec-store";

export type { EmbeddingCacheBuildProgress, EmbeddingBuildPhase } from "./progress";
export { getEmbeddingCacheBuildProgress } from "./progress";

export type EmbeddingCacheStatus = "ready" | "building" | "dirty";

export interface EmbeddingCacheSkillEntry {
  version: number;
  fingerprint?: string;
  offset: number;
  dims: number;
}

export interface EmbeddingCacheManifest {
  version: typeof EMBEDDING_CACHE_VERSION;
  model: typeof EMBEDDING_MODEL_ID;
  status: EmbeddingCacheStatus;
  fingerprint: string;
  builtAt: string;
  dims: number;
  skillCount: number;
  skills: Record<string, EmbeddingCacheSkillEntry>;
}

export interface LoadedEmbeddingCache {
  manifest: EmbeddingCacheManifest;
  vectors: Float32Array;
  /** Whether sqlite-vec is being used instead of file-based vectors */
  useVec: boolean;
}

function getCacheDir(): string {
  return path.join(process.cwd(), "data", EMBEDDING_CACHE_DIR);
}

function getManifestPath(): string {
  return path.join(getCacheDir(), EMBEDDING_MANIFEST_FILE);
}

function getVectorsPath(): string {
  return path.join(getCacheDir(), EMBEDDING_VECTORS_FILE);
}

export function computeSkillsFingerprint(
  skills: Array<{ id: string; embeddingFingerprint: string }>
): string {
  const canonical = [...skills]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((skill) => `${skill.id}\t${skill.embeddingFingerprint}`)
    .join("\n");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function readManifestFile(): EmbeddingCacheManifest | null {
  const manifestPath = getManifestPath();
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as EmbeddingCacheManifest;
  } catch (error) {
    console.error("[embeddings] failed to read manifest:", error);
    return null;
  }
}

function writeManifestFile(manifest: EmbeddingCacheManifest): void {
  const cacheDir = getCacheDir();
  fs.mkdirSync(cacheDir, { recursive: true });
  const manifestPath = getManifestPath();
  const tempPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2));
  fs.renameSync(tempPath, manifestPath);
}

function writeVectorsFile(vectors: Float32Array): void {
  const cacheDir = getCacheDir();
  fs.mkdirSync(cacheDir, { recursive: true });
  const vectorsPath = getVectorsPath();
  const tempPath = `${vectorsPath}.tmp`;
  fs.writeFileSync(tempPath, Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength));
  fs.renameSync(tempPath, vectorsPath);
}

export function loadEmbeddingCache(): LoadedEmbeddingCache | null {
  const manifest = readManifestFile();
  if (!manifest || manifest.status !== "ready") return null;
  return loadEmbeddingCacheWithManifest(manifest);
}

function loadEmbeddingCacheWithManifest(manifest: EmbeddingCacheManifest): LoadedEmbeddingCache | null {
  if (manifest.model !== EMBEDDING_MODEL_ID || manifest.version !== EMBEDDING_CACHE_VERSION) {
    return null;
  }

  const vectorsPath = getVectorsPath();
  if (!fs.existsSync(vectorsPath)) return null;

  const buffer = fs.readFileSync(vectorsPath);
  const vectors = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);

  if (vectors.length !== manifest.skillCount * manifest.dims) {
    console.warn("[embeddings] vector file size mismatch");
    return null;
  }

  return { manifest, vectors, useVec: false };
}

export function isEmbeddingCacheClean(
  manifest: EmbeddingCacheManifest | null,
  fingerprint: string
): boolean {
  return (
    manifest?.status === "ready" &&
    manifest.model === EMBEDDING_MODEL_ID &&
    manifest.version === EMBEDDING_CACHE_VERSION &&
    manifest.fingerprint === fingerprint &&
    manifest.skillCount === Object.keys(manifest.skills).length
  );
}

async function listSkillFingerprints(): Promise<Array<{ id: string; embeddingFingerprint: string }>> {
  const skills = await getSkillsWithContent();
  return skills.map((skill) => ({
    id: skill.id,
    embeddingFingerprint: computeSkillEmbeddingFingerprint(skill),
  }));
}

let buildPromise: Promise<void> | null = null;

function reportEmbeddingProgress(
  patch: Parameters<typeof patchEmbeddingBuildProgress>[0],
  extra?: Record<string, unknown>
): void {
  const progress = patchEmbeddingBuildProgress(patch);
  logEmbeddingBuildProgress(progress, extra);
}

async function rebuildEmbeddingCache(): Promise<void> {
  const startedAt = Date.now();
  const buildStartedAt = new Date().toISOString();

  reportEmbeddingProgress({
    phase: "loading_model",
    current: 0,
    total: 0,
    currentSkillId: null,
    startedAt: buildStartedAt,
    message: "Loading embedding model (first run may download weights)...",
    error: null,
  });

  // Try sqlite-vec first
  try {
    const result = await rebuildVecIndex((current, total, skillId) => {
      reportEmbeddingProgress({
        phase: current > 0 ? "embedding" : "loading_model",
        current,
        total,
        currentSkillId: skillId,
        message: `Indexing ${current}/${total}: ${skillId}`,
      });
    });

    reportEmbeddingProgress({
      phase: "ready",
      current: result.rebuilt + result.reused,
      total: result.rebuilt + result.reused,
      currentSkillId: null,
      message: `Index ready via sqlite-vec (${result.rebuilt} rebuilt, ${result.reused} reused)`,
    });

    console.log("[embeddings] cache rebuild finished via sqlite-vec", {
      rebuilt: result.rebuilt,
      reused: result.reused,
      elapsedMs: Date.now() - startedAt,
    });

    // Also update legacy manifest for compatibility
    const skills = await getSkillsWithContent();
    const fingerprints = skills.map((s) => ({ id: s.id, embeddingFingerprint: computeSkillEmbeddingFingerprint(s) }));
    const fingerprint = computeSkillsFingerprint(fingerprints);
    // Build skill entries for manifest (required for isEmbeddingCacheClean check)
    const skillEntries: Record<string, EmbeddingCacheSkillEntry> = {};
    for (const fp of fingerprints) {
      skillEntries[fp.id] = { version: 1, fingerprint: fp.embeddingFingerprint, offset: 0, dims: 0 };
    }
    writeManifestFile({
      version: EMBEDDING_CACHE_VERSION,
      model: EMBEDDING_MODEL_ID,
      status: "ready",
      fingerprint,
      builtAt: new Date().toISOString(),
      dims: 0,
      skillCount: skills.length,
      skills: skillEntries,
    });
    return;
  } catch (error) {
    console.warn("[embeddings] sqlite-vec rebuild failed, falling back to file cache:", error);
  }

  // Fallback: file-based cache (original implementation)
  const skills = await getSkillsWithContent();
  const skillFingerprints = new Map(skills.map((skill) => [skill.id, computeSkillEmbeddingFingerprint(skill)]));
  const fingerprint = computeSkillsFingerprint(
    skills.map((skill) => ({ id: skill.id, embeddingFingerprint: skillFingerprints.get(skill.id)! }))
  );
  const total = skills.length;
  const existingCache = loadEmbeddingCacheWithManifest(readManifestFile() ?? {
    version: EMBEDDING_CACHE_VERSION, model: EMBEDDING_MODEL_ID, status: "dirty",
    fingerprint: "", builtAt: "", dims: 0, skillCount: 0, skills: {},
  });

  reportEmbeddingProgress({ total, message: `Updating index, ${total} skills total` });

  const buildingManifest: EmbeddingCacheManifest = {
    version: EMBEDDING_CACHE_VERSION, model: EMBEDDING_MODEL_ID, status: "building",
    fingerprint, builtAt: new Date().toISOString(), dims: 0, skillCount: skills.length, skills: {},
  };
  writeManifestFile(buildingManifest);

  if (skills.length === 0) {
    writeManifestFile({ ...buildingManifest, status: "ready", builtAt: new Date().toISOString(), dims: 0, skillCount: 0, skills: {} });
    writeVectorsFile(new Float32Array(0));
    reportEmbeddingProgress({ phase: "ready", current: 0, total: 0, currentSkillId: null, message: "Index ready (empty)" });
    return;
  }

  const sortedSkills = [...skills].sort((a, b) => a.id.localeCompare(b.id));
  const vectorsList: Float32Array[] = [];
  let dims = 0;
  let reusedCount = 0;
  let rebuiltCount = 0;

  for (let index = 0; index < sortedSkills.length; index++) {
    const skill = sortedSkills[index]!;
    const current = index + 1;
    const embeddingFingerprint = skillFingerprints.get(skill.id)!;
    const existingEntry = existingCache?.manifest.skills[skill.id];
    const reusableVector = existingCache && existingEntry && existingEntry.fingerprint === embeddingFingerprint && existingEntry.dims > 0
      ? getSkillVector(existingCache, skill.id)
      : null;

    reportEmbeddingProgress({
      phase: reusableVector ? "writing" : "embedding",
      current, total, currentSkillId: skill.id,
      message: reusableVector ? `Reusing vector ${current}/${total}: ${skill.id}` : `Indexing ${current}/${total}: ${skill.id}`,
    });

    if (reusableVector) {
      if (dims === 0) dims = reusableVector.length;
      vectorsList.push(new Float32Array(reusableVector));
      reusedCount++;
      continue;
    }

    const embedding = await embedPassage(buildSkillEmbeddingText(skill));
    if (dims === 0) dims = embedding.length;
    vectorsList.push(embedding);
    rebuiltCount++;
  }

  reportEmbeddingProgress({ phase: "writing", current: total, total, currentSkillId: null, message: "Writing index files..." });

  const vectors = new Float32Array(sortedSkills.length * dims);
  const skillEntries: Record<string, EmbeddingCacheSkillEntry> = {};

  for (let index = 0; index < sortedSkills.length; index++) {
    const skill = sortedSkills[index]!;
    const offset = index * dims;
    vectors.set(vectorsList[index]!, offset);
    skillEntries[skill.id] = { version: skill.version, fingerprint: skillFingerprints.get(skill.id)!, offset, dims };
  }

  writeVectorsFile(vectors);
  writeManifestFile({
    version: EMBEDDING_CACHE_VERSION, model: EMBEDDING_MODEL_ID, status: "ready",
    fingerprint, builtAt: new Date().toISOString(), dims, skillCount: sortedSkills.length, skills: skillEntries,
  });

  reportEmbeddingProgress({ phase: "ready", current: total, total, currentSkillId: null, message: `Index ready (${total} skills)` });
  console.log("[embeddings] cache rebuild finished", { skillCount: sortedSkills.length, reusedCount, rebuiltCount, dims, elapsedMs: Date.now() - startedAt });
}

async function ensureEmbeddingCacheBuilt(attempt = 0): Promise<void> {
  const fingerprints = await listSkillFingerprints();
  const fingerprint = computeSkillsFingerprint(fingerprints);
  const manifest = readManifestFile();

  // Also check sqlite-vec readiness
  const vecReady = await isVecIndexReady();
  if (isEmbeddingCacheClean(manifest, fingerprint) && (vecReady || manifest!.skillCount === 0)) {
    const progress = getEmbeddingCacheBuildProgress();
    if (progress.phase !== "ready") {
      reportEmbeddingProgress({ phase: "ready", current: fingerprints.length, total: fingerprints.length, currentSkillId: null, message: "Index ready" });
    }
    return;
  }

  if (attempt > 2) throw new Error("embedding cache rebuild exceeded retry limit");

  if (!buildPromise) {
    buildPromise = rebuildEmbeddingCache()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        reportEmbeddingProgress({ phase: "failed", message: `Index build failed: ${message}`, error: message });
        console.error("[embeddings] cache rebuild failed:", error);
        writeManifestFile({
          version: EMBEDDING_CACHE_VERSION, model: EMBEDDING_MODEL_ID, status: "dirty",
          fingerprint: "", builtAt: new Date().toISOString(), dims: manifest?.dims ?? 0,
          skillCount: fingerprints.length, skills: manifest?.skills ?? {},
        });
        throw error;
      })
      .finally(() => { buildPromise = null; });
  }

  await buildPromise;
  await ensureEmbeddingCacheBuilt(attempt + 1);
}

export function scheduleEmbeddingCacheRebuild(): void {
  const progress = getEmbeddingCacheBuildProgress();
  if (buildPromise || progress.phase === "loading_model" || progress.phase === "embedding") return;

  void ensureEmbeddingCacheBuilt().catch((error) => {
    console.error("[embeddings] scheduled rebuild failed:", error);
  });
}

export async function tryLoadCleanEmbeddingCache(): Promise<LoadedEmbeddingCache | null> {
  const fingerprints = await listSkillFingerprints();
  const fingerprint = computeSkillsFingerprint(fingerprints);
  const cache = loadEmbeddingCache();
  if (!cache || !isEmbeddingCacheClean(cache.manifest, fingerprint)) return null;
  return cache;
}

export async function waitForEmbeddingCacheReady(): Promise<LoadedEmbeddingCache> {
  console.log("[embeddings] waiting for cache build to finish...");
  await ensureEmbeddingCacheBuilt();
  const cache = await tryLoadCleanEmbeddingCache();
  if (!cache) throw new Error("embedding cache is not ready after rebuild");
  return cache;
}

export function invalidateEmbeddingCache(): void {
  const manifest = readManifestFile();
  const nextManifest: EmbeddingCacheManifest = manifest
    ? { ...manifest, status: "dirty", builtAt: new Date().toISOString() }
    : { version: EMBEDDING_CACHE_VERSION, model: EMBEDDING_MODEL_ID, status: "dirty", fingerprint: "", builtAt: new Date().toISOString(), dims: 0, skillCount: 0, skills: {} };
  writeManifestFile(nextManifest);
  markEmbeddingBuildDirty();
  scheduleEmbeddingCacheRebuild();
}

export function getSkillVector(cache: LoadedEmbeddingCache, skillId: string): Float32Array | null {
  const entry = cache.manifest.skills[skillId];
  if (!entry) return null;
  return cache.vectors.subarray(entry.offset, entry.offset + entry.dims);
}
