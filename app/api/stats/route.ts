import { NextResponse } from "next/server";
import { getStats } from "@/lib/skills/storage";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
