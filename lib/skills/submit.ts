import { DOMAINS, type Domain } from "./constants";
import { buildPersonalSkillId, parseSkillId, slugify } from "./scope";
import type { AuthUser } from "@/lib/auth/types";
import type { SkillCreateInput, SkillSubmission, SkillFileReference } from "./types";

const DOMAIN_SET = new Set<string>(DOMAINS);

function normalizeScope(scope: string) {
  return scope.trim().replace(/^@/, "").replace(/\/$/, "");
}

function buildContent(submission: Pick<SkillSubmission, "problem" | "solution" | "context">) {
  const context = submission.context?.trim();
  return [
    "# Problem",
    "",
    submission.problem.trim(),
    "",
    "# Solution",
    "",
    submission.solution.trim(),
    ...(context ? ["", "# Context", "", context] : []),
  ].join("\n");
}

function buildDescription(problem: string) {
  const normalized = problem.trim().replace(/\s+/g, " ");
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
}

export function buildSubmittedSkillInput(
  submission: SkillSubmission,
  user: Pick<AuthUser, "email" | "name">,
): SkillCreateInput {
  const name = submission.name?.trim() || submission.problem.trim().split(/\r?\n/)[0].slice(0, 100);
  const explicitScope = submission.scope ? normalizeScope(submission.scope) : undefined;
  const id = submission.id
    ?? (explicitScope
      ? `@${explicitScope}/${slugify(name)}`
      : buildPersonalSkillId(user, name));
  const parsed = parseSkillId(id);
  const domain: Domain = parsed?.kind === "domain"
    ? parsed.domain!
    : submission.domain ?? "general";

  return {
    id,
    name,
    domain,
    tags: submission.tags ?? ["submitted"],
    description: submission.description?.trim() || buildDescription(submission.problem),
    content: buildContent(submission),
    author: submission.author,
    source: "submitted",
    language: submission.language ?? "",
    framework: submission.framework ?? "",
  };
}

export function isDomainScope(scope: string) {
  return DOMAIN_SET.has(normalizeScope(scope));
}
