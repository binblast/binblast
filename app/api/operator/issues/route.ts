import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "open";

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    const issuesQuery = query(
      collection(db, "employeeIssues"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(issuesQuery);
    const issues = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ issues });
  } catch (error: any) {
    console.error("Error fetching operator issues:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
