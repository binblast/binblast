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
      dashboardLink: dashboardLink,
    });
  } catch (error: any) {
    console.error("[Notify Cleaning Scheduled] Failed to send confirmation email:", error?.message || error);
    // Don't throw - email failure shouldn't block scheduling
  }
}
