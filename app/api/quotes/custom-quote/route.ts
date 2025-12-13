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

    // Calculate estimated price
    let estimatedPrice = 0;
    let basePrice = 0;
    let binPrice = 0;
    let frequencyMultiplier = 1;
    let dumpsterPadFee = 0;

    if (formData.propertyType === "residential") {
      basePrice = 35;
      binPrice = (formData.residentialBins || 1) * 10;
      
      if (formData.residentialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.residentialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1;
      }
    } else if (formData.propertyType === "commercial") {
      basePrice = 50;
      binPrice = (formData.commercialBins || 1) * 15;
      
      if (formData.commercialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.commercialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1;
      }

      if (formData.dumpsterPadCleaning) {
        dumpsterPadFee = 25;
      }
    } else if (formData.propertyType === "hoa") {
      const units = formData.hoaUnits || 1;
      const bins = formData.hoaBins || 1;
      
      basePrice = units * 25;
      binPrice = bins * 8;
      
      if (formData.hoaFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.hoaFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1;
      }
    }

    estimatedPrice = (basePrice + binPrice + dumpsterPadFee) * frequencyMultiplier;

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
            <p><strong>Estimated Price:</strong> $${estimatedPrice.toLocaleString()}/month</p>
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
            <p><strong>Estimated Price Range:</strong> $${Math.floor(estimatedPrice * 0.85).toLocaleString()} - $${Math.ceil(estimatedPrice * 1.15).toLocaleString()}/month</p>
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

