import { AuthError } from "./require-auth";
import { getDomainOwner } from "./domain-owners";
import type { AuthUser } from "./types";
import type { SkillMetadata } from "@/lib/skills/types";
import { normalizeUserScope, parseSkillId } from "@/lib/skills/scope";

export async function assertCanWriteSkillScope(user: AuthUser, skillId: string) {
  const scope = parseSkillId(skillId);
  if (!scope) {
    throw new AuthError("Skill ID must be @scope/skill-slug", 400);
  }

  if (scope.kind === "domain") {
    if (user.role === "admin") return;
    const owner = await getDomainOwner(scope.domain!);
    if (owner?.userId === user.id) return;
    throw new AuthError("Only admin or domain owner can write to domain scope", 403);
  }

  if (scope.scope !== normalizeUserScope(user)) {
    throw new AuthError("Can only write to your own personal scope", 403);
  }
}

export async function assertCanUpdateSkill(user: AuthUser, skill: SkillMetadata) {
  await assertCanWriteSkillScope(user, skill.id);
}

export async function assertCanDeleteSkill(user: AuthUser, skill: SkillMetadata) {
  if (user.role === "admin") return;
  await assertCanWriteSkillScope(user, skill.id);
}
