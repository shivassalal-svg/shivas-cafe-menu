import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEFAULT_PIN = "shiva123";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string };
    const expectedPin = process.env.ADMIN_PIN || process.env.ADMIN_PASSWORD || DEFAULT_PIN;

    if (body.pin && body.pin === expectedPin) {
      const cookieStore = await cookies();
      cookieStore.set("shivas_admin_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Incorrect PIN/password." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("shivas_admin_session");
  return NextResponse.json({ success: true });
}
