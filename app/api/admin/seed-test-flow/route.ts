import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { seedTestFlowAccounts } from "@/lib/seed-test-flow";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedTestFlowAccounts();

    await logAdminAction("seed_test_flow", userId || "admin", {
      customerId: result.customer.uid,
      employeeId: result.employee.uid,
      cleaningId: result.customer.cleaningId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[Seed Test Flow] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to seed test flow accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
