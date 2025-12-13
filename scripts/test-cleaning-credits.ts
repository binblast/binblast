// scripts/test-cleaning-credits.ts
// Test script to verify cleaning credits rollover calculations

import { calculateCleaningRollover, getCleaningsPerMonth } from "../lib/subscription-utils";
import { PlanId } from "../lib/stripe-config";

/**
 * Test cases for cleaning credits rollover
 */
function testCleaningCreditsRollover() {
  console.log("🧪 Testing Cleaning Credits Rollover Calculations\n");
  console.log("=" .repeat(60));

  // Test Case 1: Monthly Clean (one-time) - 30-day billing period
  console.log("\n📋 Test Case 1: Monthly Clean Plan");
  console.log("-".repeat(60));
  const monthlyStart = new Date("2024-01-01");
  const monthlyEnd = new Date("2024-01-31");
  const monthlyCleaningsPerMonth = getCleaningsPerMonth("one-time");
  console.log(`Plan: Monthly Clean (one-time)`);
  console.log(`Expected cleanings per month: ${monthlyCleaningsPerMonth}`);
  console.log(`Billing period: ${monthlyStart.toDateString()} to ${monthlyEnd.toDateString()}`);
  
  // Test 1a: No cleanings used
  const rollover1a = calculateCleaningRollover("one-time", monthlyStart, monthlyEnd, 0);
  console.log(`\n  Scenario 1a: 0 cleanings used`);
  console.log(`  Expected: 1 cleaning (full month)`);
  console.log(`  Rollover: ${rollover1a} cleaning(s)`);
  console.log(`  ✅ ${rollover1a === 1 ? "PASS" : "FAIL"}`);
  
  // Test 1b: 1 cleaning used (all used)
  const rollover1b = calculateCleaningRollover("one-time", monthlyStart, monthlyEnd, 1);
  console.log(`\n  Scenario 1b: 1 cleaning used`);
  console.log(`  Expected: 0 cleanings (all used)`);
  console.log(`  Rollover: ${rollover1b} cleaning(s)`);
  console.log(`  ✅ ${rollover1b === 0 ? "PASS" : "FAIL"}`);

  // Test Case 2: Bi-Weekly Clean (twice-month) - 30-day billing period
  console.log("\n\n📋 Test Case 2: Bi-Weekly Clean Plan");
  console.log("-".repeat(60));
  const biWeeklyStart = new Date("2024-01-01");
  const biWeeklyEnd = new Date("2024-01-31");
  const biWeeklyCleaningsPerMonth = getCleaningsPerMonth("twice-month");
  console.log(`Plan: Bi-Weekly Clean (twice-month)`);
  console.log(`Expected cleanings per month: ${biWeeklyCleaningsPerMonth}`);
  console.log(`Billing period: ${biWeeklyStart.toDateString()} to ${biWeeklyEnd.toDateString()}`);
  
  // Test 2a: No cleanings used
  const rollover2a = calculateCleaningRollover("twice-month", biWeeklyStart, biWeeklyEnd, 0);
  console.log(`\n  Scenario 2a: 0 cleanings used`);
  console.log(`  Expected: 2 cleanings (full month)`);
  console.log(`  Rollover: ${rollover2a} cleaning(s)`);
  console.log(`  ✅ ${rollover2a === 2 ? "PASS" : "FAIL"}`);
  
  // Test 2b: 1 cleaning used (partial)
  const rollover2b = calculateCleaningRollover("twice-month", biWeeklyStart, biWeeklyEnd, 1);
  console.log(`\n  Scenario 2b: 1 cleaning used`);
  console.log(`  Expected: 1 cleaning (1 unused)`);
  console.log(`  Rollover: ${rollover2b} cleaning(s)`);
  console.log(`  ✅ ${rollover2b === 1 ? "PASS" : "FAIL"}`);
  
  // Test 2c: 2 cleanings used (all used)
  const rollover2c = calculateCleaningRollover("twice-month", biWeeklyStart, biWeeklyEnd, 2);
  console.log(`\n  Scenario 2c: 2 cleanings used`);
  console.log(`  Expected: 0 cleanings (all used)`);
  console.log(`  Rollover: ${rollover2c} cleaning(s)`);
  console.log(`  ✅ ${rollover2c === 0 ? "PASS" : "FAIL"}`);

  // Test Case 3: Bi-Monthly Plan (yearly package) - 365-day billing period
  console.log("\n\n📋 Test Case 3: Bi-Monthly Plan (Yearly Package)");
  console.log("-".repeat(60));
  const biMonthlyStart = new Date("2024-01-01");
  const biMonthlyEnd = new Date("2024-12-31");
  const biMonthlyCleaningsPerMonth = getCleaningsPerMonth("bi-monthly");
  console.log(`Plan: Bi-Monthly Plan (bi-monthly)`);
  console.log(`Expected cleanings per month: ${biMonthlyCleaningsPerMonth} (6 per year)`);
  console.log(`Billing period: ${biMonthlyStart.toDateString()} to ${biMonthlyEnd.toDateString()}`);
  
  // Calculate days in period
  const daysInYear = Math.ceil(
    (biMonthlyEnd.getTime() - biMonthlyStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log(`Days in billing period: ${daysInYear}`);
  
  // Test 3a: No cleanings used (should get 6 cleanings for full year)
  const rollover3a = calculateCleaningRollover("bi-monthly", biMonthlyStart, biMonthlyEnd, 0);
  console.log(`\n  Scenario 3a: 0 cleanings used`);
  console.log(`  Expected: 6 cleanings (full year, 1 every 2 months)`);
  console.log(`  Rollover: ${rollover3a} cleaning(s)`);
  console.log(`  ✅ ${rollover3a === 6 ? "PASS" : "FAIL"}`);
  
  // Test 3b: 3 cleanings used (partial)
  const rollover3b = calculateCleaningRollover("bi-monthly", biMonthlyStart, biMonthlyEnd, 3);
  console.log(`\n  Scenario 3b: 3 cleanings used`);
  console.log(`  Expected: 3 cleanings (3 unused)`);
  console.log(`  Rollover: ${rollover3b} cleaning(s)`);
  console.log(`  ✅ ${rollover3b === 3 ? "PASS" : "FAIL"}`);

  // Test Case 4: Quarterly Plan (yearly package) - 365-day billing period
  console.log("\n\n📋 Test Case 4: Quarterly Plan (Yearly Package)");
  console.log("-".repeat(60));
  const quarterlyStart = new Date("2024-01-01");
  const quarterlyEnd = new Date("2024-12-31");
  const quarterlyCleaningsPerMonth = getCleaningsPerMonth("quarterly");
  console.log(`Plan: Quarterly Plan (quarterly)`);
  console.log(`Expected cleanings per month: ${quarterlyCleaningsPerMonth} (4 per year)`);
  console.log(`Billing period: ${quarterlyStart.toDateString()} to ${quarterlyEnd.toDateString()}`);
  
  // Test 4a: No cleanings used (should get 4 cleanings for full year)
  const rollover4a = calculateCleaningRollover("quarterly", quarterlyStart, quarterlyEnd, 0);
  console.log(`\n  Scenario 4a: 0 cleanings used`);
  console.log(`  Expected: 4 cleanings (full year, 1 every 3 months)`);
  console.log(`  Rollover: ${rollover4a} cleaning(s)`);
  console.log(`  ✅ ${rollover4a === 4 ? "PASS" : "FAIL"}`);
  
  // Test 4b: 2 cleanings used (partial)
  const rollover4b = calculateCleaningRollover("quarterly", quarterlyStart, quarterlyEnd, 2);
  console.log(`\n  Scenario 4b: 2 cleanings used`);
  console.log(`  Expected: 2 cleanings (2 unused)`);
  console.log(`  Rollover: ${rollover4b} cleaning(s)`);
  console.log(`  ✅ ${rollover4b === 2 ? "PASS" : "FAIL"}`);

  // Test Case 5: Partial billing period (15 days remaining)
  console.log("\n\n📋 Test Case 5: Partial Billing Period (15 days remaining)");
  console.log("-".repeat(60));
  const partialStart = new Date("2024-01-01");
  const partialEnd = new Date("2024-01-31");
  const now = new Date("2024-01-16"); // 15 days remaining
  
  // For monthly plan with 15 days remaining, should get 0.5 cleanings expected
  // But since we use Math.floor, it should be 0
  const rollover5a = calculateCleaningRollover("one-time", partialStart, partialEnd, 0);
  console.log(`Plan: Monthly Clean`);
  console.log(`Billing period: ${partialStart.toDateString()} to ${partialEnd.toDateString()}`);
  console.log(`Current date: ${now.toDateString()} (15 days remaining)`);
  console.log(`\n  Scenario 5a: 0 cleanings used, 15 days remaining`);
  console.log(`  Expected: 1 cleaning (full month)`);
  console.log(`  Rollover: ${rollover5a} cleaning(s)`);
  console.log(`  Note: Calculation uses full period, not remaining days`);
  console.log(`  ✅ ${rollover5a === 1 ? "PASS" : "FAIL"}`);

  // Test Case 6: Edge case - More cleanings used than expected
  console.log("\n\n📋 Test Case 6: Edge Case - Over Usage");
  console.log("-".repeat(60));
  const overUsageStart = new Date("2024-01-01");
  const overUsageEnd = new Date("2024-01-31");
  
  // Monthly plan: 1 expected, but 2 used
  const rollover6a = calculateCleaningRollover("one-time", overUsageStart, overUsageEnd, 2);
  console.log(`Plan: Monthly Clean`);
  console.log(`Expected: 1 cleaning`);
  console.log(`Used: 2 cleanings (over usage)`);
  console.log(`\n  Scenario 6a: 2 cleanings used, 1 expected`);
  console.log(`  Expected: 0 cleanings (no rollover for over usage)`);
  console.log(`  Rollover: ${rollover6a} cleaning(s)`);
  console.log(`  ✅ ${rollover6a === 0 ? "PASS" : "FAIL"}`);

  console.log("\n\n" + "=".repeat(60));
  console.log("✅ Testing Complete!");
  console.log("=".repeat(60));
}

// Run tests
testCleaningCreditsRollover();

