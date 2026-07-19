// app/api/quotes/custom-quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { calculatePricingWithSafeguards, PricingInput } from "@/lib/pricing-safeguards";
import { notifyCustomQuoteEstimate } from "@/lib/email-utils";

function getPropertyTypeLabel(type: string) {
  switch (type) {
    case "residential":
      return "Residential";
    case "commercial":
      return "Commercial";
    case "hoa":
      return "HOA / Neighborhood";
    default:
      return type;
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp } = firestore;

    const formData = await request.json();

    // Validate required fields
    if (!formData.propertyType || !formData.name || !formData.email || !formData.phone || !formData.address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate pricing using centralized safeguard utility
    const pricingInput: PricingInput = {
      propertyType: formData.propertyType,
      commercialType: formData.commercialType,
      dumpsterCount: formData.commercialBins,
      hasDumpsterPad: formData.dumpsterPadCleaning,
      frequency: (formData.commercialFrequency || formData.residentialFrequency || formData.hoaFrequency || "Monthly") as "Monthly" | "Bi-weekly" | "Weekly",
      specialRequirements: formData.commercialSpecialRequirements || formData.residentialSpecialRequirements || formData.communityAccessRequirements || formData.specialInstructions,
      residentialBins: formData.residentialBins,
      hoaUnits: formData.hoaUnits,
      hoaBins: formData.hoaBins,
    };

    const pricingResult = calculatePricingWithSafeguards(pricingInput);

    // Extract values for compatibility
    const estimatedPrice = pricingResult.finalPrice;
    const lowEstimate = pricingResult.lowEstimate;
    const highEstimate = pricingResult.highEstimate;
    const minimumPriceEnforced = pricingResult.minimumPriceEnforced;
    const requiresManualReview = pricingResult.requiresManualReview;
    const reviewReasons = pricingResult.reviewReasons;
    const safeguardReasons = pricingResult.safeguardReasons;
    const originalCalculatedPrice = pricingResult.originalCalculatedPrice;
    const pricingBreakdown = pricingResult.pricingBreakdown;

    // Bundle detection (for display purposes)
    let recommendedBundle: string | null = null;
    if (formData.propertyType === "commercial" && formData.dumpsterPadCleaning && !requiresManualReview) {
      if (formData.commercialType === "Restaurant" && formData.commercialFrequency === "Weekly") {
        recommendedBundle = "Premium Property Protection";
      } else if (formData.commercialType === "Restaurant" && formData.commercialFrequency === "Bi-weekly") {
        recommendedBundle = "Restaurant Compliance Bundle";
      } else {
        recommendedBundle = "Commercial Clean Site Bundle";
      }
    }

    // Create quote document
    const quoteData = {
      propertyType: formData.propertyType,
      // Residential fields
      residentialBins: formData.residentialBins || null,
      residentialFrequency: formData.residentialFrequency || null,
      residentialSpecialRequirements: formData.residentialSpecialRequirements || null,
      // Commercial fields
      commercialType: formData.commercialType || null,
      commercialBins: formData.commercialBins || null,
      dumpsterPadCleaning: formData.dumpsterPadCleaning || false,
      commercialFrequency: formData.commercialFrequency || null,
      commercialSpecialRequirements: formData.commercialSpecialRequirements || null,
      // HOA fields
      hoaUnits: formData.hoaUnits || null,
      hoaBins: formData.hoaBins || null,
      hoaFrequency: formData.hoaFrequency || null,
      bulkPricing: formData.bulkPricing || false,
      communityAccessRequirements: formData.communityAccessRequirements || null,
      // Contact info
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      preferredContact: formData.preferredContact || null,
      bestTimeToContact: formData.bestTimeToContact || null,
      // Additional
      address: formData.address,
      specialInstructions: formData.specialInstructions || null,
      timeline: formData.timeline || null,
      // Metadata
      submittedAt: serverTimestamp(),
      status: requiresManualReview ? "pending_review" : "pending",
      estimatedPrice: estimatedPrice,
      estimatedPriceLow: lowEstimate,
      estimatedPriceHigh: highEstimate,
      originalCalculatedPrice: originalCalculatedPrice,
      safeguardAdjustedPrice: minimumPriceEnforced ? estimatedPrice : null,
      safeguardReasons: safeguardReasons.length > 0 ? safeguardReasons : null,
      requiresManualReview: requiresManualReview,
      reviewReasons: reviewReasons.length > 0 ? reviewReasons : null,
      minimumPriceEnforced: minimumPriceEnforced,
      recommendedBundle: recommendedBundle,
      pricingBreakdown: pricingBreakdown,
    };

    const quotesRef = collection(db, "customQuotes");
    const docRef = await addDoc(quotesRef, quoteData);

    // Send email notifications (async, don't wait for completion)
    try {
      // Admin notification email
      const adminEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: process.env.ADMIN_EMAIL || "admin@binblast.com",
          subject: `New Custom Quote Request - ${formData.name}`,
          html: `
            <h2>New Custom Quote Request</h2>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Property Type:</strong> ${getPropertyTypeLabel(formData.propertyType)}</p>
            <p><strong>Address:</strong> ${formData.address}</p>
            <p><strong>Estimated Price Range:</strong> $${lowEstimate.toLocaleString()} - $${highEstimate.toLocaleString()}/month</p>
            ${requiresManualReview ? `<p><strong>Requires Manual Review:</strong> Yes</p><p><strong>Review Reasons:</strong> ${reviewReasons.join(", ")}</p>` : ''}
            ${minimumPriceEnforced ? `<p><strong>Price Safeguard Applied:</strong> Original price was $${originalCalculatedPrice?.toLocaleString()}, adjusted to $${estimatedPrice.toLocaleString()}</p>` : ''}
            ${safeguardReasons.length > 0 ? `<p><strong>Safeguard Reasons:</strong> ${safeguardReasons.join(", ")}</p>` : ''}
            ${recommendedBundle ? `<p><strong>Recommended Bundle:</strong> ${recommendedBundle}</p>` : ''}
            ${formData.dumpsterPadCleaning ? `<p><strong>Dumpster Pad Cleaning:</strong> Included (+$75/month)</p>` : ''}
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard?tab=customers">View in Dashboard</a></p>
          `
        })
      }).catch(() => {}); // Silently fail if email service is not configured

      // Customer estimate email
      await notifyCustomQuoteEstimate({
        quote: {
          propertyType: formData.propertyType,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          commercialType: formData.commercialType,
          commercialBins: formData.commercialBins,
          dumpsterPadCleaning: formData.dumpsterPadCleaning,
          commercialFrequency: formData.commercialFrequency,
          commercialSpecialRequirements: formData.commercialSpecialRequirements,
          residentialBins: formData.residentialBins,
          residentialFrequency: formData.residentialFrequency,
          residentialSpecialRequirements: formData.residentialSpecialRequirements,
          hoaUnits: formData.hoaUnits,
          hoaBins: formData.hoaBins,
          hoaFrequency: formData.hoaFrequency,
          communityAccessRequirements: formData.communityAccessRequirements,
          specialInstructions: formData.specialInstructions,
          estimatedPrice,
          estimatedPriceLow: lowEstimate,
          estimatedPriceHigh: highEstimate,
        },
        referenceId: docRef.id.slice(0, 8).toUpperCase(),
        requiresManualReview,
        recommendedBundle,
        preferredContact: formData.preferredContact,
        bestTimeToContact: formData.bestTimeToContact,
      }).catch((error) => {
        console.error("Error sending customer estimate email:", error);
      });
    } catch (error) {
      // Email failures should not block the quote submission
      console.error("Error sending notification emails:", error);
    }

    return NextResponse.json({
      success: true,
      quoteId: docRef.id,
      requiresManualReview,
      message: requiresManualReview
        ? "Quote submitted for custom review"
        : "Quote request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error submitting custom quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quote request" },
      { status: 500 }
    );
  }
}

