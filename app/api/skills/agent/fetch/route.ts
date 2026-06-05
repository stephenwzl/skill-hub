import { NextRequest, NextResponse } from "next/server";
import { skillAgentFetchSchema } from "@/lib/skills/schema";
import { getSkillsByIds, incrementUsageCount } from "@/lib/skills/storage";
import { formatSkillDetails } from "@/lib/skills/agent-text";
import { SKILL_STATUS } from "@/lib/skills/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = skillAgentFetchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { found, missing } = await getSkillsByIds(parsed.data.ids);

    for (const skill of found) {
      if (skill.status === SKILL_STATUS.ACTIVE) {
        await incrementUsageCount(skill.id);
      }
    }

    const text = formatSkillDetails(found, parsed.data.ids, missing);

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to fetch skills for agent:", error);
    return NextResponse.json({ error: "Failed to fetch skill details" }, { status: 500 });
  }
}
