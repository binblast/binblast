import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  buildCompensationBreakdown,
  calculateJobCompensationAmount,
  isJobEligibleForCompensation,
  mergeCompensationSettings,
  type CompensationBreakdown,
  type CompensationSettings,
  type JobCommercialBonuses,
} from "@/lib/employee-compensation";
import { isJobCompleted } from "@/lib/operator-fleet-payroll";

const SETTINGS_COLLECTION = "platformSettings";
const SETTINGS_DOC_ID = "compensation";

export async function loadCompensationSettings(): Promise<CompensationSettings> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();

    if (!snapshot.exists) {
      return mergeCompensationSettings(null);
    }

    const data = snapshot.data();
    return mergeCompensationSettings((data?.settings || data) as Partial<CompensationSettings>);
  } catch (error) {
    console.error("[Compensation Settings] Failed to load:", error);
    return mergeCompensationSettings(null);
  }
}

export async function saveCompensationSettings(
  settings: Partial<CompensationSettings>,
  updatedBy: string
): Promise<CompensationSettings> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const existing = await loadCompensationSettings();
  const merged = mergeCompensationSettings({ ...existing, ...settings });

  await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(
    {
      settings: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );

  return merged;
}

export async function saveJobCompensationAdjustments(params: {
  jobId: string;
  jobData: Record<string, unknown>;
  employeeId: string;
  bonuses?: JobCommercialBonuses;
  overrideAmount?: number | null;
  overrideReason?: string | null;
  clearOverride?: boolean;
  updatedBy: string;
}): Promise<{
  breakdown: CompensationBreakdown;
  suggestedAmount: number;
  finalAmount: number;
}> {
  const settings = await loadCompensationSettings();
  const mergedJobData: Record<string, unknown> = { ...params.jobData };

  if (params.bonuses) {
    mergedJobData.employeeCompensationBonuses = params.bonuses;
  }

  if (params.clearOverride) {
    mergedJobData.employeeCompensationOverride = null;
    mergedJobData.employeeCompensationOverrideReason = null;
  } else if (params.overrideAmount != null) {
    mergedJobData.employeeCompensationOverride = params.overrideAmount;
    mergedJobData.employeeCompensationOverrideReason = params.overrideReason || null;
  }

  const breakdown = buildCompensationBreakdown(mergedJobData, settings);
  const finalAmount =
    breakdown.overrideAmount != null ? breakdown.overrideAmount : breakdown.suggestedAmount ?? 0;

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  const updatePayload: Record<string, unknown> = {
    employeeCompensationBonuses: mergedJobData.employeeCompensationBonuses || {},
    employeeCompensationBaseAmount: breakdown.baseAmount ?? 0,
    employeeCompensationBonusTotal: breakdown.bonusTotal ?? 0,
    employeeCompensationSuggestedAmount: breakdown.suggestedAmount ?? 0,
    employeeCompensationOverride: breakdown.overrideAmount,
    employeeCompensationOverrideReason: breakdown.overrideReason,
    employeeCompensationAdjustedAt: now,
    employeeCompensationAdjustedBy: params.updatedBy,
  };

  if (isJobCompleted(mergedJobData) && isJobEligibleForCompensation(mergedJobData, settings)) {
    updatePayload.employeeCompensationAmount = finalAmount;
    updatePayload.employeeCompensationLocked = true;
    updatePayload.employeeCompensationBreakdown = breakdown;
  }

  await db.collection("scheduledCleanings").doc(params.jobId).set(updatePayload, { merge: true });

  return {
    breakdown,
    suggestedAmount: breakdown.suggestedAmount ?? 0,
    finalAmount,
  };
}

export async function recordJobCompensationSnapshot(params: {
  jobId: string;
  jobData: Record<string, unknown>;
  employeeId: string;
}): Promise<{ amount: number; breakdown: CompensationBreakdown } | null> {
  const settings = await loadCompensationSettings();
  const mergedJobData = { ...params.jobData };

  if (!isJobEligibleForCompensation(mergedJobData, settings)) {
    return null;
  }

  const breakdown = buildCompensationBreakdown(mergedJobData, settings);
  const amount = calculateJobCompensationAmount(mergedJobData, settings);
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("scheduledCleanings").doc(params.jobId).set(
    {
      employeeCompensationAmount: amount,
      employeeCompensationLocked: true,
      employeeCompensationModel: settings.payModel,
      employeeCompensationBreakdown: breakdown,
      employeeCompensationBaseAmount: breakdown.baseAmount ?? 0,
      employeeCompensationBonusTotal: breakdown.bonusTotal ?? 0,
      employeeCompensationSuggestedAmount: breakdown.suggestedAmount ?? amount,
      employeeCompensationBonuses: breakdown.bonuses || {},
      employeeCompensationRecordedAt: now,
    },
    { merge: true }
  );

  await db.collection("compensationEvents").add({
    employeeId: params.employeeId,
    jobId: params.jobId,
    amount,
    bins: breakdown.bins,
    category: breakdown.category,
    payModel: settings.payModel,
    breakdown,
    baseAmount: breakdown.baseAmount ?? 0,
    bonusTotal: breakdown.bonusTotal ?? 0,
    bonuses: breakdown.bonuses || {},
    suggestedAmount: breakdown.suggestedAmount ?? amount,
    overrideAmount: breakdown.overrideAmount,
    scheduledDate: mergedJobData.scheduledDate || null,
    createdAt: now,
    status: "earned",
  });

  return { amount, breakdown };
}
