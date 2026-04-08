import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const ADMIN_EMAIL = process.env.VIMS_ADMIN_EMAIL ?? "admin@vims.dev";
const ADMIN_PASSWORD = process.env.VIMS_ADMIN_PASSWORD ?? "admin";
const JWT_SECRET = process.env.JWT_SECRET ?? "super_secret_vims_key";
const SESSION_COOKIE = "vims-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate credentials — replace with DB lookup when ready
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Issue JWT (same algorithm as packages/modules/auth)
    const token = jwt.sign(
      { userId: "platform_admin", role: "platform_admin", email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
