export type JobEconomicsCategory = "residential" | "commercial";

export type MarginStatus =
  | "strong_margin"
  | "acceptable_margin"
  | "low_margin"
  | "owner_approval_required"
  | "unprofitable";

export type PartnerCompensationModel = "none" | "referral" | "service";

export type StaffRole = "owner" | "admin" | "operator" | "employee" | "partner" | "customer";

export type DifficultyPayType =
  | "heavy_grease"
  | "severe_buildup"
  | "difficult_access"
  | "extra_containers"
  | "long_hose_distance"
  | "after_hours"
  | "rush_service"
  | "special_equipment"
  | "additional_labor";

export interface MarginThresholds {
  targetPercent: number;
  warningPercent: number;
  ownerApprovalPercent: number;
}

export interface ProfitFirstSettings {
  residentialFirstBinPayCents: number;
  residentialAdditionalBinPayCents: number;
  commercialLaborCommissionPercent: number;
  commercialMinimumPayoutCents: number;
  commercialLaborPercentWarning: number;
  commercialLaborPercentOwnerApproval: number;
  payrollBurdenPercent: number;
  defaultOperatingCostPerStopCents: number;
  defaultChemicalsPerStopCents: number;
  defaultFuelPerStopCents: number;
  defaultWaterPerStopCents: number;
  defaultEquipmentPerStopCents: number;
  defaultDisposalPerStopCents: number;
  referralSignupCommissionCents: number;
  referralCommissionMinCents: number;
  referralCommissionMaxCents: number;
  recurringPartnerCommissionPercent: number;
  recurringPartnerCommissionMonths: number;
  minimumCompanyRetentionCents: number;
  minimumContributionMarginPercent: number;
  servicePartnerMaxRevenueSharePercent: number;
  residentialMargins: MarginThresholds;
  commercialMargins: MarginThresholds;
  routeLaunchStops: number;
  routeHealthyStops: number;
  routeStrongStops: number;
  routeMinProfitPerHourCents: number;
  routeMinProfitPerStopCents: number;
  performanceBonusEnabled: boolean;
}

export const DEFAULT_PROFIT_FIRST_SETTINGS: ProfitFirstSettings = {
  residentialFirstBinPayCents: 800,
  residentialAdditionalBinPayCents: 300,
  commercialLaborCommissionPercent: 20,
  commercialMinimumPayoutCents: 3000,
  commercialLaborPercentWarning: 30,
  commercialLaborPercentOwnerApproval: 35,
  payrollBurdenPercent: 15,
  defaultOperatingCostPerStopCents: 500,
  defaultChemicalsPerStopCents: 100,
  defaultFuelPerStopCents: 150,
  defaultWaterPerStopCents: 50,
  defaultEquipmentPerStopCents: 50,
  defaultDisposalPerStopCents: 150,
  referralSignupCommissionCents: 1000,
  referralCommissionMinCents: 500,
  referralCommissionMaxCents: 1500,
  recurringPartnerCommissionPercent: 5,
  recurringPartnerCommissionMonths: 6,
  minimumCompanyRetentionCents: 1200,
  minimumContributionMarginPercent: 30,
  servicePartnerMaxRevenueSharePercent: 60,
  residentialMargins: {
    targetPercent: 50,
    warningPercent: 40,
    ownerApprovalPercent: 30,
  },
  commercialMargins: {
    targetPercent: 45,
    warningPercent: 35,
    ownerApprovalPercent: 30,
  },
  routeLaunchStops: 5,
  routeHealthyStops: 10,
  routeStrongStops: 15,
  routeMinProfitPerHourCents: 4000,
  routeMinProfitPerStopCents: 800,
  performanceBonusEnabled: true,
};

export const DIFFICULTY_PAY_LABELS: Record<DifficultyPayType, string> = {
  heavy_grease: "Heavy grease",
  severe_buildup: "Severe buildup",
  difficult_access: "Difficult access",
  extra_containers: "Extra containers",
  long_hose_distance: "Long hose distance",
  after_hours: "After-hours service",
  rush_service: "Rush service",
  special_equipment: "Special equipment",
  additional_labor: "Additional approved labor",
};

export const MARGIN_STATUS_LABELS: Record<MarginStatus, string> = {
  strong_margin: "Strong Margin",
  acceptable_margin: "Acceptable Margin",
  low_margin: "Low Margin",
  owner_approval_required: "Owner Approval Required",
  unprofitable: "Unprofitable",
};

export const OWNER_OVERRIDE_REASONS = [
  "Entering a new neighborhood",
  "Building route density",
  "Acquiring a valuable commercial account",
  "Promotional customer acquisition",
  "Testing a new market",
] as const;

export type OwnerOverrideReason = (typeof OWNER_OVERRIDE_REASONS)[number];

function clampNumber(value: unknown, fallback: number, min = 0, max = 1_000_000): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function mergeMarginThresholds(
  input: Partial<MarginThresholds> | undefined,
  defaults: MarginThresholds
): MarginThresholds {
  return {
    targetPercent: clampNumber(input?.targetPercent, defaults.targetPercent, 0, 100),
    warningPercent: clampNumber(input?.warningPercent, defaults.warningPercent, 0, 100),
    ownerApprovalPercent: clampNumber(
      input?.ownerApprovalPercent,
      defaults.ownerApprovalPercent,
      0,
      100
    ),
  };
}

