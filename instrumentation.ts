export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Sync filesystem skills with database on startup
    const { syncSkillsFromFilesystem } = await import("@/lib/skills/sync");
    syncSkillsFromFilesystem().catch((error) => {
      console.error("[sync] filesystem sync failed on startup:", error);
    });

    const { scheduleEmbeddingCacheRebuild } = await import("@/lib/embeddings/cache");
    console.log("[embeddings] scheduling background index rebuild on startup");
    scheduleEmbeddingCacheRebuild();
  }
}
