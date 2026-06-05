"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth/types";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadApiKey = async () => {
    setApiKeyLoading(true);
    setApiKeyError(null);
    const res = await fetch("/api/auth/api-key");
    const data = await res.json();
    setApiKeyLoading(false);

    if (!res.ok) {
      setApiKeyError(data.error ?? "获取 API Key 失败");
      return;
    }

    setApiKey(data.apiKey ?? null);
  };

  const resetApiKey = async () => {
    if (!confirm("重设后旧 API Key 会立即失效，确认继续？")) return;
    setApiKeyLoading(true);
    setApiKeyError(null);
    const res = await fetch("/api/auth/api-key", { method: "POST" });
    const data = await res.json();
    setApiKeyLoading(false);

    if (!res.ok) {
      setApiKeyError(data.error ?? "重设 API Key 失败");
      return;
    }

    setUser(data.user);
    setApiKey(data.apiKey);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null);
        if (data.user) void loadApiKey();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>;
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>个人面板</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">请先登录后查看个人信息和 API Key。</p>
          <Link href="/login" className={buttonVariants()}>
            去登录
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">创建时间</div>
              <div className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">更新时间</div>
              <div className="mt-1 text-sm">{new Date(user.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            当前账号只保留一个 API Key。重设后旧 key 会立即失效。
          </p>
          <div className="break-all rounded-md border bg-muted p-3 font-mono text-sm">
            {apiKey ?? `skh_${user.apiKeyPrefix}_...`}
          </div>
          <p className="text-sm text-muted-foreground">
            将 <code className="font-mono">SKILL_HUB_API_KEY</code> 导出到环境变量，沉淀技能可自动通过
            agent 运行
          </p>
          {!apiKey && (
            <p className="text-sm text-amber-700">
              这个账号可能是在旧版本创建的，完整 API Key 未保存；请重设后再使用。
            </p>
          )}
          {apiKeyError && <p className="text-sm text-red-600">{apiKeyError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadApiKey} disabled={apiKeyLoading}>
              {apiKeyLoading ? "处理中..." : "刷新查看"}
            </Button>
            <Button variant="destructive" onClick={resetApiKey} disabled={apiKeyLoading}>
              重设 API Key
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
