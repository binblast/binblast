import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const resetResponse = await fetch(`${origin}/api/auth/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const resetData = await resetResponse.json().catch(() => ({}));

    if (!resetResponse.ok) {
      return NextResponse.json(
        { error: resetData.error || "Failed to send password reset email" },
        { status: resetResponse.status }
      );
    }

    await logAdminAction("send_team_password_reset", userId || "owner", { email });

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${email}`,
    });
  } catch (error: unknown) {
    console.error("[Team Account Reset Password] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to send password reset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
