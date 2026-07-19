import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import {
  createOverflowOffersForJob,
  processUnassignedJobsForOverflow,
} from "@/lib/partner-overflow";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const scheduledDate =
      typeof body.scheduledDate === "string" ? body.scheduledDate.trim() : undefined;
    const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";

    if (jobId) {
      const offerIds = await createOverflowOffersForJob(jobId);
      return NextResponse.json({
        success: true,
        jobId,
        offersCreated: offerIds.length,
        offerIds,
      });
    }

    const result = await processUnassignedJobsForOverflow(scheduledDate);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} unassigned jobs and created ${result.offersCreated} overflow offers.`,
    });
  } catch (error: unknown) {
    console.error("[Admin Overflow Process] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process overflow jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
