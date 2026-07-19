import { NextRequest } from "next/server";
import { getActivePartner, getPartner } from "@/lib/partner-auth";

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

export async function checkPartnerAccess(req: NextRequest): Promise<PartnerAuthResult> {
  const auth = await verifyAuthToken(req);
  if (!auth) {
    return { isPartner: false };
  }

  const partner = await getActivePartner(auth.uid);
  if (partner) {
    return {
      isPartner: true,
      userId: auth.uid,
      email: auth.email,
      partner,
    };
  }

  const anyPartner = await getPartner(auth.uid, auth.email);
  if (anyPartner && anyPartner.status !== "active") {
    return {
      isPartner: false,
      userId: auth.uid,
      email: auth.email,
      partner: anyPartner,
    };
  }

  return { isPartner: false, userId: auth.uid, email: auth.email };
}
