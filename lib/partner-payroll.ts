// lib/partner-payroll.ts
// Helper functions for partner employee payroll calculations

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

export interface EmployeePayrollCost {
  employeeId: string;
  employeeName: string;
  completedJobs: number;
  earnings: number;
}

export interface PartnerPayrollSummary {
  totalCost: number;
  employeeCount: number;
  totalJobs: number;
  breakdown: EmployeePayrollCost[];
}

/**
 * Calculate total employee payroll costs for a partner
 * @param partnerId Partner ID
 * @param startDate Optional start date (YYYY-MM-DD)
 * @param endDate Optional end date (YYYY-MM-DD)
 * @returns Payroll summary with total costs and breakdown
 */
export async function calculatePartnerEmployeeCosts(
  partnerId: string,
  startDate?: string,
  endDate?: string
): Promise<PartnerPayrollSummary> {
  try {
    const db = await getDbInstance();
    if (!db) {
      return {
        totalCost: 0,
        employeeCount: 0,
        totalJobs: 0,
        breakdown: [],
      };
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get all employees for this partner
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("partnerId", "==", partnerId)
    );
    const employeesSnapshot = await getDocs(employeesQuery);

    const breakdown: EmployeePayrollCost[] = [];
    let totalCost = 0;
    let totalJobs = 0;

    // Calculate earnings for each employee
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeData = employeeDoc.data();
      const employeeId = employeeDoc.id;
      const payRatePerJob = employeeData.payRatePerJob || 10;

      // Build query for completed jobs
      let jobsQuery = query(
        collection(db, "scheduledCleanings"),
        where("assignedEmployeeId", "==", employeeId),
        where("jobStatus", "==", "completed"),
        where("partnerId", "==", partnerId)
      );

      // Note: Firestore doesn't support range queries on different fields easily
      // We'll fetch all jobs and filter in memory if dates are provided
      const jobsSnapshot = await getDocs(jobsQuery);

      // Filter jobs by date if provided
      let eligibleJobs = jobsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        
        // Only count jobs with required photos
        if (data.hasRequiredPhotos !== true && !(data.insidePhotoUrl && data.outsidePhotoUrl)) {
          return false;
        }

        // Filter by date range if provided
        if (startDate || endDate) {
          const jobDate = data.scheduledDate;
          if (startDate && jobDate < startDate) {
            return false;
          }
          if (endDate && jobDate > endDate) {
            return false;
          }
        }

        return true;
      });

      const completedJobs = eligibleJobs.length;
      // Convert payRatePerJob (dollars) to cents for consistency with partnerBookings
      const payRatePerJobCents = Math.round(payRatePerJob * 100);
      const earnings = completedJobs * payRatePerJobCents; // In cents

      if (completedJobs > 0) {
        breakdown.push({
          employeeId,
          employeeName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
          completedJobs,
          earnings, // In cents
        });

        totalCost += earnings;
        totalJobs += completedJobs;
      }
    }

    return {
      totalCost,
      employeeCount: breakdown.length,
      totalJobs,
      breakdown,
    };
  } catch (error) {
    console.error("[Partner Payroll] Error calculating costs:", error);
    return {
      totalCost: 0,
      employeeCount: 0,
      totalJobs: 0,
      breakdown: [],
    };
  }
}
