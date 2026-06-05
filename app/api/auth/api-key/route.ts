import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/require-auth";
import { getUserApiKey, resetUserApiKey } from "@/lib/auth/users";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ apiKey: await getUserApiKey(user.id) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Failed to get API key:", error);
    return NextResponse.json({ error: "Failed to get API key" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json(await resetUserApiKey(user.id));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Failed to reset API key:", error);
    return NextResponse.json({ error: "Failed to reset API key" }, { status: 500 });
  }
}
