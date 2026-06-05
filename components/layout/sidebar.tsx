"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Sparkles,
  Download,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth/types";

const navItems = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/skills", label: "搜索", icon: Search },
  { href: "/admin", label: "系统管理", icon: ShieldCheck, adminOnly: true },
  { href: "/install", label: "安装 skill hub", icon: Download },
  { href: "/profile", label: "个人面板", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user ?? null);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-card">
      <Link
        href="/"
        className="flex h-14 items-center gap-2 border-b px-4 transition-colors hover:bg-accent/50"
      >
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Skill Hub</span>
      </Link>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.filter((item) => {
          if (item.adminOnly) return user?.role === "admin";
          return true;
        }).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
