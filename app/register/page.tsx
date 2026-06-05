"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth/types";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setApiKey(null);
    setUser(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "注册失败");
      return;
    }

    setUser(data.user);
    setApiKey(data.apiKey);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>注册系统用户</CardTitle>
        </CardHeader>
        <CardContent>
          {!apiKey ? (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="你的名字"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  type="password"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "注册中..." : "注册并登录"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                已有账号？{" "}
                <Link className="text-primary hover:underline" href="/login">
                  去登录
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">注册成功</span>
                {user && <Badge variant="secondary">{user.role}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                API Key 可在个人面板重复查看，也可以重设；当前账号始终只有一个有效 key。
              </p>
              <div className="break-all rounded-md border bg-muted p-3 font-mono text-sm">
                {apiKey}
              </div>
              <Button className="w-full" onClick={() => router.push("/profile")}>
                前往个人面板
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
