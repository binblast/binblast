// app/api/quotes/[quoteId]/update-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, updateDoc } = firestore;

    const { status } = await request.json();

    if (!["pending", "contacted", "quoted", "converted"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const quoteRef = doc(db, "customQuotes", params.quoteId);
    await updateDoc(quoteRef, { status });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating quote status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update quote status" },
      { status: 500 }
    );
  }
}

