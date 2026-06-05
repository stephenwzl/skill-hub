import { scoreSkillKeywordMatch } from "@/lib/skills/agent-text";
import type { SkillDetail } from "@/lib/skills/types";
import { DEFAULT_SEARCH_TOP_K, EMBEDDING_SEARCH_WEIGHT, KEYWORD_SEARCH_WEIGHT } from "./constants";
import type { LoadedEmbeddingCache } from "./cache";
import { getSkillVector } from "./cache";
import { embedQuery } from "./model";
import { vecSearch } from "./vec-store";

export interface HybridSearchOptions {
  topK?: number;
  keywordWeight?: number;
  embeddingWeight?: number;
}

export interface HybridSearchResult {
  skill: SkillDetail;
  finalScore: number;
  keywordScore: number;
  embeddingScore: number;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
  }
  return dot;
}

export async function hybridSearchSkills(
  skills: SkillDetail[],
  query: string,
  cache: LoadedEmbeddingCache,
  options?: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const topK = options?.topK ?? DEFAULT_SEARCH_TOP_K;
  const keywordWeight = options?.keywordWeight ?? KEYWORD_SEARCH_WEIGHT;
  const embeddingWeight = options?.embeddingWeight ?? EMBEDDING_SEARCH_WEIGHT;

  if (skills.length === 0) return [];

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [...skills]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, topK)
      .map((skill) => ({ skill, finalScore: 1, keywordScore: 0, embeddingScore: 0 }));
  }

  const keywordScores = skills.map((skill) => scoreSkillKeywordMatch(skill, trimmedQuery));
  const maxKeywordScore = Math.max(...keywordScores, 1);
  const queryEmbedding = await embedQuery(trimmedQuery);

  // Try sqlite-vec search first
  let vecResults: Map<string, number> | null = null;
  try {
    const results = await vecSearch(queryEmbedding, topK * 2);
    vecResults = new Map(results.map((r) => [r.skillId, r.distance]));
  } catch {
    // Fall through to file-based search
  }

  const scored = skills.map((skill, index) => {
    const keywordScore = keywordScores[index]! / maxKeywordScore;
    let embeddingScore = 0;

    if (vecResults && vecResults.has(skill.id)) {
      // sqlite-vec returns cosine distance (1 - similarity for normalized vectors)
      const distance = vecResults.get(skill.id)!;
      embeddingScore = Math.max(0, 1 - distance);
    } else {
      // File-based fallback
      const skillVector = getSkillVector(cache, skill.id);
      embeddingScore = skillVector ? Math.max(0, cosineSimilarity(queryEmbedding, skillVector)) : 0;
    }

    const finalScore = keywordWeight * keywordScore + embeddingWeight * embeddingScore;

    return { skill, finalScore, keywordScore, embeddingScore };
  });

  return scored
    .filter((item) => item.finalScore > 0)
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return new Date(b.skill.updatedAt).getTime() - new Date(a.skill.updatedAt).getTime();
    })
    .slice(0, topK);
}
