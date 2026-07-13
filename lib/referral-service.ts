import { getAdminFirestore } from "@/lib/firebase-admin";
import { hasStripeCustomerPaid } from "@/lib/referral-payment-check";
import {
  generateReadableReferralCode,
  getReferralCodeVariants,
  normalizeReferralCode,
} from "@/lib/referral-code-format";

export const REFERRAL_DISCOUNT_AMOUNT = 10;

export { normalizeReferralCode, generateReadableReferralCode };

export type ReferralValidationResult = {
  valid: boolean;
  referrerId?: string;
  referrerName?: string;
  matchedCode?: string;
  error?: string;
};

async function findUserByReferralCode(code: string) {
  const db = await getAdminFirestore();
  const variants = getReferralCodeVariants(code);

  for (let i = 0; i < variants.length; i += 10) {
    const chunk = variants.slice(i, i + 10);
    const snapshot = await db
      .collection("users")
      .where("referralCode", "in", chunk)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0];
    }
  }

  return null;
}

export async function validateReferralCode(
  referralCode: string
): Promise<ReferralValidationResult> {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return { valid: false, error: "Referral code is required" };
  }

  const referrerDoc = await findUserByReferralCode(normalizedCode);

  if (!referrerDoc) {
    return { valid: false, error: "Invalid referral code" };
  }

  const referrerData = referrerDoc.data();
  const matchedCode =
    typeof referrerData.referralCode === "string"
      ? normalizeReferralCode(referrerData.referralCode)
      : normalizedCode;

  return {
    valid: true,
    referrerId: referrerDoc.id,
    referrerName: referrerData.firstName || "Friend",
    matchedCode,
  };
}

export type ProcessReferralSignupResult = {
  success: boolean;
  referralId?: string;
  referrerId?: string;
  error?: string;
  alreadyProcessed?: boolean;
};

