// lib/pricing-safeguards.ts
/**
 * No-Lowball Safeguard Pricing System
 * 
 * Centralized pricing logic that prevents underpricing, protects profit margins,
 * and flags high-complexity jobs for manual review.
 */

export interface PricingInput {
  propertyType: "residential" | "commercial" | "hoa";
  commercialType?: "Restaurant" | string;
  dumpsterCount?: number;
  hasDumpsterPad?: boolean;
  frequency: "Monthly" | "Bi-weekly" | "Weekly";
  specialRequirements?: string;
  // Additional fields for residential/HOA
  residentialBins?: number;
  hoaUnits?: number;
  hoaBins?: number;
}

export interface PricingResult {
  basePrice: number;
  finalPrice: number;
  lowEstimate: number;
  highEstimate: number;
  minimumPriceEnforced: boolean;
  requiresManualReview: boolean;
  reviewReasons: string[];
  safeguardReasons: string[];
  pricingBreakdown: {
    dumpsterCleaning: number;
    dumpsterPadCleaning: number;
    frequencyMultiplier: number;
    total: number;
  };
  originalCalculatedPrice?: number;
}

// Frequency multipliers
const FREQUENCY_MULTIPLIERS = {
  Monthly: 1.0,
  "Bi-weekly": 1.8,
  Weekly: 3.2,
} as const;

// Minimum price floors
const MINIMUM_PRICES = {
  commercial: {
    Monthly: 95,
    "Bi-weekly": 180,
    Weekly: 300,
  },
  restaurant: {
    Monthly: 120,
    "Bi-weekly": 250,
    Weekly: 350,
  },
  dumpsterPad: 150, // Minimum total when pad cleaning is included
} as const;

// Base pricing
const BASE_PRICES = {
  commercial: 95,
  restaurant: 120,
  residential: 55,
} as const;

const ADDITIONAL_DUMPSTER_FEES = {
  commercial: 15,
  restaurant: 20,
} as const;

const DUMPSTER_PAD_ADDON = 75;

/**
 * Calculate pricing with all safeguards applied
 */
