import { NextRequest, NextResponse } from "next/server";
import { skillCompactSchema } from "@/lib/skills/schema";
import { authErrorResponse, requireDomainOwnerOrAdmin } from "@/lib/auth/require-auth";
import { compactSkills } from "@/lib/llm/compact-skills";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = skillCompactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await requireDomainOwnerOrAdmin(request, parsed.data.domain);
    const result = await compactSkills({
      ...parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Failed to compact skills:", error);
    return NextResponse.json({ error: "Failed to compact skills" }, { status: 500 });
  }
}
