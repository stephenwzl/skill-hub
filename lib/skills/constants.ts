export const SKILL_STATUS = {
  ACTIVE: "active",
  DEPRECATED: "deprecated",
} as const;

export type SkillStatus = (typeof SKILL_STATUS)[keyof typeof SKILL_STATUS];

export const DOMAINS = [
  "frontend",
  "backend",
  "devops",
  "database",
  "security",
  "testing",
  "architecture",
  "performance",
  "ai-ml",
  "general",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABELS: Record<Domain, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps",
  database: "Database",
  security: "Security",
  testing: "Testing",
  architecture: "Architecture",
  performance: "Performance",
  "ai-ml": "AI/ML",
  general: "General",
};

export const STATUS_LABELS: Record<SkillStatus, string> = {
  active: "Active",
  deprecated: "Deprecated",
};

export const STATUS_COLORS: Record<SkillStatus, string> = {
  active: "bg-green-100 text-green-800",
  deprecated: "bg-red-100 text-red-700",
};

export const SKILL_SOURCES = ["manual", "submitted", "imported"] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

/** Default skills directory (overridden by SKILL_HUB_SKILLS_DIR env var) */
export const DEFAULT_SKILLS_DIR = "data/skills";

/** Subdirectory names within a skill directory */
export const SKILL_SUBDIRS = ["scripts", "references", "assets"] as const;
export type SkillSubdir = (typeof SKILL_SUBDIRS)[number];

/** SKILL.md filename */
export const SKILL_MD_FILENAME = "SKILL.md";

/** Max length for content_summary stored in DB */
export const CONTENT_SUMMARY_MAX_CHARS = 500;
