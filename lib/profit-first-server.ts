import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  calculateJobEconomics,
  type JobEconomicsInput,
  type JobEconomicsResult,
} from "@/lib/profit-first-engine";
import {
  mergeProfitFirstSettings,
  type ProfitFirstSettings,
} from "@/lib/profit-first-settings";

const SETTINGS_COLLECTION = "platformSettings";
const PROFIT_SETTINGS_DOC_ID = "profitFirst";

export async function loadProfitFirstSettings(): Promise<ProfitFirstSettings> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection(SETTINGS_COLLECTION).doc(PROFIT_SETTINGS_DOC_ID).get();

    if (!snapshot.exists) {
      return mergeProfitFirstSettings(null);
    }

    const data = snapshot.data();
    return mergeProfitFirstSettings((data?.settings || data) as Partial<ProfitFirstSettings>);
  } catch (error) {
    console.error("[Profit First Settings] Failed to load:", error);
    return mergeProfitFirstSettings(null);
  }
}

export async function saveProfitFirstSettings(
  settings: Partial<ProfitFirstSettings>,
  updatedBy: string
): Promise<ProfitFirstSettings> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const existing = await loadProfitFirstSettings();
  const merged = mergeProfitFirstSettings({ ...existing, ...settings });

  await db.collection(SETTINGS_COLLECTION).doc(PROFIT_SETTINGS_DOC_ID).set(
    {
      settings: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );

  return merged;
}

export async function recordJobEconomicsSnapshot(params: {
  jobId: string;
  input: JobEconomicsInput;
  updatedBy?: string;
}): Promise<JobEconomicsResult> {
  const settings = await loadProfitFirstSettings();
  const economics = calculateJobEconomics(params.input, settings);
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("scheduledCleanings").doc(params.jobId).set(
    {
      jobEconomics: economics,
      jobEconomicsCollectedRevenueCents: economics.collectedRevenue.collectedRevenueCents,
      jobEconomicsContributionProfitCents: economics.contributionProfitCents,
      jobEconomicsContributionMarginPercent: economics.contributionMarginPercent,
      jobEconomicsMarginStatus: economics.marginStatus,
      jobEconomicsApprovalRequired: economics.approvalRequired,
      jobEconomicsRecordedAt: now,
      jobEconomicsRecordedBy: params.updatedBy || "system",
    },
    { merge: true }
  );

  return economics;
}

export async function approveLowMarginJobOverride(params: {
  jobId: string;
  reason: string;
  approvedBy: string;
  input: JobEconomicsInput;
}): Promise<JobEconomicsResult> {
  const settings = await loadProfitFirstSettings();
  const economics = calculateJobEconomics(
    {
      ...params.input,
      ownerOverrideApproved: true,
      ownerOverrideReason: params.reason,
    },
    settings
  );

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("scheduledCleanings").doc(params.jobId).set(
    {
      jobEconomics: economics,
      jobEconomicsOwnerOverrideApproved: true,
      jobEconomicsOwnerOverrideReason: params.reason,
      jobEconomicsOwnerOverrideApprovedAt: now,
      jobEconomicsOwnerOverrideApprovedBy: params.approvedBy,
      jobEconomicsMarginStatus: economics.marginStatus,
      jobEconomicsApprovalRequired: economics.approvalRequired,
    },
    { merge: true }
  );

  await db.collection("adminAuditLog").add({
    action: "approve_low_margin_job",
    adminId: params.approvedBy,
    jobId: params.jobId,
    reason: params.reason,
    contributionMarginPercent: economics.contributionMarginPercent,
    contributionProfitCents: economics.contributionProfitCents,
    createdAt: now,
  });

  return economics;
}

