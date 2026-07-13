import { getAdminFirestore } from "@/lib/firebase-admin";
import { getBinsFromCleaning, isJobCompleted } from "@/lib/operator-fleet-payroll";

const SETTINGS_COLLECTION = "platformSettings";
const SETTINGS_DOC_ID = "compensation";

export const COMPENSATION_PAY_MODELS = [
  "per_bin",
  "hourly",
  "per_job",
  "flat_daily",
  "commission_percentage",
] as const;

export type CompensationPayModel = (typeof COMPENSATION_PAY_MODELS)[number];

export type JobCompensationCategory = "residential" | "commercial" | "dumpster";

export type CompensationSettings = {
  payModel: CompensationPayModel;
  residentialFirstBinPay: number;
  residentialAdditionalBinPay: number;
  commercialBinPay: number;
  dumpsterPay: number;
  hourlyRate: number;
  flatDailyRate: number;
  weeklyBonus: number;
  monthlyBonus: number;
  holidayBonus: number;
  referralBonus: number;
  performanceBonus: number;
  maxDailyBonus: number;
  customerSignatureRequired: boolean;
  managerApprovalRequired: boolean;
};

export type CompensationBreakdown = {
  category: JobCompensationCategory;
  bins: number;
  payModel: CompensationPayModel;
  firstBinRate: number;
  additionalBinRate: number;
  formula: string;
};

export const DEFAULT_COMPENSATION_SETTINGS: CompensationSettings = {
  payModel: "per_bin",
  residentialFirstBinPay: 8,
  residentialAdditionalBinPay: 2,
  commercialBinPay: 10,
  dumpsterPay: 25,
  hourlyRate: 0,
  flatDailyRate: 0,
  weeklyBonus: 0,
  monthlyBonus: 0,
  holidayBonus: 0,
  referralBonus: 0,
  performanceBonus: 0,
  maxDailyBonus: 0,
  customerSignatureRequired: false,
  managerApprovalRequired: false,
};

export function getJobCompensationCategory(data: Record<string, unknown>): JobCompensationCategory {
  const planType = String(data.planType || "").toLowerCase();
  const serviceType = String(data.serviceType || "").toLowerCase();
  const cleaningType = String(data.cleaningType || "").toLowerCase();

  if (
    planType.includes("dumpster") ||
    serviceType.includes("dumpster") ||
    cleaningType.includes("dumpster")
  ) {
    return "dumpster";
  }

  if (
    data.isCommercial === true ||
    planType.includes("commercial") ||
    serviceType.includes("commercial") ||
    cleaningType.includes("commercial")
  ) {
    return "commercial";
  }

  return "residential";
}

export function isJobCancelled(data: Record<string, unknown>): boolean {
  return data.status === "cancelled" || data.jobStatus === "cancelled";
}

export function hasRequiredJobPhotos(data: Record<string, unknown>): boolean {
  if (data.hasRequiredPhotos === true || data.operatorSkipPhotos === true) {
    return true;
  }
  return Boolean(data.insidePhotoUrl && data.outsidePhotoUrl);
}

export function isJobEligibleForCompensation(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): boolean {
  if (isJobCancelled(data)) return false;
  if (!isJobCompleted(data)) return false;
  if (!hasRequiredJobPhotos(data)) return false;

  if (settings.customerSignatureRequired) {
    const hasSignature =
      Boolean(data.customerSignatureUrl) ||
      data.hasCustomerSignature === true ||
      data.customerSigned === true;
    if (!hasSignature) return false;
  }

  if (settings.managerApprovalRequired) {
    const approved =
      data.managerApproved === true ||
      data.compensationApproved === true ||
      data.managerCompensationApproved === true;
    if (!approved) return false;
  }

  const bins = getBinsFromCleaning(data);
  if (data.binsSkipped === true && bins <= 0) return false;

  return true;
}

export function calculateResidentialPerBinPay(
  bins: number,
  settings: Pick<CompensationSettings, "residentialFirstBinPay" | "residentialAdditionalBinPay">
): number {
  const count = Math.max(1, Math.floor(bins));
  return (
    settings.residentialFirstBinPay +
    Math.max(0, count - 1) * settings.residentialAdditionalBinPay
  );
}

export function buildCompensationBreakdown(
  data: Record<string, unknown>,
  settings: CompensationSettings
): CompensationBreakdown {
  const category = getJobCompensationCategory(data);
  const bins = getBinsFromCleaning(data);

  if (category === "dumpster") {
    return {
      category,
      bins,
      payModel: settings.payModel,
      firstBinRate: settings.dumpsterPay,
      additionalBinRate: 0,
      formula: "Flat dumpster pay",
    };
  }

  if (category === "commercial") {
    return {
      category,
      bins,
      payModel: settings.payModel,
      firstBinRate: settings.commercialBinPay,
      additionalBinRate: settings.commercialBinPay,
      formula: "Commercial bin rate × bins",
    };
  }

  return {
    category,
    bins,
    payModel: settings.payModel,
    firstBinRate: settings.residentialFirstBinPay,
    additionalBinRate: settings.residentialAdditionalBinPay,
    formula: "First bin + additional bins",
  };
}

