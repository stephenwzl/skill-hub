import { NextRequest, NextResponse } from "next/server";
import { getAllSkillMetadata } from "@/lib/skills/storage";
import { formatMetadataCatalog } from "@/lib/skills/agent-text";
import type { Domain, SkillStatus } from "@/lib/skills/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = (searchParams.get("status") as SkillStatus) || undefined;
    const domain = (searchParams.get("domain") as Domain) || undefined;
    const scope = searchParams.get("scope") || undefined;

    const metadatas = await getAllSkillMetadata({ status, domain, scope });
    const text = formatMetadataCatalog(metadatas, {
      title: "# Skill Hub Catalog",
      subtitle: `Total: ${metadatas.length}`,
    });

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to list skills for agent:", error);
    return NextResponse.json({ error: "Failed to get skill catalog" }, { status: 500 });
  }
}
