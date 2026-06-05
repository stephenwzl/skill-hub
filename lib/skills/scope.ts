import { DOMAINS, type Domain } from "./constants";
import type { AuthUser } from "@/lib/auth/types";

export type SkillScopeKind = "domain" | "personal";

export interface ParsedSkillScope {
  id: string;
  scope: string;
  slug: string;
  kind: SkillScopeKind;
  domain?: Domain;
}

const DOMAIN_SET = new Set<string>(DOMAINS);

export function normalizeUserScope(user: Pick<AuthUser, "email" | "name">) {
  const base = user.email.split("@")[0] || user.name;
  return slugify(base.replace(/_/g, "."));
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "skill";
}

export function buildPersonalSkillId(user: Pick<AuthUser, "email" | "name">, name: string) {
  return `@${normalizeUserScope(user)}/${slugify(name)}`;
}

export function parseSkillId(id: string): ParsedSkillScope | null {
  const match = id.match(/^@([^/]+)\/([a-z0-9][a-z0-9.-]*)$/);
  if (!match) return null;

  const [, scope, slug] = match;
  const kind: SkillScopeKind = DOMAIN_SET.has(scope) ? "domain" : "personal";
  return {
    id,
    scope,
    slug,
    kind,
    domain: kind === "domain" ? (scope as Domain) : undefined,
  };
}

export function isDomainSkillId(id: string) {
  return parseSkillId(id)?.kind === "domain";
}

export function isPersonalSkillId(id: string) {
  return parseSkillId(id)?.kind === "personal";
}
