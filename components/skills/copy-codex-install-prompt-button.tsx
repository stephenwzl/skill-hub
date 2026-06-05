"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

interface CopyCodexInstallPromptButtonProps {
  skillId: string;
}

function getOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

function encodeSkillApiPath(skillId: string) {
  return skillId.split("/").map(encodeURIComponent).join("/");
}

function buildCodexInstallPrompt(skillId: string) {
  const detailUrl = `${getOrigin()}/api/skills/${encodeSkillApiPath(skillId)}`;

  return `请帮我准备从 Skill Hub 安装一个 Codex skill。

目标 Skill ID：${skillId}

请按以下步骤执行：

1. 根据 Skill ID 请求 REST API 获取 skill 详情：

\`\`\`bash
curl -sS "${detailUrl}"
\`\`\`

2. 读取接口返回的 skill 详情，重点使用其中的 \`name\`、\`description\`、\`content\` 和 \`examples\`。

3. 在真正写入或覆盖本地 Codex skill 文件之前，先询问我是否要安装到本地，并说明将安装的技能名称与目标路径。只有我明确确认后，才继续执行本地安装。`;
}

export function CopyCodexInstallPromptButton({ skillId }: CopyCodexInstallPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(buildCodexInstallPrompt(skillId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore; the user can retry the copy action.
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          复制用于 Codex 安装
        </>
      )}
    </Button>
  );
}
