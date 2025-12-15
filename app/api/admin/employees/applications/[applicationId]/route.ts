// app/api/admin/employees/applications/[applicationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicationId = params.applicationId;
    const body = await req.json();
    const { status, notes } = body;

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: applicationId, status" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Get application
    const applicationRef = doc(db, "employeeApplications", applicationId);
    const applicationDoc = await getDoc(applicationRef);

    if (!applicationDoc.exists()) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();
    const employeeId = applicationData.employeeId;

    // Update application
    await updateDoc(applicationRef, {
      status,
      reviewedBy: userId,
      reviewedAt: serverTimestamp(),
      notes: notes || "",
    });

    // Update user document
    const userDocRef = doc(db, "users", employeeId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const updateData: any = {
        hiringStatus: status === "approved" ? "approved" : "rejected",
        updatedAt: serverTimestamp(),
      };

      if (status === "approved") {
        updateData.hiredDate = serverTimestamp();
        updateData.hiredBy = userId;
      }

      await updateDoc(userDocRef, updateData);
    }

    // Audit logging for application review
    await logAdminAction("review_application", userId || "admin", {
      applicationId,
      employeeId,
      status,
      hasNotes: !!notes,
    });

    // TODO: Send email notification to employee

    return NextResponse.json({
      success: true,
      message: `Application ${status} successfully`,
    });
  } catch (error: any) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}
