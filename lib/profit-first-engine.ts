import {
  DEFAULT_PROFIT_FIRST_SETTINGS,
  MARGIN_STATUS_LABELS,
  mergeProfitFirstSettings,
  type DifficultyPayType,
  type JobEconomicsCategory,
  type MarginStatus,
  type MarginThresholds,
  type PartnerCompensationModel,
  type ProfitFirstSettings,
  type StaffRole,
} from "@/lib/profit-first-settings";

export type PartnerCommissionStatus =
  | "not_applicable"
  | "pending"
  | "payable"
  | "paid"
  | "cancelled"
  | "clawed_back";

export interface DifficultyPayAdjustment {
  type: DifficultyPayType;
  amountCents: number;
  reason: string;
}

export interface DirectJobCostBreakdown {
  employeePayCents: number;
  payrollBurdenCents: number;
  partnerCommissionCents: number;
  chemicalsCents: number;
  fuelCents: number;
  waterCents: number;
  equipmentAllocationCents: number;
  disposalCents: number;
  subcontractorCostCents: number;
  otherDirectCostCents: number;
  difficultyPayCents: number;
  totalCents: number;
}

export interface CollectedRevenueBreakdown {
  customerPaymentCents: number;
  refundsCents: number;
  discountsCents: number;
  creditsCents: number;
  paymentProcessingFeesCents: number;
  collectedRevenueCents: number;
}

export interface LaborRevenueBreakdown {
  invoiceLaborCents: number;
  excludedCents: number;
  commissionableLaborCents: number;
}

export interface JobEconomicsInput {
  category: JobEconomicsCategory;
  bins?: number;
  customerPaymentCents: number;
  paymentCollected?: boolean;
  refundsCents?: number;
  discountsCents?: number;
  creditsCents?: number;
  paymentProcessingFeesCents?: number;
  invoiceLaborCents?: number;
  laborRevenueExclusionsCents?: number;
  partnerModel?: PartnerCompensationModel;
  partnerCommissionCents?: number;
  servicePartnerRevenueSharePercent?: number;
  servicePartnerProvidesLabor?: boolean;
  servicePartnerProvidesVehicle?: boolean;
  firstServiceCompleted?: boolean;
  paymentCleared?: boolean;
  refundHoldPassed?: boolean;
  partnerCommissionStatus?: PartnerCommissionStatus;
  jobCompleted?: boolean;
  completionDocsSubmitted?: boolean;
  requiresRework?: boolean;
  employeePayOverrideCents?: number | null;
  difficultyAdjustments?: DifficultyPayAdjustment[];
  chemicalsCents?: number;
  fuelCents?: number;
  waterCents?: number;
  equipmentAllocationCents?: number;
  disposalCents?: number;
  subcontractorCostCents?: number;
  otherDirectCostCents?: number;
  mileageCostCents?: number;
  ownerOverrideApproved?: boolean;
  ownerOverrideReason?: string | null;
}

export interface JobEconomicsResult {
  category: JobEconomicsCategory;
  bins: number;
  collectedRevenue: CollectedRevenueBreakdown;
  laborRevenue: LaborRevenueBreakdown | null;
  employeePayCents: number;
  employeeLaborPercentOfRevenue: number | null;
  employeeLaborWarning: "none" | "warning" | "owner_approval_required";
  partnerModel: PartnerCompensationModel;
  partnerCommissionCents: number;
  partnerCommissionStatus: PartnerCommissionStatus;
  partnerCommissionPayable: boolean;
  directCosts: DirectJobCostBreakdown;
  contributionProfitCents: number;
  contributionMarginPercent: number;
  marginStatus: MarginStatus;
  approvalRequired: boolean;
  autoApproved: boolean;
  companyRetentionCents: number;
  plainLanguage: JobEconomicsPlainLanguage;
}

export interface JobEconomicsPlainLanguage {
  customerPays: string;
  employeeEarns: string;
  partnerEarns: string;
  otherDirectCosts: string;
  binBlastKeeps: string;
  contributionMargin: string;
  approvalStatus: string;
}

export interface PricingFloorInput {
  category: JobEconomicsCategory;
  estimatedDirectCostCents: number;
  targetMarginPercent?: number;
}

