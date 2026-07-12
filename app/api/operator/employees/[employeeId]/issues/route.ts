import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(
  _req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const issuesQuery = query(
      collection(db, "employeeIssues"),
      where("employeeId", "==", employeeId)
    );

    const snapshot = await getDocs(issuesQuery);
    const issues = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || null,
      }))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json({ issues });
  } catch (error: any) {
    console.error("Error fetching employee issues:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch employee issues" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { issueId, status } = body;

    if (!employeeId || !issueId || !status) {
      return NextResponse.json(
        { error: "Missing employeeId, issueId, or status" },
        { status: 400 }
      );
    }

    if (!["open", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const issueRef = doc(db, "employeeIssues", issueId);
    const issueSnap = await getDoc(issueRef);

    if (!issueSnap.exists() || issueSnap.data().employeeId !== employeeId) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    await updateDoc(issueRef, {
      status,
      resolvedAt: status === "resolved" ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating employee issue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update issue" },
      { status: 500 }
    );
  }
}
