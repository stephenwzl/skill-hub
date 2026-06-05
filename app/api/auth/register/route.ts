import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, getUserByEmail, isAllowedEmail } from "@/lib/auth/users";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (!isAllowedEmail(email)) {
      const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
      return NextResponse.json(
        { error: domain ? `Email must be @${domain}` : "Email not allowed" },
        { status: 400 }
      );
    }
    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: "Email already registered. Please log in." }, { status: 409 });
    }

    const result = await createUser({
      ...parsed.data,
      email,
      role: "user",
    });
    const token = await createSession(result.user.id);
    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Failed to register:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
