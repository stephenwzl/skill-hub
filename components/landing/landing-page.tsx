import Link from "next/link";
import {
  Sparkles,
  Download,
  Search,
  Lightbulb,
  Layers,
  ArrowRight,
  Bot,
  Terminal,
  Code2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LearnSubmitCta } from "@/components/landing/learn-submit-cta";
import { LandingContainer } from "@/components/landing/landing-container";
import { cn } from "@/lib/utils";

const agents = [
  { name: "Cursor", icon: Code2 },
  { name: "Codex", icon: Terminal },
  { name: "Claude Code", icon: Bot },
] as const;

const features = [
  {
    title: "Skills 随处可得",
    description:
      "在 Cursor、Codex、Claude Code 等 Agent 中安装 Skill Hub 查询技能，遇到问题先检索团队沉淀，再动手实现。",
    icon: Layers,
    accent: "text-violet-600 bg-violet-500/10",
    footer: (
      <div className="flex flex-wrap gap-2">
        {agents.map(({ name, icon: Icon }) => (
          <Badge key={name} variant="secondary" className="gap-1.5 py-1">
            <Icon className="h-3.5 w-3.5" />
            {name}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    title: "一个技能，解锁无限可能",
    description:
      "复制安装 prompt，在任意新对话中执行即可接入查询能力。Agent 可自主列表、搜索、批量拉取技能详情。",
    icon: Sparkles,
    accent: "text-amber-600 bg-amber-500/10",
    footer: (
      <Link href="/install" className={buttonVariants()}>
        <Download className="h-4 w-4" />
        安装 Skill Hub 技能
      </Link>
    ),
  },
  {
    title: "快速沉淀，不必焦头烂额",
    description:
      "验证修复后，用 API Key 将可复用经验提交到 Hub。登录后配置环境变量，Agent 即可自动总结并上传技能。",
    icon: Lightbulb,
    accent: "text-emerald-600 bg-emerald-500/10",
    footer: <LearnSubmitCta />,
  },
  {
    title: "浏览、搜索和发现",
    description:
      "在 Web 端按领域筛选、关键词搜索，查看技能详情与使用统计，发现团队里最受欢迎的实践。",
    icon: Search,
    accent: "text-blue-600 bg-blue-500/10",
    footer: (
      <Link href="/skills" className={buttonVariants({ variant: "outline" })}>
        探索技能库
        <ArrowRight className="h-4 w-4" />
      </Link>
    ),
  },
] as const;

const steps = [
  {
    step: "01",
    title: "安装查询技能",
    body: "打开「安装 Skill Hub」，复制查询 prompt，在 Codex / Cursor / Claude Code 新对话中执行。",
  },
  {
    step: "02",
    title: "遇问题先检索",
    body: "开发中让 Agent 按关键词搜索 Hub，拉取相关技能全文，避免重复踩坑。",
  },
  {
    step: "03",
    title: "修复后沉淀",
    body: "注册并获取 API Key，安装沉淀技能；验证通过后 Agent 可将经验提交到团队库。",
  },
  {
    step: "04",
    title: "Web 端发现",
    body: "在工作台查看贡献排行，在技能库浏览、筛选、进入详情页阅读完整内容。",
  },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <LandingContainer className="flex h-14 items-center justify-between gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Skill Hub
          </Link>
          <nav className="flex flex-1 items-center justify-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              能力
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              使用方法
            </a>
            <Link href="/skills" className="hover:text-foreground transition-colors">
              技能库
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className={buttonVariants({ size: "sm", variant: "ghost" })}>
              登录
            </Link>
            <Link href="/dashboard" className={buttonVariants({ size: "sm", variant: "outline" })}>
              工作台
            </Link>
            <Link href="/install" className={buttonVariants({ size: "sm" })}>
              安装技能
            </Link>
          </div>
        </LandingContainer>
      </header>

      <main className="w-full">
        <section className="relative w-full overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.75_0.12_280/0.25),transparent)]"
          />
          <LandingContainer className="relative py-16">
            <Badge variant="secondary" className="mb-4">
              团队经验技能池
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              让 AI Agent 共享
              <span className="text-primary"> 可复用的工程经验</span>
            </h1>
            <p className="mt-5 max-w-[42rem] text-lg text-muted-foreground leading-relaxed">
              Skill Hub 集中管理团队在 Cursor、Codex、Claude Code 中沉淀的技能文档。
              查询、提交、浏览一站完成——少重复劳动，多一致解法。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/install" className={buttonVariants({ size: "lg" })}>
                <Download className="h-4 w-4" />
                安装 Skill Hub 技能
              </Link>
              <Link
                href="/skills"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                浏览技能库
              </Link>
            </div>
          </LandingContainer>
        </section>

        <section id="features" className="w-full py-14">
          <LandingContainer>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">核心能力</h2>
              <p className="mt-2 text-muted-foreground">
                从 Agent 内检索到 Web 端发现，覆盖技能全生命周期。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col">
                  <CardHeader>
                    <div
                      className={cn(
                        "mb-3 flex h-11 w-11 items-center justify-center rounded-lg",
                        feature.accent
                      )}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="mt-auto border-t-0 bg-transparent pt-0">
                    {feature.footer}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </LandingContainer>
        </section>

        <section id="how-it-works" className="w-full border-t bg-muted/30 py-14">
          <LandingContainer>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">如何使用</h2>
              <p className="mt-2 text-muted-foreground">
                四步上手：安装 → 检索 → 沉淀 → 在 Web 端浏览与发现。
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {steps.map((item) => (
                <Card key={item.step} size="sm" className="bg-card/80">
                  <CardHeader>
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      {item.step}
                    </span>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t pt-10">
              <Link href="/install" className={buttonVariants()}>
                立即安装
              </Link>
              <LearnSubmitCta variant="default" />
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
                进入工作台
              </Link>
            </div>
          </LandingContainer>
        </section>
      </main>

      <footer className="w-full border-t py-8">
        <LandingContainer className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Skill Hub — Experience Skill Pool</span>
          </div>
          <div className="flex gap-6">
            <Link href="/skills" className="hover:text-foreground transition-colors">
              技能库
            </Link>
            <Link href="/install" className="hover:text-foreground transition-colors">
              安装
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              登录
            </Link>
          </div>
        </LandingContainer>
      </footer>
    </div>
  );
}
