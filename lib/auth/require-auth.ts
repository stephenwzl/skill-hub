import { NextRequest, NextResponse } from "next/server";
import type { Domain } from "@/lib/skills/types";
import { authenticateApiKey } from "./users";
import { getDomainOwner } from "./domain-owners";
import { getUserBySessionToken, SESSION_COOKIE } from "./session";
import type { AuthUser } from "./types";

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401
  ) {
    super(message);
  }
}

function extractApiKey(request: NextRequest) {
  const explicit = request.headers.get("x-api-key");
  if (explicit) return explicit.trim();

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return null;
}

export async function getRequestUser(request: NextRequest): Promise<AuthUser | null> {
  const apiKey = extractApiKey(request);
  if (apiKey) return authenticateApiKey(apiKey);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return getUserBySessionToken(token);

  return null;
}

export async function requireUser(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) throw new AuthError("Login or provide a valid API Key");
  return user;
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (user.role !== "admin") throw new AuthError("Admin access required", 403);
  return user;
}

export async function requireDomainOwnerOrAdmin(request: NextRequest, domain: Domain) {
  const user = await requireUser(request);
  if (user.role === "admin") return user;

  const owner = await getDomainOwner(domain);
  if (owner?.userId !== user.id) {
    throw new AuthError("Domain owner access required", 403);
  }

  return user;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
