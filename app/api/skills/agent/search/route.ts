import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SEARCH_TOP_K } from "@/lib/embeddings/constants";
import {
  getEmbeddingCacheBuildProgress,
  scheduleEmbeddingCacheRebuild,
  tryLoadCleanEmbeddingCache,
  waitForEmbeddingCacheReady,
} from "@/lib/embeddings/cache";
import { hybridSearchSkills } from "@/lib/embeddings/search";
import { getSkillsWithContent } from "@/lib/skills/storage";
import { formatMetadataCatalog } from "@/lib/skills/agent-text";
import type { Domain, SkillDetail, SkillMetadata, SkillStatus } from "@/lib/skills/types";

function toMetadata(skill: SkillDetail): SkillMetadata {
  return {
    id: skill.id,
    name: skill.name,
    domain: skill.domain,
    tags: skill.tags,
    description: skill.description,
    status: skill.status,
    version: skill.version,
    usageCount: skill.usageCount,
    author: skill.author,
    source: skill.source,
    language: skill.language,
    framework: skill.framework,
    difficulty: skill.difficulty,
    license: skill.license,
    prerequisites: skill.prerequisites,
    relatedSkillIds: skill.relatedSkillIds,
    importUrl: skill.importUrl,
    importedAt: skill.importedAt,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

function browseSkills(skills: SkillDetail[], topK: number): SkillMetadata[] {
  return [...skills]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, topK)
    .map(toMetadata);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const keyword =
      searchParams.get("q") ||
      searchParams.get("keyword") ||
      searchParams.get("search") ||
      "";
    const format = searchParams.get("format") || "text";
    const waitForCache = searchParams.get("wait") === "1";

    if (!keyword.trim() && format !== "json") {
      return NextResponse.json(
        { error: "Missing search keyword. Use q, keyword, or search parameter." },
        { status: 400 }
      );
    }

    const status = (searchParams.get("status") as SkillStatus) || undefined;
    const domain = (searchParams.get("domain") as Domain) || undefined;
    const scope = searchParams.get("scope") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_SEARCH_TOP_K;
    const topK = Number(searchParams.get("topK")) || DEFAULT_SEARCH_TOP_K;

    const all = await getSkillsWithContent({ status, domain });
    const filtered = all.filter((skill) => !scope || skill.id.startsWith(`@${scope}/`));

    if (!keyword.trim()) {
      const metadatas = browseSkills(filtered, topK);
      if (format === "json") {
        const start = (page - 1) * pageSize;
        return NextResponse.json({
          skills: metadatas.slice(start, start + pageSize),
          total: metadatas.length,
          page,
          pageSize,
          searchMode: "browse",
        });
      }

      const text = formatMetadataCatalog(metadatas, {
        title: "# Skill Hub Search Results",
        subtitle: `Browse (no keyword)\nMatches: ${metadatas.length}`,
      });
      return new NextResponse(text, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let cache = await tryLoadCleanEmbeddingCache();
    if (!cache) {
      scheduleEmbeddingCacheRebuild();

      if (!waitForCache) {
        const progress = getEmbeddingCacheBuildProgress();
        return NextResponse.json(
          {
            error: "Embedding index is not ready yet. Please try again later.",
            cache: progress,
            hint: "Poll this endpoint or use GET /api/skills/agent/embeddings/status. Agents can add wait=1 to block until ready.",
          },
          {
            status: 503,
            headers: { "Retry-After": "3" },
          }
        );
      }

      cache = await waitForEmbeddingCacheReady();
    }

    const ranked = await hybridSearchSkills(filtered, keyword, cache, { topK });
    const metadatas = ranked.map(({ skill }) => toMetadata(skill));

    if (format === "json") {
      const start = (page - 1) * pageSize;
      return NextResponse.json({
        skills: metadatas.slice(start, start + pageSize),
        total: metadatas.length,
        page,
        pageSize,
        searchMode: "hybrid",
      });
    }

    const text = formatMetadataCatalog(metadatas, {
      title: "# Skill Hub Search Results",
      subtitle: `Keyword: ${keyword.trim()}\nMatches: ${metadatas.length}`,
    });

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to search skills for agent:", error);
    return NextResponse.json({ error: "Failed to search skills" }, { status: 500 });
  }
}
