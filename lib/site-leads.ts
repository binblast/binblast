import {
  capturePartnerCodeFromLocation,
  captureReferralCodeFromLocation,
  getCapturedPartnerCode,
  getCapturedReferralCode,
  getPartnerCodeFromLocation,
  getReferralCodeFromLocation,
  persistCapturedPartnerCode,
  persistCapturedReferralCode,
  REFERRAL_CODE_STORAGE_KEY,
} from "@/lib/referral-attribution";

export const SITE_LEAD_CAPTURE_DISMISSED_KEY = "siteLeadCaptureDismissed";
export const SITE_LEAD_CAPTURE_SUBMITTED_KEY = "siteLeadCaptureSubmitted";
export const SITE_LEAD_PROFILE_STORAGE_KEY = "siteLeadProfile";
export const SITE_LEAD_REFERRAL_CODE_KEY = REFERRAL_CODE_STORAGE_KEY;

export { persistCapturedReferralCode, getCapturedReferralCode, getCapturedPartnerCode };

export const HEARD_ABOUT_US_OPTIONS = [
  "Google Search",
  "Facebook / Instagram",
  "Friend or Family",
  "Neighbor / HOA",
  "Business or Partner Referral",
  "Flyer or Door Hanger",
  "Saw Our Truck",
  "Other",
] as const;

export type HeardAboutUsOption = (typeof HEARD_ABOUT_US_OPTIONS)[number];

export interface SiteLeadCapturePayload {
  name: string;
  email: string;
  phone: string;
  referredBy: string;
  heardAboutUs: string;
  referralCode?: string;
  partnerCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  pageReferrer?: string;
}

export interface SiteLeadAttribution {
  referralCode: string;
  partnerCode: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPage: string;
  pageReferrer: string;
}

export interface SiteLeadProfile {
  name: string;
  email: string;
  phone: string;
  heardAboutUs?: string;
  referredBy?: string;
}

export function persistSiteLeadProfile(profile: SiteLeadProfile): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SITE_LEAD_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function getSiteLeadProfile(): SiteLeadProfile | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SITE_LEAD_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SiteLeadProfile;
  } catch {
    return null;
  }
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function captureAttributionFromLocation(): SiteLeadAttribution {
  return getSiteLeadAttribution(typeof window !== "undefined" ? window.location.search : "");
}

export function persistAttributionFromLocation(): SiteLeadAttribution {
  const attribution = captureAttributionFromLocation();
  if (attribution.partnerCode) {
    persistCapturedPartnerCode(attribution.partnerCode);
  }
  if (attribution.referralCode) {
    persistCapturedReferralCode(attribution.referralCode);
  }
  return attribution;
}

export const SITE_LEAD_EXCLUDED_PATH_PREFIXES = [
  "/dashboard",
  "/admin",
  "/operator",
  "/employee",
  "/login",
  "/register",
  "/partners/dashboard",
  "/partners/apply",
];

export function shouldShowSiteLeadCapture(pathname: string): boolean {
  return !SITE_LEAD_EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function hasDismissedSiteLeadCapture(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SITE_LEAD_CAPTURE_DISMISSED_KEY) === "true";
}

export function hasSubmittedSiteLeadCapture(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SITE_LEAD_CAPTURE_SUBMITTED_KEY) === "true";
}

export function markSiteLeadCaptureDismissed(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SITE_LEAD_CAPTURE_DISMISSED_KEY, "true");
}

export function markSiteLeadCaptureSubmitted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SITE_LEAD_CAPTURE_SUBMITTED_KEY, "true");
}

export function getSiteLeadAttribution(search: string): SiteLeadAttribution {
  if (typeof window === "undefined") {
    return {
      referralCode: "",
      partnerCode: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      landingPage: "",
      pageReferrer: "",
    };
  }

  const params = new URLSearchParams(search);
  captureReferralCodeFromLocation();
  capturePartnerCodeFromLocation();
  const referralCode =
    params.get("ref") ||
    getReferralCodeFromLocation() ||
    getCapturedReferralCode() ||
    "";
  const partnerCode =
    params.get("partner") ||
    getPartnerCodeFromLocation() ||
    getCapturedPartnerCode() ||
    "";
  return {
    referralCode,
    partnerCode: partnerCode.toUpperCase(),
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    landingPage: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    pageReferrer: document.referrer || "",
  };
}

export function validateSiteLeadCapture(payload: SiteLeadCapturePayload): string | null {
  if (!payload.name.trim()) return "Name is required";
  if (!payload.email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) return "Enter a valid email address";
  if (!payload.phone.trim()) return "Phone number is required";
  if (!/^[\d\s\-().+]+$/.test(payload.phone.trim())) return "Enter a valid phone number";
  if (!payload.heardAboutUs.trim()) return "Please tell us how you heard about us";
  if (!payload.referredBy.trim()) return "Please tell us who referred you (or enter N/A)";
  return null;
}
