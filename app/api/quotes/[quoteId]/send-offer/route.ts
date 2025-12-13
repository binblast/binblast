// app/api/quotes/[quoteId]/send-offer/route.ts
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
    const { offerId } = body;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    // Get quote details
    const quoteRef = doc(db, "customQuotes", quoteId);
    const quoteSnap = await getDoc(quoteRef);
    
    if (!quoteSnap.exists()) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const quoteData = quoteSnap.data();

    // Get offer details
    const offerRef = doc(db, "customQuotes", quoteId, "offers", offerId);
    const offerSnap = await getDoc(offerRef);
    
    if (!offerSnap.exists()) {
      return NextResponse.json(
        { error: "Offer not found" },
        { status: 404 }
      );
    }

    const offerData = offerSnap.data();

    // Update offer status to "sent"
    const offerRef = doc(db, "customQuotes", quoteId, "offers", offerId);
    await updateDoc(offerRef, {
      status: "sent",
      sentAt: serverTimestamp(),
    });

    // Update quote status
    await updateDoc(quoteRef, {
      status: "quoted",
      updatedAt: serverTimestamp(),
    });

    // Send email to customer
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .offer-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .price { font-size: 2em; font-weight: bold; color: #16a34a; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 0.875em; color: #6b7280; border-radius: 0 0 10px 10px; }
            .detail-row { margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 6px; }
            .label { font-weight: 600; color: #374151; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Custom Quote Offer</h1>
            </div>
            <div class="content">
              <p>Dear ${quoteData.name},</p>
              <p>Thank you for your interest in Bin Blast Co. We've prepared a customized offer for your cleaning service needs.</p>
              
              <div class="offer-box">
                <h2 style="margin-top: 0; color: #16a34a;">Your Custom Offer</h2>
                <div class="price">$${offerData.customizedPrice.toLocaleString()}/month</div>
                <div class="detail-row">
                  <span class="label">Service Frequency:</span> ${offerData.customizedFrequency}
                </div>
                ${offerData.customizedServices.dumpsterCount ? `
                  <div class="detail-row">
                    <span class="label">Number of Dumpsters:</span> ${offerData.customizedServices.dumpsterCount}
                  </div>
                ` : ''}
                ${offerData.customizedServices.hasDumpsterPad ? `
                  <div class="detail-row">
                    <span class="label">Dumpster Pad Cleaning:</span> Included
                  </div>
                ` : ''}
                ${offerData.customizedServices.residentialBins ? `
                  <div class="detail-row">
                    <span class="label">Number of Bins:</span> ${offerData.customizedServices.residentialBins}
                  </div>
                ` : ''}
                ${offerData.timeline ? `
                  <div class="detail-row">
                    <span class="label">Timeline:</span> ${offerData.timeline}
                  </div>
                ` : ''}
              </div>

              ${offerData.specialNotes ? `
                <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #fbbf24; border-radius: 4px;">
                  <strong>Special Notes:</strong><br>
                  ${offerData.specialNotes.replace(/\n/g, '<br>')}
                </div>
              ` : ''}

              ${offerData.termsAndConditions ? `
                <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 4px; font-size: 0.9em;">
                  <strong>Terms and Conditions:</strong><br>
                  ${offerData.termsAndConditions.replace(/\n/g, '<br>')}
                </div>
              ` : ''}

              <p>To accept this offer or discuss any questions, please contact us:</p>
              <p>
                <strong>Phone:</strong> ${quoteData.phone || "Contact us"}<br>
                <strong>Email:</strong> ${process.env.ADMIN_EMAIL || "info@binblast.com"}
              </p>

              <p>We look forward to serving you!</p>
              <p>Best regards,<br>Bin Blast Co. Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
              <p>Bin Blast Co. | ${quoteData.address || ""}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: quoteData.email,
          subject: `Your Custom Quote Offer - Bin Blast Co.`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send email");
      }
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Offer sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending offer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send offer" },
      { status: 500 }
    );
  }
}

