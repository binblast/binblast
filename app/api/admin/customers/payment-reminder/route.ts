import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { sendBrandedTransactionalEmail } from "@/lib/email-utils";
import { getAppBaseUrl } from "@/lib/email-template-config";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatPlanLabel(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "one-time" || normalized === "onetime" || normalized === "one_time") {
    return "one-time cleaning";
  }
  if (normalized === "monthly") return "Monthly plan";
  if (normalized === "bi-weekly" || normalized === "biweekly" || normalized === "bi_weekly") {
    return "Bi-Weekly plan";
  }
  return plan;
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const customerId = asString(body.customerId).trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const customerRef = db.collection("users").doc(customerId);
    const customerSnap = await customerRef.get();

    if (!customerSnap.exists) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const data = customerSnap.data() || {};
    const email = asString(data.email).trim();
    const firstName = asString(data.firstName).trim() || "there";
    const lastName = asString(data.lastName).trim();
    const planLabel = formatPlanLabel(asString(data.selectedPlan));
    const subscriptionStatus = asString(data.subscriptionStatus).toLowerCase();
    const paymentStatus = asString(data.paymentStatus).toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }

    if (paymentStatus === "paid" || subscriptionStatus === "active") {
      return NextResponse.json(
        { error: "Customer already has an active/paid status" },
        { status: 400 }
      );
    }

    const pricingUrl = `${getAppBaseUrl()}/#pricing`;
    const planLine = planLabel
      ? `<p style="margin:0 0 12px;">Your selected plan: <strong>${planLabel}</strong>.</p>`
      : "";

    const messageHtml = `
      <p style="margin:0 0 12px;">Thanks for getting started with Bin Blast Co.!</p>
      <p style="margin:0 0 12px;">Your account is ready, but we still need payment to confirm your trash bin cleaning.</p>
      ${planLine}
      <p style="margin:0 0 12px;">Choose your plan, pick a date <strong>3–5 days from today</strong>, and check out securely online. Once payment goes through, you're all set.</p>
      <p style="margin:0;">If you have any questions, reply to this email or call <strong>(470) 305-0823</strong>.</p>
    `.trim();

    const result = await sendBrandedTransactionalEmail({
      to: email,
      firstName,
      lastName,
      subject: "Finish booking your Bin Blast Co. cleaning",
      messageHtml,
      buttonText: "Complete Payment",
      buttonUrl: pricingUrl,
      buttonColor: "#16a34a",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send payment reminder email" },
        { status: 500 }
      );
    }

    await customerRef.set(
      {
        lastPaymentReminderAt: new Date().toISOString(),
        lastPaymentReminderBy: "admin",
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      email,
      customerId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send payment reminder";
    console.error("[Payment Reminder] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
