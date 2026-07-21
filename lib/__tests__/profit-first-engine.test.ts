import {
  calculateJobEconomics,
  calculatePricingFloor,
  calculateRouteEconomics,
  percent,
} from "../profit-first-engine";
import { DEFAULT_PROFIT_FIRST_SETTINGS } from "../profit-first-settings";
import type { JobEconomicsInput } from "../profit-first-engine";

const COMPLETED_JOB_DEFAULTS: Partial<JobEconomicsInput> = {
  paymentCollected: true,
  jobCompleted: true,
  completionDocsSubmitted: true,
  firstServiceCompleted: true,
  paymentCleared: true,
  refundHoldPassed: true,
};

function residentialJob(
  customerPaymentCents: number,
  overrides: Partial<JobEconomicsInput> = {}
): JobEconomicsInput {
  return {
    category: "residential",
    bins: 1,
    customerPaymentCents,
    partnerModel: "none",
    chemicalsCents: 0,
    fuelCents: 0,
    waterCents: 0,
    equipmentAllocationCents: 0,
    disposalCents: 0,
    otherDirectCostCents: 500,
    ...COMPLETED_JOB_DEFAULTS,
    ...overrides,
  };
}

describe("profit-first compensation and profitability engine", () => {
  const settings = {
    ...DEFAULT_PROFIT_FIRST_SETTINGS,
    payrollBurdenPercent: 0,
  };

  test("1. $35 one-bin residential job with no partner", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, { bins: 1, partnerModel: "none" }),
      settings
    );

    expect(result.employeePayCents).toBe(800);
    expect(result.partnerCommissionCents).toBe(0);
    expect(result.directCosts.otherDirectCostCents).toBe(500);
    expect(result.contributionProfitCents).toBe(2200);
    expect(result.contributionMarginPercent).toBeCloseTo(62.9, 1);
    expect(result.marginStatus).toBe("strong_margin");
    expect(result.approvalRequired).toBe(false);
  });

  test("2. $35 one-bin residential job with a $10 referral payout", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, {
        partnerModel: "referral",
      }),
      settings
    );

    expect(result.employeePayCents).toBe(800);
    expect(result.partnerCommissionCents).toBe(1000);
    expect(result.contributionProfitCents).toBe(1200);
    expect(result.contributionMarginPercent).toBeCloseTo(34.3, 1);
    expect(result.marginStatus).toBe("low_margin");
    expect(result.plainLanguage.binBlastKeeps).toBe("$12.00");
  });

  test("3. two-bin residential stop", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, { bins: 2 }),
      settings
    );

    expect(result.employeePayCents).toBe(1100);
    expect(result.bins).toBe(2);
  });

  test("4. $125 commercial job", () => {
    const result = calculateJobEconomics(
      {
        ...COMPLETED_JOB_DEFAULTS,
        category: "commercial",
        customerPaymentCents: 12500,
        invoiceLaborCents: 12500,
        partnerModel: "none",
        otherDirectCostCents: 500,
      },
      settings
    );

    expect(result.employeePayCents).toBe(3000);
    expect(result.laborRevenue?.commissionableLaborCents).toBe(12500);
  });

  test("5. $400 commercial job", () => {
    const result = calculateJobEconomics(
      {
        ...COMPLETED_JOB_DEFAULTS,
        category: "commercial",
        customerPaymentCents: 40000,
        invoiceLaborCents: 40000,
        partnerModel: "none",
        otherDirectCostCents: 500,
      },
      settings
    );

    expect(result.employeePayCents).toBe(8000);
  });

  test("6. commercial job with difficulty bonus", () => {
    const result = calculateJobEconomics(
      {
        ...COMPLETED_JOB_DEFAULTS,
        category: "commercial",
        customerPaymentCents: 12500,
        invoiceLaborCents: 12500,
        partnerModel: "none",
        otherDirectCostCents: 500,
        difficultyAdjustments: [
          {
            type: "heavy_grease",
            amountCents: 2000,
            reason: "Heavy grease buildup required extra labor",
          },
        ],
      },
      settings
    );

    expect(result.employeePayCents).toBe(5000);
    expect(result.employeeLaborWarning).toBe("owner_approval_required");
  });

  test("7. referral refund before payout", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, {
        partnerModel: "referral",
        partnerCommissionStatus: "cancelled",
        refundHoldPassed: false,
      }),
      settings
    );

    expect(result.partnerCommissionStatus).toBe("cancelled");
    expect(result.partnerCommissionPayable).toBe(false);
  });

  test("8. referral chargeback after pending commission", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, {
        partnerModel: "referral",
        partnerCommissionStatus: "clawed_back",
      }),
      settings
    );

    expect(result.partnerCommissionStatus).toBe("clawed_back");
    expect(result.partnerCommissionPayable).toBe(false);
  });

  test("9. service-performing partner using a 60% split", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, {
        partnerModel: "service",
        servicePartnerRevenueSharePercent: 60,
      }),
      settings
    );

    expect(result.partnerCommissionCents).toBe(2100);
    expect(result.approvalRequired).toBe(true);
  });

  test("10. low-margin owner override", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, {
        partnerModel: "referral",
        ownerOverrideApproved: true,
        ownerOverrideReason: "Building route density",
      }),
      settings
    );

    expect(result.marginStatus).toBe("acceptable_margin");
    expect(result.approvalRequired).toBe(false);
  });

  test("11. unprofitable job rejection", () => {
    const result = calculateJobEconomics(
      {
        ...COMPLETED_JOB_DEFAULTS,
        category: "residential",
        bins: 1,
        customerPaymentCents: 1500,
        partnerModel: "referral",
        otherDirectCostCents: 500,
      },
      settings
    );

    expect(result.contributionProfitCents).toBeLessThan(0);
    expect(result.marginStatus).toBe("unprofitable");
    expect(result.autoApproved).toBe(false);
  });

  test("12. route with five stops", () => {
    const stop = residentialJob(3500);
    const route = calculateRouteEconomics(
      {
        stops: Array.from({ length: 5 }, () => ({ job: stop })),
        routeHours: 4,
      },
      settings
    );

    expect(route.customers).toBe(5);
    expect(route.routeHealthLabel).toBe("Launch route");
    expect(route.collectedRevenueCents).toBe(17500);
  });

  test("13. route with fifteen stops", () => {
    const stop = residentialJob(3500);
    const route = calculateRouteEconomics(
      {
        stops: Array.from({ length: 15 }, () => ({ job: stop })),
        routeHours: 8,
      },
      settings
    );

    expect(route.customers).toBe(15);
    expect(route.routeHealthLabel).toBe("Strong route");
    expect(route.profitPerStopCents).toBeGreaterThan(0);
  });

  test("pricing floor calculator", () => {
    const floor = calculatePricingFloor(
      {
        category: "residential",
        estimatedDirectCostCents: 1300,
      },
      settings
    );

    expect(floor.minimumProfitablePriceCents).toBe(2600);
    expect(floor.expectedContributionMarginPercent).toBeGreaterThan(49);
  });

  test("plain-language summary matches owner example", () => {
    const result = calculateJobEconomics(
      residentialJob(3500, { partnerModel: "referral" }),
      settings
    );

    expect(result.plainLanguage.customerPays).toBe("$35.00");
    expect(result.plainLanguage.employeeEarns).toBe("$8.00");
    expect(result.plainLanguage.partnerEarns).toBe("$10.00");
    expect(result.plainLanguage.otherDirectCosts).toBe("$5.00");
    expect(result.plainLanguage.binBlastKeeps).toBe("$12.00");
    expect(result.plainLanguage.contributionMargin).toBe(percent(34.285714285714285));
  });
});
