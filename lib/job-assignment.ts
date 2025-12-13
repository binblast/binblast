// lib/job-assignment.ts
// Auto-assignment logic for jobs based on employee service areas

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";
import { getAllEmployees, getTodayDateString } from "./employee-utils";

export interface JobAssignment {
  jobId: string;
  employeeId: string;
  employeeName: string;
}

/**
 * Check if a job location matches an employee's service area
 */
function matchesServiceArea(
  jobCity: string,
  jobZipCode: string,
  employeeServiceAreas: string[]
): boolean {
  if (!employeeServiceAreas || employeeServiceAreas.length === 0) return false;

  const jobCityLower = jobCity.toLowerCase().trim();
  const jobZipCodeLower = jobZipCode.toLowerCase().trim();

  return employeeServiceAreas.some((area) => {
    const areaLower = area.toLowerCase().trim();
    // Match by city name or zip code
    return areaLower === jobCityLower || areaLower === jobZipCodeLower;
  });
}

/**
 * Auto-assign jobs to employees based on service area
 * Distributes jobs evenly among available employees in the same area
 */
export async function autoAssignJobsForToday(): Promise<JobAssignment[]> {
  try {
    const db = await getDbInstance();
    if (!db) return [];

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, updateDoc, doc } = firestore;

    const today = getTodayDateString();
    const employees = await getAllEmployees();

    if (employees.length === 0) {
      console.log("No employees found for job assignment");
      return [];
    }

    // Get all unassigned jobs scheduled for today
    const cleaningsRef = collection(db, "scheduledCleanings");
    const todayJobsQuery = query(
      cleaningsRef,
      where("scheduledDate", "==", today)
    );

    const jobsSnapshot = await getDocs(todayJobsQuery);
    const unassignedJobs = jobsSnapshot.docs.filter(
      (doc) => !doc.data().assignedEmployeeId
    );

    if (unassignedJobs.length === 0) {
      console.log("No unassigned jobs found for today");
      return [];
    }

    const assignments: JobAssignment[] = [];
    const employeeJobCounts = new Map<string, number>();

    // Initialize job counts for each employee
    employees.forEach((emp) => {
      employeeJobCounts.set(emp.id, 0);
    });

    // Group jobs by service area (city/zipCode)
    const jobsByArea = new Map<string, typeof unassignedJobs>();
    unassignedJobs.forEach((jobDoc) => {
      const job = jobDoc.data();
      const areaKey = `${job.city || ""}_${job.zipCode || ""}`;
      if (!jobsByArea.has(areaKey)) {
        jobsByArea.set(areaKey, []);
      }
      jobsByArea.get(areaKey)!.push(jobDoc);
    });

    // Assign jobs within each area
    for (const [areaKey, jobs] of jobsByArea) {
      const [city, zipCode] = areaKey.split("_");

      // Find employees who service this area
      const availableEmployees = employees.filter((emp) =>
        matchesServiceArea(city, zipCode, emp.serviceArea || [])
      );

      if (availableEmployees.length === 0) {
        console.log(`No employees found for area: ${city}, ${zipCode}`);
        continue;
      }

      // Sort employees by current job count (for even distribution)
      const sortedEmployees = [...availableEmployees].sort(
        (a, b) =>
          (employeeJobCounts.get(a.id) || 0) -
          (employeeJobCounts.get(b.id) || 0)
      );

      // Assign jobs round-robin style
      jobs.forEach((jobDoc, index) => {
        const employee = sortedEmployees[index % sortedEmployees.length];
        const job = jobDoc.data();
        const employeeName = `${employee.firstName} ${employee.lastName}`;

        // Update job with assignment
        updateDoc(doc(db, "scheduledCleanings", jobDoc.id), {
          assignedEmployeeId: employee.id,
          assignedEmployeeName: employeeName,
          jobStatus: "pending",
        });

        assignments.push({
          jobId: jobDoc.id,
          employeeId: employee.id,
          employeeName: employeeName,
        });

        // Update job count
        employeeJobCounts.set(
          employee.id,
          (employeeJobCounts.get(employee.id) || 0) + 1
        );
      });
    }

    console.log(`Auto-assigned ${assignments.length} jobs to employees`);
    return assignments;
  } catch (error) {
    console.error("Error auto-assigning jobs:", error);
    return [];
  }
}

/**
 * Assign jobs to a specific employee when they clock in
 */
export async function assignJobsToEmployeeOnClockIn(
  employeeId: string
): Promise<JobAssignment[]> {
  try {
    const db = await getDbInstance();
    if (!db) return [];

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, updateDoc, doc } = firestore;
    const { getEmployeeData } = await import("./employee-utils");

    const employee = await getEmployeeData(employeeId);
    if (!employee || !employee.serviceArea || employee.serviceArea.length === 0) {
      console.log(`Employee ${employeeId} has no service area configured`);
      return [];
    }

    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    const todayJobsQuery = query(
      cleaningsRef,
      where("scheduledDate", "==", today)
    );

    const jobsSnapshot = await getDocs(todayJobsQuery);
    const unassignedJobs = jobsSnapshot.docs.filter((jobDoc) => {
      const job = jobDoc.data();
      return (
        !job.assignedEmployeeId &&
        matchesServiceArea(
          job.city || "",
          job.zipCode || "",
          employee.serviceArea || []
        )
      );
    });

    if (unassignedJobs.length === 0) {
      console.log(`No unassigned jobs found for employee ${employeeId}`);
      return [];
    }

    const assignments: JobAssignment[] = [];
    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Assign all matching jobs to this employee
    for (const jobDoc of unassignedJobs) {
      updateDoc(doc(db, "scheduledCleanings", jobDoc.id), {
        assignedEmployeeId: employee.id,
        assignedEmployeeName: employeeName,
        jobStatus: "pending",
      });

      assignments.push({
        jobId: jobDoc.id,
        employeeId: employee.id,
        employeeName: employeeName,
      });
    }

    console.log(
      `Assigned ${assignments.length} jobs to employee ${employeeId} on clock-in`
    );
    return assignments;
  } catch (error) {
    console.error("Error assigning jobs on clock-in:", error);
    return [];
  }
}

