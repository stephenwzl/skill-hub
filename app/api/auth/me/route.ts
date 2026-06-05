import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/require-auth";
import { listUserOwnedDomains } from "@/lib/auth/domain-owners";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  const ownedDomains = user ? await listUserOwnedDomains(user.id) : [];
  return NextResponse.json({ user, ownedDomains });
}
