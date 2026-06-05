export type EmbeddingBuildPhase =
  | "idle"
  | "loading_model"
  | "embedding"
  | "writing"
  | "ready"
  | "failed"
  | "dirty";

export interface EmbeddingCacheBuildProgress {
  phase: EmbeddingBuildPhase;
  current: number;
  total: number;
  currentSkillId: string | null;
  startedAt: string | null;
  message: string;
  error: string | null;
}

const idleProgress = (): EmbeddingCacheBuildProgress => ({
  phase: "idle",
  current: 0,
  total: 0,
  currentSkillId: null,
  startedAt: null,
  message: "Index idle",
  error: null,
});

let buildProgress: EmbeddingCacheBuildProgress = idleProgress();

export function getEmbeddingCacheBuildProgress(): EmbeddingCacheBuildProgress {
  return { ...buildProgress };
}

export function patchEmbeddingBuildProgress(
  patch: Partial<EmbeddingCacheBuildProgress>
): EmbeddingCacheBuildProgress {
  buildProgress = { ...buildProgress, ...patch };
  return buildProgress;
}

export function resetEmbeddingBuildProgress(): void {
  buildProgress = idleProgress();
}

export function markEmbeddingBuildDirty(message = "Index dirty, rebuild pending"): void {
  buildProgress = { ...idleProgress(), phase: "dirty", message };
}

export function logEmbeddingBuildProgress(
  progress: EmbeddingCacheBuildProgress,
  extra?: Record<string, unknown>
): void {
  const elapsedMs =
    progress.startedAt != null ? Date.now() - Date.parse(progress.startedAt) : 0;

  console.log("[embeddings]", progress.message, {
    phase: progress.phase,
    current: progress.current,
    total: progress.total,
    currentSkillId: progress.currentSkillId,
    elapsedMs,
    ...extra,
  });
}
