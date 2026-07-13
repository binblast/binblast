import { NextRequest, NextResponse } from "next/server";
import { clockInOperator } from "@/lib/operator-clock-service";
import { buildOperatorTimecard } from "@/lib/operator-self-payroll";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const operatorId = typeof body.operatorId === "string" ? body.operatorId : "";

    if (!operatorId) {
      return NextResponse.json({ error: "operatorId is required" }, { status: 400 });
    }

    const result = await clockInOperator(operatorId);
    const timecard = await buildOperatorTimecard(operatorId);

    return NextResponse.json({
      success: true,
      ...result,
      timecard,
    });
  } catch (error: unknown) {
    console.error("[Operator Self Clock In] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to clock in";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
