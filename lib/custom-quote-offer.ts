import { getAppBaseUrl } from "@/lib/email-template-config";

const EMAIL_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL || "https://www.binblastco.com/bin-blast-email-logo.png";
const CONTACT_PHONE = "(470) 305-0823";
const CONTACT_PHONE_TEL = "+14703050823";

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

export interface QuoteEstimateEmailOptions {
  referenceId: string;
  requiresManualReview?: boolean;
  recommendedBundle?: string | null;
  preferredContact?: string | null;
  bestTimeToContact?: string | null;
}

function getCustomerFirstName(name?: string, email?: string): string {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = email?.trim().split("@")[0];
  return fromEmail || "there";
}

function getQuoteContactEmail(): string {
  return process.env.NEXT_PUBLIC_ADMIN_EMAIL || "binblastcompany@gmail.com";
}

function getQuoteFrequency(quote: QuoteRecordForOffer, offer?: OfferRecordForEmail): string {
  return (
    offer?.customizedFrequency ||
    quote.commercialFrequency ||
    quote.residentialFrequency ||
    quote.hoaFrequency ||
    "Monthly"
  );
}

export function formatQuotePriceRange(low?: number, high?: number, single?: number): string {
  if (low != null && high != null && low !== high) {
    return `$${Number(low).toLocaleString()} - $${Number(high).toLocaleString()}/month`;
  }
  const value = single ?? high ?? low ?? 0;
  return `$${Number(value).toLocaleString()}/month`;
}

export function buildQuoteServiceDetails(
  quote: QuoteRecordForOffer,
  offer?: OfferRecordForEmail
): string {
  const services = offer?.customizedServices || {};
  const lines: string[] = [];

  if (quote.propertyType === "commercial") {
    if (quote.commercialType) {
      lines.push(`Business type: ${quote.commercialType}`);
    }
    const dumpsterCount = services.dumpsterCount ?? quote.commercialBins;
    if (dumpsterCount) {
      lines.push(`Dumpsters: ${dumpsterCount}`);
    }
    const hasPad = services.hasDumpsterPad ?? quote.dumpsterPadCleaning;
    if (hasPad) {
      lines.push("Dumpster pad cleaning: Included");
    }
  }

  if (quote.propertyType === "residential") {
    const bins = services.residentialBins ?? quote.residentialBins;
    if (bins) {
      lines.push(`Bins: ${bins}`);
    }
  }

  if (quote.propertyType === "hoa") {
    const units = services.hoaUnits ?? quote.hoaUnits;
    const bins = services.hoaBins ?? quote.hoaBins;
    if (units) {
      lines.push(`Units / homes: ${units}`);
    }
    if (bins) {
      lines.push(`Total bins: ${bins}`);
    }
  }

  const specialInstructions = getQuoteSpecialInstructions(quote);
  if (specialInstructions) {
    lines.push(`Special requirements: ${specialInstructions}`);
  }

  return lines.length > 0 ? lines.join("\n") : "Details on file with your quote request.";
}

export function buildQuoteEstimateEmailParams(
  quote: QuoteRecordForOffer,
  options: QuoteEstimateEmailOptions
): Record<string, string> {
  const baseUrl = getAppBaseUrl();
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim();
  const contactChannel = options.preferredContact?.trim() || "email";
  const contactWindow = options.bestTimeToContact?.trim()
    ? ` during ${options.bestTimeToContact.trim()}`
    : " within 24 hours";

  const introText = options.requiresManualReview
    ? "We've received your custom quote request. Because of the scope of your property, our team will review the details and prepare a tailored offer for you."
    : "We've received your custom quote request and prepared the estimate below based on the information you provided.";

  const nextSteps = options.requiresManualReview
    ? "Our team will review your property details and send a final quote once pricing is confirmed. After you accept, we'll send a secure link to set up billing and schedule your first service."
    : "Our team will confirm the details and follow up with next steps. After pricing is finalized, you'll receive a secure link to accept your offer and set up payment.";

  let contactNote = `We'll contact you via ${contactChannel}${contactWindow}.`;
  if (calendlyUrl) {
    contactNote += ` You can also schedule a call here: ${calendlyUrl}`;
  }

  if (options.recommendedBundle) {
    contactNote += ` Recommended bundle: ${options.recommendedBundle}.`;
  }

  return {
    firstName: getCustomerFirstName(quote.name, quote.email),
    logoUrl: EMAIL_LOGO_URL,
    introText,
    referenceId: options.referenceId,
    propertyType: getPropertyTypeLabel(quote.propertyType),
    serviceAddress: quote.address?.trim() || "On file",
    priceRange: formatQuotePriceRange(
      quote.estimatedPriceLow,
      quote.estimatedPriceHigh,
      quote.estimatedPrice
    ),
    serviceFrequency: getQuoteFrequency(quote),
    serviceDetails: buildQuoteServiceDetails(quote),
    nextSteps,
    contactNote,
    contactPhone: CONTACT_PHONE,
    contactPhoneTel: CONTACT_PHONE_TEL,
    contactEmail: getQuoteContactEmail(),
    termsUrl: `${baseUrl}/terms`,
    cancellationUrl: `${baseUrl}/cancellation`,
  };
}

export function buildQuoteFinalOfferEmailParams(
  quote: QuoteRecordForOffer,
  offer: OfferRecordForEmail
): Record<string, string> {
  const baseUrl = getAppBaseUrl();
  const contactEmail = getQuoteContactEmail();
  const referenceId = quote.id ? quote.id.slice(0, 8).toUpperCase() : "ON FILE";
  const terms = offer.termsAndConditions?.trim() || getDefaultOfferTerms(quote.propertyType);
  const specialNotes = offer.specialNotes?.trim() || "No additional notes for this quote.";
  const timeline = offer.timeline?.trim() || quote.timeline?.trim() || "To be confirmed upon acceptance";
  const propertyLabel = getPropertyTypeLabel(quote.propertyType).toLowerCase();

  return {
    firstName: getCustomerFirstName(quote.name, quote.email),
    logoUrl: EMAIL_LOGO_URL,
    introText: `Thank you for your interest in Bin Blast Co. We've prepared a final ${propertyLabel} service quote based on your request.`,
    referenceId,
    propertyType: getPropertyTypeLabel(quote.propertyType),
    serviceAddress: quote.address?.trim() || "On file",
    finalPrice: `$${Number(offer.customizedPrice || 0).toLocaleString()}/month`,
    serviceFrequency: getQuoteFrequency(quote, offer),
    serviceDetails: buildQuoteServiceDetails(quote, offer),
    timeline,
    specialNotes,
    termsAndConditions: terms,
    acceptInstructions:
      "To accept this quote or ask questions, reply to this email or call us. Once approved, we'll send a secure link to set up billing and schedule your first service.",
    replySubject: encodeURIComponent(`Accept quote ${referenceId} — Bin Blast Co.`),
    contactPhone: CONTACT_PHONE,
    contactPhoneTel: CONTACT_PHONE_TEL,
    contactEmail,
    termsUrl: `${baseUrl}/terms`,
    cancellationUrl: `${baseUrl}/cancellation`,
  };
}
