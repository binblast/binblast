// app/api/operator/employees/[employeeId]/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    // Verify employee exists
    const { doc, getDoc } = firestore;
    const employeeDoc = await getDoc(doc(db, "users", employeeId));
    if (!employeeDoc.exists()) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeData = employeeDoc.data();
    if (employeeData.role !== "employee") {
      return NextResponse.json(
        { message: "User is not an employee" },
        { status: 400 }
      );
    }

    // Get completed cleanings for this employee
    const cleaningsRef = collection(db, "scheduledCleanings");
    let completedQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("jobStatus", "==", "completed")
    );

    // Apply date filters if provided
    if (startDate) {
      completedQuery = query(completedQuery, where("scheduledDate", ">=", startDate));
    }
    if (endDate) {
      completedQuery = query(completedQuery, where("scheduledDate", "<=", endDate));
    }

    // Order by completion date (most recent first)
    completedQuery = query(completedQuery, orderBy("completedAt", "desc"));

    const snapshot = await getDocs(completedQuery);
    const fulfilledCustomers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      { fulfilledCustomers },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting fulfilled customers:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get fulfilled customers" },
      { status: 500 }
    );
  }
}

