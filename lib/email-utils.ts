import { CURB_PLACEMENT_MESSAGE } from "@/lib/cleaning-readiness";
// Helper functions for sending emails via EmailJS

export const EMAIL_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || "https://www.binblastco.com/bin-blast-email-logo.png";

export const PARTNER_APPROVAL_TEMPLATE_ID = "template_lm4wzqr";

export const PARTNER_APPROVAL_TEMPLATE_FALLBACKS = [
  PARTNER_APPROVAL_TEMPLATE_ID,
] as const;

export function getPartnerApprovalTemplateCandidates(): string[] {
  const envId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL?.trim();
  return [...new Set([...(envId ? [envId] : []), ...PARTNER_APPROVAL_TEMPLATE_FALLBACKS])];
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
  partnerId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const templateParams = {
    to_email: partnerData.email,
    email: partnerData.email,
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
  // Hardcoded template ID for team member invitation email
  const templateId = "template_9796g8g";

  // Default login link if not provided - redirect to employee dashboard after login
  const loginLink = teamMemberData.loginLink || "https://binblast.vercel.app/login?redirect=/employee/dashboard";

  // Try to send email (non-blocking)
  try {
    // Format pay rate for display
    let payRateDisplay = "";
    if (teamMemberData.payRate) {
      payRateDisplay = `$${teamMemberData.payRate.toFixed(2)} per trash can`;
    }
    
    await sendEmailJS(templateId, {
      to_email: teamMemberData.email,
      firstName: teamMemberData.firstName || "",
      lastName: teamMemberData.lastName || "",
      email: teamMemberData.email || "",
      tempPassword: teamMemberData.tempPassword || "",
      partnerBusinessName: teamMemberData.partnerBusinessName || "Your Partner",
      serviceAreas: teamMemberData.serviceAreas || "Not assigned",
      payRate: payRateDisplay,
      loginLink: loginLink,
    });
  } catch (error: any) {
    console.error("[Notify Team Member] Failed to send invitation email:", error?.message || error);
    // Don't throw - email failure shouldn't block team member creation
  }
}

/**
 * Send welcome email to new customer after account creation
 * This email asks them to confirm their cleaning date
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
  // Hardcoded template ID for customer welcome email
  const templateId = "template_ent7lyj";

  const dashboardLink = "https://binblast.vercel.app/dashboard";

  // Format preferred service date for display (only if provided)
  const preferredDateFormatted = customerData.preferredServiceDate
    ? new Date(customerData.preferredServiceDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : "";

  // Format address line 2 for display (empty string if not provided)
  const addressLine2Display = customerData.addressLine2 ? `<br>${customerData.addressLine2}` : "";

  // Format preferred day of week for display (only if provided)
  const preferredDayDisplay = customerData.preferredDayOfWeek 
    ? `Every ${customerData.preferredDayOfWeek}`
    : "";

  // Determine email content based on whether preferredServiceDate exists
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
  
  const buttonText = hasPreferredDate
    ? "Confirm Your Cleaning Date"
    : "Access Your Dashboard";
  
  const buttonColor = hasPreferredDate
    ? "#16a34a"
    : "#2563eb";

  // Try to send email (non-blocking)
  try {
    await sendEmailJS(templateId, {
      to_email: customerData.email,
      firstName: customerData.firstName || "",
      lastName: customerData.lastName || "",
      planName: customerData.planName || "Your Plan",
      addressLine1: customerData.addressLine1 || "",
      addressLine2: addressLine2Display, // Pre-formatted with <br> if exists
      city: customerData.city || "",
      state: customerData.state || "",
      zipCode: customerData.zipCode || "",
      preferredServiceDate: preferredDateFormatted || "Not set",
      preferredTimeWindow: customerData.preferredTimeWindow || "Morning",
      preferredDayOfWeek: preferredDayDisplay || "Not set",
      confirmationTitle: confirmationTitle,
      confirmationMessage: confirmationMessage,
      confirmationDetails: confirmationDetails,
      buttonText: buttonText,
      buttonColor: buttonColor,
      dashboardLink: dashboardLink,
    });
  } catch (error: any) {
    console.error("[Notify Customer Welcome] Failed to send welcome email:", error?.message || error);
    // Don't throw - email failure shouldn't block registration
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
  // Hardcoded template ID for cleaning scheduled confirmation email
  const templateId = "template_ent7lyj";

  const dashboardLink = "https://binblast.vercel.app/dashboard";

  // Format scheduled date for display
  const scheduledDateFormatted = new Date(customerData.scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format address line 2 for display (empty string if not provided)
  const addressLine2Display = customerData.addressLine2 ? `<br>${customerData.addressLine2}` : "";
  
  // Format preferred day of week for display
  const preferredDayDisplay = customerData.preferredDayOfWeek 
    ? `Every ${customerData.preferredDayOfWeek}` 
    : "Not set";

  // Try to send email (non-blocking)
  try {
    await sendEmailJS(templateId, {
      to_email: customerData.email,
      firstName: customerData.firstName || "",
      lastName: customerData.lastName || "",
      scheduledDate: scheduledDateFormatted,
      scheduledTime: customerData.scheduledTime || "",
      addressLine1: customerData.addressLine1 || "",
      addressLine2: addressLine2Display, // Pre-formatted with <br> if exists
      city: customerData.city || "",
      state: customerData.state || "",
      zipCode: customerData.zipCode || "",
      preferredDayOfWeek: preferredDayDisplay, // Pre-formatted
      planName: customerData.planName || "Your Plan",
      binsCount: String(customerData.binsCount || 1),
      curbPlacementReminder: CURB_PLACEMENT_MESSAGE,
      dashboardLink: dashboardLink,
    });
  } catch (error: any) {
    console.error("[Notify Cleaning Scheduled] Failed to send confirmation email:", error?.message || error);
    // Don't throw - email failure shouldn't block scheduling
  }
}

const GENERIC_MESSAGE_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_GENERIC_MESSAGE || "template_ent7lyj";

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.binblastco.com";
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
  const dashboardLink = params.buttonUrl || getAppBaseUrl();
  return sendEmailJS(GENERIC_MESSAGE_TEMPLATE_ID, {
    to_email: params.to,
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
  });
}

function fireAndForgetTransactionalEmail(
  label: string,
  params: Parameters<typeof sendBrandedTransactionalEmail>[0]
) {
  sendBrandedTransactionalEmail(params).catch((error) => {
    console.error(`[${label}] Failed to send email:`, error?.message || error);
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
  const { buildPaymentFailedEmailHtml, getCustomerDashboardUrl } = await import(
    "@/lib/phase1-email-content"
  );

  fireAndForgetTransactionalEmail("Notify Payment Failed", {
    to: customerData.email,
    firstName: customerData.firstName,
    lastName: customerData.lastName,
    subject: "Action needed — update your payment method",
    messageHtml: buildPaymentFailedEmailHtml({
      firstName: customerData.firstName,
      planName: customerData.planName || "Your plan",
      amountDue: customerData.amountDue,
      billingUrl: getCustomerDashboardUrl(),
    }),
    buttonText: "Update Payment Method",
    buttonUrl: getCustomerDashboardUrl(),
    buttonColor: "#dc2626",
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
  const { buildCleaningCompleteEmailHtml, formatEmailDate, getCustomerDashboardUrl } =
    await import("@/lib/phase1-email-content");

  fireAndForgetTransactionalEmail("Notify Cleaning Complete", {
    to: customerData.email,
    firstName: customerData.firstName,
    lastName: customerData.lastName,
    subject: `Your bins are fresh — next cleaning ${formatEmailDate(customerData.nextCleaningDate)}`,
    messageHtml: buildCleaningCompleteEmailHtml({
      firstName: customerData.firstName,
      completedDate: formatEmailDate(customerData.completedDate),
      nextCleaningDate: formatEmailDate(customerData.nextCleaningDate),
      dashboardUrl: getCustomerDashboardUrl(),
    }),
    buttonText: "View Cleaning History",
    buttonUrl: getCustomerDashboardUrl(),
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
  const { buildPartnerRejectionEmailHtml } = await import("@/lib/phase1-email-content");

  fireAndForgetTransactionalEmail("Notify Partner Rejection", {
    to: partnerData.email,
    firstName: partnerData.ownerName.split(/\s+/)[0] || partnerData.ownerName,
    subject: "Update on your Bin Blast partner application",
    messageHtml: buildPartnerRejectionEmailHtml(partnerData),
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
  const loginLink = `${getAppBaseUrl()}/login?redirect=${encodeURIComponent(
    staffData.role === "operator" ? "/operator" : "/employee/dashboard"
  )}`;

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

/**
 * Load customer profile + next cleaning date, then send cleaning complete email.
 */
export async function notifyCleaningCompleteForJob(params: {
  userId?: string | null;
  userEmail?: string | null;
  completedDate?: string | null;
  nextCleaningId?: string | null;
}): Promise<void> {
  const email = params.userEmail?.trim();
  if (!email) return;

  try {
    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const { formatEmailDate } = await import("@/lib/phase1-email-content");
    const db = await getAdminFirestore();

    let firstName = email.split("@")[0] || "there";
    let lastName = "";

    if (params.userId) {
      const userDoc = await db.collection("users").doc(params.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        firstName = (userData.firstName as string) || firstName;
        lastName = (userData.lastName as string) || "";
      }
    }

    let nextCleaningDate: string | null = null;
    if (params.nextCleaningId) {
      const nextDoc = await db.collection("scheduledCleanings").doc(params.nextCleaningId).get();
      nextCleaningDate = (nextDoc.data()?.scheduledDate as string) || null;
    } else if (params.userId) {
      const upcomingSnapshot = await db
        .collection("scheduledCleanings")
        .where("userId", "==", params.userId)
        .get();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = upcomingSnapshot.docs
        .map((doc) => doc.data())
        .filter((cleaning) => {
          const status = `${cleaning.status || ""} ${cleaning.jobStatus || ""}`.toLowerCase();
          if (status.includes("completed") || status.includes("cancel")) return false;
          const scheduled = cleaning.scheduledDate ? new Date(String(cleaning.scheduledDate)) : null;
          if (!scheduled || Number.isNaN(scheduled.getTime())) return false;
          scheduled.setHours(0, 0, 0, 0);
          return scheduled >= today;
        })
        .sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)));

      nextCleaningDate = (upcoming[0]?.scheduledDate as string) || null;
    }

    await notifyCleaningComplete({
      email,
      firstName,
      lastName,
      completedDate: formatEmailDate(params.completedDate || new Date()),
      nextCleaningDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Notify Cleaning Complete For Job] Failed:", message);
  }
}
