import { NextResponse } from "next/server";
import {
  getEmbeddingCacheBuildProgress,
  tryLoadCleanEmbeddingCache,
} from "@/lib/embeddings/cache";

export async function GET() {
  try {
    const progress = getEmbeddingCacheBuildProgress();
    const cache = await tryLoadCleanEmbeddingCache();

    return NextResponse.json({
      ready: cache != null,
      progress,
      cache: cache
        ? {
            skillCount: cache.manifest.skillCount,
            dims: cache.manifest.dims,
            builtAt: cache.manifest.builtAt,
            model: cache.manifest.model,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to read embedding cache status:", error);
    return NextResponse.json({ error: "Failed to read embedding cache status" }, { status: 500 });
  }
}
