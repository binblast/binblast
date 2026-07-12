export const REFERRAL_CODE_STORAGE_KEY = "siteLeadReferralCode";

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
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
    if (partner) return partner;
  }

  return "";
}
