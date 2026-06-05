import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle, Archive, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    active: number;
    deprecated: number;
    totalUsage: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "技能总数",
      value: stats.total,
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      title: "已生效",
      value: stats.active,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "已废弃",
      value: stats.deprecated,
      icon: Archive,
      color: "text-red-600",
    },
    {
      title: "总使用量",
      value: stats.totalUsage,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
