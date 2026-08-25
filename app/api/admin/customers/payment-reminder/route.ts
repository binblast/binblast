import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { notifyPaymentReminder } from "@/lib/email-utils";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatPlanLabel(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  if (!normalized) return "Your selected plan";
  if (normalized === "one-time" || normalized === "onetime" || normalized === "one_time") {
    return "One-time cleaning";
  }
  if (normalized === "monthly" || normalized === "one-time-monthly") {
    return "Monthly plan";
  }
  if (normalized === "bi-weekly" || normalized === "biweekly" || normalized === "bi_weekly" || normalized === "twice-month") {
    return "Bi-Weekly / twice monthly plan";
  }
  if (normalized === "bi-monthly") return "Bi-Monthly plan";
  if (normalized === "quarterly") return "Quarterly plan";
  if (normalized === "commercial") return "Commercial plan";
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

    const result = await notifyPaymentReminder({
      email,
      firstName,
      lastName,
      planName: planLabel,
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
      usedTemplate: result.usedTemplate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send payment reminder";
    console.error("[Payment Reminder] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
