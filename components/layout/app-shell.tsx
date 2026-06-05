"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <div className="w-full min-w-0 flex-1">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 ml-60">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </>
  );
}
