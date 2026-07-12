import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } = firestore;

    const employeeRef = doc(db, "users", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeData = employeeSnap.data();
    if (employeeData.role !== "employee") {
      return NextResponse.json({ error: "User is not an employee" }, { status: 400 });
    }

    if (employeeData.hiringStatus === "terminated") {
      return NextResponse.json({ error: "Employee is already terminated" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const cleaningsRef = collection(db, "scheduledCleanings");
    const futureJobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("jobStatus", "in", ["scheduled", "pending", "in_progress"])
    );
    const futureJobsSnap = await getDocs(futureJobsQuery);

    await Promise.all(
      futureJobsSnap.docs.map(async (jobDoc) => {
        const jobData = jobDoc.data();
        const scheduledDate =
          typeof jobData.scheduledDate === "string"
            ? jobData.scheduledDate
            : jobData.scheduledDate?.toDate?.()?.toISOString?.()?.split("T")[0];

        if (!scheduledDate || scheduledDate >= today) {
          await updateDoc(jobDoc.ref, {
            assignedEmployeeId: null,
            updatedAt: serverTimestamp(),
          });
        }
      })
    );

    await updateDoc(employeeRef, {
      hiringStatus: "terminated",
      isActive: false,
      terminatedAt: serverTimestamp(),
      terminationReason: reason || null,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Employee removed from active roster",
    });
  } catch (error: any) {
    console.error("Error terminating employee:", error);
    return NextResponse.json(
      { error: error.message || "Failed to terminate employee" },
      { status: 500 }
    );
  }
}
