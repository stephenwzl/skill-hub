import { NextRequest, NextResponse } from "next/server";
import { skillQuerySchema } from "@/lib/skills/schema";
import { getActiveSkillsForMatching, incrementUsageCount } from "@/lib/skills/storage";
import { matchSkills } from "@/lib/llm/match-skills";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = skillQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const skills = await getActiveSkillsForMatching();

    if (skills.length === 0) {
      return NextResponse.json({ matches: [], query: parsed.data.query });
    }

    const matches = await matchSkills(parsed.data.query, skills, parsed.data.topK);

    // Increment usage count for matched skills
    for (const match of matches) {
      await incrementUsageCount(match.skillId);
    }

    return NextResponse.json({ matches, query: parsed.data.query });
  } catch (error) {
    console.error("Failed to query skills:", error);
    return NextResponse.json({ error: "Failed to query skills" }, { status: 500 });
  }
}
