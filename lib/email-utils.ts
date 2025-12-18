// lib/email-utils.ts
// Helper functions for sending emails via EmailJS

export interface EmailParams {
  to_email: string;
  [key: string]: any;
}

/**
 * Send email via EmailJS (server-side)
 * Note: EmailJS server-side API calls must be enabled in EmailJS Dashboard → Account → General
 */
export async function sendEmailJS(
  templateId: string,
  templateParams: EmailParams,
  serviceId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailjsServiceId = serviceId || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_rok6u9h";
    const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!emailjsPublicKey) {
      console.warn("[EmailJS] Public key not configured");
      return { success: false, error: "EmailJS not configured" };
    }

    const emailjsUrl = "https://api.emailjs.com/api/v1.0/email/send";
    const emailPayload = {
      service_id: emailjsServiceId,
      template_id: templateId,
      user_id: emailjsPublicKey,
      template_params: templateParams,
    };

    const response = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EmailJS] Error:", {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 200),
      });
      return { success: false, error: errorText };
    }

    console.log("[EmailJS] Email sent successfully to:", templateParams.to_email);
    return { success: true };
  } catch (error: any) {
    console.error("[EmailJS] Send error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification to admin about new partner application
 */
export async function notifyAdminNewApplication(applicationData: {
  applicationId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceAreas: string;
  businessType: string;
  submittedAt: string;
}): Promise<void> {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "binblastcompany@gmail.com";
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION || "template_aabpctf";

  // Try to send email (non-blocking)
  sendEmailJS(templateId, {
    to_email: adminEmail,
    ...applicationData,
  }).catch((error) => {
    console.error("[Notify Admin] Failed to send email:", error);
    // Don't throw - email failure shouldn't block application submission
  });
}

/**
 * Send approval email to partner with signup link
 */
export async function notifyPartnerApproval(partnerData: {
  email: string;
  ownerName: string;
  businessName: string;
  referralCode: string;
  serviceAreas: string;
  revenueSharePartner: number;
  revenueSharePlatform: number;
  signupLink: string;
}): Promise<void> {
  // Hardcoded template ID for partner approval email
  const templateId = "template_lm4wzqr";

  // Try to send email (non-blocking)
  try {
    await sendEmailJS(templateId, {
      to_email: partnerData.email,
      ...partnerData,
      revenueSharePartner: `${(partnerData.revenueSharePartner * 100).toFixed(0)}`,
      revenueSharePlatform: `${(partnerData.revenueSharePlatform * 100).toFixed(0)}`,
    });
  } catch (error: any) {
    console.error("[Notify Partner] Failed to send approval email:", error?.message || error);
    // Don't throw - email failure shouldn't block approval
  }
}

/**
 * Send team member invitation email with temporary password and login link
 */
export async function notifyTeamMemberInvitation(teamMemberData: {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  partnerBusinessName: string;
  serviceAreas?: string;
  payRate?: number;
  loginLink?: string;
}): Promise<void> {
  // Hardcoded template ID for team member invitation email
  const templateId = "template_9796g8g";

  // Default login link if not provided - redirect to employee dashboard after login
  const loginLink = teamMemberData.loginLink || "https://binblast.vercel.app/login?redirect=/employee/dashboard";

  // Try to send email (non-blocking)
  try {
    await sendEmailJS(templateId, {
      to_email: teamMemberData.email,
      firstName: teamMemberData.firstName,
      lastName: teamMemberData.lastName,
      email: teamMemberData.email,
      tempPassword: teamMemberData.tempPassword,
      partnerBusinessName: teamMemberData.partnerBusinessName,
      serviceAreas: teamMemberData.serviceAreas || "",
      payRate: teamMemberData.payRate ? teamMemberData.payRate.toFixed(2) : "",
      loginLink: loginLink,
    });
  } catch (error: any) {
    console.error("[Notify Team Member] Failed to send invitation email:", error?.message || error);
    // Don't throw - email failure shouldn't block team member creation
  }
}
