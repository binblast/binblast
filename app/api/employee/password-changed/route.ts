// app/api/employee/password-changed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/password-changed
 * Mark that an employee has changed their password (clears temp password)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
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

    const userDocRef = doc(db, "users", employeeId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Clear temp password and mark as changed
    await updateDoc(userDocRef, {
      tempPassword: null,
      hasChangedPassword: true,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Password change recorded successfully",
    });
  } catch (error: any) {
    console.error("Error recording password change:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record password change" },
      { status: 500 }
    );
  }
}
