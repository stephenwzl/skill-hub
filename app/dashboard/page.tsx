import Link from "next/link";
import { User, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSkillScopeSummaries } from "@/lib/skills/storage";
import type { SkillScopeSummary } from "@/lib/skills/types";

function ScopeCard({ summary }: { summary: SkillScopeSummary }) {
  return (
    <Link href={`/scopes/${encodeURIComponent(summary.scope)}`}>
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">{summary.scope}</CardTitle>
                <CardDescription>@{summary.scope}</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">User</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{summary.skillCount} skills</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{summary.totalUsage} usage</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const { users } = await getSkillScopeSummaries();

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">工作台</h2>
          <p className="text-muted-foreground mt-1">
            所有用户按 skill usage 用量排序展示。
          </p>
        </div>
        {users.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border text-muted-foreground">
            暂无用户
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {users.map((summary) => (
              <ScopeCard key={summary.scope} summary={summary} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
