// app/api/operator/cleanings/by-customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  getEmployeeWorkingDayNames,
  scoreCleaningForEmployee,
} from "@/lib/day-assignment";
import { loadEmployeeScheduleForDate } from "@/lib/employee-schedule";

interface CustomerCleaningRecord {
  id: string;
  status?: string;
  jobStatus?: string;
  scheduledDate?: string;
  trashDay?: string;
  assignedEmployeeId?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerUserIds, employeeId } = body;

    if (!customerUserIds || !Array.isArray(customerUserIds) || customerUserIds.length === 0) {
      return NextResponse.json(
        { error: "customerUserIds must be a non-empty array" },
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
    const { collection, query, where, getDocs } = firestore;

    const cleaningsRef = collection(db, "scheduledCleanings");
    const today = new Date().toISOString().split("T")[0];

    const cleaningPromises = customerUserIds.map(async (customerUserId: string) => {
      const cleaningQuery = query(cleaningsRef, where("userId", "==", customerUserId));
      const snapshot = await getDocs(cleaningQuery);

      const cleanings = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CustomerCleaningRecord, "id">),
        }))
        .filter((c) => {
          return (
            c.status === "upcoming" &&
            c.scheduledDate &&
            c.scheduledDate >= today &&
            c.jobStatus !== "completed"
          );
        });

      if (cleanings.length === 0) {
        return null;
      }

      let employeeWorkingDays: string[] = [];
      if (employeeId) {
        const referenceDate = cleanings[0]?.scheduledDate || today;
        const schedule = await loadEmployeeScheduleForDate(employeeId, referenceDate);
        employeeWorkingDays = getEmployeeWorkingDayNames(schedule);
      }

      cleanings.sort((a, b) => {
        if (employeeId) {
          const scoreDiff =
            scoreCleaningForEmployee(b, employeeWorkingDays) -
            scoreCleaningForEmployee(a, employeeWorkingDays);
          if (scoreDiff !== 0) return scoreDiff;
        }

        const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
        if (dateCompare !== 0) return dateCompare;

        if (!a.assignedEmployeeId && b.assignedEmployeeId) return -1;
        if (a.assignedEmployeeId && !b.assignedEmployeeId) return 1;
        return 0;
      });

      return cleanings[0] || null;
    });

    const cleaningDocs = await Promise.all(cleaningPromises);
    const validCleanings = cleaningDocs.filter((c) => c !== null && c !== undefined);

    return NextResponse.json({
      cleanings: validCleanings,
      count: validCleanings.length,
    });
  } catch (error: any) {
    console.error("Error getting cleanings for customers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get cleanings for customers" },
      { status: 500 }
    );
  }
}
