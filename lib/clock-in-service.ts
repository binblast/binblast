import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  getActiveClockIn,
  getEmployeeData,
  getTodayDateString,
  calculateHoursWorked,
} from "@/lib/employee-utils";
import { assignJobsToEmployeeOnClockIn } from "@/lib/job-assignment";
import { checkCertificationStatus } from "@/lib/training-certification";

export interface ClockInEmployeeOptions {
  employeeId: string;
  employeeEmail?: string;
  skipCertificationCheck?: boolean;
  managerId?: string;
  managerEmail?: string;
  managerRole?: string;
}

export interface ClockInEmployeeResult {
  clockInId: string;
  date: string;
  message: string;
  managerClockIn: boolean;
}

export interface ClockOutEmployeeResult {
  clockInId: string;
  hoursWorked: number;
  message: string;
  managerClockOut: boolean;
}

export async function clockInEmployee(
  options: ClockInEmployeeOptions
): Promise<ClockInEmployeeResult> {
  const { employeeId, skipCertificationCheck = false, managerId, managerEmail, managerRole } =
    options;

  const employee = await getEmployeeData(employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  if (employee.role !== "employee") {
    throw new Error("Only employees can be clocked in for route work");
  }

  const employeeEmail = (options.employeeEmail || employee.email || "").trim().toLowerCase();
  if (!employeeEmail) {
    throw new Error("Employee email is required to clock in");
  }

  if (!skipCertificationCheck) {
    const certification = await checkCertificationStatus(employeeId);
    if (!certification.canClockIn) {
      if (certification.status === "expired") {
        throw new Error(
          "Employee certification has expired. Complete re-certification training before clocking in."
        );
      }
      throw new Error("Employee must complete required training before clocking in.");
    }
  }

  const today = getTodayDateString();
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Database not available");
  }

  const firestore = await safeImportFirestore();
  const { collection, addDoc, serverTimestamp, doc, updateDoc } = firestore;

  const activeClockIn = await getActiveClockIn(employeeId);
  if (activeClockIn) {
    try {
      const activeClockInDoc = doc(db, "clockIns", activeClockIn.id);
      await updateDoc(activeClockInDoc, {
        clockOutTime: serverTimestamp(),
        isActive: false,
        ...(managerId
          ? {
              clockedOutBy: managerId,
              clockedOutByEmail: managerEmail || null,
              clockedOutByRole: managerRole || "manager",
              managerClockOut: true,
            }
          : {}),
      });
    } catch (error) {
      console.error("Error closing existing clock-in:", error);
    }
  }

  const managerClockIn = Boolean(managerId || managerEmail);
  const clockInData = {
    employeeId,
    employeeEmail,
    clockInTime: serverTimestamp(),
    clockOutTime: null,
    date: today,
    isActive: true,
    ...(managerClockIn
      ? {
          clockedInBy: managerId || null,
          clockedInByEmail: managerEmail || null,
          clockedInByRole: managerRole || "manager",
          managerClockIn: true,
        }
      : {}),
  };

  const clockInDoc = await addDoc(collection(db, "clockIns"), clockInData);

  try {
    await assignJobsToEmployeeOnClockIn(employeeId);
  } catch (assignError) {
    console.error("Error assigning jobs on clock-in:", assignError);
  }

  return {
    clockInId: clockInDoc.id,
    date: today,
    message: managerClockIn ? "Employee clocked in by manager" : "Clock-in successful",
    managerClockIn,
  };
}

export async function clockOutEmployee(options: {
  employeeId: string;
  managerId?: string;
  managerEmail?: string;
  managerRole?: string;
}): Promise<ClockOutEmployeeResult> {
  const { employeeId, managerId, managerEmail, managerRole } = options;
  const activeClockIn = await getActiveClockIn(employeeId);
  if (!activeClockIn) {
    throw new Error("No active clock-in found for this employee");
  }

  const db = await getDbInstance();
  if (!db) {
    throw new Error("Database not available");
  }

  const firestore = await safeImportFirestore();
  const { doc, updateDoc, serverTimestamp } = firestore;

  const clockOutTime = serverTimestamp();
  const managerClockOut = Boolean(managerId || managerEmail);

  await updateDoc(doc(db, "clockIns", activeClockIn.id), {
    clockOutTime,
    isActive: false,
    ...(managerClockOut
      ? {
          clockedOutBy: managerId || null,
          clockedOutByEmail: managerEmail || null,
          clockedOutByRole: managerRole || "manager",
          managerClockOut: true,
        }
      : {}),
  });

  const hoursWorked = calculateHoursWorked(activeClockIn.clockInTime, clockOutTime);

  return {
    clockInId: activeClockIn.id,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    message: managerClockOut ? "Employee clocked out by manager" : "Clock-out successful",
    managerClockOut,
  };
}