export function calculateJobCompensationAmount(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  if (!isJobEligibleForCompensation(data, settings)) {
    return 0;
  }

  const category = getJobCompensationCategory(data);
  const bins = getBinsFromCleaning(data);

  if (bins <= 0) return 0;

  switch (settings.payModel) {
    case "hourly":
    case "flat_daily":
    case "commission_percentage":
      return 0;
    case "per_job":
      if (category === "dumpster") return settings.dumpsterPay;
      if (category === "commercial") return settings.commercialBinPay;
      return settings.residentialFirstBinPay;
    case "per_bin":
    default:
      if (category === "dumpster") return settings.dumpsterPay;
      if (category === "commercial") {
        return Math.round(settings.commercialBinPay * bins * 100) / 100;
      }
      return Math.round(calculateResidentialPerBinPay(bins, settings) * 100) / 100;
  }
}

export function getJobCompensationAmount(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  if (!isJobEligibleForCompensation(data, settings)) {
    return 0;
  }

  const stored = Number(data.employeeCompensationAmount);
  if (Number.isFinite(stored) && stored >= 0 && data.employeeCompensationLocked === true) {
    return Math.round(stored * 100) / 100;
  }

  return calculateJobCompensationAmount(data, settings);
}

export function buildCompensationPreview(
  settings: CompensationSettings,
  maxBins = 6
): Array<{ bins: number; amount: number }> {
  return Array.from({ length: maxBins }, (_, index) => {
    const bins = index + 1;
    return {
      bins,
      amount: Math.round(calculateResidentialPerBinPay(bins, settings) * 100) / 100,
    };
  });
}

export function sumCompensationFromCleanings(
  cleanings: Array<Record<string, unknown>>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): {
  jobsCompleted: number;
  jobsEligible: number;
  binsCleaned: number;
  earnings: number;
} {
  const completed = cleanings.filter(isJobCompleted);
  const eligible = completed.filter((cleaning) => isJobEligibleForCompensation(cleaning, settings));

  const binsCleaned = completed.reduce(
    (sum, cleaning) => sum + getBinsFromCleaning(cleaning),
    0
  );

  const earnings = eligible.reduce(
    (sum, cleaning) => sum + getJobCompensationAmount(cleaning, settings),
    0
  );

  return {
    jobsCompleted: completed.length,
    jobsEligible: eligible.length,
    binsCleaned,
    earnings: Math.round(earnings * 100) / 100,
  };
}

function sanitizeNumber(value: unknown, fallback: number, max = 10000): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
    return fallback;
  }
  return Math.round(parsed * 100) / 100;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function mergeCompensationSettings(
  input: Partial<CompensationSettings> | null | undefined
): CompensationSettings {
  const defaults = DEFAULT_COMPENSATION_SETTINGS;

  if (!input || typeof input !== "object") {
    return { ...defaults };
  }

  const payModel = COMPENSATION_PAY_MODELS.includes(input.payModel as CompensationPayModel)
    ? (input.payModel as CompensationPayModel)
    : defaults.payModel;

  return {
    payModel,
    residentialFirstBinPay: sanitizeNumber(
      input.residentialFirstBinPay,
      defaults.residentialFirstBinPay
    ),
    residentialAdditionalBinPay: sanitizeNumber(
      input.residentialAdditionalBinPay,
      defaults.residentialAdditionalBinPay
    ),
    commercialBinPay: sanitizeNumber(input.commercialBinPay, defaults.commercialBinPay),
    dumpsterPay: sanitizeNumber(input.dumpsterPay, defaults.dumpsterPay),
    hourlyRate: sanitizeNumber(input.hourlyRate, defaults.hourlyRate),
    flatDailyRate: sanitizeNumber(input.flatDailyRate, defaults.flatDailyRate),
    weeklyBonus: sanitizeNumber(input.weeklyBonus, defaults.weeklyBonus),
    monthlyBonus: sanitizeNumber(input.monthlyBonus, defaults.monthlyBonus),
    holidayBonus: sanitizeNumber(input.holidayBonus, defaults.holidayBonus),
    referralBonus: sanitizeNumber(input.referralBonus, defaults.referralBonus),
    performanceBonus: sanitizeNumber(input.performanceBonus, defaults.performanceBonus),
    maxDailyBonus: sanitizeNumber(input.maxDailyBonus, defaults.maxDailyBonus),
    customerSignatureRequired: sanitizeBoolean(
      input.customerSignatureRequired,
      defaults.customerSignatureRequired
    ),
    managerApprovalRequired: sanitizeBoolean(
      input.managerApprovalRequired,
      defaults.managerApprovalRequired
    ),
  };
}

export async function loadCompensationSettings(): Promise<CompensationSettings> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();

    if (!snapshot.exists) {
      return { ...DEFAULT_COMPENSATION_SETTINGS };
    }

    const data = snapshot.data();
    return mergeCompensationSettings((data?.settings || data) as Partial<CompensationSettings>);
  } catch (error) {
    console.error("[Compensation Settings] Failed to load:", error);
    return { ...DEFAULT_COMPENSATION_SETTINGS };
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

  const amount = calculateJobCompensationAmount(mergedJobData, settings);
  const breakdown = buildCompensationBreakdown(mergedJobData, settings);
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("scheduledCleanings").doc(params.jobId).set(
    {
      employeeCompensationAmount: amount,
      employeeCompensationLocked: true,
      employeeCompensationModel: settings.payModel,
      employeeCompensationBreakdown: breakdown,
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
    scheduledDate: mergedJobData.scheduledDate || null,
    createdAt: now,
    status: "earned",
  });

  return { amount, breakdown };
}
