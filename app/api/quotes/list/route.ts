// app/api/quotes/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(request: NextRequest) {
  try {
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, orderBy, where } = firestore;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";

    const quotesRef = collection(db, "customQuotes");
    let quotesQuery;

    if (status === "all") {
      quotesQuery = query(quotesRef, orderBy("submittedAt", "desc"));
    } else {
      quotesQuery = query(
        quotesRef,
        where("status", "==", status),
        orderBy("submittedAt", "desc")
      );
    }

    const snapshot = await getDocs(quotesQuery);
    const quotes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ quotes });
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

