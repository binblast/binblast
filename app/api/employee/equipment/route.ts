// app/api/employee/equipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date");

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "Missing employeeId or date" },
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

    const checklistRef = collection(db, "equipmentChecklists");
    const checklistQuery = query(
      checklistRef,
      where("employeeId", "==", employeeId),
      where("date", "==", date)
    );
    const snapshot = await getDocs(checklistQuery);

    if (snapshot.empty) {
      return NextResponse.json({ checklist: null });
    }

    const checklistData = snapshot.docs[0].data();
    return NextResponse.json({
      checklist: {
        ...checklistData,
        id: snapshot.docs[0].id,
      },
    });
  } catch (error: any) {
    console.error("Error loading equipment checklist:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load checklist" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, date, items, completed } = body;

    if (!employeeId || !date || !items) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
    const { collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } = firestore;

    const checklistRef = collection(db, "equipmentChecklists");
    const existingQuery = query(
      checklistRef,
      where("employeeId", "==", employeeId),
      where("date", "==", date)
    );
    const existingSnapshot = await getDocs(existingQuery);

    const updateData: any = {
      employeeId,
      date,
      items,
      completed: completed || false,
    };

    if (completed) {
      updateData.completedAt = serverTimestamp();
    }

    if (!existingSnapshot.empty) {
      // Update existing record
      const docRef = existingSnapshot.docs[0].ref;
      await updateDoc(docRef, updateData);
    } else {
      // Create new record
      await addDoc(checklistRef, updateData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving equipment checklist:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save checklist" },
      { status: 500 }
    );
  }
}

