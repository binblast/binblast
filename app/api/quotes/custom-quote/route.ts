// app/api/quotes/custom-quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

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

    // Calculate estimated price (must match frontend logic exactly)
    let estimatedPrice = 0;
    let lowEstimate = 0;
    let highEstimate = 0;
    let dumpsterPadPackage: "A" | "B" | "C" | null = null;
    let recommendedBundle: string | null = null;
    let minimumPriceEnforced = false;
    let pricingBreakdown: any = null;

    if (formData.propertyType === "residential") {
      const basePrice = 55;
      const binPrice = (formData.residentialBins || 1) * 10;
      
      let frequencyMultiplier = 1;
      if (formData.residentialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.residentialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      }
      
      estimatedPrice = (basePrice + binPrice) * frequencyMultiplier;
      lowEstimate = Math.floor(estimatedPrice * 0.85);
      highEstimate = Math.ceil(estimatedPrice * 1.15);
      
      // Cap residential range to $55-$85/month
      lowEstimate = Math.max(lowEstimate, 55);
      highEstimate = Math.min(highEstimate, 85);
      
      // Ensure low <= high
      if (lowEstimate > highEstimate) {
        const temp = lowEstimate;
        lowEstimate = highEstimate;
        highEstimate = temp;
      }
      
    } else if (formData.propertyType === "commercial") {
      const isRestaurant = formData.commercialType === "Restaurant";
      const hasDumpsterPad = formData.dumpsterPadCleaning === true;
      const frequency = formData.commercialFrequency;
      const dumpsterCount = formData.commercialBins || 1;
      
      // Base dumpster cleaning price
      const dumpsterBasePrice = isRestaurant ? 120 : 95;
      const dumpsterPrice = dumpsterBasePrice + ((dumpsterCount - 1) * (isRestaurant ? 20 : 15));
      
      // Apply frequency multiplier to dumpster cleaning
      let dumpsterMonthlyPrice = dumpsterPrice;
      if (frequency === "Bi-weekly") {
        dumpsterMonthlyPrice *= 2;
      } else if (frequency === "Weekly") {
        dumpsterMonthlyPrice *= 4;
      }
      
      // Dumpster pad package pricing (tiered)
      let padPackagePrice = 0;
      if (hasDumpsterPad) {
        if (frequency === "Monthly") {
          padPackagePrice = 150; // Package A
          dumpsterPadPackage = "A";
        } else if (frequency === "Bi-weekly") {
          padPackagePrice = 250; // Package B
          dumpsterPadPackage = "B";
        } else if (frequency === "Weekly") {
          padPackagePrice = 400; // Package C
          dumpsterPadPackage = "C";
        }
      }
      
      // Calculate total
      estimatedPrice = dumpsterMonthlyPrice + padPackagePrice;
      
      // Bundle detection
      if (hasDumpsterPad) {
        if (isRestaurant && frequency === "Weekly") {
          recommendedBundle = "Premium Property Protection";
        } else if (isRestaurant && frequency === "Bi-weekly") {
          recommendedBundle = "Restaurant Compliance Bundle";
        } else if (frequency === "Bi-weekly") {
          recommendedBundle = "Commercial Clean Site Bundle";
        } else if (frequency === "Monthly") {
          recommendedBundle = "Commercial Clean Site Bundle";
        }
      }
      
      // Minimum price enforcement
      if (isRestaurant && hasDumpsterPad && frequency === "Weekly") {
        if (estimatedPrice < 350) {
          estimatedPrice = 350;
          minimumPriceEnforced = true;
        }
      } else if (isRestaurant && hasDumpsterPad && frequency === "Bi-weekly") {
        if (estimatedPrice < 250) {
          estimatedPrice = 250;
          minimumPriceEnforced = true;
        }
      } else if (isRestaurant && hasDumpsterPad && frequency === "Monthly") {
        if (estimatedPrice < 150) {
          estimatedPrice = 150;
          minimumPriceEnforced = true;
        }
      }
      
      // Calculate range (±15-20%)
      lowEstimate = Math.floor(estimatedPrice * 0.85);
      highEstimate = Math.ceil(estimatedPrice * 1.15);
      
      // Cap ranges based on package tiers and frequency
      if (hasDumpsterPad) {
        if (frequency === "Monthly") {
          lowEstimate = Math.max(lowEstimate, 150);
          highEstimate = Math.min(highEstimate, 195);
        } else if (frequency === "Bi-weekly") {
          lowEstimate = Math.max(lowEstimate, 250);
          highEstimate = Math.min(highEstimate, 350);
        } else if (frequency === "Weekly") {
          lowEstimate = Math.max(lowEstimate, 400);
          highEstimate = Math.min(highEstimate, 600);
        }
      } else {
        // Commercial without pad - cap by frequency
        if (frequency === "Monthly") {
          lowEstimate = Math.max(lowEstimate, 95);
          highEstimate = Math.min(highEstimate, 160);
        } else if (frequency === "Bi-weekly") {
          lowEstimate = Math.max(lowEstimate, 160);
          highEstimate = Math.min(highEstimate, 240);
        } else if (frequency === "Weekly") {
          lowEstimate = Math.max(lowEstimate, 280);
          highEstimate = Math.min(highEstimate, 400);
        }
      }
      
      // Ensure low <= high (fix any inversion from capping)
      if (lowEstimate > highEstimate) {
        const temp = lowEstimate;
        lowEstimate = highEstimate;
        highEstimate = temp;
      }
      
      // Store pricing breakdown
      pricingBreakdown = {
        dumpsterCleaning: dumpsterMonthlyPrice,
        dumpsterPadCleaning: padPackagePrice,
        total: estimatedPrice
      };
      
    } else if (formData.propertyType === "hoa") {
      const units = formData.hoaUnits || 1;
      const bins = formData.hoaBins || 1;
      
      const basePrice = units * 25;
      const binPrice = bins * 8;
      
      let frequencyMultiplier = 1;
      if (formData.hoaFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.hoaFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      }
      
      estimatedPrice = (basePrice + binPrice) * frequencyMultiplier;
      lowEstimate = Math.floor(estimatedPrice * 0.85);
      highEstimate = Math.ceil(estimatedPrice * 1.15);
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
      status: "pending",
      estimatedPrice: estimatedPrice,
      estimatedPriceLow: lowEstimate,
      estimatedPriceHigh: highEstimate,
      dumpsterPadPackage: dumpsterPadPackage,
      recommendedBundle: recommendedBundle,
      minimumPriceEnforced: minimumPriceEnforced,
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
            ${recommendedBundle ? `<p><strong>Recommended Bundle:</strong> ${recommendedBundle}</p>` : ''}
            ${dumpsterPadPackage ? `<p><strong>Dumpster Pad Package:</strong> ${dumpsterPadPackage}</p>` : ''}
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard?tab=customers">View in Dashboard</a></p>
          `
        })
      }).catch(() => {}); // Silently fail if email service is not configured

      // Customer confirmation email
      const customerEmailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.email,
          subject: "Thank you for your custom quote request - Bin Blast",
          html: `
            <h2>Thank you for your interest!</h2>
            <p>Hi ${formData.name},</p>
            <p>We've received your custom quote request and our team will review it shortly.</p>
            <p><strong>Property Type:</strong> ${getPropertyTypeLabel(formData.propertyType)}</p>
            <p><strong>Estimated Price Range:</strong> $${lowEstimate.toLocaleString()} - $${highEstimate.toLocaleString()}/month</p>
            ${recommendedBundle ? `<p><strong>Recommended Bundle:</strong> ${recommendedBundle}</p>` : ''}
            <p>We'll contact you via ${formData.preferredContact || "email"} within 24 hours to discuss your needs and provide a final quote.</p>
            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Best regards,<br>The Bin Blast Team</p>
          `
        })
      }).catch(() => {}); // Silently fail if email service is not configured
    } catch (error) {
      // Email failures should not block the quote submission
      console.error("Error sending notification emails:", error);
    }

    return NextResponse.json({
      success: true,
      quoteId: docRef.id,
      message: "Quote request submitted successfully"
    });
  } catch (error: any) {
    console.error("Error submitting custom quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quote request" },
      { status: 500 }
    );
  }
}

