import { NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export interface PartnerAuthResult {
  isPartner: boolean;
  userId?: string;
  email?: string;
  partner?: {
    id: string;
    businessName: string;
    referralCode: string;
    status: string;
    partnerTier?: string;
    serviceAreas?: string[];
    [key: string]: unknown;
  } | null;
}

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

async function verifyAuthToken(
  req: NextRequest
): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) return null;

    const { getAdminApp } = await import("@/lib/firebase-admin");
    const adminApp = await getAdminApp();
    const decodedToken = await adminApp.auth().verifyIdToken(idToken);

    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    console.error("[Partner Auth] Token verification error:", error);
    return null;
  }
}

async function findActivePartnerRecord(
  userId: string,
  userEmail?: string | null
): Promise<PartnerAuthResult["partner"] | null> {
  const db = await getAdminFirestore();

  const byUserId = await db
    .collection("partners")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!byUserId.empty) {
    const doc = byUserId.docs[0] as FirestoreDocument;
    return { id: doc.id, ...doc.data() } as PartnerAuthResult["partner"];
  }

  const normalizedEmail = userEmail?.toLowerCase().trim();
  if (normalizedEmail) {
    const byEmail = await db
      .collection("partners")
      .where("email", "==", normalizedEmail)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!byEmail.empty) {
      const doc = byEmail.docs[0] as FirestoreDocument;
      return { id: doc.id, ...doc.data() } as PartnerAuthResult["partner"];
    }
  }

  return null;
}

async function findAnyPartnerRecord(
  userId: string,
  userEmail?: string | null
): Promise<PartnerAuthResult["partner"] | null> {
  const db = await getAdminFirestore();

  const byUserId = await db
    .collection("partners")
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (!byUserId.empty) {
    const doc = byUserId.docs[0] as FirestoreDocument;
    return { id: doc.id, ...doc.data() } as PartnerAuthResult["partner"];
  }

  const normalizedEmail = userEmail?.toLowerCase().trim();
  if (normalizedEmail) {
    const byEmail = await db
      .collection("partners")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!byEmail.empty) {
      const doc = byEmail.docs[0] as FirestoreDocument;
      return { id: doc.id, ...doc.data() } as PartnerAuthResult["partner"];
    }
  }

  return null;
}

export async function checkPartnerAccess(req: NextRequest): Promise<PartnerAuthResult> {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return { isPartner: false };
  }

  try {
    const activePartner = await findActivePartnerRecord(auth.uid, auth.email);
    if (activePartner) {
      return {
        isPartner: true,
        userId: auth.uid,
        email: auth.email,
        partner: activePartner,
      };
    }

    const anyPartner = await findAnyPartnerRecord(auth.uid, auth.email);
    if (anyPartner) {
      return {
        isPartner: false,
        userId: auth.uid,
        email: auth.email,
        partner: anyPartner,
      };
    }

    return { isPartner: false, userId: auth.uid, email: auth.email };
  } catch (error) {
    console.error("[Partner Auth] Partner lookup error:", error);
    return { isPartner: false, userId: auth.uid, email: auth.email };
  }
}
