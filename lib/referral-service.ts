import { getAdminFirestore } from "@/lib/firebase-admin";
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
};

export async function awardReferralCreditsForUser(
  userId: string
): Promise<AwardReferralCreditsResult> {
  const db = await getAdminFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return { awarded: false, creditsAwarded: 0 };
  }

  const userData = userDoc.data() || {};
  if (!userData.referredBy) {
    return { awarded: false, creditsAwarded: 0 };
  }

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
  const referrerId = referralData.referrerId as string;

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

  await db.runTransaction(async (transaction: any) => {
    const freshReferral = await transaction.get(referralDoc.ref);
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

    const referrerSnapshot = await transaction.get(referrerRef);
    if (referrerSnapshot.exists) {
      const currentCount = referrerSnapshot.data()?.referralCount || 0;
      transaction.update(referrerRef, {
        referralCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    awarded: true,
    creditsAwarded: 2,
    referralId: referralDoc.id,
    referrerId,
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
