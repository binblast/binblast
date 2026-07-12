// app/api/account/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

async function verifyAuthToken(req: NextRequest): Promise<{ uid: string; email?: string } | null> {
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
    console.error("[Account Update API] Token verification error:", error);
    return null;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authData = await verifyAuthToken(req);
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = String(body.phone || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const userRef = db.collection("users").doc(authData.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const admin = await import("firebase-admin");
    await userRef.update({
      firstName,
      lastName,
      phone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const existingData = userDoc.data() || {};

    return NextResponse.json({
      success: true,
      user: {
        firstName,
        lastName,
        phone,
        email: existingData.email || authData.email || "",
      },
    });
  } catch (error: unknown) {
    console.error("[Account Update API] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
