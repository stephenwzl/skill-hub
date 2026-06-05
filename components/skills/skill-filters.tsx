"use client";

import { useRef } from "react";
import { DOMAINS, DOMAIN_LABELS } from "@/lib/skills/constants";
import type { Domain } from "@/lib/skills/types";

interface SkillFiltersProps {
  domain?: Domain;
  search?: string;
  onFilterChange: (filters: {
    domain?: Domain;
    search?: string;
  }) => void;
}

export function SkillFilters({ domain, search, onFilterChange }: SkillFiltersProps) {
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      onFilterChange({ search: value.trim() || undefined });
    }, 300);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="搜索技能，多个关键词用逗号分隔..."
        defaultValue={search ?? ""}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1 min-w-[200px]"
      />
      <select
        value={domain ?? ""}
        onChange={(e) =>
          onFilterChange({ domain: (e.target.value as Domain) || undefined })
        }
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">全部领域</option>
        {DOMAINS.map((d) => (
          <option key={d} value={d}>
            {DOMAIN_LABELS[d]}
          </option>
        ))}
      </select>
    </div>
  );
}
