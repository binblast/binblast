import { getAppBaseUrl } from "@/lib/email-template-config";

export type QuotePropertyType = "residential" | "commercial" | "hoa";

export interface QuoteRecordForOffer {
  id?: string;
  propertyType?: QuotePropertyType;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  commercialType?: string;
  commercialBins?: number;
  dumpsterPadCleaning?: boolean;
  commercialFrequency?: string;
  commercialSpecialRequirements?: string;
  residentialBins?: number;
  residentialFrequency?: string;
  residentialSpecialRequirements?: string;
  hoaUnits?: number;
  hoaBins?: number;
  hoaFrequency?: string;
  communityAccessRequirements?: string;
  specialInstructions?: string;
  timeline?: string;
  estimatedPriceLow?: number;
  estimatedPriceHigh?: number;
  estimatedPrice?: number;
}

export interface OfferRecordForEmail {
  customizedPrice: number;
  customizedFrequency?: string;
  customizedServices?: {
    dumpsterCount?: number;
    hasDumpsterPad?: boolean;
    residentialBins?: number;
    hoaUnits?: number;
    hoaBins?: number;
  };
  specialNotes?: string;
  timeline?: string;
  termsAndConditions?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export function getPropertyTypeLabel(type?: string): string {
  switch (type) {
    case "residential":
      return "Residential";
    case "commercial":
      return "Commercial";
    case "hoa":
      return "HOA / Neighborhood";
    default:
      return type || "Custom";
  }
}

export function getDefaultOfferTerms(propertyType?: QuotePropertyType): string {
  const baseUrl = getAppBaseUrl();
  const serviceLabel =
    propertyType === "commercial"
      ? "Commercial dumpster/bin cleaning"
      : propertyType === "hoa"
        ? "HOA / community bin cleaning"
        : "Residential bin cleaning";

  return [
    `Service: ${serviceLabel}.`,
    "Billing: Monthly charges begin after written acceptance of this offer and are processed securely through Stripe.",
    "Access: Customer must provide safe, unobstructed access to all bins/dumpsters on scheduled service days.",
    "Scheduling: Service frequency matches the offer below. Changes require 24 hours notice unless otherwise agreed in writing.",
    "Missed service: Visits missed due to locked gates, blocked access, incorrect address info, or bins not placed out may not qualify for credit.",
    "Offer validity: Pricing in this offer is valid for 30 days from the send date.",
    `Terms of Service: ${baseUrl}/terms`,
    `Cancellation Policy: ${baseUrl}/cancellation`,
    "Questions: Reply to this email or call (470) 305-0823.",
  ].join("\n");
}

export function getQuoteSpecialInstructions(quote: QuoteRecordForOffer): string {
  return (
    quote.specialInstructions ||
    quote.commercialSpecialRequirements ||
    quote.residentialSpecialRequirements ||
    quote.communityAccessRequirements ||
    ""
  ).trim();
}

export function buildOfferFormPrefill(quote: QuoteRecordForOffer) {
  const specialInstructions = getQuoteSpecialInstructions(quote);
  const propertyType = quote.propertyType;

  return {
    customizedPrice: quote.estimatedPrice || quote.estimatedPriceLow || 0,
    customizedPriceLow: quote.estimatedPriceLow || 0,
    customizedPriceHigh: quote.estimatedPriceHigh || 0,
    customizedFrequency:
      quote.commercialFrequency || quote.residentialFrequency || quote.hoaFrequency || "Monthly",
    dumpsterCount: quote.commercialBins || 1,
    hasDumpsterPad: quote.dumpsterPadCleaning || false,
    residentialBins: quote.residentialBins || 1,
    hoaUnits: quote.hoaUnits || 1,
    hoaBins: quote.hoaBins || 1,
    specialNotes: specialInstructions,
    timeline: quote.timeline || "To be confirmed upon acceptance",
    termsAndConditions: getDefaultOfferTerms(propertyType),
  };
}

export function buildCustomQuoteOfferEmailHtml(
  quote: QuoteRecordForOffer,
  offer: OfferRecordForEmail
): string {
  const services = offer.customizedServices || {};
  const terms =
    offer.termsAndConditions?.trim() || getDefaultOfferTerms(quote.propertyType);
  const adminEmail =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "binblastcompany@gmail.com";
  const baseUrl = getAppBaseUrl();
  const customerPhone = quote.phone?.trim() || "Contact us";

  const detailRows: string[] = [
    `<div class="detail-row"><span class="label">Property type:</span> ${escapeHtml(getPropertyTypeLabel(quote.propertyType))}</div>`,
    `<div class="detail-row"><span class="label">Service address:</span> ${escapeHtml(quote.address || "On file")}</div>`,
    `<div class="detail-row"><span class="label">Service frequency:</span> ${escapeHtml(offer.customizedFrequency || "Monthly")}</div>`,
  ];

  if (quote.propertyType === "commercial") {
    if (quote.commercialType) {
      detailRows.push(
        `<div class="detail-row"><span class="label">Business type:</span> ${escapeHtml(quote.commercialType)}</div>`
      );
    }
    if (services.dumpsterCount) {
      detailRows.push(
        `<div class="detail-row"><span class="label">Dumpsters included:</span> ${services.dumpsterCount}</div>`
      );
    }
    if (services.hasDumpsterPad) {
      detailRows.push(
        `<div class="detail-row"><span class="label">Dumpster pad cleaning:</span> Included</div>`
      );
    }
  }

  if (quote.propertyType === "residential" && services.residentialBins) {
    detailRows.push(
      `<div class="detail-row"><span class="label">Bins included:</span> ${services.residentialBins}</div>`
    );
  }

  if (quote.propertyType === "hoa") {
    if (services.hoaUnits) {
      detailRows.push(
        `<div class="detail-row"><span class="label">Units / homes:</span> ${services.hoaUnits}</div>`
      );
    }
    if (services.hoaBins) {
      detailRows.push(
        `<div class="detail-row"><span class="label">Total bins:</span> ${services.hoaBins}</div>`
      );
    }
  }

  if (offer.timeline?.trim()) {
    detailRows.push(
      `<div class="detail-row"><span class="label">Start timeline:</span> ${escapeHtml(offer.timeline.trim())}</div>`
    );
  }

  const specialNotesBlock = offer.specialNotes?.trim()
    ? `<div style="margin:20px 0;padding:15px;background:#fef3c7;border-left:4px solid #fbbf24;border-radius:4px;">
        <strong>Special notes:</strong><br>${formatMultilineHtml(offer.specialNotes.trim())}
      </div>`
    : "";

  return `<!DOCTYPE html>
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
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 0.875em; color: #6b7280; border-radius: 0 0 10px 10px; }
    .detail-row { margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 6px; }
    .label { font-weight: 600; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">Your Custom Service Offer</h1>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(quote.name || "Customer")},</p>
      <p>Thank you for your interest in Bin Blast Co. We've prepared a customized ${escapeHtml(getPropertyTypeLabel(quote.propertyType).toLowerCase())} service offer based on your quote request.</p>

      <div class="offer-box">
        <h2 style="margin-top:0;color:#16a34a;">Offer Summary</h2>
        <div class="price">$${Number(offer.customizedPrice || 0).toLocaleString()}/month</div>
        ${detailRows.join("\n        ")}
      </div>

      ${specialNotesBlock}

      <div style="margin:20px 0;padding:15px;background:#f3f4f6;border-radius:4px;font-size:0.9em;">
        <strong>Terms and conditions</strong><br>
        ${formatMultilineHtml(terms)}
      </div>

      <p><strong>To accept this offer or ask questions:</strong></p>
      <p>
        Reply to this email, call <a href="tel:+14703050823">${escapeHtml(customerPhone)}</a>,
        or contact us at <a href="mailto:${escapeHtml(adminEmail)}">${escapeHtml(adminEmail)}</a>.
      </p>
      <p>Once you approve, we'll send a secure link to set up billing and schedule your first service.</p>
      <p>Best regards,<br>Bin Blast Co. Team</p>
    </div>
    <div class="footer">
      <p>Bin Blast Co. · <a href="${baseUrl}/terms">Terms</a> · <a href="${baseUrl}/cancellation">Cancellation Policy</a></p>
    </div>
  </div>
</body>
</html>`;
}
