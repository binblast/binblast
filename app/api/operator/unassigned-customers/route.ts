// app/api/operator/unassigned-customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { message: "date parameter is required" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get all cleanings for the specified date that are not assigned
    const cleaningsRef = collection(db, "scheduledCleanings");
    const dateQuery = query(
      cleaningsRef,
      where("scheduledDate", "==", date)
    );

    const snapshot = await getDocs(dateQuery);
    const unassignedCustomers = snapshot.docs
      .filter((doc) => {
        const data = doc.data();
        // Filter out assigned cleanings and completed/cancelled ones
        return (
          !data.assignedEmployeeId &&
          data.status !== "completed" &&
          data.status !== "cancelled" &&
          (data.jobStatus !== "completed" && data.jobStatus !== "cancelled")
        );
      })
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    return NextResponse.json(
      { customers: unassignedCustomers },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting unassigned customers:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get unassigned customers" },
      { status: 500 }
    );
  }
}

