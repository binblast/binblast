/**
 * EmailJS template IDs, env vars, and recommended subject lines.
 * Create each HTML file in email-templates/ in EmailJS, then paste the Template ID into Vercel.
 */

export type EmailTemplateKey =
  | "CUSTOMER_WELCOME"
  | "CLEANING_SCHEDULED"
  | "PAYMENT_FAILED"
  | "CLEANING_COMPLETE"
  | "PARTNER_APPLICATION"
  | "PARTNER_APPROVAL"
  | "PARTNER_REJECTION"
  | "TEAM_MEMBER_INVITATION"
  | "PASSWORD_RESET"
  | "GENERIC_MESSAGE";

export interface EmailTemplateDefinition {
  envKey: string;
  fallbackId: string;
  htmlFile: string;
  /** Set this in EmailJS template Subject field */
  subjectLine: string;
  description: string;
}

export const EMAIL_TEMPLATE_DEFINITIONS: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  CUSTOMER_WELCOME: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CUSTOMER_WELCOME",
    fallbackId: "",
    htmlFile: "customer-welcome.html",
    subjectLine: "Welcome to Bin Blast Co. — your fresh bins start here",
    description: "New customer registration welcome — dedicated template only (not generic)",
  },
  CLEANING_SCHEDULED: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_SCHEDULED",
    fallbackId: "template_ent7lyj",
    htmlFile: "cleaning-scheduled-confirmation.html",
    subjectLine: "You're all set — bin cleaning confirmed",
    description: "Customer confirms or schedules a cleaning date",
  },
  PAYMENT_FAILED: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PAYMENT_FAILED",
    fallbackId: "template_ent7lyj",
    htmlFile: "payment-failed.html",
    subjectLine: "Action needed: update your payment method",
    description: "Stripe invoice payment failed — service paused",
  },
  CLEANING_COMPLETE: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_CLEANING_COMPLETE",
    fallbackId: "template_ent7lyj",
    htmlFile: "cleaning-complete.html",
    subjectLine: "Your bins are fresh — cleaning complete",
    description: "Job marked complete — includes next cleaning date",
  },
  PARTNER_APPLICATION: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPLICATION",
    fallbackId: "template_aabpctf",
    htmlFile: "partnership-application.html",
    subjectLine: "New partner application: {{businessName}}",
    description: "Admin alert when someone applies to partner program",
  },
  PARTNER_APPROVAL: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_APPROVAL",
    fallbackId: "template_lm4wzqr",
    htmlFile: "partner-approval.html",
    subjectLine: "You're approved — welcome to the Bin Blast partner program",
    description: "Partner application approved with signup link",
  },
  PARTNER_REJECTION: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PARTNER_REJECTION",
    fallbackId: "template_ent7lyj",
    htmlFile: "partner-rejection.html",
    subjectLine: "Update on your Bin Blast partner application",
    description: "Partner application not approved",
  },
  TEAM_MEMBER_INVITATION: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_TEAM_MEMBER_INVITATION",
    fallbackId: "template_9796g8g",
    htmlFile: "team-member-invitation.html",
    subjectLine: "Your Bin Blast team account is ready",
    description: "Employee, operator, or partner team member invite",
  },
  PASSWORD_RESET: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_PASSWORD_RESET",
    fallbackId: "template_l421jys",
    htmlFile: "password-reset.html",
    subjectLine: "Reset your Bin Blast Co. password",
    description: "Forgot password reset link",
  },
  GENERIC_MESSAGE: {
    envKey: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_GENERIC_MESSAGE",
    fallbackId: "template_ent7lyj",
    htmlFile: "generic-message.html",
    subjectLine: "{{email_subject}}",
    description: "Ad-hoc messages — custom quotes, operator emails, etc.",
  },
};

export function getEmailTemplateId(key: EmailTemplateKey): string {
  const def = EMAIL_TEMPLATE_DEFINITIONS[key];
  const fromEnv = process.env[def.envKey]?.trim();
  if (fromEnv) return fromEnv;
  if (def.fallbackId) return def.fallbackId;
  console.warn(`[EmailJS] Missing template ID for ${key}. Set ${def.envKey} in Vercel.`);
  return def.fallbackId;
}

/** Resolve subject line with optional {{variable}} substitutions. */
export function getEmailSubject(
  key: EmailTemplateKey,
  substitutions?: Record<string, string>
): string {
  let subject = EMAIL_TEMPLATE_DEFINITIONS[key].subjectLine;
  if (substitutions) {
    for (const [name, value] of Object.entries(substitutions)) {
      subject = subject.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), value);
    }
  }
  return subject;
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.binblastco.com";
}

export function getCustomerDashboardUrl(): string {
  return `${getAppBaseUrl()}/customer`;
}

export function getStaffLoginUrl(role: "employee" | "operator"): string {
  const redirect = role === "operator" ? "/operator" : "/employee/dashboard";
  return `${getAppBaseUrl()}/login?redirect=${encodeURIComponent(redirect)}`;
}

export function formatEmailDate(value: string | Date | undefined | null): string {
  if (!value) return "To be scheduled";
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00`)
        : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
