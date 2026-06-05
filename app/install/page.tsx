"use client";

import { useState } from "react";
import { Check, Copy, BookOpen, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { buildSkillHubQuerySkillContent } from "@/lib/install/query-skill-content";
import { buildSkillHubSubmitSkillContent } from "@/lib/install/submit-skill-content";

function getHost() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

function buildQueryPrompt(host: string) {
  return buildSkillHubQuerySkillContent(host);
}

function buildSubmitPrompt(host: string) {
  return buildSkillHubSubmitSkillContent(host);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — user can select from preview
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          复制
        </>
      )}
    </Button>
  );
}

function PromptPreview({ text }: { text: string }) {
  return (
    <details className="group rounded-lg border bg-muted/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium marker:hidden">
        <span>展开查看 prompt</span>
        <span className="text-xs text-muted-foreground group-open:hidden">已折叠</span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">收起</span>
      </summary>
      <div className="border-t">
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-4 text-sm font-mono leading-relaxed">
          {text}
        </pre>
      </div>
    </details>
  );
}

export default function InstallPage() {
  const host = getHost();
  const queryPrompt = buildQueryPrompt(host);
  const submitPrompt = buildSubmitPrompt(host);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">安装 skill hub</h2>
        <p className="text-muted-foreground mt-1">
          复制安装 prompt，在 Codex 任意新建对话中执行即可安装

        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                技能查询
              </CardTitle>
              <CardDescription>
                Agent 自主检索：目录列表、关键词搜索、批量拉取详情（纯文本响应）
              </CardDescription>
            </div>
            <CopyButton text={queryPrompt} />
          </div>
          <div className="flex gap-1.5 pt-1">
            <Badge variant="secondary">查询</Badge>
            <Badge variant="secondary">经验检索</Badge>
            <Badge variant="secondary">关键词搜索</Badge>
            <Badge variant="secondary">批量详情</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <PromptPreview text={queryPrompt} />
        </CardContent>
      </Card>

      <Dialog>
        <DialogTrigger render={<Button variant="outline" className="w-full justify-center" />}>
          为 skill hub贡献 skill ?
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              技能沉淀
            </DialogTitle>
            <DialogDescription>
              安装该技能后，Agent 可以在验证修复后用 API Key 将可复用经验提交到 Skill Hub。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">沉淀</Badge>
            <Badge variant="secondary">经验总结</Badge>
            <Badge variant="secondary">自动生成</Badge>
          </div>

          <div className="flex justify-end">
            <CopyButton text={submitPrompt} />
          </div>

          <PromptPreview text={submitPrompt} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
