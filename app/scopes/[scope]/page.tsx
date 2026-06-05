import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillTable } from "@/components/skills/skill-table";
import { getAllSkills, getSkillScopeSummaries } from "@/lib/skills/storage";

export default async function ScopeSkillsPage({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope: rawScope } = await params;
  const scope = decodeURIComponent(rawScope);
  const { users } = await getSkillScopeSummaries();
  const summary = users.find((item) => item.scope === scope);

  if (!summary) {
    notFound();
  }

  const { skills } = await getAllSkills({
    scope,
    pageSize: 200,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回工作台
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">{scope}</CardTitle>
                <CardDescription>@{scope}</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">User</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{summary.skillCount} skills</span>
          <span>{summary.activeCount} active</span>
          <span>{summary.deprecatedCount} deprecated</span>
          <span>{summary.totalUsage} usage</span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Skills</h2>
        <SkillTable skills={skills} />
      </div>
    </div>
  );
}
