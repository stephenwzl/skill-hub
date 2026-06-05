import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SkillListItem } from "@/lib/skills/types";
import { DOMAIN_LABELS } from "@/lib/skills/constants";

interface SkillTableProps {
  skills: SkillListItem[];
}

export function SkillTable({ skills }: SkillTableProps) {
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        暂无技能数据
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>领域</TableHead>
          <TableHead>标签</TableHead>
          <TableHead className="text-right">使用量</TableHead>
          <TableHead>更新时间</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {skills.map((skill) => (
          <TableRow key={skill.id}>
            <TableCell>
              <Link
                href={`/skills/${skill.id}`}
                className="font-medium hover:underline"
              >
                {skill.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {DOMAIN_LABELS[skill.domain]}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {skill.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">{skill.usageCount}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(skill.updatedAt).toLocaleDateString("zh-CN")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
