import { NextRequest, NextResponse } from "next/server";
import { skillSubmitSchema } from "@/lib/skills/schema";
import { authErrorResponse, requireUser } from "@/lib/auth/require-auth";
import { assertCanWriteSkillScope } from "@/lib/auth/skill-scope";
import { createSkill, getSkillById } from "@/lib/skills/storage";
import { buildSubmittedSkillInput } from "@/lib/skills/submit";
import { parseSkillId } from "@/lib/skills/scope";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  const log = (message: string, extra?: Record<string, unknown>) => {
    console.log(`[skills.submit:${requestId}] ${message}`, {
      elapsedMs: Date.now() - startedAt,
      ...extra,
    });
  };

  try {
    const user = await requireUser(request);
    log("request received", {
      contentType: request.headers.get("content-type"),
      contentLength: request.headers.get("content-length"),
    });

    log("reading json body");
    const body = await request.json();
    log("json body parsed", {
      problemLength: typeof body?.problem === "string" ? body.problem.length : null,
      solutionLength: typeof body?.solution === "string" ? body.solution.length : null,
      contextLength: typeof body?.context === "string" ? body.context.length : 0,
      id: typeof body?.id === "string" ? body.id : null,
      scope: typeof body?.scope === "string" ? body.scope : null,
      author: typeof body?.author === "string" ? body.author : null,
      force: typeof body?.force === "boolean" ? body.force : null,
    });

    log("validating payload");
    const parsed = skillSubmitSchema.safeParse(body);

    if (!parsed.success) {
      log("payload validation failed", {
        fields: Object.keys(parsed.error.flatten().fieldErrors),
      });
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    log("payload validation succeeded");
    let input = buildSubmittedSkillInput(
      {
        ...parsed.data,
        author: user.name || user.email,
      },
      user
    );

    const scope = parseSkillId(input.id);
    if (scope?.kind === "domain" && parsed.data.domain && parsed.data.domain !== scope.domain) {
      return NextResponse.json(
        { error: "Domain scope must match skill domain" },
        { status: 400 }
      );
    }

    await assertCanWriteSkillScope(user, input.id);

    const existingSkill = parsed.data.id ? await getSkillById(parsed.data.id) : null;
    if (existingSkill && !parsed.data.force) {
      return NextResponse.json({ error: "Skill ID already exists" }, { status: 409 });
    }

    if (!parsed.data.id) {
      const baseId = input.id;
      for (let index = 2; await getSkillById(input.id); index += 1) {
        input = { ...input, id: `${baseId}-${index}` };
      }
    }

    const skill = await createSkill(input, { force: parsed.data.force });
    const action = existingSkill ? "updated" : "created";
    const result = {
      action,
      skillId: skill.id,
      skillName: skill.name,
    };

    log("request completed", {
      action: result.action,
      skillId: result.skillId,
      skillName: result.skillName,
    });
    return NextResponse.json(result, { status: action === "created" ? 201 : 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error(`[skills.submit:${requestId}] request failed`, {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return NextResponse.json({ error: "Failed to submit skill" }, { status: 500 });
  }
}
