const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.binblastco.com";

export const EMAIL_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || "https://www.binblastco.com/bin-blast-email-logo.png";

function emailShell(title: string, accentColor: string, bodyHtml: string, button?: { text: string; url: string; color?: string }) {
  const buttonHtml = button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 24px 0 8px;">
            <a href="${button.url}" style="display:inline-block;padding:14px 28px;background-color:${button.color || "#16a34a"};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">${button.text}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<div style="font-family:Arial,sans-serif;color:#374151;font-size:16px;line-height:1.6;">
    <p style="margin:0 0 16px;">${bodyHtml}</p>
    ${buttonHtml}
    <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">— Bin Blast Co.<br>Questions? Reply to this email or call (470) 305-0823.</p>
  </div>`;
}

export function buildPaymentFailedEmailHtml(params: {
  firstName: string;
  planName: string;
  amountDue: string;
  billingUrl: string;
}) {
  return emailShell(
    "Payment failed",
    "#dc2626",
    `Hi <strong>${params.firstName}</strong>,<br><br>
    We couldn't process your latest payment, so your bin cleaning service is <strong>temporarily paused</strong> until your payment method is updated.<br><br>
    <strong>Plan:</strong> ${params.planName}<br>
    <strong>Amount due:</strong> ${params.amountDue}<br><br>
    Update your card to keep your cleanings on schedule — it only takes a minute.`,
    { text: "Update Payment Method", url: params.billingUrl, color: "#dc2626" }
  );
}

export function buildCleaningCompleteEmailHtml(params: {
  firstName: string;
  completedDate: string;
  nextCleaningDate: string;
  dashboardUrl: string;
}) {
  return emailShell(
    "Cleaning complete",
    "#16a34a",
    `Hi <strong>${params.firstName}</strong>,<br><br>
    All done! Your bins were cleaned, sanitized, and deodorized today.<br><br>
    <strong>Today's service:</strong> ${params.completedDate}<br>
    <strong>Next cleaning:</strong> ${params.nextCleaningDate}<br><br>
    Thanks for trusting Bin Blast Co. If anything didn't look right, reply within 24 hours and we'll make it right.`,
    { text: "View Cleaning History", url: params.dashboardUrl }
  );
}

export function buildPartnerRejectionEmailHtml(params: {
  ownerName: string;
  businessName: string;
  reason?: string | null;
}) {
  const reasonBlock = params.reason
    ? `<br><br><em>${params.reason}</em>`
    : "";

  return emailShell(
    "Partner application update",
    "#6b7280",
    `Hi <strong>${params.ownerName}</strong>,<br><br>
    Thank you for applying to partner with Bin Blast Co. After review, we're unable to move forward with <strong>${params.businessName}</strong> at this time.${reasonBlock}<br><br>
    You're welcome to reapply in the future if your service area or business model changes.`
  );
}

export function buildStaffInvitationEmailHtml(params: {
  firstName: string;
  roleLabel: string;
  email: string;
  tempPassword: string;
  loginLink: string;
  serviceAreas?: string;
}) {
  return emailShell(
    "Staff account ready",
    "#2563eb",
    `Hi <strong>${params.firstName}</strong>,<br><br>
    You've been added to the Bin Blast Co. team as an <strong>${params.roleLabel}</strong>. Use the credentials below to sign in and complete your profile.<br><br>
    <strong>Portal:</strong> <a href="${params.loginLink}">${params.loginLink}</a><br>
    <strong>Email:</strong> ${params.email}<br>
    <strong>Temporary password:</strong> ${params.tempPassword}<br>
    ${params.serviceAreas ? `<strong>Service areas:</strong> ${params.serviceAreas}<br>` : ""}
    <br>Please change your password after your first login.`,
    { text: "Sign In to Your Portal", url: params.loginLink, color: "#2563eb" }
  );
}

export function getCustomerDashboardUrl() {
  return `${BASE_URL}/customer`;
}

export function getStaffLoginUrl(role: "employee" | "operator") {
  const redirect = role === "operator" ? "/operator" : "/employee/dashboard";
  return `${BASE_URL}/login?redirect=${encodeURIComponent(redirect)}`;
}

export function formatEmailDate(value: string | Date | undefined | null) {
  if (!value) return "To be scheduled";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
