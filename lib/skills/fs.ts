import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getSkillsDir } from "@/lib/db/client";
import { SKILL_MD_FILENAME, SKILL_SUBDIRS, CONTENT_SUMMARY_MAX_CHARS } from "./constants";
import { parseSkillMd, stringifySkillMd } from "./frontmatter";
import type { SkillMdFrontmatter, ParsedSkillMd } from "./frontmatter";
import type { SkillFileReference } from "./types";
import type { Domain, DifficultyLevel, SkillSource } from "./constants";
import { parseSkillId } from "./scope";

/** Get the directory path for a skill: {skills-dir}/{scope}/{slug}/ */
export function getSkillDirPath(skillId: string): string {
  const parsed = parseSkillId(skillId);
  if (!parsed) throw new Error(`Invalid skill ID: ${skillId}`);
  return path.join(getSkillsDir(), parsed.scope, parsed.slug);
}

/** Get the SKILL.md file path for a skill */
export function getSkillMdPath(skillId: string): string {
  return path.join(getSkillDirPath(skillId), SKILL_MD_FILENAME);
}

/** Compute SHA-256 hash of a file's content */
export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

/** Compute SHA-256 hash of raw string content */
export function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/** Generate a search-optimized summary from content */
export function generateContentSummary(content: string): string {
  if (!content) return "";
  // Take first meaningful paragraph or truncate
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const summary = lines.slice(0, 5).join(" ").trim();
  if (summary.length <= CONTENT_SUMMARY_MAX_CHARS) return summary;
  return summary.slice(0, CONTENT_SUMMARY_MAX_CHARS - 3) + "...";
}

/** Ensure a skill directory exists */
export function ensureSkillDir(skillId: string): string {
  const dir = getSkillDirPath(skillId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Write SKILL.md to the skill directory */
export function writeSkillMd(
  skillId: string,
  frontmatter: SkillMdFrontmatter,
  content: string
): string {
  const dir = ensureSkillDir(skillId);
  const mdPath = path.join(dir, SKILL_MD_FILENAME);
  const raw = stringifySkillMd(frontmatter, content);
  fs.writeFileSync(mdPath, raw, "utf8");
  return mdPath;
}

/** Read and parse SKILL.md from the skill directory */
export function readSkillMd(skillId: string): ParsedSkillMd | null {
  const mdPath = getSkillMdPath(skillId);
  if (!fs.existsSync(mdPath)) return null;
  const raw = fs.readFileSync(mdPath, "utf8");
  return parseSkillMd(raw);
}

/** Read content hash of SKILL.md */
export function readSkillMdHash(skillId: string): string | null {
  const mdPath = getSkillMdPath(skillId);
  if (!fs.existsSync(mdPath)) return null;
  return computeFileHash(mdPath);
}

/** Write a file to a skill subdirectory (scripts/, references/, assets/) */
export function writeSkillFile(
  skillId: string,
  subdir: string,
  filename: string,
  content: string | Buffer
): void {
  const dir = ensureSkillDir(skillId);
  const subDir = path.join(dir, subdir);
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, filename), content);
}

/** Read a file from a skill subdirectory */
export function readSkillFile(
  skillId: string,
  subdir: string,
  filename: string
): string | null {
  const filePath = path.join(getSkillDirPath(skillId), subdir, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

/** List all files in a skill subdirectory (sorted by filename for deterministic ordering) */
export function listSkillFiles(skillId: string, subdir: string): SkillFileReference[] {
  const subDir = path.join(getSkillDirPath(skillId), subdir);
  if (!fs.existsSync(subDir)) return [];

  const files: SkillFileReference[] = [];
  for (const entry of fs.readdirSync(subDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const content = fs.readFileSync(path.join(subDir, entry.name), "utf8");
      files.push({ filename: entry.name, content });
    }
  }
  return files.sort((a, b) => a.filename.localeCompare(b.filename));
}

/** Read all file references (scripts, references, assets) for a skill */
export function readAllSkillFiles(skillId: string): {
  scripts: SkillFileReference[];
  references: SkillFileReference[];
  assets: SkillFileReference[];
} {
  return {
    scripts: listSkillFiles(skillId, "scripts"),
    references: listSkillFiles(skillId, "references"),
    assets: listSkillFiles(skillId, "assets"),
  };
}

/** Delete the entire skill directory */
export function deleteSkillDir(skillId: string): boolean {
  const dir = getSkillDirPath(skillId);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

/** Scan the skills directory and return all discovered skill IDs */
export function scanSkillsDir(): string[] {
  const skillsDir = getSkillsDir();
  if (!fs.existsSync(skillsDir)) return [];

  const skillIds: string[] = [];
  for (const scopeEntry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!scopeEntry.isDirectory()) continue;
    const scopeDir = path.join(skillsDir, scopeEntry.name);
    for (const slugEntry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
      if (!slugEntry.isDirectory()) continue;
      const mdPath = path.join(scopeDir, slugEntry.name, SKILL_MD_FILENAME);
      if (fs.existsSync(mdPath)) {
        skillIds.push(`@${scopeEntry.name}/${slugEntry.name}`);
      }
    }
  }
  return skillIds;
}

/** Write all files for a skill (SKILL.md + subdirectories) */
export function writeSkillFiles(
  skillId: string,
  frontmatter: SkillMdFrontmatter,
  content: string,
  files?: {
    scripts?: SkillFileReference[];
    references?: SkillFileReference[];
    assets?: SkillFileReference[];
  }
): void {
  writeSkillMd(skillId, frontmatter, content);

  if (files?.scripts) {
    for (const f of files.scripts) writeSkillFile(skillId, "scripts", f.filename, f.content);
  }
  if (files?.references) {
    for (const f of files.references) writeSkillFile(skillId, "references", f.filename, f.content);
  }
  if (files?.assets) {
    for (const f of files.assets) writeSkillFile(skillId, "assets", f.filename, f.content);
  }
}
