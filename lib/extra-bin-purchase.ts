import { getAdminFirestore } from "@/lib/firebase-admin";

type ExtraBinSession = {
  id: string;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  amount_total?: number | null;
};

export type ExtraBinPurchaseResult = {
  applied: boolean;
  alreadyProcessed: boolean;
  quantity: number;
  binsCount: number;
  amountPaidCents: number;
};

export async function processExtraBinPurchase(
  session: ExtraBinSession
): Promise<ExtraBinPurchaseResult> {
  if (session.metadata?.type !== "extra_bin" || session.payment_status !== "paid") {
    throw new Error("Invalid extra bin checkout session");
  }

  const userId = session.metadata.userId;
  const quantity = parseInt(session.metadata.quantity || "1", 10);

  if (!userId || Number.isNaN(quantity) || quantity < 1) {
    throw new Error("Missing user ID or quantity for extra bin purchase");
  }

  const db = await getAdminFirestore();
  const paymentRef = db.collection("extraBinPayments").doc(session.id);
  const existingPayment = await paymentRef.get();

  if (existingPayment.exists) {
    const data = existingPayment.data() || {};
    return {
      applied: false,
      alreadyProcessed: true,
      quantity: data.quantity || quantity,
      binsCount: data.binsCountAfter || 1,
      amountPaidCents: data.amountPaidCents || session.amount_total || 0,
    };
  }

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error("User account not found for extra bin purchase");
  }

  const currentBinCount = userDoc.data()?.binsCount || 1;
  const newBinCount = currentBinCount + quantity;
  const admin = await import("firebase-admin");

  await db.runTransaction(async (transaction: any) => {
    const paymentSnap = await transaction.get(paymentRef);
    if (paymentSnap.exists) {
      return;
    }

    transaction.update(userRef, {
      binsCount: newBinCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.set(paymentRef, {
      userId,
      sessionId: session.id,
      quantity,
      binsCountBefore: currentBinCount,
      binsCountAfter: newBinCount,
      amountPaidCents: session.amount_total || quantity * 1000,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    applied: true,
    alreadyProcessed: false,
    quantity,
    binsCount: newBinCount,
    amountPaidCents: session.amount_total || quantity * 1000,
  };
}
