// app/api/operator/cleanings/by-customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerUserIds } = body;

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
    const today = new Date().toISOString().split('T')[0];

    // Query cleanings for all customer user IDs
    // Query only by userId to avoid index requirement, then filter in memory
    const cleaningPromises = customerUserIds.map(async (customerUserId: string) => {
      const cleaningQuery = query(
        cleaningsRef,
        where("userId", "==", customerUserId)
      );
      
      const snapshot = await getDocs(cleaningQuery);
      
      // Filter and sort in memory to avoid index requirement
      const cleanings = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((c: any) => {
          // Filter by status and date in memory
          return c.status === "upcoming" && 
                 c.scheduledDate && 
                 c.scheduledDate >= today;
        })
        .sort((a: any, b: any) => {
          // Sort by date, then prefer unassigned
          const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
          if (dateCompare !== 0) return dateCompare;
          // Prefer unassigned over assigned
          if (!a.assignedEmployeeId && b.assignedEmployeeId) return -1;
          if (a.assignedEmployeeId && !b.assignedEmployeeId) return 1;
          return 0;
        });
      
      // Return the first cleaning (prefer unassigned)
      return cleanings[0] || null;
    });

    const cleaningDocs = await Promise.all(cleaningPromises);
    
    // Filter out null results
    const validCleanings = cleaningDocs.filter(c => c !== null && c !== undefined);

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
