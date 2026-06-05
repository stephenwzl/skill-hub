import { streamObject } from "ai";
import { z } from "zod";
import { getModel } from "./client";
import { getSkillsWithContent, mergeSkills } from "@/lib/skills/storage";
import type { Domain, SkillCompactPlan, SkillCompactResult, SkillDetail } from "@/lib/skills/types";

const compactPlanSchema = z.object({
  plans: z.array(
    z.object({
      targetSkillId: z.string(),
      sourceSkillIds: z.array(z.string()).min(1),
      name: z.string(),
      domain: z.enum([
        "frontend", "backend", "devops", "database", "security",
        "testing", "architecture", "performance", "ai-ml", "general",
      ]),
      tags: z.array(z.string()).min(1).max(10),
      description: z.string(),
      content: z.string(),
      reason: z.string(),
    })
  ),
});

export interface CompactSkillsInput {
  domain: Domain;
  skillIds?: string[];
  dryRun: boolean;
}

export async function compactSkills(input: CompactSkillsInput): Promise<SkillCompactResult> {
  const candidates = await getSkillsWithContent({
    domain: input.domain,
    status: "active",
    ids: input.skillIds,
  });

  if (candidates.length < 2) {
    return { dryRun: input.dryRun, plans: [], executed: [] };
  }

  const plans = await generateCompactPlans(input.domain, candidates);
  const validIds = new Set(candidates.map((skill) => skill.id));
  const validPlans = plans.filter((plan) => {
    const sourceIds = [plan.targetSkillId, ...plan.sourceSkillIds];
    return (
      plan.domain === input.domain &&
      sourceIds.length >= 2 &&
      sourceIds.every((id) => validIds.has(id)) &&
      new Set(sourceIds).size >= 2
    );
  });

  if (input.dryRun) {
    return { dryRun: true, plans: validPlans, executed: [] };
  }

  const executed = [];
  for (const plan of validPlans) {
    const result = await mergeSkills(plan);
    if (result) executed.push(result);
  }

  return { dryRun: false, plans: validPlans, executed };
}

async function generateCompactPlans(domain: Domain, skills: SkillDetail[]): Promise<SkillCompactPlan[]> {
  const model = getModel();
  const skillPayload = skills
    .map(
      (skill) => `## ${skill.id}
Name: ${skill.name}
Domain: ${skill.domain}
Tags: ${skill.tags.join(", ")}
Description: ${skill.description}
Usage: ${skill.usageCount}
Version: ${skill.version}
Content:
${skill.content}`
    )
    .join("\n\n---\n\n");

  const result = streamObject({
    model,
    schema: compactPlanSchema,
    prompt: `You are a Skill Hub consolidation expert. Find similar, redundant, or mergeable skills within the same domain and produce merge plans.

Rules:
1. Only merge skills that are genuinely similar or redundant. Return empty plans if no merges needed.
2. Each plan must have at least 2 skills: targetSkillId is the primary skill to keep and update, sourceSkillIds are skills to deprecate after merge (exclude targetSkillId).
3. Prefer higher-usage, more complete skills as targetSkillId.
4. The content must be a complete SKILL.md that integrates all sources, removes duplicates, and has clear structure.
5. Domain must remain ${domain}.

Candidate skills:
${skillPayload}`,
    providerOptions: { openai: { reasoningEffort: "none" } },
  });

  const drainPromise = (async () => {
    for await (const chunk of result.fullStream) {
      void chunk;
    }
  })();

  const [object] = await Promise.all([result.object, drainPromise]);
  return object.plans;
}
