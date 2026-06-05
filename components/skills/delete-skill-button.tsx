"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/types";
import type { Domain, SkillMetadata } from "@/lib/skills/types";
import { parseSkillId, normalizeUserScope } from "@/lib/skills/scope";

interface DeleteSkillButtonProps {
  skill: SkillMetadata;
  backHref: string;
}

export function DeleteSkillButton({ skill, backHref }: DeleteSkillButtonProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ownedDomains, setOwnedDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null);
        setOwnedDomains(data.ownedDomains ?? []);
      })
      .catch(() => {
        setUser(null);
        setOwnedDomains([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const canDelete = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin") return true;

    const scope = parseSkillId(skill.id);
    if (!scope) return false;
    if (scope.kind === "domain") {
      return !!scope.domain && ownedDomains.includes(scope.domain);
    }

    return scope.scope === normalizeUserScope(user);
  }, [ownedDomains, skill.id, user]);

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除技能「${skill.name}」吗？此操作不可撤销。`)) return;

    setDeleting(true);
    setError(null);
    try {
      const path = skill.id.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/skills/${path}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "删除技能失败");
      }
      router.push(backHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除技能失败");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !canDelete) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" />
        {deleting ? "删除中..." : "删除技能"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
