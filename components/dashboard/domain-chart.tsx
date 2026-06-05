import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_LABELS } from "@/lib/skills/constants";

interface DomainChartProps {
  distribution: Record<string, number>;
}

const DOMAIN_COLORS: Record<string, string> = {
  frontend: "bg-blue-500",
  backend: "bg-green-500",
  devops: "bg-orange-500",
  database: "bg-purple-500",
  security: "bg-red-500",
  testing: "bg-teal-500",
  architecture: "bg-indigo-500",
  performance: "bg-yellow-500",
  "ai-ml": "bg-pink-500",
  general: "bg-gray-500",
};

export function DomainChart({ distribution }: DomainChartProps) {
  const entries = Object.entries(distribution).sort(([, a], [, b]) => b - a);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">领域分布</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <div className="space-y-3">
            {entries.map(([domain, count]) => (
              <div key={domain} className="flex items-center gap-3">
                <span className="text-sm w-16 text-right text-muted-foreground">
                  {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS] ?? domain}
                </span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${DOMAIN_COLORS[domain] ?? "bg-gray-500"}`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
