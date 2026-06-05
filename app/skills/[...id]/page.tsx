import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkillById } from "@/lib/skills/storage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SkillContent } from "@/components/skills/skill-content";
import { CodeExample } from "@/components/skills/code-example";
import { DeleteSkillButton } from "@/components/skills/delete-skill-button";
import { CopyableSkillId } from "@/components/skills/copyable-skill-id";
import { CopyCodexInstallPromptButton } from "@/components/skills/copy-codex-install-prompt-button";
import { DOMAIN_LABELS } from "@/lib/skills/constants";
import { parseSkillId } from "@/lib/skills/scope";
import { ArrowLeft, Calendar, User, Tag, BarChart3 } from "lucide-react";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id: rawId } = await params;
  const id = rawId.map(decodeURIComponent).join("/");
  const skill = await getSkillById(id);

  if (!skill) {
    notFound();
  }

  const scope = parseSkillId(skill.id);
  const backHref = scope ? `/scopes/${encodeURIComponent(scope.scope)}` : "/skills";

  const hasReferences = skill.references.length > 0;
  const hasScripts = skill.scripts.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回技能列表
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">
          <h2 className="text-2xl font-bold">{skill.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <CopyableSkillId id={skill.id} />
            <CopyCodexInstallPromptButton skillId={skill.id} />
          </div>
          <p className="text-muted-foreground">{skill.description}</p>
        </div>
        <DeleteSkillButton skill={skill} backHref={backHref} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex items-center gap-2 text-sm">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">领域：</span>
          <span>{DOMAIN_LABELS[skill.domain]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">作者：</span>
          <span>{skill.author}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">更新：</span>
          <span>{new Date(skill.updatedAt).toLocaleDateString("zh-CN")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">使用量：</span>
          <span>{skill.usageCount}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {skill.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">技能内容</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillContent content={skill.content} />
        </CardContent>
      </Card>

      {hasReferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">参考文件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skill.references.map((ref) => (
              <CodeExample key={ref.filename} filename={ref.filename} code={ref.content} />
            ))}
          </CardContent>
        </Card>
      )}

      {hasScripts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">脚本</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skill.scripts.map((script) => (
              <CodeExample key={script.filename} filename={script.filename} code={script.content} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
