import type { SkillDetail, SkillMetadata } from "./types";

function formatMetadataBlock(meta: SkillMetadata): string {
  return [
    "---",
    `ID: ${meta.id}`,
    `Name: ${meta.name}`,
    `Domain: ${meta.domain}`,
    `Status: ${meta.status}`,
    `Tags: ${meta.tags.join(", ")}`,
    `Description: ${meta.description}`,
    `Author: ${meta.author}`,
    `Source: ${meta.source}`,
    `Language: ${meta.language}`,
    `Framework: ${meta.framework}`,
    `Difficulty: ${meta.difficulty}`,
    `Version: ${meta.version}`,
    `Usage: ${meta.usageCount}`,
    `Created: ${meta.createdAt}`,
    `Updated: ${meta.updatedAt}`,
    "---",
  ].join("\n");
}

export function formatMetadataCatalog(
  metadatas: SkillMetadata[],
  options: { title: string; subtitle?: string }
): string {
  const lines = [options.title, options.subtitle ?? `Total: ${metadatas.length}`, ""];

  if (metadatas.length === 0) {
    lines.push("(empty)");
    return lines.join("\n");
  }

  for (const meta of metadatas) {
    lines.push(formatMetadataBlock(meta), "");
  }

  return lines.join("\n").trimEnd();
}

export function parseSearchKeywords(keyword: string): string[] {
  return keyword
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export function normalizeSearchText(text: string): string {
  return text.toLowerCase().normalize("NFKC").replace(/[\s_./-]+/g, "");
}

function metadataHaystack(meta: SkillMetadata): string {
  return normalizeSearchText(
    [meta.id, meta.name, meta.description, meta.domain, meta.author, meta.status, meta.language, meta.framework, ...meta.tags].join("\n")
  );
}

function contentHaystack(skill: SkillDetail): string {
  const refContent = skill.references.map((r) => `${r.filename}\n${r.content}`).join("\n");
  const scriptContent = skill.scripts.map((s) => `${s.filename}\n${s.content}`).join("\n");
  return normalizeSearchText([skill.content, refContent, scriptContent].join("\n"));
}

export function metadataMatchesKeyword(meta: SkillMetadata, keyword: string): boolean {
  const keywords = parseSearchKeywords(keyword);
  if (keywords.length === 0) return true;
  const haystack = metadataHaystack(meta);
  return keywords.some((q) => haystack.includes(q));
}

export function scoreSkillKeywordMatch(skill: SkillDetail, keyword: string): number {
  const keywords = parseSearchKeywords(keyword);
  if (keywords.length === 0) return 1;

  const metaText = metadataHaystack(skill);
  const contentText = contentHaystack(skill);

  return keywords.reduce((score, q) => {
    let nextScore = score;
    const token = normalizeSearchText(q);
    if (!token) return nextScore;
    if (metaText.includes(token)) nextScore += 100;
    if (contentText.includes(token)) nextScore += 10;
    return nextScore;
  }, 0);
}

function formatSkillDetailBlock(skill: SkillDetail): string {
  const refNames = skill.references.map((r) => r.filename);
  const scriptNames = skill.scripts.map((s) => s.filename);
  const lines = [
    "=".repeat(80),
    `SKILL: ${skill.id}`,
    "=".repeat(80),
    `Name: ${skill.name}`,
    `Domain: ${skill.domain}`,
    `Status: ${skill.status}`,
    `Tags: ${skill.tags.join(", ")}`,
    `Description: ${skill.description}`,
    `Author: ${skill.author}`,
    `Source: ${skill.source}`,
    `Language: ${skill.language}`,
    `Framework: ${skill.framework}`,
    `Difficulty: ${skill.difficulty}`,
    `Version: ${skill.version}`,
    `Usage: ${skill.usageCount}`,
    `Updated: ${skill.updatedAt}`,
  ];

  if (refNames.length > 0) lines.push(`References: ${refNames.join(", ")}`);
  if (scriptNames.length > 0) lines.push(`Scripts: ${scriptNames.join(", ")}`);
  lines.push("", "## SKILL.md", skill.content || "(empty)");

  for (const ref of skill.references) {
    lines.push("", `## Reference: ${ref.filename}`, ref.content);
  }

  for (const script of skill.scripts) {
    lines.push("", `## Script: ${script.filename}`, script.content);
  }

  return lines.join("\n");
}

export function formatSkillDetails(found: SkillDetail[], requestedIds: string[], missing: string[]): string {
  const lines = ["# Skill Hub Skill Details", `Requested: ${requestedIds.length}`, `Found: ${found.length}`];
  if (missing.length > 0) lines.push(`Missing: ${missing.join(", ")}`);
  lines.push("");

  if (found.length === 0) {
    lines.push("(no skills found)");
    return lines.join("\n");
  }

  for (const skill of found) {
    lines.push(formatSkillDetailBlock(skill), "");
  }

  return lines.join("\n").trimEnd();
}
