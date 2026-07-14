export type PartnerLinkSource = {
  referralCode?: string | null;
  partnerCode?: string | null;
  bookingLinkSlug?: string | null;
};

export function resolvePartnerCode(partner?: PartnerLinkSource | null): string {
  if (!partner) return "";
  const code = partner.referralCode || partner.partnerCode || partner.bookingLinkSlug || "";
  return String(code).trim().toUpperCase();
}

export function buildPartnerBookingLink(origin: string, partnerCode: string): string {
  const code = String(partnerCode).trim().toUpperCase();
  if (!code) return `${origin}/#pricing`;
  return `${origin}/?partner=${encodeURIComponent(code)}#pricing`;
}

export function buildPartnerTeamLoginLink(origin: string): string {
  return `${origin}/login?redirect=${encodeURIComponent("/employee/dashboard")}`;
}
