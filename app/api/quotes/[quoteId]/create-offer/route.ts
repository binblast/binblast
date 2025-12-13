// app/api/quotes/[quoteId]/create-offer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId;
    const body = await request.json();

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, doc, addDoc, updateDoc, serverTimestamp, getDoc } = firestore;

    // Verify quote exists
    const quoteRef = doc(db, "customQuotes", quoteId);
    const quoteSnap = await getDoc(quoteRef);
    
    if (!quoteSnap.exists()) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Get current user (operator/admin) - in a real app, get from auth
    // For now, we'll use a placeholder or get from request headers
    const createdBy = "system"; // TODO: Get from auth token

    // Create offer document
    const offersRef = collection(db, "customQuotes", quoteId, "offers");
    const offerData = {
      quoteId,
      customizedPrice: body.customizedPrice,
      customizedPriceLow: body.customizedPriceLow || body.customizedPrice,
      customizedPriceHigh: body.customizedPriceHigh || body.customizedPrice,
      customizedFrequency: body.customizedFrequency,
      customizedServices: body.customizedServices || {},
      specialNotes: body.specialNotes || "",
      timeline: body.timeline || "",
      termsAndConditions: body.termsAndConditions || "",
      createdBy,
      createdAt: serverTimestamp(),
      status: body.sendEmail ? "sent" : "draft",
      sentAt: body.sendEmail ? serverTimestamp() : null,
    };

    const offerRef = await addDoc(offersRef, offerData);
    const offerId = offerRef.id;

    // Get current quote data to calculate offer count
    const currentQuoteData = quoteSnap.data();
    const currentOfferCount = currentQuoteData.offerCount || 0;

    // Update quote status and link to latest offer
    await updateDoc(quoteRef, {
      status: body.sendEmail ? "quoted" : "pending",
      latestOfferId: offerId,
      offerCount: currentOfferCount + 1,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      offerId,
      message: body.sendEmail ? "Offer created and sent" : "Offer saved as draft",
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create offer" },
      { status: 500 }
    );
  }
}

