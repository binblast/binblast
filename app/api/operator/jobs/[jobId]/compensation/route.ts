import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getBinsFromCleaning } from "@/lib/operator-fleet-payroll";
import {
  loadCompensationSettings,
  saveJobCompensationAdjustments,
} from "@/lib/employee-compensation-server";
import {
  buildCompensationBreakdown,
  calculateJobCompensationAmount,
  COMMERCIAL_BONUS_TYPES,
  getJobCompensationCategory,
  isCommercialOrHoaJob,
  type CommercialBonusType,
  type JobCommercialBonuses,
} from "@/lib/employee-compensation";

export const dynamic = "force-dynamic";

function sanitizeBonuses(input: unknown): JobCommercialBonuses {
  if (!input || typeof input !== "object") {
    return {};
  }

  const bonuses: JobCommercialBonuses = {};
  for (const type of COMMERCIAL_BONUS_TYPES) {
    const value = Number((input as Record<string, unknown>)[type]);
    if (Number.isFinite(value) && value > 0) {
      bonuses[type as CommercialBonusType] = Math.round(value * 100) / 100;
    }
  }
  return bonuses;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const jobDoc = await db.collection("scheduledCleanings").doc(jobId).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobData = jobDoc.data() as Record<string, unknown>;
    const settings = await loadCompensationSettings();
    const category = getJobCompensationCategory(jobData);
    const breakdown = buildCompensationBreakdown(jobData, settings);
    const containers = getBinsFromCleaning(jobData);

    return NextResponse.json({
      jobId,
      category,
      isCommercial: isCommercialOrHoaJob(jobData),
      containers,
      breakdown,
      suggestedAmount: breakdown.suggestedAmount ?? 0,
      finalAmount: calculateJobCompensationAmount(jobData, settings),
      bonusDefaults: settings.commercialBonusDefaults,
      maxCommercialJobBonus: settings.maxCommercialJobBonus,
      bonusLabels: COMMERCIAL_BONUS_TYPES,
    });
  } catch (error: unknown) {
    console.error("[Operator Job Compensation GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load job compensation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await req.json();
    const {
      operatorId,
      bonuses,
      overrideAmount,
      overrideReason,
      clearOverride,
      managerCompensationApproved,
    } = body;

    if (!jobId || !operatorId) {
      return NextResponse.json({ error: "jobId and operatorId are required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const jobRef = db.collection("scheduledCleanings").doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const jobData = jobDoc.data() as Record<string, unknown>;
    if (!isCommercialOrHoaJob(jobData)) {
      return NextResponse.json(
        { error: "Compensation adjustments are only available for commercial and HOA jobs" },
        { status: 400 }
      );
    }

    const employeeId = String(jobData.assignedEmployeeId || "");
    if (!employeeId) {
      return NextResponse.json({ error: "Job has no assigned employee" }, { status: 400 });
    }

    if (managerCompensationApproved === true) {
      await jobRef.set(
        {
          managerCompensationApproved: true,
          compensationApproved: true,
          managerApproved: true,
          managerCompensationApprovedBy: operatorId,
        },
        { merge: true }
      );
    }

    const parsedOverride =
      overrideAmount === null || overrideAmount === undefined || clearOverride
        ? null
        : Number(overrideAmount);

    if (parsedOverride != null && (!Number.isFinite(parsedOverride) || parsedOverride < 0)) {
      return NextResponse.json({ error: "Invalid override amount" }, { status: 400 });
    }

    const result = await saveJobCompensationAdjustments({
      jobId,
      jobData: {
        ...jobData,
        ...(managerCompensationApproved === true
          ? {
              managerCompensationApproved: true,
              compensationApproved: true,
              managerApproved: true,
            }
          : {}),
      },
      employeeId,
      bonuses: bonuses ? sanitizeBonuses(bonuses) : undefined,
      overrideAmount: parsedOverride,
      overrideReason: typeof overrideReason === "string" ? overrideReason : null,
      clearOverride: clearOverride === true,
      updatedBy: operatorId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: "Commercial compensation updated.",
    });
  } catch (error: unknown) {
    console.error("[Operator Job Compensation PUT] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update job compensation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
