import { streamObject } from "ai";
import { z } from "zod";
import { getModel } from "./client";

interface SkillSummary {
  id: string;
  name: string;
  domain: string;
  tags: string[];
  description: string;
}

const matchResultSchema = z.object({
  matches: z.array(
    z.object({
      skillId: z.string(),
      relevance: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
});

export async function matchSkills(
  query: string,
  skills: SkillSummary[],
  topK: number = 5
): Promise<Array<{ skillId: string; skillName: string; relevance: number; reason: string }>> {
  const model = getModel();

  const skillsSummary = skills
    .map((s) => `- ID: ${s.id} | Name: ${s.name} | Domain: ${s.domain} | Tags: ${s.tags.join(", ")} | Description: ${s.description}`)
    .join("\n");

  const result = streamObject({
    model,
    schema: matchResultSchema,
    prompt: `You are a skill matching expert. Find the most relevant skills from the library for the user's query.

User query: ${query}

Skill library:
${skillsSummary}

Return the top ${topK} most relevant skills sorted by relevance. For each match provide:
- skillId: the skill ID
- relevance: score 0-1 (1 = perfect match)
- reason: brief explanation

Only return truly relevant skills. Return empty array if nothing matches.`,
  });

  const object = await result.object;

  return object.matches.map((m) => {
    const skill = skills.find((s) => s.id === m.skillId);
    return {
      skillId: m.skillId,
      skillName: skill?.name ?? "Unknown",
      relevance: m.relevance,
      reason: m.reason,
    };
  });
}
