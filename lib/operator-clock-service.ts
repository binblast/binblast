import { getAdminFirestore } from "@/lib/firebase-admin";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  calculateHoursWorked,
  getActiveClockIn,
  getTodayDateString,
} from "@/lib/employee-utils";

export type OperatorAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
};

export type OperatorClockRecord = {
  id: string;
  operatorId: string;
  operatorEmail: string;
  clockInTime: unknown;
  clockOutTime: unknown | null;
  date: string;
  isActive: boolean;
  accountType: "operator";
};

export async function getOperatorAccount(operatorId: string): Promise<OperatorAccount | null> {
  const db = await getAdminFirestore();
  const doc = await db.collection("users").doc(operatorId).get();
  if (!doc.exists) return null;

  const data = doc.data() as Record<string, unknown>;
  if (data.role !== "operator") return null;

  const firstName = String(data.firstName || "").trim();
  const lastName = String(data.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim() || String(data.email || "Operator");

  return {
    id: doc.id,
    firstName,
    lastName,
    email: String(data.email || "").trim().toLowerCase(),
    fullName,
  };
}

export async function listOperatorAccounts(): Promise<OperatorAccount[]> {
  const db = await getAdminFirestore();
  const snapshot = await db.collection("users").where("role", "==", "operator").get();

  return snapshot.docs
    .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as Record<string, unknown>;
      const firstName = String(data.firstName || "").trim();
      const lastName = String(data.lastName || "").trim();
      return {
        id: doc.id,
        firstName,
        lastName,
        email: String(data.email || "").trim().toLowerCase(),
        fullName: `${firstName} ${lastName}`.trim() || String(data.email || "Operator"),
      };
    })
    .sort((a: OperatorAccount, b: OperatorAccount) => a.fullName.localeCompare(b.fullName));
}

export async function getOperatorActiveClockIn(
  operatorId: string
): Promise<OperatorClockRecord | null> {
  const active = await getActiveClockIn(operatorId);
  if (!active) return null;

  return {
    id: active.id,
    operatorId: active.employeeId,
    operatorEmail: active.employeeEmail,
    clockInTime: active.clockInTime,
    clockOutTime: active.clockOutTime,
    date: active.date,
    isActive: active.isActive,
    accountType: "operator",
  };
}

export async function clockInOperator(operatorId: string): Promise<{
  clockInId: string;
  date: string;
  message: string;
}> {
  const operator = await getOperatorAccount(operatorId);
  if (!operator) {
    throw new Error("Operator account not found");
  }

  if (!operator.email) {
    throw new Error("Operator email is required to clock in");
  }

  const today = getTodayDateString();
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Database not available");
  }

  const firestore = await safeImportFirestore();
  const { collection, addDoc, serverTimestamp, doc, updateDoc } = firestore;

  const activeClockIn = await getActiveClockIn(operatorId);
  if (activeClockIn) {
    await updateDoc(doc(db, "clockIns", activeClockIn.id), {
      clockOutTime: serverTimestamp(),
      isActive: false,
      selfClockOut: true,
    });
  }

  const clockInDoc = await addDoc(collection(db, "clockIns"), {
    employeeId: operatorId,
    employeeEmail: operator.email,
    accountType: "operator",
    clockInTime: serverTimestamp(),
    clockOutTime: null,
    date: today,
    isActive: true,
    selfClockIn: true,
  });

  return {
    clockInId: clockInDoc.id,
    date: today,
    message: "Clocked in successfully",
  };
}

export async function clockOutOperator(operatorId: string): Promise<{
  clockInId: string;
  hoursWorked: number;
  message: string;
}> {
  const operator = await getOperatorAccount(operatorId);
  if (!operator) {
    throw new Error("Operator account not found");
  }

  const activeClockIn = await getActiveClockIn(operatorId);
  if (!activeClockIn) {
    throw new Error("No active clock-in found. Clock in first.");
  }

  const db = await getDbInstance();
  if (!db) {
    throw new Error("Database not available");
  }

  const firestore = await safeImportFirestore();
  const { doc, updateDoc, serverTimestamp } = firestore;
  const clockOutTime = serverTimestamp();

  await updateDoc(doc(db, "clockIns", activeClockIn.id), {
    clockOutTime,
    isActive: false,
    selfClockOut: true,
  });

  const hoursWorked = calculateHoursWorked(activeClockIn.clockInTime, clockOutTime);

  return {
    clockInId: activeClockIn.id,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    message: "Clocked out successfully",
  };
}
