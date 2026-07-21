import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { calculateJobEconomics } from "@/lib/profit-first-engine";
import { loadProfitFirstSettings } from "@/lib/profit-first-server";
import type { JobEconomicsInput } from "@/lib/profit-first-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = body.input as JobEconomicsInput;
    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Job economics input is required" }, { status: 400 });
    }

    const settings = await loadProfitFirstSettings();
    const economics = calculateJobEconomics(input, settings);

    return NextResponse.json({ success: true, economics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to calculate job economics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
