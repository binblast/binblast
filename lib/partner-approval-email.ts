import emailjs from "@emailjs/browser";
import {
  EMAIL_LOGO_URL,
  getPartnerApprovalTemplateCandidates,
} from "@/lib/email-utils";

export { getPartnerApprovalTemplateCandidates, PARTNER_APPROVAL_TEMPLATE_FALLBACKS } from "@/lib/email-utils";

export function buildPartnerSignupLink(input: {
  email: string;
  partnerId?: string;
  baseUrl?: string;
}) {
  const base =
    input.baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "https://www.binblastco.com");
  const params = new URLSearchParams({
    partner: "true",
    email: input.email,
  });
  if (input.partnerId) {
    params.set("partnerId", input.partnerId);
  }
  return `${base}/register?${params.toString()}`;
}

export interface PartnerApprovalEmailParams {
  email: string;
  ownerName: string;
  businessName: string;
  referralCode: string;
  serviceAreas: string;
  revenueSharePartner: number;
  revenueSharePlatform: number;
  signupLink: string;
  partnerId?: string;
}

function formatSharePercent(value: number): string {
  const percent = value <= 1 ? value * 100 : value;
  return String(Math.round(percent));
}

export function getPartnerApprovalEmailConfig() {
  const templateIds = getPartnerApprovalTemplateCandidates();
  return {
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h",
    templateId: templateIds[0],
    templateIds,
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "",
    configured: Boolean(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY),
  };
}

function isTemplateNotFoundError(error: unknown): boolean {
  const message = formatEmailJSError(error).toLowerCase();
  return message.includes("template") && message.includes("not found");
}

function formatEmailJSError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybe = error as { text?: string; message?: string; status?: number };
    if (maybe.text) return maybe.text;
    if (maybe.message) return maybe.message;
    if (maybe.status) return `EmailJS request failed with status ${maybe.status}`;
  }
  return "Failed to send approval email";
}

/**
 * Send partner approval email from the browser via EmailJS.
 */
export async function sendPartnerApprovalEmailClient(
  params: PartnerApprovalEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { serviceId, templateIds, publicKey, configured } = getPartnerApprovalEmailConfig();

  if (!configured) {
    return {
      success: false,
      error:
        "EmailJS public key is missing in production. Add NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in Vercel and redeploy.",
    };
  }

  const templateParams = {
    to_email: params.email,
    email: params.email,
    ownerName: params.ownerName,
    businessName: params.businessName,
    referralCode: params.referralCode,
    serviceAreas: params.serviceAreas,
    revenueSharePartner: formatSharePercent(params.revenueSharePartner),
    revenueSharePlatform: formatSharePercent(params.revenueSharePlatform),
    signupLink: params.signupLink,
    partnerId: params.partnerId || "",
    logoUrl: EMAIL_LOGO_URL,
  };

  let lastError = "Failed to send approval email";

  for (const templateId of templateIds) {
    try {
      await emailjs.send(serviceId, templateId, templateParams, { publicKey });
      return { success: true };
    } catch (error: unknown) {
      lastError = formatEmailJSError(error);
      console.warn("[Partner Approval Email] Template failed:", templateId, lastError);
      if (!isTemplateNotFoundError(error)) {
        return { success: false, error: `${lastError} (template: ${templateId})` };
      }
    }
  }

  return {
    success: false,
    error:
      `${lastError} Tried: ${templateIds.join(", ")}. Copy your real Template ID from https://dashboard.emailjs.com/admin/templates and set NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL in Vercel, then redeploy.`,
  };
}

export function buildPartnerApprovalEmailParams(input: {
  email: string;
  ownerName: string;
  businessName: string;
  referralCode: string;
  serviceAreas: string[] | string;
  revenueSharePartner: number;
  revenueSharePlatform: number;
  partnerId?: string;
  signupLink?: string;
}): PartnerApprovalEmailParams {
  const serviceAreas = Array.isArray(input.serviceAreas)
    ? input.serviceAreas.join(", ")
    : input.serviceAreas;

  return {
    email: input.email,
    ownerName: input.ownerName,
    businessName: input.businessName,
    referralCode: input.referralCode,
    serviceAreas,
    revenueSharePartner: input.revenueSharePartner,
    revenueSharePlatform: input.revenueSharePlatform,
    signupLink:
      input.signupLink ||
      buildPartnerSignupLink({
        email: input.email,
        partnerId: input.partnerId,
      }),
    partnerId: input.partnerId,
  };
}
