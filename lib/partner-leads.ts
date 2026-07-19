import { getPartnerTierDefinition } from "@/lib/partner-types";

export const SITE_LEAD_ID_STORAGE_KEY = "siteLeadId";

export type LeadAssignmentSource = "partner_code" | "territory" | "admin" | "unassigned";

export interface PartnerRecordForAssignment {
  id: string;
  businessName?: string;
  referralCode?: string;
  partnerCode?: string;
  status?: string;
  partnerTier?: string;
  serviceAreas?: string[];
  receivesLeads?: boolean;
}

export interface LeadAssignmentResult {
  assignedPartnerId: string | null;
  assignedPartnerName: string | null;
  assignmentSource: LeadAssignmentSource;
}

function normalizeCode(value?: string | null): string {
  return String(value || "").trim().toUpperCase();
}

function partnerReceivesLeads(partner: PartnerRecordForAssignment): boolean {
  if (typeof partner.receivesLeads === "boolean") {
    return partner.receivesLeads;
  }
  return getPartnerTierDefinition(partner.partnerTier).receivesLeads;
}

export function partnerMatchesCode(
  partner: PartnerRecordForAssignment,
  partnerCode?: string | null
): boolean {
  const code = normalizeCode(partnerCode);
  if (!code) return false;
  return (
    normalizeCode(partner.referralCode) === code ||
    normalizeCode(partner.partnerCode) === code
  );
}

export function partnerMatchesTerritory(
  partner: PartnerRecordForAssignment,
  city?: string | null,
  zipCode?: string | null
): boolean {
  const areas = partner.serviceAreas || [];
  if (areas.length === 0) return false;

  const cityLower = String(city || "").trim().toLowerCase();
  const zipLower = String(zipCode || "").trim().toLowerCase();

  return areas.some((area) => {
    const areaLower = String(area).trim().toLowerCase();
    if (!areaLower) return false;
    if (cityLower && (areaLower === cityLower || cityLower.includes(areaLower) || areaLower.includes(cityLower))) {
      return true;
    }
    if (zipLower && areaLower === zipLower) {
      return true;
    }
    return false;
  });
}

export function resolveLeadAssignment(
  partners: PartnerRecordForAssignment[],
  options: {
    partnerCode?: string | null;
    city?: string | null;
    zipCode?: string | null;
    assignedPartnerId?: string | null;
  }
): LeadAssignmentResult {
  if (options.assignedPartnerId) {
    const assigned = partners.find((partner) => partner.id === options.assignedPartnerId);
    if (assigned && assigned.status === "active") {
      return {
        assignedPartnerId: assigned.id,
        assignedPartnerName: assigned.businessName || "Partner",
        assignmentSource: "admin",
      };
    }
  }

  const activePartners = partners.filter((partner) => partner.status === "active");

  if (options.partnerCode) {
    const matched = activePartners.find(
      (partner) =>
        partnerMatchesCode(partner, options.partnerCode) && partnerReceivesLeads(partner)
    );
    if (matched) {
      return {
        assignedPartnerId: matched.id,
        assignedPartnerName: matched.businessName || "Partner",
        assignmentSource: "partner_code",
      };
    }
  }

  if (options.city || options.zipCode) {
    const territoryMatches = activePartners.filter(
      (partner) => partnerReceivesLeads(partner) && partnerMatchesTerritory(partner, options.city, options.zipCode)
    );
    if (territoryMatches.length === 1) {
      return {
        assignedPartnerId: territoryMatches[0].id,
        assignedPartnerName: territoryMatches[0].businessName || "Partner",
        assignmentSource: "territory",
      };
    }
  }

  return {
    assignedPartnerId: null,
    assignedPartnerName: null,
    assignmentSource: "unassigned",
  };
}

export function persistSiteLeadId(leadId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SITE_LEAD_ID_STORAGE_KEY, leadId);
}

export function getPersistedSiteLeadId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SITE_LEAD_ID_STORAGE_KEY) || "";
}

export function clearPersistedSiteLeadId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SITE_LEAD_ID_STORAGE_KEY);
}

export function serializeLeadForPartner(data: Record<string, unknown>, id: string) {
  const serializeTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object" && value !== null && "toDate" in value) {
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      if (maybeDate instanceof Date) return maybeDate.toISOString();
    }
    return null;
  };

  return {
    id,
    name: String(data.name || ""),
    email: String(data.email || ""),
    phone: String(data.phone || ""),
    referredBy: String(data.referredBy || ""),
    heardAboutUs: String(data.heardAboutUs || ""),
    partnerCode: String(data.partnerCode || ""),
    status: String(data.status || "new"),
    notes: String(data.notes || ""),
    serviceCity: String(data.serviceCity || ""),
    serviceZipCode: String(data.serviceZipCode || ""),
    assignmentSource: String(data.assignmentSource || ""),
    convertedBookingId: String(data.convertedBookingId || ""),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}