export function mergeProfitFirstSettings(
  input: Partial<ProfitFirstSettings> | null | undefined
): ProfitFirstSettings {
  const defaults = DEFAULT_PROFIT_FIRST_SETTINGS;
  if (!input || typeof input !== "object") {
    return { ...defaults };
  }

  const referralSignupCommissionCents = clampNumber(
    input.referralSignupCommissionCents,
    defaults.referralSignupCommissionCents,
    defaults.referralCommissionMinCents,
    defaults.referralCommissionMaxCents
  );

  return {
    residentialFirstBinPayCents: clampNumber(
      input.residentialFirstBinPayCents,
      defaults.residentialFirstBinPayCents,
      100,
      100000
    ),
    residentialAdditionalBinPayCents: clampNumber(
      input.residentialAdditionalBinPayCents,
      defaults.residentialAdditionalBinPayCents,
      0,
      100000
    ),
    commercialLaborCommissionPercent: clampNumber(
      input.commercialLaborCommissionPercent,
      defaults.commercialLaborCommissionPercent,
      0,
      100
    ),
    commercialMinimumPayoutCents: clampNumber(
      input.commercialMinimumPayoutCents,
      defaults.commercialMinimumPayoutCents,
      0,
      1000000
    ),
    commercialLaborPercentWarning: clampNumber(
      input.commercialLaborPercentWarning,
      defaults.commercialLaborPercentWarning,
      0,
      100
    ),
    commercialLaborPercentOwnerApproval: clampNumber(
      input.commercialLaborPercentOwnerApproval,
      defaults.commercialLaborPercentOwnerApproval,
      0,
      100
    ),
    payrollBurdenPercent: clampNumber(
      input.payrollBurdenPercent,
      defaults.payrollBurdenPercent,
      0,
      100
    ),
    defaultOperatingCostPerStopCents: clampNumber(
      input.defaultOperatingCostPerStopCents,
      defaults.defaultOperatingCostPerStopCents,
      0,
      100000
    ),
    defaultChemicalsPerStopCents: clampNumber(
      input.defaultChemicalsPerStopCents,
      defaults.defaultChemicalsPerStopCents,
      0,
      100000
    ),
    defaultFuelPerStopCents: clampNumber(
      input.defaultFuelPerStopCents,
      defaults.defaultFuelPerStopCents,
      0,
      100000
    ),
    defaultWaterPerStopCents: clampNumber(
      input.defaultWaterPerStopCents,
      defaults.defaultWaterPerStopCents,
      0,
      100000
    ),
    defaultEquipmentPerStopCents: clampNumber(
      input.defaultEquipmentPerStopCents,
      defaults.defaultEquipmentPerStopCents,
      0,
      100000
    ),
    defaultDisposalPerStopCents: clampNumber(
      input.defaultDisposalPerStopCents,
      defaults.defaultDisposalPerStopCents,
      0,
      100000
    ),
    referralSignupCommissionCents,
    referralCommissionMinCents: clampNumber(
      input.referralCommissionMinCents,
      defaults.referralCommissionMinCents,
      0,
      100000
    ),
    referralCommissionMaxCents: clampNumber(
      input.referralCommissionMaxCents,
      defaults.referralCommissionMaxCents,
      0,
      100000
    ),
    recurringPartnerCommissionPercent: clampNumber(
      input.recurringPartnerCommissionPercent,
      defaults.recurringPartnerCommissionPercent,
      0,
      100
    ),
    recurringPartnerCommissionMonths: clampNumber(
      input.recurringPartnerCommissionMonths,
      defaults.recurringPartnerCommissionMonths,
      0,
      24
    ),
    minimumCompanyRetentionCents: clampNumber(
      input.minimumCompanyRetentionCents,
      defaults.minimumCompanyRetentionCents,
      0,
      1000000
    ),
    minimumContributionMarginPercent: clampNumber(
      input.minimumContributionMarginPercent,
      defaults.minimumContributionMarginPercent,
      0,
      100
    ),
    servicePartnerMaxRevenueSharePercent: clampNumber(
      input.servicePartnerMaxRevenueSharePercent,
      defaults.servicePartnerMaxRevenueSharePercent,
      0,
      100
    ),
    residentialMargins: mergeMarginThresholds(input.residentialMargins, defaults.residentialMargins),
    commercialMargins: mergeMarginThresholds(input.commercialMargins, defaults.commercialMargins),
    routeLaunchStops: clampNumber(input.routeLaunchStops, defaults.routeLaunchStops, 1, 100),
    routeHealthyStops: clampNumber(input.routeHealthyStops, defaults.routeHealthyStops, 1, 100),
    routeStrongStops: clampNumber(input.routeStrongStops, defaults.routeStrongStops, 1, 100),
    routeMinProfitPerHourCents: clampNumber(
      input.routeMinProfitPerHourCents,
      defaults.routeMinProfitPerHourCents,
      0,
      1000000
    ),
    routeMinProfitPerStopCents: clampNumber(
      input.routeMinProfitPerStopCents,
      defaults.routeMinProfitPerStopCents,
      0,
      1000000
    ),
    performanceBonusEnabled:
      typeof input.performanceBonusEnabled === "boolean"
        ? input.performanceBonusEnabled
        : defaults.performanceBonusEnabled,
  };
}
