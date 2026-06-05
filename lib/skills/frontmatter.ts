import matter from "gray-matter";
import type { Domain, DifficultyLevel, SkillSource } from "./constants";

/** Frontmatter structure as it appears in SKILL.md */
export interface SkillMdFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata: {
    domain: Domain;
    language?: string;
    framework?: string;
    difficulty?: DifficultyLevel;
    tags?: string[];
    prerequisites?: string[];
    relatedSkillIds?: string[];
    author?: string;
    source?: SkillSource;
    version?: number;
    importUrl?: string;
  };
}

/** Parsed result of a SKILL.md file */
export interface ParsedSkillMd {
  frontmatter: SkillMdFrontmatter;
  content: string; // markdown body (without frontmatter)
  raw: string; // full raw file content
}

/** Parse a SKILL.md file content into frontmatter + body */
export function parseSkillMd(fileContent: string): ParsedSkillMd {
  const { data, content } = matter(fileContent);

  const frontmatter: SkillMdFrontmatter = {
    name: data.name ?? "",
    description: data.description ?? "",
    license: data.license ?? "",
    compatibility: data.compatibility ?? "",
    metadata: {
      domain: data.metadata?.domain ?? data.domain ?? "general",
      language: data.metadata?.language ?? data.language ?? "",
      framework: data.metadata?.framework ?? data.framework ?? "",
      difficulty: data.metadata?.difficulty ?? data.difficulty ?? "intermediate",
      tags: data.metadata?.tags ?? data.tags ?? [],
      prerequisites: data.metadata?.prerequisites ?? data.prerequisites ?? [],
      relatedSkillIds: data.metadata?.relatedSkillIds ?? data.relatedSkillIds ?? [],
      author: data.metadata?.author ?? data.author ?? "",
      source: data.metadata?.source ?? data.source ?? "manual",
      version: data.metadata?.version ?? data.version ?? 1,
      importUrl: data.metadata?.importUrl ?? data.importUrl ?? undefined,
    },
  };

  return {
    frontmatter,
    content: content.trim(),
    raw: fileContent,
  };
}

/** Generate SKILL.md file content from frontmatter data and markdown body */
export function stringifySkillMd(
  frontmatter: SkillMdFrontmatter,
  content: string
): string {
  const fmData: Record<string, unknown> = {
    name: frontmatter.name,
    description: frontmatter.description,
  };

  if (frontmatter.license) fmData.license = frontmatter.license;
  if (frontmatter.compatibility) fmData.compatibility = frontmatter.compatibility;

  const meta: Record<string, unknown> = {};
  if (frontmatter.metadata.domain) meta.domain = frontmatter.metadata.domain;
  if (frontmatter.metadata.language) meta.language = frontmatter.metadata.language;
  if (frontmatter.metadata.framework) meta.framework = frontmatter.metadata.framework;
  if (frontmatter.metadata.difficulty) meta.difficulty = frontmatter.metadata.difficulty;
  if (frontmatter.metadata.tags && frontmatter.metadata.tags.length > 0) meta.tags = frontmatter.metadata.tags;
  if (frontmatter.metadata.prerequisites && frontmatter.metadata.prerequisites.length > 0) meta.prerequisites = frontmatter.metadata.prerequisites;
  if (frontmatter.metadata.relatedSkillIds && frontmatter.metadata.relatedSkillIds.length > 0) meta.relatedSkillIds = frontmatter.metadata.relatedSkillIds;
  if (frontmatter.metadata.author) meta.author = frontmatter.metadata.author;
  if (frontmatter.metadata.source) meta.source = frontmatter.metadata.source;
  if (frontmatter.metadata.version) meta.version = frontmatter.metadata.version;
  if (frontmatter.metadata.importUrl) meta.importUrl = frontmatter.metadata.importUrl;

  if (Object.keys(meta).length > 0) {
    fmData.metadata = meta;
  }

  return matter.stringify(content, fmData);
}
