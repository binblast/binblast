import { normalizeReferralCode } from "@/lib/referral-code-format";

export const REFERRAL_CODE_STORAGE_KEY = "siteLeadReferralCode";
export const PARTNER_CODE_STORAGE_KEY = "siteLeadPartnerCode";

export { normalizeReferralCode };

export function persistCapturedPartnerCode(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return;
  sessionStorage.setItem(PARTNER_CODE_STORAGE_KEY, normalized);
}

export function getCapturedPartnerCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(PARTNER_CODE_STORAGE_KEY) || "";
}

export function persistCapturedReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  sessionStorage.setItem(REFERRAL_CODE_STORAGE_KEY, normalized);
}

export function getCapturedReferralCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(REFERRAL_CODE_STORAGE_KEY) || "";
}

function getReferralCodeFromSearch(search: string): string {
  if (!search) return "";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const code = params.get("ref");
  return code ? normalizeReferralCode(code) : "";
}

/**
 * Referral links often land as /#pricing?ref=CODE where ref is in the hash,
 * not in window.location.search. Parse search, hash, then session storage.
 */
export function getReferralCodeFromLocation(location?: Location): string {
  if (typeof window === "undefined" && !location) return "";

  const current = location || window.location;
  const fromSearch = getReferralCodeFromSearch(current.search);
  if (fromSearch) return fromSearch;

  const hash = current.hash || "";
  const hashQueryIndex = hash.indexOf("?");
  if (hashQueryIndex >= 0) {
    const fromHash = getReferralCodeFromSearch(hash.slice(hashQueryIndex));
    if (fromHash) return fromHash;
  }

  return getCapturedReferralCode();
}

export function captureReferralCodeFromLocation(location?: Location): string {
  const code = getReferralCodeFromLocation(location);
  if (code) {
    persistCapturedReferralCode(code);
  }
  return code;
}

export function getPartnerCodeFromLocation(location?: Location): string {
  if (typeof window === "undefined" && !location) return "";

  const current = location || window.location;
  const sources = [current.search];

  const hash = current.hash || "";
  const hashQueryIndex = hash.indexOf("?");
  if (hashQueryIndex >= 0) {
    sources.push(hash.slice(hashQueryIndex));
  }

  for (const source of sources) {
    const params = new URLSearchParams(source.startsWith("?") ? source.slice(1) : source);
    const partner = params.get("partner")?.trim();
    if (partner) return partner.toUpperCase();
  }

  return getCapturedPartnerCode();
}

export function capturePartnerCodeFromLocation(location?: Location): string {
  const code = getPartnerCodeFromLocation(location);
  if (code) {
    persistCapturedPartnerCode(code);
  }
  return code;
}

/** Build a query string from stored partner/referral codes for link preservation. */
export function getStoredAttributionQuery(): string {
  const partner = getCapturedPartnerCode();
  const ref = getCapturedReferralCode();
  const params = new URLSearchParams();
  if (partner) {
    params.set("partner", partner);
  } else if (ref) {
    params.set("ref", ref);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Home/pricing links that keep partner or referral attribution in the URL. */
export function buildAttributedHomeHref(sectionId?: string): string {
  const query = getStoredAttributionQuery();
  const hash = sectionId ? `#${sectionId}` : "";
  return `/${query}${hash}`;
}
