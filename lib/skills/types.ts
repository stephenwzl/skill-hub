export type { SkillStatus, Domain, SkillSource, DifficultyLevel } from "./constants";
import type { SkillStatus, Domain, SkillSource, DifficultyLevel } from "./constants";

export interface SkillMetadata {
  id: string;
  name: string;
  domain: Domain;
  tags: string[];
  description: string;
  status: SkillStatus;
  version: number;
  usageCount: number;
  author: string;
  source: SkillSource;
  language: string;
  framework: string;
  difficulty: DifficultyLevel;
  license: string;
  prerequisites: string[];
  relatedSkillIds: string[];
  importUrl: string | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A file reference within a skill directory (scripts/, references/, assets/) */
export interface SkillFileReference {
  filename: string;
  content: string;
}

export interface SkillDetail extends SkillMetadata {
  content: string;
  scripts: SkillFileReference[];
  references: SkillFileReference[];
  assets: SkillFileReference[];
}

export type SkillListItem = SkillMetadata;

export interface SkillQueryParams {
  page?: number;
  pageSize?: number;
  domain?: Domain;
  scope?: string;
  status?: SkillStatus;
  search?: string;
  language?: string;
  framework?: string;
  difficulty?: DifficultyLevel;
  source?: SkillSource;
  sortBy?: "updatedAt" | "createdAt" | "usageCount" | "name";
  sortOrder?: "asc" | "desc";
}

export interface SkillQueryResult {
  skills: SkillListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SkillScopeSummary {
  scope: string;
  kind: "domain" | "personal";
  domain?: Domain;
  skillCount: number;
  activeCount: number;
  deprecatedCount: number;
  totalUsage: number;
  latestUpdatedAt?: string;
}

export interface SkillCreateInput {
  id: string;
  name: string;
  domain: Domain;
  tags: string[];
  description: string;
  content: string;
  author: string;
  source?: SkillSource;
  language?: string;
  framework?: string;
  difficulty?: DifficultyLevel;
  license?: string;
  prerequisites?: string[];
  relatedSkillIds?: string[];
  importUrl?: string | null;
  scripts?: SkillFileReference[];
  references?: SkillFileReference[];
  assets?: SkillFileReference[];
}

export interface SkillUpdateInput {
  name?: string;
  domain?: Domain;
  tags?: string[];
  description?: string;
  content?: string;
  language?: string;
  framework?: string;
  difficulty?: DifficultyLevel;
  license?: string;
  prerequisites?: string[];
  relatedSkillIds?: string[];
  scripts?: SkillFileReference[];
  references?: SkillFileReference[];
  assets?: SkillFileReference[];
}

export interface SkillSubmission {
  problem: string;
  solution: string;
  context?: string;
  id?: string;
  scope?: string;
  name?: string;
  domain?: Domain;
  tags?: string[];
  description?: string;
  author: string;
  language?: string;
  framework?: string;
  force?: boolean;
}

export interface SkillSubmissionResult {
  action: "created" | "updated";
  skillId: string;
  skillName: string;
}

// Re-export frontmatter types for convenience
export type { SkillMdFrontmatter, ParsedSkillMd } from "./frontmatter";
