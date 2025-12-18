// lib/employee-utils.ts
// Helper functions for employee operations

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

export interface ClockInRecord {
  id: string;
  employeeId: string;
  employeeEmail: string;
  clockInTime: any; // Firestore timestamp
  clockOutTime: any | null;
  date: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface TaxInfo {
  name?: string;
  ssn?: string;
  ein?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  signature?: string;
  signedDate?: any; // Firestore timestamp
}

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  serviceArea?: string[];
  payRatePerJob?: number;
  partnerId?: string; // If set, this employee belongs to a partner
  taxInfo?: TaxInfo | null;
  hiringStatus?: "pending_approval" | "approved" | "rejected" | "active";
  hiredDate?: any;
  hiredBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface EmployeeApplication {
  id: string;
  employeeId: string;
  applicationDate: Date | string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Date | string;
  notes?: string;
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Check if employee is clocked in today
 */
export async function getEmployeeClockInStatus(employeeId: string): Promise<ClockInRecord | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const today = getTodayDateString();
    const clockInsRef = collection(db, "clockIns");
    const q = query(
      clockInsRef,
      where("employeeId", "==", employeeId),
      where("date", "==", today)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as ClockInRecord;
  } catch (error) {
    console.error("Error getting clock-in status:", error);
    return null;
  }
}

/**
 * Get active clock-in record for employee
 */
export async function getActiveClockIn(employeeId: string): Promise<ClockInRecord | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const clockInsRef = collection(db, "clockIns");
    const q = query(
      clockInsRef,
      where("employeeId", "==", employeeId),
      where("isActive", "==", true)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as ClockInRecord;
  } catch (error) {
    console.error("Error getting active clock-in:", error);
    return null;
  }
}

/**
 * Get employee data from Firestore
 */
export async function getEmployeeData(employeeId: string): Promise<Employee | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;

    const userDoc = await getDoc(doc(db, "users", employeeId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || undefined,
      role: data.role || "",
      serviceArea: data.serviceArea || [],
      payRatePerJob: data.payRatePerJob || 0,
      partnerId: data.partnerId || undefined, // Include partnerId if present
      taxInfo: data.taxInfo || null,
      hiringStatus: data.hiringStatus || undefined,
      hiredDate: data.hiredDate || undefined,
      hiredBy: data.hiredBy || undefined,
      createdAt: data.createdAt || undefined,
      updatedAt: data.updatedAt || undefined,
    };
  } catch (error) {
    console.error("Error getting employee data:", error);
    return null;
  }
}

/**
 * Check if an employee belongs to a partner
 * @param employeeId Firebase user ID of the employee
 * @returns Partner ID if employee belongs to a partner, null otherwise
 */
export async function getEmployeePartnerId(employeeId: string): Promise<string | null> {
  try {
    const employee = await getEmployeeData(employeeId);
    return employee?.partnerId || null;
  } catch (error) {
    console.error("Error getting employee partner ID:", error);
    return null;
  }
}

/**
 * Check if an employee is a partner employee (not a Bin Blast employee)
 * @param employeeId Firebase user ID of the employee
 * @returns true if employee belongs to a partner, false otherwise
 */
export async function isPartnerEmployee(employeeId: string): Promise<boolean> {
  const partnerId = await getEmployeePartnerId(employeeId);
  return partnerId !== null;
}

/**
 * Get all employees
 */
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const db = await getDbInstance();
    if (!db) return [];

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "employee"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Employee[];
  } catch (error) {
    console.error("Error getting all employees:", error);
    return [];
  }
}

/**
 * Format time from Firestore timestamp
 */
export function formatTime(timestamp: any): string {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}

/**
 * Calculate hours worked from clock-in/out times
 */
export function calculateHoursWorked(clockInTime: any, clockOutTime: any | null): number {
  if (!clockInTime) return 0;
  
  const start = clockInTime.toDate ? clockInTime.toDate() : new Date(clockInTime);
  const end = clockOutTime 
    ? (clockOutTime.toDate ? clockOutTime.toDate() : new Date(clockOutTime))
    : new Date();
  
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Get employee tax information
 */
export async function getEmployeeTaxInfo(employeeId: string): Promise<TaxInfo | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;

    const userDoc = await getDoc(doc(db, "users", employeeId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return data.taxInfo || null;
  } catch (error) {
    console.error("Error getting employee tax info:", error);
    return null;
  }
}

/**
 * Get employee applications
 */
export async function getEmployeeApplications(employeeId?: string): Promise<EmployeeApplication[]> {
  try {
    const db = await getDbInstance();
    if (!db) return [];

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    const applicationsRef = collection(db, "employeeApplications");
    let applicationsQuery = query(
      applicationsRef,
      orderBy("applicationDate", "desc")
    );

    if (employeeId) {
      applicationsQuery = query(
        applicationsRef,
        where("employeeId", "==", employeeId),
        orderBy("applicationDate", "desc")
      );
    }

    const snapshot = await getDocs(applicationsQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        employeeId: data.employeeId,
        applicationDate: data.applicationDate?.toDate?.()?.toISOString() || new Date().toISOString(),
        status: data.status || "pending",
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
        notes: data.notes || "",
      };
    });
  } catch (error) {
    console.error("Error getting employee applications:", error);
    return [];
  }
}

