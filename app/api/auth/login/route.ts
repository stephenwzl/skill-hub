import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePassword, isAllowedEmail, isSystemAdminEmail } from "@/lib/auth/users";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (!isAllowedEmail(email) && !isSystemAdminEmail(email)) {
      const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
      return NextResponse.json(
        { error: domain ? `Email must be @${domain}` : "Email not allowed" },
        { status: 400 }
      );
    }

    const user = await authenticatePassword(email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Failed to login:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
