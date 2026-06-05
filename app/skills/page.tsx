"use client";

import { useState, useEffect, useCallback } from "react";
import { SkillTable } from "@/components/skills/skill-table";
import { SkillFilters } from "@/components/skills/skill-filters";
import type { SkillListItem, Domain } from "@/lib/skills/types";
import type { EmbeddingCacheBuildProgress } from "@/lib/embeddings/progress";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatIndexProgress(progress: EmbeddingCacheBuildProgress | null): string {
  if (!progress) return "正在构建搜索索引…";
  if (progress.phase === "loading_model") {
    return progress.message;
  }
  if (progress.total > 0) {
    return `${progress.message}（${progress.current}/${progress.total}）`;
  }
  return progress.message;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [domain, setDomain] = useState<Domain | undefined>();
  const [search, setSearch] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [indexProgress, setIndexProgress] = useState<EmbeddingCacheBuildProgress | null>(
    null
  );

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setIndexProgress(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (domain) params.set("domain", domain);

      if (!search?.trim()) {
        const res = await fetch(`/api/skills?${params}`);
        const data = await res.json();
        setSkills(data.skills);
        setTotal(data.total);
        return;
      }

      params.set("format", "json");
      params.set("q", search.trim());

      while (true) {
        const res = await fetch(`/api/skills/agent/search?${params}`);
        const data = await res.json();

        if (res.status === 503) {
          setIndexProgress(data.cache ?? null);
          await sleep(2000);
          continue;
        }

        if (!res.ok) {
          throw new Error(data.error || "搜索失败");
        }

        setSkills(data.skills);
        setTotal(data.total);
        setIndexProgress(null);
        return;
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, domain, search]);

  useEffect(() => {
    void (async () => {
      await fetchSkills();
    })();
  }, [fetchSkills]);

  const handleFilterChange = (filters: {
    domain?: Domain;
    search?: string;
  }) => {
    if (filters.domain !== undefined) setDomain(filters.domain);
    if (filters.search !== undefined) setSearch(filters.search);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const loadingLabel = indexProgress
    ? formatIndexProgress(indexProgress)
    : "加载中…";

  return (
    <div className="space-y-4">
      <SkillFilters
        domain={domain}
        search={search}
        onFilterChange={handleFilterChange}
      />
      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
          <p>{loadingLabel}</p>
          {indexProgress && indexProgress.total > 0 ? (
            <div className="w-64 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.round((indexProgress.current / indexProgress.total) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <SkillTable skills={skills} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {total} 个技能
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
