export type PartnerTier = "referral" | "operator" | "overflow" | "license";

export interface PartnerTierDefinition {
  label: string;
  description: string;
  revenueSharePartner: number;
  revenueSharePlatform: number;
  referralFeePercent: number;
  acceptsOverflow: boolean;
  receivesLeads: boolean;
}

export const PARTNER_TIER_DEFINITIONS: Record<PartnerTier, PartnerTierDefinition> = {
  referral: {
    label: "Referral Partner",
    description: "Sends out-of-area leads and earns a referral fee on conversions.",
    revenueSharePartner: 0.15,
    revenueSharePlatform: 0.85,
    referralFeePercent: 0.15,
    acceptsOverflow: false,
    receivesLeads: false,
  },
  operator: {
    label: "Operator Partner",
    description: "Full local operator — booking link, crew, and territory leads.",
    revenueSharePartner: 0.6,
    revenueSharePlatform: 0.4,
    referralFeePercent: 0.15,
    acceptsOverflow: false,
    receivesLeads: true,
  },
  overflow: {
    label: "Overflow Partner",
    description: "Picks up extra jobs when capacity allows.",
    revenueSharePartner: 0.75,
    revenueSharePlatform: 0.25,
    referralFeePercent: 0.15,
    acceptsOverflow: true,
    receivesLeads: true,
  },
  license: {
    label: "License Partner",
    description: "Expanded territory partner with stronger revenue share.",
    revenueSharePartner: 0.8,
    revenueSharePlatform: 0.2,
    referralFeePercent: 0.15,
    acceptsOverflow: false,
    receivesLeads: true,
  },
};

export const PARTNER_TIER_OPTIONS = Object.entries(PARTNER_TIER_DEFINITIONS).map(
  ([value, def]) => ({
    value: value as PartnerTier,
    label: def.label,
    description: def.description,
  })
);

export function isPartnerTier(value: unknown): value is PartnerTier {
  return typeof value === "string" && value in PARTNER_TIER_DEFINITIONS;
}

export function getPartnerTierDefinition(tier?: string | null): PartnerTierDefinition {
  if (isPartnerTier(tier)) {
    return PARTNER_TIER_DEFINITIONS[tier];
  }
  return PARTNER_TIER_DEFINITIONS.operator;
}

export function getDefaultRevenueSplitForTier(tier?: string | null): {
  revenueSharePartner: number;
  revenueSharePlatform: number;
} {
  const def = getPartnerTierDefinition(tier);
  return {
    revenueSharePartner: def.revenueSharePartner,
    revenueSharePlatform: def.revenueSharePlatform,
  };
}

export type SiteLeadStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "converted"
  | "lost"
  | "archived"
  | "spam";

export type PartnerReferralStatus =
  | "pending"
  | "assigned"
  | "converted"
  | "rejected"
  | "paid";

export const PARTNER_LEAD_STATUS_OPTIONS: { value: SiteLeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export const PARTNER_UPDATABLE_LEAD_STATUSES = new Set<SiteLeadStatus>([
  "contacted",
  "quoted",
  "lost",
]);