export interface PricingFloorResult {
  estimatedDirectCostCents: number;
  targetMarginPercent: number;
  minimumProfitablePriceCents: number;
  recommendedPriceCents: number;
  expectedContributionProfitCents: number;
  expectedContributionMarginPercent: number;
}

export interface RouteStopEconomicsInput {
  job: JobEconomicsInput;
  driveMinutesFromPrevious?: number;
}

export interface RouteEconomicsInput {
  stops: RouteStopEconomicsInput[];
  routeHours?: number;
  totalMiles?: number;
  fuelCostCents?: number;
}

export interface RouteEconomicsResult {
  customers: number;
  totalBins: number;
  collectedRevenueCents: number;
  employeePayCents: number;
  partnerCommissionsCents: number;
  mileageCostCents: number;
  fuelCostCents: number;
  chemicalCostCents: number;
  totalDirectCostCents: number;
  contributionProfitCents: number;
  contributionMarginPercent: number;
  profitPerStopCents: number;
  profitPerRouteHourCents: number | null;
  revenuePerRouteHourCents: number | null;
  warnings: string[];
  routeHealthLabel: string;
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateCollectedRevenue(input: JobEconomicsInput): CollectedRevenueBreakdown {
  const customerPaymentCents = Math.max(0, input.customerPaymentCents || 0);
  const refundsCents = Math.max(0, input.refundsCents || 0);
  const discountsCents = Math.max(0, input.discountsCents || 0);
  const creditsCents = Math.max(0, input.creditsCents || 0);
  const paymentProcessingFeesCents = Math.max(0, input.paymentProcessingFeesCents || 0);

  const collectedRevenueCents = input.paymentCollected === false
    ? 0
    : Math.max(
        0,
        customerPaymentCents -
          refundsCents -
          discountsCents -
          creditsCents -
          paymentProcessingFeesCents
      );

  return {
    customerPaymentCents,
    refundsCents,
    discountsCents,
    creditsCents,
    paymentProcessingFeesCents,
    collectedRevenueCents,
  };
}

export function calculateCommissionableLaborRevenue(input: JobEconomicsInput): LaborRevenueBreakdown {
  const invoiceLaborCents = Math.max(0, input.invoiceLaborCents ?? input.customerPaymentCents ?? 0);
  const excludedCents = Math.max(0, input.laborRevenueExclusionsCents || 0);
  const commissionableLaborCents = Math.max(0, invoiceLaborCents - excludedCents);

  return {
    invoiceLaborCents,
    excludedCents,
    commissionableLaborCents,
  };
}

export function calculateResidentialEmployeePayCents(
  bins: number,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  const count = Math.max(1, Math.floor(bins || 1));
  return (
    settings.residentialFirstBinPayCents +
    Math.max(0, count - 1) * settings.residentialAdditionalBinPayCents
  );
}

export function calculateCommercialEmployeePayCents(
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  const labor = calculateCommissionableLaborRevenue(input);
  const commission =
    (labor.commissionableLaborCents * settings.commercialLaborCommissionPercent) / 100;
  const difficultyTotal = sumDifficultyAdjustments(input.difficultyAdjustments);
  const basePay = Math.max(settings.commercialMinimumPayoutCents, Math.round(commission));
  return basePay + difficultyTotal;
}

export function sumDifficultyAdjustments(
  adjustments: DifficultyPayAdjustment[] | undefined
): number {
  if (!adjustments?.length) return 0;
  return adjustments.reduce((sum, item) => sum + Math.max(0, item.amountCents || 0), 0);
}

export function isEmployeePayEligible(input: JobEconomicsInput): boolean {
  if (input.requiresRework) return false;
  if (input.jobCompleted === false) return false;
  if (input.completionDocsSubmitted === false) return false;
  return true;
}

export function calculateEmployeePayCents(
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  if (!isEmployeePayEligible(input)) return 0;

  if (input.employeePayOverrideCents != null && input.employeePayOverrideCents >= 0) {
    return Math.round(input.employeePayOverrideCents);
  }

  if (input.category === "commercial") {
    return calculateCommercialEmployeePayCents(input, settings);
  }

  return calculateResidentialEmployeePayCents(input.bins || 1, settings);
}

export function calculateReferralPartnerCommissionCents(
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  if (input.partnerModel !== "referral") return 0;
  if (input.category !== "residential") return 0;
  return settings.referralSignupCommissionCents;
}

export function calculateServicePartnerCommissionCents(
  collectedRevenueCents: number,
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  if (input.partnerModel !== "service") return 0;

  const sharePercent = Math.min(
    settings.servicePartnerMaxRevenueSharePercent,
    Math.max(0, input.servicePartnerRevenueSharePercent ?? 0)
  );

  return Math.round((collectedRevenueCents * sharePercent) / 100);
}

export function resolvePartnerCommissionStatus(
  input: JobEconomicsInput
): PartnerCommissionStatus {
  if (input.partnerModel === "none") return "not_applicable";
  if (input.partnerCommissionStatus) return input.partnerCommissionStatus;

  if (!input.paymentCollected || !input.firstServiceCompleted || !input.paymentCleared) {
    return "pending";
  }

  if (!input.refundHoldPassed) {
    return "pending";
  }

  return "payable";
}

export function isPartnerCommissionPayable(
  input: JobEconomicsInput,
  commissionCents: number
): boolean {
  if (commissionCents <= 0) return false;

  const status = resolvePartnerCommissionStatus(input);
  if (status === "cancelled" || status === "clawed_back" || status === "not_applicable") {
    return false;
  }

  return status === "payable" || status === "paid";
}

export function calculatePartnerCommissionCents(
  collectedRevenueCents: number,
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): number {
  if (input.partnerCommissionCents != null && input.partnerCommissionCents >= 0) {
    return Math.round(input.partnerCommissionCents);
  }

  if (input.partnerModel === "referral") {
    return calculateReferralPartnerCommissionCents(input, settings);
  }

  if (input.partnerModel === "service") {
    return calculateServicePartnerCommissionCents(collectedRevenueCents, input, settings);
  }

  return 0;
}

export function calculateDefaultOperatingCosts(
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): {
  chemicalsCents: number;
  fuelCents: number;
  waterCents: number;
  equipmentAllocationCents: number;
  disposalCents: number;
  otherDirectCostCents: number;
} {
  if (
    input.chemicalsCents != null ||
    input.fuelCents != null ||
    input.waterCents != null ||
    input.equipmentAllocationCents != null ||
    input.disposalCents != null ||
    input.otherDirectCostCents != null
  ) {
    return {
      chemicalsCents: input.chemicalsCents ?? settings.defaultChemicalsPerStopCents,
      fuelCents: input.fuelCents ?? settings.defaultFuelPerStopCents,
      waterCents: input.waterCents ?? settings.defaultWaterPerStopCents,
      equipmentAllocationCents:
        input.equipmentAllocationCents ?? settings.defaultEquipmentPerStopCents,
      disposalCents: input.disposalCents ?? settings.defaultDisposalPerStopCents,
      otherDirectCostCents: input.otherDirectCostCents ?? 0,
    };
  }

  const lineItemTotal =
    settings.defaultChemicalsPerStopCents +
    settings.defaultFuelPerStopCents +
    settings.defaultWaterPerStopCents +
    settings.defaultEquipmentPerStopCents +
    settings.defaultDisposalPerStopCents;

  if (lineItemTotal > 0) {
    return {
      chemicalsCents: settings.defaultChemicalsPerStopCents,
      fuelCents: settings.defaultFuelPerStopCents,
      waterCents: settings.defaultWaterPerStopCents,
      equipmentAllocationCents: settings.defaultEquipmentPerStopCents,
      disposalCents: settings.defaultDisposalPerStopCents,
      otherDirectCostCents: 0,
    };
  }

  return {
    chemicalsCents: 0,
    fuelCents: 0,
    waterCents: 0,
    equipmentAllocationCents: 0,
    disposalCents: 0,
    otherDirectCostCents: settings.defaultOperatingCostPerStopCents,
  };
}

export function calculateDirectJobCosts(
  input: JobEconomicsInput,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): DirectJobCostBreakdown {
  const collected = calculateCollectedRevenue(input);
  const employeePayCents = calculateEmployeePayCents(input, settings);
  const payrollBurdenCents = Math.round(
    (employeePayCents * settings.payrollBurdenPercent) / 100
  );
  const partnerCommissionCents = calculatePartnerCommissionCents(
    collected.collectedRevenueCents,
    input,
    settings
  );
  const operating = calculateDefaultOperatingCosts(input, settings);
  const difficultyPayCents = sumDifficultyAdjustments(input.difficultyAdjustments);

  const totalCents =
    employeePayCents +
    payrollBurdenCents +
    partnerCommissionCents +
    operating.chemicalsCents +
    operating.fuelCents +
    operating.waterCents +
    operating.equipmentAllocationCents +
    operating.disposalCents +
    (input.subcontractorCostCents || 0) +
    operating.otherDirectCostCents +
    difficultyPayCents;

  return {
    employeePayCents,
    payrollBurdenCents,
    partnerCommissionCents,
    chemicalsCents: operating.chemicalsCents,
    fuelCents: operating.fuelCents,
    waterCents: operating.waterCents,
    equipmentAllocationCents: operating.equipmentAllocationCents,
    disposalCents: operating.disposalCents,
    subcontractorCostCents: input.subcontractorCostCents || 0,
    otherDirectCostCents: operating.otherDirectCostCents,
    difficultyPayCents,
    totalCents,
  };
}

export function getMarginThresholds(
  category: JobEconomicsCategory,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): MarginThresholds {
  return category === "commercial"
    ? settings.commercialMargins
    : settings.residentialMargins;
}

export function getMarginStatus(
  contributionMarginPercent: number,
  category: JobEconomicsCategory,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS,
  ownerOverrideApproved = false
): MarginStatus {
  if (ownerOverrideApproved) {
    if (contributionMarginPercent <= 0) {
      return contributionMarginPercent < 0 ? "owner_approval_required" : "acceptable_margin";
    }
    return contributionMarginPercent >= getMarginThresholds(category, settings).targetPercent
      ? "strong_margin"
      : "acceptable_margin";
  }

  if (contributionMarginPercent <= 0) {
    return "unprofitable";
  }

  const thresholds = getMarginThresholds(category, settings);

  if (contributionMarginPercent >= thresholds.targetPercent) {
    return "strong_margin";
  }

  if (contributionMarginPercent >= thresholds.warningPercent) {
    return "acceptable_margin";
  }

  if (contributionMarginPercent >= thresholds.ownerApprovalPercent) {
    return "low_margin";
  }

  return "owner_approval_required";
}

export function evaluateEmployeeLaborPercentWarning(
  employeePayCents: number,
  collectedRevenueCents: number,
  settings: ProfitFirstSettings = DEFAULT_PROFIT_FIRST_SETTINGS
): {
  percent: number | null;
  warning: "none" | "warning" | "owner_approval_required";
} {
  if (collectedRevenueCents <= 0) {
    return { percent: null, warning: "none" };
  }

  const percentValue = (employeePayCents / collectedRevenueCents) * 100;

  if (percentValue > settings.commercialLaborPercentOwnerApproval) {
    return { percent: percentValue, warning: "owner_approval_required" };
  }

  if (percentValue > settings.commercialLaborPercentWarning) {
    return { percent: percentValue, warning: "warning" };
  }

  return { percent: percentValue, warning: "none" };
}

export function calculateJobEconomics(
  input: JobEconomicsInput,
  settingsInput?: Partial<ProfitFirstSettings>
): JobEconomicsResult {
  const settings = mergeProfitFirstSettings(settingsInput);
  const collected = calculateCollectedRevenue(input);
  const directCosts = calculateDirectJobCosts(input, settings);
  const contributionProfitCents = collected.collectedRevenueCents - directCosts.totalCents;
  const contributionMarginPercent =
    collected.collectedRevenueCents > 0
      ? (contributionProfitCents / collected.collectedRevenueCents) * 100
      : 0;

  const partnerModel = input.partnerModel || "none";
  const partnerCommissionStatus = resolvePartnerCommissionStatus(input);
  const partnerCommissionPayable = isPartnerCommissionPayable(
    input,
    directCosts.partnerCommissionCents
  );
  const companyRetentionCents = contributionProfitCents;
  const violatesMinimumRetention =
    companyRetentionCents < settings.minimumCompanyRetentionCents;
  const violatesMinimumMargin =
    contributionMarginPercent < settings.minimumContributionMarginPercent;

  let marginStatus = getMarginStatus(
    contributionMarginPercent,
    input.category,
    settings,
    input.ownerOverrideApproved === true
  );

  if (
    (violatesMinimumRetention || violatesMinimumMargin) &&
    marginStatus !== "unprofitable" &&
    !input.ownerOverrideApproved
  ) {
    marginStatus = "owner_approval_required";
  }

  const employeeLabor = evaluateEmployeeLaborPercentWarning(
    directCosts.employeePayCents,
    collected.collectedRevenueCents,
    settings
  );

  const approvalRequired =
    marginStatus === "owner_approval_required" ||
    marginStatus === "unprofitable" ||
    employeeLabor.warning === "owner_approval_required";

  const autoApproved =
    !approvalRequired &&
    marginStatus !== "unprofitable" &&
    partnerCommissionPayable !== false;

  const plainLanguage = buildPlainLanguageSummary({
    collectedRevenueCents: collected.collectedRevenueCents,
    employeePayCents: directCosts.employeePayCents,
    partnerCommissionCents: directCosts.partnerCommissionCents,
    directCosts,
    contributionProfitCents,
    contributionMarginPercent,
    marginStatus,
    approvalRequired,
  });

  return {
    category: input.category,
    bins: Math.max(1, Math.floor(input.bins || 1)),
    collectedRevenue: collected,
    laborRevenue:
      input.category === "commercial"
        ? calculateCommissionableLaborRevenue(input)
        : null,
    employeePayCents: directCosts.employeePayCents,
    employeeLaborPercentOfRevenue: employeeLabor.percent,
    employeeLaborWarning: employeeLabor.warning,
    partnerModel,
    partnerCommissionCents: directCosts.partnerCommissionCents,
    partnerCommissionStatus,
    partnerCommissionPayable,
    directCosts,
    contributionProfitCents,
    contributionMarginPercent,
    marginStatus,
    approvalRequired,
    autoApproved,
    companyRetentionCents,
    plainLanguage,
  };
}

export function buildPlainLanguageSummary(params: {
  collectedRevenueCents: number;
  employeePayCents: number;
  partnerCommissionCents: number;
  directCosts: DirectJobCostBreakdown;
  contributionProfitCents: number;
  contributionMarginPercent: number;
  marginStatus: MarginStatus;
  approvalRequired: boolean;
}): JobEconomicsPlainLanguage {
  const otherDirectCostsCents =
    params.directCosts.totalCents -
    params.directCosts.employeePayCents -
    params.directCosts.partnerCommissionCents;

  return {
    customerPays: dollars(params.collectedRevenueCents),
    employeeEarns: dollars(params.employeePayCents),
    partnerEarns: dollars(params.partnerCommissionCents),
    otherDirectCosts: dollars(otherDirectCostsCents),
    binBlastKeeps: dollars(params.contributionProfitCents),
    contributionMargin: percent(params.contributionMarginPercent),
    approvalStatus: params.approvalRequired
      ? `${MARGIN_STATUS_LABELS[params.marginStatus]} — approval required`
      : MARGIN_STATUS_LABELS[params.marginStatus],
  };
}

export function calculatePricingFloor(
  input: PricingFloorInput,
  settingsInput?: Partial<ProfitFirstSettings>
): PricingFloorResult {
  const settings = mergeProfitFirstSettings(settingsInput);
  const thresholds = getMarginThresholds(input.category, settings);
  const targetMarginPercent = input.targetMarginPercent ?? thresholds.targetPercent;
  const safeTarget = Math.min(Math.max(targetMarginPercent, 1), 99) / 100;
  const minimumProfitablePriceCents = Math.ceil(input.estimatedDirectCostCents / (1 - safeTarget));
  const recommendedPriceCents = Math.ceil(minimumProfitablePriceCents * 1.08);
  const expectedContributionProfitCents = recommendedPriceCents - input.estimatedDirectCostCents;
  const expectedContributionMarginPercent =
    recommendedPriceCents > 0
      ? (expectedContributionProfitCents / recommendedPriceCents) * 100
      : 0;

  return {
    estimatedDirectCostCents: input.estimatedDirectCostCents,
    targetMarginPercent,
    minimumProfitablePriceCents,
    recommendedPriceCents,
    expectedContributionProfitCents,
    expectedContributionMarginPercent,
  };
}

export function calculateRouteEconomics(
  input: RouteEconomicsInput,
  settingsInput?: Partial<ProfitFirstSettings>
): RouteEconomicsResult {
  const settings = mergeProfitFirstSettings(settingsInput);
  const warnings: string[] = [];
  const jobResults = input.stops.map((stop) =>
    calculateJobEconomics(stop.job, settings)
  );

  const customers = jobResults.length;
  const totalBins = jobResults.reduce((sum, job) => sum + job.bins, 0);
  const collectedRevenueCents = jobResults.reduce(
    (sum, job) => sum + job.collectedRevenue.collectedRevenueCents,
    0
  );
  const employeePayCents = jobResults.reduce(
    (sum, job) => sum + job.employeePayCents,
    0
  );
  const partnerCommissionsCents = jobResults.reduce(
    (sum, job) => sum + job.partnerCommissionCents,
    0
  );
  const chemicalCostCents = jobResults.reduce(
    (sum, job) => sum + job.directCosts.chemicalsCents,
    0
  );
  const fuelCostCents =
    input.fuelCostCents ??
    jobResults.reduce((sum, job) => sum + job.directCosts.fuelCents, 0);
  const mileageCostCents = input.totalMiles
    ? Math.round(input.totalMiles * 67)
    : 0;
  const totalDirectCostCents =
    jobResults.reduce((sum, job) => sum + job.directCosts.totalCents, 0) +
    mileageCostCents;
  const contributionProfitCents = collectedRevenueCents - totalDirectCostCents;
  const contributionMarginPercent =
    collectedRevenueCents > 0
      ? (contributionProfitCents / collectedRevenueCents) * 100
      : 0;
  const profitPerStopCents =
    customers > 0 ? Math.round(contributionProfitCents / customers) : 0;
  const routeHours = input.routeHours && input.routeHours > 0 ? input.routeHours : null;
  const profitPerRouteHourCents = routeHours
    ? Math.round(contributionProfitCents / routeHours)
    : null;
  const revenuePerRouteHourCents = routeHours
    ? Math.round(collectedRevenueCents / routeHours)
    : null;

  const longDrives = input.stops.filter(
    (stop) => (stop.driveMinutesFromPrevious || 0) > 20
  ).length;
  if (longDrives > 0) {
    warnings.push("Too much driving between stops");
  }

  if (customers < settings.routeLaunchStops) {
    warnings.push("Too few customers on route");
  }

  if (
    profitPerRouteHourCents != null &&
    profitPerRouteHourCents < settings.routeMinProfitPerHourCents
  ) {
    warnings.push("Low profit per route hour");
  }

  if (profitPerStopCents < settings.routeMinProfitPerStopCents) {
    warnings.push("Low profit per stop");
  }

  if (employeePayCents > collectedRevenueCents * 0.35) {
    warnings.push("Excessive labor cost");
  }

  if (contributionProfitCents < 0) {
    warnings.push("Negative route profit");
  }

  let routeHealthLabel = "Needs improvement";
  if (customers >= settings.routeStrongStops) {
    routeHealthLabel = "Strong route";
  } else if (customers >= settings.routeHealthyStops) {
    routeHealthLabel = "Healthy route";
  } else if (customers >= settings.routeLaunchStops) {
    routeHealthLabel = "Launch route";
  }

  return {
    customers,
    totalBins,
    collectedRevenueCents,
    employeePayCents,
    partnerCommissionsCents,
    mileageCostCents,
    fuelCostCents,
    chemicalCostCents,
    totalDirectCostCents,
    contributionProfitCents,
    contributionMarginPercent,
    profitPerStopCents,
    profitPerRouteHourCents,
    revenuePerRouteHourCents,
    warnings,
    routeHealthLabel,
  };
}

export function canViewCompanyMargins(role: StaffRole): boolean {
  return role === "owner" || role === "admin" || role === "operator";
}

export function canEditProfitSettings(role: StaffRole): boolean {
  return role === "owner" || role === "admin";
}

export function canApproveLowMarginJobs(role: StaffRole): boolean {
  return role === "owner";
}

export function canManagerApproveWithinLimits(role: StaffRole): boolean {
  return role === "owner" || role === "admin" || role === "operator";
}

export function canViewOwnCompensation(role: StaffRole): boolean {
  return role === "employee" || role === "owner" || role === "admin" || role === "operator";
}

export function canViewPartnerCommissions(role: StaffRole): boolean {
  return role === "partner" || role === "owner" || role === "admin" || role === "operator";
}

export {
  DEFAULT_PROFIT_FIRST_SETTINGS,
  MARGIN_STATUS_LABELS,
  mergeProfitFirstSettings,
};
