"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOMAINS, DOMAIN_LABELS } from "@/lib/skills/constants";
import type { AuthUser, DomainOwner } from "@/lib/auth/types";
import type { Domain } from "@/lib/skills/types";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [owners, setOwners] = useState<DomainOwner[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerByDomain = useMemo(
    () => new Map(owners.map((owner) => [owner.domain, owner])),
    [owners]
  );

  const load = async () => {
    setError(null);
    const [usersRes, ownersRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/domain-owners"),
    ]);

    if (!usersRes.ok || !ownersRes.ok) {
      setError("需要管理员权限");
      return;
    }

    setUsers((await usersRes.json()).users);
    setOwners((await ownersRes.json()).owners);
  };

  useEffect(() => {
    void (async () => {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setCurrentUser(meData.user ?? null);
      setAuthLoading(false);
      if (meData.user?.role !== "admin") return;
      await load();
    })();
  }, []);

  const createSystemUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "创建用户失败");
      return;
    }

    setMessage(`用户已创建，API Key：${data.apiKey}。用户后续可在个人面板重复查看或重设。`);
    setEmail("");
    setName("");
    setPassword("");
    setRole("user");
    await load();
  };

  const updateOwner = async (domain: Domain, userId: string) => {
    setError(null);
    const res = await fetch("/api/admin/domain-owners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, userId: userId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "设置 owner 失败");
      return;
    }
    await load();
  };

  if (authLoading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>;
  }

  if (currentUser?.role !== "admin") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>无权限访问</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          系统管理仅管理员可见。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>创建系统用户</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={createSystemUser}>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="邮箱"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="用户名"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="初始密码，至少 8 位"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as "admin" | "user")}
            >
              <option value="user">普通系统用户</option>
              <option value="admin">管理员</option>
            </select>
            <Button type="submit">创建用户</Button>
          </form>
          {message && <p className="mt-3 break-all text-sm text-green-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系统用户</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="text-xs text-muted-foreground">API Key: skh_{user.apiKeyPrefix}_...</div>
              </div>
              <Badge variant="secondary">{user.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Domain Owner</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {DOMAINS.map((domain) => {
            const owner = ownerByDomain.get(domain);
            return (
              <div key={domain} className="flex items-center gap-3 rounded-md border p-3">
                <div className="w-28 font-medium">{DOMAIN_LABELS[domain]}</div>
                <select
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  value={owner?.userId ?? ""}
                  onChange={(event) => updateOwner(domain, event.target.value)}
                >
                  <option value="">未指定</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
