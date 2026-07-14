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

/**
 * Send partner approval email from the browser via EmailJS.
 * Client-side delivery is used because it matches the working partner-apply flow.
 */
export async function sendPartnerApprovalEmailClient(
  params: PartnerApprovalEmailParams
): Promise<{ success: boolean; error?: string }> {
  const emailjsServiceId =
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
  const templateId =
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL || "template_t2vtftu";
  const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!emailjsPublicKey) {
    return { success: false, error: "EmailJS public key not configured" };
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: emailjsServiceId,
        template_id: templateId,
        user_id: emailjsPublicKey,
        template_params: {
          to_email: params.email,
          email: params.email,
          ownerName: params.ownerName,
          businessName: params.businessName,
          referralCode: params.referralCode,
          serviceAreas: params.serviceAreas,
          revenueSharePartner: String(params.revenueSharePartner),
          revenueSharePlatform: String(params.revenueSharePlatform),
          signupLink: params.signupLink,
          partnerId: params.partnerId || "",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send approval email",
    };
  }
}
