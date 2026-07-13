import { getAdminFirestore } from "@/lib/firebase-admin";

type OneTimeCleaningSession = {
  id: string;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  amount_total?: number | null;
};

export type OneTimeCleaningPurchaseResult = {
  applied: boolean;
  alreadyProcessed: boolean;
  cleaningCredits: number;
  amountPaidCents: number;
};

export async function processOneTimeCleaningPurchase(
  session: OneTimeCleaningSession
): Promise<OneTimeCleaningPurchaseResult> {
  if (
    session.metadata?.type !== "one_time_cleaning" ||
    session.payment_status !== "paid"
  ) {
    throw new Error("Invalid one-time cleaning checkout session");
  }

  const userId = session.metadata.userId;
  if (!userId) {
    throw new Error("Missing user ID for one-time cleaning purchase");
  }

  const db = await getAdminFirestore();
  const paymentRef = db.collection("oneTimeCleaningPayments").doc(session.id);
  const existingPayment = await paymentRef.get();

  if (existingPayment.exists) {
    const data = existingPayment.data() || {};
    return {
      applied: false,
      alreadyProcessed: true,
      cleaningCredits: data.cleaningCreditsAfter || 0,
      amountPaidCents: data.amountPaidCents || session.amount_total || 0,
    };
  }

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error("User account not found for one-time cleaning purchase");
  }

  const currentCredits = userDoc.data()?.cleaningCredits || 0;
  const newCredits = currentCredits + 1;
  const admin = await import("firebase-admin");

  await db.runTransaction(async (transaction: any) => {
    const paymentSnap = await transaction.get(paymentRef);
    if (paymentSnap.exists) {
      return;
    }

    transaction.update(userRef, {
      cleaningCredits: newCredits,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(paymentRef, {
      userId,
      sessionId: session.id,
      cleaningCreditsBefore: currentCredits,
      cleaningCreditsAfter: newCredits,
      amountPaidCents: session.amount_total || 3500,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    applied: true,
    alreadyProcessed: false,
    cleaningCredits: newCredits,
    amountPaidCents: session.amount_total || 3500,
  };
}
