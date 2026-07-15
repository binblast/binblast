import { CURB_PLACEMENT_MESSAGE } from "@/lib/cleaning-readiness";
import {
  formatEmailDate,
  getCustomerDashboardUrl,
  getEmailSubject,
  getEmailTemplateId,
  getStaffLoginUrl,
} from "@/lib/email-template-config";

export const EMAIL_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || "https://www.binblastco.com/bin-blast-email-logo.png";

export const PARTNER_APPROVAL_TEMPLATE_ID = "template_lm4wzqr";

export const PARTNER_APPROVAL_TEMPLATE_FALLBACKS = [
  PARTNER_APPROVAL_TEMPLATE_ID,
] as const;

export function getPartnerApprovalTemplateCandidates(): string[] {
  const envId = getEmailTemplateId("PARTNER_APPROVAL");
  return [...new Set([envId, ...PARTNER_APPROVAL_TEMPLATE_FALLBACKS])];
}

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
    const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!emailjsPublicKey) {
      console.warn("[EmailJS] Public key not configured");
      return { success: false, error: "EmailJS not configured" };
    }

    const emailjsUrl = "https://api.emailjs.com/api/v1.0/email/send";
    const emailPayload: Record<string, unknown> = {
      service_id: emailjsServiceId,
      template_id: templateId,
      user_id: emailjsPublicKey,
      template_params: templateParams,
    };

    if (emailjsPrivateKey) {
      emailPayload.accessToken = emailjsPrivateKey;
    }

    const response = await fetch(emailjsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.NEXT_PUBLIC_BASE_URL || "https://www.binblastco.com",
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
  const templateId = getEmailTemplateId("PARTNER_APPLICATION");

  sendEmailJS(templateId, {
    to_email: adminEmail,
    email_subject: getEmailSubject("PARTNER_APPLICATION", {
      businessName: applicationData.businessName,
    }),
    logoUrl: EMAIL_LOGO_URL,
    ...applicationData,
  }).catch((error) => {
    console.error("[Notify Admin] Failed to send email:", error);
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
  partnerId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const templateParams = {
    to_email: partnerData.email,
    email: partnerData.email,
    email_subject: getEmailSubject("PARTNER_APPROVAL"),
    ownerName: partnerData.ownerName,
    businessName: partnerData.businessName,
    referralCode: partnerData.referralCode,
    serviceAreas: partnerData.serviceAreas,
    revenueSharePartner: `${(partnerData.revenueSharePartner * 100).toFixed(0)}`,
    revenueSharePlatform: `${(partnerData.revenueSharePlatform * 100).toFixed(0)}`,
    signupLink: partnerData.signupLink,
    partnerId: partnerData.partnerId || "",
    logoUrl: EMAIL_LOGO_URL,
  };

  let lastError = "Failed to send approval email";
  for (const templateId of getPartnerApprovalTemplateCandidates()) {
    const result = await sendEmailJS(templateId, templateParams);
    if (result.success) {
      return result;
    }

    lastError = result.error || lastError;
    const normalized = lastError.toLowerCase();
    if (!(normalized.includes("template") && normalized.includes("not found"))) {
      console.error("[Notify Partner] Failed to send approval email:", lastError);
      return result;
    }
    console.warn("[Notify Partner] Template not found, trying next:", templateId);
  }

  console.error("[Notify Partner] Failed to send approval email:", lastError);
  return {
    success: false,
    error: `${lastError} Set NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL in Vercel to your EmailJS template ID.`,
  };
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
  const templateId = getEmailTemplateId("TEAM_MEMBER_INVITATION");
  const loginLink = teamMemberData.loginLink || getStaffLoginUrl("employee");

  try {
    let payRateDisplay = "";
    if (teamMemberData.payRate) {
      payRateDisplay = `$${teamMemberData.payRate.toFixed(2)} per trash can`;
    }

    await sendEmailJS(templateId, {
      to_email: teamMemberData.email,
      email_subject: getEmailSubject("TEAM_MEMBER_INVITATION"),
      firstName: teamMemberData.firstName || "",
      lastName: teamMemberData.lastName || "",
      email: teamMemberData.email || "",
      tempPassword: teamMemberData.tempPassword || "",
      partnerBusinessName: teamMemberData.partnerBusinessName || "Your Partner",
      serviceAreas: teamMemberData.serviceAreas || "Not assigned",
      payRate: payRateDisplay,
      loginLink,
      logoUrl: EMAIL_LOGO_URL,
    });
  } catch (error: any) {
    console.error("[Notify Team Member] Failed to send invitation email:", error?.message || error);
  }
}

/**
 * Send welcome email to new customer after account creation
 */
export async function notifyCustomerWelcome(customerData: {
  email: string;
  firstName: string;
  lastName: string;
  planName: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredServiceDate?: string;
  preferredDayOfWeek?: string;
  preferredTimeWindow?: string;
}): Promise<void> {
  const templateId = getEmailTemplateId("CUSTOMER_WELCOME");
  const dashboardLink = getCustomerDashboardUrl();

  const preferredDateFormatted = customerData.preferredServiceDate
    ? new Date(customerData.preferredServiceDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const addressLine2Display = customerData.addressLine2 ? `<br>${customerData.addressLine2}` : "";
  const preferredDayDisplay = customerData.preferredDayOfWeek
    ? `Every ${customerData.preferredDayOfWeek}`
    : "";

  const hasPreferredDate = !!customerData.preferredServiceDate;
  const confirmationTitle = hasPreferredDate
    ? "✅ Confirm Your Cleaning Date"
    : "What's Next?";

  const confirmationMessage = hasPreferredDate
    ? `We're ready to schedule your first cleaning! Based on your preferences, we've selected <strong>${preferredDateFormatted}</strong> as your preferred cleaning day.<br><br>Please click the button below to confirm this date or choose a different one that works better for you.`
    : `You can now log in to your customer dashboard to view your service schedule, manage your account, and track your cleanings.<br><br>Visit your dashboard to schedule your first cleaning at your convenience.`;

  const confirmationDetails = hasPreferredDate
    ? `<p style="margin: 0 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;"><strong>Monthly Schedule:</strong> ${preferredDayDisplay}</p>`
    : "";

  const buttonText = hasPreferredDate ? "Confirm Your Cleaning Date" : "Access Your Dashboard";
  const buttonClass = hasPreferredDate ? "email-btn-green" : "email-btn-blue";

  try {
    await sendEmailJS(templateId, {
      to_email: customerData.email,
      email_subject: getEmailSubject("CUSTOMER_WELCOME"),
      firstName: customerData.firstName || "",
      lastName: customerData.lastName || "",
      planName: customerData.planName || "Your Plan",
      addressLine1: customerData.addressLine1 || "",
      addressLine2: addressLine2Display,
      city: customerData.city || "",
      state: customerData.state || "",
      zipCode: customerData.zipCode || "",
      preferredServiceDate: preferredDateFormatted || "Not set",
      preferredTimeWindow: customerData.preferredTimeWindow || "Morning",
      preferredDayOfWeek: preferredDayDisplay || "Not set",
      confirmationTitle,
      confirmationMessage,
      confirmationDetails,
      buttonText,
      buttonClass,
      dashboardLink,
      logoUrl: EMAIL_LOGO_URL,
    });
  } catch (error: any) {
    console.error("[Notify Customer Welcome] Failed to send welcome email:", error?.message || error);
  }
}

/**
 * Send confirmation email after customer schedules/confirms cleaning date
 */
export async function notifyCleaningScheduled(customerData: {
  email: string;
  firstName: string;
  lastName: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  preferredDayOfWeek?: string;
  planName?: string;
  binsCount?: number;
}): Promise<void> {
  const templateId = getEmailTemplateId("CLEANING_SCHEDULED");
  const dashboardLink = getCustomerDashboardUrl();

  const scheduledDateFormatted = new Date(customerData.scheduledDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const addressLine2Display = customerData.addressLine2 ? `<br>${customerData.addressLine2}` : "";
  const preferredDayDisplay = customerData.preferredDayOfWeek
    ? `Every ${customerData.preferredDayOfWeek}`
    : "Not set";

  try {
    await sendEmailJS(templateId, {
      to_email: customerData.email,
      email_subject: getEmailSubject("CLEANING_SCHEDULED"),
      firstName: customerData.firstName || "",
      lastName: customerData.lastName || "",
      scheduledDate: scheduledDateFormatted,
      scheduledTime: customerData.scheduledTime || "",
      addressLine1: customerData.addressLine1 || "",
      addressLine2: addressLine2Display,
      city: customerData.city || "",
      state: customerData.state || "",
      zipCode: customerData.zipCode || "",
      preferredDayOfWeek: preferredDayDisplay,
      planName: customerData.planName || "Your Plan",
      binsCount: String(customerData.binsCount || 1),
      curbPlacementReminder: CURB_PLACEMENT_MESSAGE,
      dashboardLink,
      logoUrl: EMAIL_LOGO_URL,
    });
  } catch (error: any) {
    console.error("[Notify Cleaning Scheduled] Failed to send confirmation email:", error?.message || error);
  }
}

/**
 * Send a branded transactional email using the generic EmailJS template.
 */
export async function sendBrandedTransactionalEmail(params: {
  to: string;
  firstName: string;
  lastName?: string;
  subject: string;
  messageHtml: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
}): Promise<{ success: boolean; error?: string }> {
  const dashboardLink = params.buttonUrl || getCustomerDashboardUrl();
  return sendEmailJS(getEmailTemplateId("GENERIC_MESSAGE"), {
    to_email: params.to,
    email_subject: params.subject,
    firstName: params.firstName || "there",
    lastName: params.lastName || "",
    planName: "Bin Blast Co.",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    confirmationTitle: params.subject,
    confirmationMessage: params.messageHtml,
    confirmationDetails: "",
    buttonText: params.buttonText || "Visit Bin Blast Co.",
    buttonColor: params.buttonColor || "#16a34a",
    dashboardLink,
    preferredServiceDate: "",
    preferredTimeWindow: "",
    preferredDayOfWeek: "",
    logoUrl: EMAIL_LOGO_URL,
  });
}

/**
 * Notify customer when Stripe invoice payment fails.
 */
export async function notifyPaymentFailed(customerData: {
  email: string;
  firstName: string;
  lastName?: string;
  planName?: string;
  amountDue: string;
}): Promise<void> {
  sendEmailJS(getEmailTemplateId("PAYMENT_FAILED"), {
    to_email: customerData.email,
    email_subject: getEmailSubject("PAYMENT_FAILED"),
    firstName: customerData.firstName,
    planName: customerData.planName || "Your plan",
    amountDue: customerData.amountDue,
    dashboardLink: getCustomerDashboardUrl(),
    logoUrl: EMAIL_LOGO_URL,
  }).catch((error) => {
    console.error("[Notify Payment Failed] Failed to send email:", error?.message || error);
  });
}

/**
 * Notify customer after a cleaning is marked complete.
 */
export async function notifyCleaningComplete(customerData: {
  email: string;
  firstName: string;
  lastName?: string;
  completedDate: string;
  nextCleaningDate?: string | null;
}): Promise<void> {
  sendEmailJS(getEmailTemplateId("CLEANING_COMPLETE"), {
    to_email: customerData.email,
    email_subject: getEmailSubject("CLEANING_COMPLETE"),
    firstName: customerData.firstName,
    completedDate: formatEmailDate(customerData.completedDate),
    nextCleaningDate: formatEmailDate(customerData.nextCleaningDate),
    dashboardLink: getCustomerDashboardUrl(),
    logoUrl: EMAIL_LOGO_URL,
  }).catch((error) => {
    console.error("[Notify Cleaning Complete] Failed to send email:", error?.message || error);
  });
}

/**
 * Notify partner applicant when their application is rejected.
 */
export async function notifyPartnerRejection(partnerData: {
  email: string;
  ownerName: string;
  businessName: string;
  reason?: string | null;
}): Promise<void> {
  sendEmailJS(getEmailTemplateId("PARTNER_REJECTION"), {
    to_email: partnerData.email,
    email_subject: getEmailSubject("PARTNER_REJECTION"),
    ownerName: partnerData.ownerName,
    businessName: partnerData.businessName,
    rejectionReason:
      partnerData.reason?.trim() ||
      "We've decided not to move forward at this time based on our current partner criteria.",
    logoUrl: EMAIL_LOGO_URL,
  }).catch((error) => {
    console.error("[Notify Partner Rejection] Failed to send email:", error?.message || error);
  });
}

/**
 * Notify owner/admin-created staff account with login credentials.
 */
export async function notifyBinBlastStaffInvitation(staffData: {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  role: "employee" | "operator";
  serviceAreas?: string[];
  payRatePerJob?: number;
}): Promise<void> {
  const loginLink = getStaffLoginUrl(staffData.role);

  await notifyTeamMemberInvitation({
    email: staffData.email,
    firstName: staffData.firstName,
    lastName: staffData.lastName,
    tempPassword: staffData.tempPassword,
    partnerBusinessName: "Bin Blast Co.",
    serviceAreas: staffData.serviceAreas?.length ? staffData.serviceAreas.join(", ") : undefined,
    payRate: staffData.payRatePerJob,
    loginLink,
  });
}
