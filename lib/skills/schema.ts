import { z } from "zod";
import { DOMAINS, SKILL_SOURCES, DIFFICULTY_LEVELS } from "./constants";

const skillFileReferenceSchema = z.object({
  filename: z.string().min(1),
  content: z.string(),
});

export const skillCreateSchema = z.object({
  id: z.string().regex(/^@[^/]+\/[a-z0-9][a-z0-9.-]*$/, "Skill ID must be @scope/skill-slug"),
  name: z.string().min(1, "Name is required").max(100, "Name must be ≤100 chars"),
  domain: z.enum(DOMAINS, { message: "Invalid domain" }),
  tags: z.array(z.string()).min(1, "At least one tag required").max(10, "Max 10 tags"),
  description: z.string().min(1, "Description is required").max(500, "Description must be ≤500 chars"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required").optional(),
  source: z.enum(SKILL_SOURCES).default("manual"),
  language: z.string().max(50).default(""),
  framework: z.string().max(100).default(""),
  difficulty: z.enum(DIFFICULTY_LEVELS).default("intermediate"),
  license: z.string().max(100).default(""),
  prerequisites: z.array(z.string()).max(20).default([]),
  relatedSkillIds: z.array(z.string()).max(20).default([]),
  importUrl: z.string().url().nullable().optional(),
  scripts: z.array(skillFileReferenceSchema).optional(),
  references: z.array(skillFileReferenceSchema).optional(),
  assets: z.array(skillFileReferenceSchema).optional(),
  force: z.boolean().default(false),
});

export const skillUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.enum(DOMAINS).optional(),
  tags: z.array(z.string()).min(1).max(10).optional(),
  description: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  language: z.string().max(50).optional(),
  framework: z.string().max(100).optional(),
  difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
  license: z.string().max(100).optional(),
  prerequisites: z.array(z.string()).max(20).optional(),
  relatedSkillIds: z.array(z.string()).max(20).optional(),
  scripts: z.array(skillFileReferenceSchema).optional(),
  references: z.array(skillFileReferenceSchema).optional(),
  assets: z.array(skillFileReferenceSchema).optional(),
});

export const skillQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  topK: z.number().min(1).max(20).default(5),
});

export const skillSubmitSchema = z.object({
  problem: z.string().min(1, "Problem is required"),
  solution: z.string().min(1, "Solution is required"),
  context: z.string().optional(),
  id: z.string().regex(/^@[^/]+\/[a-z0-9][a-z0-9.-]*$/, "Skill ID must be @scope/skill-slug").optional(),
  scope: z.string().min(1, "Scope is required").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be ≤100 chars").optional(),
  domain: z.enum(DOMAINS, { message: "Invalid domain" }).optional(),
  tags: z.array(z.string()).min(1, "At least one tag required").max(10, "Max 10 tags").optional(),
  description: z.string().min(1, "Description is required").max(500, "Description must be ≤500 chars").optional(),
  author: z.string().min(1, "Author is required").optional(),
  language: z.string().max(50).optional(),
  framework: z.string().max(100).optional(),
  force: z.boolean().default(false),
});

export const skillAgentFetchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one skill ID required").max(20, "Max 20 skills per request"),
});

export const skillCompactSchema = z.object({
  domain: z.enum(DOMAINS, { message: "Invalid domain" }),
  skillIds: z.array(z.string().min(1)).min(2).optional(),
  dryRun: z.boolean().default(true),
});
