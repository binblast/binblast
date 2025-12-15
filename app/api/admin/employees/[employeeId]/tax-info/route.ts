// app/api/admin/employees/[employeeId]/tax-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
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
    const { doc, getDoc } = firestore;

    const userDoc = await getDoc(doc(db, "users", employeeId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const data = userDoc.data();
    const taxInfo = data.taxInfo || null;

    return NextResponse.json({
      success: true,
      taxInfo,
    });
  } catch (error: any) {
    console.error("Error fetching tax info:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tax information" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, ssn, ein, address, signature, signedDate } = body;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const userDocRef = doc(db, "users", employeeId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const taxInfo: any = {};
    if (name !== undefined) taxInfo.name = name;
    if (ssn !== undefined) taxInfo.ssn = ssn; // In production, encrypt this
    if (ein !== undefined) taxInfo.ein = ein;
    if (address !== undefined) taxInfo.address = address;
    if (signature !== undefined) taxInfo.signature = signature;
    if (signedDate !== undefined) {
      taxInfo.signedDate = signedDate;
    } else {
      taxInfo.signedDate = serverTimestamp();
    }

    await updateDoc(userDocRef, {
      taxInfo,
      updatedAt: serverTimestamp(),
    });

    // Audit logging for tax info updates
    await logAdminAction("update_tax_info", userId || "admin", {
      employeeId,
      hasSSN: !!taxInfo.ssn,
      hasEIN: !!taxInfo.ein,
    });

    return NextResponse.json({
      success: true,
      message: "Tax information updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating tax info:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tax information" },
      { status: 500 }
    );
  }
}
