import { NextRequest, NextResponse } from "next/server";
import {
  OPERATOR_RESOLUTION_TYPES,
  applyOperatorJobResolution,
} from "@/lib/operator-job-resolution";

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const { operatorId, resolution, notes, binCount } = body;

    if (!jobId || !operatorId || !resolution) {
      return NextResponse.json(
        { error: "jobId, operatorId, and resolution are required" },
        { status: 400 }
      );
    }

    if (!OPERATOR_RESOLUTION_TYPES.includes(resolution)) {
      return NextResponse.json(
        { error: `Invalid resolution. Use one of: ${OPERATOR_RESOLUTION_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await applyOperatorJobResolution({
      jobId,
      operatorId,
      resolution,
      notes,
      binCount,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[Operator Resolve Job] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to resolve job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
