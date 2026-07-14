// app/api/admin/partners/assign-user/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { partnerId, userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(userEmail).trim().toLowerCase();
    const db = await getAdminFirestore();

    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json(
        {
          error: `User with email ${userEmail} not found. User must register first and have a user document in Firestore.`,
        },
        { status: 404 }
      );
    }

    const userId = usersSnapshot.docs[0].id;

    let partnerRef;
    let partnerDoc;

    if (partnerId) {
      partnerRef = db.collection("partners").doc(partnerId);
      partnerDoc = await partnerRef.get();

      if (!partnerDoc.exists) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
    } else {
      const partnersSnapshot = await db
        .collection("partners")
        .where("email", "==", normalizedEmail)
        .limit(1)
        .get();

      if (partnersSnapshot.empty) {
        return NextResponse.json(
          { error: `No partner record found for email ${userEmail}` },
          { status: 404 }
        );
      }

      partnerDoc = partnersSnapshot.docs[0];
      partnerRef = db.collection("partners").doc(partnerDoc.id);
    }

    const partnerData = partnerDoc.data() || {};

    if (partnerData.userId && partnerData.userId !== userId) {
      return NextResponse.json(
        {
          error: `Partner already assigned to a different user (${partnerData.userId}). Cannot reassign.`,
          currentUserId: partnerData.userId,
        },
        { status: 400 }
      );
    }

    await partnerRef.update({
      userId,
      email: normalizedEmail,
      updatedAt: new Date(),
    });

    try {
      const applicationsSnapshot = await db
        .collection("partnerApplications")
        .where("email", "==", normalizedEmail)
        .get();

      const batch = db.batch();
      applicationsSnapshot.docs.forEach((appDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
        batch.update(appDoc.ref, {
          userId,
          updatedAt: new Date(),
        });
      });
      if (!applicationsSnapshot.empty) {
        await batch.commit();
      }
    } catch (appUpdateErr) {
      console.warn("[Assign User] Could not update partner application:", appUpdateErr);
    }

    return NextResponse.json({
      success: true,
      message: `User ${userEmail} successfully assigned to partner account`,
      partnerId: partnerDoc.id,
      userId,
      partnerData: {
        businessName: partnerData.businessName,
        email: partnerData.email,
        status: partnerData.status,
      },
    });
  } catch (err: any) {
    console.error("Error assigning user to partner:", err);
    return NextResponse.json(
      { error: err.message || "Failed to assign user to partner" },
      { status: 500 }
    );
  }
}
