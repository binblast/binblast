import { getBinsFromCleaning, isJobCompleted } from "@/lib/operator-fleet-payroll";

export const COMPENSATION_PAY_MODELS = [
  "per_bin",
  "hourly",
  "per_job",
  "flat_daily",
  "commission_percentage",
] as const;

export type CompensationPayModel = (typeof COMPENSATION_PAY_MODELS)[number];

export type JobCompensationCategory = "residential" | "commercial" | "dumpster";

export const COMMERCIAL_BONUS_TYPES = [
  "heavyCleaning",
  "largeDumpster",
  "hoaCommunity",
  "travel",
  "hazardPay",
  "extraLabor",
  "manual",
] as const;

export type CommercialBonusType = (typeof COMMERCIAL_BONUS_TYPES)[number];

export type CommercialBonusDefaults = Record<CommercialBonusType, number>;

export type JobCommercialBonuses = Partial<Record<CommercialBonusType, number>>;

export type CompensationSettings = {
  payModel: CompensationPayModel;
  residentialFirstBinPay: number;
  residentialAdditionalBinPay: number;
  commercialFirstContainerPay: number;
  commercialAdditionalContainerPay: number;
  /** @deprecated Legacy flat commercial rate — migrated on load */
  commercialBinPay?: number;
  dumpsterPay: number;
  hourlyRate: number;
  flatDailyRate: number;
  weeklyBonus: number;
  monthlyBonus: number;
  holidayBonus: number;
  referralBonus: number;
  performanceBonus: number;
  maxDailyBonus: number;
  commercialBonusDefaults: CommercialBonusDefaults;
  maxCommercialJobBonus: number;
  customerSignatureRequired: boolean;
  managerApprovalRequired: boolean;
  commercialManagerApprovalRequired: boolean;
};

export type CompensationBreakdown = {
  category: JobCompensationCategory;
  bins: number;
  payModel: CompensationPayModel;
  firstBinRate: number;
  additionalBinRate: number;
  formula: string;
  baseAmount?: number;
  bonusTotal?: number;
  bonuses?: JobCommercialBonuses;
  suggestedAmount?: number;
  overrideAmount?: number | null;
  overrideReason?: string | null;
};

export const DEFAULT_COMMERCIAL_BONUS_DEFAULTS: CommercialBonusDefaults = {
  heavyCleaning: 20,
  largeDumpster: 25,
  hoaCommunity: 15,
  travel: 15,
  hazardPay: 25,
  extraLabor: 20,
  manual: 0,
};

export const DEFAULT_COMPENSATION_SETTINGS: CompensationSettings = {
  payModel: "per_bin",
  residentialFirstBinPay: 8,
  residentialAdditionalBinPay: 3,
  commercialFirstContainerPay: 8,
  commercialAdditionalContainerPay: 2,
  dumpsterPay: 25,
  hourlyRate: 0,
  flatDailyRate: 0,
  weeklyBonus: 0,
  monthlyBonus: 0,
  holidayBonus: 0,
  referralBonus: 0,
  performanceBonus: 0,
  maxDailyBonus: 0,
  commercialBonusDefaults: { ...DEFAULT_COMMERCIAL_BONUS_DEFAULTS },
  maxCommercialJobBonus: 200,
  customerSignatureRequired: false,
  managerApprovalRequired: false,
  commercialManagerApprovalRequired: false,
};

export const COMMERCIAL_BONUS_LABELS: Record<CommercialBonusType, string> = {
  heavyCleaning: "Heavy Cleaning Bonus",
  largeDumpster: "Large Dumpster Bonus",
  hoaCommunity: "HOA Community Bonus",
  travel: "Travel Bonus",
  hazardPay: "Hazard Pay",
  extraLabor: "Extra Labor Bonus",
  manual: "Manual Bonus",
};

export function getJobCompensationCategory(data: Record<string, unknown>): JobCompensationCategory {
  const planType = String(data.planType || "").toLowerCase();
  const serviceType = String(data.serviceType || "").toLowerCase();
  const cleaningType = String(data.cleaningType || "").toLowerCase();
  const commercialType = String(data.commercialType || "").toLowerCase();

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
    planType.includes("hoa") ||
    serviceType.includes("commercial") ||
    serviceType.includes("hoa") ||
    cleaningType.includes("commercial") ||
    cleaningType.includes("hoa") ||
    commercialType.includes("hoa") ||
    commercialType.includes("commercial")
  ) {
    return "commercial";
  }

  return "residential";
}

