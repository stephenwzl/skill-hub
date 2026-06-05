import { NextRequest, NextResponse } from "next/server";
import { getAllSkills, createSkill, getSkillById } from "@/lib/skills/storage";
import { skillCreateSchema } from "@/lib/skills/schema";
import type { SkillQueryParams, Domain, SkillStatus } from "@/lib/skills/types";
import { authErrorResponse, requireUser } from "@/lib/auth/require-auth";
import { assertCanWriteSkillScope } from "@/lib/auth/skill-scope";
import { parseSkillId } from "@/lib/skills/scope";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const params: SkillQueryParams = {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      domain: (searchParams.get("domain") as Domain) || undefined,
      scope: searchParams.get("scope") || undefined,
      status: (searchParams.get("status") as SkillStatus) || undefined,
      search: searchParams.get("search") || undefined,
      language: searchParams.get("language") || undefined,
      framework: searchParams.get("framework") || undefined,
      difficulty: searchParams.get("difficulty") as SkillQueryParams["difficulty"] || undefined,
      source: searchParams.get("source") as SkillQueryParams["source"] || undefined,
      sortBy: (searchParams.get("sortBy") as SkillQueryParams["sortBy"]) || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || undefined,
    };

    const result = await getAllSkills(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to list skills:", error);
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const parsed = skillCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { force, ...input } = parsed.data;
    await assertCanWriteSkillScope(user, input.id);
    const scope = parseSkillId(input.id);
    if (scope?.kind === "domain" && scope.domain !== input.domain) {
      return NextResponse.json(
        { error: "Domain scope must match skill domain" },
        { status: 400 }
      );
    }
    const existingSkill = await getSkillById(input.id);
    if (existingSkill && !force) {
      return NextResponse.json({ error: "Skill ID already exists" }, { status: 409 });
    }

    const skill = await createSkill({
      ...input,
      author: user.name || user.email,
    }, { force });
    return NextResponse.json(skill, { status: existingSkill ? 200 : 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Failed to create skill:", error);
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}
