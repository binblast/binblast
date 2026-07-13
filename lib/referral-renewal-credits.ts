import { getAdminFirestore } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";
import { getUnusedCreditsForUser } from "@/lib/referral-service";

const RENEWAL_CREDIT_METADATA_TYPE = "referral_renewal_credit";
const MAX_RENEWAL_CREDIT_CENTS = 1000;

export async function applyAutoRenewalCreditToUpcomingInvoice(params: {
  invoiceId: string;
  customerId: string;
  userId: string;
}): Promise<{ applied: boolean; amountCents: number; creditIds: string[] }> {
  const invoice = await stripe.invoices.retrieve(params.invoiceId);

  const existingDiscount = invoice.lines.data.find(
    (item) => item.metadata?.type === RENEWAL_CREDIT_METADATA_TYPE
  );
  if (existingDiscount) {
    return { applied: false, amountCents: 0, creditIds: [] };
  }

  const { credits } = await getUnusedCreditsForUser(params.userId);
  if (credits.length === 0) {
    return { applied: false, amountCents: 0, creditIds: [] };
  }

  let amountCents = 0;
  const creditIds: string[] = [];

  for (const credit of credits) {
    if (amountCents >= MAX_RENEWAL_CREDIT_CENTS) break;
    const creditCents = Math.round((credit.amount || 0) * 100);
    if (creditCents <= 0) continue;

    const remaining = MAX_RENEWAL_CREDIT_CENTS - amountCents;
    const appliedCents = Math.min(creditCents, remaining);
    if (appliedCents <= 0) continue;

    creditIds.push(credit.id);
    amountCents += appliedCents;
    if (amountCents >= MAX_RENEWAL_CREDIT_CENTS) break;
  }

  if (amountCents <= 0 || creditIds.length === 0) {
    return { applied: false, amountCents: 0, creditIds: [] };
  }

  await stripe.invoiceItems.create({
    customer: params.customerId,
    invoice: params.invoiceId,
    amount: -amountCents,
    currency: "usd",
    description: `Referral Credit (auto-applied on renewal)`,
    metadata: {
      type: RENEWAL_CREDIT_METADATA_TYPE,
      userId: params.userId,
      creditIds: creditIds.join(","),
      amountCents: String(amountCents),
    },
  });

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  await db.collection("invoiceCreditApplications").doc(params.invoiceId).set(
    {
      userId: params.userId,
      customerId: params.customerId,
      creditIds,
      amountCents,
      consumed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { applied: true, amountCents, creditIds };
}

export async function consumeRenewalCreditApplication(
  invoiceId: string
): Promise<{ consumed: boolean; creditIds: string[] }> {
  const db = await getAdminFirestore();
  const applicationRef = db.collection("invoiceCreditApplications").doc(invoiceId);
  const applicationDoc = await applicationRef.get();

  if (!applicationDoc.exists) {
    return { consumed: false, creditIds: [] };
  }

  const applicationData = applicationDoc.data() || {};
  if (applicationData.consumed) {
    return { consumed: false, creditIds: applicationData.creditIds || [] };
  }

  const creditIds = Array.isArray(applicationData.creditIds)
    ? applicationData.creditIds
    : [];
  const amountCents = Number(applicationData.amountCents) || 0;
  const amountApplied = amountCents / 100;

  if (creditIds.length === 0) {
    return { consumed: false, creditIds: [] };
  }

  const admin = await import("firebase-admin");
  const batch = db.batch();
  let markedCount = 0;

  for (const creditId of creditIds) {
    const creditRef = db.collection("credits").doc(creditId);
    const creditDoc = await creditRef.get();
    if (!creditDoc.exists || creditDoc.data()?.used) {
      continue;
    }

    batch.update(creditRef, {
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      usedForAmount: Number(creditDoc.data()?.amount) || amountApplied,
      usedOnInvoiceId: invoiceId,
      usedSource: "renewal_auto_apply",
    });
    markedCount += 1;
  }

  if (markedCount === 0) {
    return { consumed: false, creditIds };
  }

  batch.update(applicationRef, {
    consumed: true,
    consumedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { consumed: true, creditIds };
}
