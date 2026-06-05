"use client";

import { usePathname } from "next/navigation";
import { UserStatus } from "@/components/auth/user-status";

const pageTitles: Record<string, string> = {
  "/dashboard": "工作台",
  "/skills": "技能库",
  "/compact": "技能 Compact",
  "/admin": "系统管理",
  "/install": "安装 skill hub",
  "/login": "登录",
  "/register": "注册",
  "/profile": "个人面板",
};

export function Header() {
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/skills/")
      ? "技能详情"
      : pathname.startsWith("/scopes/")
        ? "用户 Skills"
        : "Skill Hub");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <UserStatus />
    </header>
  );
}
