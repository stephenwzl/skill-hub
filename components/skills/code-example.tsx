"use client";

import { useEffect, useState } from "react";

interface CodeExampleProps {
  filename: string;
  code: string;
}

export function CodeExample({ filename, code }: CodeExampleProps) {
  const [highlighted, setHighlighted] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function highlight() {
      try {
        const shiki = await import("shiki");
        const ext = filename.split(".").pop() ?? "txt";
        const langMap: Record<string, string> = {
          ts: "typescript",
          tsx: "tsx",
          js: "javascript",
          jsx: "jsx",
          py: "python",
          sql: "sql",
          lua: "lua",
          go: "go",
          rs: "rust",
          java: "java",
          md: "markdown",
        };
        const lang = langMap[ext] ?? "text";

        const highlighter = await shiki.createHighlighter({
          themes: ["github-light"],
          langs: [lang],
        });

        const html = highlighter.codeToHtml(code, {
          lang,
          theme: "github-light",
        });
        setHighlighted(html);
      } catch {
        setHighlighted(`<pre><code>${escapeHtml(code)}</code></pre>`);
      } finally {
        setLoading(false);
      }
    }
    highlight();
  }, [filename, code]);

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <div className="text-xs text-muted-foreground mb-2">{filename}</div>
        <pre className="text-sm">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground border-b">
        {filename}
      </div>
      <div
        className="overflow-x-auto text-sm [&>pre]:!m-0 [&>pre]:!rounded-none [&>pre]:!border-0 [&>pre]:p-4"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
