import { NextRequest, NextResponse } from "next/server";
import { listOperatorAccounts } from "@/lib/operator-clock-service";
import { buildOperatorTimecard } from "@/lib/operator-self-payroll";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const operatorId = req.nextUrl.searchParams.get("operatorId");
    if (!operatorId) {
      return NextResponse.json({ error: "operatorId is required" }, { status: 400 });
    }

    const [operators, timecard] = await Promise.all([
      listOperatorAccounts(),
      buildOperatorTimecard(operatorId),
    ]);

    if (!timecard) {
      return NextResponse.json({ error: "Operator account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      operators,
      timecard,
    });
  } catch (error: unknown) {
    console.error("[Operator Self Timecard] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load operator timecard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
