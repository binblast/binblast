// app/api/quotes/[quoteId]/create-offer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  buildAssignmentFirestorePayload,
  normalizeAssignmentInput,
  QuotePartnerAssignmentInput,
} from "@/lib/quote-partner-assignments";

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
    const { collection, doc, addDoc, updateDoc, setDoc, serverTimestamp, getDoc } = firestore;

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
      status: "draft",
      sentAt: null,
    };

    const offerRef = await addDoc(offersRef, offerData);
    const offerId = offerRef.id;

    const partnerAssignments: QuotePartnerAssignmentInput[] = [];
    if (Array.isArray(body.partnerAssignments)) {
      for (const rawRow of body.partnerAssignments) {
        const normalized = normalizeAssignmentInput(rawRow);
        if (normalized) {
          partnerAssignments.push(normalized);
        }
      }
    }

    if (partnerAssignments.length > 0) {
      const assignmentsRef = collection(
        db,
        "customQuotes",
        quoteId,
        "partnerAssignments"
      );
      const assignmentStatus = body.sendEmail ? "active" : "draft";

      for (const row of partnerAssignments) {
        const assignmentPayload = {
          ...buildAssignmentFirestorePayload(
            quoteId,
            offerId,
            row,
            assignmentStatus
          ),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const assignmentRef = await addDoc(assignmentsRef, assignmentPayload);
        await setDoc(
          doc(db, "partners", row.partnerId, "quoteAssignments", assignmentRef.id),
          assignmentPayload
        );
      }
    }

    // Get current quote data to calculate offer count
    const currentQuoteData = quoteSnap.data();
    const currentOfferCount = currentQuoteData.offerCount || 0;

    // Update quote status and link to latest offer
    await updateDoc(quoteRef, {
      latestOfferId: offerId,
      offerCount: currentOfferCount + 1,
      hasPartnerSplit: partnerAssignments.length > 0,
      partnerAssignmentCount: partnerAssignments.length,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      offerId,
      message: body.sendEmail ? "Offer draft created" : "Offer saved as draft",
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create offer" },
      { status: 500 }
    );
  }
}

