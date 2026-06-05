"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/types";

export function UserStatus() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/register" className={buttonVariants({ size: "sm", variant: "ghost" })}>
          注册
        </Link>
        <Link href="/login" className={buttonVariants({ size: "sm", variant: "outline" })}>
          登录
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/profile" className="text-right hover:text-primary">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.role}</div>
      </Link>
      <Button size="sm" variant="outline" onClick={logout}>
        退出
      </Button>
    </div>
  );
}
