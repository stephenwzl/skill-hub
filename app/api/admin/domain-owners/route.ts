import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/require-auth";
import { listDomainOwners, removeDomainOwner, setDomainOwner } from "@/lib/auth/domain-owners";
import { DOMAINS } from "@/lib/skills/constants";

const ownerSchema = z.object({
  domain: z.enum(DOMAINS),
  userId: z.string().min(1, "User is required").nullable(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ owners: await listDomainOwners() });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Failed to list domain owners:", error);
    return NextResponse.json({ error: "Failed to list domain owners" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const parsed = ownerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (!parsed.data.userId) {
      await removeDomainOwner(parsed.data.domain);
      return NextResponse.json({ owner: null });
    }

    const owner = await setDomainOwner(parsed.data.domain, parsed.data.userId);
    return NextResponse.json({ owner });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("Failed to set domain owner:", error);
    return NextResponse.json({ error: "Failed to set domain owner" }, { status: 500 });
  }
}
