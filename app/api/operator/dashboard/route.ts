import { NextRequest, NextResponse } from "next/server";
import {
  getOperatorDashboardData,
  type OperatorDashboardScope,
} from "@/lib/operator-dashboard-data";

export const dynamic = "force-dynamic";

const VALID_SCOPES: OperatorDashboardScope[] = ["overview", "customers", "schedule"];

export async function GET(req: NextRequest) {
  try {
    const scopeParam = req.nextUrl.searchParams.get("scope") || "overview";
    const scope = VALID_SCOPES.includes(scopeParam as OperatorDashboardScope)
      ? (scopeParam as OperatorDashboardScope)
      : "overview";

    const data = await getOperatorDashboardData(scope);
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[Operator Dashboard API] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load operator dashboard";
    return NextResponse.json({ message }, { status: 500 });
  }
}
