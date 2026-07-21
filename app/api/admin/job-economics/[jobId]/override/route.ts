import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { approveLowMarginJobOverride } from "@/lib/profit-first-server";
import type { JobEconomicsInput } from "@/lib/profit-first-engine";
import { OWNER_OVERRIDE_REASONS } from "@/lib/profit-first-settings";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const reason = String(body.reason || "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Override reason is required" }, { status: 400 });
    }

    if (!OWNER_OVERRIDE_REASONS.includes(reason as (typeof OWNER_OVERRIDE_REASONS)[number])) {
      return NextResponse.json({ error: "Invalid override reason" }, { status: 400 });
    }

    const input = body.input as JobEconomicsInput;
    if (!input) {
      return NextResponse.json({ error: "Job economics input is required" }, { status: 400 });
    }

    const economics = await approveLowMarginJobOverride({
      jobId: params.jobId,
      reason,
      approvedBy: userId || "owner",
      input,
    });

    return NextResponse.json({ success: true, economics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to approve override";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
