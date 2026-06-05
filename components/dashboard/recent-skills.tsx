import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkillMetadata } from "@/lib/skills/types";
import { STATUS_LABELS, STATUS_COLORS, DOMAIN_LABELS } from "@/lib/skills/constants";

interface RecentSkillsProps {
  skills: SkillMetadata[];
}

export function RecentSkills({ skills }: RecentSkillsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近更新</CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无技能</p>
        ) : (
          <div className="space-y-3">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="flex items-center justify-between rounded-md p-2 hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{skill.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOMAIN_LABELS[skill.domain]} · {skill.tags.slice(0, 2).join(", ")}
                  </p>
                </div>
                <Badge variant="secondary" className={STATUS_COLORS[skill.status]}>
                  {STATUS_LABELS[skill.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
