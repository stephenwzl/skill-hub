"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOMAINS, DOMAIN_LABELS } from "@/lib/skills/constants";
import type { AuthUser } from "@/lib/auth/types";
import type { Domain, SkillCompactResult } from "@/lib/skills/types";

export default function CompactPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [ownedDomains, setOwnedDomains] = useState<Domain[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [domain, setDomain] = useState<Domain>("general");
  const [skillIdsText, setSkillIdsText] = useState("");
  const [result, setResult] = useState<SkillCompactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skillIds = skillIdsText
    .split(/\s|,/)
    .map((id) => id.trim())
    .filter(Boolean);

  const allowedDomains = useMemo(() => {
    if (currentUser?.role === "admin") return DOMAINS;
    return DOMAINS.filter((item) => ownedDomains.includes(item));
  }, [currentUser?.role, ownedDomains]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setCurrentUser(data.user ?? null);
        setOwnedDomains(data.ownedDomains ?? []);
      })
      .catch(() => {
        setCurrentUser(null);
        setOwnedDomains([]);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const selectedDomain = allowedDomains.includes(domain) ? domain : allowedDomains[0];

  const runCompact = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/skills/compact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: selectedDomain,
        dryRun,
        skillIds: skillIds.length > 0 ? skillIds : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Compact 失败");
      return;
    }

    setResult(data);
  };

  if (authLoading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>;
  }

  if (!currentUser || allowedDomains.length === 0) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>无权限访问</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Skill Compact 仅管理员或对应 Domain Owner 可见。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skill Compact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedDomain}
                onChange={(event) => setDomain(event.target.value as Domain)}
              >
                {allowedDomains.map((item) => (
                  <option key={item} value={item}>
                    {DOMAIN_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">指定 Skill IDs（可选，逗号或空格分隔）</label>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={skillIdsText}
                onChange={(event) => setSkillIdsText(event.target.value)}
                placeholder="留空则扫描该 domain 下全部 active skills"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runCompact(true)} disabled={loading}>
              {loading ? "处理中..." : "Dry Run 预览"}
            </Button>
            <Button
              variant="outline"
              onClick={() => runCompact(false)}
              disabled={loading || !result || result.plans.length === 0}
            >
              确认执行
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{result.dryRun ? "Dry Run" : "已执行"}</Badge>
            <span className="text-sm text-muted-foreground">共 {result.plans.length} 个合并计划</span>
          </div>
          {result.plans.length === 0 && (
            <div className="rounded-md border p-6 text-center text-muted-foreground">
              未发现需要 compact 的技能。
            </div>
          )}
          {result.plans.map((plan) => (
            <Card key={`${plan.targetSkillId}-${plan.sourceSkillIds.join("-")}`}>
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="text-sm">
                  <span className="font-medium">保留：</span>
                  {plan.targetSkillId}
                </div>
                <div className="text-sm">
                  <span className="font-medium">废弃：</span>
                  {plan.sourceSkillIds.join(", ")}
                </div>
                <p className="text-sm">
                  <span className="font-medium">原因：</span>
                  {plan.reason}
                </p>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                  {plan.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
