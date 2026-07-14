import emailjs from "@emailjs/browser";

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
  return {
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h",
    templateId:
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL || "template_t2vtftu",
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "",
    configured: Boolean(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY),
  };
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
  const { serviceId, templateId, publicKey, configured } = getPartnerApprovalEmailConfig();

  if (!configured) {
    return {
      success: false,
      error:
        "EmailJS public key is missing in production. Add NEXT_PUBLIC_EMAILJS_PUBLIC_KEY in Vercel and redeploy.",
    };
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
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
      },
      { publicKey }
    );

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatEmailJSError(error) };
  }
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
      `${typeof window !== "undefined" ? window.location.origin : "https://www.binblastco.com"}/register?partner=true`,
    partnerId: input.partnerId,
  };
}
