"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";

interface CopyableSkillIdProps {
  id: string;
  className?: string;
}

export function CopyableSkillId({ id, className }: CopyableSkillIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5",
        className
      )}
    >
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Skill ID
      </span>
      <code className="min-w-0 truncate font-mono text-sm text-foreground">{id}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={copied ? "已复制 Skill ID" : "复制 Skill ID"}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
