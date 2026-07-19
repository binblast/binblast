// app/api/quotes/[quoteId]/send-offer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { notifyCustomQuoteOffer } from "@/lib/email-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId;
    const body = await request.json();
    const { offerId } = body;

    if (!offerId) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const quoteRef = doc(db, "customQuotes", quoteId);
    const quoteSnap = await getDoc(quoteRef);

    if (!quoteSnap.exists()) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const quoteData = quoteSnap.data();

    const offerRef = doc(db, "customQuotes", quoteId, "offers", offerId);
    const offerSnap = await getDoc(offerRef);

    if (!offerSnap.exists()) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const offerData = offerSnap.data();
    const customerEmail = String(quoteData.email || "").trim();

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is missing on this quote." },
        { status: 400 }
      );
    }

    const emailResult = await notifyCustomQuoteOffer({
      quote: {
        id: quoteId,
        propertyType: quoteData.propertyType,
        name: quoteData.name,
        email: customerEmail,
        phone: quoteData.phone,
        address: quoteData.address,
        commercialType: quoteData.commercialType,
        commercialBins: quoteData.commercialBins,
        dumpsterPadCleaning: quoteData.dumpsterPadCleaning,
        commercialFrequency: quoteData.commercialFrequency,
        commercialSpecialRequirements: quoteData.commercialSpecialRequirements,
        residentialBins: quoteData.residentialBins,
        residentialFrequency: quoteData.residentialFrequency,
        residentialSpecialRequirements: quoteData.residentialSpecialRequirements,
        hoaUnits: quoteData.hoaUnits,
        hoaBins: quoteData.hoaBins,
        hoaFrequency: quoteData.hoaFrequency,
        communityAccessRequirements: quoteData.communityAccessRequirements,
        specialInstructions: quoteData.specialInstructions,
        timeline: quoteData.timeline,
      },
      offer: {
        customizedPrice: offerData.customizedPrice,
        customizedFrequency: offerData.customizedFrequency,
        customizedServices: offerData.customizedServices,
        specialNotes: offerData.specialNotes,
        timeline: offerData.timeline,
        termsAndConditions: offerData.termsAndConditions,
      },
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send offer email to customer." },
        { status: 500 }
      );
    }

    await updateDoc(offerRef, {
      status: "sent",
      sentAt: serverTimestamp(),
      emailSentTo: customerEmail.toLowerCase(),
    });

    await updateDoc(quoteRef, {
      status: "quoted",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Offer emailed to ${customerEmail}`,
      emailSentTo: customerEmail.toLowerCase(),
    });
  } catch (error: unknown) {
    console.error("Error sending offer:", error);
    const message = error instanceof Error ? error.message : "Failed to send offer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
