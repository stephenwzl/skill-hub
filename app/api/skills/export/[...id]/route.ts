import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/skills/storage";
import { getSkillDirPath } from "@/lib/skills/fs";
import AdmZip from "adm-zip";

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

    // Build ZIP from skill directory
    const skillDir = getSkillDirPath(id);
    const zip = new AdmZip();
    zip.addLocalFolder(skillDir, id.replace(/^@/, ""));

    const zipBuffer = zip.toBuffer();
    const filename = `${id.replace(/[@/]/g, "_")}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to export skill:", error);
    return NextResponse.json({ error: "Failed to export skill" }, { status: 500 });
  }
}
