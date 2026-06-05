import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/require-auth";
import { assertCanWriteSkillScope } from "@/lib/auth/skill-scope";
import { importSkillFromParsed, getSkillById } from "@/lib/skills/storage";
import { parseSkillId } from "@/lib/skills/scope";
import { getEffectivePlan, PLAN_LIMITS } from "@/lib/auth/types";
import { parseSkillMd } from "@/lib/skills/frontmatter";
import type { SkillCreateInput, SkillFileReference } from "@/lib/skills/types";
import AdmZip from "adm-zip";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const plan = getEffectivePlan(user);
    if (!PLAN_LIMITS[plan].importEnabled) {
      return NextResponse.json(
        { error: "Import is not available on your current plan. Upgrade to Pro or Enterprise." },
        { status: 403 }
      );
    }

    // Expect multipart/form-data with a ZIP file
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "ZIP file is required. Upload as multipart/form-data with 'file' field." },
        { status: 400 }
      );
    }

    const force = formData.get("force") === "true";

    const buffer = Buffer.from(await file.arrayBuffer());
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    // Find SKILL.md in the ZIP
    const entries = zip.getEntries();
    const skillMdEntry = entries.find(
      (e) => !e.isDirectory && (e.entryName.endsWith("/SKILL.md") || e.entryName === "SKILL.md")
    );

    if (!skillMdEntry) {
      return NextResponse.json(
        { error: "ZIP must contain a SKILL.md file" },
        { status: 400 }
      );
    }

    // Parse SKILL.md
    const skillMdContent = skillMdEntry.getData().toString("utf8");
    const parsed = parseSkillMd(skillMdContent);

    if (!parsed.frontmatter.name || !parsed.frontmatter.description) {
      return NextResponse.json(
        { error: "SKILL.md must have name and description in frontmatter" },
        { status: 400 }
      );
    }

    // Determine skill ID from SKILL.md metadata or frontmatter
    // The path in the ZIP determines the scope/slug
    const mdPath = skillMdEntry.entryName;
    const pathParts = mdPath.split("/").filter(Boolean);
    // Expected: [scope, slug, SKILL.md] or [slug, SKILL.md]
    let scope: string;
    let slug: string;
    if (pathParts.length >= 3) {
      scope = pathParts[0]!;
      slug = pathParts[1]!;
    } else if (pathParts.length === 2) {
      scope = parsed.frontmatter.metadata.domain || "general";
      slug = pathParts[0]!;
    } else {
      return NextResponse.json(
        { error: "Invalid ZIP structure. Expected: {scope}/{slug}/SKILL.md" },
        { status: 400 }
      );
    }

    const skillId = `@${scope}/${slug}`;

    await assertCanWriteSkillScope(user, skillId);
    const scopeParsed = parseSkillId(skillId);
    if (scopeParsed?.kind === "domain" && scopeParsed.domain !== parsed.frontmatter.metadata.domain) {
      return NextResponse.json(
        { error: "Domain scope must match skill domain" },
        { status: 400 }
      );
    }

    const existingSkill = await getSkillById(skillId);
    if (existingSkill && !force) {
      return NextResponse.json({ error: "Skill ID already exists" }, { status: 409 });
    }

    // Collect files from ZIP
    const scripts: SkillFileReference[] = [];
    const references: SkillFileReference[] = [];
    const assets: SkillFileReference[] = [];

    const dirPrefix = pathParts.slice(0, -1).join("/") + "/"; // e.g. "frontend/react-error-boundary/"

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName;
      if (entryName === skillMdEntry.entryName) continue; // skip SKILL.md itself

      // Determine which subdirectory the file belongs to
      const relativePath = entryName.startsWith(dirPrefix)
        ? entryName.slice(dirPrefix.length)
        : entryName;

      const fileContent = entry.getData().toString("utf8");
      const fileName = path.basename(entryName);

      if (relativePath.startsWith("scripts/")) {
        scripts.push({ filename: fileName, content: fileContent });
      } else if (relativePath.startsWith("references/")) {
        references.push({ filename: fileName, content: fileContent });
      } else if (relativePath.startsWith("assets/")) {
        assets.push({ filename: fileName, content: fileContent });
      }
    }

    const input: SkillCreateInput = {
      id: skillId,
      name: parsed.frontmatter.name,
      domain: parsed.frontmatter.metadata.domain,
      tags: parsed.frontmatter.metadata.tags ?? [],
      description: parsed.frontmatter.description,
      content: parsed.content,
      author: parsed.frontmatter.metadata.author ?? (user.name || user.email),
      source: "imported",
      language: parsed.frontmatter.metadata.language ?? "",
      framework: parsed.frontmatter.metadata.framework ?? "",
      difficulty: parsed.frontmatter.metadata.difficulty ?? "intermediate",
      license: parsed.frontmatter.license ?? "",
      prerequisites: parsed.frontmatter.metadata.prerequisites ?? [],
      relatedSkillIds: parsed.frontmatter.metadata.relatedSkillIds ?? [],
      importUrl: parsed.frontmatter.metadata.importUrl ?? null,
      scripts,
      references,
      assets,
    };

    const skill = await importSkillFromParsed(input, {
      force,
    });

    return NextResponse.json(skill, { status: existingSkill ? 200 : 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Failed to import skill:", error);
    return NextResponse.json({ error: "Failed to import skill" }, { status: 500 });
  }
}