export function calculatePricingWithSafeguards(input: PricingInput): PricingResult {
  const safeguardReasons: string[] = [];
  const reviewReasons: string[] = [];
  let minimumPriceEnforced = false;
  let requiresManualReview = false;

  // Calculate base pricing
  let basePrice = 0;
  let dumpsterCleaning = 0;
  let dumpsterPadCleaning = 0;
  let frequencyMultiplier = FREQUENCY_MULTIPLIERS[input.frequency];

  if (input.propertyType === "residential") {
    const binCount = input.residentialBins || 1;
    basePrice = BASE_PRICES.residential;
    const binPrice = (binCount - 1) * 10; // $10 per additional bin
    dumpsterCleaning = basePrice + binPrice;
    
  } else if (input.propertyType === "commercial") {
    const isRestaurant = input.commercialType === "Restaurant";
    const dumpsterCount = input.dumpsterCount || 1;
    
    // Base dumpster cleaning price
    const dumpsterBasePrice = isRestaurant ? BASE_PRICES.restaurant : BASE_PRICES.commercial;
    const additionalFee = isRestaurant 
      ? ADDITIONAL_DUMPSTER_FEES.restaurant 
      : ADDITIONAL_DUMPSTER_FEES.commercial;
    const additionalDumpsters = Math.max(0, dumpsterCount - 1);
    
    dumpsterCleaning = dumpsterBasePrice + (additionalDumpsters * additionalFee);
    
    // Dumpster pad cleaning (flat $75 add-on)
    if (input.hasDumpsterPad) {
      dumpsterPadCleaning = DUMPSTER_PAD_ADDON;
    }
    
  } else if (input.propertyType === "hoa") {
    const units = input.hoaUnits || 1;
    const bins = input.hoaBins || 1;
    basePrice = units * 25;
    dumpsterCleaning = basePrice + (bins * 8);
  }

  // Calculate total before frequency multiplier
  const subtotal = dumpsterCleaning + dumpsterPadCleaning;
  
  // Apply frequency multiplier
  const calculatedPrice = subtotal * frequencyMultiplier;
  const originalCalculatedPrice = calculatedPrice;
  
  // Update pricing breakdown with frequency-applied values
  dumpsterCleaning = dumpsterCleaning * frequencyMultiplier;
  dumpsterPadCleaning = dumpsterPadCleaning * frequencyMultiplier;

  // Determine minimum price floor
  let minimumPrice = 0;
  if (input.propertyType === "commercial") {
    const isRestaurant = input.commercialType === "Restaurant";
    const minPrices = isRestaurant ? MINIMUM_PRICES.restaurant : MINIMUM_PRICES.commercial;
    minimumPrice = minPrices[input.frequency];
    
    // If dumpster pad is included, ensure minimum is at least $150
    if (input.hasDumpsterPad && calculatedPrice < MINIMUM_PRICES.dumpsterPad) {
      minimumPrice = Math.max(minimumPrice, MINIMUM_PRICES.dumpsterPad);
      safeguardReasons.push(`Dumpster pad cleaning requires minimum $${MINIMUM_PRICES.dumpsterPad}/month`);
    }
  }

  // Enforce minimum price floor
  let finalPrice = calculatedPrice;
  if (minimumPrice > 0 && calculatedPrice < minimumPrice) {
    finalPrice = minimumPrice;
    minimumPriceEnforced = true;
    safeguardReasons.push(
      `Price adjusted to meet minimum ${input.propertyType === "commercial" && input.commercialType === "Restaurant" ? "restaurant" : "commercial"} ${input.frequency.toLowerCase()} threshold of $${minimumPrice}/month`
    );
  }

  // Auto-flag for manual review conditions
  if (finalPrice > 500) {
    requiresManualReview = true;
    reviewReasons.push("Total monthly price exceeds $500");
  }

  if (input.dumpsterCount && input.dumpsterCount >= 4) {
    requiresManualReview = true;
    reviewReasons.push(`Dumpster count (${input.dumpsterCount}) requires custom scheduling`);
  }

  if (input.commercialType === "Restaurant" && input.frequency === "Weekly") {
    requiresManualReview = true;
    reviewReasons.push("Weekly restaurant service requires custom review");
  }

  if (input.hasDumpsterPad && input.frequency === "Weekly") {
    requiresManualReview = true;
    reviewReasons.push("Weekly dumpster pad cleaning requires custom scheduling");
  }

  if (input.specialRequirements && input.specialRequirements.trim().length > 0) {
    requiresManualReview = true;
    reviewReasons.push("Special requirements need custom review");
  }

  // Calculate price range (±15-20%)
  let lowEstimate = Math.floor(finalPrice * 0.85);
  let highEstimate = Math.ceil(finalPrice * 1.15);

  // Cap ranges based on property type and frequency
  if (input.propertyType === "residential") {
    lowEstimate = Math.max(lowEstimate, 55);
    highEstimate = Math.min(highEstimate, 85);
  } else if (input.propertyType === "commercial") {
    // Cap based on frequency and whether pad is included
    if (input.hasDumpsterPad) {
      // With pad, ensure minimum reflects pad minimum
      lowEstimate = Math.max(lowEstimate, MINIMUM_PRICES.dumpsterPad);
    } else {
      // Without pad, cap by frequency
      const isRestaurant = input.commercialType === "Restaurant";
      const minPrices = isRestaurant ? MINIMUM_PRICES.restaurant : MINIMUM_PRICES.commercial;
      lowEstimate = Math.max(lowEstimate, minPrices[input.frequency]);
    }
  }

  // Ensure low <= high
  if (lowEstimate > highEstimate) {
    const temp = lowEstimate;
    lowEstimate = highEstimate;
    highEstimate = temp;
  }

  return {
    basePrice,
    finalPrice,
    lowEstimate,
    highEstimate,
    minimumPriceEnforced,
    requiresManualReview,
    reviewReasons,
    safeguardReasons,
    pricingBreakdown: {
      dumpsterCleaning,
      dumpsterPadCleaning,
      frequencyMultiplier,
      total: finalPrice,
    },
    originalCalculatedPrice,
  };
}