export function isCommercialOrHoaJob(data: Record<string, unknown>): boolean {
  return getJobCompensationCategory(data) === "commercial";
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
  if (data.requiresRework === true || (Array.isArray(data.flags) && data.flags.includes("rework_required"))) return false;
  if (!hasRequiredJobPhotos(data)) return false;

  if (settings.customerSignatureRequired) {
    const hasSignature =
      Boolean(data.customerSignatureUrl) ||
      data.hasCustomerSignature === true ||
      data.customerSigned === true;
    if (!hasSignature) return false;
  }

  const category = getJobCompensationCategory(data);
  const requiresManagerApproval =
    settings.managerApprovalRequired ||
    (category === "commercial" && settings.commercialManagerApprovalRequired);

  if (requiresManagerApproval) {
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

export function calculatePerContainerPay(
  containers: number,
  firstRate: number,
  additionalRate: number
): number {
  const count = Math.max(1, Math.floor(containers));
  return firstRate + Math.max(0, count - 1) * additionalRate;
}

export function calculateResidentialPerBinPay(
  bins: number,
  settings: Pick<CompensationSettings, "residentialFirstBinPay" | "residentialAdditionalBinPay">
): number {
  return calculatePerContainerPay(
    bins,
    settings.residentialFirstBinPay,
    settings.residentialAdditionalBinPay
  );
}

export function calculateCommercialPerContainerPay(
  containers: number,
  settings: Pick<
    CompensationSettings,
    "commercialFirstContainerPay" | "commercialAdditionalContainerPay"
  >
): number {
  return calculatePerContainerPay(
    containers,
    settings.commercialFirstContainerPay,
    settings.commercialAdditionalContainerPay
  );
}

export function getJobCommercialBonuses(data: Record<string, unknown>): JobCommercialBonuses {
  const raw = data.employeeCompensationBonuses;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const bonuses: JobCommercialBonuses = {};
  for (const type of COMMERCIAL_BONUS_TYPES) {
    const value = Number((raw as Record<string, unknown>)[type]);
    if (Number.isFinite(value) && value > 0) {
      bonuses[type] = Math.round(value * 100) / 100;
    }
  }
  return bonuses;
}

export function sumJobCommercialBonuses(
  bonuses: JobCommercialBonuses,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  const total = COMMERCIAL_BONUS_TYPES.reduce((sum, type) => {
    const value = Number(bonuses[type] || 0);
    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  const capped =
    settings.maxCommercialJobBonus > 0
      ? Math.min(total, settings.maxCommercialJobBonus)
      : total;

  return Math.round(capped * 100) / 100;
}

export function getJobCompensationOverride(data: Record<string, unknown>): number | null {
  const override = Number(data.employeeCompensationOverride);
  if (Number.isFinite(override) && override >= 0) {
    return Math.round(override * 100) / 100;
  }
  return null;
}

export function calculateBaseJobCompensationAmount(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
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
      if (category === "commercial") return settings.commercialFirstContainerPay;
      return settings.residentialFirstBinPay;
    case "per_bin":
    default:
      if (category === "dumpster") return settings.dumpsterPay;
      if (category === "commercial") {
        const laborRevenue = Number(
          data.customerPrice || data.price || data.jobPrice || data.invoiceLabor || 0
        );
        if (laborRevenue > 0) {
          const commission = laborRevenue * 0.2;
          return Math.max(30, Math.round(commission * 100) / 100);
        }
        return Math.round(calculateCommercialPerContainerPay(bins, settings) * 100) / 100;
      }
      return Math.round(calculateResidentialPerBinPay(bins, settings) * 100) / 100;
  }
}

export function buildCompensationBreakdown(
  data: Record<string, unknown>,
  settings: CompensationSettings
): CompensationBreakdown {
  const category = getJobCompensationCategory(data);
  const bins = getBinsFromCleaning(data);
  const baseAmount = calculateBaseJobCompensationAmount(data, settings);
  const bonuses = category === "commercial" ? getJobCommercialBonuses(data) : {};
  const bonusTotal = category === "commercial" ? sumJobCommercialBonuses(bonuses, settings) : 0;
  const suggestedAmount = Math.round((baseAmount + bonusTotal) * 100) / 100;
  const overrideAmount = getJobCompensationOverride(data);

  if (category === "dumpster") {
    return {
      category,
      bins,
      payModel: settings.payModel,
      firstBinRate: settings.dumpsterPay,
      additionalBinRate: 0,
      formula: "Flat dumpster pay",
      baseAmount,
      bonusTotal: 0,
      bonuses: {},
      suggestedAmount,
      overrideAmount,
      overrideReason: String(data.employeeCompensationOverrideReason || "") || null,
    };
  }

  if (category === "commercial") {
    return {
      category,
      bins,
      payModel: settings.payModel,
      firstBinRate: settings.commercialFirstContainerPay,
      additionalBinRate: settings.commercialAdditionalContainerPay,
      formula: "First container + additional containers",
      baseAmount,
      bonusTotal,
      bonuses,
      suggestedAmount,
      overrideAmount,
      overrideReason: String(data.employeeCompensationOverrideReason || "") || null,
    };
  }

  return {
    category,
    bins,
    payModel: settings.payModel,
    firstBinRate: settings.residentialFirstBinPay,
    additionalBinRate: settings.residentialAdditionalBinPay,
    formula: "First bin + additional bins",
    baseAmount,
    bonusTotal: 0,
    bonuses: {},
    suggestedAmount,
    overrideAmount,
    overrideReason: String(data.employeeCompensationOverrideReason || "") || null,
  };
}

export function calculateJobCompensationAmount(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  if (!isJobEligibleForCompensation(data, settings)) {
    return 0;
  }

  const breakdown = buildCompensationBreakdown(data, settings);
  const override = breakdown.overrideAmount;
  if (override != null) {
    return override;
  }

  return breakdown.suggestedAmount ?? 0;
}

export function getJobCompensationAmount(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  const normalized = {
    ...data,
    jobStatus: data.jobStatus || "completed",
    status: data.status || "completed",
  };

  if (!isJobEligibleForCompensation(normalized, settings)) {
    return 0;
  }

  return calculateJobCompensationAmount(normalized, settings);
}

export function getDisplayJobEarnings(
  data: Record<string, unknown>,
  settings: CompensationSettings = DEFAULT_COMPENSATION_SETTINGS
): number {
  return getJobCompensationAmount(data, settings);
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

export function buildCommercialCompensationPreview(
  settings: CompensationSettings,
  containerCounts = [1, 2, 3, 5, 10, 20, 50]
): Array<{ containers: number; amount: number }> {
  return containerCounts.map((containers) => ({
    containers,
    amount: Math.round(calculateCommercialPerContainerPay(containers, settings) * 100) / 100,
  }));
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

function sanitizeCommercialBonusDefaults(
  input: Partial<CommercialBonusDefaults> | null | undefined
): CommercialBonusDefaults {
  const defaults = DEFAULT_COMMERCIAL_BONUS_DEFAULTS;
  const next = { ...defaults };

  if (!input || typeof input !== "object") {
    return next;
  }

  for (const type of COMMERCIAL_BONUS_TYPES) {
    next[type] = sanitizeNumber(input[type], defaults[type]);
  }

  return next;
}

export function mergeCompensationSettings(
  input: Partial<CompensationSettings> | null | undefined
): CompensationSettings {
  const defaults = DEFAULT_COMPENSATION_SETTINGS;

  if (!input || typeof input !== "object") {
    return { ...defaults, commercialBonusDefaults: { ...defaults.commercialBonusDefaults } };
  }

  const payModel = COMPENSATION_PAY_MODELS.includes(input.payModel as CompensationPayModel)
    ? (input.payModel as CompensationPayModel)
    : defaults.payModel;

  const legacyCommercial = sanitizeNumber(input.commercialBinPay, 0, 0);
  const commercialFirstContainerPay = sanitizeNumber(
    input.commercialFirstContainerPay ??
      (legacyCommercial > 0 ? legacyCommercial : defaults.commercialFirstContainerPay),
    defaults.commercialFirstContainerPay
  );
  const commercialAdditionalContainerPay = sanitizeNumber(
    input.commercialAdditionalContainerPay ?? defaults.commercialAdditionalContainerPay,
    defaults.commercialAdditionalContainerPay
  );

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
    commercialFirstContainerPay,
    commercialAdditionalContainerPay,
    dumpsterPay: sanitizeNumber(input.dumpsterPay, defaults.dumpsterPay),
    hourlyRate: sanitizeNumber(input.hourlyRate, defaults.hourlyRate),
    flatDailyRate: sanitizeNumber(input.flatDailyRate, defaults.flatDailyRate),
    weeklyBonus: sanitizeNumber(input.weeklyBonus, defaults.weeklyBonus),
    monthlyBonus: sanitizeNumber(input.monthlyBonus, defaults.monthlyBonus),
    holidayBonus: sanitizeNumber(input.holidayBonus, defaults.holidayBonus),
    referralBonus: sanitizeNumber(input.referralBonus, defaults.referralBonus),
    performanceBonus: sanitizeNumber(input.performanceBonus, defaults.performanceBonus),
    maxDailyBonus: sanitizeNumber(input.maxDailyBonus, defaults.maxDailyBonus),
    commercialBonusDefaults: sanitizeCommercialBonusDefaults(input.commercialBonusDefaults),
    maxCommercialJobBonus: sanitizeNumber(
      input.maxCommercialJobBonus,
      defaults.maxCommercialJobBonus,
      50000
    ),
    customerSignatureRequired: sanitizeBoolean(
      input.customerSignatureRequired,
      defaults.customerSignatureRequired
    ),
    managerApprovalRequired: sanitizeBoolean(
      input.managerApprovalRequired,
      defaults.managerApprovalRequired
    ),
    commercialManagerApprovalRequired: sanitizeBoolean(
      input.commercialManagerApprovalRequired,
      defaults.commercialManagerApprovalRequired
    ),
  };
}
