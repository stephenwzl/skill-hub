import { NextRequest, NextResponse } from "next/server";
import { getSkillById, updateSkill, deleteSkill } from "@/lib/skills/storage";
import { skillUpdateSchema } from "@/lib/skills/schema";
import { authErrorResponse, requireUser } from "@/lib/auth/require-auth";
import { assertCanDeleteSkill, assertCanUpdateSkill } from "@/lib/auth/skill-scope";
import { parseSkillId } from "@/lib/skills/scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const { id: rawId } = await params;
    const id = rawId.map(decodeURIComponent).join("/");
    const skill = await getSkillById(id);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json(skill);
  } catch (error) {
    console.error("Failed to get skill:", error);
    return NextResponse.json({ error: "Failed to get skill detail" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const user = await requireUser(request);
    const { id: rawId } = await params;
    const id = rawId.map(decodeURIComponent).join("/");
    const body = await request.json();
    const parsed = skillUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await getSkillById(id);
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    await assertCanUpdateSkill(user, existing);
    const scope = parseSkillId(existing.id);
    if (scope?.kind === "domain" && parsed.data.domain && parsed.data.domain !== scope.domain) {
      return NextResponse.json(
        { error: "Domain scope must match skill domain" },
        { status: 400 }
      );
    }

    const skill = await updateSkill(id, parsed.data);
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json(skill);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Failed to update skill:", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const user = await requireUser(request);
    const { id: rawId } = await params;
    const id = rawId.map(decodeURIComponent).join("/");
    const existing = await getSkillById(id);
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    await assertCanDeleteSkill(user, existing);
    const deleted = await deleteSkill(id);
    if (!deleted) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Failed to delete skill:", error);
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }
}
