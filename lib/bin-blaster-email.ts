import { sendBrandedTransactionalEmail } from "@/lib/email-utils";
import type { BinBlasterApplicationRecord, BinBlasterApplicationStatus } from "@/lib/bin-blaster-types";
import { BIN_BLASTER_STATUS_LABELS } from "@/lib/bin-blaster-types";

export async function sendBinBlasterApplicationReceivedEmail(
  application: BinBlasterApplicationRecord
): Promise<void> {
  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: "Application Received — Bin Blast Co.",
    messageHtml:
      "Thank you for applying to become a Bin Blaster. Our team will review your application and contact you if your experience and availability match an open route.<br><br>" +
      "This is an application review only — employee portal access is provided after approval.",
  }).catch((error) => {
    console.error("[Bin Blaster Email] application_received", error);
  });
}

export async function sendBinBlasterInterviewEmail(
  application: BinBlasterApplicationRecord,
  message?: string
): Promise<void> {
  const body =
    message?.trim() ||
    "We would like to schedule a brief interview to learn more about your experience and availability for Bin Blaster routes in Metro Atlanta.";

  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: "Interview Request — Bin Blast Co.",
    messageHtml: `${body}<br><br>Please reply to this email or call us if you have questions.`,
  }).catch((error) => {
    console.error("[Bin Blaster Email] interview_requested", error);
  });
}

export async function sendBinBlasterStatusEmail(
  application: BinBlasterApplicationRecord,
  status: BinBlasterApplicationStatus
): Promise<void> {
  const label = BIN_BLASTER_STATUS_LABELS[status];

  let messageHtml = `Your Bin Blaster application status has been updated to <strong>${label}</strong>.`;

  if (status === "approved") {
    messageHtml +=
      "<br><br>Congratulations — your application has been approved. You will receive a separate email with employee portal setup instructions shortly.";
  } else if (status === "waitlisted") {
    messageHtml +=
      "<br><br>We will keep your application on file and contact you when a matching route opens.";
  } else if (status === "rejected") {
    messageHtml +=
      "<br><br>Thank you for your interest in Bin Blast Co. We are not moving forward with your application at this time.";
  }

  await sendBrandedTransactionalEmail({
    to: application.personal.email,
    firstName: application.personal.firstName,
    lastName: application.personal.lastName,
    subject: `Application Update — ${label} | Bin Blast Co.`,
    messageHtml,
  }).catch((error) => {
    console.error("[Bin Blaster Email] status", status, error);
  });
}

export async function sendBinBlasterEmployeeInviteEmail(params: {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  serviceAreas: string[];
  residentialFirstBin: number;
  residentialAdditionalBin: number;
}): Promise<void> {
  const { notifyBinBlastStaffInvitation } = await import("@/lib/email-utils");
  await notifyBinBlastStaffInvitation({
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    tempPassword: params.tempPassword,
    role: "employee",
    serviceAreas: params.serviceAreas,
    payRatePerJob: params.residentialFirstBin,
  }).catch((error) => {
    console.error("[Bin Blaster Email] employee_invite", error);
  });
}