export async function processReferralSignup(params: {
  referralCode: string;
  newUserId: string;
  newUserEmail: string;
}): Promise<ProcessReferralSignupResult> {
  const normalizedCode = normalizeReferralCode(params.referralCode);
  const newUserEmail = params.newUserEmail.trim().toLowerCase();

  if (!normalizedCode || !params.newUserId || !newUserEmail) {
    return {
      success: false,
      error: "referralCode, newUserId, and newUserEmail are required",
    };
  }

  const validation = await validateReferralCode(normalizedCode);
  if (!validation.valid || !validation.referrerId) {
    return { success: false, error: validation.error || "Invalid referral code" };
  }

  const referrerId = validation.referrerId;
  if (referrerId === params.newUserId) {
    return { success: false, error: "Cannot refer yourself" };
  }

  const db = await getAdminFirestore();
  const newUserRef = db.collection("users").doc(params.newUserId);
  const newUserDoc = await newUserRef.get();

  if (!newUserDoc.exists) {
    return { success: false, error: "New user account not found" };
  }

  const newUserData = newUserDoc.data() || {};
  if (newUserData.referredBy) {
    return {
      success: false,
      error: "You have already used a referral code. Each user can only use one referral code.",
    };
  }

  const existingReferrals = await db
    .collection("referrals")
    .where("referredUserId", "==", params.newUserId)
    .limit(1)
    .get();

  if (!existingReferrals.empty) {
    const existing = existingReferrals.docs[0];
    return {
      success: true,
      referralId: existing.id,
      referrerId: existing.data().referrerId,
      alreadyProcessed: true,
    };
  }

  const admin = await import("firebase-admin");
  const referralRef = db.collection("referrals").doc();

  await db.runTransaction(async (transaction: any) => {
    const freshUserDoc = await transaction.get(newUserRef);
    if (!freshUserDoc.exists || freshUserDoc.data()?.referredBy) {
      return;
    }

    transaction.set(referralRef, {
      referrerId,
      referredUserId: params.newUserId,
      referredUserEmail: newUserEmail,
      referralCode: normalizedCode,
      status: "PENDING",
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    transaction.update(newUserRef, {
      referredBy: referrerId,
      referredByCode: normalizedCode,
      referralCodeUsed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    referralId: referralRef.id,
    referrerId,
  };
}

export async function ensureReferralFromCheckout(params: {
  referralCode: string;
  userId: string;
  userEmail: string;
}): Promise<void> {
  const normalizedCode = normalizeReferralCode(params.referralCode);
  if (!normalizedCode || !params.userId || !params.userEmail) {
    return;
  }

  const validation = await validateReferralCode(normalizedCode);
  if (!validation.valid || !validation.referrerId || validation.referrerId === params.userId) {
    return;
  }

  const db = await getAdminFirestore();
  const userRef = db.collection("users").doc(params.userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    return;
  }

  const userData = userDoc.data() || {};
  if (userData.referredBy) {
    return;
  }

  const existingReferrals = await db
    .collection("referrals")
    .where("referredUserId", "==", params.userId)
    .limit(1)
    .get();

  if (!existingReferrals.empty) {
    return;
  }

  const partnersSnapshot = await db
    .collection("partners")
    .where("userId", "==", params.userId)
    .limit(1)
    .get();

  if (!partnersSnapshot.empty) {
    return;
  }

  const admin = await import("firebase-admin");
  const referralRef = db.collection("referrals").doc();

  await referralRef.set({
    referrerId: validation.referrerId,
    referredUserId: params.userId,
    referredUserEmail: params.userEmail.trim().toLowerCase(),
    referralCode: normalizedCode,
    status: "PENDING",
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await userRef.update({
    referredBy: validation.referrerId,
    referredByCode: normalizedCode,
    referralCodeUsed: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export type AwardReferralCreditsResult = {
  awarded: boolean;
  creditsAwarded: number;
  referralId?: string;
  referrerId?: string;
  alreadyCompleted?: boolean;
  userId?: string;
  queued?: boolean;
};

async function resolveUserForReferralPayment(params: {
  userId?: string | null;
  userEmail?: string | null;
  stripeCustomerId?: string | null;
}) {
  const db = await getAdminFirestore();
  let userId = params.userId || null;
  let userEmail = params.userEmail?.trim().toLowerCase() || null;

  if (userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      return {
        userId,
        userEmail: userEmail || String(userDoc.data()?.email || "").toLowerCase(),
        userDoc,
      };
    }
  }

  if (params.stripeCustomerId) {
    const byStripe = await db
      .collection("users")
      .where("stripeCustomerId", "==", params.stripeCustomerId)
      .limit(1)
      .get();
    if (!byStripe.empty) {
      const doc = byStripe.docs[0];
      return {
        userId: doc.id,
        userEmail: String(doc.data()?.email || userEmail || "").toLowerCase(),
        userDoc: doc,
      };
    }
  }

  if (userEmail) {
    const byEmail = await db
      .collection("users")
      .where("email", "==", userEmail)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      const doc = byEmail.docs[0];
      return {
        userId: doc.id,
        userEmail,
        userDoc: doc,
      };
    }
  }

  return { userId: null, userEmail, userDoc: null };
}

async function resolveReferredUserForReferral(referralData: Record<string, unknown>) {
  const db = await getAdminFirestore();
  let referredUserId =
    typeof referralData.referredUserId === "string" ? referralData.referredUserId : null;
  const referredUserEmail =
    typeof referralData.referredUserEmail === "string"
      ? referralData.referredUserEmail.trim().toLowerCase()
      : null;

  if (referredUserId) {
    const referredUserDoc = await db.collection("users").doc(referredUserId).get();
    if (referredUserDoc.exists) {
      return { referredUserId, referredUserDoc };
    }
  }

  if (referredUserEmail) {
    const byEmail = await db
      .collection("users")
      .where("email", "==", referredUserEmail)
      .limit(1)
      .get();

    if (!byEmail.empty) {
      return {
        referredUserId: byEmail.docs[0].id,
        referredUserDoc: byEmail.docs[0],
      };
    }
  }

  return { referredUserId: null, referredUserDoc: null };
}

export async function referredUserHasCompletedPayment(params: {
  referredUserId: string;
  referredUserData: Record<string, unknown>;
  referredUserEmail?: string | null;
}) {
  const hasPaidInFirestore =
    params.referredUserData.paymentStatus === "paid" ||
    Boolean(params.referredUserData.stripeSubscriptionId) ||
    Boolean(params.referredUserData.stripeCustomerId);

  if (hasPaidInFirestore) {
    return {
      hasPaid: true,
      stripeCustomerId:
        typeof params.referredUserData.stripeCustomerId === "string"
          ? params.referredUserData.stripeCustomerId
          : null,
    };
  }

  const stripeCheck = await hasStripeCustomerPaid({
    stripeCustomerId:
      typeof params.referredUserData.stripeCustomerId === "string"
        ? params.referredUserData.stripeCustomerId
        : null,
    email:
      params.referredUserEmail ||
      (typeof params.referredUserData.email === "string"
        ? params.referredUserData.email
        : null),
  });

  if (stripeCheck.hasPaid && stripeCheck.stripeCustomerId) {
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    await db
      .collection("users")
      .doc(params.referredUserId)
      .set(
        {
          paymentStatus: "paid",
          stripeCustomerId: stripeCheck.stripeCustomerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  return stripeCheck;
}

export async function queuePendingReferralPayment(params: {
  userEmail: string;
  referralCode?: string | null;
  stripeCustomerId?: string | null;
  stripeSessionId?: string | null;
}) {
  const userEmail = params.userEmail.trim().toLowerCase();
  const normalizedCode = params.referralCode
    ? normalizeReferralCode(params.referralCode)
    : "";

  if (!userEmail) {
    return;
  }

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");

  await db
    .collection("pendingReferralPayments")
    .doc(userEmail)
    .set(
      {
        userEmail,
        referralCode: normalizedCode || null,
        stripeCustomerId: params.stripeCustomerId || null,
        stripeSessionId: params.stripeSessionId || null,
        processed: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

export async function processPendingReferralPaymentForUser(
  userId: string,
  userEmail: string
): Promise<AwardReferralCreditsResult> {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const db = await getAdminFirestore();
  const pendingRef = db.collection("pendingReferralPayments").doc(normalizedEmail);
  const pendingDoc = await pendingRef.get();

  if (!pendingDoc.exists) {
    return { awarded: false, creditsAwarded: 0, userId };
  }

  const pendingData = pendingDoc.data() || {};
  const shouldRetry =
    !pendingData.processed || pendingData.lastAwardResult === "pending_referral";

  if (!shouldRetry) {
    return { awarded: false, creditsAwarded: 0, userId, alreadyCompleted: true };
  }
  if (pendingData.referralCode) {
    await ensureReferralFromCheckout({
      referralCode: pendingData.referralCode,
      userId,
      userEmail: normalizedEmail,
    });
  }

  const awardResult = await awardReferralCreditsForUser(userId);
  const admin = await import("firebase-admin");
  await pendingRef.set(
    {
      processed: awardResult.awarded || awardResult.alreadyCompleted === true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      lastAwardAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAwardResult: awardResult.awarded
        ? "awarded"
        : awardResult.alreadyCompleted
          ? "already_completed"
          : "pending_referral",
    },
    { merge: true }
  );

  return { ...awardResult, userId };
}

export async function completeReferralAfterPayment(params: {
  userId?: string | null;
  userEmail?: string | null;
  stripeCustomerId?: string | null;
  stripeSessionId?: string | null;
  referralCode?: string | null;
  markPaid?: boolean;
}): Promise<AwardReferralCreditsResult> {
  const resolved = await resolveUserForReferralPayment(params);

  if (!resolved.userId) {
    if (params.userEmail) {
      await queuePendingReferralPayment({
        userEmail: params.userEmail,
        referralCode: params.referralCode,
        stripeCustomerId: params.stripeCustomerId,
        stripeSessionId: params.stripeSessionId,
      });
    }
    return { awarded: false, creditsAwarded: 0, queued: true };
  }

  const userId = resolved.userId;
  const userEmail = resolved.userEmail || params.userEmail?.trim().toLowerCase() || "";

  if (params.referralCode && userEmail) {
    await ensureReferralFromCheckout({
      referralCode: params.referralCode,
      userId,
      userEmail,
    });
  }

  if (params.markPaid) {
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const updates: Record<string, unknown> = {
      paymentStatus: "paid",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (params.stripeCustomerId) {
      updates.stripeCustomerId = params.stripeCustomerId;
    }
    await db.collection("users").doc(userId).set(updates, { merge: true });
  }

  const pendingResult = userEmail
    ? await processPendingReferralPaymentForUser(userId, userEmail)
    : { awarded: false, creditsAwarded: 0, userId };

  if (pendingResult.awarded) {
    return pendingResult;
  }

  const awardResult = await awardReferralCreditsForUser(userId);
  return { ...awardResult, userId };
}

export async function awardReferralCreditsForUser(
  userId: string
): Promise<AwardReferralCreditsResult> {
  const db = await getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { awarded: false, creditsAwarded: 0 };
  }

  const userData = userDoc.data() || {};
  let referrerId = userData.referredBy as string | undefined;

  const pendingReferrals = await db
    .collection("referrals")
    .where("referredUserId", "==", userId)
    .where("status", "==", "PENDING")
    .limit(1)
    .get();

  if (pendingReferrals.empty) {
    return { awarded: false, creditsAwarded: 0, alreadyCompleted: true };
  }

  const referralDoc = pendingReferrals.docs[0];
  const referralData = referralDoc.data();
  referrerId = referrerId || (referralData.referrerId as string);

  if (!referrerId) {
    return { awarded: false, creditsAwarded: 0 };
  }

  if (!userData.referredBy) {
    const admin = await import("firebase-admin");
    await userRef.set(
      {
        referredBy: referrerId,
        referredByCode: referralData.referralCode || userData.referredByCode || null,
        referralCodeUsed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const existingCredits = await db
    .collection("credits")
    .where("referralId", "==", referralDoc.id)
    .where("type", "==", "referral_reward")
    .limit(1)
    .get();

  if (!existingCredits.empty) {
    return {
      awarded: false,
      creditsAwarded: 0,
      referralId: referralDoc.id,
      referrerId,
      alreadyCompleted: true,
    };
  }

  const admin = await import("firebase-admin");
  const referredCreditRef = db.collection("credits").doc();
  const referrerCreditRef = db.collection("credits").doc();
  const referrerRef = db.collection("users").doc(referrerId);

  let awarded = false;

  await db.runTransaction(async (transaction: any) => {
    const freshReferral = await transaction.get(referralDoc.ref);
    const referrerSnapshot = await transaction.get(referrerRef);

    if (!freshReferral.exists || freshReferral.data()?.status !== "PENDING") {
      return;
    }

    transaction.set(referredCreditRef, {
      userId,
      amount: REFERRAL_DISCOUNT_AMOUNT,
      currency: "USD",
      used: false,
      referralId: referralDoc.id,
      type: "referral_reward",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
    });

    transaction.set(referrerCreditRef, {
      userId: referrerId,
      amount: REFERRAL_DISCOUNT_AMOUNT,
      currency: "USD",
      used: false,
      referralId: referralDoc.id,
      type: "referral_reward",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
    });

    transaction.update(referralDoc.ref, {
      status: "COMPLETED",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (referrerSnapshot.exists) {
      const currentCount = referrerSnapshot.data()?.referralCount || 0;
      transaction.update(referrerRef, {
        referralCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    awarded = true;
  });

  return {
    awarded,
    creditsAwarded: awarded ? 2 : 0,
    referralId: referralDoc.id,
    referrerId,
  };
}

export async function syncPendingReferralsForReferrer(referrerId: string): Promise<{
  checked: number;
  awarded: number;
}> {
  const db = await getAdminFirestore();
  const pendingReferrals = await db
    .collection("referrals")
    .where("referrerId", "==", referrerId)
    .where("status", "==", "PENDING")
    .get();

  let awarded = 0;

  for (const referralDoc of pendingReferrals.docs) {
    try {
      const referralData = referralDoc.data();
      const { referredUserId, referredUserDoc } = await resolveReferredUserForReferral(
        referralData
      );

      if (!referredUserId || !referredUserDoc) {
        const referredUserEmail =
          typeof referralData.referredUserEmail === "string"
            ? referralData.referredUserEmail.trim().toLowerCase()
            : null;

        if (referredUserEmail) {
          const stripeCheck = await hasStripeCustomerPaid({ email: referredUserEmail });
          if (!stripeCheck.hasPaid) continue;

          const byEmail = await db
            .collection("users")
            .where("email", "==", referredUserEmail)
            .limit(1)
            .get();

          if (byEmail.empty) continue;

          const paymentCheck = await referredUserHasCompletedPayment({
            referredUserId: byEmail.docs[0].id,
            referredUserData: byEmail.docs[0].data() || {},
            referredUserEmail,
          });
          if (!paymentCheck.hasPaid) continue;

          const result = await awardReferralCreditsForUser(byEmail.docs[0].id);
          if (result.awarded) {
            awarded += 1;
          }
        }
        continue;
      }

      if (
        !referralData.referredUserId ||
        referralData.referredUserId !== referredUserId
      ) {
        const admin = await import("firebase-admin");
        await referralDoc.ref.set(
          {
            referredUserId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      const referredUserData = referredUserDoc.data() || {};
      const paymentCheck = await referredUserHasCompletedPayment({
        referredUserId,
        referredUserData,
        referredUserEmail:
          typeof referralData.referredUserEmail === "string"
            ? referralData.referredUserEmail
            : null,
      });

      if (!paymentCheck.hasPaid) continue;

      const result = await awardReferralCreditsForUser(referredUserId);
      if (result.awarded) {
        awarded += 1;
      }
    } catch (referralError) {
      console.error("[Sync Pending Referrals] Failed for referral:", referralDoc.id, referralError);
    }
  }

  return {
    checked: pendingReferrals.size,
    awarded,
  };
}

export async function syncReferrerStatsForUser(referrerId: string): Promise<{
  completedReferrals: number;
  referralCount: number;
  totalCredits: number;
  creditCount: number;
}> {
  const db = await getAdminFirestore();
  const completedReferralsSnapshot = await db
    .collection("referrals")
    .where("referrerId", "==", referrerId)
    .where("status", "==", "COMPLETED")
    .get();

  const completedReferrals = completedReferralsSnapshot.size;
  const { credits, totalCredits } = await getUnusedCreditsForUser(referrerId);

  const userRef = db.collection("users").doc(referrerId);
  const userDoc = await userRef.get();
  const storedCount = Number(userDoc.data()?.referralCount || 0);

  if (userDoc.exists && storedCount !== completedReferrals) {
    const admin = await import("firebase-admin");
    await userRef.set(
      {
        referralCount: completedReferrals,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return {
    completedReferrals,
    referralCount: completedReferrals,
    totalCredits,
    creditCount: credits.length,
  };
}

export async function getUnusedCreditsForUser(userId: string) {
  const db = await getAdminFirestore();
  const snapshot = await db
    .collection("credits")
    .where("userId", "==", userId)
    .where("used", "==", false)
    .get();

  const credits = snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    amount: Number(doc.data().amount) || 0,
    createdAt: doc.data().createdAt as { toMillis?: () => number; seconds?: number } | undefined,
  }));

  credits.sort((a: { createdAt?: { toMillis?: () => number; seconds?: number } }, b: { createdAt?: { toMillis?: () => number; seconds?: number } }) => {
    const aTime =
      typeof a.createdAt?.toMillis === "function"
        ? a.createdAt.toMillis()
        : Number(a.createdAt?.seconds || 0) * 1000;
    const bTime =
      typeof b.createdAt?.toMillis === "function"
        ? b.createdAt.toMillis()
        : Number(b.createdAt?.seconds || 0) * 1000;
    return aTime - bTime;
  });

  const totalCredits = credits.reduce((sum: number, credit: { amount: number }) => sum + credit.amount, 0);
  return { credits, totalCredits };
}

export async function hasUserUsedAnotherReferralCode(
  userId: string,
  referralCode: string
): Promise<boolean> {
  const db = await getAdminFirestore();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    return false;
  }

  const userData = userDoc.data() || {};
  const existingCode = userData.referredByCode
    ? normalizeReferralCode(String(userData.referredByCode))
    : "";
  const normalizedCode = normalizeReferralCode(referralCode);

  return Boolean(userData.referredBy && existingCode && existingCode !== normalizedCode);
}