export function evaluatePartnerBookingPayability(
  booking: Record<string, unknown>,
  settings: ProfitFirstSettings = mergeProfitFirstSettings(null)
): {
  payable: boolean;
  status: "pending" | "payable" | "cancelled" | "clawed_back";
  reason?: string;
} {
  const commissionStatus = String(booking.commissionStatus || "pending");
  const bookingStatus = String(booking.status || "active");

  if (commissionStatus === "cancelled" || bookingStatus === "cancelled") {
    return { payable: false, status: "cancelled", reason: "Booking cancelled" };
  }

  if (commissionStatus === "clawed_back" || bookingStatus === "refunded") {
    return { payable: false, status: "clawed_back", reason: "Refund or chargeback" };
  }

  if (booking.paymentCollected === false) {
    return { payable: false, status: "pending", reason: "Payment not collected" };
  }

  if (booking.paymentCleared === false) {
    return { payable: false, status: "pending", reason: "Payment not cleared" };
  }

  if (booking.firstServiceCompleted !== true && !booking.firstServiceDate) {
    return { payable: false, status: "pending", reason: "First service not completed" };
  }

  const createdAt =
    (booking.createdAt as { toDate?: () => Date })?.toDate?.() ||
    (booking.createdAt as { seconds?: number })?.seconds
      ? new Date((booking.createdAt as { seconds: number }).seconds * 1000)
      : null;

  const holdDays = 7;
  if (createdAt) {
    const holdUntil = new Date(createdAt);
    holdUntil.setDate(holdUntil.getDate() + holdDays);
    if (new Date() < holdUntil && booking.refundHoldPassed !== true) {
      return { payable: false, status: "pending", reason: "Refund/chargeback hold period" };
    }
  } else if (booking.refundHoldPassed !== true) {
    return { payable: false, status: "pending", reason: "Refund/chargeback hold period" };
  }

  const partnerModel =
    booking.commissionModel === "referral_flat" || booking.partnerTier === "referral"
      ? "referral"
      : booking.commissionModel === "service_revenue_share"
        ? "service"
        : "referral";

  const partnerShareAmountCents = Number(booking.partnerShareAmount || 0);
  const bookingAmountCents = Number(booking.bookingAmount || 0);
  const economics = calculateJobEconomics(
    {
      category: "residential",
      bins: 1,
      customerPaymentCents: bookingAmountCents,
      partnerModel,
      partnerCommissionCents: partnerShareAmountCents,
      paymentCollected: booking.paymentCollected !== false,
      paymentCleared: booking.paymentCleared !== false,
      firstServiceCompleted: true,
      refundHoldPassed: true,
      partnerCommissionStatus: "payable",
      jobCompleted: true,
      completionDocsSubmitted: true,
    },
    settings
  );

  if (economics.approvalRequired && booking.ownerOverrideApproved !== true) {
    return {
      payable: false,
      status: "pending",
      reason: "Partner payout requires owner approval due to margin rules",
    };
  }

  return { payable: true, status: "payable" };
}

export async function markPartnerFirstServiceComplete(params: {
  partnerId?: string | null;
  customerEmail?: string | null;
}): Promise<number> {
  if (!params.partnerId && !params.customerEmail) {
    return 0;
  }

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const now = admin.firestore.FieldValue.serverTimestamp();
  let updated = 0;

  let snapshot;
  if (params.partnerId) {
    snapshot = await db
      .collection("partnerBookings")
      .where("partnerId", "==", params.partnerId)
      .get();
  } else {
    snapshot = await db
      .collection("partnerBookings")
      .where("customerEmail", "==", params.customerEmail)
      .get();
  }

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.firstServiceCompleted === true || data.firstServiceDate) {
      continue;
    }

    if (
      params.customerEmail &&
      String(data.customerEmail || "").toLowerCase() !== params.customerEmail.toLowerCase()
    ) {
      continue;
    }

    await docSnap.ref.set(
      {
        firstServiceCompleted: true,
        firstServiceDate: now,
        updatedAt: now,
      },
      { merge: true }
    );
    updated += 1;
  }

  return updated;
}

export function buildJobEconomicsInputFromCleaning(
  data: Record<string, unknown>,
  settings: ProfitFirstSettings
): JobEconomicsInput {
  const category =
    String(data.planType || data.serviceType || "").toLowerCase().includes("commercial") ||
    data.isCommercial === true
      ? "commercial"
      : "residential";

  const bins = Number(data.binsCount || data.binCount || 1);
  const customerPaymentCents = Math.round(Number(data.customerPriceCents || data.priceCents || 3500));
  const partnerModel = data.partnerId
    ? data.partnerTier === "referral" || data.partnerCompensationModel === "referral"
      ? "referral"
      : "service"
    : "none";

  return {
    category,
    bins,
    customerPaymentCents,
    paymentCollected: data.paymentCollected !== false,
    refundsCents: Number(data.refundsCents || 0),
    discountsCents: Number(data.discountsCents || 0),
    creditsCents: Number(data.creditsCents || 0),
    paymentProcessingFeesCents: Number(data.paymentProcessingFeesCents || 0),
    invoiceLaborCents: Number(data.invoiceLaborCents || customerPaymentCents),
    laborRevenueExclusionsCents: Number(data.laborRevenueExclusionsCents || 0),
    partnerModel,
    partnerCommissionCents:
      data.partnerCommissionCents != null ? Number(data.partnerCommissionCents) : undefined,
    servicePartnerRevenueSharePercent: Number(data.servicePartnerRevenueSharePercent || 0),
    firstServiceCompleted: data.firstServiceCompleted !== false,
    paymentCleared: data.paymentCleared !== false,
    refundHoldPassed: data.refundHoldPassed !== false,
    partnerCommissionStatus: data.partnerCommissionStatus as JobEconomicsInput["partnerCommissionStatus"],
    jobCompleted: data.jobStatus === "completed" || data.status === "completed",
    completionDocsSubmitted: data.hasRequiredPhotos !== false && data.operatorSkipPhotos !== true,
    requiresRework:
      data.requiresRework === true ||
      (Array.isArray(data.flags) && data.flags.includes("rework_required")),
    employeePayOverrideCents:
      data.employeeCompensationOverride != null
        ? Math.round(Number(data.employeeCompensationOverride) * 100)
        : data.employeeCompensationAmount != null
          ? Math.round(Number(data.employeeCompensationAmount) * 100)
          : null,
    ownerOverrideApproved: data.jobEconomicsOwnerOverrideApproved === true,
    ownerOverrideReason: String(data.jobEconomicsOwnerOverrideReason || "") || null,
  };
}
