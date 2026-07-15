import { NextRequest, NextResponse } from "next/server";
import { EMAIL_LOGO_URL, sendEmailJS } from "@/lib/email-utils";
import { getAppBaseUrl, getEmailTemplateId } from "@/lib/email-template-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text, recipientName } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: "Missing to or subject" }, { status: 400 });
    }

    const messageHtml = html || (text ? String(text).replace(/\n/g, "<br>") : "");
    if (!messageHtml.trim()) {
      return NextResponse.json({ error: "Missing email message content" }, { status: 400 });
    }

    const templateId = getEmailTemplateId("GENERIC_MESSAGE");

    const nameParts = (recipientName || to.split("@")[0] || "Customer").trim().split(/\s+/);
    const firstName = nameParts[0] || "there";
    const lastName = nameParts.slice(1).join(" ");

    const result = await sendEmailJS(templateId, {
      to_email: to,
      email_subject: subject,
      firstName,
      lastName,
      planName: "Bin Blast Co.",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      confirmationTitle: subject,
      confirmationMessage: messageHtml,
      confirmationDetails: "",
      buttonText: "Visit Bin Blast Co.",
      buttonColor: "#16a34a",
      dashboardLink: getAppBaseUrl(),
      preferredServiceDate: "",
      preferredTimeWindow: "",
      preferredDayOfWeek: "",
      logoUrl: EMAIL_LOGO_URL,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
