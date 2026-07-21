import { sendBrandedTransactionalEmail } from "@/lib/email-utils";
import type { CareerApplicationRecord, CareerApplicationStatus } from "@/lib/careers-types";
import { CAREER_APPLICATION_STATUS_LABELS } from "@/lib/careers-types";

const STATUS_MESSAGES: Partial<
  Record<
    CareerApplicationStatus,
    { subject: string; body: string; buttonText?: string; buttonUrl?: string }
  >
> = {
  application_received: {
    subject: "Application Received — Bin Blast Co.",
    body:
      "Thank you for applying to Bin Blast Co. Our recruiting team will review your application and contact you if you are selected for the next step.<br><br>Most candidates receive a decision within 5–10 business days.",
    buttonText: "View Application Status",
    buttonUrl: "https://www.binblastco.com/careers/dashboard",
  },
  phone_interview_scheduled: {
    subject: "Phone Interview Scheduled — Bin Blast Co.",
    body:
      "Your phone interview has been scheduled. Please watch for a follow-up message with date, time, and preparation details.",
    buttonText: "View Application Status",
    buttonUrl: "https://www.binblastco.com/careers/dashboard",
  },
  offer_sent: {
    subject: "Job Offer — Bin Blast Co.",
    body:
      "Congratulations — Bin Blast Co. would like to move forward with a job offer. Please check your application dashboard and email for next steps.",
    buttonText: "View Offer Details",
    buttonUrl: "https://www.binblastco.com/careers/dashboard",
  },
  not_selected: {
    subject: "Application Update — Bin Blast Co.",
    body:
      "Thank you for your interest in Bin Blast Co. After careful review, we will not be moving forward with your application at this time. We encourage you to join our talent pool for future openings.",
    buttonText: "View Careers",
    buttonUrl: "https://www.binblastco.com/careers",
  },
  hired: {
    subject: "Welcome to Bin Blast Co.",
    body:
      "Welcome to the team. Your employee onboarding checklist, training schedule, and route information will be available in your employee portal shortly.",
    buttonText: "Employee Portal",
    buttonUrl: "https://www.binblastco.com/employee",
  },
};

export async function sendCareerStatusEmail(
  application: CareerApplicationRecord,
  status: CareerApplicationStatus
): Promise<void> {
  const template = STATUS_MESSAGES[status];
  if (!template) return;

  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: template.subject,
    messageHtml: template.body,
    buttonText: template.buttonText,
    buttonUrl: template.buttonUrl,
  }).catch((error) => {
    console.error("[Careers Email]", status, error);
  });
}

export async function sendInterviewReminderEmail(
  application: CareerApplicationRecord,
  interviewTime: string
): Promise<void> {
  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: "Interview Reminder — Bin Blast Co.",
    messageHtml: `This is a reminder for your upcoming Bin Blast Co. interview scheduled for <strong>${interviewTime}</strong>.`,
    buttonText: "View Application Status",
    buttonUrl: "https://www.binblastco.com/careers/dashboard",
  });
}

export async function sendMoreInformationRequestEmail(
  application: CareerApplicationRecord,
  message: string
): Promise<void> {
  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: "More Information Needed — Bin Blast Co.",
    messageHtml: message,
    buttonText: "Update Application",
    buttonUrl: "https://www.binblastco.com/careers/dashboard",
  });
}

export function getStatusLabel(status: CareerApplicationStatus): string {
  return CAREER_APPLICATION_STATUS_LABELS[status];
}
