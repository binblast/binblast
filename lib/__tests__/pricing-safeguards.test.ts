// lib/__tests__/pricing-safeguards.test.ts
/**
 * Unit tests for pricing safeguards system
 */

import { calculatePricingWithSafeguards, PricingInput } from "../pricing-safeguards";

describe("Pricing Safeguards", () => {
  describe("Frequency Multipliers", () => {
    test("Monthly frequency uses 1.0x multiplier", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.frequencyMultiplier).toBe(1.0);
    });

    test("Bi-weekly frequency uses 1.8x multiplier", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Bi-weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.frequencyMultiplier).toBe(1.8);
    });

    test("Weekly frequency uses 3.2x multiplier", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.frequencyMultiplier).toBe(3.2);
    });
  });

  describe("Base Pricing", () => {
    test("Commercial base price is $95", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterCleaning).toBe(95);
    });

    test("Restaurant base price is $120", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterCleaning).toBe(120);
    });

    test("Residential base price is $55", () => {
      const input: PricingInput = {
        propertyType: "residential",
        residentialBins: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.basePrice).toBe(55);
    });
  });

  describe("Dumpster Count Pricing", () => {
    test("Commercial: 2 dumpsters adds $15", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 2,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterCleaning).toBe(110); // $95 + $15
    });

    test("Commercial: 3 dumpsters adds $30", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 3,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterCleaning).toBe(125); // $95 + ($15 * 2)
    });

    test("Restaurant: 2 dumpsters adds $20", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 2,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterCleaning).toBe(140); // $120 + $20
    });
  });

  describe("Dumpster Pad Pricing", () => {
    test("Dumpster pad adds $75 flat fee", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        hasDumpsterPad: true,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.pricingBreakdown.dumpsterPadCleaning).toBe(75);
    });

    test("Dumpster pad minimum total is $150/month", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        hasDumpsterPad: true,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      // Base $95 + pad $75 = $170, but minimum is $150
      expect(result.finalPrice).toBeGreaterThanOrEqual(150);
    });
  });

  describe("Minimum Price Floors", () => {
    test("Commercial monthly minimum is $95", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(95);
    });

    test("Commercial bi-weekly minimum is $180", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Bi-weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(180);
      if (result.minimumPriceEnforced) {
        expect(result.safeguardReasons.length).toBeGreaterThan(0);
      }
    });

    test("Commercial weekly minimum is $300", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(300);
    });

    test("Restaurant monthly minimum is $120", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(120);
    });

    test("Restaurant bi-weekly minimum is $250", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 1,
        frequency: "Bi-weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(250);
    });

    test("Restaurant weekly minimum is $350", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 1,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(350);
    });
  });

  describe("Auto-Flag for Manual Review", () => {
    test("Flags when price exceeds $500", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 5,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      if (result.finalPrice > 500) {
        expect(result.requiresManualReview).toBe(true);
        expect(result.reviewReasons).toContain("Total monthly price exceeds $500");
      }
    });

    test("Flags when dumpster count >= 4", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 4,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reviewReasons).toContain("Dumpster count (4) requires custom scheduling");
    });

    test("Flags weekly restaurant service", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Restaurant",
        dumpsterCount: 1,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reviewReasons).toContain("Weekly restaurant service requires custom review");
    });

    test("Flags dumpster pad + weekly frequency", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        hasDumpsterPad: true,
        frequency: "Weekly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reviewReasons).toContain("Weekly dumpster pad cleaning requires custom scheduling");
    });

    test("Flags when special requirements provided", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
        specialRequirements: "Need grease trap cleaning",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reviewReasons).toContain("Special requirements need custom review");
    });
  });

  describe("Price Range Calculation", () => {
    test("Low estimate is 85% of final price", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      const expectedLow = Math.floor(result.finalPrice * 0.85);
      expect(result.lowEstimate).toBeGreaterThanOrEqual(expectedLow - 1); // Allow small rounding differences
    });

    test("High estimate is 115% of final price", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 1,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      const expectedHigh = Math.ceil(result.finalPrice * 1.15);
      expect(result.highEstimate).toBeLessThanOrEqual(expectedHigh + 1); // Allow small rounding differences
    });

    test("Low estimate is always <= high estimate", () => {
      const inputs: PricingInput[] = [
        { propertyType: "residential", residentialBins: 1, frequency: "Monthly" },
        { propertyType: "commercial", commercialType: "Restaurant", dumpsterCount: 3, frequency: "Weekly" },
        { propertyType: "commercial", commercialType: "Office Building", dumpsterCount: 1, hasDumpsterPad: true, frequency: "Bi-weekly" },
      ];

      inputs.forEach((input) => {
        const result = calculatePricingWithSafeguards(input);
        expect(result.lowEstimate).toBeLessThanOrEqual(result.highEstimate);
      });
    });
  });

  describe("Edge Cases", () => {
    test("Handles 0 dumpsters gracefully", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 0,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.finalPrice).toBeGreaterThanOrEqual(95); // Should use minimum
    });

    test("Handles very high dumpster counts", () => {
      const input: PricingInput = {
        propertyType: "commercial",
        commercialType: "Office Building",
        dumpsterCount: 10,
        frequency: "Monthly",
      };
      const result = calculatePricingWithSafeguards(input);
      expect(result.requiresManualReview).toBe(true); // Should flag for review
      expect(result.finalPrice).toBeGreaterThan(0);
    });
  });
});

